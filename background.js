let TRANSLATIONS_FROM_API_COUNT = 0;
let TRANSLATIONS_FROM_CACHE_COUNT = 0;
let countersLoaded = false;

async function loadCounters() {
  try {
    const result = await chrome.storage.local.get(["translationCounters"]);
    if (result.translationCounters) {
      TRANSLATIONS_FROM_API_COUNT = result.translationCounters.api || 0;
      TRANSLATIONS_FROM_CACHE_COUNT = result.translationCounters.cache || 0;
    }
    countersLoaded = true;
  } catch (error) {
    console.warn("Failed to load counters from storage:", error);
    countersLoaded = true;
  }
}

async function saveCounters() {
  try {
    await chrome.storage.local.set({
      translationCounters: {
        api: TRANSLATIONS_FROM_API_COUNT,
        cache: TRANSLATIONS_FROM_CACHE_COUNT,
      },
    });
  } catch (error) {
    console.warn("Failed to save counters to storage:", error);
  }
}

loadCounters();

const GOOGLE_TRANSLATE_URL =
  "https://translate.googleapis.com/translate_a/single";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    handleTranslationRequest(request, sendResponse);
    return true;
  } else if (request.action === "resetCounters") {
    resetCounters();
    sendResponse({ success: true });
  } else if (request.action === "logCounts") {
    logTranslationCounts();
    sendResponse({ success: true });
  } else if (request.action === "incrementCacheCount") {
    incrementCacheCount();
    sendResponse({ success: true });
  } else if (request.action === "clearCache") {
    clearCache();
    sendResponse({ success: true });
  }
});

function resetCounters() {
  TRANSLATIONS_FROM_API_COUNT = 0;
  TRANSLATIONS_FROM_CACHE_COUNT = 0;
  saveCounters();
  console.log("Background: Translation counters reset");
}

function incrementCacheCount() {
  TRANSLATIONS_FROM_CACHE_COUNT++;
  saveCounters();
  console.log(
    `Background: Cache count incremented to ${TRANSLATIONS_FROM_CACHE_COUNT}`
  );
}

function logTranslationCounts() {
  console.log(
    `Background: Translation counts - API: ${TRANSLATIONS_FROM_API_COUNT}, Cache: ${TRANSLATIONS_FROM_CACHE_COUNT}`
  );
}

async function clearCache() {
  try {
    await chrome.storage.local.remove(["translationCache"]);
    console.log("Background: Translation cache cleared");
  } catch (error) {
    console.warn("Background: Failed to clear cache:", error);
  }
}

async function handleTranslationRequest(request, sendResponse) {
  try {
    console.log("Background: Handling translation request for:", request.text);

    const translatedText = await translateWithGoogleCloud(
      request.text,
      request.source || "auto",
      request.target || "en"
    );

    sendResponse({
      translatedText: translatedText,
      error: null,
    });
  } catch (error) {
    console.error("Background: Translation error:", error);
    sendResponse({
      error: error.message,
      translatedText: null,
    });
  }
}

async function translateWithGoogleCloud(text, sourceLang, targetLang) {
  try {
    const url = `${GOOGLE_TRANSLATE_URL}?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
      text
    )}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data[0] && data[0][0] && data[0][0][0]) {
      TRANSLATIONS_FROM_API_COUNT++;
      saveCounters();
      console.log(
        `Background: API count incremented to ${TRANSLATIONS_FROM_API_COUNT}`
      );
      return data[0][0][0];
    }

    throw new Error("Invalid response format from translation service");
  } catch (error) {
    console.error("Background: Google Translate error:", error);
    throw error;
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("SEO Brein Translator installed");
    chrome.runtime.openOptionsPage();
  }
});

console.log("SEO Brein Translator: Background service worker loaded");
