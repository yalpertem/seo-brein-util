// Console commands for debugging SEO Brein Translator
// Copy and paste these into the browser console while on community.seobrein.nl

// 1. Check if extension is loaded and get stats
function checkExtension() {
  if (window.translator) {
    console.log("✅ Extension loaded");
    console.log("Stats:", window.translator.getStats());
    return true;
  } else {
    console.log("❌ Extension not loaded");
    return false;
  }
}

// 2. Force re-translation of the entire page
function forceTranslate() {
  if (window.translator) {
    console.log("🔄 Forcing re-translation...");
    window.translator.forceRetranslate();
  } else {
    console.log("❌ Extension not loaded");
  }
}

// 3. Check what content is being detected
function analyzeContent() {
  if (!window.translator) {
    console.log("❌ Extension not loaded");
    return;
  }

  const textNodes = window.translator.getTextNodes(document.body);
  console.log(`Found ${textNodes.length} text nodes`);

  const samples = textNodes.slice(0, 10).map((node, i) => ({
    index: i,
    text: node.textContent.trim().substring(0, 100),
    parent: node.parentElement?.tagName,
    isProcessed: window.translator.processedNodes.has(node),
  }));

  console.table(samples);
}

// 4. Test translation of specific text
async function testTranslation(text = "Dit is een test") {
  if (!window.translator) {
    console.log("❌ Extension not loaded");
    return;
  }

  try {
    console.log(`Testing translation of: "${text}"`);
    const result = await window.translator.translateText(text);
    console.log(`Result: "${result}"`);
  } catch (error) {
    console.log("Translation failed:", error);
  }
}

// 5. Monitor for new content
function startMonitoring() {
  let lastNodeCount = 0;
  const monitor = setInterval(() => {
    if (window.translator) {
      const stats = window.translator.getStats();
      if (stats.totalTextNodes !== lastNodeCount) {
        console.log(
          `📊 Node count changed: ${lastNodeCount} → ${stats.totalTextNodes}`
        );
        lastNodeCount = stats.totalTextNodes;
      }
    }
  }, 2000);

  console.log("🔍 Started monitoring content changes (every 2 seconds)");

  // Stop monitoring after 30 seconds
  setTimeout(() => {
    clearInterval(monitor);
    console.log("⏹️ Stopped monitoring");
  }, 30000);
}

// 6. Check for feed-specific elements
function checkFeedElements() {
  const selectors = [
    ".feed",
    ".post",
    ".topic",
    ".content",
    ".message",
    ".entry",
    "[data-post]",
    ".stream",
    ".timeline",
    ".item",
    ".thread",
    ".discussion",
    ".comment",
    ".reply",
  ];

  console.log("🔍 Checking for feed elements...");

  selectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ Found ${elements.length} elements: ${selector}`);

      // Check text content in first few elements
      Array.from(elements)
        .slice(0, 3)
        .forEach((el, i) => {
          const text = el.textContent.trim().substring(0, 100);
          if (text) {
            console.log(`   Sample ${i + 1}: "${text}..."`);
          }
        });
    }
  });
}

// Display available commands
console.log(`
🔧 SEO Brein Translator Debug Commands:
1. checkExtension() - Check if extension is loaded and get stats
2. forceTranslate() - Force re-translation of the entire page
3. analyzeContent() - Show detected text nodes
4. testTranslation("your text") - Test translation of specific text
5. startMonitoring() - Monitor for content changes
6. checkFeedElements() - Look for feed-specific elements

Example usage:
  checkExtension()
  forceTranslate()
  analyzeContent()
  testTranslation("Dit is Nederlandse tekst")
`);
