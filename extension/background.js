// background.js

// 1. Create the context menu item when the extension is installed.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyzeImageWithTruthGuard",
    title: "Analyze Image with TruthGuard AI",
    contexts: ["image"] // This makes the option appear only when you right-click an image
  });
});

// 2. Listen for a click on our context menu item.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyzeImageWithTruthGuard") {
    // 3. Get the URL of the image that was clicked.
    const imageUrl = info.srcUrl;
    
    // 4. Open our popup.html in a new tab and pass the image URL to it.
    
    const analysisUrl = chrome.runtime.getURL(`popup.html?image=${encodeURIComponent(imageUrl)}`);
    chrome.tabs.create({ url: analysisUrl });
  }
});