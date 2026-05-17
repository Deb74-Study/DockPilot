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
      '--text':        '#1c2733',
      '--muted':       '#485565',
      '--accent':      '#7a8694',
      '--accent-2':    '#a1acb8',
      '--panel':       '#f7f9fb',
      '--panel-soft':  '#edf1f5',
      '--border':      '#8a98a8',
      '--line':        '#b7c2ce',
      '--ok':          '#8ef0b1',
      '--warn':        '#ffd28c',
      '--blue-text':   '#2f4358',
      '--badge-fill':  '#e2e8ef',
      '--badge-line':  'rgba(138, 152, 168, 0.45)',
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
  const cssBlocks = [
    `body { background: ${theme.bodyBg} !important; }`,
  ];

  if (resolved === 'light') {
    cssBlocks.push(`
      :root[data-theme="light"] .writing-area {
        background: linear-gradient(180deg, #fdfefe 0%, #f4f7fa 100%) !important;
        border-color: #b5c0cc !important;
      }

      :root[data-theme="light"] .screen {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(245, 248, 251, 0.94)), #eef2f6 !important;
        border-color: #c0cad6 !important;
      }

      :root[data-theme="light"] .berth,
      :root[data-theme="light"] .colour-pref-wrap,
      :root[data-theme="light"] .cp-btn,
      :root[data-theme="light"] .cp-options,
      :root[data-theme="light"] .more-actions-dropdown.collapsed,
      :root[data-theme="light"] .more-actions-dropdown button,
      :root[data-theme="light"] .more-actions-toggle {
        background: #f7f9fb !important;
        border-color: #c2ccd8 !important;
        color: #1c2733 !important;
      }

      :root[data-theme="light"] .logo-container {
        background: #020d19 !important;
      }

      :root[data-theme="light"] .brand-copy {
        border-color: rgba(255, 255, 255, 0.96) !important;
        background: rgba(255, 255, 255, 0.02) !important;
      }

      :root[data-theme="light"] .brand-name {
        color: #eef4ff !important;
      }

      :root[data-theme="light"] .logo {
        background: linear-gradient(135deg, #67d6ff, #72f1cb) !important;
        color: #06111f !important;
      }

      :root[data-theme="light"] .logo::before {
        border-color: rgba(9, 16, 32, 0.92) !important;
      }

      :root[data-theme="light"] .brand .eyebrow {
        color: #67d6ff !important;
        background: rgba(103, 214, 255, 0.12) !important;
        border-color: rgba(103, 214, 255, 0.28) !important;
      }

      :root[data-theme="light"] .dev-note {
        color: #0a7fa6 !important;
        background: rgba(10, 127, 166, 0.14) !important;
        border-color: rgba(10, 127, 166, 0.48) !important;
      }

      :root[data-theme="light"] .berth-link:hover .berth,
      :root[data-theme="light"] .berth-link:focus-visible .berth,
      :root[data-theme="light"] .cp-btn:hover,
      :root[data-theme="light"] .cp-btn:focus-visible,
      :root[data-theme="light"] .return-link:hover,
      :root[data-theme="light"] .return-link:focus-visible,
      :root[data-theme="light"] .secondary-btn:hover,
      :root[data-theme="light"] .secondary-btn:focus-visible,
      :root[data-theme="light"] #viewEditVesselBtn:hover,
      :root[data-theme="light"] #viewEditVesselBtn:focus-visible,
      :root[data-theme="light"] #saveVpBtn:not([disabled]):hover,
      :root[data-theme="light"] #saveVpBtn:not([disabled]):focus-visible,
      :root[data-theme="light"] .more-actions-toggle:hover,
      :root[data-theme="light"] .more-actions-dropdown button:not(.more-actions-toggle):hover {
        background: linear-gradient(135deg, #dbe4ee, #cfd9e4) !important;
        border-color: rgba(0, 184, 255, 0.65) !important;
        color: #132231 !important;
        box-shadow: 0 0 0 2px rgba(0, 184, 255, 0.18) !important;
      }

      :root[data-theme="light"] .more-actions-dropdown:not(.collapsed) {
        background: #edf1f5 !important;
        border: 1px solid #bcc7d3 !important;
        box-shadow: 0 14px 30px rgba(19, 34, 49, 0.14) !important;
      }

      :root[data-theme="light"] .modal-card {
        background: #f8fafc !important;
        border-color: #b8c3cf !important;
        box-shadow: 0 24px 50px rgba(19, 34, 49, 0.2) !important;
      }

      :root[data-theme="light"] .modal-card h2,
      :root[data-theme="light"] .modal-card p {
        color: #1c2733 !important;
      }

      :root[data-theme="light"] .filter-select,
      :root[data-theme="light"] .filter-readonly,
      :root[data-theme="light"] .form-input {
        background: #f3f6fa !important;
        border-color: #b9c4d1 !important;
        color: #1c2733 !important;
      }

      :root[data-theme="light"] .filter-select option {
        background: #f3f6fa !important;
        color: #1c2733 !important;
      }

      :root[data-theme="light"] .filter-select:focus,
      :root[data-theme="light"] .form-input:focus {
        border-color: rgba(0, 184, 255, 0.78) !important;
        box-shadow: 0 0 0 2px rgba(0, 184, 255, 0.18) !important;
      }

      :root[data-theme="light"] .context-banner {
        border-color: rgba(0, 184, 255, 0.42) !important;
        background: rgba(0, 184, 255, 0.1) !important;
      }

      :root[data-theme="light"] .context-banner-title {
        color: #008dc7 !important;
      }

      :root[data-theme="light"] .panel-header {
        color: #00f0ff !important;
      }

      :root[data-theme="light"] .panel-scroll-note {
        border-color: rgba(255, 138, 0, 0.72) !important;
        background: rgba(255, 138, 0, 0.2) !important;
        color: #ff7a00 !important;
        box-shadow: 0 0 0 1px rgba(255, 138, 0, 0.24) inset !important;
      }

      :root[data-theme="light"] .field-indicator {
        background: #ffad33 !important;
      }

      :root[data-theme="light"] .field-indicator.is-valid {
        background: #00e86a !important;
      }

      :root[data-theme="light"] .rolodex-pair {
        background: #edf1f5 !important;
        border-color: #bcc7d3 !important;
        box-shadow: 0 14px 30px rgba(19, 34, 49, 0.14) !important;
      }

      :root[data-theme="light"] .rolodex-wrapper {
        background: #f7f9fb !important;
        border-color: #c2ccd8 !important;
      }

      :root[data-theme="light"] .rolodex-item {
        color: #485565 !important;
      }

      :root[data-theme="light"] .rolodex-item:not(.rolodex-phantom):hover {
        color: #132231 !important;
        background: #dbe4ee !important;
      }

      :root[data-theme="light"] .rolodex-fade-top {
        background: linear-gradient(to bottom, rgba(237, 241, 245, 0.95) 0%, transparent 100%) !important;
      }

      :root[data-theme="light"] .rolodex-fade-bottom {
        background: linear-gradient(to top, rgba(237, 241, 245, 0.95) 0%, transparent 100%) !important;
      }

      :root[data-theme="light"] .upload-btn {
        background: #f0f4f8 !important;
        border-color: #bac6d3 !important;
        color: #5c6977 !important;
        opacity: 1 !important;
      }

      :root[data-theme="light"] .upload-btn:not(:disabled) {
        background: rgba(255, 173, 51, 0.18) !important;
        border-color: rgba(255, 173, 51, 0.58) !important;
        color: #8f4a00 !important;
      }

      :root[data-theme="light"] .upload-btn:not(:disabled):hover {
        background: rgba(255, 173, 51, 0.28) !important;
      }

      :root[data-theme="light"] .upload-btn.upload-done {
        color: #1f6b3a !important;
        background: rgba(31, 107, 58, 0.14) !important;
        border-color: rgba(31, 107, 58, 0.45) !important;
      }

      :root[data-theme="light"] #saveVpBtn.primary-btn[disabled] {
        background: #eef3f8 !important;
        border: 1px solid #aab7c6 !important;
        color: #5b697a !important;
        opacity: 1 !important;
      }

      :root[data-theme="light"] #saveVpBtn.primary-btn[disabled]:hover {
        background: #f4f7fa !important;
        border-color: #98a8b8 !important;
        box-shadow: none !important;
        color: #4f5f71 !important;
        transform: none !important;
      }

      :root[data-theme="light"] #saveVpBtn.primary-btn:not([disabled]),
      :root[data-theme="light"] #viewEditVesselBtn.primary-btn {
        background: #f7f9fb !important;
        border: 1px solid #c2ccd8 !important;
        color: #1c2733 !important;
      }

      :root[data-theme="light"] #saveVpBtn.primary-btn:not([disabled]):hover,
      :root[data-theme="light"] #saveVpBtn.primary-btn:not([disabled]):focus-visible,
      :root[data-theme="light"] #viewEditVesselBtn.primary-btn:hover,
      :root[data-theme="light"] #viewEditVesselBtn.primary-btn:focus-visible {
        background: linear-gradient(135deg, #dbe4ee, #cfd9e4) !important;
        border-color: rgba(0, 184, 255, 0.65) !important;
        color: #132231 !important;
        box-shadow: 0 0 0 2px rgba(0, 184, 255, 0.18) !important;
        filter: none !important;
      }

      :root[data-theme="light"] .tag {
        color: #000000 !important;
        border-color: #000000 !important;
      }

      :root[data-theme="light"] .status-note.success {
        color: #1f6b3a !important;
        background: rgba(31, 107, 58, 0.14) !important;
        border-color: rgba(31, 107, 58, 0.45) !important;
      }

      /* Fleet Registration: Alternating column gradient fills (C1, C3, C5, C7...) */
      :root[data-theme="light"] .data-cell[data-col-index="0"],
      :root[data-theme="light"] .data-cell[data-col-index="2"],
      :root[data-theme="light"] .data-cell[data-col-index="4"],
      :root[data-theme="light"] .data-cell[data-col-index="6"],
      :root[data-theme="light"] .data-cell[data-col-index="8"],
      :root[data-theme="light"] .data-cell[data-col-index="10"],
      :root[data-theme="light"] .data-cell[data-col-index="12"],
      :root[data-theme="light"] .data-cell[data-col-index="14"],
      :root[data-theme="light"] .data-cell[data-col-index="16"],
      :root[data-theme="light"] .data-cell[data-col-index="18"],
      :root[data-theme="light"] .subheader-cell[data-col-index="0"],
      :root[data-theme="light"] .subheader-cell[data-col-index="2"],
      :root[data-theme="light"] .subheader-cell[data-col-index="4"],
      :root[data-theme="light"] .subheader-cell[data-col-index="6"],
      :root[data-theme="light"] .subheader-cell[data-col-index="8"],
      :root[data-theme="light"] .subheader-cell[data-col-index="10"],
      :root[data-theme="light"] .subheader-cell[data-col-index="12"],
      :root[data-theme="light"] .subheader-cell[data-col-index="14"],
      :root[data-theme="light"] .subheader-cell[data-col-index="16"],
      :root[data-theme="light"] .subheader-cell[data-col-index="18"] {
        background: linear-gradient(90deg, #E0E8EF 0%, #ffffff 100%) !important;
      }
    `);
  }

  styleEl.textContent = cssBlocks.join('\n');

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
