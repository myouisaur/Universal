// ==UserScript==
// @name         Universal Copy Success Toast
// @namespace    https://github.com/myouisaur/Universal
// @version      4.0
// @description  Toast notification on successful copy action.
// @author       Xiv
// @match        *://*/*
// @all_frames   true
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://myouisaur.github.io/Universal/copy-notif-toast.user.js
// @downloadURL  https://myouisaur.github.io/Facebook/copy-notif-toast.user.js
// ==/UserScript==

(function() {
    'use strict';

    const isTopWindow = window === window.top;

    // ============================================================================
    // 1. IFRAME RELAY (With Unique Signature)
    // ============================================================================
    if (!isTopWindow) {
        window.addEventListener('copy', () => {
            try {
                // Pass an object with a highly specific signature instead of a basic string
                window.top.postMessage({
                    uesSignature: 'UES_COPY_SUCCESS_V4',
                    timestamp: Date.now()
                }, '*');
            } catch(e) {
                // Ignore cross-origin DOM errors gracefully
            }
        }, { capture: true, passive: true });

        return; // EXIT SCRIPT EARLY.
    }

    // ============================================================================
    // --- BELOW THIS LINE ONLY RUNS ONCE IN THE MAIN TOP WINDOW ---
    // ============================================================================

    let toastElem = null;
    let hideTimeout = null;
    let audioCtx = null;
    let lastTriggerTime = 0; // Used to prevent iframe echoes

    // ============================================================================
    // 2. AUDIO GENERATOR
    // ============================================================================
    function playAudioCue() {
        try {
            if (!audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                audioCtx = new AudioContext();
            }

            // Catch any browser policy errors (e.g., auto-play blocks) silently
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }

            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
            // Failsafe exit if audio hardware is completely unavailable
        }
    }

    // ============================================================================
    // 3. BULLETPROOF STYLES
    // ============================================================================
    const STYLES = `
        #ues-copy-toast {
            /* !important prevents hostile website CSS from breaking the layout */
            position: fixed !important;
            bottom: 30px !important;
            left: 30px !important;
            padding: 10px 16px !important;
            border-radius: 8px !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            z-index: 2147483647 !important;
            opacity: 0 !important;
            pointer-events: none !important;
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            margin: 0 !important;

            transform: translateY(15px) !important;
            transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;

            background-color: rgba(255, 255, 255, 0.85) !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
            color: #171717 !important;
            border: 1px solid rgba(0, 0, 0, 0.08) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04) !important;
        }

        #ues-copy-toast.ues-show {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }

        #ues-copy-toast svg {
            color: #10b981 !important;
            flex-shrink: 0 !important;
            margin: 0 !important;
        }

        @media (prefers-color-scheme: dark) {
            #ues-copy-toast {
                background-color: rgba(38, 38, 38, 0.85) !important;
                color: #f5f5f5 !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2) !important;
            }
        }
    `;

    if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(STYLES);
    } else {
        const style = document.createElement('style');
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    // ============================================================================
    // 4. CORE UI LOGIC
    // ============================================================================

    function createToast() {
        toastElem = document.createElement('div');
        toastElem.id = 'ues-copy-toast';
        // Add ARIA attributes so screen readers know this is an important alert
        toastElem.setAttribute('role', 'alert');
        toastElem.setAttribute('aria-live', 'polite');

        toastElem.innerHTML = `
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"></path>
            </svg>
            Copied to clipboard
        `;
        document.body.appendChild(toastElem);
    }

    function triggerToastFlow() {
        // 1. Throttle check: Prevent duplicate triggers within 50 milliseconds of each other
        // This solves the "nested iframe echo" problem.
        const now = Date.now();
        if (now - lastTriggerTime < 50) return;
        lastTriggerTime = now;

        if (!document.body) return;
        if (!toastElem) createToast();

        playAudioCue();

        toastElem.classList.remove('ues-show');
        void toastElem.offsetWidth;
        toastElem.classList.add('ues-show');

        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            toastElem.classList.remove('ues-show');
        }, 2000);
    }

    // ============================================================================
    // 5. EVENT LISTENERS
    // ============================================================================

    // Main window copies
    window.addEventListener('copy', triggerToastFlow, { capture: true, passive: true });

    // Iframe copies
    window.addEventListener('message', (e) => {
        // Only trigger if the unique signature exists on the message object
        if (e.data && e.data.uesSignature === 'UES_COPY_SUCCESS_V4') {
            triggerToastFlow();
        }
    });

})();
