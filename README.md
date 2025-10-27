# TruthGuard AI 🛡️

### A Multi-Modal, Tool-Augmented AI Co-Pilot for Verifying Digital Information

TruthGuard AI is a sophisticated browser extension that serves as a real-time "News Context Engine" to analyze news articles, images, and videos. Its core innovation is a **"Tool-Augmented AI"** philosophy, which combines the nuanced understanding of Google's Gemini models with verifiable data from a suite of specialized tools to provide users with unparalleled context and credibility analysis.

---

## 🚀 Live Application

Our project is fully deployed and live!

* **Frontend (Web App):** `https://gen-lang-client-0860021451.web.app/`

* **Browser Extension (Chrome):**

    **Sideload from `.crx` file:** [`extension.crx`](./extension.crx)

    <details>
    <summary>Click here for Chrome installation instructions</summary>

    1. Download the `TruthGuardAI.crx` file from this repository (or use [`extension.crx`](./extension.crx)).
    2. Open Chrome and navigate to `chrome://extensions`.
    3. Enable **Developer mode** using the toggle in the top-right corner.
    4. Drag and drop the downloaded `.crx` file onto the extensions page.
    5. When prompted, click **Add extension** to confirm the installation.

    </details>

* **Backend (Live API):**
    [![Backend API](https://img.shields.io/badge/Backend_API-Live-4285F4?style=for-the-badge&logo=google-cloud)](https://truth-guard-ai-309053470356.asia-south1.run.app/)

---


## ✨ Core Features

* **Seamless Browser Extension:** A polished and intuitive UI that works directly on any live webpage, providing in-context analysis without friction.

* **Multi-Modal Analysis Engine:** A powerful, unified system to analyze:
    * **Text:** Deconstructs news articles and text-based posts for credibility.
    * **Images:** A right-click context menu uses **Gemini 1.5 Pro's vision capabilities** to analyze any image on the web.
    * **Video (Platform-Agnostic):** Analyzes YouTube videos via their transcript API for speed, and videos from other platforms like X (Twitter) by using `yt-dlp` to download audio and a **Hugging Face Whisper model** for transcription.

* **The "Tool-Augmented" Intelligence Layer:** We never just trust the LLM. Our analysis is enriched with verifiable data from:
    * **Custom-Trained ML Model:** A `scikit-learn` model provides a data-driven **Source Bias & Factuality Rating**.
    * **Live WHOIS Lookup:** A real-time `whois` query provides the **Domain Age** as a key credibility indicator.
    * **Programmatic Fact-Checking:** Automatically extracts claims and queries the **Google Fact Check Tools API** for third-party verification.
    * **Automated Reverse Image Search:** Instantly generates a **Google Lens** link for any analyzed image to verify its origin.

---

## 🏗️ Architecture

Our system is a scalable, three-tier architecture **deployed on Google Cloud**.

**(You can create a simple diagram based on the description below and insert the image here)**


1.  **Frontend (Client):** A Chrome Browser Extension and a web app (Firebase Hosting) built with HTML, CSS, and JavaScript.
2.  **Backend (Server):** A Python **FastAPI** server, deployed on **Google Cloud Run** for automatic scaling.
3.  **Intelligence Layer (Tools & Models):**
    * **Google Gemini API (1.5 Pro & Flash):** For primary content analysis and vision.
    * **Google Fact Check Tools API:** For claim verification.
    * **Custom ML Model:** A `.joblib` model trained with `scikit-learn` for source analysis.
    * **Local Transcription Pipeline:** A `yt-dlp` downloader and Hugging Face Whisper model for video analysis.
    * **Other Tools:** `whois` for domain age, OpenCV for video processing.

---

## 💻 Technology Stack

* **Frontend:** HTML5, CSS3, JavaScript
* **Backend:** Python, FastAPI
* **AI & Machine Learning:**
    * Google Gemini API (1.5 Pro & 1.5 Flash)
    * Hugging Face Transformers (Whisper)
    * Scikit-learn, Pandas, Joblib
    * OpenCV
* **External APIs & Tools:**
    * Google Fact Check Tools API
    * `yt-dlp` & `youtube-transcript-api`
    * `python-whois`
* **Deployment:**
    * Google Cloud Run
    * Docker

---

## 🛠️ Local Development Setup

To run this project on a local machine for development purposes:

### **1. Create `requirements.txt`**
In your terminal (with your virtual environment active), run this command to create a list of all necessary libraries:
```bash
pip freeze > requirements.txt
```

### **2. Backend Setup**
* Clone the repository: `git clone https://github.com/Skullybutcher/google-genai-hackathon`
* Navigate to the project folder.
* Create a virtual environment: `python -m venv venv`
* Activate it: `source venv/bin/activate` or `venv\Scripts\activate`
* Install dependencies: `pip install -r requirements.txt`
* Create a `.env` file and add your `GEMINI_API_KEY` and `FACT_CHECK_API_KEY`.
* (Optional) To retrain the source analysis model, run `python train.py`.
* Run the server: `uvicorn main:app --reload`

### **3. Frontend Setup**
* Open your browser (Chrome) and navigate to the extensions page (`chrome://extensions`).
* Enable "Developer mode".
* Click "Load unpacked" and select the `extension` folder from this repository.
