// Enhanced Debug script - paste this in browser console to check extension status
console.log("=== SEO Brein Translator Enhanced Debug Info ===");

// 1. Check if Chrome Translation API is available
console.log("1. Chrome Translation API Check:");
if (window.translation && window.translation.createTranslator) {
  console.log("✅ Chrome Translation API is available");

  // Test creating a translator
  window.translation
    .createTranslator({
      sourceLanguage: "auto",
      targetLanguage: "en",
    })
    .then(async (translator) => {
      await translator.ready;
      console.log("✅ Chrome translator created successfully");

      // Test translation
      try {
        const result = await translator.translate("Dit is een test");
        console.log("✅ Test translation successful:", result.translatedText);
      } catch (error) {
        console.log("❌ Test translation failed:", error);
      }
    })
    .catch((error) => {
      console.log("❌ Failed to create Chrome translator:", error);
    });
} else {
  console.log("❌ Chrome Translation API not available - will use fallback");
}

// 2. Check if extension content script is loaded
console.log("\n2. Extension Content Script Check:");
if (window.translator) {
  console.log("✅ Extension content script is loaded");
  console.log("Translator object:", window.translator);
} else {
  console.log("❌ Extension content script not detected");
}

// 3. Check extension permissions and background script
console.log("\n3. Extension Background Communication Check:");
chrome.runtime.sendMessage(
  { action: "translate", text: "test", source: "auto", target: "en" },
  (response) => {
    if (chrome.runtime.lastError) {
      console.log(
        "❌ Extension communication error:",
        chrome.runtime.lastError
      );
    } else {
      console.log("✅ Extension background script is responding:", response);
    }
  }
);

// 4. Check current page URL and matches
console.log("\n4. Page URL Check:");
console.log("Current page:", window.location.href);
const isMatched = window.location.href.includes("community.seobrein.nl");
console.log(
  "URL matches content script pattern:",
  isMatched ? "✅ Yes" : "❌ No"
);

// 5. Analyze page content and identify potential translation targets
console.log("\n5. Page Content Analysis:");

// Get all text nodes using the same method as the extension
function getTextNodesLikeExtension(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;

      const tagName = parent.tagName.toLowerCase();
      if (["script", "style", "noscript", "iframe"].includes(tagName)) {
        return NodeFilter.FILTER_REJECT;
      }

      const computedStyle = window.getComputedStyle(parent);
      if (
        computedStyle.display === "none" ||
        computedStyle.visibility === "hidden"
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  return textNodes;
}

const textNodes = getTextNodesLikeExtension(document.body);
console.log(`Found ${textNodes.length} eligible text nodes for translation`);

// Analyze content
const dutchSamples = [];
const englishSamples = [];
const shortTexts = [];

textNodes.forEach((node) => {
  const text = node.textContent.trim();
  if (text.length < 3) {
    shortTexts.push(text);
    return;
  }

  // Check if text looks Dutch or English using the same logic as extension
  const englishWords =
    /\b(the|and|or|but|in|on|at|to|for|of|with|by|a|an|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|this|that|these|those|i|you|he|she|it|we|they|me|him|her|us|them)\b/gi;
  const dutchWords =
    /\b(de|het|en|van|in|op|voor|met|een|is|zijn|was|waren|hebben|heeft|had|doen|doet|deed|zal|zou|kan|dit|dat|deze|die|ik|jij|hij|zij|wij|jullie|zij|mij|hem|haar|ons|hen)\b/gi;

  const englishMatches = (text.match(englishWords) || []).length;
  const dutchMatches = (text.match(dutchWords) || []).length;
  const words = text.split(/\s+/).length;

  const sample = text.substring(0, 100) + (text.length > 100 ? "..." : "");

  if (englishMatches > words * 0.3 && englishMatches > dutchMatches) {
    englishSamples.push(sample);
  } else if (dutchMatches > 0 || englishMatches <= words * 0.3) {
    dutchSamples.push(sample);
  }
});

console.log(`Short texts (< 3 chars): ${shortTexts.length}`);
console.log(`Likely English texts: ${englishSamples.length}`);
console.log(`Likely Dutch/other texts: ${dutchSamples.length}`);

console.log("\nSample Dutch/other texts that should be translated:");
dutchSamples.slice(0, 10).forEach((text, i) => {
  console.log(`${i + 1}. "${text}"`);
});

// 6. Check for feed-specific content
console.log("\n6. Feed Content Check:");
const feedSelectors = [
  ".feed",
  ".post",
  ".topic",
  ".content",
  ".message",
  ".entry",
  "[data-post]",
  ".stream",
  ".timeline",
];

let feedFound = false;
feedSelectors.forEach((selector) => {
  const elements = document.querySelectorAll(selector);
  if (elements.length > 0) {
    console.log(`Found ${elements.length} elements with selector: ${selector}`);
    feedFound = true;
  }
});

if (!feedFound) {
  console.log("❌ No obvious feed elements found with common selectors");
  console.log(
    "This might explain why translation isn't working on the main feed"
  );
}

// 7. Check if translation is actually happening
console.log("\n7. Translation Activity Check:");
if (window.translator && window.translator.isTranslating !== undefined) {
  console.log("Currently translating:", window.translator.isTranslating);
  console.log(
    "Processed nodes count:",
    window.translator.processedNodes
      ? "WeakSet exists"
      : "No processed nodes tracking"
  );
  console.log(
    "Translation cache size:",
    window.translator.translationCache
      ? window.translator.translationCache.size
      : "No cache"
  );
}

// 8. Test manual translation
console.log("\n8. Manual Translation Test:");
if (dutchSamples.length > 0) {
  const testText = dutchSamples[0].replace(/\.\.\.$/, "").substring(0, 50);
  console.log(`Testing translation of: "${testText}"`);

  if (window.translator && window.translator.translateText) {
    window.translator
      .translateText(testText)
      .then((result) => {
        console.log("Manual translation result:", result);
      })
      .catch((error) => {
        console.log("Manual translation error:", error);
      });
  }
}

console.log("\n=== End Enhanced Debug Info ===");

// 9. Continuous monitoring
console.log("\n9. Setting up continuous monitoring...");
let translationCount = 0;
const originalConsoleLog = console.log;

// Override console.log to catch translation activity
console.log = function (...args) {
  if (args[0] && args[0].includes && args[0].includes("SEO Brein Translator")) {
    translationCount++;
    originalConsoleLog.apply(console, ["[MONITORED]", ...args]);
  } else {
    originalConsoleLog.apply(console, args);
  }
};

setTimeout(() => {
  console.log = originalConsoleLog;
  console.log(`\n=== Monitoring Results (10 seconds) ===`);
  console.log(`Translation-related log messages detected: ${translationCount}`);
  console.log("=== End Monitoring ===");
}, 10000);
