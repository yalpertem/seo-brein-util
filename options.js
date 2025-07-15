document.addEventListener("DOMContentLoaded", function () {
  const testBtn = document.getElementById("testBtn");
  const saveBtn = document.getElementById("saveBtn");
  const selectorsInput = document.getElementById("selectorsInput");
  const status = document.getElementById("status");
  const themeToggle = document.getElementById("themeToggle");

  loadSettings();
  loadTheme();

  saveBtn.addEventListener("click", saveSettings);
  testBtn.addEventListener("click", testTranslation);
  themeToggle.addEventListener("click", toggleTheme);

  async function loadTheme() {
    try {
      const result = await chrome.storage.local.get(["darkMode"]);
      const isDarkMode = result.darkMode || false;
      applyTheme(isDarkMode);
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  }

  async function toggleTheme() {
    try {
      const result = await chrome.storage.local.get(["darkMode"]);
      const isDarkMode = !(result.darkMode || false);
      await chrome.storage.local.set({ darkMode: isDarkMode });
      applyTheme(isDarkMode);
    } catch (error) {
      console.error("Failed to toggle theme:", error);
    }
  }

  function applyTheme(isDarkMode) {
    if (isDarkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
      themeToggle.textContent = "☀️ Light Mode";
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeToggle.textContent = "🌙 Dark Mode";
    }
  }

  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(["selectorsToTranslate"]);
      const selectors = result.selectorsToTranslate || ["div.post__post"];
      selectorsInput.value = selectors.join("\n");
    } catch (error) {
      console.error("Failed to load settings:", error);
      selectorsInput.value = "div.post__post";
    }
  }

  async function saveSettings() {
    try {
      const selectorsText = selectorsInput.value.trim();
      const selectors = selectorsText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (selectors.length === 0) {
        showStatus("Please enter at least one selector", "error");
        return;
      }

      await chrome.storage.local.set({ selectorsToTranslate: selectors });
      showStatus("Settings saved successfully!", "success");

      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.url && tab.url.includes("community.seobrein.nl")) {
            chrome.tabs.sendMessage(tab.id, {
              action: "updateSelectors",
              selectors,
            });
          }
        });
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      showStatus("Failed to save settings: " + error.message, "error");
    }
  }

  async function testTranslation() {
    showStatus("Testing translation...", "success");
    testBtn.disabled = true;
    testBtn.textContent = "Testing...";

    try {
      const testText = "Hallo, dit is een test";

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

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.classList.remove("hidden");

    if (type === "success") {
      setTimeout(hideStatus, 3000);
    }
  }

  function hideStatus() {
    status.classList.add("hidden");
  }

  console.debug("SEO Brein Translator: Options page loaded");
});
