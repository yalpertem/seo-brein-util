/**
 * SEO Brein Translator - Content Script
 * Automatically translates Dutch content to English on community.seobrein.nl
 */

class SEOBreinTranslator {
  constructor() {
    this.translator = null;
    this.isTranslating = false;
    this.processedNodes = new WeakSet();
    this.translationCache = new Map();
    this.observer = null;

    // Initialize translation when page loads
    this.init();
  }

  async init() {
    console.log("SEO Brein Translator: Initializing...");

    // Wait for page to be fully loaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.startTranslation()
      );
    } else {
      this.startTranslation();
    }
  }

  async startTranslation() {
    try {
      // Try to initialize Chrome's built-in Translation API
      await this.initializeTranslator();

      // Translate existing content
      await this.translatePage();

      // Set up observer for dynamic content
      this.setupMutationObserver();

      console.log("SEO Brein Translator: Translation setup complete");
    } catch (error) {
      console.error(
        "SEO Brein Translator: Error during initialization:",
        error
      );
    }
  }

  async initializeTranslator() {
    try {
      // Check if Chrome's Translation API is available
      if (window.translation && window.translation.createTranslator) {
        console.log("SEO Brein Translator: Using Chrome Translation API");
        this.translator = await window.translation.createTranslator({
          sourceLanguage: "auto", // Auto-detect source language
          targetLanguage: "en", // Translate to English
        });

        // Wait for translator to be ready
        await this.translator.ready;
        console.log("SEO Brein Translator: Chrome translator ready");
      } else {
        console.log(
          "SEO Brein Translator: Chrome Translation API not available, using fallback"
        );
        this.translator = null;
      }
    } catch (error) {
      console.warn(
        "SEO Brein Translator: Failed to initialize Chrome translator, using fallback:",
        error
      );
      this.translator = null;
    }
  }

  async translatePage() {
    if (this.isTranslating) return;
    this.isTranslating = true;

    try {
      // Get all text nodes in the document
      const textNodes = this.getTextNodes(document.body);
      console.log(
        `SEO Brein Translator: Found ${textNodes.length} text nodes to process`
      );

      // Process nodes in batches to avoid overwhelming the browser
      const batchSize = 20;
      for (let i = 0; i < textNodes.length; i += batchSize) {
        const batch = textNodes.slice(i, i + batchSize);
        await this.processBatch(batch);

        // Small delay between batches
        await this.delay(50);
      }
    } finally {
      this.isTranslating = false;
    }
  }

  async processBatch(textNodes) {
    const promises = textNodes.map((node) => this.translateTextNode(node));
    await Promise.allSettled(promises);
  }

  async translateTextNode(node) {
    if (this.processedNodes.has(node)) return;

    const text = node.textContent.trim();
    if (!text || text.length < 3) return;

    // Skip if text appears to be already in English or contains mostly numbers/symbols
    if (this.isLikelyEnglish(text)) return;

    try {
      const translatedText = await this.translateText(text);
      if (translatedText && translatedText !== text) {
        node.textContent = translatedText;
        this.processedNodes.add(node);
      }
    } catch (error) {
      console.warn(
        "SEO Brein Translator: Failed to translate text:",
        text,
        error
      );
    }
  }

  async translateText(text) {
    // Check cache first
    if (this.translationCache.has(text)) {
      return this.translationCache.get(text);
    }

    let translatedText;

    if (this.translator) {
      // Use Chrome's Translation API
      try {
        const result = await this.translator.translate(text);
        translatedText = result.translatedText;
      } catch (error) {
        console.warn(
          "SEO Brein Translator: Chrome API translation failed, trying fallback:",
          error
        );
        translatedText = await this.fallbackTranslate(text);
      }
    } else {
      // Use fallback translation
      translatedText = await this.fallbackTranslate(text);
    }

    // Cache the result
    if (translatedText) {
      this.translationCache.set(text, translatedText);
    }

    return translatedText;
  }

  async fallbackTranslate(text) {
    try {
      // Send message to background script for Google Cloud Translate fallback
      const response = await chrome.runtime.sendMessage({
        action: "translate",
        text: text,
        source: "auto",
        target: "en",
      });

      return response.translatedText;
    } catch (error) {
      console.warn("SEO Brein Translator: Fallback translation failed:", error);
      return null;
    }
  }

  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // Skip script, style, and other non-visible elements
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tagName = parent.tagName.toLowerCase();
        if (["script", "style", "noscript", "iframe"].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if parent is hidden
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

  isLikelyEnglish(text) {
    // Simple heuristic to detect if text might already be in English
    // This helps avoid unnecessary translation attempts

    // Check for common English words
    const englishWords =
      /\b(the|and|or|but|in|on|at|to|for|of|with|by|a|an|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|this|that|these|those|i|you|he|she|it|we|they|me|him|her|us|them)\b/gi;
    const englishMatches = (text.match(englishWords) || []).length;

    // Check for Dutch/other language indicators
    const dutchWords =
      /\b(de|het|en|van|in|op|voor|met|een|is|zijn|was|waren|hebben|heeft|had|doen|doet|deed|zal|zou|kan|dit|dat|deze|die|ik|jij|hij|zij|wij|jullie|zij|mij|hem|haar|ons|hen)\b/gi;
    const dutchMatches = (text.match(dutchWords) || []).length;

    const words = text.split(/\s+/).length;

    // If more than 30% are English words and fewer Dutch words, consider it English
    return englishMatches > words * 0.3 && englishMatches > dutchMatches;
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      const newTextNodes = [];

      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              newTextNodes.push(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              newTextNodes.push(...this.getTextNodes(node));
            }
          });
        }
      });

      if (newTextNodes.length > 0) {
        console.log(
          `SEO Brein Translator: Processing ${newTextNodes.length} new text nodes`
        );
        this.processBatch(newTextNodes);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log(
      "SEO Brein Translator: Mutation observer set up for dynamic content"
    );
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Cleanup method (called when page unloads)
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.translator && this.translator.destroy) {
      this.translator.destroy();
    }
  }
}

// Initialize the translator when the script loads
const translator = new SEOBreinTranslator();

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  translator.destroy();
});
