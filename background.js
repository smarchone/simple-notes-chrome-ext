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
