// Debug script - paste this in browser console to check extension status
console.log("=== SEO Brein Translator Debug Info ===");

// Check if Chrome Translation API is available
if (window.translation && window.translation.createTranslator) {
  console.log("✅ Chrome Translation API is available");
} else {
  console.log("❌ Chrome Translation API not available - will use fallback");
}

// Check if extension content script is loaded
if (window.translator) {
  console.log("✅ Extension content script is loaded");
} else {
  console.log("❌ Extension content script not detected");
}

// Check extension permissions
chrome.runtime.sendMessage({ action: "test" }, (response) => {
  if (chrome.runtime.lastError) {
    console.log("❌ Extension communication error:", chrome.runtime.lastError);
  } else {
    console.log("✅ Extension background script is responding");
  }
});

// Check current page URL
console.log("Current page:", window.location.href);

// Check for translated content
const textNodes = [];
const walker = document.createTreeWalker(
  document.body,
  NodeFilter.SHOW_TEXT,
  null,
  false
);

let node;
while ((node = walker.nextNode())) {
  if (node.textContent.trim().length > 10) {
    textNodes.push(node.textContent.trim().substring(0, 50) + "...");
  }
}

console.log(`Found ${textNodes.length} text nodes for potential translation`);
console.log("Sample text nodes:", textNodes.slice(0, 5));

console.log("=== End Debug Info ===");
