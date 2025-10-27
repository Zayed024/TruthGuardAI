// content_script.js

function getArticleText() {
    const mainContent = document.querySelector('main, article, [role="main"]');
    // Return the text to the script that called this
    return mainContent ? mainContent.innerText : document.body.innerText.substring(0, 5000);
}

// Execute the function and return its result
getArticleText();