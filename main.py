import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import re
import tldextract
import asyncio
import httpx
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from urllib.parse import urlparse, parse_qs

from youtube_transcript_api import YouTubeTranscriptApi, _errors

app = FastAPI()
load_dotenv()

# CORS
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure API Keys
try:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    FACT_CHECK_API_KEY = os.environ["FACT_CHECK_API_KEY"]
except KeyError as e:
    print(f"Error: Environment variable {e} not found.")
    exit()

# Pydantic Models
class V2AnalysisRequest(BaseModel):
    text: str
    url: str

class V2VideoAnalysisRequest(BaseModel):
    url: str

model = genai.GenerativeModel('gemini-1.5-flash')
safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

# --- Video ID extraction ---
def extract_video_id(url: str) -> str:
    parsed_url = urlparse(url)
    if parsed_url.hostname in ("youtu.be",):
        return parsed_url.path.lstrip("/")
    if parsed_url.hostname in ("www.youtube.com", "youtube.com"):
        return parse_qs(parsed_url.query).get("v", [None])[0]
    return None

# --- Option 2: list() -> find_transcript() -> fetch() ---
def get_transcript_text(video_url: str) -> str:
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

# --- Analysis ---
def run_full_analysis(text: str, url: str):
    domain = tldextract.extract(url).registered_domain
    full_prompt = f"""
    Analyze the following text and its source domain. Provide a multi-part analysis. Use '|||' as a separator between each part.

    PART 1: A credibility score from 0 to 100.
    |||
    PART 2: A brief, 2-3 sentence explanation for the score.
    |||
    PART 3: The political bias of the source domain '{domain}' (e.g., Left-Center, Center, Right).
    |||
    PART 4: The factuality rating of the source domain '{domain}' (e.g., High, Mixed, Low).
    |||
    PART 5: A list of up to 3 verifiable claims from the text, separated by the newline character '\\n'.

    Here is the text to analyze:
    ---
    {text}
    ---
    """
    response = model.generate_content(full_prompt, safety_settings=safety_settings)
    parts = response.text.split('|||')
    if len(parts) < 5:
        raise ValueError("AI response did not have the expected 5 parts.")
    score_match = re.search(r'\d+', parts[0])
    score = int(score_match.group(0)) if score_match else 0
    explanation_clean = parts[1].split(':', 1)[-1].strip()
    bias_clean = parts[2].split(':', 1)[-1].strip()
    factuality_clean = parts[3].split(':', 1)[-1].strip()
    claims_raw = parts[4].split('\n')
    claims_to_check = [claim.strip() for claim in claims_raw if claim.strip() and "PART 5" not in claim and claim.strip() != '\\n']
    initial_analysis = {"credibility_score": score, "explanation": explanation_clean}
    source_analysis = {"political_bias": bias_clean, "factuality_rating": factuality_clean}
    return initial_analysis, source_analysis, claims_to_check

# --- Fact check ---
async def run_fact_check(claim: str, client: httpx.AsyncClient):
    API_ENDPOINT = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
    params = {"query": claim, "key": FACT_CHECK_API_KEY, "languageCode": "en"}
    try:
        response = await client.get(API_ENDPOINT, params=params)
        response.raise_for_status()
        data = response.json()
        if "claims" in data and data["claims"]:
            review = data["claims"][0].get("claimReview", [{}])[0]
            return {
                "claim": claim,
                "status": "Fact Check Found",
                "publisher": review.get("publisher", {}).get("name", "N/A"),
                "rating": review.get("textualRating", "N/A"),
                "url": review.get("url", "#")
            }
        else:
            return {"claim": claim, "status": "No Fact Check Found"}
    except Exception:
        return {"claim": claim, "status": "Processing Error"}

# --- Routes ---
@app.get("/")
def read_root():
    return {"status": "TruthGuard AI v2 Backend is running!"}

@app.post("/v2/analyze")
async def analyze_v2(request: V2AnalysisRequest):
    try:
        initial_analysis, source_analysis, claims_to_check = run_full_analysis(request.text, request.url)
        fact_check_results = []
        if claims_to_check:
            async with httpx.AsyncClient() as client:
                fact_check_tasks = [run_fact_check(claim, client) for claim in claims_to_check]
                fact_check_results = await asyncio.gather(*fact_check_tasks)
        return {
            "initial_analysis": initial_analysis,
            "source_analysis": source_analysis,
            "fact_checks": fact_check_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {type(e).__name__} - {e}")

@app.post("/v2/analyze_video")
async def analyze_video_v2(request: V2VideoAnalysisRequest):
    try:
        transcript_text = get_transcript_text(request.url)
        initial_analysis, source_analysis, claims_to_check = run_full_analysis(transcript_text, request.url)
        fact_check_results = []
        if claims_to_check:
            async with httpx.AsyncClient() as client:
                fact_check_tasks = [run_fact_check(claim, client) for claim in claims_to_check]
                fact_check_results = await asyncio.gather(*fact_check_tasks)
        return {
            "initial_analysis": initial_analysis,
            "source_analysis": source_analysis,
            "fact_checks": fact_check_results
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {type(e).__name__} - {e}")
