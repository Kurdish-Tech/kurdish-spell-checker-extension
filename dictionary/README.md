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

The properly-tagged portion of this dictionary now tracks
[sinaahmadi/KurdishHunspell](https://github.com/sinaahmadi/KurdishHunspell) — that's the first place to
check for newer/more entries before hand-tagging anything new. See "Where the dictionary comes from now"
above for how the merge works and the exact flag scheme in use.

For words outside that project's coverage, add them unflagged (recognize-only) to `ku_TR.dic`, same as
the ~340,700 carried-over entries — a native-speaker morphology pass can flag them properly later.

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

As of the affix/morphology rewrite below, flags follow [KurdishHunspell](https://github.com/sinaahmadi/KurdishHunspell)'s scheme (aligned with [Universal Dependency](https://universaldependencies.org/u/pos/index.html) POS tags), not the older ad-hoc set:

| Flag | Meaning |
|------|---------|
| N | Noun |
| M | Masculine noun |
| F | Feminine noun |
| V | Verb, present stem |
| I | Verb, past stem (intransitive) |
| T | Verb, past stem (transitive) |
| A | Adjective |
| R | Adverb |
| E | Numeral |
| C | Conjunction |
| D | Interjection |
| B | Pronoun |
| P | Adposition |
| G | Particle |
| X | Infinitive |
| Z | Proper name |
| W | Exceptional forms (e.g. `were` "come.imp.2s") |
| H | Punctuation |
| J | Numerals as digits |

## Where the dictionary comes from now

`ku_TR.aff` and the tagged portion of `ku_TR.dic` are sourced directly from
[sinaahmadi/KurdishHunspell](https://github.com/sinaahmadi/KurdishHunspell) (`kmr/kmr-Latn.aff`,
`kmr/kmr-Latn.dic`) — a peer-reviewed morphological analyzer for Kurmanji built on
[a formal description of Kurdish morphology](https://arxiv.org/ftp/arxiv/papers/2109/2109.03942.pdf).
That's ~41,900 lemmas with real, linguist-verified affix flags (the earlier `A`–`J`/`M`/`N`/`P`/`Q`/`R`
scheme in this file was a hand-written starter template that, in practice, was never actually wired to
any word in the dictionary — every entry was either unflagged or only carried the unrelated `KEEPCASE`
flag). The remaining ~340,700 words already in this project's dictionary that aren't in KurdishHunspell's
lexicon are kept as plain, unflagged entries — same recognize-only behavior as before, no regression.

**License & attribution:** KurdishHunspell is CC BY-SA 4.0, © Sina Ahmadi. If you redistribute this
dictionary or a derivative, keep the attribution and cite:

```
@article{ahmadi2020Hunspell,
  title={{Hunspell for Sorani Kurdish Spell Checking and Morphological Analysis}},
  author={Ahmadi, Sina},
  journal={arXiv preprint arXiv:2109.06374},
  year={2021},
}
@article{ahmadi2020formalization,
  title={{A Formal Description of Sorani Kurdish Morphology}},
  author={Ahmadi, Sina},
  journal={arXiv preprint arXiv:2109.03942},
  year={2021}
}
```

To grow the tagged (properly-inflecting) portion further, pull newer entries from KurdishHunspell's
`kmr-Latn.dic` as they publish updates, or tag more of the remaining unflagged words by hand — either
way, flags need to match *this* scheme now, not the old one.

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
