// content_script.js

function getArticleText() {
    // Special handling for X (Twitter) posts
    if (window.location.hostname.includes('x.com') || window.location.hostname.includes('twitter.com')) {
        // Look for the main tweet content
        const tweetText = document.querySelector('[data-testid="tweetText"]');
        if (tweetText) {
            return tweetText.innerText;
        }
        // Fallback for quote tweets or thread context
        const tweets = document.querySelectorAll('[data-testid="tweet"]');
        if (tweets.length > 0) {
            return Array.from(tweets).map(t => t.innerText).join('\n\n');
        }
    }

    // For other platforms
    const mainContent = document.querySelector('main, article, [role="main"]');
    if (mainContent) {
        return mainContent.innerText;
    }

    // Last resort: get body text but limit size
    return document.body.innerText.substring(0, 5000);
}

// Execute the function and return its result
getArticleText();