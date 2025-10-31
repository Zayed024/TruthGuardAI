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
import httpx
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
import aiohttp  # <-- Add this line near your other imports

# Multiple proxy sources for fallback
PROXY_SOURCES = [
    "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=elite",
    "https://proxylist.geonode.com/api/proxy-list?limit=200&sort_by=lastChecked&sort_type=desc",
    "https://www.proxy-list.download/api/v1/get?type=http&anon=elite",
    "https://openproxy.space/list/http"
]

# --- 1. Global Variable for Proxies ---
WORKING_PROXIES = []
PROXY_LOCK = asyncio.Lock() # Lock to prevent race conditions during updates

# --- 2. Functions to Fetch and Validate Proxies (Can run in background) ---
async def fetch_proxies_async():
    # Use httpx for async requests
    async with httpx.AsyncClient() as client:
        for api_url in PROXY_SOURCES:
            try:
                print(f"Trying proxy source: {api_url}")
                response = await client.get(api_url, timeout=15)
                response.raise_for_status()

                if "proxyscrape.com" in api_url or "proxy-list.download" in api_url or "openproxy.space" in api_url:
                    # These APIs return plain text, not JSON
                    proxy_list = response.text.strip().split('\n')
                    proxy_list = proxy_list[:1000]  # Limit to first 1000 proxies to avoid overwhelming
                    proxies = []
                    for proxy_line in proxy_list:
                        proxy_line = proxy_line.strip()
                        if ':' in proxy_line:
                            ip, port = proxy_line.split(':', 1)
                            try:
                                int(port)  # Validate port is numeric
                                proxy_str = f"http://{ip}:{port}"
                                proxies.append({
                                    "http://": proxy_str,
                                    "https://": proxy_str,
                                })
                            except ValueError:
                                continue
                else:
                    # JSON APIs
                    data = response.json()
                    proxies = []

                    if "geonode.com" in api_url:
                        # Geonode API format
                        for proxy in data.get("data", []):
                            if "HTTP" in proxy.get("protocols", []) and "elite" in proxy.get("anonymity", "").lower():
                                proxy_str = f"http://{proxy['ip']}:{proxy['port']}"
                                proxies.append({
                                    "http://": proxy_str,
                                    "https://": proxy_str,
                                })
                    elif "proxy-list.download" in api_url:
                        # proxy-list.download API format
                        for proxy in data.get("proxies", []):
                            if proxy.get("protocol") == "http" and proxy.get("anonymity") in ["elite", "anonymous"]:
                                proxy_str = f"http://{proxy['ip']}:{proxy['port']}"
                                proxies.append({
                                    "http://": proxy_str,
                                    "https://": proxy_str,
                                })

                if proxies:
                    print(f"Successfully fetched {len(proxies)} proxies from {api_url}")
                    return proxies

            except Exception as e:
                print(f"Failed to fetch from {api_url}: {e}")
                continue

        print("All proxy sources failed")
        return []

async def validate_proxy_async(proxy: dict) -> bool:
    """
    Validates a proxy using aiohttp.
    """
    # aiohttp takes the proxy as a string, not a dict.
    proxy_str = proxy.get("http://")
    if not proxy_str:
        return False

    # Set a 3-second timeout
    timeout = aiohttp.ClientTimeout(total=3)
    
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            
            # --- THE FIX IS HERE ---
            # Change this URL from "https" to "http"
            validation_url = "http://httpbin.org/ip"
            # --- END FIX ---

            async with session.get(validation_url, proxy=proxy_str) as response:
                return response.status == 200
    except Exception as e:
        print(f"Proxy failed: {proxy_str} error: {str(e)}")
        return False

async def update_working_proxies():
    """Fetches new proxies and validates them, updating the global list."""

    # --- ADD THIS LINE ---
    print(f"--- HTTPIX VERSION ACTUALLY RUNNING: {httpx.__version__} ---")
    # --- END ADD ---

    print("Updating working proxy list...")
    proxy_list = await fetch_proxies_async()
    if not proxy_list:
        print("Failed to fetch new proxies.")
        return

    proxy_list = proxy_list[:1000]
    validated = []
    batch_size = 30

    # Validate in batches of 30 to avoid bans/errors
    for i in range(0, len(proxy_list), batch_size):
        batch = proxy_list[i:i + batch_size]
        print(f"Validating batch {i//batch_size + 1} ({len(batch)} proxies)...")
        validation_tasks = [validate_proxy_async(proxy) for proxy in batch]
        results = await asyncio.gather(*validation_tasks)

        for proxy, is_working in zip(batch, results):
            if is_working:
                validated.append(proxy)
                if len(validated) >= 10: # Keep top 10 working proxies
                    break

        if len(validated) >= 10:
            break

    if validated:
        async with PROXY_LOCK: # Safely update the global list
            global WORKING_PROXIES
            WORKING_PROXIES = validated
            print(f"✅ Updated working proxies. Found {len(WORKING_PROXIES)}.")
    else:
        print("⚠️ No working proxies found in the latest fetch.")

# --- 3. Function to Get a Proxy for a Request ---
async def get_proxy_for_request():
    """Gets a random proxy from the current working list."""
    async with PROXY_LOCK:
        if not WORKING_PROXIES:
            return None
        return random.choice(WORKING_PROXIES)

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
    MODEL_NAME, torch_dtype=dtype, low_cpu_mem_usage=True, use_safetensors=True
)
model.to(device)



processor = AutoProcessor.from_pretrained(MODEL_NAME)

pipe = pipeline(
    "automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    max_new_tokens=128,
    torch_dtype=dtype,
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
def extract_video_id(url: str) -> str | None:
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

async def get_transcript_from_youtube(video_url: str, proxies=None) -> str:
    video_id = extract_video_id(video_url)
    if not video_id:
        raise ValueError("Invalid YouTube URL or missing video ID.")

    try:
        api = YouTubeTranscriptApi()
        transcript_list = await asyncio.to_thread(
            api.list, video_id
        )
        try:
            transcript = await asyncio.to_thread(transcript_list.find_transcript, ['en'])
        except _errors.NoTranscriptFound:
            # fallback to auto-generated transcript in any available language
            available_langs = [t.language_code for t in transcript_list]
            if not available_langs:
                raise _errors.NoTranscriptFound(video_id)
            transcript = await asyncio.to_thread(transcript_list.find_generated_transcript, ['en'])

        fetched = await asyncio.to_thread(transcript.fetch)
        transcript_text = " ".join([snippet.text for snippet in fetched])
        return transcript_text

    except _errors.NoTranscriptFound:
        raise HTTPException(status_code=404, detail="Transcript not found for this video.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcript fetch failed: {type(e).__name__} - {e}")


def get_transcript_from_other_platforms(video_url: str, proxy: str | None = None) -> str:
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

    # --- Add this ---
    if proxy:
        ydl_opts['proxy'] = proxy
        print(f"Using proxy for audio download: {proxy}")
    # --- End Add ---

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

def download_video(url, proxy: str | None = None):
    output_template = os.path.join(tempfile.gettempdir(), '%(id)s.%(ext)s')
    ydl_opts = {
        'format': 'best',
        'outtmpl': output_template,
        'quiet': True,
    }

    # --- Add this ---
    if proxy:
        ydl_opts['proxy'] = proxy
        print(f"Using proxy for video download: {proxy}")
    # --- End Add ---

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info_dict = ydl.extract_info(url, download=True)
            return ydl.prepare_filename(info_dict)
        except yt_dlp.utils.DownloadError as e:
            print(f"Video download failed: {str(e)}")
            return None
# --- Main Function for this Module ---

async def analyze_video_url(url: str) -> tuple[str, str | None]:
    """
    Analyzes a video URL, determines the platform, downloads video,
    and returns (transcript_text, video_path).
    Handles proxy selection for fallback.
    """
    hostname = urlparse(url).hostname
    video_path = None
    transcript_text = ""
    proxy_str = None # Variable to hold the proxy string

    # Helper function to get the proxy string just once
    async def get_proxy():
        nonlocal proxy_str
        if proxy_str is None: # Only fetch if we haven't already
            proxy_dict = await get_proxy_for_request()
            if proxy_dict:
                proxy_str = proxy_dict.get("http://") # Get string for yt-dlp
                print(f"Using proxy: {proxy_str}")
            else:
                print("No working proxy available.")
                proxy_str = "" # Set to empty to prevent re-fetching
        return proxy_str if proxy_str else None # Return None if empty

    try:
        if "youtube.com" in hostname or "youtu.be" in hostname:
            print("YouTube URL detected, attempting to get transcript first...")
            try:
                # 1. Try to get transcript from API (no proxy)
                transcript_text = await get_transcript_from_youtube(url)
                print("Transcript obtained from API.")

                # If successful, download video for visual context (no proxy)
                try:
                    video_path = download_video(url, proxy=None)
                except Exception as e:
                    print(f"Video download for context failed: {e}, proceeding without visual context.")
                    video_path = None

            except Exception as e:
                # 2. API failed. Fall back to proxy download and local transcription.
                print(f"Transcript API failed ({e}). Falling back to proxy download and local transcription.")

                # Get proxy
                proxy = await get_proxy()

                # Download video (for visual context) using proxy
                video_path = download_video(url, proxy=proxy)

                # Download audio (for transcription) using proxy
                # We run this in a thread as it's a blocking I/O operation
                transcript_text = await asyncio.to_thread(
                    get_transcript_from_other_platforms, url, proxy=proxy
                )

        else:
            # 3. Not a YouTube URL. Download using proxy from the start.
            print(f"Non-YouTube URL detected ({hostname}), downloading and transcribing locally...")

            # Get proxy
            proxy = await get_proxy()

            # Download video (for visual context)
            video_path = download_video(url, proxy=proxy)

            # Download audio and transcribe (in thread)
            transcript_text = await asyncio.to_thread(
                get_transcript_from_other_platforms, url, proxy=proxy
            )

        return transcript_text, video_path

    except Exception as e:
        # Ensure video path is cleaned up even if transcription fails
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
        # Re-raise the exception to be handled by main.py
        raise e