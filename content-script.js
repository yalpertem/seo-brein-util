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

    // Target selectors for elements to translate
    this.targetSelectors = ["div.post__body"];

    // Initialize translation when page loads
    this.init();
  }

  async init() {
    console.log(
      `[${new Date().toISOString()}] SEO Brein Translator: Initializing...`
    );
    console.log(
      `[${new Date().toISOString()}] SEO Brein Translator: Current URL:`,
      window.location.href
    );
    console.log(
      `[${new Date().toISOString()}] SEO Brein Translator: Document ready state:`,
      document.readyState
    );

    // Make translator globally accessible for debugging
    window.translator = this;

    // Wait for page to be fully loaded
    if (document.readyState === "loading") {
      console.log(
        `[${new Date().toISOString()}] SEO Brein Translator: Waiting for DOMContentLoaded...`
      );
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

      // Add periodic re-scan for feeds that load content dynamically
      this.setupPeriodicRescan();

      console.log(
        `[${new Date().toISOString()}] SEO Brein Translator: Translation setup complete`
      );
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] SEO Brein Translator: Error during initialization:`,
        error
      );
    }
  }

  setupPeriodicRescan() {
    // Rescan the page every 5 seconds for the first minute to catch dynamically loaded content
    let rescanCount = 0;
    const maxRescans = 6; // Reduced from 12 to 6 for less console spam

    const rescanInterval = setInterval(async () => {
      rescanCount++;

      // Get all text nodes from target elements and see if there are new ones to translate
      const allTextNodes = this.getTextNodesFromTargets();
      const unprocessedNodes = allTextNodes.filter(
        (node) => !this.processedNodes.has(node)
      );

      if (unprocessedNodes.length > 0) {
        console.log(
          `[${new Date().toISOString()}] SEO Brein Translator: Rescan ${rescanCount}/${maxRescans} - Found ${
            unprocessedNodes.length
          } new nodes`
        );
        // Process only 1 batch during rescans
        const batch = unprocessedNodes.slice(0, 20);
        await this.processBatch(batch);

        // Mark all remaining unprocessed nodes as processed to prevent infinite rescanning
        unprocessedNodes.forEach((node) => this.processedNodes.add(node));
      }

      if (rescanCount >= maxRescans) {
        clearInterval(rescanInterval);
        console.log(
          `[${new Date().toISOString()}] SEO Brein Translator: Periodic rescanning complete`
        );
      }
    }, 5000);
  }

  async initializeTranslator() {
    try {
      // Check if Chrome's Translation API is available
      if (window.translation && window.translation.createTranslator) {
        console.log(
          `[${new Date().toISOString()}] SEO Brein Translator: Using Chrome Translation API`
        );
        this.translator = await window.translation.createTranslator({
          sourceLanguage: "auto", // Auto-detect source language
          targetLanguage: "en", // Translate to English
        });

        // Wait for translator to be ready
        await this.translator.ready;
        console.log(
          `[${new Date().toISOString()}] SEO Brein Translator: Chrome translator ready`
        );
      } else {
        console.log(
          `[${new Date().toISOString()}] SEO Brein Translator: Chrome Translation API not available, using fallback`
        );
        this.translator = null;
      }
    } catch (error) {
      console.warn(
        `[${new Date().toISOString()}] SEO Brein Translator: Failed to initialize Chrome translator, using fallback:`,
        error
      );
      this.translator = null;
    }
  }

  async translatePage() {
    if (this.isTranslating) {
      console.log(
        `[${new Date().toISOString()}] SEO Brein Translator: Translation already in progress, skipping...`
      );
      return;
    }
    this.isTranslating = true;

    try {
      console.log(
        `[${new Date().toISOString()}] SEO Brein Translator: Starting page translation...`
      );

      // Get all text nodes from target elements only
      const textNodes = this.getTextNodesFromTargets();
      console.log(
        `[${new Date().toISOString()}] SEO Brein Translator: Found ${
          textNodes.length
        } text nodes to process from target elements`
      );

      // Log target elements found for debugging
      const targetElements = this.getTargetElements();
      console.log(
        `[${new Date().toISOString()}] SEO Brein Translator: Found ${
          targetElements.length
        } target elements:`,
        targetElements.map(
          (el) => el.tagName + (el.className ? "." + el.className : "")
        )
      );

      if (textNodes.length === 0) {
        console.warn(
          `[${new Date().toISOString()}] SEO Brein Translator: No text nodes found in target elements! This might indicate the target elements are not present on the page.`
        );
        return;
      }

      // Process nodes in batches to avoid overwhelming the browser
      const batchSize = 20;
      const maxBatches = 2; // Limit to 2 batches to reduce console logs
      let processedCount = 0;
      let translatedCount = 0;

      for (
        let i = 0;
        i < textNodes.length && i < maxBatches * batchSize;
        i += batchSize
      ) {
        const batch = textNodes.slice(i, i + batchSize);

        const results = await this.processBatch(batch);
        processedCount += batch.length;
        translatedCount += results.filter((r) => r).length;

        // Small delay between batches
        await this.delay(50);
      }

      console.log(
        `[${new Date().toISOString()}] SEO Brein Translator: Translation complete. Processed: ${processedCount}, Successfully translated: ${translatedCount}`
      );
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] SEO Brein Translator: Error during page translation:`,
        error
      );
    } finally {
      this.isTranslating = false;
    }
  }

  async processBatch(textNodes) {
    const promises = textNodes.map((node) => this.translateTextNode(node));
    const results = await Promise.allSettled(promises);

    // Count successful translations for debugging
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;
    const failed = results.filter((r) => r.status === "rejected").length;

    // Only log if there were failures or successful translations
    if (failed > 0 || successful > 0) {
      console.log(
        `[${new Date().toISOString()}] SEO Brein Translator: Batch complete. Successful: ${successful}, Failed: ${failed}`
      );
    }

    return results.map((r) => (r.status === "fulfilled" ? r.value : false));
  }

  async translateTextNode(node) {
    if (this.processedNodes.has(node)) {
      return false;
    }

    const text = node.textContent.trim();
    if (!text || text.length < 3) {
      this.processedNodes.add(node); // Mark as processed even if skipped
      return false;
    }

    // Skip if text appears to be already in English or contains mostly numbers/symbols
    if (this.isLikelyEnglish(text)) {
      this.processedNodes.add(node); // Mark as processed even if skipped
      return false;
    }

    try {
      const translatedText = await this.translateText(text);
      if (translatedText && translatedText !== text) {
        console.log(
          `[${new Date().toISOString()}] SEO Brein Translator: Translated: "${text.substring(
            0,
            30
          )}..." -> "${translatedText.substring(0, 30)}..."`
        );
        node.textContent = translatedText;
        this.processedNodes.add(node);
        return true;
      }
      this.processedNodes.add(node); // Mark as processed even if translation failed
      return false;
    } catch (error) {
      console.warn(
        `[${new Date().toISOString()}] SEO Brein Translator: Failed to translate text:`,
        text.substring(0, 50),
        error
      );
      this.processedNodes.add(node); // Mark as processed even if error occurred
      return false;
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

  getTargetElements() {
    const targetElements = [];
    this.targetSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      targetElements.push(...elements);
    });
    return targetElements;
  }

  getTextNodesFromTargets() {
    const targetElements = this.getTargetElements();
    let allTextNodes = [];

    targetElements.forEach((element) => {
      const textNodes = this.getTextNodes(element);
      allTextNodes.push(...textNodes);
    });

    return allTextNodes;
  }

  isLikelyEnglish(text) {
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
              // Check if this text node is within a target element
              if (this.isWithinTargetElement(node)) {
                newTextNodes.push(node);
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if this element contains target elements or is a target element
              const targetElements = this.getTargetElementsFromNode(node);
              targetElements.forEach((element) => {
                const textNodes = this.getTextNodes(element);
                newTextNodes.push(...textNodes);
              });
            }
          });
        }
      });

      if (newTextNodes.length > 0) {
        console.log(
          `[${new Date().toISOString()}] SEO Brein Translator: Found ${
            newTextNodes.length
          } new text nodes in target elements`
        );
        // Process only 1 batch for mutation observer
        const batch = newTextNodes.slice(0, 20);
        this.processBatch(batch);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log(
      `[${new Date().toISOString()}] SEO Brein Translator: Mutation observer set up for dynamic content`
    );
  }

  isWithinTargetElement(node) {
    let current = node.parentElement;
    while (current) {
      if (this.targetSelectors.some((selector) => current.matches(selector))) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  getTargetElementsFromNode(node) {
    const targetElements = [];
    this.targetSelectors.forEach((selector) => {
      // Check if the node itself matches
      if (node.matches && node.matches(selector)) {
        targetElements.push(node);
      }
      // Check for child elements that match
      const childElements = node.querySelectorAll(selector);
      targetElements.push(...childElements);
    });
    return targetElements;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async forceRetranslate() {
    console.log(
      `[${new Date().toISOString()}] SEO Brein Translator: Force re-translation triggered`
    );
    this.processedNodes = new WeakSet(); // Clear processed nodes
    this.translationCache.clear(); // Clear cache
    await this.translatePage();
  }

  // Get translation stats for debugging
  getStats() {
    const allTextNodes = this.getTextNodesFromTargets();
    const targetElements = this.getTargetElements();
    return {
      totalTextNodes: allTextNodes.length,
      targetElements: targetElements.length,
      targetSelectors: this.targetSelectors,
      cacheSize: this.translationCache.size,
      isTranslating: this.isTranslating,
      hasTranslator: !!this.translator,
    };
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
