/**
 * SEO Brein Translator - Options Page Script
 * Handles saving and loading of extension settings
 */

document.addEventListener("DOMContentLoaded", function () {
  const apiKeyInput = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const testBtn = document.getElementById("testBtn");
  const status = document.getElementById("status");

  // Load saved settings
  loadSettings();

  // Event listeners
  saveBtn.addEventListener("click", saveSettings);
  testBtn.addEventListener("click", testTranslation);
  apiKeyInput.addEventListener("input", function () {
    hideStatus();
  });

  // Load settings from storage
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        "sbtGoogleTranslateApiKey",
      ]);
      if (
        result.sbtGoogleTranslateApiKey &&
        result.sbtGoogleTranslateApiKey !== "YOUR_API_KEY_HERE"
      ) {
        apiKeyInput.value = result.sbtGoogleTranslateApiKey;
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      showStatus("Failed to load saved settings", "error");
    }
  }

  // Save settings to storage
  async function saveSettings() {
    try {
      const apiKey = apiKeyInput.value.trim();

      if (apiKey) {
        // Basic validation of API key format
        if (!isValidApiKeyFormat(apiKey)) {
          showStatus(
            "Invalid API key format. Should be a Google Cloud API key.",
            "error"
          );
          return;
        }
      }

      await chrome.storage.sync.set({
        sbtGoogleTranslateApiKey: apiKey || "",
      });

      showStatus("Settings saved successfully!", "success");

      // TODO: Notify content scripts about updated settings
      // chrome.tabs.query({url: "https://community.seobrein.nl/*"}, (tabs) => {
      //     tabs.forEach(tab => {
      //         chrome.tabs.sendMessage(tab.id, {action: 'settingsUpdated'});
      //     });
      // });
    } catch (error) {
      console.error("Failed to save settings:", error);
      showStatus("Failed to save settings: " + error.message, "error");
    }
  }

  // Test translation functionality
  async function testTranslation() {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus(
        "Enter an API key first, or test will use Chrome's built-in translator",
        "error"
      );
      return;
    }

    showStatus("Testing translation...", "success");
    testBtn.disabled = true;
    testBtn.textContent = "Testing...";

    try {
      // Test with a simple Dutch phrase
      const testText = "Hallo, dit is een test";

      // Send test message to background script
      const response = await chrome.runtime.sendMessage({
        action: "translate",
        text: testText,
        source: "nl",
        target: "en",
      });

      if (response.error) {
        showStatus("Translation test failed: " + response.error, "error");
      } else if (response.translatedText) {
        showStatus(
          `Translation test successful! "${testText}" → "${response.translatedText}"`,
          "success"
        );
      } else {
        showStatus("Translation test returned empty result", "error");
      }
    } catch (error) {
      console.error("Translation test error:", error);
      showStatus("Translation test failed: " + error.message, "error");
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = "Test Translation";
    }
  }

  // Utility functions
  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.classList.remove("hidden");

    // Auto-hide success messages after 3 seconds
    if (type === "success") {
      setTimeout(hideStatus, 3000);
    }
  }

  function hideStatus() {
    status.classList.add("hidden");
  }

  function isValidApiKeyFormat(apiKey) {
    // Basic validation for Google Cloud API key format
    // Typically 39 characters long and contains alphanumeric characters and some symbols
    return apiKey.length >= 30 && /^[A-Za-z0-9_-]+$/.test(apiKey);
  }

  // TODO: Add more advanced settings
  // - Enable/disable automatic translation
  // - Choose source/target languages
  // - Configure translation speed/quality
  // - Whitelist/blacklist specific elements
  // - Custom CSS selectors to exclude from translation

  console.log("SEO Brein Translator: Options page loaded");
});
