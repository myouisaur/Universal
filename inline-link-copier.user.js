// ==UserScript==
// @name         [Universal] Quick Link Copier
// @namespace    https://github.com/myouisaur/Universal
// @version      2.7
// @description  Displays a permanent ghost outline on links and injects a persistent inline copy icon next to the text.
// @author       Xiv
// @match        *://*/*
// @updateURL    https://myouisaur.github.io/Universal/inline-link-copier.user.js
// @downloadURL  https://myouisaur.github.io/Universal/inline-link-copier.user.js
// ==/UserScript==

(function () {
    'use strict';

    if (window.__tmQuickLinkCopierActive) return;
    window.__tmQuickLinkCopierActive = true;

    // --- Configuration & Constants ---
    const CONFIG = {
        ICON_COPY: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>`,
        ICON_CHECK: `
            <svg viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>`,
        SUCCESS_DELAY: 2000,
        MORPH_DELAY: 1500,
        HOVER_GRACE_PERIOD: 150,
        DEBUG: false
    };

    // --- Structured Logging ---
    const Logger = {
        info(msg, ...args) { if (CONFIG.DEBUG) console.log(`[Quick Link Copier] ${msg}`, ...args); },
        warn(msg, ...args) { if (CONFIG.DEBUG) console.warn(`[Quick Link Copier] ${msg}`, ...args); },
        error(msg, ...args) { if (CONFIG.DEBUG) console.error(`[Quick Link Copier] ${msg}`, ...args); }
    };

    // --- State Management ---
    const State = {
        activeLink: null,
        toastTimer: null,
        hideTimer: null
    };

    // --- UI Module ---
    const UI = {
        toastElement: null,
        singletonIcon: null,

        init() {
            this.injectCSS();
            this.createToast();
            this.createSingletonIcon();
        },

        injectCSS() {
            const style = document.createElement('style');
            style.textContent = `
                /* 1. Permanent Ghost Outline */
                body a[href] {
                    outline: 1px dashed rgba(255, 71, 87, 0.4) !important;
                    outline-offset: 2px !important;
                    transition: outline-color 0.15s ease !important;
                }
                body a[href]:hover {
                    outline: 1px dashed rgba(255, 71, 87, 1) !important;
                }

                /* 2. Singleton Floating Copy Icon (Universal Neutral Design) */
                #tm-qlc-singleton {
                    position: fixed !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: 28px !important;
                    height: 28px !important;
                    padding: 6px !important;
                    cursor: pointer !important;

                    /* Universal Dark Theme */
                    background: #242424 !important;
                    color: #f3f3f3 !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 6px !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0,0,0,0.15) !important;

                    /* Hidden by default */
                    opacity: 0 !important;
                    visibility: hidden !important;
                    pointer-events: none !important;

                    transition: opacity 0.15s ease, visibility 0.15s ease, background 0.2s ease !important;
                    z-index: 2147483647 !important;
                }

                #tm-qlc-singleton.tm-qlc-visible {
                    opacity: 1 !important;
                    visibility: visible !important;
                    pointer-events: auto !important;
                }

                #tm-qlc-singleton:hover {
                    background: #3a3a3a !important;
                }

                /* Icon scaling on hover for tighter UX */
                #tm-qlc-singleton svg {
                    width: 100% !important;
                    height: 100% !important;
                    pointer-events: none !important;
                    transition: transform 0.2s ease !important;
                }

                #tm-qlc-singleton:hover svg {
                    transform: scale(1.1) !important;
                }

                /* 3. Sleek Toast Notification */
                .tm-qlc-toast {
                    position: fixed;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%) translateY(20px);
                    background: rgba(40, 40, 40, 0.95);
                    color: #fff;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 2147483647;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;
                    backdrop-filter: blur(4px);
                    pointer-events: none;
                }
                .tm-qlc-toast.tm-qlc-visible {
                    opacity: 1;
                    visibility: visible;
                    transform: translateX(-50%) translateY(0);
                }

                @media (prefers-color-scheme: light) {
                    .tm-qlc-toast {
                        background: #ffffff;
                        color: #242424;
                        border: 1px solid rgba(0,0,0,0.1);
                    }
                }
            `;
            document.head.appendChild(style);
        },

        createSingletonIcon() {
            this.singletonIcon = document.createElement('button');
            this.singletonIcon.id = 'tm-qlc-singleton';
            this.singletonIcon.type = 'button';
            this.singletonIcon.setAttribute('aria-label', 'Copy Link');
            this.singletonIcon.innerHTML = CONFIG.ICON_COPY;

            if (document.body) {
                document.body.appendChild(this.singletonIcon);
            }
        },

        createToast() {
            this.toastElement = document.createElement('div');
            this.toastElement.className = 'tm-qlc-toast';
            this.toastElement.setAttribute('role', 'alert');
            this.toastElement.setAttribute('aria-live', 'polite');
            this.toastElement.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Link Copied!</span>
            `;

            if (document.body) {
                document.body.appendChild(this.toastElement);
            }
        },

        showToast() {
            if (!this.toastElement) return;
            clearTimeout(State.toastTimer);
            this.toastElement.classList.add('tm-qlc-visible');
            State.toastTimer = setTimeout(() => {
                this.toastElement.classList.remove('tm-qlc-visible');
            }, CONFIG.SUCCESS_DELAY);
        },

        triggerIconMorph() {
            if (!this.singletonIcon) return;
            this.singletonIcon.innerHTML = CONFIG.ICON_CHECK;
            setTimeout(() => {
                if (this.singletonIcon) {
                    this.singletonIcon.innerHTML = CONFIG.ICON_COPY;
                }
            }, CONFIG.MORPH_DELAY);
        }
    };

    // --- Clipboard Utilities ---
    const ClipboardUtils = {
        async copy(text) {
            if (!text) return;
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(text);
                    return true;
                }
                throw new Error('Clipboard API unavailable');
            } catch (err) {
                this.fallbackCopy(text);
            }
        },

        fallbackCopy(text) {
            if (!document.body) return;
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";
            textArea.setAttribute('aria-hidden', 'true');

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try { document.execCommand('copy'); }
            catch (err) { Logger.error("Fallback copy failed."); }
            finally { document.body.removeChild(textArea); }
        }
    };

    // --- Event Observers (The Singleton Engine) ---
    const Events = {
        init() {
            // Hover logic
            document.addEventListener('mouseover', (e) => {
                const link = e.target.closest('a[href]');
                const isIcon = e.target.closest('#tm-qlc-singleton');

                // Keep icon alive if hovered directly
                if (isIcon) {
                    clearTimeout(State.hideTimer);
                    return;
                }

                // If hovering a link
                if (link) {
                    const rawHref = link.getAttribute('href');

                    // Smart Exclusions (Use raw attribute to filter accurately)
                    if (!rawHref || rawHref === '#' || /^(javascript|mailto|tel|blob|data):/i.test(rawHref)) {
                        return;
                    }

                    clearTimeout(State.hideTimer);

                    // CRITICAL FIX: Grab the fully resolved absolute URL property instead of the attribute
                    State.activeLink = link.href;

                    const rect = link.getBoundingClientRect();
                    const iconWidth = 28;
                    const iconHeight = 28;
                    const gap = 4;

                    let targetLeft = rect.right + gap;
                    let targetTop = rect.top + (rect.height / 2) - (iconHeight / 2);

                    if (targetLeft + iconWidth > window.innerWidth) {
                        targetLeft = rect.left - iconWidth - gap;
                    }

                    UI.singletonIcon.style.left = `${targetLeft}px`;
                    UI.singletonIcon.style.top = `${targetTop}px`;
                    UI.singletonIcon.classList.add('tm-qlc-visible');
                }
            });

            // Hide logic
            document.addEventListener('mouseout', (e) => {
                const link = e.target.closest('a[href]');
                const isIcon = e.target.closest('#tm-qlc-singleton');

                if (link || isIcon) {
                    State.hideTimer = setTimeout(() => {
                        UI.singletonIcon.classList.remove('tm-qlc-visible');
                    }, CONFIG.HOVER_GRACE_PERIOD);
                }
            });

            // Instantly hide on scroll
            window.addEventListener('scroll', () => {
                if (UI.singletonIcon) UI.singletonIcon.classList.remove('tm-qlc-visible');
            }, { passive: true });

            // Click logic
            document.addEventListener('click', (e) => {
                const isIcon = e.target.closest('#tm-qlc-singleton');

                if (isIcon && State.activeLink) {
                    e.preventDefault();
                    e.stopPropagation();

                    ClipboardUtils.copy(State.activeLink);
                    UI.showToast();
                    UI.triggerIconMorph();
                }
            }, { capture: true });
        }
    };

    // --- Core Application ---
    const App = {
        init() {
            try {
                UI.init();
                Events.init();
                Logger.info("Singleton Architecture initialized.");
            } catch (error) {
                Logger.error("Fatal error during initialization.", error);
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
        App.init();
    }

})();
