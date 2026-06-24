# Kurdish Kurmanci Dictionary Files

**Kurdish Tech Organization | Open Source**

---

## Files

| File | Purpose |
|------|---------|
| `ku_TR.aff` | Hunspell **affix file** — defines morphological rules (suffixes, prefixes, compounding) |
| `ku_TR.dic` | Hunspell **dictionary file** — the wordlist with optional affix flags |

---

## File Format Reference

### `ku_TR.dic`

The first non-comment line **must** be the word count (approximate is fine):

```
500
word1
word2/AB
word3/BHD
```

Flags (A, B, H, etc.) correspond to suffix/prefix rules in `ku_TR.aff`. A word with no flags is matched only as an exact string.

### `ku_TR.aff`

Defines affix rules in Hunspell format:

```
SFX <flag> <Y|N> <count>
SFX <flag> <strip> <add> <condition>
```

---

## Expanding the Dictionary

### Step 1 — Obtain a Kurmanci Wordlist

#### Option A: Existing Hunspell Kurdish Dictionary
A partial Hunspell dictionary exists in the LibreOffice extension repository:
- Search: **"LibreOffice Kurdish spell checker"**
- Extract `.aff` and `.dic` from the `.oxt` file (it's a ZIP archive)
- Adapt the `.aff` rules to match this extension's flag set

#### Option B: OpenOffice/Mozilla Dictionaries Repository
```
https://github.com/titoBouzout/Dictionaries
```
Look for `c` / `Kurdish.aff` — note these may be Sorani; **verify carefully**.

---

## Critical Language Requirements

> ⚠️ **This dictionary is EXCLUSIVELY for Kurdish Kurmanci in the Latin alphabet.**

**MUST include:**
- ✅ Kurmanci (Northern Kurdish / Kurmanji) words
- ✅ Latin script characters: `a b c ç d e ê f g h i î j k l m n o p q r s ş t u û v w x y z`
- ✅ Kurmanci-specific characters: `ç ê î û ş` (and their uppercase variants)

**MUST NOT include:**
- ❌ Sorani (Central Kurdish) — uses Arabic script or different Latin conventions
- ❌ Arabic script entries (`ک`, `ی`, `ژ`, etc.)
- ❌ Persian/Farsi words
- ❌ Badini dialect words (unless clearly marked as dialectal)
- ❌ Turkish words

---

## Affix Flag Reference

| Flag | Rule Type | Description |
|------|-----------|-------------|
| A | SFX | Ezafe suffix: `-ê` (masc) / `-a` (fem) |
| B | SFX | Plural: `-an` |
| C | SFX | Plural: `-în` (poetic) |
| D | SFX | Oblique case: `-î` |
| E | SFX | Verb personal endings (present) |
| F | SFX | Diminutive: `-ok` |
| G | SFX | Agentive: `-er` / `-kar` |
| H | SFX | Nisbet adjective: `-î` |
| I | SFX | Verbal noun: `-in` |
| J | SFX | Gerundive: `-an` |
| P | PFX | Present tense prefix: `di-` |
| N | PFX | Negation prefix: `na-` |
| M | PFX | Negation prefix: `ne-` |
| Q | PFX | Privative prefix: `bê-` |
| R | PFX | Reflexive prefix: `xwe-` |

---

## Testing Your Dictionary

After adding words, test with Node.js:

```js
const nspell = require('./lib/nspell.js');
const fs = require('fs');

const checker = nspell({
  aff: fs.readFileSync('./dictionary/ku_TR.aff', 'utf8'),
  dic: fs.readFileSync('./dictionary/ku_TR.dic', 'utf8'),
});

console.log(checker.correct('Kurdistan'));   // true
console.log(checker.correct('Kirdistan'));   // false (misspelled)
console.log(checker.suggest('Kirdistan'));   // ['Kurdistan', ...]
```

---

## Contributing

1. Fork the repository on GitHub (`kurdish-tech/kurmanci-spell-checker`)
2. Add words to `ku_TR.dic` — one word per line
3. Update the word count on line 1
4. Have a **native Kurmanci speaker** review additions
5. Submit a pull request with a description of the source used

---

*Kurdish Tech Organization — Preserving Kurdish language in the digital space.*
