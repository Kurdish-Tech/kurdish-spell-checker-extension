/**
 * content.js — Content Script
 * Kurdish Kurmanci Spell Checker | Kurdish Tech Organization
 *
 * Responsibilities:
 *   1. Observe DOM for <textarea> and [contenteditable] elements.
 *   2. Parse text into words and send to background for spell checking.
 *   3. Highlight misspelled words with red underline using a CSS overlay approach.
 *   4. Show a floating suggestion popover on click/right-click of a misspelled word.
 *   5. Honour the enable/disable toggle.
 *
 * Architecture note:
 *   For <textarea> elements we use a "mirror div" overlay approach because
 *   textareas render plain text only — we cannot inject spans into them.
 *   For [contenteditable] we wrap misspelled words in <span> elements directly.
 */

"use strict";

// ─── Constants ────────────────────────────────────────────────────────────────

const MISSPELLED_CLASS = "kurmancsc-misspelled";
const MIRROR_CLASS = "kurmancsc-mirror";
const POPOVER_ID = "kurmancsc-popover";
const DEBOUNCE_MS = 600;

/**
 * Kurmanci Latin alphabet pattern.
 * Includes all standard Latin letters plus Kurmanci-specific characters:
 * ç, ê, î, û, ş, x (includes digraphs handled at word level)
 */
const WORD_REGEX = /\b([a-zA-ZçÇêÊîÎûÛşŞxX][a-zA-ZçÇêÊîÎûÛşŞxX'-]*)\b/g;

// ─── State ────────────────────────────────────────────────────────────────────

let enabled = true;
let checkerReady = false;
const mirrorMap = new WeakMap(); // textarea → mirror div
const debounceMap = new WeakMap(); // element → timer id
const resultCache = new Map(); // word → { correct, suggestions }

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Debounce helper tied to a specific DOM element.
 */
function debounce(element, fn, delay) {
  if (debounceMap.has(element)) {
    clearTimeout(debounceMap.get(element));
  }
  debounceMap.set(
    element,
    setTimeout(() => {
      debounceMap.delete(element);
      fn();
    }, delay),
  );
}

/**
 * Extract unique words from a string, ignoring numbers and single chars.
 */
function extractWords(text) {
  const words = new Set();
  let match;
  WORD_REGEX.lastIndex = 0;
  while ((match = WORD_REGEX.exec(text)) !== null) {
    const word = match[1];
    if (word.length > 1 && !/^\d+$/.test(word)) {
      words.add(word);
    }
  }
  return [...words];
}

/**
 * Send a batch of words to the background for spell checking.
 * Results are merged into the local cache.
 */
async function checkWords(words) {
  const uncached = words.filter((w) => !resultCache.has(w));
  if (uncached.length > 0) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "SPELL_CHECK_BATCH",
        words: uncached,
      });
      if (response && response.results) {
        for (const [word, result] of Object.entries(response.results)) {
          resultCache.set(word, result);
        }
      }
    } catch (err) {
      // Service worker may be restarting — silently skip
      console.warn("[KurmancSC] Background not ready:", err.message);
    }
  }
}

// ─── Popover ──────────────────────────────────────────────────────────────────

function getPopover() {
  let el = document.getElementById(POPOVER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = POPOVER_ID;
    el.setAttribute("role", "listbox");
    el.setAttribute("aria-label", "Kurmanci spell check suggestions");
    document.body.appendChild(el);
  }
  return el;
}

function hidePopover() {
  const el = document.getElementById(POPOVER_ID);
  if (el) {
    el.classList.remove("visible");
    el.innerHTML = "";
  }
}

/**
 * Show the suggestion popover near the clicked word span.
 */
function showPopover(spanEl, word, suggestions) {
  const popover = getPopover();
  popover.innerHTML = "";

  const rect = spanEl.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  popover.style.left = `${rect.left + scrollX}px`;
  popover.style.top = `${rect.bottom + scrollY + 6}px`;

  // Header
  const header = document.createElement("div");
  header.className = "kurmancsc-popover-header";
  header.innerHTML = `
    <span class="kurmancsc-word-label">${escapeHtml(word)}</span>
    <span class="kurmancsc-badge">Kurmanci</span>
  `;
  popover.appendChild(header);

  if (suggestions.length === 0) {
    const noSugg = document.createElement("div");
    noSugg.className = "kurmancsc-no-suggestions";
    noSugg.textContent = "Pêşniyar nîn e / No suggestions";
    popover.appendChild(noSugg);
  } else {
    const list = document.createElement("ul");
    list.className = "kurmancsc-suggestions-list";
    list.setAttribute("role", "listbox");

    for (const suggestion of suggestions) {
      const item = document.createElement("li");
      item.className = "kurmancsc-suggestion-item";
      item.setAttribute("role", "option");
      item.textContent = suggestion;
      item.addEventListener("click", () => {
        applySuggestion(spanEl, suggestion);
        hidePopover();
      });
      list.appendChild(item);
    }
    popover.appendChild(list);
  }

  // Divider + actions
  const actions = document.createElement("div");
  actions.className = "kurmancsc-popover-actions";

  const addBtn = document.createElement("button");
  addBtn.className = "kurmancsc-action-btn";
  addBtn.textContent = "Zêde bike / Add to dictionary";
  addBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "ADD_WORD", word });
    resultCache.set(word, { correct: true, suggestions: [] });
    spanEl.replaceWith(document.createTextNode(word));
    hidePopover();
  });
  actions.appendChild(addBtn);

  const ignoreBtn = document.createElement("button");
  ignoreBtn.className = "kurmancsc-action-btn kurmancsc-action-secondary";
  ignoreBtn.textContent = "Paşguh bike / Ignore";
  ignoreBtn.addEventListener("click", () => {
    resultCache.set(word, { correct: true, suggestions: [] });
    spanEl.replaceWith(document.createTextNode(word));
    hidePopover();
  });
  actions.appendChild(ignoreBtn);

  popover.appendChild(actions);
  popover.classList.add("visible");

  // Prevent popover from going off-screen (right edge)
  requestAnimationFrame(() => {
    const popRect = popover.getBoundingClientRect();
    if (popRect.right > window.innerWidth - 8) {
      popover.style.left = `${window.innerWidth - popRect.width - 8 + scrollX}px`;
    }
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Replace a misspelled span with corrected text inside contenteditable.
 */
function applySuggestion(spanEl, suggestion) {
  const textNode = document.createTextNode(suggestion);
  spanEl.replaceWith(textNode);
  // Restore cursor after the replaced word
  const sel = window.getSelection();
  const range = document.createRange();
  range.setStartAfter(textNode);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// ─── ContentEditable Handling ─────────────────────────────────────────────────

/**
 * Walk all text nodes inside a contenteditable, check words, and wrap
 * misspelled ones in <span class="kurmancsc-misspelled">.
 */
async function checkContentEditable(el) {
  if (!enabled || !checkerReady) return;

  // Gather all text
  const fullText = el.innerText || el.textContent || "";
  const words = extractWords(fullText);
  if (words.length === 0) return;

  await checkWords(words);

  // Now do a targeted walk: only wrap text nodes containing misspelled words
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // Skip nodes already inside a misspelled span to avoid double-wrapping
      if (
        node.parentElement &&
        node.parentElement.classList.contains(MISSPELLED_CLASS)
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  for (const textNode of textNodes) {
    wrapMisspelledInTextNode(textNode);
  }
}

/**
 * Given a text node, split it around misspelled words and wrap them in spans.
 */
function wrapMisspelledInTextNode(textNode) {
  const text = textNode.textContent;
  WORD_REGEX.lastIndex = 0;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = WORD_REGEX.exec(text)) !== null) {
    const word = match[1];
    const start = match.index;
    const end = start + word.length;
    const cached = resultCache.get(word);

    if (!cached || cached.correct) continue; // skip correct words

    // Text before this word
    if (start > lastIndex) {
      parts.push(document.createTextNode(text.slice(lastIndex, start)));
    }

    // The misspelled word wrapped in a span
    const span = document.createElement("span");
    span.className = MISSPELLED_CLASS;
    span.dataset.word = word;
    span.dataset.suggestions = JSON.stringify(cached.suggestions);
    span.textContent = word;

    span.addEventListener("click", (e) => {
      e.stopPropagation();
      showPopover(span, word, cached.suggestions);
    });

    parts.push(span);
    lastIndex = end;
  }

  if (parts.length === 0) return; // nothing to change

  // Trailing text
  if (lastIndex < text.length) {
    parts.push(document.createTextNode(text.slice(lastIndex)));
  }

  // Replace the single text node with the parts
  const parent = textNode.parentNode;
  if (!parent) return;
  for (const part of parts) {
    parent.insertBefore(part, textNode);
  }
  parent.removeChild(textNode);
}

/**
 * Remove all kurmancsc spans from a contenteditable, flattening them back
 * to plain text. Used before re-checking to avoid stale markup.
 */
function clearContentEditableHighlights(el) {
  const spans = el.querySelectorAll(`.${MISSPELLED_CLASS}`);
  for (const span of spans) {
    span.replaceWith(document.createTextNode(span.textContent));
  }
  // Normalize merges adjacent text nodes
  el.normalize();
}

// ─── Textarea Mirror Approach ─────────────────────────────────────────────────

/**
 * Create a "mirror" div that is positioned exactly over a textarea,
 * contains the same text with misspelled words wrapped in coloured spans,
 * and is made transparent to pointer events (so the user can still type).
 */
function getOrCreateMirror(textarea) {
  if (mirrorMap.has(textarea)) return mirrorMap.get(textarea);

  const mirror = document.createElement("div");
  mirror.className = MIRROR_CLASS;
  mirror.setAttribute("aria-hidden", "true");

  document.body.appendChild(mirror);
  mirrorMap.set(textarea, mirror);

  return mirror;
}

function syncMirrorStyle(textarea, mirror) {
  const cs = window.getComputedStyle(textarea);
  const rect = textarea.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  mirror.style.cssText = `
    position: absolute;
    top: ${rect.top + scrollY}px;
    left: ${rect.left + scrollX}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    padding: ${cs.padding};
    border: ${cs.border};
    border-color: transparent;
    font-family: ${cs.fontFamily};
    font-size: ${cs.fontSize};
    font-weight: ${cs.fontWeight};
    line-height: ${cs.lineHeight};
    letter-spacing: ${cs.letterSpacing};
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: hidden;
    box-sizing: border-box;
    background: transparent;
    color: transparent;
    pointer-events: none;
    z-index: 2147483600;
  `;
}

async function updateTextareaMirror(textarea) {
  if (!enabled || !checkerReady) {
    removeMirror(textarea);
    return;
  }

  const text = textarea.value;
  const words = extractWords(text);

  if (words.length > 0) {
    await checkWords(words);
  }

  const mirror = getOrCreateMirror(textarea);
  syncMirrorStyle(textarea, mirror);

  // Build mirror HTML
  WORD_REGEX.lastIndex = 0;
  let html = "";
  let lastIndex = 0;
  let match;

  while ((match = WORD_REGEX.exec(text)) !== null) {
    const word = match[1];
    const start = match.index;
    const end = start + word.length;
    const cached = resultCache.get(word);

    html += escapeHtml(text.slice(lastIndex, start));

    if (cached && !cached.correct) {
      html += `<span class="${MISSPELLED_CLASS}" data-word="${escapeHtml(word)}">${escapeHtml(word)}</span>`;
    } else {
      html += escapeHtml(word);
    }

    lastIndex = end;
  }

  html += escapeHtml(text.slice(lastIndex));
  mirror.innerHTML = html;
  mirror.scrollTop = textarea.scrollTop;

  // Click handler on mirror spans to show popover
  mirror.querySelectorAll(`.${MISSPELLED_CLASS}`).forEach((span) => {
    const word = span.dataset.word;
    const cached = resultCache.get(word);
    if (!cached) return;

    // Mirror is pointer-events:none, so we need a different approach:
    // We catch clicks on the textarea and map them to the mirror span.
    // The click listener is added on the textarea itself below.
  });
}

/**
 * Handle clicks on a textarea — map click coordinates to mirror spans.
 */
function handleTextareaClick(e) {
  const textarea = e.target;
  const mirror = mirrorMap.get(textarea);
  if (!mirror) return;

  // Temporarily enable pointer events to do elementFromPoint
  mirror.style.pointerEvents = "auto";
  const el = document.elementFromPoint(e.clientX, e.clientY);
  mirror.style.pointerEvents = "none";

  if (el && el.classList.contains(MISSPELLED_CLASS)) {
    const word = el.dataset.word;
    const cached = resultCache.get(word);
    if (cached && !cached.correct) {
      showPopover(el, word, cached.suggestions);
      e.preventDefault();
    }
  }
}

function removeMirror(textarea) {
  const mirror = mirrorMap.get(textarea);
  if (mirror) {
    mirror.remove();
    mirrorMap.delete(textarea);
  }
}

// ─── Element Processing ───────────────────────────────────────────────────────

function isContentEditable(el) {
  return (
    el.isContentEditable ||
    el.getAttribute("contenteditable") === "true" ||
    el.getAttribute("contenteditable") === ""
  );
}

function processElement(el) {
  if (!enabled) return;

  if (el.tagName === "TEXTAREA") {
    debounce(el, () => updateTextareaMirror(el), DEBOUNCE_MS);
  } else if (isContentEditable(el)) {
    debounce(
      el,
      () => {
        clearContentEditableHighlights(el);
        checkContentEditable(el);
      },
      DEBOUNCE_MS,
    );
  }
}

// ─── DOM Observation ──────────────────────────────────────────────────────────

const inputHandler = (e) => {
  if (!enabled) return;
  processElement(e.target);
};

const focusHandler = (e) => {
  if (!enabled) return;
  const el = e.target;
  if (el.tagName === "TEXTAREA" || isContentEditable(el)) {
    processElement(el);
  }
};

const scrollHandler = (e) => {
  const textarea = e.target;
  if (textarea.tagName !== "TEXTAREA") return;
  const mirror = mirrorMap.get(textarea);
  if (mirror) {
    mirror.scrollTop = textarea.scrollTop;
  }
};

function attachListeners() {
  document.addEventListener("input", inputHandler, true);
  document.addEventListener("focus", focusHandler, true);
  document.addEventListener("scroll", scrollHandler, true);
  document.addEventListener("click", handleDocumentClick, true);
}

function handleDocumentClick(e) {
  // Close popover on outside click
  const popover = document.getElementById(POPOVER_ID);
  if (popover && !popover.contains(e.target)) {
    hidePopover();
  }

  // Handle textarea mirror click mapping
  if (e.target && e.target.tagName === "TEXTAREA" && mirrorMap.has(e.target)) {
    handleTextareaClick(e);
  }
}

/**
 * Scan all existing editable elements on page load.
 */
function scanExistingElements() {
  const elements = document.querySelectorAll(
    'textarea, [contenteditable="true"], [contenteditable=""]',
  );
  for (const el of elements) {
    if (el.value || el.textContent) {
      processElement(el);
    }
  }
}

/**
 * Watch for dynamically added textareas / contenteditables.
 */
const mutationObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.tagName === "TEXTAREA" || isContentEditable(node)) {
        processElement(node);
      }
      // Also check descendants
      node
        .querySelectorAll?.("textarea, [contenteditable]")
        .forEach(processElement);
    }
  }
});

// ─── Enable / Disable ─────────────────────────────────────────────────────────

function enableChecker() {
  enabled = true;
  scanExistingElements();
}

function disableChecker() {
  enabled = false;

  // Remove all textarea mirrors
  document.querySelectorAll("textarea").forEach(removeMirror);

  // Remove all contenteditable highlights
  document.querySelectorAll(`.${MISSPELLED_CLASS}`).forEach((span) => {
    span.replaceWith(document.createTextNode(span.textContent));
  });

  hidePopover();
}

// ─── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case "DICTIONARY_READY":
      checkerReady = true;
      if (enabled) scanExistingElements();
      break;

    case "ENABLED_CHANGED":
      if (message.enabled) {
        enableChecker();
      } else {
        disableChecker();
      }
      break;
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

(async function init() {
  // Get persisted enabled state
  const items = await chrome.storage.sync.get({ kurmancSC_enabled: true });
  const storedEnabled = items.kurmancSC_enabled;
  enabled = storedEnabled ?? true;

  // Check if background is already ready
  try {
    const status = await chrome.runtime.sendMessage({ type: "CHECK_STATUS" });
    checkerReady = status.ready;
  } catch {
    checkerReady = false;
  }

  if (!enabled) return;

  attachListeners();
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  if (checkerReady) {
    scanExistingElements();
  }
  // Otherwise we wait for DICTIONARY_READY message from background
})();
