/**
 * SEO Brein Translator - Background Service Worker
 * Handles fallback translation using Google Cloud Translate API
 */

// TODO: Add your Google Cloud Translate API key here
const GOOGLE_TRANSLATE_API_KEY = "YOUR_API_KEY_HERE";
const GOOGLE_TRANSLATE_URL =
  "https://translate.googleapis.com/translate_a/single";

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    handleTranslationRequest(request, sendResponse);
    return true; // Keep the message channel open for async response
  }
});

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
