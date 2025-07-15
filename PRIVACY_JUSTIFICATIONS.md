# Privacy

To facilitate the compliance of your extension with the Chrome Web Store Developer Program Policies, you are required to provide the information listed below. The information provided in this form will be shared with the Chrome Web Store team. Please ensure that the information provided is accurate, as it will improve the review time of your extension and decrease the risk of this version being rejected.

## Single purpose

An extension must have a single purpose that is narrow and easy-to-understand. <a href="https://developer.chrome.com/docs/webstore/program-policies#extensions">Learn more</a>

```
This extension's single purpose is to automatically translate Dutch content to English on `community.seobrein.nl/*` pages, enhancing the user experience by providing custom translations for specific elements that Google Translate may not handle correctly.
```

## Permission justification

A permission is either one of a list of known strings, such as "activeTab", or a match pattern giving access to one or more hosts.
Remove any permission that is not needed to fulfill the single purpose of your extension. Requesting an unnecessary permission will result in this version being rejected.

Due to the Host Permission, your extension may require an in-depth review which will delay publishing.

### storage justification

```
This extension uses the `storage` permission to save user-configured CSS selectors for translation. This allows users to customize which elements on the page should be translated, enhancing the functionality of the extension.

The storage is used to persist these settings across browser sessions, ensuring that users do not have to reconfigure their preferences each time they use the extension.

The cached translations are also stored to improve performance, allowing the extension to quickly apply translations without needing to re-fetch them from the translation service.
```

### activeTab justification

```
This extension uses the `activeTab` permission to access the content of the currently active tab on `community.seobrein.nl/*` pages. This is necessary for the extension to apply translations to the specific elements defined by the user in the options page.

The `activeTab` permission allows the extension to interact with the page content dynamically, enabling it to detect and translate new content added to the page after it has loaded.
```

### tabs justification

```
This extension uses the `tabs` permission to manage and interact with the browser tabs. It allows the extension to detect when a user navigates to a page on `community.seobrein.nl/*`, enabling it to automatically apply translations to the content of that page.
```

### host permission justification

```
This extension requires the `community.seobrein.nl` host permission to access and modify the content of pages on this domain. This is essential for the extension to function correctly, as it needs to read the page content and apply translations to specific elements as configured by the user.
```