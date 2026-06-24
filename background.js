/**
 * background.js — Background Service Worker (Classic, non-module)
 * Kurdish Kurmanci Spell Checker | Kurdish Tech Organization
 *
 * Responsibilities:
 *   1. Load and initialise the Kurmanci Hunspell dictionary via nspell.
 *   2. Respond to spell-check requests from content scripts.
 *   3. Manage enable/disable state and personal dictionary via chrome.storage.
 *
 * NOTE: This is a CLASSIC service worker (no type:"module" in manifest) so that
 *       importScripts() is available for loading the nspell UMD bundle.
 */

'use strict';

// ─── Load nspell UMD bundle ───────────────────────────────────────────────────
try {
  importScripts('lib/nspell.js');
} catch (e) {
  console.error('[KurmancSC] Failed to importScripts nspell.js:', e);
}

// ─── State ────────────────────────────────────────────────────────────────────
let spellChecker  = null;
let dictionaryReady = false;
let dictionaryError = null;

// ─── Dictionary Loading ───────────────────────────────────────────────────────

async function fetchExtensionFile(relativePath) {
  const url = chrome.runtime.getURL(relativePath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${relativePath}`);
  }
  return response.text();
}

async function initDictionary() {
  try {
    console.log('[KurmancSC] Loading Kurmanci dictionary…');

    if (typeof nspell === 'undefined') {
      throw new Error('nspell UMD bundle not loaded — check lib/nspell.js');
    }

    const [affContent, dicContent] = await Promise.all([
      fetchExtensionFile('dictionary/ku_TR.aff'),
      fetchExtensionFile('dictionary/ku_TR.dic'),
    ]);

    spellChecker    = nspell({ aff: affContent, dic: dicContent });
    dictionaryReady = true;
    dictionaryError = null;

    // Restore persisted personal dictionary words
    await restorePersonalDictionary();

    console.log('[KurmancSC] Dictionary ready.');

    // Notify any open content scripts
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: 'DICTIONARY_READY' }).catch(() => {});
      }
    });

  } catch (err) {
    dictionaryReady = false;
    dictionaryError = err.message;
    console.error('[KurmancSC] Dictionary load failed:', err);
  }
}

async function restorePersonalDictionary() {
  if (!spellChecker) return;
  const items = await chrome.storage.sync.get({ personalDictionary: [] });
  for (const word of items.personalDictionary) {
    spellChecker.add(word);
  }
  console.log(`[KurmancSC] Restored ${items.personalDictionary.length} personal words.`);
}

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    case 'CHECK_STATUS': {
      sendResponse({ ready: dictionaryReady, error: dictionaryError });
      return false;
    }

    case 'SPELL_CHECK_WORD': {
      if (!dictionaryReady || !spellChecker) {
        sendResponse({ correct: true, suggestions: [] });
        return false;
      }
      const word = (message.word || '').trim();
      if (!word) { sendResponse({ correct: true, suggestions: [] }); return false; }
      const correct = spellChecker.correct(word);
      sendResponse({ correct, suggestions: correct ? [] : spellChecker.suggest(word).slice(0, 8) });
      return false;
    }

    case 'SPELL_CHECK_BATCH': {
      if (!dictionaryReady || !spellChecker) {
        sendResponse({ results: {} });
        return false;
      }
      const results = {};
      for (const word of (message.words || [])) {
        const w = word.trim();
        if (!w) continue;
        const correct = spellChecker.correct(w);
        results[w] = { correct, suggestions: correct ? [] : spellChecker.suggest(w).slice(0, 8) };
      }
      sendResponse({ results });
      return false;
    }

    case 'ADD_WORD': {
      const word = (message.word || '').trim();
      if (!word || !spellChecker) { sendResponse({ success: false }); return false; }
      spellChecker.add(word);
      chrome.storage.sync.get({ personalDictionary: [] }, (items) => {
        const dict = items.personalDictionary;
        if (!dict.includes(word)) {
          dict.push(word);
          chrome.storage.sync.set({ personalDictionary: dict });
        }
      });
      sendResponse({ success: true });
      return false;
    }

    case 'SET_ENABLED': {
      chrome.storage.sync.set({ kurmancSC_enabled: message.enabled }, () => {
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'ENABLED_CHANGED',
              enabled: message.enabled,
            }).catch(() => {});
          }
        });
        sendResponse({ success: true });
      });
      return true; // async
    }

    case 'GET_ENABLED': {
      chrome.storage.sync.get({ kurmancSC_enabled: true }, (items) => {
        sendResponse({ enabled: items.kurmancSC_enabled });
      });
      return true; // async
    }

    default:
      break;
  }
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({ kurmancSC_enabled: null }, (items) => {
    if (items.kurmancSC_enabled === null) {
      chrome.storage.sync.set({ kurmancSC_enabled: true });
    }
  });
  initDictionary();
});

chrome.runtime.onStartup.addListener(() => {
  initDictionary();
});

// Also init immediately (handles service-worker-wake-up scenarios)
initDictionary();
