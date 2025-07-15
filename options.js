document.addEventListener("DOMContentLoaded", function () {
  const testBtn = document.getElementById("testBtn");
  const status = document.getElementById("status");

  testBtn.addEventListener("click", testTranslation);

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

  console.log("SEO Brein Translator: Options page loaded");
});
