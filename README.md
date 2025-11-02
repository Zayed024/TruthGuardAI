# TruthGuard AI 🛡️

An Agentic Verification Engine to Fix AI's Knowledge Cutoff and Fight Misinformation

TruthGuard AI is a sophisticated, multi-modal analysis tool. It began as a browser extension but has evolved into a full-stack, product-ready application. Its core innovation is an Agentic Verification Engine, which fixes the "knowledge cutoff" pitfall of LLMs by forcing them to reason over a "ground truth" context built from live, specialized tools.

## 🚀 Live Application

Our project is a scalable, cloud-native application.

**Frontend (Web App):**
https://gen-lang-client-0860021451.web.app/

**Backend (Live API):**
https://truth-guard-ai-309053470356.asia-south1.run.app/

**Browser Extension (Chrome):**

Sideload from `.crx` file: [extension.crx](./extension.crx)

<details>
<summary>Click here for Chrome installation instructions</summary>

1. Download the `.crx` file from this repository.
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top-right corner).
4. Drag and drop the `.crx` file onto the page.
5. Click **"Add extension"** to confirm.

</details>

## ✨ Core Features

- **Agentic "Knowledge Cutoff" Fix:**
  AI agent analyzes text to determine its category (e.g., "Current Event"), then dynamically selects tools (like NewsAPI) to gather live context. This "ground truth" is injected into the prompt, preventing hallucinations about recent events.

- **Agentic "Contradiction Detection":**
  A secondary AI step checks for contradictions between the article and ground truth data, flagging critical issues.

- **Multi-Modal Verification Engine:**
  - **Text:** Deconstructs news articles using the agentic pipeline.
  - **Video (Upgraded):** Transcribes non-YouTube videos (e.g., X, TikTok) using Google Cloud Speech-to-Text API.
  - **Image (Upgraded):** Enables reverse image search and "Visual Forensics" using Google Cloud Vision API.

- **AI-Powered "Source Intelligence Engine":**
  - **Hybrid ML Model:** Custom scikit-learn model with a grounded AI fallback (Gemini, WHOIS, Wikipedia).
  - **AI Wikipedia Agent:** Summarizes Wikipedia articles for controversies/bias, not just keywords.

## 🏗️ Architecture

A scalable, serverless, and secure cloud-native product.

- **Gatekeeper (Monetization):**
  Google Cloud API Gateway enforces API key authentication and user tiers.

- **Database (User Tiers):**
  Google Cloud Firestore manages API keys and user tiers ("free", "pro").

- **Frontend (Client):**
  Chrome Extension and Firebase-hosted React web app (TypeScript, Vite, Tailwind CSS)

- **Backend (Server):**
  FastAPI (Python, async) on Google Cloud Run for scaling

- **Intelligence Layer (Tools & Models):**
  - Google Cloud (Gemini Pro/Flash, Speech-to-Text, Vision API)
  - NewsAPI, Google Fact Check, Wikipedia API, WHOIS
  - Google Cloud Storage (audio for transcription)
  - Custom `.joblib` ML model (source analysis)

## 💸 Monetization & Scalability

**Go-to-Market:**
B2C "Freemium" model. Free users get basic analysis; "Pro" users (API key) unlock the full pipeline.

**Scalability:**
100% serverless: Cloud Run & API Gateway for compute scaling; Google APIs provide AI/ML scalability.

**Reliability:**
Async Python backend handles thousands of concurrent users. "Grounded AI Fallback" and "Contradiction Detection" guarantee resilience and trustworthy analysis.

## 💻 Technology Stack

- **Frontend:** React (TypeScript), Vite, Tailwind CSS, Firebase Hosting
- **Backend:** Python, FastAPI (Async)
- **AI & ML:** Gemini API (Pro & Flash), Google Cloud Speech-to-Text, Cloud Vision, scikit-learn, pandas, joblib
- **External APIs:** NewsAPI, Google Fact Check Tools API, youtube-transcript-api, python-whois, wikipedia-api, yt-dlp
- **Deployment:** Google Cloud Run, Google API Gateway, Google Cloud Storage/Firestore, Docker

## 🛠️ Local Development Setup

### 1. Backend Setup

**Clone the repository:**
```
git clone https://github.com/Skullybutcher/google-genai-hackathon
```

Navigate to the project folder.

**Create a virtual environment:**
```
python -m venv venv
```

**Activate it:**
- On macOS/Linux: `source venv/bin/activate`
- On Windows: `venv\Scripts\activate`

**Install dependencies:**
```
pip install -r requirements.txt
```

**Authenticate Google Cloud:**
```
gcloud auth application-default login
```

**Create .env file and add your API keys:**
```
GEMINI_API_KEY=...
FACT_CHECK_API_KEY=...
NEWS_API_KEY=...
GCS_BUCKET_NAME=...
```

**Run the server:**
```
uvicorn main:app --reload
```

### 2. Frontend Setup

**Navigate to the frontend directory:**
```
cd frontend
```

**Install dependencies:**
```
npm install
```

**Run the development server:**
```
npm run dev
```

**For the browser extension:**
1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the extension folder.
4. Important: Open `extension/script.js` and update:
   - `API_GATEWAY_URL` to `http://127.0.0.1:8000`
   - `API_KEY` to a valid key from your Firestore database for local testing
