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
    const pageTitleEl = document.getElementById('page-title');

    // Get the current tab to extract its URL and content
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab || !currentTab.url || !currentTab.url.startsWith('http')) {
            showError("This page can't be analyzed.");
            return;
        }

        pageTitleEl.textContent = currentTab.title || 'current page';

        // Execute a script in the tab to get its text content
        chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            function: getArticleText,
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
                // Call our powerful backend
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
    });
});

function displayResults(data) {
    // Populate the UI with the rich data from our backend
    const sourceContent = document.getElementById('source-analysis-content');
    const initialContent = document.getElementById('initial-analysis-content');
    const factCheckContent = document.getElementById('fact-check-content');

    // Source Analysis
    const bias = data.source_analysis.political_bias;
    const factuality = data.source_analysis.factuality_rating;
    sourceContent.innerHTML = `<p><strong>Bias:</strong> ${bias}</p><p><strong>Factuality:</strong> ${factuality}</p>`;

    // Initial Analysis
    const score = data.initial_analysis.credibility_score;
    const explanation = data.initial_analysis.explanation;
    initialContent.innerHTML = `<div class="score">${score}/100</div><p>${explanation}</p>`;

    // Fact Checks
    factCheckContent.innerHTML = ''; // Clear previous results
    if (data.fact_checks && data.fact_checks.length > 0) {
        const ul = document.createElement('ul');
        data.fact_checks.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>Claim:</strong> ${item.claim}<br/>
                            <strong>Status:</strong> ${item.status} 
                            ${item.status === 'Fact Check Found' ? `(<a href="${item.url}" target="_blank">${item.publisher} - ${item.rating}</a>)` : ''}`;
            ul.appendChild(li);
        });
        factCheckContent.appendChild(ul);
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