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
from contextlib import asynccontextmanager
import joblib
import wikipediaapi
import io
from google.cloud import vision
from newsapi import NewsApiClient
from PIL import Image 
from video_analyzer import update_working_proxies,analyze_video_url,download_video,get_visual_context

PLATFORM_DOMAINS = [
    'youtube.com', 'youtu.be', 'x.com', 'twitter.com', 'tiktok.com', 
    'facebook.com', 'instagram.com', 'reddit.com'
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan handler to replace deprecated on_event startup/shutdown.

    Startup: schedule background proxy updater.
    Shutdown: no-op (placeholder for cleanup if needed).
    """
    # Ensure environment variables are loaded (idempotent)
    load_dotenv()

    # Configurable refresh interval (seconds)
    try:
        refresh_seconds = int(os.environ.get("PROXY_REFRESH_INTERVAL_SECONDS", "600"))
    except Exception:
        refresh_seconds = 1000

    async def _proxy_refresher():
        """Background task that periodically refreshes the working proxy list."""
        while True:
            try:
                await update_working_proxies()
            except Exception as e:
                print(f"Proxy refresh failed: {e}")
            try:
                await asyncio.sleep(refresh_seconds)
            except asyncio.CancelledError:
                break

    # Startup actions: start the periodic refresher
    refresher_task = asyncio.create_task(_proxy_refresher())
    try:
        yield
    finally:
        # Shutdown: cancel the background refresher task
        refresher_task.cancel()
        try:
            await refresher_task
        except asyncio.CancelledError:
            pass


app = FastAPI(lifespan=lifespan)
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

async def find_contradictions(text: str, context: str, initial_explanation: str):
    """
    An agentic reasoning step to explicitly check for contradictions.
    """
    try:
        prompt = f"""
        You are a logic-checking agent. Your *only* job is to find direct contradictions between the 'Original Text' and the 'Ground Truth'.
        The 'Initial Analysis' is provided for context, but your primary comparison must be between the Text and the Ground Truth.

        --- Original Text ---
        {text[:2000]}

        --- Ground Truth Context ---
        {context}

        --- Initial Analysis (for context) ---
        {initial_explanation}

        Task: List any direct contradictions found between the 'Original Text' and the 'Ground Truth'.
        Be concise. If there are no contradictions, return "No contradictions found."
        """
        response = await text_model.generate_content_async(prompt, safety_settings=safety_settings)
        return response.text.strip()
    except Exception as e:
        print(f"Contradiction check failed: {e}")
        return "Contradiction check failed to run."

# --- Custom ML Model (Sync, needs to be threaded) ---
async def predict_source_reliability(domain: str, source_age: str, wiki_notes: str):
    if domain in PLATFORM_DOMAINS:
        return "N/A (Platform)", "N/A (Platform)"
    if not all([source_model, vectorizer, mlb]):
        # Fallback: Use Gemini to classify bias and factuality
        try:
            prompt = f"""
            Analyze the provided ground truth for a source to determine its bias and factuality.
            
            --- GROUND TRUTH (FOR SOURCE: {domain}) ---
            1. Source Domain Age: {source_age}
            2. Source Wikipedia Summary: {wiki_notes}
            --- END CONTEXT ---
            
            Based *only* on the context above, classify the source.
            Return as: Bias|||Factuality
            """
            response = await text_model.generate_content_async(prompt, safety_settings=safety_settings)
            parts = response.text.strip().split('|||')
            if len(parts) == 2:
                return parts[0].strip(), parts[1].strip()
            return "Unknown", "Unknown"
        except Exception:
            return "N/A", "N/A"
    try:
        def _run_ml_prediction():
            processed_domain = vectorizer.transform([domain])
            prediction_binarized = source_model.predict(processed_domain)
            prediction_labels = mlb.inverse_transform(prediction_binarized)
            if prediction_labels and prediction_labels[0]:
                fact_pred, bias_pred = prediction_labels[0]
                return bias_pred.title(), fact_pred.title()
            return "Not Rated", "Not Rated"

        # Await the threaded execution
        return await asyncio.to_thread(_run_ml_prediction)
    except Exception as e:
        print(f"Model prediction failed: {e}")
        # Fallback: Use Gemini
        try:
            prompt = f"""
        Analyze the provided ground truth for a source to determine its bias and factuality.
        
        --- GROUND TRUTH (FOR SOURCE: {domain}) ---
        1. Source Domain Age: {source_age}
        2. Source Wikipedia Summary: {wiki_notes}
        --- END CONTEXT ---
        
        Based *only* on the context above, classify the source.
        Return as: Bias|||Factuality
        """
            response = await text_model.generate_content_async(prompt, safety_settings=safety_settings)
            parts = response.text.strip().split('|||')
            if len(parts) == 2:
                return parts[0].strip(), parts[1].strip()
            return "Unknown", "Unknown"
        except Exception:
            return "Error", "Error"


async def get_wikipedia_notes(topic: str): # Now an ASYNC function
    """
    Uses an AI-powered agent to read a full Wikipedia article and
    extract key information about controversies or bias.
    """
    try:
        # Step 1: Fetch the full page text (run in a thread)
        def fetch_page_text():
            page = wiki_wiki.page(topic)
            if not page.exists():
                return None
            return page.text # Get the FULL text of the article
        
        full_article_text = await asyncio.to_thread(fetch_page_text)

        if not full_article_text:
            return "No Wikipedia page found for this topic."

        # Step 2: Create a dedicated "research" prompt for the AI
        research_prompt = f"""
        You are a research assistant. I will provide the full text of a Wikipedia article.
        Your job is to read the entire text and find any sections, sentences, or information related to:
        - Controversies
        - Criticism
        - Allegations of bias
        - Scandals
        - Legal issues
        - Political stance

        If you find relevant information, summarize the key points in 1-2 concise sentences.
        If you find no significant information on these topics, return "No significant controversies or criticisms noted on Wikipedia."

        Here is the article text:
        ---
        {full_article_text[:15000]} 
        ---
        """ # Use a large chunk of the text

        # Step 3: Make a dedicated, internal call to the AI model
        response = await text_model.generate_content_async(research_prompt, safety_settings=safety_settings)
        
        # Step 4: Return the AI's smart summary
        return response.text.strip()

    except Exception as e: 
        print(f"Wikipedia agentic lookup error: {e}")
        return "Error fetching or processing Wikipedia data."

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


# --- 3. "Agentic" Grounding & Planning Functions (All Async) ---

async def get_text_category_and_topic(text: str):
    """
    Planning step: classify the text and extract a concise topic.
    Returns (category, topic)
    """
    try:
        prompt = f"""
        Analyze the text below.
        1. Classify its primary category. Choose one: Current Event, Historical Event, Financial News, General Opinion.
        2. Identify the single central topic, person, or event. Be concise (1-3 words).

        Return the result as: Category|||Topic

        TEXT: {text[:1500]}
        """
        response = await text_model.generate_content_async(prompt, safety_settings=safety_settings)
        parts = response.text.strip().split('|||')
        if len(parts) == 2:
            return parts[0].strip(), parts[1].strip()
        return "General Opinion", None
    except Exception:
        return "General Opinion", None

async def get_live_news_context(topic: str):
    if not topic:
        return "No specific topic identified."
    try:
        articles = await asyncio.to_thread(
            newsapi.get_everything,
            q=topic, language='en', sort_by='relevancy', page_size=3
        )
        if articles.get('totalResults', 0) == 0:
            return f"No recent news found for '{topic}'."
        headlines = [f"- {a['title']} ({a['source']['name']})" for a in articles['articles']]
        return f"Recent News Context for '{topic}':\n" + "\n".join(headlines)
    except Exception:
        return f"Could not fetch news context for '{topic}'."

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
    """
    Agentic analysis pipeline: Plan -> Select & Run Tools -> Final Reasoning
    """
    domain = tldextract.extract(url).registered_domain

    # 1) Planning: classify text and get topic
    category, topic = await get_text_category_and_topic(text)

    # 2) Prepare tool tasks based on plan
    context_tasks = []
    if category == "Current Event" and topic:
        context_tasks.append(get_live_news_context(topic))
    elif category == "Historical Event" and topic:
        context_tasks.append(asyncio.to_thread(get_wikipedia_notes, topic))

    # Standard tasks
    claims_task = extract_claims_from_text(text)
    whois_task = asyncio.to_thread(whois.whois, domain)
    wiki_notes_task = get_wikipedia_notes(domain)

    # Execute all tasks concurrently
    results = await asyncio.gather(
        claims_task,
        whois_task,
        wiki_notes_task,
        *context_tasks
    )

    claims_to_check = results[0]
    domain_info = results[1]
    wiki_notes_for_source = results[2]
    dynamic_context_results = results[3:]

    # WHOIS -> domain age
    source_age = "Unknown"
    try:
        creation_date = None
        if domain_info and getattr(domain_info, 'creation_date', None):
            creation_date = domain_info.creation_date
        if isinstance(creation_date, list):
            creation_date = creation_date[0]
        if creation_date:
            # Make creation_date naive if it's timezone-aware to avoid subtraction error
            if hasattr(creation_date, 'tzinfo') and creation_date.tzinfo is not None:
                creation_date = creation_date.replace(tzinfo=None)
            age_days = (datetime.now() - creation_date).days
            source_age = f"{age_days // 365}y, {(age_days % 365) // 30}m old"
    except Exception as e:
        print(f"WHOIS lookup failed: {e}")

    # Now call predict_source_reliability with the available data
    bias_from_model, factuality_from_model = await predict_source_reliability(domain, source_age, wiki_notes_for_source)

    final_context_str = "\n".join([str(r) for r in dynamic_context_results]) if dynamic_context_results else "No specific context gathered."

    # 3) Final reasoning prompt
    today_date = datetime.now().strftime("%B %d, %Y")
    final_prompt = f"""
    You are an expert fact-checker. Analyze the following text using the ground-truth context gathered by your tools.

    --- GROUND TRUTH CONTEXT ---
    1. Current Date: {today_date}
    2. Context for Topic '{topic}': {final_context_str}
    --- END CONTEXT ---

    Now, analyze the text below based *only* on the text itself and the context provided.
    Provide a multi-part analysis. Use '|||' as a separator.

    PART 1: A credibility score (0-100).
    |||
    PART 2: A brief explanation for the score. Refer specifically to the Current Date or Context for Topic if they contradict the text.
    |||
    PART 3: A list of up to 3 verifiable claims from the text, separated by '\\n'.
    (NOTE: Your claim extraction tool already provided these claims: {claims_to_check}. Do NOT regenerate them. Just list them.)

    --- TEXT TO ANALYZE ---
    {text}
    ---
    """

    response = await text_model.generate_content_async(final_prompt, safety_settings=safety_settings)
    parts = response.text.split('|||')
    if len(parts) < 3:
        raise ValueError("Final AI response did not have 3 parts.")
    
    contradiction_text = await find_contradictions(text, final_context_str, explanation_clean)

    score_match = re.search(r'\d+', parts[0])
    score = int(score_match.group(0)) if score_match else 0
    explanation_clean = parts[1].split(':', 1)[-1].strip()

    initial_analysis = {"credibility_score": score, "explanation": explanation_clean}
    source_analysis = {
        "political_bias": bias_from_model,
        "factuality_rating": factuality_from_model,
        "domain_age": source_age,
        "wikipedia_notes": wiki_notes_for_source
    }

    return initial_analysis, source_analysis, claims_to_check,contradiction_text


# (Startup handled by FastAPI lifespan handler)

# --- 5. FastAPI Endpoints (All Async) ---


@app.get("/")
def read_root():
    return {"status": "TruthGuard AI v2 Backend is running!"}

@app.post("/v2/analyze")
async def analyze_v2(request: V2AnalysisRequest):
    try:
        initial_analysis, source_analysis, claims_to_check, contradictions = await run_full_analysis(request.text, request.url)
        
        fact_check_results = []
        if claims_to_check:
            async with httpx.AsyncClient() as client:
                fact_check_tasks = [run_fact_check(claim, client) for claim in claims_to_check]
                fact_check_results = await asyncio.gather(*fact_check_tasks)
                
        final_response = {
            "initial_analysis": initial_analysis,
            "source_analysis": source_analysis,
            "fact_checks": fact_check_results,
            "contradictions": contradictions
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


        vision_task = asyncio.to_thread(get_reverse_image_search_results, image_data)

        
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
        vision_response, visual_forensics = await asyncio.gather(
            vision_model.generate_content_async([image_prompt, pil_img], safety_settings=safety_settings),
            vision_task
        )
        parts = vision_response.text.split('|||')

        # Create a placeholder reverse image search URL (since we don't have a URL for uploaded images)
        reverse_image_search_url = "https://lens.google.com/upload"  # Generic upload URL

        if len(parts) < 5: raise ValueError("AI response for image did not have the expected 5 parts.")

        score_match = re.search(r'\d+', parts[0])
        score = int(score_match.group(0)) if score_match else 0
        explanation_clean = parts[1].split(':', 1)[-1].strip()
        # Normalize the bias response to match the format UI expects
        bias_raw = parts[2].split(':', 1)[-1].strip().lower()
        bias_clean = "Center"  # Default
        if "left" in bias_raw:
            bias_clean = "Left-Leaning" if "center" in bias_raw else "Left"
        elif "right" in bias_raw:
            bias_clean = "Right-Leaning" if "center" in bias_raw else "Right"
        elif "neutral" in bias_raw or "center" in bias_raw:
            bias_clean = "Center"
        elif "satire" in bias_raw:
            bias_clean = "Satire"
        
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
            #"reverse_image_search_url": reverse_image_search_url,
            "visual_forensics": visual_forensics,
            "filename": file.filename
        }
        return final_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {type(e).__name__} - {e}")


@app.post("/v2/analyze_video")
async def analyze_video_v2(request: V2VideoAnalysisRequest):
    video_path = None
    transcript_text = ""
    download_url = None
    try:
        # --- Step 1: Get transcript using the appropriate method ---
        # analyze_video_url_async will raise exceptions on failure
        transcript_text, download_url = await analyze_video_url(request.url)

        # --- Step 2: Run text analysis based on the transcript ---
        initial_analysis_task = run_full_analysis(transcript_text, request.url)

        # --- Step 3: Concurrently download video (if needed) and run text analysis ---
        # Only download if we got a transcript and URL
        video_download_task = None
        if transcript_text and download_url:
             # Run synchronous download_video in a thread
             video_download_task = asyncio.to_thread(download_video, download_url)

        # Await text analysis results
        initial_analysis, source_analysis, claims_to_check = await initial_analysis_task

        visual_context = []
        if video_download_task:
            try:
                video_path = await video_download_task # Get the downloaded path
                if video_path:
                    # Run synchronous get_visual_context in a thread
                    visual_context_task = asyncio.to_thread(get_visual_context, video_path)
                    visual_context = await visual_context_task
                else:
                    print("Video download returned None path.")
            except HTTPException as e:
                # Catch specific download errors (like the bot detection)
                print(f"Video download failed during analysis: {e.detail}")
                # Optionally add this info to the response instead of failing the whole request
            except Exception as e:
                 print(f"Error during video download/visual context: {e}")
        # Run fact-checking
        fact_check_results = []
        if claims_to_check:
            async with httpx.AsyncClient() as client:
                fact_check_tasks = [run_fact_check(claim, client) for claim in claims_to_check]
                fact_check_results = await asyncio.gather(*fact_check_tasks)

        final_response = {
            "initial_analysis": initial_analysis,
            "source_analysis": source_analysis,
            "fact_checks": fact_check_results,
            "visual_context": visual_context
        }
        return final_response
    except HTTPException as e:
        # Re-raise HTTPExceptions from download/API calls
        raise e
    except Exception as e:
        # General catch-all
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {type(e).__name__} - {e}")
    finally:
        # Final cleanup attempt
        if video_path and os.path.exists(video_path):
            try: os.remove(video_path)
            except Exception as cleanup_err: print(f"Error during final cleanup: {cleanup_err}")


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