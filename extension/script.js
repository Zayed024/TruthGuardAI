// script.js (Manifest V3)

document.addEventListener('DOMContentLoaded', () => {
    // Get references to all the UI sections
    const loadingView = document.getElementById('loading-view');
    const resultsView = document.getElementById('results-view');
    const errorView = document.getElementById('error-view');
    const youtubeView = document.getElementById('youtube-view');
    const analyzeVideoButton = document.getElementById('analyze-video-button');

    // --- Logic to determine which analysis to run ---
    const urlParams = new URLSearchParams(window.location.search);
    const imageUrlToAnalyze = urlParams.get('image');

    if (imageUrlToAnalyze) {
        // --- Path 1: Image Analysis (triggered from context menu) ---
        document.querySelector('header h1').textContent = "Image Analysis";
        analyzeImage(imageUrlToAnalyze);
    } else {
        // --- Path 2: Standard Page Analysis (triggered from popup click) ---
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            if (!currentTab || !currentTab.url) {
                showError("Cannot access this tab.");
                return;
            }

            // Check if the page is a YouTube video
            if (currentTab.url.includes("youtube.com/watch")) {
                loadingView.classList.add('hidden');
                youtubeView.classList.remove('hidden');

                analyzeVideoButton.addEventListener('click', async () => {
                    youtubeView.classList.add('hidden');
                    loadingView.classList.remove('hidden');
                    // Call the video analysis endpoint
                    await performAnalysis('video', { url: currentTab.url });
                });
            } else {
                // --- It's a standard text article, use the V2 method ---
                chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    files: ["content_script.js"]
                }, async (injectionResults) => {
                        if (chrome.runtime.lastError || !injectionResults || !injectionResults[0] || !injectionResults[0].result) {
                            showError("Could not retrieve text from the page. Try a different article.");
                            return;
                        }
                        const pageText = injectionResults[0].result;
                        if (typeof pageText !== 'string' || pageText.trim().length < 100) {
                            showError("Not enough text on the page to analyze.");
                            return;
                        }
                        // Call the text analysis endpoint
                        await performAnalysis('text', { text: pageText, url: currentTab.url });
                    }
                );
            }
        });
    }
});

// Utility: safely read string fields from possibly-missing nested objects
function safeGetString(obj, path, fallback = '') {
    try {
        const parts = path.split('.');
        let cur = obj;
        for (const p of parts) {
            if (!cur || typeof cur !== 'object' || !(p in cur)) return fallback;
            cur = cur[p];
        }
        return cur == null ? fallback : String(cur);
    } catch (e) {
        return fallback;
    }
}

/**
 * A centralized function to call the backend and display results.
 * @param {('text'|'video'|'image')} type - The type of analysis to perform.
 * @param {object} body - The request body to send to the backend.
 */
async function performAnalysis(type, body) {
    const endpoints = {
        text: 'https://truth-guard-ai-309053470356.asia-south1.run.app/v2/analyze',
        video: 'https://truth-guard-ai-309053470356.asia-south1.run.app/v2/analyze_video',
        image: 'https://truth-guard-ai-309053470356.asia-south1.run.app/v2/analyze_image'
    };

    try {
        const response = await fetch(endpoints[type], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Analysis failed due to an unknown error.');
        }
        const data = await response.json();
        displayResults(data);
    } catch (error) {
        showError(error.message);
    }
}

// You can call this function directly from the if/else block now
async function analyzeImage(imageUrl) {
    document.querySelector('header h1').textContent = "Image Analysis";
    await performAnalysis('image', { image_url: imageUrl });
}


/**
 * Renders the full analysis dashboard in the UI.
 * @param {object} data - The complete analysis data from the backend.
 */
function displayResults(data) {
    // --- Credibility Score Gauge ---
    const score = data.initial_analysis.credibility_score;
    const gaugeFill = document.querySelector('.score-gauge__fill');
    const scoreText = document.getElementById('score-text');
    
    const rotation = (score / 100) * 180 - 90;
    gaugeFill.style.transform = `rotate(${rotation}deg)`;
    scoreText.textContent = `${score}/100`;

    if (score > 75) gaugeFill.style.background = '#28a745';
    else if (score > 40) gaugeFill.style.background = '#ffc107';
    else gaugeFill.style.background = '#dc3545';

    document.getElementById('summary-text').textContent = data.initial_analysis.explanation;
    
    // --- Source Analysis Meter ---
    const biasIndicator = document.getElementById('bias-indicator');
    const biasText = document.getElementById('bias-text');
    const biasRaw = safeGetString(data, 'source_analysis.political_bias', '');
    const bias = (biasRaw || '').toLowerCase();
    
    biasText.textContent = biasRaw || 'Unknown';
    biasText.style.background = '#6c757d'; // Neutral gray for bias text

    let biasPosition = 50; // Default to Center
    if (bias.includes('left')) biasPosition = bias.includes('center') ? 25 : 0;
    if (bias.includes('right')) biasPosition = bias.includes('center') ? 75 : 100;
    biasIndicator.style.left = `${biasPosition}%`;

    const factualityRating = document.getElementById('factuality-rating');
    const factualityRaw = safeGetString(data, 'source_analysis.factuality_rating', '');
    const factuality = (factualityRaw || '').toLowerCase();
    factualityRating.textContent = factualityRaw || 'Unknown';

    if (factuality.includes('high')) factualityRating.style.background = '#28a745';
    else if (factuality.includes('mixed')) factualityRating.style.background = '#ffc107';
    else factualityRating.style.background = '#dc3545';

    const domainAge = document.getElementById('domain-age');
    const domainAgeRaw = safeGetString(data, 'source_analysis.domain_age', null);
    if (domainAgeRaw && domainAgeRaw !== "Unknown") {
        domainAge.textContent = domainAgeRaw;
        domainAge.style.background = '#6c757d';
    } else if (domainAge && domainAge.parentElement) {
        domainAge.parentElement.style.display = 'none';
    }

    // --- Populate Wikipedia Notes ---
    const wikiNotesText = document.getElementById('wiki-notes-text');
    const wikiNotesContainer = document.getElementById('wiki-notes-container');
    
    const notes = safeGetString(data, 'source_analysis.wikipedia_notes', '');
    // Only show the container if we have useful notes
    if (notes && !notes.startsWith("No") && !notes.startsWith("Error")) {
        wikiNotesText.textContent = notes;
        wikiNotesContainer.classList.remove('hidden');
    } else if (wikiNotesContainer) {
        // Otherwise, make sure it's hidden
        wikiNotesContainer.classList.add('hidden');
    }

    // --- Interactive Fact Checks ---
    const factCheckContent = document.getElementById('fact-check-content');
    factCheckContent.innerHTML = '';
    if (data.fact_checks && data.fact_checks.length > 0) {
        data.fact_checks.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'fact-check-item';
            
            const header = document.createElement('div');
            header.className = 'claim-header';
            header.textContent = `Claim: ${item.claim}`;
            
            const details = document.createElement('div');
            details.className = 'claim-details hidden';
            details.textContent = `Status: ${item.status}`;
            if (item.status === 'Fact Check Found') {
                const link = document.createElement('a');
                link.href = item.url;
                link.target = '_blank';
                link.textContent = `${item.publisher} - ${item.rating}`;
                details.appendChild(document.createTextNode(' ('));
                details.appendChild(link);
                details.appendChild(document.createTextNode(')'));
            }
            //${item.status === 'Fact Check Found' ? `(<a href="${item.url}" target="_blank">${item.publisher} - ${item.rating}</a>)` : ''}`;

            itemDiv.appendChild(header);
            itemDiv.appendChild(details);
            factCheckContent.appendChild(itemDiv);

            itemDiv.addEventListener('click', () => {
                details.classList.toggle('hidden');
            });
        });
    } else {
        factCheckContent.textContent = 'No specific claims were fact-checked.';
    }

    // --- Reverse Image Search Link ---
    const imageOriginCard = document.getElementById('image-origin-card');
    if (data.reverse_image_search_url) {
        const reverseSearchLink = document.getElementById('reverse-image-search-link');
        reverseSearchLink.href = data.reverse_image_search_url;
        imageOriginCard.classList.remove('hidden');
    }

    // --- Visual Context ---
    const visualContent = document.getElementById('visual-context-content');
    const visualCard = document.getElementById('visual-context-card');
    if (visualContent && visualCard) {
        visualContent.innerHTML = '';
        if (data.visual_context && data.visual_context.length > 0) {
            visualCard.classList.remove('hidden');
            data.visual_context.forEach(item => {
                const visualItem = document.createElement('div');
                visualItem.className = 'visual-item';
                
                const img = document.createElement('img');
                img.src = `data:image/jpeg;base64,${item.keyframe_base64}`;
                
                const contextText = document.createElement('p');
                contextText.textContent = item.context;

                visualItem.appendChild(img);
                visualItem.appendChild(contextText);
                visualContent.appendChild(visualItem);
            });
        }
    }
    
    // Switch views
    document.getElementById('loading-view').classList.add('hidden');
    document.getElementById('results-view').classList.remove('hidden');
}

/**
 * Displays an error message in the UI.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    document.getElementById('loading-view').classList.add('hidden');
    document.getElementById('youtube-view').classList.add('hidden');
    const errorView = document.getElementById('error-view');
    if (errorView) {
        errorView.querySelector('p').textContent = `Error: ${message}`;
        errorView.classList.remove('hidden');
    }
}