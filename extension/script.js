// This function grabs the main content from the page
function getArticleText() {
    // A simple heuristic to find the main content of a news article
    const mainContent = document.querySelector('main, article, [role="main"]');
    return mainContent ? mainContent.innerText : document.body.innerText.substring(0, 5000);
}

// The main script that runs when the popup is opened
document.addEventListener('DOMContentLoaded', () => {
    const loadingView = document.getElementById('loading-view');
    const resultsView = document.getElementById('results-view');
    const errorView = document.getElementById('error-view');
    //const pageTitleEl = document.getElementById('page-title');
    const youtubeView = document.getElementById('youtube-view');
    const analyzeVideoButton = document.getElementById('analyze-video-button');


    // Get the current tab to extract its URL and content
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab || !currentTab.url || !currentTab.url.startsWith('http')) {
            showError("This page can't be analyzed.");
            return;
        }


        if (currentTab.url.includes("youtube.com/watch")) {
            // If we are on a YouTube video, show the special button
            loadingView.classList.add('hidden');
            youtubeView.classList.remove('hidden');

            analyzeVideoButton.addEventListener('click', async () => {
                youtubeView.classList.add('hidden');
                loadingView.classList.remove('hidden');
                try {
                    const response = await fetch('http://127.0.0.1:8000/v2/analyze_video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: currentTab.url }),
                    });
                    if (!response.ok) { throw new Error((await response.json()).detail); }
                    const data = await response.json();
                    displayResults(data);
                } catch (error) {
                    showError(error.message);
                }
            });
       
        }
        else{
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                function: function getArticleText() {
                    const mainContent = document.querySelector('main, article, [role="main"]');
                    return mainContent ? mainContent.innerText : document.body.innerText.substring(0, 5000);
                },
            }, async (injectionResults) => {
                if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) {
                    showError("Could not retrieve text from the page.");
                    return;
                }

                const pageText = injectionResults[0].result;
                if (!pageText || pageText.trim().length < 100) {
                    showError("Not enough text on the page to analyze.");
                    return;
                }
            

                try {
                    
                    const response = await fetch('http://127.0.0.1:8000/v2/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: pageText,
                            url: currentTab.url
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.detail || 'Analysis failed.');
                    }

                    const data = await response.json();
                    displayResults(data);

                } catch (error) {
                    showError(error.message);
                }
            });
        }
    });
});

function displayResults(data) {
    // ---- 1. Credibility Score Gauge ----
    const score = data.initial_analysis.credibility_score;
    const gaugeFill = document.querySelector('.score-gauge__fill');
    const scoreText = document.getElementById('score-text');
    
    // Calculate rotation (0 score = -90deg, 100 score = 90deg)
    const rotation = (score / 100) * 180 - 90;
    gaugeFill.style.transform = `rotate(${rotation}deg)`;
    scoreText.textContent = `${score}/100`;

    if (score > 75) gaugeFill.style.background = '#28a745'; // Green
    else if (score > 40) gaugeFill.style.background = '#ffc107'; // Yellow
    else gaugeFill.style.background = '#dc3545'; // Red

    document.getElementById('summary-text').textContent = data.initial_analysis.explanation;
    
    // ---- 2. Source Analysis Meter ----
    const biasIndicator = document.getElementById('bias-indicator');
    const bias = data.source_analysis.political_bias.toLowerCase();
    let biasPosition = 50; // Default to Center
    if (bias.includes('left')) biasPosition = bias.includes('center') ? 25 : 0;
    if (bias.includes('right')) biasPosition = bias.includes('center') ? 75 : 100;
    biasIndicator.style.left = `${biasPosition}%`;

    const factualityRating = document.getElementById('factuality-rating');
    const factuality = data.source_analysis.factuality_rating.toLowerCase();
    factualityRating.textContent = data.source_analysis.factuality_rating;
    if (factuality.includes('high')) factualityRating.style.background = '#28a745';
    else if (factuality.includes('mixed')) factualityRating.style.background = '#ffc107';
    else factualityRating.style.background = '#dc3545';

    // ---- 3. Interactive Fact Checks ----
    const factCheckContent = document.getElementById('fact-check-content');
    factCheckContent.innerHTML = ''; // Clear previous results
    if (data.fact_checks && data.fact_checks.length > 0) {
        data.fact_checks.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'fact-check-item';
            
            const header = document.createElement('div');
            header.className = 'claim-header';
            header.textContent = `Claim: ${item.claim}`;
            
            const details = document.createElement('div');
            details.className = 'claim-details hidden'; // Initially hidden
            details.innerHTML = `<strong>Status:</strong> ${item.status} 
                ${item.status === 'Fact Check Found' ? `(<a href="${item.url}" target="_blank">${item.publisher} - ${item.rating}</a>)` : ''}`;

            itemDiv.appendChild(header);
            itemDiv.appendChild(details);
            factCheckContent.appendChild(itemDiv);

            // Add click event to toggle details
            itemDiv.addEventListener('click', () => {
                details.classList.toggle('hidden');
            });
        });
    } else {
        factCheckContent.textContent = 'No specific claims were fact-checked.';
    }

    // Switch views
    document.getElementById('loading-view').classList.add('hidden');
    document.getElementById('results-view').classList.remove('hidden');
}

function showError(message) {
    document.getElementById('loading-view').classList.add('hidden');
    const errorView = document.getElementById('error-view');
    errorView.textContent = `Error: ${message}`;
    errorView.classList.remove('hidden');
}