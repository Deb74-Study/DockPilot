/**
 * dockpilotTheme.js
 * Shared theme manager for all DockPilot pages.
 *
 * Three modes:
 *   'default' — Theme Colour  (existing blue/teal dark palette)
 *   'light'   — Light Mode    (light grey/white, dark text)
 *   'dark'    — Dark Mode     (near-black grey-scale, off-white text)
 *
 * Traffic-light indicator colours (--ok, --warn) are identical across all
 * modes per the DockPilot design spec.
 *
 * Usage (at the top of each page's <script type="module">):
 *   import { loadSavedTheme } from './dockpilotTheme.js';
 *   loadSavedTheme();   // call before anything else renders
 *
 * To switch theme programmatically:
 *   import { applyTheme } from './dockpilotTheme.js';
 *   applyTheme('light');
 */

export const STORAGE_KEY = 'dockpilot.themeMode';

/**
 * Theme token maps.
 * Each theme supplies:
 *   vars      — CSS custom properties applied to :root
 *   bodyBg    — CSS value for body { background }
 */
export const THEMES = {

  default: {
    label: 'Theme Colour',
    vars: {
      '--text':        '#eef4ff',
      '--muted':       '#aebcda',
      '--accent':      '#67d6ff',
      '--accent-2':    '#72f1cb',
      '--panel':       'rgba(11, 24, 45, 0.92)',
      '--panel-soft':  'rgba(18, 29, 54, 0.72)',
      '--border':      'rgba(255, 255, 255, 0.10)',
      '--line':        'rgba(255, 255, 255, 0.10)',
      '--ok':          '#8ef0b1',
      '--warn':        '#ffd28c',
      '--blue-text':   '#163b73',
      '--badge-fill':  '#093046',
      '--badge-line':  'rgba(107, 215, 255, 0.24)',
      '--shadow':      '0 24px 60px rgba(0, 0, 0, 0.35)',
    },
    bodyBg: [
      'radial-gradient(circle at top left,     #133977 0%, transparent 32%)',
      'radial-gradient(circle at bottom right, #0f8f98 0%, transparent 30%)',
      'linear-gradient(135deg, #06111f, #0a1830 40%, #07111e 100%)',
    ].join(', '),
  },

  light: {
    label: 'Light Mode',
    vars: {
      '--text':        '#151922',
      '--muted':       '#4f5a6b',
      '--accent':      '#3a6fb0',
      '--accent-2':    '#6f8db6',
      '--panel':       'rgba(255, 255, 255, 0.95)',
      '--panel-soft':  'rgba(238, 241, 245, 0.90)',
      '--border':      'rgba(0, 0, 0, 0.12)',
      '--line':        'rgba(0, 0, 0, 0.10)',
      '--ok':          '#8ef0b1',
      '--warn':        '#ffd28c',
      '--blue-text':   '#3a6fb0',
      '--badge-fill':  '#dde8f5',
      '--badge-line':  'rgba(58, 111, 176, 0.30)',
      '--shadow':      '0 24px 60px rgba(0, 0, 0, 0.12)',
    },
    bodyBg: '#f6f7f9',
  },

  dark: {
    label: 'Dark Mode',
    vars: {
      '--text':        '#f4f6fa',
      '--muted':       '#c2c9d4',
      '--accent':      '#8ea4c2',
      '--accent-2':    '#b8c4d6',
      '--panel':       'rgba(17, 19, 23, 0.96)',
      '--panel-soft':  'rgba(26, 29, 34, 0.90)',
      '--border':      'rgba(255, 255, 255, 0.06)',
      '--line':        'rgba(255, 255, 255, 0.07)',
      '--ok':          '#8ef0b1',
      '--warn':        '#ffd28c',
      '--blue-text':   '#8ea4c2',
      '--badge-fill':  '#1a1d22',
      '--badge-line':  'rgba(142, 164, 194, 0.24)',
      '--shadow':      '0 24px 60px rgba(0, 0, 0, 0.60)',
    },
    bodyBg: [
      'radial-gradient(circle at top left,     #12151a 0%, transparent 32%)',
      'radial-gradient(circle at bottom right, #12151a 0%, transparent 30%)',
      'linear-gradient(135deg, #050608, #0d0f13 40%, #050608 100%)',
    ].join(', '),
  },

};

/**
 * Apply a theme mode to the current document.
 * Safe to call before DOMContentLoaded — only touches <html> and <head>.
 *
 * @param {'default'|'light'|'dark'} mode
 */
export function applyTheme(mode) {
  const resolved = (mode && THEMES[mode]) ? mode : 'default';
  const theme    = THEMES[resolved];
  const root     = document.documentElement;

  // Mark the active mode for CSS selectors e.g. [data-theme="light"] .foo { … }
  root.setAttribute('data-theme', resolved);

  // Apply all CSS custom properties
  for (const [prop, val] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, val);
  }

  // Override body background via an injected <style> so per-page hardcoded
  // gradients are superseded without touching each page's own stylesheet.
  let styleEl = document.getElementById('dp-theme-bg');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dp-theme-bg';
    // Prepend so page-specific rules declared later still win in edge cases
    (document.head || document.documentElement).prepend(styleEl);
  }
  styleEl.textContent = `body { background: ${theme.bodyBg} !important; }`;

  // Persist selection
  try { localStorage.setItem(STORAGE_KEY, resolved); } catch { /* private browsing */ }
}

/**
 * Load and immediately apply the user's saved theme preference.
 * Returns the active mode string.
 *
 * @returns {'default'|'light'|'dark'}
 */
export function loadSavedTheme() {
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* private browsing */ }
  const mode = (saved && THEMES[saved]) ? saved : 'default';
  applyTheme(mode);
  return mode;
}

/**
 * Return the currently active theme mode without applying any changes.
 *
 * @returns {'default'|'light'|'dark'}
 */
export function getCurrentTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved && THEMES[saved]) ? saved : 'default';
  } catch {
    return 'default';
  }
}
