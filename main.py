# main.py (Final Corrected Version with All Fixes)
import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import json
import re
import tldextract
import asyncio
import httpx
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import whois
from datetime import datetime
import joblib
import wikipediaapi
import io
from google.cloud import vision
from newsapi import NewsApiClient
from PIL import Image # Make sure PIL is imported

app = FastAPI()
load_dotenv()

# --- CORS (added back from original) ---
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. Initialize All APIs & Models ---
try:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    FACT_CHECK_API_KEY = os.environ["FACT_CHECK_API_KEY"]
    text_model = genai.GenerativeModel('gemini-2.5-flash')
    vision_model = genai.GenerativeModel('gemini-2.5-pro')
    vision_client = vision.ImageAnnotatorClient()
    newsapi = NewsApiClient(api_key=os.environ["NEWS_API_KEY"])
    wiki_wiki = wikipediaapi.Wikipedia('TruthGuard AI Bot (truthguard@example.com)', 'en')
    source_model = joblib.load("training/model.joblib")
    vectorizer = joblib.load("training/vectorizer.joblib")
    mlb = joblib.load("training/mlb.joblib")
    print("✅ All models and APIs loaded successfully.")
except Exception as e:
    print(f"⚠️ CRITICAL: Failed to load models or API keys. {e}")
    source_model = None
    vectorizer = None
    mlb = None

# --- Pydantic Models ---
class V2AnalysisRequest(BaseModel): text: str; url: str
class V2VideoAnalysisRequest(BaseModel): url: str
class V2ImageAnalysisRequest(BaseModel): image_url: str

# --- Safety Settings ---
safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

# --- 2. Asynchronous Tool-Augmented Functions ---

# --- Custom ML Model (Sync, needs to be threaded) ---
def predict_source_reliability(domain: str):
    if not all([source_model, vectorizer, mlb]): return "N/A", "N/A"
    try:
        processed_domain = vectorizer.transform([domain])
        prediction_binarized = source_model.predict(processed_domain)
        prediction_labels = mlb.inverse_transform(prediction_binarized)
        if prediction_labels and prediction_labels[0]:
            fact_pred, bias_pred = prediction_labels[0]
            return bias_pred.title(), fact_pred.title()
        else:
            return "Not Rated", "Not Rated"
    except Exception as e:
        print(f"Model prediction failed: {e}")
        return "Error", "Error"

# --- Wikipedia (Sync, needs to be threaded) ---
def get_wikipedia_notes(domain: str):
    try:
        page = wiki_wiki.page(domain)
        if not page.exists(): return "No Wikipedia page found."
        for section in page.sections:
            title_lower = section.title.lower()
            if "controversies" in title_lower or "criticism" in title_lower:
                sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s', section.text)
                summary = ". ".join(filter(None, sentences[:2])) + "."
                if len(summary) > 20:
                    return f"From '{section.title}': {summary}"
        return "No specific 'Controversy' or 'Criticism' section found."
    except Exception:
        return "Error fetching Wikipedia data."

# --- Google Vision (Sync, needs to be threaded) ---
def get_reverse_image_search_results(image_data: bytes):
    try:
        image = vision.Image(content=image_data)
        response = vision_client.web_detection(image=image)
        web_detection = response.web_detection
        results = []
        if web_detection.pages_with_matching_images:
            for page in web_detection.pages_with_matching_images:
                results.append({"url": page.url, "title": page.page_title, "type": "Exact Match"})
        if len(results) < 5 and web_detection.visually_similar_images:
            for image in web_detection.visually_similar_images:
                results.append({"url": image.url, "title": "Visually Similar Image", "type": "Similar Match"})
        return results[:5]
    except Exception as e:
        print(f"Cloud Vision API error: {e}")
        return []

# --- Google Fact Check (Async) ---
async def run_fact_check(claim: str, client: httpx.AsyncClient):
    try:
        params = {"query": claim, "key": FACT_CHECK_API_KEY, "languageCode": "en"}
        response = await client.get("https://factchecktools.googleapis.com/v1alpha1/claims:search", params=params)
        if response.status_code == 200:
            data = response.json()
            if "claims" in data and data["claims"]:
                review = data["claims"][0].get("claimReview", [{}])[0]
                return {"claim": claim, "status": "Fact Check Found", "publisher": review.get("publisher", {}).get("name", "N/A"), "rating": review.get("textualRating", "N/A"), "url": review.get("url", "#")}
        return {"claim": claim, "status": "No Fact Check Found"}
    except Exception:
        return {"claim": claim, "status": "Processing Error"}


# --- 3. "Agentic" Grounding Functions (All Async) ---

async def get_news_topic(text: str):
    try:
        prompt = f"What is the single central topic, person, or event in this text? Be very concise. Examples: 'Joe Biden', 'Ukraine War', 'Tesla stock prices'.\n\nTEXT: {text[:1000]}"
        response = await text_model.generate_content_async(prompt, safety_settings=safety_settings)
        return response.text.strip()
    except Exception:
        return None

async def get_news_context(topic: str):
    if not topic:
        return "No news context found."
    try:
        articles = await asyncio.to_thread(
            newsapi.get_everything,
            q=topic, language='en', sort_by='relevancy', page_size=3
        )
        if articles['totalResults'] == 0:
            return "No recent news articles found on this topic."
        headlines = [f"- {a['title']} ({a['source']['name']})" for a in articles['articles']]
        return "For context, here are recent, live news headlines on this topic:\n" + "\n".join(headlines)
    except Exception:
        return "Could not fetch news context."

async def extract_claims_from_text(text: str):
    try:
        prompt = f"Extract up to 3 verifiable claims from the text. Return as a plain list separated by '\\n'.\n\nTEXT: {text}"
        response = await text_model.generate_content_async(prompt, safety_settings=safety_settings)
        claims_raw = response.text.split('\n')
        return [claim.strip() for claim in claims_raw if len(claim.strip().split()) > 1]
    except Exception:
        return []

# --- 4. Main Analysis Pipelines (Async) ---

async def run_full_analysis(text: str, url: str):
    domain = tldextract.extract(url).registered_domain
    
    topic_task = get_news_topic(text)
    claims_task = extract_claims_from_text(text)
    bias_task = asyncio.to_thread(predict_source_reliability, domain)
    whois_task = asyncio.to_thread(whois.whois, domain)
    wiki_task = asyncio.to_thread(get_wikipedia_notes, domain)
    
    topic, claims_to_check, (bias_from_model, factuality_from_model), domain_info, wiki_notes = await asyncio.gather(
        topic_task, claims_task, bias_task, whois_task, wiki_task
    )
    
    
    news_context_task = get_news_context(topic)
    
    source_age = "Unknown" 
    try:
        if domain_info and domain_info.creation_date:
            creation_date = domain_info.creation_date
            if isinstance(creation_date, list): creation_date = creation_date[0]
            if creation_date:
                age_days = (datetime.now() - creation_date).days
                source_age = f"{age_days // 365}y, {(age_days % 365) // 30}m old"
    except Exception as e:
        print(f"WHOIS lookup failed for {domain}: {e}")
    
    news_context = await news_context_task
    today_date = datetime.now().strftime("%B %d, %Y")
            
    full_prompt = f"""
    You are an expert fact-checker. Analyze the following text using the ground-truth context I provide.
    --- GROUND TRUTH CONTEXT ---
    1. Current Date: {today_date}
    2. Recent News on Topic: {news_context}
    --- END CONTEXT ---
    
    Now, analyze the text below based *only* on the text itself and the context provided.
    Provide a multi-part analysis. Use '|||' as a separator.

    PART 1: A credibility score (0-100).
    |||
    PART 2: A brief explanation for the score. Refer to the current date or recent news if they contradict the text.
    |||
    PART 3: A list of up to 3 verifiable claims from the text, separated by '\\n'. 
    (NOTE: You already provided these claims: {claims_to_check}. Do NOT regenerate them. Just list them.)

    --- TEXT TO ANALYZE ---
    {text}
    ---
    """
    
    response = await text_model.generate_content_async(full_prompt, safety_settings=safety_settings)
    parts = response.text.split('|||')
    
    if len(parts) < 3:
        raise ValueError("AI response did not have the expected 3 parts.")

    score_match = re.search(r'\d+', parts[0])
    score = int(score_match.group(0)) if score_match else 0
    explanation_clean = parts[1].split(':', 1)[-1].strip()
    
    initial_analysis = {"credibility_score": score, "explanation": explanation_clean}
    source_analysis = {
        "political_bias": bias_from_model,
        "factuality_rating": factuality_from_model,
        "domain_age": source_age,
        "wikipedia_notes": wiki_notes
    }
    
    return initial_analysis, source_analysis, claims_to_check

# --- 5. FastAPI Endpoints (All Async) ---

@app.get("/")
def read_root():
    return {"status": "TruthGuard AI v2 Backend is running!"}

@app.post("/v2/analyze")
async def analyze_v2(request: V2AnalysisRequest):
    try:
        initial_analysis, source_analysis, claims_to_check = await run_full_analysis(request.text, request.url)
        
        fact_check_results = []
        if claims_to_check:
            async with httpx.AsyncClient() as client:
                fact_check_tasks = [run_fact_check(claim, client) for claim in claims_to_check]
                fact_check_results = await asyncio.gather(*fact_check_tasks)
                
        final_response = {
            "initial_analysis": initial_analysis,
            "source_analysis": source_analysis,
            "fact_checks": fact_check_results
        }
        return final_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {type(e).__name__} - {e}")

@app.post("/v2/upload_and_analyze_image")
async def upload_and_analyze_image(file: UploadFile = File(...)):
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read the uploaded file data
        image_data = await file.read()

        # Create a PIL Image object from the uploaded data
        pil_img = Image.open(io.BytesIO(image_data))

        # --- Use the Vision Model with a specific prompt for images ---
        image_prompt = """
        Analyze this image for potential misinformation. Provide a multi-part analysis. Use '|||' as a separator.

        PART 1: An authenticity score from 0 to 100, where 0 means completely fake/manipulated and 100 means completely authentic and real.
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
        vision_response = await vision_model.generate_content_async([image_prompt, pil_img], safety_settings=safety_settings)
        parts = vision_response.text.split('|||')

        # Create a placeholder reverse image search URL (since we don't have a URL for uploaded images)
        reverse_image_search_url = "https://lens.google.com/upload"  # Generic upload URL

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
            "reverse_image_search_url": reverse_image_search_url,
            "filename": file.filename
        }
        return final_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {type(e).__name__} - {e}")


@app.post("/v2/analyze_video")
async def analyze_video_v2(request: V2VideoAnalysisRequest):
    video_path = None
    try:
        from video_analyzer import analyze_video_url, get_visual_context 
        
        # Run the blocking yt-dlp/whisper process in a thread
        transcript_text, video_path = await asyncio.to_thread(analyze_video_url, request.url)
        
        # Run the full text analysis pipeline on the transcript
        initial_analysis, source_analysis, claims_to_check = await run_full_analysis(transcript_text, request.url)
        
        # Get visual context in a thread
        visual_context_task = asyncio.to_thread(get_visual_context, video_path) # Assumes get_visual_context is sync
        
        # Run fact-checking
        fact_check_results = []
        if claims_to_check:
            async with httpx.AsyncClient() as client:
                fact_check_tasks = [run_fact_check(claim, client) for claim in claims_to_check]
                fact_check_results = await asyncio.gather(*fact_check_tasks)
        
        visual_context = await visual_context_task

        final_response = {
            "initial_analysis": initial_analysis,
            "source_analysis": source_analysis,
            "fact_checks": fact_check_results,
            "visual_context": visual_context
        }
        return final_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {type(e).__name__} - {e}")
    finally:
        if video_path and os.path.exists(video_path):
            os.remove(video_path)


@app.post("/v2/analyze_image")
async def analyze_image_v2(request: V2ImageAnalysisRequest):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(request.image_url)
            response.raise_for_status()
            image_data = response.content

        today_date = datetime.now().strftime("%B %d, %Y")
        gemini_prompt = f"Analyze this image for misinformation. The current date is {today_date}. Provide a brief summary."
        
        # Run Gemini vision and Cloud Vision web detection in parallel
        gemini_task = vision_model.generate_content_async([gemini_prompt, Image.open(io.BytesIO(image_data))], safety_settings=safety_settings)
        vision_task = asyncio.to_thread(get_reverse_image_search_results, image_data)
        
        gemini_response, visual_forensics = await asyncio.gather(gemini_task, vision_task)
        
        gemini_response_text = gemini_response.text
        claims_to_check = await extract_claims_from_text(gemini_response_text)
        
        fact_check_results = []
        if claims_to_check:
            async with httpx.AsyncClient() as client:
                fact_check_tasks = [run_fact_check(claim, client) for claim in claims_to_check]
                fact_check_results = await asyncio.gather(*fact_check_tasks)

        final_response = {
            "initial_analysis": {
                "credibility_score": -1, # N/A for images
                "explanation": gemini_response_text
            },
            "source_analysis": {}, # N/A for images
            "fact_checks": fact_check_results,
            "visual_forensics": visual_forensics
        }
        return final_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {type(e).__name__} - {e}")