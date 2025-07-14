/**
 * SEO Brein Translator - Background Service Worker
 * Handles fallback translation using Google Cloud Translate API
 */

// Translation counters
let TRANSLATIONS_FROM_API_COUNT = 0;
let TRANSLATIONS_FROM_CACHE_COUNT = 0;
let countersLoaded = false;

// Load counters from storage
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

// Save counters to storage
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

// Initialize counters
loadCounters();

// TODO: Add your Google Cloud Translate API key here
const GOOGLE_TRANSLATE_API_KEY = "YOUR_API_KEY_HERE";
const GOOGLE_TRANSLATE_URL =
  "https://translate.googleapis.com/translate_a/single";

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    handleTranslationRequest(request, sendResponse);
    return true; // Keep the message channel open for async response
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

    // First, try to get API key from storage
    const apiKey = await getStoredApiKey();

    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      console.warn("Background: No valid Google Cloud Translate API key found");
      sendResponse({
        error: "No API key configured",
        translatedText: null,
      });
      return;
    }

    // Attempt translation using Google Cloud Translate
    const translatedText = await translateWithGoogleCloud(
      request.text,
      request.source || "auto",
      request.target || "en",
      apiKey
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

async function getStoredApiKey() {
  try {
    const result = await chrome.storage.sync.get(["googleTranslateApiKey"]);
    return result.googleTranslateApiKey || GOOGLE_TRANSLATE_API_KEY;
  } catch (error) {
    console.warn("Background: Failed to get stored API key:", error);
    return GOOGLE_TRANSLATE_API_KEY;
  }
}

async function translateWithGoogleCloud(text, sourceLang, targetLang, apiKey) {
  // TODO: Implement proper Google Cloud Translate API integration
  // For now, using the free Google Translate service (limited and unofficial)

  try {
    // Using the unofficial Google Translate API endpoint
    // Note: This is for development/testing only. For production, use official Google Cloud Translate API
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

    // Parse the response from Google Translate
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

    // TODO: Implement proper Google Cloud Translate API as fallback
    // Example implementation:
    /*
    const cloudTranslateUrl = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(cloudTranslateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text'
      })
    });
    
    const data = await response.json();
    return data.data.translations[0].translatedText;
    */

    throw error;
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("SEO Brein Translator installed");

    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

// TODO: Add more sophisticated caching mechanism
// TODO: Add rate limiting for translation requests
// TODO: Add error handling and retry logic
// TODO: Add analytics/usage tracking (with user consent)

console.log("SEO Brein Translator: Background service worker loaded");
