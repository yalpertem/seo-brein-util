class SEOBreinTranslator {
  constructor() {
    this.translator = null;
    this.isTranslating = false;
    this.processedNodes = new WeakSet();
    this.translationCache = new Map();
    this.observer = null;
    this.cacheLoaded = false;
    this.cacheDirty = false;
    this.saveTimeout = null;
    this.maxCacheSize = 2000;

    this.selectorsToTranslate = ["div.post__post"];
    this.init();
  }

  async init() {
    console.log(`[${new Date().toISOString()}] SBT: Initializing...`);
    console.log(
      `[${new Date().toISOString()}] SBT: Current URL:`,
      window.location.href
    );
    console.log(
      `[${new Date().toISOString()}] SBT: Document ready state:`,
      document.readyState
    );

    await this.loadCacheFromStorage();

    try {
      chrome.runtime.sendMessage({ action: "resetCounters" });
    } catch (error) {
      console.warn("Failed to reset counters:", error);
    }

    window.translator = this;

    if (document.readyState === "loading") {
      console.log(
        `[${new Date().toISOString()}] SBT: Waiting for DOMContentLoaded...`
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
      await this.translatePage();
      this.setupMutationObserver();
      this.setupPeriodicRescan();
      console.log(
        `[${new Date().toISOString()}] SBT: Translation setup complete`
      );
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] SBT: Error during initialization:`,
        error
      );
    }
  }

  setupPeriodicRescan() {
    let rescanCount = 0;
    const maxRescans = 6;

    const rescanInterval = setInterval(async () => {
      rescanCount++;
      const allTextNodes = this.getTextNodesFromTargets();
      const unprocessedNodes = allTextNodes.filter(
        (node) => !this.processedNodes.has(node)
      );

      if (unprocessedNodes.length > 0) {
        console.log(
          `[${new Date().toISOString()}] SBT: Rescan ${rescanCount}/${maxRescans} - Found ${
            unprocessedNodes.length
          } new nodes`
        );
        const batch = unprocessedNodes.slice(0, 20);
        await this.processBatch(batch);
        unprocessedNodes.forEach((node) => this.processedNodes.add(node));
      }

      if (rescanCount >= maxRescans) {
        clearInterval(rescanInterval);
        console.log(
          `[${new Date().toISOString()}] SBT: Periodic rescanning complete`
        );
      }
    }, 5000);
  }

  async translatePage() {
    if (this.isTranslating) {
      console.log(
        `[${new Date().toISOString()}] SBT: Translation already in progress, skipping...`
      );
      return;
    }
    this.isTranslating = true;

    try {
      console.log(
        `[${new Date().toISOString()}] SBT: Starting page translation...`
      );

      const textNodes = this.getTextNodesFromTargets();
      console.log(
        `[${new Date().toISOString()}] SBT: Found ${
          textNodes.length
        } text nodes to process from target elements`
      );

      const targetElements = this.getTargetElements();
      console.log(
        `[${new Date().toISOString()}] SBT: Found ${
          targetElements.length
        } target elements:`,
        targetElements.map(
          (el) => el.tagName + (el.className ? "." + el.className : "")
        )
      );

      if (textNodes.length === 0) {
        console.log(
          `[${new Date().toISOString()}] SBT: No text nodes found in target elements! This might indicate the target elements are not present on the page.`
        );
        return;
      }

      const batchSize = 20;
      const maxBatches = 2;
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
        await this.delay(50);
      }

      console.log(
        `[${new Date().toISOString()}] SBT: Translation complete. Processed: ${processedCount}, Successfully translated: ${translatedCount}`
      );

      try {
        chrome.runtime.sendMessage({ action: "logCounts" });
      } catch (error) {
        console.warn("Failed to log counts:", error);
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] SBT: Error during page translation:`,
        error
      );
    } finally {
      this.isTranslating = false;
    }
  }

  async processBatch(textNodes) {
    const promises = textNodes.map((node) => this.translateTextNode(node));
    const results = await Promise.allSettled(promises);

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed > 0 || successful > 0) {
      console.log(
        `[${new Date().toISOString()}] SBT: Batch complete. Successful: ${successful}, Failed: ${failed}`
      );

      if (successful > 0) {
        try {
          chrome.runtime.sendMessage({ action: "logCounts" });
        } catch (error) {
          console.warn("Failed to log counts:", error);
        }
      }
    }

    return results.map((r) => (r.status === "fulfilled" ? r.value : false));
  }

  async translateTextNode(node) {
    if (this.processedNodes.has(node)) {
      return false;
    }

    const text = node.textContent.trim();
    if (!text || text.length < 3) {
      this.processedNodes.add(node);
      return false;
    }

    if (this.isLikelyEnglish(text)) {
      this.processedNodes.add(node);
      return false;
    }

    try {
      const translatedText = await this.translateText(text);
      if (translatedText && translatedText !== text) {
        console.log(
          `[${new Date().toISOString()}] SBT: Translated: "${text.substring(
            0,
            30
          )}..." -> "${translatedText.substring(0, 30)}..."`
        );
        node.textContent = translatedText;
        this.processedNodes.add(node);
        return true;
      }
      this.processedNodes.add(node);
      return false;
    } catch (error) {
      console.warn(
        `[${new Date().toISOString()}] SBT: Failed to translate text:`,
        text.substring(0, 50),
        error
      );
      this.processedNodes.add(node);
      return false;
    }
  }

  async translateText(text) {
    if (this.translationCache.has(text)) {
      try {
        chrome.runtime.sendMessage({ action: "incrementCacheCount" });
      } catch (error) {
        console.warn("Failed to increment cache count:", error);
      }
      return this.translationCache.get(text);
    }

    const translatedText = await this.fallbackTranslate(text);

    if (translatedText) {
      this.translationCache.set(text, translatedText);

      if (this.translationCache.size > this.maxCacheSize) {
        const firstKey = this.translationCache.keys().next().value;
        this.translationCache.delete(firstKey);
      }

      this.scheduleCacheSave();
    }

    return translatedText;
  }

  scheduleCacheSave() {
    this.cacheDirty = true;
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      if (this.cacheDirty) {
        this.saveCacheToStorage();
        this.cacheDirty = false;
      }
    }, 2000);
  }

  async loadCacheFromStorage() {
    try {
      const result = await chrome.storage.local.get(["translationCache"]);
      if (result.translationCache) {
        this.translationCache = new Map(
          Object.entries(result.translationCache)
        );
        console.log(`Loaded ${this.translationCache.size} cached translations`);
      }
      this.cacheLoaded = true;
    } catch (error) {
      console.warn("Failed to load cache from storage:", error);
      this.cacheLoaded = true;
    }
  }

  async saveCacheToStorage() {
    try {
      const cacheObject = Object.fromEntries(this.translationCache);
      await chrome.storage.local.set({ translationCache: cacheObject });
    } catch (error) {
      console.warn("Failed to save cache to storage:", error);
    }
  }

  async clearCache() {
    try {
      this.translationCache.clear();
      await chrome.storage.local.remove(["translationCache"]);
      console.log("Translation cache cleared");
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }

  getCacheSize() {
    return this.translationCache.size;
  }

  getCacheStats() {
    return {
      size: this.translationCache.size,
      entries: Array.from(this.translationCache.entries()).slice(0, 5),
    };
  }

  async fallbackTranslate(text) {
    try {
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

  getTargetElements() {
    const targetElements = [];
    this.selectorsToTranslate.forEach((selector) => {
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
              if (this.isWithinTargetElement(node)) {
                newTextNodes.push(node);
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
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
          `[${new Date().toISOString()}] SBT: Found ${
            newTextNodes.length
          } new text nodes in target elements`
        );
        const batch = newTextNodes.slice(0, 20);
        this.processBatch(batch);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log(
      `[${new Date().toISOString()}] SBT: Mutation observer set up for dynamic content`
    );
  }

  isWithinTargetElement(node) {
    let current = node.parentElement;
    while (current) {
      if (
        this.selectorsToTranslate.some((selector) => current.matches(selector))
      ) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  getTargetElementsFromNode(node) {
    const targetElements = [];
    this.selectorsToTranslate.forEach((selector) => {
      if (node.matches && node.matches(selector)) {
        targetElements.push(node);
      }
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
      `[${new Date().toISOString()}] SBT: Force re-translation triggered`
    );
    this.processedNodes = new WeakSet();
    this.translationCache.clear();
    await this.translatePage();
  }

  getStats() {
    const allTextNodes = this.getTextNodesFromTargets();
    const targetElements = this.getTargetElements();
    return {
      totalTextNodes: allTextNodes.length,
      targetElements: targetElements.length,
      selectorsToTranslate: this.selectorsToTranslate,
      cacheSize: this.translationCache.size,
      isTranslating: this.isTranslating,
      hasTranslator: !!this.translator,
    };
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.translator && this.translator.destroy) {
      this.translator.destroy();
    }
  }
}

const translator = new SEOBreinTranslator();

window.addEventListener("beforeunload", () => {
  translator.destroy();
});
