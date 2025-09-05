# video_analyzer.py

import os
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi, _errors
#from youtube_transcript_api.exceptions import NoTranscriptFound, TranscriptsDisabled
import yt_dlp
import io
from pydub import AudioSegment
import tempfile
import torch
#from insanely_fast_whisper import WhisperModel
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
from fastapi import FastAPI, HTTPException
import cv2
import base64
import asyncio
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
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

def get_transcript_from_youtube(video_url: str) -> str:
    video_id = extract_video_id(video_url)
    if not video_id:
        raise ValueError("Invalid YouTube URL or missing video ID.")

    ytt_api = YouTubeTranscriptApi()
    try:
        transcript_list = ytt_api.list(video_id)
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
        'return_timestamps':True,
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

def analyze_video_url(url: str) -> str:
    """
    Main function that analyzes a video URL, determines the platform,
    and returns the transcript text.
    """
    hostname = urlparse(url).hostname
    
    # If it's a YouTube video, use the fast API method
    if "youtube.com" in hostname or "youtu.be" in hostname:
        print("YouTube URL detected, using transcript API.")
        return get_transcript_from_youtube(url),download_video(url)
    else:
        # For any other platform, use the download-and-transcribe method
        print(f"Non-YouTube URL detected ({hostname}), using local transcription.")
        
        return get_transcript_from_other_platforms(url),download_video(url)