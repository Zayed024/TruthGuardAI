# main.py (Final Polished Version)
import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import json
import re
import tldextract
import asyncio
import httpx
from google.generativeai.types import HarmCategory, HarmBlockThreshold

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

model = genai.GenerativeModel('gemini-1.5-flash')

# Safety Settings
safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

async def run_fact_check(claim: str, client: httpx.AsyncClient):
    API_ENDPOINT = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
    params = {"query": claim, "key": FACT_CHECK_API_KEY, "languageCode": "en"}
    try:
        response = await client.get(API_ENDPOINT, params=params)
        response.raise_for_status()
        data = response.json()
        if "claims" in data and data["claims"]:
            review = data["claims"][0].get("claimReview", [{}])[0]
            return {"claim": claim, "status": "Fact Check Found", "publisher": review.get("publisher", {}).get("name", "N/A"), "rating": review.get("textualRating", "N/A"), "url": review.get("url", "#")}
        else:
            return {"claim": claim, "status": "No Fact Check Found"}
    except Exception:
        return {"claim": claim, "status": "Processing Error"}

@app.get("/")
def read_root():
    return {"status": "TruthGuard AI v2 Backend is running! "}

@app.post("/v2/analyze")
async def analyze_v2(request: V2AnalysisRequest):
    try:
        domain = tldextract.extract(request.url).registered_domain
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
        {request.text}
        ---
        """

        response = model.generate_content(full_prompt, safety_settings=safety_settings)
        parts = response.text.split('|||')
        
        if len(parts) < 5:
            raise ValueError("AI response did not have the expected 5 parts.")

        # --- DATA CLEANING AND PARSING ---
        score_match = re.search(r'\d+', parts[0])
        score = int(score_match.group(0)) if score_match else 0
        
        # Clean up the "PART X:" labels from the strings
        explanation_clean = parts[1].split(':', 1)[-1].strip()
        bias_clean = parts[2].split(':', 1)[-1].strip()
        factuality_clean = parts[3].split(':', 1)[-1].strip()

        # Clean up the claims list to remove empty lines and labels
        claims_raw = parts[4].split('\n')
        claims_to_check = [claim.strip() for claim in claims_raw if claim.strip() and "PART 5" not in claim]
        # --- END OF DATA CLEANING ---

        initial_analysis_result = {
            "credibility_score": score,
            "explanation": explanation_clean
        }
        source_analysis_result = {
            "political_bias": bias_clean,
            "factuality_rating": factuality_clean
        }

        fact_check_results = []
        if claims_to_check:
            async with httpx.AsyncClient() as client:
                fact_check_tasks = [run_fact_check(claim, client) for claim in claims_to_check]
                fact_check_results = await asyncio.gather(*fact_check_tasks)
        
        final_response = {
            "initial_analysis": initial_analysis_result,
            "source_analysis": source_analysis_result,
            "fact_checks": fact_check_results
        }
        return final_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {type(e).__name__} - {e}")