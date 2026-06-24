/**
 * popup.js — Popup UI Controller
 * Kurdish Kurmanci Spell Checker | Kurdish Tech Organization
 */

'use strict';

// ─── DOM References ───────────────────────────────────────────────────────────
const mainToggle     = document.getElementById('mainToggle');
const toggleCard     = document.getElementById('toggleCard');
const toggleDesc     = document.getElementById('toggleDesc');
const statusDot      = document.getElementById('statusDot');
const statusText     = document.getElementById('statusText');
const sessionChecked = document.getElementById('sessionChecked');
const sessionErrors  = document.getElementById('sessionErrors');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setStatus(state, message) {
  // state: 'loading' | 'ready' | 'error'
  statusDot.className = 'status-dot ' + state;
  statusText.innerHTML = message;
}

function animateCounter(el, target) {
  const start  = parseInt(el.textContent, 10) || 0;
  if (start === target) return;
  const step   = target > start ? 1 : -1;
  let current  = start;
  const timer  = setInterval(() => {
    current += step;
    el.textContent = current;
    if (current === target) clearInterval(timer);
  }, 20);
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function applyToggleState(enabled) {
  toggleCard.classList.toggle('active', enabled);
  mainToggle.checked = enabled;
  toggleDesc.textContent = enabled
    ? 'Checking Kurmanci text in real-time'
    : 'Spell checking is paused';
}

mainToggle.addEventListener('change', () => {
  const enabled = mainToggle.checked;
  applyToggleState(enabled);
  chrome.runtime.sendMessage({ type: 'SET_ENABLED', enabled }).catch(() => {});
  chrome.storage.sync.set({ kurmancSC_enabled: enabled });
});

// ─── Status Polling ───────────────────────────────────────────────────────────

function pollStatus() {
  chrome.runtime.sendMessage({ type: 'CHECK_STATUS' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      setStatus('error', 'Extension background not reachable');
      return;
    }
    if (response.ready) {
      setStatus('ready', 'Kurmanci dictionary loaded &amp; ready');
    } else if (response.error) {
      setStatus('error', 'Dictionary error — see README for setup');
    } else {
      setStatus('loading', '<span class="loading-text">Loading Kurmanci dictionary…</span>');
      setTimeout(pollStatus, 1200);
    }
  });
}

// ─── Stats (from storage) ─────────────────────────────────────────────────────

function loadStats() {
  chrome.storage.sync.get(
    { personalDictionary: [] },
    (items) => {
      // Show personal dictionary size as a meaningful metric
      animateCounter(sessionChecked, items.personalDictionary.length);
    }
  );
}

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.sync.get({ kurmancSC_enabled: true }, (items) => {
  applyToggleState(items.kurmancSC_enabled);
});

pollStatus();
loadStats();
