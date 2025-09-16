# TruthGuard AI 🛡️

### The AI Co-Pilot for Navigating Digital Information

TruthGuard AI is a multi-modal "News Context Engine" built as a browser extension for the Gen AI Exchange Hackathon. It goes beyond a simple "fake news detector" by augmenting the power of Google's Gemini models with a suite of verifiable, tool-driven data to provide users with deep, actionable context on any piece of content they encounter online.

---


## ✨ Core Features

* **Truly Multi-Modal Analysis:** A unified engine to analyze:
    * **Text:** News articles and social media posts.
    * **Video:** Handles YouTube URLs directly and other platforms like X (Twitter) and TikTok via a powerful local transcription pipeline.
    * **Images:** A right-click context menu allows for instant analysis of any image on the web.
* **Source Intelligence Dashboard:** A polished UI that provides an at-a-glance summary of the source's **Political Bias** and **Factuality Rating**.
* **Programmatic Fact-Checking:** Automatically extracts key claims from content and queries the **Google Fact Check Tools API** for third-party, verifiable results.
* **Visual Context Verification:** For images and video frames, the extension provides instant reverse image search capabilities and is built to support deeper forensic analysis.

---

## 💡 Our Innovation: Tool-Augmented AI

Our core principle is to **"never just trust the LLM."** While many tools are simple wrappers around a generative model, TruthGuard AI's innovation is its ability to synthesize an LLM's nuanced understanding with the hard, verifiable data from a suite of specialized tools. This makes our analysis more reliable, defensible, and transparent.

---

## 🏗️ Architecture

Our system uses a scalable, three-tier architecture hosted on **Google Cloud**.

**(Create a simple diagram based on the description below and insert the image here)**


* **Frontend (Client):** A Chrome Browser Extension built with HTML, CSS, and JavaScript.
* **Backend (Server):** A Python **FastAPI** server deployed on **Google Cloud Run** for automatic scaling.
* **External Services & Tools (Verification Layer):**
    * **Google Gemini API (1.5 Pro & Flash):** For nuanced summarization, vision analysis, and claim extraction.
    * **Google Fact Check Tools API:** For programmatic claim verification.
    * **`yt-dlp` & Hugging Face Whisper:** For multi-platform video transcription.
    * **OpenCV:** For video frame analysis.

---

## 💻 Technology Stack

* **Frontend:** HTML5, CSS3, JavaScript
* **Backend:** Python, FastAPI
* **AI & Machine Learning:**
    * Google Gemini API 
    * Hugging Face Transformers (Whisper)
    * OpenCV
* **External APIs & Tools:**
    * Google Fact Check Tools API
    * `yt-dlp`
* **Deployment:**
    * Google Cloud Run
    * Docker

---

## 🚀 Setup and Installation

1.  Clone the repository: `git clone [your-repo-link]`
2.  **Backend Setup:**
    * Navigate to the backend folder.
    * Create a virtual environment: `python -m venv venv`
    * Activate it: `source venv/bin/activate` or `venv\Scripts\activate`
    * Install dependencies: `pip install -r requirements.txt`
    * Create a `.env` file and add your `GEMINI_API_KEY` and `FACT_CHECK_API_KEY`.
    * Run the server: `uvicorn main:app --reload`
3.  **Frontend Setup:**
    * Open Google Chrome and navigate to `chrome://extensions`.
    * Enable "Developer mode".
    * Click "Load unpacked" and select the `extension` folder from this repository.
