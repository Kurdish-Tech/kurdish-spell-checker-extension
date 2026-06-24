# Kurdish Kurmanci Spell Checker

**A professional Manifest V3 Chrome Extension for real-time Kurdish Kurmanci (Northern Kurdish) spell checking.**

> Built by Kurdish Tech Organization · Open Source · Latin Alphabet Only

---

## Features

- 🔴 **Real-time underline highlighting** of misspelled Kurmanci words in any `<textarea>` or `contenteditable` element
- 💡 **Smart suggestions popover** with up to 8 Kurmanci spelling alternatives on click
- ➕ **Personal dictionary** — add words that persist across sessions
- 🔇 **Ignore word** — dismiss false positives per-session
- 🌙 **Dark mode popup UI** with Slate + Neon Blue + Golden design system
- ⚡ **Efficient batch checking** via background service worker
- 🔄 **Enable/disable toggle** with instant page-wide effect

---

## Project Structure

```
kurdish-spell-checker/
│
├── manifest.json          ← Chrome Extension Manifest V3 config
├── background.js          ← Service Worker: dictionary init + message handler
├── content.js             ← Content Script: scan, highlight, suggest
├── styles.css             ← Injected CSS: underline style + popover UI
├── popup.html             ← Extension popup UI
├── popup.js               ← Popup controller
│
├── lib/
│   └── nspell.js          ← Bundled nspell (Hunspell JS port, UMD build)
│
├── dictionary/
│   ├── ku_TR.aff          ← Hunspell affix rules (Kurmanci morphology)
│   ├── ku_TR.dic          ← Kurmanci word list (~400+ starter words)
│   └── README.md          ← Dictionary contribution guide
│
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## Installation (Developer Mode)

1. **Unzip** this archive to a permanent folder (e.g., `~/extensions/kurmanci-sc/`)
2. Open **Chrome** and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **"Load unpacked"**
5. Select the unzipped `kurdish-spell-checker/` folder
6. The extension icon appears in the toolbar — click it to enable/disable

> ⚠️ Do **not** move or delete the folder after loading — Chrome reads it live.

---

## How It Works

### Architecture

```
┌─────────────────────────────┐
│     Background Worker       │  ← Loads dictionary once, holds nspell instance
│  (background.js)            │     Responds to spell-check messages
└───────────┬─────────────────┘
            │ chrome.runtime.sendMessage
┌───────────▼─────────────────┐
│     Content Script          │  ← Watches textarea + contenteditable elements
│  (content.js + styles.css)  │     Highlights misspelled words
│                             │     Shows suggestion popover on click
└─────────────────────────────┘
            │ chrome.storage.sync
┌───────────▼─────────────────┐
│        Popup UI             │  ← Toggle on/off, shows dictionary status
│  (popup.html + popup.js)    │
└─────────────────────────────┘
```

### Textarea Highlighting

Textareas render plain text only and cannot contain HTML spans. We use a **mirror div overlay** technique:

1. A transparent `div` is positioned exactly over the textarea
2. The textarea's content is replicated in the div with `<span class="kurmancsc-misspelled">` wrappers around misspelled words
3. The mirror div has `pointer-events: none` — the user types normally in the textarea
4. Clicks near misspelled words are mapped from the textarea to the corresponding mirror span via `elementFromPoint`

### ContentEditable Highlighting

For `contenteditable` elements, we walk the DOM text nodes directly and wrap misspelled words in `<span class="kurmancsc-misspelled">` elements in place.

---

## Dictionary Format

The spell checker uses **Hunspell-compatible** `.aff` + `.dic` files via [nspell](https://github.com/wooorm/nspell).

### Key Kurmanci characters supported:

| Category | Characters |
|----------|-----------|
| Standard Latin | a–z, A–Z |
| Kurmanci specific | **ç Ç**, **ê Ê**, **î Î**, **û Û**, **ş Ş** |

### Adding vocabulary

See **`dictionary/README.md`** for full instructions. Quick summary:

1. Open `dictionary/ku_TR.dic`
2. Update the count on line 1
3. Add one word per line: `word` or `word/FLAGS`
4. Reload the extension at `chrome://extensions/` → click the refresh icon

---

## Expanding the Dictionary

The MVP ships with 83K core Kurmanci words. To build a production-grade dictionary and add more words, you can combine multiple sources and run a script to generate a new `.dic` file. See `dictionary/README.md` for details.
---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Extension standard | Manifest V3 |
| JavaScript | Vanilla ES2020, no frameworks |
| Spell engine | [nspell](https://github.com/wooorm/nspell) (Hunspell JS port) |
| Dictionary format | Hunspell `.aff` + `.dic` |
| Styling | Pure CSS, CSS custom properties |
| Storage | `chrome.storage.sync` (settings + personal dictionary) |

---

## Contributing

1. Fork: `https://github.com/kurdish-tech/kurmanci-spell-checker`
2. **Dictionary words**: edit `dictionary/ku_TR.dic` — must be verified by a native speaker
3. **Affix rules**: edit `dictionary/ku_TR.aff` — requires Kurmanci morphology expertise
4. **Bug reports**: open an issue with browser version + repro steps

### Language Policy

This extension is **exclusively** for **Kurdish Kurmanci** in the **Latin alphabet**.

- ✅ Kurmanci (kmr) Latin script words only
- ❌ No Sorani, no Arabic script, no Persian, no Turkish

---

## License

MIT License — Kurdish Tech Organization

---

*Ziman jiyana mirov e. / Language is the life of a person.*
*Kurdish Tech Organization — Preserving Kurdish language in the digital space*
