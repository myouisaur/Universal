// ==UserScript==
// @name         [Universal] Copy Success Toast
// @namespace    https://github.com/myouisaur/Universal
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBiOTgxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iOSIgeT0iOSIgd2lkdGg9IjEzIiBoZWlnaHQ9IjEzIiByeD0iMiIgcnk9IjIiPjwvcmVjdD48cGF0aCBkPSJNNSAxNUg0YTIgMiAwIDAgMS0yLTJWNGEyIDIgMCAwIDEgMi0yaDlhMiAyIDAgMCAxIDIgMnYxIj48L3BhdGg+PC9zdmc+
// @version      7.1
// @description  Displays a brief visual confirmation and plays a subtle sound when text is successfully copied.
// @author       Xiv
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @updateURL    https://myouisaur.github.io/Universal/copy-notif-toast.user.js
// @downloadURL  https://myouisaur.github.io/Universal/copy-notif-toast.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================================
    // 1. ARCHITECTURE & CONFIGURATION
    // ============================================================================

    if (window.__uesCopyToastRunning) return;
    window.__uesCopyToastRunning = true;

    const CONFIG = {
        SIGNATURE: 'UES_COPY_SUCCESS_V7',
        THROTTLE_MS: 50,
        AUDIO_STYLES: [
            'Off', 'Classic Rise', 'Soft Pop', 'Digital Beep',
            'Subtle Ting', 'Woodblock', 'UI Click', 'Chime'
        ],
        POSITIONS: ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'bottom-center', 'top-center'],
        SUCCESS_MESSAGES: [
            'Copied to clipboard',
            'Text copied',
            'Copied!',
            'Got it!',
            'Saved to clipboard',
            'Grabbed that for you',
            'Locked and loaded',
            'Snippet copied'
        ]
    };

    const STATE = {
        audioCtx: null,
        lastTriggerTime: 0,
        hideTimeout: null,
        toastElem: null,
        toastText: null,
        settingsHost: null,
        audioStyleIndex: typeof GM_getValue === 'function' ? GM_getValue('ues_audio_style', 1) : 1,
        volume: typeof GM_getValue === 'function' ? GM_getValue('ues_volume_float', 0.5) : 0.5,
        duration: typeof GM_getValue === 'function' ? GM_getValue('ues_duration_float', 2.0) : 2.0,
        positionIndex: typeof GM_getValue === 'function' ? GM_getValue('ues_position_index', 0) : 0
    };

    const isTopWindow = window === window.top;

    // DOM Utility
    function el(tag, props, ...children) {
        const element = document.createElement(tag);
        for (const [k, v] of Object.entries(props || {})) {
            if (k === 'className') element.className = v;
            else if (k.startsWith('on') && typeof v === 'function') element.addEventListener(k.substring(2).toLowerCase(), v);
            else element.setAttribute(k, v);
        }
        children.forEach(child => {
            if (typeof child === 'string') element.appendChild(document.createTextNode(child));
            else if (child instanceof Node) element.appendChild(child);
        });
        return element;
    }

    // CSP-Safe Style Injector
    function injectStyles(shadow, cssText) {
        try {
            if (shadow.adoptedStyleSheets && typeof CSSStyleSheet !== 'undefined') {
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(cssText);
                shadow.adoptedStyleSheets = [sheet];
            } else {
                shadow.appendChild(el('style', {}, cssText));
            }
        } catch (e) {
            shadow.appendChild(el('style', {}, cssText)); // Absolute fallback
        }
    }

    // Shared Liquid Glass CSS Logic & Typography
    const SHARED_GLASS_CSS = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        :host {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .glass-panel {
            position: relative;
            background: rgba(255, 255, 255, 0.13);
            backdrop-filter: blur(28px) saturate(200%) brightness(1.08);
            -webkit-backdrop-filter: blur(28px) saturate(200%) brightness(1.08);
            border: none; outline: none;
            box-shadow:
                inset 0  1.5px 0   rgba(255,255,255,0.75),
                inset 0 -1.5px 0   rgba(255,255,255,0.06),
                inset  1px 0   0   rgba(255,255,255,0.30),
                inset -1px 0   0   rgba(255,255,255,0.10),
                0 0 0 0.5px        rgba(255,255,255,0.18),
                0 8px 32px         rgba(0,0,0,0.30),
                0 2px  8px         rgba(0,0,0,0.18);
        }
        .glass-panel::before {
            content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
            background: linear-gradient(155deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.35) 25%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0.22) 100%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; z-index: 5;
        }
        .glass-panel::after {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 58%;
            background: radial-gradient(ellipse 75% 70% at 50% -8%, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.22) 40%, rgba(255,255,255,0.06) 70%, transparent 90%);
            border-radius: inherit; border-bottom-left-radius: 0; border-bottom-right-radius: 0; pointer-events: none; z-index: 5;
        }
        .glass-fx {
            position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 1; overflow: hidden;
            background:
                radial-gradient(ellipse 60% 50% at 38% 40%, rgba(255,255,255,0.08) 0%, transparent 65%),
                radial-gradient(ellipse 100% 100% at 50% 50%, transparent 62%, rgba(80,200,255,0.09) 74%, rgba(255,80,100,0.07) 84%, transparent 92%),
                radial-gradient(ellipse 80% 100% at 50% 115%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.08) 45%, transparent 70%);
        }

        .glass-text {
            color: rgba(255, 255, 255, 0.96);
            text-shadow:
                0 0  8px rgba(0,0,0,0.65),
                0 1px 3px rgba(0,0,0,0.55),
                0 2px 14px rgba(0,0,0,0.45);
        }

        /* Inner form controls */
        .glass-control {
            position: relative;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            box-shadow:
                inset 0  1.5px 0  rgba(255,255,255,0.35),
                inset 0 -1.5px 0  rgba(255,255,255,0.05),
                0 0 0 0.5px       rgba(255,255,255,0.2),
                0 4px 12px        rgba(0,0,0,0.15);
            overflow: hidden;
            transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
        }
        .glass-control:focus-within, .glass-control:focus {
            box-shadow: 0 0 0 2px rgba(255,255,255,0.6), inset 0 1.5px 0 rgba(255,255,255,0.35), 0 4px 12px rgba(0,0,0,0.15);
        }
        .glass-control::after {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%;
            background: linear-gradient(to bottom, rgba(255,255,255,0.12), transparent);
            pointer-events: none; z-index: 1;
        }
        .glass-control-content { position: relative; z-index: 2; width: 100%; outline: none; }
    `;

    // ============================================================================
    // 2. IFRAME RELAY
    // ============================================================================

    if (!isTopWindow) {
        let lastIframePost = 0;
        window.addEventListener('copy', () => {
            const now = Date.now();
            if (now - lastIframePost < CONFIG.THROTTLE_MS) return;
            lastIframePost = now;
            try { window.top.postMessage({ uesSignature: CONFIG.SIGNATURE, timestamp: now }, '*'); } catch (e) {}
        }, { capture: true, passive: true });
        return;
    }

    // ============================================================================
    // 3. AUDIO GENERATOR
    // ============================================================================

    function playAudioCue() {
        if (STATE.audioStyleIndex === 0) return;
        try {
            if (!STATE.audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                STATE.audioCtx = new AudioContext();
            }
            if (STATE.audioCtx.state === 'suspended') STATE.audioCtx.resume().catch(() => {});

            const osc = STATE.audioCtx.createOscillator();
            const gainNode = STATE.audioCtx.createGain();
            const now = STATE.audioCtx.currentTime;
            const vol = STATE.volume;
            let stopTime = now;

            switch (STATE.audioStyleIndex) {
                case 1: osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1); gainNode.gain.setValueAtTime(vol, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2); osc.start(now); stopTime = now + 0.1; break;
                case 2: osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.05); gainNode.gain.setValueAtTime(vol, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1); osc.start(now); stopTime = now + 0.05; break;
                case 3: osc.type = 'square'; osc.frequency.setValueAtTime(440, now); gainNode.gain.setValueAtTime(vol * 0.4, now); gainNode.gain.setValueAtTime(0.001, now + 0.08); osc.start(now); stopTime = now + 0.08; break;
                case 4: osc.type = 'sine'; osc.frequency.setValueAtTime(1500, now); osc.frequency.exponentialRampToValueAtTime(2500, now + 0.05); gainNode.gain.setValueAtTime(vol * 0.8, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15); osc.start(now); stopTime = now + 0.15; break;
                case 5: osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.03); gainNode.gain.setValueAtTime(vol, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05); osc.start(now); stopTime = now + 0.05; break;
                case 6: osc.type = 'square'; osc.frequency.setValueAtTime(1000, now); gainNode.gain.setValueAtTime(vol * 0.3, now); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.02); osc.start(now); stopTime = now + 0.02; break;
                case 7: osc.type = 'sine'; osc.frequency.setValueAtTime(900, now); osc.frequency.setValueAtTime(1200, now + 0.1); gainNode.gain.setValueAtTime(vol, now); gainNode.gain.setValueAtTime(vol * 0.5, now + 0.1); gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3); osc.start(now); stopTime = now + 0.3; break;
            }

            osc.stop(stopTime);
            osc.connect(gainNode);
            gainNode.connect(STATE.audioCtx.destination);

            // Memory Management: Disconnect nodes after they finish playing
            osc.onended = () => {
                osc.disconnect();
                gainNode.disconnect();
            };
        } catch (e) { }
    }

    // ============================================================================
    // 4. TOAST UI CREATION
    // ============================================================================

    function createToast() {
        if (STATE.toastElem) return;

        const host = document.createElement('div');
        host.id = 'ues-toast-host';
        host.style.cssText = 'position: fixed; z-index: 2147483646; top: 0; left: 0; width: 0; height: 0; pointer-events: none;';
        const shadow = host.attachShadow({ mode: 'closed' });

        const cssText = `
            :host { --offset: clamp(1rem, 3vw, 2rem); }
            ${SHARED_GLASS_CSS}
            .toast {
                position: fixed; padding: 14px 24px; border-radius: 200px;
                font-size: clamp(15px, 1.5vw, 17px); font-weight: 600; letter-spacing: -0.35px;
                opacity: 0; pointer-events: none; margin: 0;
                will-change: transform, opacity;
                transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .toast-inner { position: relative; z-index: 6; display: flex; align-items: center; gap: 11px; }

            /* Default "Hiding" State (Shrink and Sink choreography) */
            .pos-bottom-right { bottom: var(--offset); right: var(--offset); transform: translateY(1.5rem) scale(0.92); }
            .pos-bottom-left { bottom: var(--offset); left: var(--offset); transform: translateY(1.5rem) scale(0.92); }
            .pos-top-right { top: var(--offset); right: var(--offset); transform: translateY(-1.5rem) scale(0.92); }
            .pos-top-left { top: var(--offset); left: var(--offset); transform: translateY(-1.5rem) scale(0.92); }
            .pos-bottom-center { bottom: var(--offset); left: 50%; transform: translate(-50%, 1.5rem) scale(0.92); }
            .pos-top-center { top: var(--offset); left: 50%; transform: translate(-50%, -1.5rem) scale(0.92); }

            /* Active "Show" State */
            .toast.show { opacity: 1; }
            .toast.show.pos-bottom-right, .toast.show.pos-bottom-left { transform: translateY(0) scale(1); }
            .toast.show.pos-top-right, .toast.show.pos-top-left { transform: translateY(0) scale(1); }
            .toast.show.pos-bottom-center { transform: translate(-50%, 0) scale(1); }
            .toast.show.pos-top-center { transform: translate(-50%, 0) scale(1); }

            .icon { flex-shrink: 0; width: 1.1em; height: 1.1em; filter: drop-shadow(0 0 4px rgba(0,0,0,0.6)) drop-shadow(0 1px 3px rgba(0,0,0,0.5)); }
            .text { white-space: nowrap; line-height: 1; }
        `;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'icon'); svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2.5'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M20 6L9 17l-5-5'); svg.appendChild(path);

        STATE.toastText = el('span', { className: 'text glass-text' });
        const content = el('div', { className: 'toast-inner glass-text' }, svg, STATE.toastText);
        const fx = el('div', { className: 'glass-fx' });

        STATE.toastElem = el('div', { className: 'toast glass-panel', role: 'alert', 'aria-live': 'polite' }, fx, content);
        updateToastPositionClass();

        injectStyles(shadow, cssText);
        shadow.appendChild(STATE.toastElem);
        if (document.documentElement) document.documentElement.appendChild(host);
    }

    function updateToastPositionClass() {
        if (!STATE.toastElem) return;
        STATE.toastElem.className = STATE.toastElem.className.replace(/\bpos-[a-z-]+\b/g, '').trim();
        STATE.toastElem.classList.add(`pos-${CONFIG.POSITIONS[STATE.positionIndex]}`);
    }

    function triggerToastFlow(customMessage = null) {
        const now = Date.now();
        if (now - STATE.lastTriggerTime < CONFIG.THROTTLE_MS && !customMessage) return;
        STATE.lastTriggerTime = now;

        if (!STATE.toastElem) createToast();
        playAudioCue();

        if (customMessage) {
            STATE.toastText.textContent = customMessage;
        } else {
            // Shuffle and pick a random message like lottery balls
            const randomIndex = Math.floor(Math.random() * CONFIG.SUCCESS_MESSAGES.length);
            STATE.toastText.textContent = CONFIG.SUCCESS_MESSAGES[randomIndex];
        }

        STATE.toastElem.classList.remove('show');
        requestAnimationFrame(() => requestAnimationFrame(() => STATE.toastElem.classList.add('show')));

        if (STATE.hideTimeout) clearTimeout(STATE.hideTimeout);
        STATE.hideTimeout = setTimeout(() => STATE.toastElem.classList.remove('show'), STATE.duration * 1000);
    }

    // ============================================================================
    // 5. SETTINGS MODAL UI
    // ============================================================================

    function openSettingsModal() {
        if (STATE.settingsHost) return;

        STATE.settingsHost = el('div', { id: 'ues-settings-host', style: 'position: fixed; z-index: 2147483647; top: 0; left: 0; width: 100vw; height: 100vh;' });
        const shadow = STATE.settingsHost.attachShadow({ mode: 'closed' });

        // Backup state for Unsaved Changes detection
        const originalState = {
            audio: STATE.audioStyleIndex,
            vol: STATE.volume,
            pos: STATE.positionIndex,
            dur: STATE.duration
        };
        const isDirty = () => STATE.audioStyleIndex !== originalState.audio || STATE.volume !== originalState.vol || STATE.positionIndex !== originalState.pos || STATE.duration !== originalState.dur;

        const cssText = `
            ${SHARED_GLASS_CSS}
            .overlay {
                position: absolute; inset: 0;
                background: rgba(0, 0, 0, 0.4);
                display: flex; align-items: center; justify-content: center;
                animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .modal {
                border-radius: 32px; width: clamp(300px, 85vw, 420px);
                display: flex; flex-direction: column; overflow: visible;
                transform: translateY(0); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .modal-inner { position: relative; z-index: 6; padding: 36px 32px; display: flex; flex-direction: column; gap: 24px; }

            .header { display: flex; flex-direction: column; gap: 6px; }
            h2 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
            p.sub { margin: 0; font-size: 15px; font-weight: 400; opacity: 0.85; }

            .field-group { display: flex; flex-direction: column; gap: 20px; }
            .field { display: flex; flex-direction: column; gap: 8px; }
            .field-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }

            label { font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }

            /* Odometer Animated Values */
            .val-display {
                font-size: 14px; font-variant-numeric: tabular-nums; opacity: 0.9; font-weight: 600;
                display: flex; justify-content: flex-end; width: 45px; overflow: hidden; height: 1.2em; align-items: flex-end;
            }
            .val-roll-in { animation: rollIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            @keyframes rollIn {
                0% { transform: translateY(60%) scale(0.8); opacity: 0; }
                100% { transform: translateY(0) scale(1); opacity: 1; }
            }

            /* Confirm Overlay (Unsaved Changes) */
            .confirm-overlay {
                position: absolute; inset: 0; z-index: 1000; overflow: hidden;
                border-radius: inherit; display: flex; flex-direction: column; align-items: center; justify-content: center;
                background: rgba(10, 10, 10, 0.75); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                animation: fadeIn 0.2s ease forwards;
            }
            .confirm-content { position: relative; z-index: 6; text-align: center; padding: 32px; width: 100%; box-sizing: border-box; }
            .confirm-content h3 { margin: 0 0 8px 0; font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }
            .confirm-actions { display: flex; gap: 12px; margin-top: 24px; justify-content: center; }

            button.confirm-btn {
                padding: 14px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer;
                border: none; outline: none; border-radius: 200px !important; flex: 1;
                display: flex; justify-content: center; align-items: center;
            }
            button.confirm-btn:hover { background: rgba(255, 255, 255, 0.15); }
            button.confirm-btn:active { transform: scale(0.97); }

            /* Custom Glass Dropdown Trigger */
            .custom-select { position: relative; width: 100%; user-select: none; outline: none; }
            .sel-trigger {
                padding: 14px 18px; font-size: 15px; font-weight: 500; cursor: pointer;
                display: flex; justify-content: space-between; align-items: center; outline: none;
            }
            .sel-trigger:hover { background: rgba(255, 255, 255, 0.12); }
            .sel-trigger::after {
                content: ''; width: 20px; height: 20px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
                background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
                background-repeat: no-repeat; background-position: center; transition: transform 0.2s;
            }
            .custom-select.open .glass-control { background: rgba(0, 0, 0, 0.1); box-shadow: inset 0 2px 8px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(255,255,255,0.2); }
            .custom-select.open .sel-trigger::after { transform: rotate(180deg); }

            /* Portal-rendered Dropdown Options */
            .sel-options {
                position: fixed; border-radius: 18px; z-index: 2147483647; opacity: 0; pointer-events: none;
                transform: translateY(-10px); transition: opacity 0.2s, transform 0.2s; outline: none;
            }
            .sel-options.open { opacity: 1; pointer-events: auto; transform: translateY(0); }

            .sel-opts-list {
                position: relative; z-index: 6; padding: 8px; display: flex; flex-direction: column; gap: 2px;
                max-height: 200px; overflow-y: auto; overflow-x: hidden; border-radius: 18px;
            }
            .sel-opts-list::-webkit-scrollbar { width: 12px; }
            .sel-opts-list::-webkit-scrollbar-track { background: transparent; margin: 12px 0; }
            .sel-opts-list::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.25); border-radius: 6px;
                border: 3px solid transparent; background-clip: padding-box;
            }

            .sel-option { padding: 12px 16px; border-radius: 12px; cursor: pointer; font-size: 15px; font-weight: 500; transition: background 0.15s; outline: none; }
            .sel-option:hover, .sel-option:focus { background: rgba(255,255,255,0.15); }
            .sel-option.selected { background: rgba(255,255,255,0.18); font-weight: 600; box-shadow: inset 0 1px 0 rgba(255,255,255,0.1); }

            /* Custom JS-Driven Slider */
            .glass-slider-track {
                position: relative; width: 100%; height: 8px; border-radius: 4px; outline: none;
                background: rgba(0,0,0,0.35); cursor: pointer;
                box-shadow: inset 0 2px 5px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.15);
                margin: 12px 0; transition: box-shadow 0.2s;
            }
            .glass-slider-track:focus { box-shadow: 0 0 0 2px rgba(255,255,255,0.6), inset 0 2px 5px rgba(0,0,0,0.6); }
            .glass-slider-fill {
                position: absolute; top: 0; left: 0; height: 100%; border-radius: 4px;
                background: rgba(255,255,255,0.25); pointer-events: none;
            }
            .glass-slider-thumb {
                position: absolute; top: 50%; width: 24px; height: 24px; border-radius: 50%;
                margin-top: -12px; margin-left: -12px;
                background: radial-gradient(circle at 40% 30%, #ffffff 0%, rgba(255,255,255,0.8) 100%);
                box-shadow: inset 0 -3px 5px rgba(0,0,0,0.3), 0 3px 8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.4);
                pointer-events: none;
            }

            /* Clean Glass Save Button */
            button.save-btn {
                margin-top: 6px; padding: 16px; font-size: 16px; font-weight: 600; font-family: inherit; cursor: pointer;
                display: flex; justify-content: center; align-items: center; width: 100%; border: none; outline: none;
                border-radius: 200px !important;
            }
            button.save-btn:hover { background: rgba(255,255,255,0.15); }
            button.save-btn:active { transform: scale(0.97); }

            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `;

        // Odometer Per-Digit Animation Engine
        function updateAnimatedText(container, newText) {
            const oldText = container.dataset.val || '';
            if (oldText === newText) return;
            container.dataset.val = newText;

            container.textContent = '';
            for (let i = 0; i < newText.length; i++) {
                const char = newText[i];
                const span = el('span', { style: 'display: inline-block;' }, char);
                if (oldText.length !== newText.length || oldText[i] !== char) {
                    span.className = 'val-roll-in glass-text';
                } else {
                    span.className = 'glass-text';
                }
                container.appendChild(span);
            }
        }

        // Accessible Slider Component
        function createCustomSlider(initialValue, min, max, step, formatter, onChangeCallback, onDragEndCallback) {
            const track = el('div', { className: 'glass-slider-track', tabindex: '0', role: 'slider', 'aria-valuemin': min, 'aria-valuemax': max });
            const fill = el('div', { className: 'glass-slider-fill' });
            const thumb = el('div', { className: 'glass-slider-thumb' });
            track.appendChild(fill); track.appendChild(thumb);

            let isDragging = false;
            let currentValue = initialValue;

            const valToPct = (val) => (val - min) / (max - min);
            const pctToVal = (pct) => min + (pct * (max - min));

            const updateUI = (pct, animate = false) => {
                if (animate) {
                    fill.style.transition = 'width 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    thumb.style.transition = 'left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
                } else {
                    fill.style.transition = 'none';
                    thumb.style.transition = 'none';
                }
                fill.style.width = `${pct * 100}%`;
                thumb.style.left = `${pct * 100}%`;
            };

            const commitValue = (rawVal, animate = false, isFinal = false) => {
                // Snap math
                let snapped = Math.round(rawVal / step) * step;
                snapped = Math.max(min, Math.min(max, snapped));
                currentValue = snapped;

                track.setAttribute('aria-valuenow', snapped);
                track.setAttribute('aria-valuetext', formatter(snapped));

                updateUI(valToPct(snapped), animate);

                if (isFinal) onDragEndCallback(snapped);
                else onChangeCallback(snapped);
            };

            // Init state
            commitValue(currentValue, false, false);

            const handleMove = (e) => {
                if (!isDragging) return;
                const rect = track.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                commitValue(pctToVal(pct), false, false);
            };

            const handleUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                const rect = track.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                commitValue(pctToVal(pct), false, true);
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mouseup', handleUp);
            };

            track.addEventListener('mousedown', (e) => {
                isDragging = true;
                const rect = track.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                commitValue(pctToVal(pct), true, false); // True forces smooth slide-to-click transition
                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleUp);
            });

            // Keyboard Accessibility
            track.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault(); commitValue(currentValue + step, true, true);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault(); commitValue(currentValue - step, true, true);
                } else if (e.key === 'Home') {
                    e.preventDefault(); commitValue(min, true, true);
                } else if (e.key === 'End') {
                    e.preventDefault(); commitValue(max, true, true);
                }
            });

            return track;
        }

        function wrapGlassControl(element, extraClasses = '') {
            return el('div', { className: `glass-control ${extraClasses}` },
                el('div', { className: 'glass-control-content' }, element)
            );
        }

        // Accessible Portal Select Factory
        function createCustomSelect(optionsArray, selectedVal, onChangeCallback) {
            let currentVal = selectedVal;
            const currentOpt = optionsArray.find(o => o.value === currentVal) || optionsArray[0];
            const triggerText = el('span', { className: 'glass-text' }, currentOpt.label);
            const trigger = el('div', { className: 'sel-trigger', tabindex: '0', role: 'combobox', 'aria-haspopup': 'listbox' }, triggerText);

            const optsContainer = el('div', { className: 'sel-options glass-panel' });
            const fx = el('div', { className: 'glass-fx' });
            const optsList = el('div', { className: 'sel-opts-list glass-text', role: 'listbox' });

            optsContainer.appendChild(fx);
            optsContainer.appendChild(optsList);

            const glassTrigger = wrapGlassControl(trigger);
            const container = el('div', { className: 'custom-select' }, glassTrigger);

            const closeMenu = () => {
                container.classList.remove('open');
                optsContainer.classList.remove('open');
                trigger.setAttribute('aria-expanded', 'false');
                trigger.focus();
            };

            const renderOptions = () => {
                optsList.textContent = '';
                optionsArray.forEach((opt, index) => {
                    const isSelected = opt.value === currentVal;
                    const optEl = el('div', {
                        className: `sel-option ${isSelected ? 'selected' : ''}`,
                        tabindex: '-1',
                        role: 'option',
                        'aria-selected': isSelected
                    }, opt.label);

                    optEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        currentVal = opt.value; triggerText.textContent = opt.label;
                        closeMenu(); renderOptions(); onChangeCallback(opt.value);
                    });

                    // Keyboard Navigation within list
                    optEl.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            currentVal = opt.value; triggerText.textContent = opt.label;
                            closeMenu(); renderOptions(); onChangeCallback(opt.value);
                        } else if (e.key === 'ArrowDown' && index < optionsArray.length - 1) {
                            e.preventDefault(); optsList.children[index + 1].focus();
                        } else if (e.key === 'ArrowUp' && index > 0) {
                            e.preventDefault(); optsList.children[index - 1].focus();
                        } else if (e.key === 'Escape') {
                            e.preventDefault(); closeMenu();
                        }
                    });

                    optsList.appendChild(optEl);
                });
            };
            renderOptions();

            const openMenu = () => {
                const isOpen = container.classList.contains('open');
                shadow.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
                shadow.querySelectorAll('.sel-options.open').forEach(el => el.classList.remove('open'));

                if (!isOpen) {
                    container.classList.add('open');
                    trigger.setAttribute('aria-expanded', 'true');

                    const rect = glassTrigger.getBoundingClientRect();
                    optsContainer.style.top = `${rect.bottom + 10}px`;
                    optsContainer.style.left = `${rect.left}px`;
                    optsContainer.style.width = `${rect.width}px`;

                    if (!optsContainer.parentNode) shadow.appendChild(optsContainer);

                    void optsContainer.offsetWidth;
                    optsContainer.classList.add('open');

                    // Focus selected item
                    const selectedItem = optsList.querySelector('.selected');
                    if (selectedItem) selectedItem.focus();
                }
            };

            glassTrigger.addEventListener('click', (e) => { e.stopPropagation(); openMenu(); });
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault(); openMenu();
                }
            });

            return container;
        }

        // ============================================================================
        // MODAL STATE & ACTIONS
        // ============================================================================

        const closeMod = () => {
            if (STATE.settingsHost && STATE.settingsHost.parentNode) {
                STATE.settingsHost.parentNode.removeChild(STATE.settingsHost);
            }
            STATE.settingsHost = null;
            document.removeEventListener('keydown', handleGlobalKeydown);
        };

        const doSave = () => {
            GM_setValue('ues_audio_style', STATE.audioStyleIndex);
            GM_setValue('ues_volume_float', STATE.volume);
            GM_setValue('ues_duration_float', STATE.duration);
            GM_setValue('ues_position_index', STATE.positionIndex);
            playAudioCue();
            closeMod();
        };

        const doDiscard = () => {
            STATE.audioStyleIndex = originalState.audio;
            STATE.volume = originalState.vol;
            STATE.duration = originalState.dur;
            STATE.positionIndex = originalState.pos;
            updateToastPositionClass();
            closeMod();
        };

        const showConfirmDialog = () => {
            if (shadow.querySelector('.confirm-overlay')) return;
            const confirmBox = el('div', { className: 'confirm-overlay glass-panel', role: 'dialog', 'aria-modal': 'true' },
                el('div', { className: 'glass-fx' }),
                el('div', { className: 'confirm-content' },
                    el('h3', { className: 'glass-text' }, 'Unsaved Changes'),
                    el('p', { className: 'glass-text sub' }, 'You have modified your settings. Would you like to save them?'),
                    el('div', { className: 'confirm-actions' },
                        el('button', { className: 'confirm-btn glass-control', tabindex: '0' }, el('div', { className: 'glass-control-content glass-text' }, 'Discard')),
                        el('button', { className: 'confirm-btn glass-control', tabindex: '0' }, el('div', { className: 'glass-control-content glass-text' }, 'Save'))
                    )
                )
            );

            const btns = confirmBox.querySelectorAll('.confirm-btn');
            btns[0].addEventListener('click', doDiscard);
            btns[1].addEventListener('click', doSave);

            modal.appendChild(confirmBox);
            btns[1].focus(); // Focus primary action
        };

        const handleGlobalKeydown = (e) => {
            if (e.key === 'Escape') {
                const openDrops = shadow.querySelectorAll('.custom-select.open');
                if (openDrops.length > 0) {
                    openDrops.forEach(el => el.classList.remove('open'));
                    shadow.querySelectorAll('.sel-options.open').forEach(el => el.classList.remove('open'));
                    return;
                }
                if (isDirty()) showConfirmDialog();
                else doDiscard();
            }
        };

        const audioOpts = CONFIG.AUDIO_STYLES.map((label, value) => ({ label, value }));
        const posOpts = CONFIG.POSITIONS.map((pos, value) => ({ label: pos.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()), value }));

        const selAudio = createCustomSelect(audioOpts, STATE.audioStyleIndex, (val) => {
            STATE.audioStyleIndex = val; triggerToastFlow('Audio preview');
        });

        const selPos = createCustomSelect(posOpts, STATE.positionIndex, (val) => {
            STATE.positionIndex = val; updateToastPositionClass(); triggerToastFlow('Position preview');
        });

        // Volume Slider
        const volDisplay = el('span', { className: 'val-display' });
        const volSlider = createCustomSlider(STATE.volume, 0, 1, 0.05,
            (val) => `${Math.round(val * 100)}%`,
            (val) => updateAnimatedText(volDisplay, `${Math.round(val * 100)}%`),
            (val) => { STATE.volume = val; triggerToastFlow(`Volume preview`); }
        );

        // Duration Slider
        const durDisplay = el('span', { className: 'val-display' });
        const durSlider = createCustomSlider(STATE.duration, 1.0, 5.0, 0.5,
            (val) => `${val.toFixed(1)}s`,
            (val) => updateAnimatedText(durDisplay, `${val.toFixed(1)}s`),
            (val) => { STATE.duration = val; triggerToastFlow(`Duration preview`); }
        );

        const btnClose = el('button', { className: 'save-btn glass-control', tabindex: '0' },
            el('div', { className: 'glass-control-content glass-text' }, 'Save')
        );

        const content = el('div', { className: 'modal-inner' },
            el('div', { className: 'header glass-text' },
                el('h2', {}, 'Toast Settings'),
                el('p', { className: 'sub' }, 'Configure your copy notifications.')
            ),
            el('div', { className: 'field-group' },
                el('div', { className: 'field' }, el('label', { className: 'glass-text' }, 'Audio Style'), selAudio),
                el('div', { className: 'field' }, el('div', { className: 'field-row' }, el('label', { className: 'glass-text' }, 'Volume'), volDisplay), volSlider),
                el('div', { className: 'field' }, el('div', { className: 'field-row' }, el('label', { className: 'glass-text' }, 'Display Duration'), durDisplay), durSlider),
                el('div', { className: 'field' }, el('label', { className: 'glass-text' }, 'Screen Position'), selPos)
            ),
            btnClose
        );

        const fx = el('div', { className: 'glass-fx' });
        const modal = el('div', { className: 'modal glass-panel' }, fx, content);
        const overlay = el('div', { className: 'overlay' }, modal);

        injectStyles(shadow, cssText);
        shadow.appendChild(overlay);

        btnClose.addEventListener('click', doSave);

        // Modal no longer closes by clicking the overlay, to prevent accidental dismissals.
        // Clicking the overlay only closes dropdowns.
        overlay.addEventListener('click', (e) => {
            shadow.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
            shadow.querySelectorAll('.sel-options.open').forEach(el => el.classList.remove('open'));
        });

        document.addEventListener('keydown', handleGlobalKeydown);

        if (document.documentElement) document.documentElement.appendChild(STATE.settingsHost);
    }

    if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('⚙️ Open Settings', openSettingsModal);

    // ============================================================================
    // 6. CORE EVENT LISTENERS
    // ============================================================================

    window.addEventListener('copy', () => triggerToastFlow(), { capture: true, passive: true });
    window.addEventListener('message', (e) => {
        if (e.data && typeof e.data === 'object' && !Array.isArray(e.data)) {
            if (e.data.uesSignature === CONFIG.SIGNATURE) triggerToastFlow();
        }
    });

})();
