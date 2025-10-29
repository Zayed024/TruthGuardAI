# video_analyzer.py

import os
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, _errors
import yt_dlp
import io
import tempfile
import torch
import httpx
import random
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
from fastapi import HTTPException
import cv2
import base64
import asyncio
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai

GEONODE_API = "https://proxylist.geonode.com/api/proxy-list?filterPort=80&google=false&limit=500&page=1&sort_by=lastChecked&sort_type=desc"


# --- 1. Global Variable for Proxies ---
WORKING_PROXIES = []
PROXY_LOCK = asyncio.Lock() # Lock to prevent race conditions during updates

# --- 2. Functions to Fetch and Validate Proxies (Can run in background) ---
async def fetch_proxies_async():
    # Use httpx for async requests
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(GEONODE_API, timeout=10)
            response.raise_for_status() # Raise exception for bad status codes
            data = response.json()
            proxies = []
            for proxy in data.get("data", []):
                if "HTTP" in proxy["protocols"] and proxy["anonymity"] == "elite (HIA)":
                    proxy_str = f"http://{proxy['ip']}:{proxy['port']}"
                    proxies.append({
                        "http://": proxy_str, # httpx needs http:// prefix
                        "https://": proxy_str, # httpx needs https:// prefix
                    })
            return proxies
        except Exception as e:
            print(f"Error fetching proxies: {e}")
            return []

async def validate_proxy_async(proxy):
    async with httpx.AsyncClient(proxies=proxy, timeout=3) as client:
        try:
            # Check against a reliable target known to work with proxies
            response = await client.get("https://httpbin.org/ip")
            return response.status_code == 200
        except Exception:
            return False

async def update_working_proxies():
    """Fetches new proxies and validates them, updating the global list."""
    print("Updating working proxy list...")
    proxy_list = await fetch_proxies_async()
    if not proxy_list:
        print("Failed to fetch new proxies.")
        return

    validated = []
    # Validate concurrently
    validation_tasks = [validate_proxy_async(proxy) for proxy in proxy_list]
    results = await asyncio.gather(*validation_tasks)

    for proxy, is_working in zip(proxy_list, results):
        if is_working:
            validated.append(proxy)
            if len(validated) >= 10: # Keep top 10 working proxies
                break

    if validated:
        async with PROXY_LOCK: # Safely update the global list
            global WORKING_PROXIES
            WORKING_PROXIES = validated
            print(f"✅ Updated working proxies. Found {len(WORKING_PROXIES)}.")
    else:
        print("⚠️ No working proxies found in the latest fetch.")

# --- 3. Function to Get a Proxy for a Request ---
def get_proxy_for_request():
    """Gets a random proxy from the current working list."""
    async def get_random_proxy():
        async with PROXY_LOCK:
            if not WORKING_PROXIES:
                return None
            return random.choice(WORKING_PROXIES)
    # Run the async part synchronously if needed
    return asyncio.run(get_random_proxy())

# PROXY = {
#     "http": "http://143.244.57.20:80", 
#     #"https": "http://182.16.8.43:80",
    
# }

# --- Configuration for Speech-to-Text Model ---

#The "small" model is a good balance of speed and accuracy for this use case.
MODEL_NAME = "openai/whisper-small"
device = "cuda:0" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if torch.cuda.is_available() else torch.float32


model = AutoModelForSpeechSeq2Seq.from_pretrained(
    MODEL_NAME, dtype=dtype, low_cpu_mem_usage=True, use_safetensors=True
)
model.to(device)



processor = AutoProcessor.from_pretrained(MODEL_NAME)

pipe = pipeline(
    "automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    max_new_tokens=128,
    dtype=dtype,
    device=device,
)
load_dotenv()
try:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    
except KeyError as e:
    print(f"Error: Environment variable {e} not found.")
    exit()
vision_model = genai.GenerativeModel('gemini-2.5-pro')

# --- Helper Functions ---
def extract_video_id(url: str) -> str:
    parsed_url = urlparse(url)
    if parsed_url.hostname in ("youtu.be",):
        return parsed_url.path.lstrip("/")
    if parsed_url.hostname in ("www.youtube.com", "youtube.com"):
        return parse_qs(parsed_url.query).get("v", [None])[0]
    return None

async def get_visual_context(video_path: str, num_keyframes: int = 3):
    """
    Extracts keyframes from a video and prepares them for analysis.
    """
    keyframes = []
    video = cv2.VideoCapture(video_path)
    if not video.isOpened():
        return []

    # Simple keyframe extraction: grab frames at 25%, 50%, and 75% of the video
    total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    positions = [0.25, 0.50, 0.75]
    tasks = []
    for pos in positions:
        frame_id = int(total_frames * pos)
        video.set(cv2.CAP_PROP_POS_FRAMES, frame_id)
        ret, frame = video.read()
        if ret:
            # Encode the frame as a JPEG image in memory
            _, buffer = cv2.imencode('.jpg', frame)
            pil_img = Image.open(io.BytesIO(buffer))

             # Create a task for the AI to analyze this frame
            prompt = "Analyze this image from a video. Describe the key visual elements. Is this image related to a known news event? If so, state the context and original date of the event."
            task = vision_model.generate_content_async([prompt, pil_img])
            tasks.append((buffer, task)) # Store buffer for base64 encoding later
            # Convert to base64 to easily send in JSON
            
    
    video.release()
    results = []
    responses = await asyncio.gather(*[task for _, task in tasks])
    
    for (buffer, response) in zip(tasks, responses):
        jpg_as_text = base64.b64encode(buffer[0]).decode('utf-8')
        results.append({
            "keyframe_base64": jpg_as_text,
            "context": response.text
        })
        
    return results

def get_transcript_from_youtube(video_url: str, proxies=None) -> str:
    video_id = extract_video_id(video_url)
    if not video_id:
        raise ValueError("Invalid YouTube URL or missing video ID.")

    ytt_api = YouTubeTranscriptApi()
    try:
        transcript_list = ytt_api.list(video_id, proxies=proxies) if proxies else ytt_api.list(video_id)
        try:
            transcript = transcript_list.find_transcript(['en'])
        except _errors.NoTranscriptFound:
            # fallback to auto-generated transcript in any available language
            available_langs = [t.language_code for t in transcript_list]
            if not available_langs:
                raise _errors.NoTranscriptFound(video_id)
            transcript = transcript_list.find_generated_transcript(available_langs)

        fetched = transcript.fetch()
        transcript_text = " ".join([snippet.text for snippet in fetched])
        return transcript_text

    except _errors.NoTranscriptFound:
        raise HTTPException(status_code=404, detail="Transcript not found for this video.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcript fetch failed: {type(e).__name__} - {e}")


def get_transcript_from_other_platforms(video_url: str) -> str:
    """
    Downloads audio from any yt-dlp supported URL and transcribes it.
    """
    # Define a specific output template for our audio file in the temp directory
    output_template = os.path.join(tempfile.gettempdir(), '%(id)s.%(ext)s')
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_template,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True, # Suppress console output from yt-dlp
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(video_url, download=True)
        
        base_filename = os.path.splitext(ydl.prepare_filename(info_dict))[0]
        audio_file_path = base_filename + '.mp3'
        
    try:
        if not os.path.exists(audio_file_path):
             raise FileNotFoundError(f"FFmpeg failed to create the audio file: {audio_file_path}")

        #segments, _ = whisper_model.transcribe(audio_file_path, beam_size=5)
        result = pipe(audio_file_path, return_timestamps=True)
        transcript_text = " ".join([chunk['text'] for chunk in result['chunks']])
        return transcript_text
    finally:
        # Clean up the downloaded audio file
        if os.path.exists(audio_file_path):
            os.remove(audio_file_path)

def download_video(url):
    output_template = os.path.join(tempfile.gettempdir(), '%(id)s.%(ext)s')
    ydl_opts = {
    'format': 'bestvideo[height<=480]+bestaudio/best/best',
    'outtmpl': output_template,
    'quiet': True,
    'merge_output_format': 'mp4',
    'postprocessors': [{
        'key': 'FFmpegVideoConvertor',
        'preferedformat': 'mp4'
    }]
}

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info_dict = ydl.extract_info(url, download=True)
            return ydl.prepare_filename(info_dict)
        except yt_dlp.utils.DownloadError as e:
            raise HTTPException(status_code=500, detail=f"Video download failed: {str(e)}")
# --- Main Function for this Module ---

def analyze_video_url(url: str) -> tuple[str, str | None]:
    """
    Analyzes a video URL, determines the platform, downloads video,
    and returns (transcript_text, video_path).
    Handles proxy selection for YouTube.
    """
    hostname = urlparse(url).hostname
    video_path = None
    transcript_text = ""

    try:
        # Download video first (needed for both paths potentially)
        print(f"Downloading video for {url}...")
        video_path = download_video(url)

        if "youtube.com" in hostname or "youtu.be" in hostname:
            print("YouTube URL detected, using transcript API with proxy...")
            selected_proxy = get_proxy_for_request() # Get a random working proxy
            if selected_proxy:
                print(f"Using proxy: {selected_proxy.get('http://')}")
                transcript_text = get_transcript_from_youtube(url, proxies=selected_proxy)
            else:
                print("No working proxy available, attempting direct connection...")
                transcript_text = get_transcript_from_youtube(url) # Fallback
        else:
            print(f"Non-YouTube URL detected ({hostname}), using local transcription...")
            transcript_text = get_transcript_from_other_platforms(url)

        return transcript_text, video_path

    except Exception as e:
        # Ensure video path is cleaned up even if transcription fails
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
        # Re-raise the exception to be handled by main.py
        raise e