// background.js
// Handles storage requests from content scripts

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getStorage') {
    chrome.storage.local.get([request.key], (result) => {
      sendResponse({ value: result[request.key] });
    });
    return true; // async
  }
  if (request.type === 'setStorage') {
    chrome.storage.local.set({ [request.key]: request.value }, () => {
      sendResponse({ success: true });
    });
    return true; // async
  }
});

// Listen for extension icon click and send toggle message to content script
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      window.postMessage({ type: 'minimal-notes-toggle' }, '*');
    }
  });
});
