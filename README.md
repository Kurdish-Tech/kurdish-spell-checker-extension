# Kurdish Kurmanci Spell Checker

**A professional Manifest V3 browser extension (Chrome, Edge and Firefox) for real-time Kurdish Kurmanci (Northern Kurdish) spell checking.**

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
├── manifest.json          ← Manifest V3 config (Chrome / Edge)
├── manifest.firefox.json  ← Manifest V3 config (Firefox: event page + gecko settings)
├── scripts/build.mjs      ← Builds dist/chromium and dist/firefox packages
├── background.js          ← Service Worker / event page: dictionary init + message handler
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
│   ├── ku_TR.dic          ← Kurmanci word list (382,637 words, production dictionary)
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

**Microsoft Edge** uses the same package: open `edge://extensions/`, enable *Developer mode*, then *Load unpacked*.

**Firefox** needs its own manifest, so build it first (see below), then open `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on…* → pick `dist/firefox/manifest.json`. Requires Firefox 140 or newer.

## Building store packages

```bash
node scripts/build.mjs                                  # creates dist/chromium and dist/firefox
npx web-ext lint  -s dist/firefox                       # Mozilla's add-on validator
npx web-ext build -s dist/firefox  -a dist/artifacts/firefox
npx web-ext build -s dist/chromium -a dist/artifacts/chromium
```

The Chromium zip is what the Chrome Web Store and Microsoft Edge Add-ons accept; the Firefox zip is for addons.mozilla.org.

### Rebuilding `lib/nspell.js`

`lib/nspell.js` is the unmodified [nspell](https://github.com/wooorm/nspell) 2.1.5 package bundled with browserify 17.0.1 (versions pinned in `package.json` / `package-lock.json`). To regenerate it byte-for-byte (requires Node.js 18+):

```bash
npm ci
npm run build:nspell
```

All other files are plain, unminified source. The extension makes no network requests and collects no data — the dictionary is loaded from inside the package.

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

## Dictionary Data Source

`dictionary/ku_TR.dic` is a **production dictionary of 382,637 Kurmancî words**, built from:

- **~41,900** words with real, linguist-verified Hunspell affix flags, sourced from
  [sinaahmadi/KurdishHunspell](https://github.com/sinaahmadi/KurdishHunspell) — these get full
  suffix/prefix-driven suggestion expansion (e.g. `kitêb` correctly suggests `kitêba`, `kitêbê`, `kitêbî`, ...)
- **~340,700** further words from the extension's original dictionary and **Wîkîferheng**
  (ku.wiktionary.org, via [kaikki.org/kuwiktionary](https://kaikki.org/kuwiktionary/index.html)),
  kept as unflagged entries — recognized in their exact form, no inflected-form suggestions yet

`dictionary/ku_TR.aff` is [KurdishHunspell](https://github.com/sinaahmadi/KurdishHunspell)'s Kurmanji
affix file (`kmr/kmr-Latn.aff`), a peer-reviewed implementation based on
[a formal description of Kurdish morphology](https://arxiv.org/ftp/arxiv/papers/2109/2109.03942.pdf) —
replacing an earlier hand-written starter file that, in practice, was never wired to any word in the
dictionary.

**License & attribution:** Wîkîferheng content is **CC BY-SA 4.0 + GFDL**; KurdishHunspell is
**CC BY-SA 4.0, © Sina Ahmadi**. If you redistribute this dictionary or a derivative, retain both
attributions and keep the derivative under a compatible share-alike license. If you use the
morphological rules specifically, please cite:

```
@article{ahmadi2020Hunspell,
  title={{Hunspell for Sorani Kurdish Spell Checking and Morphological Analysis}},
  author={Ahmadi, Sina}, journal={arXiv preprint arXiv:2109.06374}, year={2021},
}
@article{ahmadi2020formalization,
  title={{A Formal Description of Sorani Kurdish Morphology}},
  author={Ahmadi, Sina}, journal={arXiv preprint arXiv:2109.03942}, year={2021}
}
```

To grow the tagged portion further or add more vocabulary, see `dictionary/README.md` for the
`.dic`/`.aff` format and the current flag scheme.
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

- **Code:** MIT License — Kurdish Tech Organization
- **Dictionary** (`dictionary/ku_TR.*`): CC BY-SA 4.0, derived from [KurdishHunspell](https://github.com/sinaahmadi/KurdishHunspell) by Sina Ahmadi

See [LICENSE](LICENSE) for details.

---

*Ziman jiyana mirov e. / Language is the life of a person.*
*Kurdish Tech Organization — Preserving Kurdish language in the digital space*
