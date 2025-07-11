# SEO Brein Translator

A Chrome extension (Manifest V3) that automatically translates Dutch content to English on `community.seobrein.nl/*` pages.

## Features

- 🔄 **Automatic Translation**: Translates content immediately on page load
- ⚡ **Real-time Processing**: Handles dynamically loaded content with MutationObserver
- 🧠 **Smart Detection**: Uses Chrome's built-in Translation API when available
- 🔄 **Fallback Support**: Falls back to Google Cloud Translate when needed
- 🎯 **Targeted**: Only runs on community.seobrein.nl domain
- ⚙️ **Configurable**: Simple options page for API key management

## Installation (Load Unpacked)

1. **Download or Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** button
5. **Select the extension folder** containing `manifest.json`
6. **Extension loads** and icon appears in toolbar

## Setup Instructions

### Option 1: Use Chrome's Built-in Translator (Recommended)
- No setup required
- Works automatically if Chrome's Translation API is available
- Best performance and reliability

### Option 2: Google Cloud Translate API (Fallback)
1. **Get API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the "Cloud Translation API"
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Copy the API key

2. **Configure Extension**:
   - Click the extension icon in Chrome toolbar
   - Paste your API key in the settings
   - Click "Save Settings"
   - Test with "Test Translation" button

## Testing

### Basic Testing
1. Navigate to any page on `https://community.seobrein.nl/`
2. Extension automatically detects and translates Dutch content
3. Check browser console (F12 → Console) for debug messages
4. Verify that new content added dynamically also gets translated

### Manual Testing Steps
```bash
# 1. Load the extension in Chrome
# 2. Open developer console (F12)
# 3. Navigate to: https://community.seobrein.nl/
# 4. Look for console messages:
#    "SEO Brein Translator: Initializing..."
#    "SEO Brein Translator: Using Chrome Translation API" (or fallback message)
#    "SEO Brein Translator: Found X text nodes to process"
#    "SEO Brein Translator: Translation setup complete"
```

### Testing on Private Site
Since `community.seobrein.nl` may be a private/restricted site:

1. **Create Test Page** (optional):
   ```html
   <!DOCTYPE html>
   <html>
   <head><title>Test Dutch Content</title></head>
   <body>
       <h1>Welkom bij de Nederlandse test pagina</h1>
       <p>Dit is een test om te zien of de vertaling werkt.</p>
       <p>De inhoud zou automatisch naar het Engels moeten worden vertaald.</p>
   </body>
   </html>
   ```

2. **Modify Extension** for testing:
   - Temporarily edit `manifest.json`
   - Change `"matches": ["https://community.seobrein.nl/*"]`
   - To `"matches": ["file://*/*"]` or your test domain
   - Reload extension and test on your local file

## Project Structure

```
seo-brein-translator/
├── manifest.json           # Extension manifest (Manifest V3)
├── contentScript.js        # Main translation logic
├── background.js           # Service worker for fallback translation
├── options.html           # Settings page UI
├── options.js             # Settings page logic
├── icons/                 # Extension icons
│   ├── 16.png            # Small icon (placeholder)
│   ├── 48.png            # Medium icon (placeholder)
│   └── 128.png           # Large icon (placeholder)
└── README.md             # This file
```

## Technical Details

### Translation Flow
1. **Page Load**: Content script initializes when DOM is ready
2. **API Check**: Tries to use Chrome's `window.translation.createTranslator()`
3. **Text Processing**: Scans all text nodes, skipping scripts/styles
4. **Smart Detection**: Avoids translating content that appears to be English
5. **Batch Processing**: Processes nodes in batches to avoid blocking UI
6. **Caching**: Caches translations to avoid duplicate API calls
7. **Dynamic Content**: MutationObserver handles new content added to page

### Chrome Translation API
```javascript
// Primary method (Chrome built-in)
const translator = await window.translation.createTranslator({
  sourceLanguage: 'auto',  // Auto-detect source
  targetLanguage: 'en'     // Translate to English
});
await translator.ready;
const result = await translator.translate(text);
```

### Fallback Translation
```javascript
// Fallback method (Google Cloud Translate)
const response = await chrome.runtime.sendMessage({
  action: 'translate',
  text: textToTranslate,
  source: 'auto',
  target: 'en'
});
```

## Troubleshooting

### Common Issues

**Extension doesn't load:**
- Check that all files are in the same directory
- Verify `manifest.json` syntax (use JSON validator)
- Check Chrome extensions page for error messages

**No translation happening:**
- Open browser console (F12) and check for error messages
- Verify you're on a `community.seobrein.nl/*` page
- Check if Chrome's Translation API is available in your browser version

**Fallback translation not working:**
- Verify Google Cloud Translate API key is correct
- Check API key has sufficient quota/billing enabled
- Look for network errors in browser console

**Performance issues:**
- Large pages may take time to process
- Check console for batch processing messages
- Consider reducing batch size in `contentScript.js`

### Debug Messages
The extension logs helpful debug information to the browser console:
```
SEO Brein Translator: Initializing...
SEO Brein Translator: Using Chrome Translation API
SEO Brein Translator: Found 45 text nodes to process
SEO Brein Translator: Translation setup complete
```

## Development TODOs

### High Priority
- [ ] Replace placeholder icons with actual PNG files
- [ ] Implement proper Google Cloud Translate API integration
- [ ] Add rate limiting for translation requests
- [ ] Add better error handling and retry logic

### Medium Priority
- [ ] Add user preference for translation on/off
- [ ] Implement translation confidence scoring
- [ ] Add support for more source/target languages
- [ ] Create better language detection algorithms
- [ ] Add translation speed vs quality options

### Low Priority
- [ ] Add usage analytics (with user consent)
- [ ] Create more sophisticated caching mechanism
- [ ] Add custom CSS selectors to exclude from translation
- [ ] Implement translation history/undo functionality
- [ ] Add keyboard shortcuts for manual translation toggle

## License

This project is provided as-is for educational/development purposes. Please ensure compliance with Google Cloud Translate API terms of service if using the fallback translation feature.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify all setup steps were followed correctly
3. Test with a simple HTML page first
4. Check Chrome extension developer documentation

---

**Note**: This extension is designed specifically for `community.seobrein.nl` and uses Chrome's experimental Translation API. The fallback Google Cloud Translate integration requires a valid API key and may incur costs based on usage.
