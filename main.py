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
from urllib.parse import urlparse, parse_qs,quote_plus
import io
from youtube_transcript_api import YouTubeTranscriptApi, _errors
from PIL import Image 

from video_analyzer import analyze_video_url,get_visual_context

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

class V2ImageAnalysisRequest(BaseModel):
    image_url: str    

model = genai.GenerativeModel('gemini-2.5-flash')
safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

vision_model= genai.GenerativeModel('gemini-2.5-pro')
safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}
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
    claims_to_check = [claim.strip() for claim in claims_raw if len(claim.strip().split()) > 1 and "PART 5" not in claim]
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
    video_path=None
    try:
        transcript_text, video_path = await asyncio.to_thread(analyze_video_url,request.url)

        text_analysis_task = asyncio.to_thread(run_full_analysis, transcript_text, request.url)
        visual_analysis_task = get_visual_context(video_path)

        results = await asyncio.gather(text_analysis_task, visual_analysis_task)
        (initial_analysis, source_analysis, claims_to_check), visual_context = results

        fact_check_results = []
        if claims_to_check:
            async with httpx.AsyncClient() as client:
                fact_check_tasks = [run_fact_check(claim, client) for claim in claims_to_check]
                fact_check_results = await asyncio.gather(*fact_check_tasks)
        return {
            "initial_analysis": initial_analysis,
            "source_analysis": source_analysis,
            "fact_checks": fact_check_results,
            "visual_context": visual_context
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {type(e).__name__} - {e}")
    finally:
        # 5. Clean up the downloaded video file
        if video_path and os.path.exists(video_path):
            os.remove(video_path)


@app.post("/v2/analyze_image")
async def analyze_image_v2(request: V2ImageAnalysisRequest):
    try:
        # Use httpx to download the image data from the URL
        async with httpx.AsyncClient() as client:
            response = await client.get(request.image_url)
            response.raise_for_status()
            image_data = response.content

        # Create a PIL Image object from the downloaded data
        pil_img = Image.open(io.BytesIO(image_data))
        
        # --- Use the Vision Model with a specific prompt for images ---
        image_prompt = """
        Analyze this image for potential misinformation. Provide a multi-part analysis. Use '|||' as a separator.

        PART 1: A credibility score (0-100) based on the likelihood of it being misleading.
        |||
        PART 2: A brief explanation.
        |||
        PART 3: The likely political bias or tone of the image's message (e.g., Left-leaning, Neutral, Right-leaning, Satire).
        |||
        PART 4: A factuality rating (e.g., Factual, Misleading, Manipulated).
        |||
        PART 5: A list of verifiable claims made by text or context in the image, separated by '\\n'.
        """
        
        # Send the prompt and the image to the vision model
        vision_response = await vision_model.generate_content_async([image_prompt, pil_img])
        parts = vision_response.text.split('|||')
        
        encoded_url = quote_plus(request.image_url)
        reverse_image_search_url = f"https://lens.google.com/uploadbyurl?url={encoded_url}"
        
        if len(parts) < 5: raise ValueError("AI response for image did not have the expected 5 parts.")
        
        score_match = re.search(r'\d+', parts[0])
        score = int(score_match.group(0)) if score_match else 0
        explanation_clean = parts[1].split(':', 1)[-1].strip()
        bias_clean = parts[2].split(':', 1)[-1].strip()
        factuality_clean = parts[3].split(':', 1)[-1].strip()
        claims_raw = parts[4].split('\n')
        claims_to_check = [claim.strip() for claim in claims_raw if len(claim.strip().split()) > 1 and "PART 5" not in claim]

        initial_analysis = {"credibility_score": score, "explanation": explanation_clean}
        source_analysis = {"political_bias": bias_clean, "factuality_rating": factuality_clean}

        fact_check_results = []
        if claims_to_check:
            async with httpx.AsyncClient() as client:
                fact_check_tasks = [run_fact_check(claim, client) for claim in claims_to_check]
                fact_check_results = await asyncio.gather(*fact_check_tasks)
        
        final_response = {
            "initial_analysis": initial_analysis,
            "source_analysis": source_analysis,
            "fact_checks": fact_check_results,
            "reverse_image_search_url": reverse_image_search_url
        }
        return final_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {type(e).__name__} - {e}")