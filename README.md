# SEO Brein Util

A Chrome extension (Manifest V3) that automatically translates Dutch content to English on `community.seobrein.nl/*` pages.

Google Translate is able to translate most of the content, but some parts are not translated correctly. This extension aims to fix those issues by providing a custom translation for specific elements.

## Features

- **Configurable CSS Selectors**: Customize which elements to translate through the options page
- **Chrome Auto-Translate Compatible**: Works alongside Chrome's built-in translation feature
- **Persistent Cache**: Translations are cached to improve performance
- **Dynamic Content Support**: Automatically detects and translates new content added to the page

## Configuration

1. Right-click the extension icon and select "Options"
2. Configure the CSS selectors that should be translated (one per line)
3. The default selector is `div.post__post` but you can add more as needed
4. Click "Save Settings" to apply changes

## Usage

- Enable Chrome's auto-translate feature for the best experience
- This extension will complement Chrome's translation by targeting specific elements
- The extension works automatically on `community.seobrein.nl` pages