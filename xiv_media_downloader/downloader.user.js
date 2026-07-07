// ==UserScript==
// @name         [Universal] Xiv Media Downloader
// @namespace    https://github.com/myouisaur/Universal
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FF4081'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 11h3l-4 4-4-4h3V8h2v5z'/%3E%3C/svg%3E
// @version      21.1
// @description  Organizes, tracks, and saves categorized media files through a centralized overlay.
// @author       Xiv
// @match        *://*/*
// @match        file:///*
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        window.close
// @connect      raw.githubusercontent.com
// @connect      xiv-media-proxy.myouisaur.workers.dev
// @connect      *
// @noframes
// @run-at       document-end
// @updateURL    https://myouisaur.github.io/Universal/xiv_media_downloader/downloader.user.js
// @downloadURL  https://myouisaur.github.io/Universal/xiv_media_downloader/downloader.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ── Debug Mode ────────────────────────────────────────────────────────────
    // Set to true to enable verbose console logging. Keep false in production.
    const DEBUG = false;

    // =========================================================
    // CONFIGURATION
    // =========================================================
    const CONFIG = {
        // Naming & Execution
        NAMING_FORMAT: '{group}-{member}-{random}.{ext}',
        CUSTOM_NAMING_FORMAT: '{custom}-{random}.{ext}',
        RANDOM_STRING_LENGTH: 8,
        PROMPT_ON_IDOL_SAVE: false,

        // Hardcoded Cloud Configs
        WORKER_URL: 'https://xiv-media-proxy.myouisaur.workers.dev',
        GITHUB_OWNER: 'myouisaur',
        GITHUB_REPO: 'Universal',
        GITHUB_DB_PATH: 'xiv_media_downloader/json/db.json',
        GITHUB_HISTORY_PATH: 'xiv_media_downloader/json/history.json',
        GITHUB_BRANCH: 'main',

        // UI & Storage Core
        UI_PREFIX: 'xiv-media-dl',
        // Centralized GM storage key prefix — every persisted key is built as
        // `${CONFIG.STORAGE_PREFIX}_suffix`. Previously scattered as inline
        // string literals throughout the file (a maintainability gap fixed
        // during the v18 rebrand, not just a find-replace of the old prefix).
        STORAGE_PREFIX: 'xiv_media_dl',
        STORAGE_KEY: 'xiv_media_dl_history',
        HISTORY_MAX_DAYS: 30,
        FAB_Z_INDEX: 999990,
        OVERLAY_Z_INDEX: 999999,
        SAVE_DEBOUNCE_MS: 1000,
        CLOUD_HISTORY_DEBOUNCE_MS: 300,
        CLOUD_HISTORY_THROTTLE_MS: 30000,
        CLOUD_MENU_POLL_MS: 10000,
        VIRTUAL_ITEM_HEIGHT: 50,
        MAX_ACTIVE_TOASTS: 3,
        AUTO_CLOSE_COUNTDOWN_MS: 3000,

        // Carousel
        CAROUSEL_BREAKPOINT_PX: 1450,         // px below which carousel activates

        // Database
        DB_URL: 'https://raw.githubusercontent.com/myouisaur/Universal/refs/heads/main/xiv_media_downloader/json/db.json',
        DB_CACHE_KEY: 'xiv_media_dl_db_cache',
        DB_CACHE_TTL_MS: 12 * 60 * 60 * 1000
    };

    // =========================================================
    // ICONS DICTIONARY
    // =========================================================
    const ICONS = {
        fab: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
        back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
        sync: "M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z",
        edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
        config: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
        close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
        trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
        checklist: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
        history: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
        recent: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
        database: "M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm4-3h2v2H4v-2z",
        inbox: "M19 3H4.99c-1.11 0-1.98.9-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z",
        flame: "M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"
    };

    // =========================================================
    // UTILITIES
    // =========================================================
    const Logger = {
        // Capped ring buffer of recent warnings/errors — feeds the
        // diagnostics panel. Capped size per the "cap size and prune old
        // entries" rule for lightweight history tracking.
        _recentIssues: [],
        _MAX_ISSUES: 20,

        _recordIssue(level, msg) {
            this._recentIssues.unshift({ level, msg, timestamp: Date.now() });
            if (this._recentIssues.length > this._MAX_ISSUES) this._recentIssues.length = this._MAX_ISSUES;
        },

        info(msg)  { if (DEBUG) console.log(`[Xiv Media DL] ${msg}`); },
        warn(msg) { console.warn(`[Xiv Media DL] ${msg}`); this._recordIssue('warn', msg); },
        error(msg, err) { console.error(`[Xiv Media DL] ${msg}`, err); this._recordIssue('error', msg); }
    };

    const Utils = {
        debounce(fn, delay) {
            let timeoutId;
            return function (...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => fn.apply(this, args), delay);
            };
        },
        formatBytes(bytes, decimals = 1) {
            if (!+bytes) return '0 B';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
        },
        timeAgo(dateMs) {
            const seconds = Math.floor((new Date() - dateMs) / 1000);
            if (seconds < 60) return "just now";
            let interval = seconds / 31536000;
            if (interval > 1) return Math.floor(interval) + " years ago";
            interval = seconds / 2592000;
            if (interval > 1) return Math.floor(interval) + " months ago";
            interval = seconds / 604800;
            if (interval > 1) return Math.floor(interval) + " weeks ago";
            interval = seconds / 86400;
            if (interval > 1) return Math.floor(interval) + " days ago";
            interval = seconds / 3600;
            if (interval > 1) return Math.floor(interval) + " hours ago";
            interval = seconds / 60;
            if (interval > 1) return Math.floor(interval) + " minutes ago";
            return Math.floor(seconds) + " seconds ago";
        },
        // Display-only: converts "hello world" → "Hello World"
        // Raw preset strings are never modified — only the rendered label uses this.
        toProperCase(str) {
            return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        },

        /**
         * Wraps a text input with a self-contained "clear" (×) button that
         * appears once the input has a value, so users don't have to
         * backspace repeatedly. Returns the wrapper — callers append the
         * WRAPPER to the DOM in place of the raw input (the input itself is
         * moved inside it), so this must be called before the input is
         * attached anywhere, or on an already-detached input.
         * @param {HTMLInputElement} inputEl
         * @returns {HTMLDivElement} wrapper containing inputEl + clear button
         */
        attachClearButton(inputEl) {
            const wrapper = document.createElement('div');
            wrapper.className = `${CONFIG.UI_PREFIX}-input-clear-wrapper`;
            wrapper.appendChild(inputEl);

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = `${CONFIG.UI_PREFIX}-input-clear-btn`;
            clearBtn.setAttribute('aria-label', 'Clear');
            clearBtn.tabIndex = -1;
            clearBtn.textContent = '×';
            wrapper.appendChild(clearBtn);

            const toggle = () => {
                clearBtn.classList.toggle(`${CONFIG.UI_PREFIX}-visible`, inputEl.value.length > 0);
            };

            // Prevent the input from blurring before the click registers
            clearBtn.addEventListener('mousedown', (e) => e.preventDefault());
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                inputEl.value = '';
                // Dispatched (not just cleared) so existing debounced search/filter
                // listeners on the input fire exactly as if the user had typed
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.focus();
                toggle();
            });
            inputEl.addEventListener('input', toggle);
            toggle();

            return wrapper;
        },

        /**
         * Makes a non-native interactive element (a styled <div> used as a
         * button) keyboard-accessible: tab-focusable, announced as a button
         * to assistive tech, and activatable via Enter/Space. Triggers the
         * element's own .click() rather than duplicating whatever onclick
         * logic is already attached to it.
         * @param {HTMLElement} el
         */
        makeFocusable(el) {
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    el.click();
                }
            });
        }
    };

    // =========================================================
    // CLOUD API MODULE
    // =========================================================
    const CloudAPI = {
        config: { url: '', token: '', owner: '', repo: '', branch: 'main' },
        rateLimitResetTime: 0,

        loadConfig() {
            this.config.url = CONFIG.WORKER_URL;
            this.config.owner = CONFIG.GITHUB_OWNER;
            this.config.repo = CONFIG.GITHUB_REPO;
            this.config.branch = CONFIG.GITHUB_BRANCH;
            this.config.token = GM_getValue(`${CONFIG.STORAGE_PREFIX}_github_token`, '');
        },

        isValid() {
            return !!(this.config.url && this.config.token && this.config.owner && this.config.repo);
        },

        isRateLimited() {
            return Date.now() < this.rateLimitResetTime;
        },

        handleRateLimit(status) {
            if (status === 403 || status === 429) {
                Logger.warn("GitHub API Rate Limit Hit. Pausing network sync for 1 hour to protect credentials.");
                this.rateLimitResetTime = Date.now() + (60 * 60 * 1000);
                if (UI.toastContainer) UI.showToast('Cloud API Rate Limit exceeded. Pausing sync.', 'error');
                return true;
            }
            return false;
        },

        getHeaders(targetPath) {
            return {
                'X-GitHub-Token': this.config.token,
                'X-GitHub-Owner': this.config.owner,
                'X-GitHub-Repo': this.config.repo,
                'X-GitHub-Path': targetPath,
                'X-GitHub-Branch': this.config.branch
            };
        },

        fetch(targetPath) {
            return new Promise((resolve, reject) => {
                if (this.isRateLimited()) return reject(new Error('API is currently rate limited.'));

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: this.config.url,
                    headers: this.getHeaders(targetPath),
                    responseType: 'json',
                    timeout: 15000,
                    onload: (res) => {
                        if (this.handleRateLimit(res.status)) return reject(new Error('Rate Limit Hit'));

                        if (res.status === 200) {
                            let data = res.response;
                            if (typeof data === 'string') {
                                try { data = JSON.parse(data); } catch (e) { return reject(new Error('Invalid JSON format from proxy.')); }
                            }
                            resolve(data);
                        } else if (res.status === 404) {
                            resolve(null);
                        } else {
                            reject(new Error(`Proxy fetch failed with status ${res.status}`));
                        }
                    },
                    onerror: (err) => reject(err),
                    ontimeout: () => reject(new Error('Cloud Proxy Request Timeout'))
                });
            });
        },

        put(targetPath, payloadData) {
            return new Promise((resolve, reject) => {
                if (this.isRateLimited()) return reject(new Error('API is currently rate limited.'));

                GM_xmlhttpRequest({
                    method: 'PUT',
                    url: this.config.url,
                    headers: {
                        ...this.getHeaders(targetPath),
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify(payloadData),
                    responseType: 'json',
                    timeout: 15000,
                    onload: (res) => {
                        if (this.handleRateLimit(res.status)) return reject(new Error('Rate Limit Hit'));

                        if (res.status === 200) {
                            resolve();
                        } else {
                            let msg = `HTTP ${res.status}`;
                            if (res.response && res.response.error) msg += `: ${res.response.error}`;
                            reject(new Error(msg));
                        }
                    },
                    onerror: (err) => reject(err),
                    ontimeout: () => reject(new Error('Cloud Proxy Upload Timeout'))
                });
            });
        }
    };

    // =========================================================
    // DATABASE MODULE
    // =========================================================
    const Database = {
        data: {},
        sortedGroups: [],
        isLoaded: false,
        isLoading: false,

        async init() {
            this.isLoading = true;
            if (UI.overlay) UI.updateListData(UI.searchInput ? UI.searchInput.value.toLowerCase().trim() : '');

            try {
                const cached = this.getCache();
                if (cached) {
                    this.processData(cached);
                    this.isLoaded = true;
                    this.isLoading = false;
                    this.fetchBackground();
                } else {
                    const freshData = await this.fetch();
                    this.processData(freshData);
                    this.isLoaded = true;
                    this.isLoading = false;
                }
            } catch (e) {
                Logger.error('Failed to initialize database', e);
                if (!this.data || Object.keys(this.data).length === 0) {
                    this.processData({});
                    this.isLoaded = true;
                    this.isLoading = false;
                }
            }
            if (UI.overlay) {
                UI.updateListData(UI.searchInput ? UI.searchInput.value.toLowerCase().trim() : '');
            }
        },

        getCache() {
            try {
                const cacheStr = GM_getValue(CONFIG.DB_CACHE_KEY, null);
                if (!cacheStr) return null;
                const cacheObj = JSON.parse(cacheStr);
                if (Date.now() - cacheObj.timestamp > CONFIG.DB_CACHE_TTL_MS) return null;
                return cacheObj.data;
            } catch (e) {
                return null;
            }
        },

        setCache(data) {
            try {
                GM_setValue(CONFIG.DB_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: data }));
            } catch (e) {
                Logger.warn('Failed to save DB cache');
            }
        },

        fetchBackground() {
            this.fetch()
                .then(data => {
                    this.setCache(data);
                    this.processData(data);
                })
                .catch(() => Logger.warn('Background database update failed.'));
        },

        fetch() {
            if (CloudAPI.isValid()) {
                return CloudAPI.fetch(CONFIG.GITHUB_DB_PATH).then(data => data || {});
            }

            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: CONFIG.DB_URL,
                    responseType: 'json',
                    timeout: 15000,
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300) {
                            let responseData = res.response;
                            if (typeof responseData === 'string') {
                                try { responseData = JSON.parse(responseData); } catch (e) { return reject(new Error('Invalid JSON format from URL')); }
                            }
                            this.setCache(responseData);
                            resolve(responseData);
                        } else {
                            reject(new Error(`HTTP ${res.status}`));
                        }
                    },
                    onerror: (err) => reject(err),
                    ontimeout: () => reject(new Error('Request Timeout'))
                });
            });
        },

        async saveCloud() {
            if (!CloudAPI.isValid()) throw new Error('Cloud credentials missing.');
            await CloudAPI.put(CONFIG.GITHUB_DB_PATH, this.data);
            this.setCache(this.data);
        },

        processData(data) {
            this.data = data || {};
            this.sortedGroups = Object.keys(this.data).sort((a, b) => a.localeCompare(b));
        },

        waitForLoad() {
            return new Promise(resolve => {
                if (this.isLoaded) return resolve();
                const interval = setInterval(() => {
                    if (this.isLoaded) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });
        },

        addGroup(groupName) {
            const normalized = groupName.trim();
            if (!normalized || this.data[normalized]) return false;
            this.data[normalized] = [];
            this.processData(this.data);
            return true;
        },

        deleteGroup(groupName) {
            if (!this.data[groupName]) return false;
            delete this.data[groupName];
            this.processData(this.data);
            return true;
        },

        renameGroup(oldName, newName) {
            const normalized = newName.trim();
            if (!normalized || this.data[normalized] || !this.data[oldName]) return false;
            this.data[normalized] = this.data[oldName];
            delete this.data[oldName];
            this.processData(this.data);
            return true;
        },

        addMember(groupName, memberName) {
            const normalized = memberName.trim();
            if (!this.data[groupName] || !normalized || this.data[groupName].includes(normalized)) return false;
            this.data[groupName].push(normalized);
            this.data[groupName].sort((a, b) => a.localeCompare(b));
            return true;
        },

        deleteMember(groupName, memberName) {
            if (!this.data[groupName]) return false;
            const index = this.data[groupName].indexOf(memberName);
            if (index === -1) return false;
            this.data[groupName].splice(index, 1);
            return true;
        },

        renameMember(groupName, oldName, newName) {
            const normalized = newName.trim();
            if (!this.data[groupName] || !normalized || this.data[groupName].includes(normalized)) return false;
            const index = this.data[groupName].indexOf(oldName);
            if (index === -1) return false;
            this.data[groupName][index] = normalized;
            this.data[groupName].sort((a, b) => a.localeCompare(b));
            return true;
        }
    };

    // =========================================================
    // STORAGE & TRACKING MODULE
    // =========================================================
    const Storage = {
        _cache: null,
        _saveLocalDebounced: null,
        _saveCloudDebounced: null,
        _lastCloudFetch: 0,
        _taskQueue: Promise.resolve(),

        init(isSilentMode = false) {
            this.cleanupDeprecatedConfig();
            this.syncFromStorage();

            this._saveLocalDebounced = Utils.debounce(() => {
                GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(this._cache));
            }, CONFIG.SAVE_DEBOUNCE_MS);
            this._saveCloudDebounced = Utils.debounce(() => {
                this.saveCloud();
            }, CONFIG.CLOUD_HISTORY_DEBOUNCE_MS);
            this.clean();
            this.setupCrossTabSync();
            this.setupDirtyListener();

            if (!isSilentMode) {
                this.fetchCloudBackground();
            }
        },

        cleanupDeprecatedConfig() {
            const deprecatedKeys = [
                `${CONFIG.STORAGE_PREFIX}_worker_url`,
                `${CONFIG.STORAGE_PREFIX}_github_owner`,
                `${CONFIG.STORAGE_PREFIX}_github_repo`,
                `${CONFIG.STORAGE_PREFIX}_github_path`,
                `${CONFIG.STORAGE_PREFIX}_history_path`,
                `${CONFIG.STORAGE_PREFIX}_github_branch`
            ];
            deprecatedKeys.forEach(key => {
                try {
                    if (GM_getValue(key) !== undefined) {
                        GM_deleteValue(key);
                    }
                } catch (e) {
                    Logger.warn(`Failed to cleanup deprecated storage key: ${key}`);
                }
            });
        },

        _queueTask(taskFn) {
            this._taskQueue = this._taskQueue.then(taskFn).catch(e => {
                Logger.error('Storage task queue exception', e);
            });
            return this._taskQueue;
        },

        async _withLock(callback) {
            const lockKey = `${CONFIG.UI_PREFIX}_global_mutex`;
            const myId = Math.random().toString(36).substring(2, 10);
            let attempts = 0;

            while (attempts < 200) {
                const lockStr = GM_getValue(lockKey, null);
                let currentLock = null;
                try { currentLock = lockStr ? JSON.parse(lockStr) : null; } catch(e) {}

                const now = Date.now();
                if (!currentLock || (now - currentLock.time > 3000)) {
                    GM_setValue(lockKey, JSON.stringify({ id: myId, time: now }));
                    await new Promise(r => setTimeout(r, 20));

                    const verifyStr = GM_getValue(lockKey, null);
                    let verifyLock = null;
                    try { verifyLock = verifyStr ? JSON.parse(verifyStr) : null; } catch(e) {}

                    if (verifyLock && verifyLock.id === myId) {
                        try {
                            return await callback();
                        } finally {
                            await new Promise(r => setTimeout(r, 75));
                            GM_setValue(lockKey, null);
                        }
                    }
                }

                const jitter = Math.floor(Math.random() * 40) + 20;
                await new Promise(r => setTimeout(r, jitter));
                attempts++;
            }

            Logger.warn('Global mutex timeout. Forcing execution to prevent stall.');
            return await callback();
        },

        syncFromStorage() {
            try {
                this._cache = JSON.parse(GM_getValue(CONFIG.STORAGE_KEY, '[]'));
            } catch (e) {
                Logger.warn('Corrupted storage data, resetting.');
                this._cache = [];
            }
        },

        setupCrossTabSync() {
            if (typeof GM_addValueChangeListener === 'function') {
                GM_addValueChangeListener(CONFIG.STORAGE_KEY, (key, oldValue, newValue, remote) => {
                    if (remote) {
                        try {
                            this._cache = JSON.parse(newValue || '[]');
                            if (UI.overlay) {
                                UI.refreshSidePanels();
                                UI.updateSyncTimeUI();
                            }
                        } catch (e) {
                            Logger.warn('Failed to sync cross-tab storage change.', e);
                        }
                    }
                });
            }
        },

        setupDirtyListener() {
            if (typeof GM_addValueChangeListener === 'function') {
                GM_addValueChangeListener(`${CONFIG.UI_PREFIX}_sync_dirty`, (key, oldValue, newValue, remote) => {
                    if (newValue === true && document.visibilityState === 'visible') {
                        setTimeout(() => this.saveCloud(), 200);
                    }
                });
            }

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && GM_getValue(`${CONFIG.UI_PREFIX}_sync_dirty`, false)) {
                    setTimeout(() => this.saveCloud(), 200);
                }
            });
        },

        clean() {
            const cutoffDate = Date.now() - (CONFIG.HISTORY_MAX_DAYS * 24 * 60 * 60 * 1000);
            const initialLength = this._cache.length;

            this._cache = this._cache.filter(item => item.t >= cutoffDate);
            if (this._cache.length !== initialLength) {
                this._saveLocalDebounced();
            }
            return this._cache;
        },

        /**
         * Manual "mirror GitHub" action for when history.json has been hand-edited
         * directly on GitHub. Clears the local cache first so fetchCloudBackground's
         * merge step has nothing local to merge against — the result is a clean
         * copy of whatever's currently on GitHub, not a union of old + new.
         * @returns {Promise<'synced'|'no-token'>} outcome for the caller to toast
         */
        async resyncFromCloud() {
            if (!CloudAPI.isValid()) return 'no-token';
            this._cache = [];
            GM_setValue(CONFIG.STORAGE_KEY, '[]');
            await this.fetchCloudBackground(true);
            return 'synced';
        },

        async fetchCloudBackground(force = false) {
            if (!CloudAPI.isValid() || CloudAPI.isRateLimited()) return;
            if (!force && Date.now() - this._lastCloudFetch < CONFIG.CLOUD_HISTORY_THROTTLE_MS) return;
            this._lastCloudFetch = Date.now();
            try {
                const cloudData = await CloudAPI.fetch(CONFIG.GITHUB_HISTORY_PATH);
                if (cloudData && Array.isArray(cloudData)) {
                    GM_setValue(`${CONFIG.UI_PREFIX}_last_sync_time`, Date.now());
                    if (UI.overlay) UI.updateSyncTimeUI();

                    await this._queueTask(() => this._withLock(async () => {
                        const mergedMap = new Map();
                        [...this._cache, ...cloudData].forEach(item => {
                            mergedMap.set(`${item.t}-${item.g}-${item.n}`, item);
                        });

                        const newCache = Array.from(mergedMap.values()).sort((a, b) => a.t - b.t);
                        const isChanged = newCache.length !== this._cache.length ||
                            (newCache.length > 0 && this._cache.length > 0 && newCache[newCache.length - 1].t !== this._cache[this._cache.length - 1].t);

                        if (isChanged || force) {
                            this._cache = newCache;
                            this.clean();
                            this._saveLocalDebounced();
                            if (UI.overlay) UI.refreshSidePanels();
                        }
                    }));
                }
            } catch (e) {
                if (force) throw e;
            }
        },

        async saveCloud() {
            if (!CloudAPI.isValid() || CloudAPI.isRateLimited()) return 'skipped';
            const syncLockKey = `${CONFIG.UI_PREFIX}_cloud_sync_lock`;
            let shouldUpload = false;

            await this._withLock(async () => {
                if (Date.now() - GM_getValue(syncLockKey, 0) < 5000) {
                    GM_setValue(`${CONFIG.UI_PREFIX}_sync_dirty`, true);
                    shouldUpload = false;
                } else {
                    GM_setValue(syncLockKey, Date.now());
                    GM_setValue(`${CONFIG.UI_PREFIX}_sync_dirty`, false);
                    shouldUpload = true;
                }
            });
            if (!shouldUpload) return 'queued';

            try {
                let pushing = true;
                let loops = 0;

                while (pushing && loops < 3) {
                    loops++;
                    await this._queueTask(() => this._withLock(async () => {
                        this.syncFromStorage();
                    }));
                    await this._withLock(async () => {
                        GM_setValue(`${CONFIG.UI_PREFIX}_sync_dirty`, false);
                    });
                    await CloudAPI.put(CONFIG.GITHUB_HISTORY_PATH, this._cache);
                    Logger.info('History cache successfully pushed to remote branch.');

                    GM_setValue(`${CONFIG.UI_PREFIX}_last_sync_time`, Date.now());
                    if (UI.overlay) UI.updateSyncTimeUI();
                    await this._withLock(async () => {
                        if (!GM_getValue(`${CONFIG.UI_PREFIX}_sync_dirty`, false)) {
                            pushing = false;
                        } else {
                            GM_setValue(syncLockKey, Date.now());
                        }
                    });
                }

                await this._withLock(async () => { GM_setValue(syncLockKey, 0); });
                return 'synced';
            } catch (e) {
                await this._withLock(async () => {
                    GM_setValue(syncLockKey, 0);
                    GM_setValue(`${CONFIG.UI_PREFIX}_sync_dirty`, true);
                });
                Logger.warn(`History cloud sync failure: ${e.message}`);
                throw e;
            }
        },

        recordSuccess(group, name) {
            if (!group || !name) return;
            try {
                this.syncFromStorage();
                this._cache.push({ g: group, n: name, t: Date.now() });
                this.clean();
                GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(this._cache));

                GM_setValue(`${CONFIG.UI_PREFIX}_sync_dirty`, true);
                if (UI.overlay) UI.refreshSidePanels();
            } catch (e) {
                Logger.error('Fast local sync write failed', e);
            }
        },

        recordBatchSuccess(cartArray) {
            if (!cartArray || cartArray.length === 0) return;
            try {
                this.syncFromStorage();
                const now = Date.now();
                cartArray.forEach(item => {
                    this._cache.push({ g: item.g, n: item.n, t: now });
                });
                this.clean();
                GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(this._cache));

                GM_setValue(`${CONFIG.UI_PREFIX}_sync_dirty`, true);
                if (UI.overlay) UI.refreshSidePanels();
            } catch (e) {
                Logger.error('Fast local batch sync write failed', e);
            }
        },

        renameGroupHistory(oldName, newName) {
            this._queueTask(() => this._withLock(async () => {
                this.syncFromStorage();
                let changed = false;
                this._cache.forEach(item => {
                    if (item.g === oldName) {
                        item.g = newName;
                        changed = true;
                    }
                });

                if (changed) {
                    GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(this._cache));
                    this._saveCloudDebounced();
                    if (UI.overlay) UI.refreshSidePanels();
                }
            }));
        },

        renameMemberHistory(groupName, oldName, newName) {
            this._queueTask(() => this._withLock(async () => {
                this.syncFromStorage();
                let changed = false;
                this._cache.forEach(item => {
                    if (item.g === groupName && item.n === oldName) {
                        item.n = newName;
                        changed = true;
                    }
                });

                if (changed) {
                    GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(this._cache));
                    this._saveCloudDebounced();
                    if (UI.overlay) UI.refreshSidePanels();
                }
            }));
        },

        deleteRawHistory(idsSet) {
            if (!idsSet || idsSet.size === 0) return;
            const idsClone = new Set(idsSet);
            this._queueTask(() => this._withLock(async () => {
                this.syncFromStorage();
                const originalLength = this._cache.length;
                this._cache = this._cache.filter(item => !idsClone.has(`${item.t}-${item.g}-${item.n}`));

                if (this._cache.length !== originalLength) {
                    GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(this._cache));
                    this._saveCloudDebounced();
                    if (UI.overlay) {
                        UI.refreshSidePanels();
                        UI.showToast(`Deleted ${idsClone.size} item(s) from history.`, 'success');
                    }
                }
            }));
        },

        getRecentStats() {
            const data = [...this._cache].reverse();
            const seen = new Set();
            const result = [];
            for (const item of data) {
                const identifier = `${item.g}|${item.n}`;
                if (!seen.has(identifier)) {
                    seen.add(identifier);
                    result.push(item);
                }
            }
            return result;
        },

        getRawHistory() {
            return [...this._cache].reverse();
        },

        /**
         * Trending Score formula (Save events only, last 30 days) — exact
         * spec: continuous exponential decay with a 6-day half-life.
         * weight = 2^(-ageMs / HALF_LIFE_MS)
         * Every save event contributes independently; summing
         * a member/group's weights across all its saves gives its score.
         * Returns 0 for anything outside the 30-day window (explicit here
         * rather than relying solely on HISTORY_MAX_DAYS pruning, in case of
         * any timing drift right at the boundary).
         * @param {number} timestampMs - when the save happened
         * @param {number} nowMs - current time, passed in so a whole batch
         * of items is scored against one consistent "now"
         * @returns {number}
         */
        _trendingWeight(timestampMs, nowMs) {
            const ageMs = nowMs - timestampMs;
            // Only score items within the 30-day window (avoids drift on bounds)
            if (ageMs < 0 || ageMs > 30 * 24 * 60 * 60 * 1000) return 0;
            const HALF_LIFE_MS = 6 * 24 * 60 * 60 * 1000;
            return Math.pow(2, -ageMs / HALF_LIFE_MS);
        },

        /**
         * Per-member trending stats. `score` (decayed, recency-weighted) sets
         * the sort order; `count` (raw save total) is what's actually shown
         * in the UI — a decayed score number isn't meaningful to read at a
         * glance, but the ordering it produces is exactly what we want.
         */
        getTrendingStats() {
            const now = Date.now();
            const frequencies = {};
            this._cache.forEach(item => {
                const weight = this._trendingWeight(item.t, now);
                if (weight === 0) return;
                const identifier = `${item.g}|${item.n}`;
                if (!frequencies[identifier]) {
                    frequencies[identifier] = { g: item.g, n: item.n, count: 0, score: 0 };
                }
                frequencies[identifier].count++;
                frequencies[identifier].score += weight;
            });
            return Object.values(frequencies).sort((a, b) => b.score - a.score);
        },

        /**
         * Same aggregation as getTrendingStats(), summed per group instead of
         * per member — feeds the Trending panel's "GROUP" view toggle.
         */
        getGroupTrendingStats() {
            const now = Date.now();
            const frequencies = {};
            this._cache.forEach(item => {
                const weight = this._trendingWeight(item.t, now);
                if (weight === 0) return;
                if (!frequencies[item.g]) {
                    frequencies[item.g] = { g: item.g, count: 0, score: 0 };
                }
                frequencies[item.g].count++;
                frequencies[item.g].score += weight;
            });
            return Object.values(frequencies).sort((a, b) => b.score - a.score);
        }
    };

    // =========================================================
    // DOWNLOADER MODULE
    // =========================================================
    const Downloader = {
        generateRandomString(len) {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            return Array.from({ length: len })
                .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
                .join('');
        },

        getExtension() {
            try {
                const url = new URL(window.location.href);
                const format = url.searchParams.get('format');
                if (format) return format.toLowerCase();
                const match = url.pathname.match(/\.([a-zA-Z0-9]+)$/);
                if (match) return match[1].toLowerCase();
                const type = document.contentType || '';
                if (type.startsWith('image/')) return type.split('/')[1].toLowerCase();
                if (type.startsWith('video/')) return type.split('/')[1].toLowerCase();
                return 'jpg';
            } catch (e) {
                return 'jpg';
            }
        },

        generateFileName(group, member) {
            const ext = this.getExtension();
            return CONFIG.NAMING_FORMAT
                .replace('{group}', group)
                .replace('{member}', member.toLowerCase())
                .replace('{random}', this.generateRandomString(CONFIG.RANDOM_STRING_LENGTH))
                .replace('{ext}', ext);
        },

        generateBatchFileName(cart) {
            const groups = {};
            cart.forEach(item => {
                if (!groups[item.g]) groups[item.g] = [];
                groups[item.g].push(item.n.toLowerCase());
            });
            const groupNames = Object.keys(groups);
            let baseName = "";

            if (groupNames.length === 1) {
                const g = groupNames[0];
                const members = groups[g].join('-');
                baseName = `${g}-${members}`;
            } else {
                const parts = groupNames.map(g => {
                    const members = groups[g].join('-');
                    return `${g}-${members}`;
                });
                baseName = `_multi_${parts.join('_')}`;
            }

            const ext = this.getExtension();
            const rand = this.generateRandomString(CONFIG.RANDOM_STRING_LENGTH);
            baseName = baseName.replace(/[\\/:*?"<>|]/g, '');
            return `${baseName}-${rand}.${ext}`;
        },

        executeStandardSave() {
            const url = window.location.href;
            const originalName = url.substring(url.lastIndexOf('/') + 1).split(/[?#]/)[0] || 'download';
            UI.closeMenu();
            this.triggerDownload(url, originalName, null, null, true, true, null);
        },

        executeCustomSave(customName, cart = null, onSuccess = null) {
            const ext = this.getExtension();
            const safeName = customName.replace(/[\\/:*?"<>|]/g, '_').trim();
            const fileName = CONFIG.CUSTOM_NAMING_FORMAT
                .replace('{custom}', safeName)
                .replace('{random}', this.generateRandomString(CONFIG.RANDOM_STRING_LENGTH))
                .replace('{ext}', ext);
            UI.closeMenu();

            let skipCloudSync = true;
            if (cart && cart.length > 0) skipCloudSync = false;
            this.triggerDownload(window.location.href, fileName, null, null, true, skipCloudSync, cart, onSuccess);
        },

        executeIdolSave(group, name) {
            const fileName = this.generateFileName(group, name);
            UI.closeMenu();
            this.triggerDownload(window.location.href, fileName, group, name, CONFIG.PROMPT_ON_IDOL_SAVE, false, null);
        },

        executeBatchSave(cart) {
            if (!cart || cart.length === 0) return;
            const fileName = this.generateBatchFileName(cart);
            UI.closeMenu();
            this.triggerDownload(window.location.href, fileName, null, null, CONFIG.PROMPT_ON_IDOL_SAVE, false, cart);
        },

        triggerDownload(url, name, groupContext, nameContext, promptUser = true, skipCloudSync = false, cartContext = null, onSuccess = null) {
            const displayFileName = name.includes('/') ? name.substring(name.lastIndexOf('/') + 1) : name;
            const toastObj = UI.createDownloadToast(displayFileName);

            if (url.startsWith('file://')) {
                this.bufferLocalFile(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess);
                return;
            }

            let isSafeImage = false;
            try {
                isSafeImage = !!new URL(url).pathname.match(/\.(jpg|jpeg|png|webp|avif|gif)$/i);
            } catch (e) {}

            if (isSafeImage && typeof GM_download === 'function') {
                this._executeGMDownload(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess);
            } else {
                this.fallbackDownload(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess);
            }
        },

        bufferLocalFile(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess = null) {
            Logger.info('Buffering local file to bypass browser name enforcement...');
            UI.updateDownloadToast(toastObj, 0, 0, 'Buffering local file into memory...');

            const ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase();
            const staticImages = ['jpg', 'jpeg', 'png', 'webp'];

            if (staticImages.includes(ext)) {
                const imgNode = document.querySelector('img');
                if (imgNode && imgNode.complete) {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = imgNode.naturalWidth;
                        canvas.height = imgNode.naturalHeight;
                        canvas.getContext('2d').drawImage(imgNode, 0, 0);

                        let mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
                        canvas.toBlob((blob) => {
                            if (blob) {
                                this._saveBlob(blob, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess);
                            } else {
                                this._bufferViaNetwork(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess);
                            }
                        }, mimeType, 1.0);
                        return;
                    } catch (e) {
                        Logger.warn("Canvas fallback failed, routing to network buffer.");
                    }
                }
            }

            this._bufferViaNetwork(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess);
        },

        async _bufferViaNetwork(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess = null) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const blob = await res.blob();
                    this._saveBlob(blob, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess);
                    return;
                }
            } catch (e) {}

            if (typeof GM_xmlhttpRequest === 'function') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    timeout: 30000,
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300 || res.status === 0) {
                            this._saveBlob(res.response, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess);
                        } else {
                            UI.finishDownloadToast(toastObj, 'error', 'Failed to read local file.');
                        }
                    },
                    onerror: (err) => {
                        Logger.error('Local buffer failed', err);
                        UI.finishDownloadToast(toastObj, 'error', 'Enable "Allow local files" in TM Security Settings');
                    },
                    ontimeout: () => {
                        UI.finishDownloadToast(toastObj, 'error', 'Local buffer request timed out.');
                    }
                });
            } else {
                UI.finishDownloadToast(toastObj, 'error', 'Missing TM network engine.');
            }
        },

        _saveBlob(blob, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess = null) {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = name.substring(name.lastIndexOf('/') + 1);
            a.click();

            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            if (cartContext && cartContext.length > 0) Storage.recordBatchSuccess(cartContext);
            else if (groupContext && nameContext) Storage.recordSuccess(groupContext, nameContext);

            // Fire onSuccess only after confirmed save — preset recording happens here
            if (typeof onSuccess === 'function') onSuccess();

            UI.finishDownloadToast(toastObj, 'success', 'Saved Successfully!');
            UI.startAutoCloseSequence(skipCloudSync);
        },

        _executeGMDownload(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess = null) {
            let hasStarted = false;
            GM_download({
                url: url,
                name: name,
                saveAs: promptUser,
                onprogress: (e) => {
                    hasStarted = true;
                    UI.updateDownloadToast(toastObj, e.loaded, e.total);
                },
                onload: () => {
                    hasStarted = true;
                    if (cartContext && cartContext.length > 0) Storage.recordBatchSuccess(cartContext);
                    else if (groupContext && nameContext) Storage.recordSuccess(groupContext, nameContext);

                    // Fire onSuccess only on confirmed download completion
                    if (typeof onSuccess === 'function') onSuccess();

                    UI.finishDownloadToast(toastObj, 'success', 'Saved Successfully!');
                    UI.startAutoCloseSequence(skipCloudSync);
                },
                onerror: () => {
                    if (hasStarted) {
                        UI.finishDownloadToast(toastObj, 'error', 'Download interrupted or blocked.');
                    } else {
                        UI.updateDownloadToast(toastObj, 0, 0, 'GM Engine blocked, triggering fallback override...');
                        this.fallbackDownload(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess);
                    }
                },
                ontimeout: () => {
                    UI.finishDownloadToast(toastObj, 'error', 'Download timed out.');
                }
            });
        },

        fallbackDownload(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess = null) {
            Logger.info('Using generic XHR fallback download method...');
            if (typeof GM_xmlhttpRequest === 'function') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    timeout: 30000,
                    onprogress: (e) => {
                        UI.updateDownloadToast(toastObj, e.loaded, e.total);
                    },
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300) {
                            this._saveBlob(res.response, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext, onSuccess);
                        } else {
                            UI.finishDownloadToast(toastObj, 'error', `HTTP ${res.status}`);
                        }
                    },
                    onerror: (err) => {
                        Logger.error('Fallback download failed', err);
                        UI.finishDownloadToast(toastObj, 'error', 'Network failure.');
                    },
                    ontimeout: () => {
                        UI.finishDownloadToast(toastObj, 'error', 'Download request timed out.');
                    }
                });
            } else {
                UI.finishDownloadToast(toastObj, 'error', 'Missing browser download API.');
                window.open(url, '_blank');
            }
        }
    };

    // =========================================================
    // UI MODULE
    // =========================================================
    const UI = {
        fab: null,
        fabTicking: false,

        // Edge Routing Variables
        fabCurrentQuad: 'SE',
        fabTargetQuad: 'SE',
        fabIsAnimating: false,

        overlay: null,
        toastContainer: null,
        currentView: 'groups',
        isCrudMode: false,
        isMultiSelectMode: false,
        cart: [],

        recentPanelMode: 'recent',
        historySelected: new Set(),

        syncTimeInterval: null,

        selectedGroup: null,
        activeIndex: -1,
        deleteBtnTemplate: null,
        editItemBtnTemplate: null,
        syncInterval: null,

        mainListWrapper: null,
        cartContainer: null,
        cartListWrapper: null,
        cartList: null,
        cartListInner: null,
        cartSaveBtn: null,
        cachedCartHeight: 400,

        sidePanels: {
            recent: { data: [], wrapper: null, container: null, inner: null, cachedHeight: 400 },
            trending: { data: [], wrapper: null, container: null, inner: null, cachedHeight: 400, viewMode: 'member', scrollPositions: { member: 0, group: 0 } }
        },

        currentListData: [],
        searchContainer: null,

        listContainer: null,
        listInner: null,
        footer: null,
        footerMainRow: null,
        crudBarContainer: null,

        configContainer: null,
        configInputs: {},
        initialConfigState: null,

        searchInput: null,
        crudInput: null,
        crudBtn: null,
        headerTitle: null,
        headerBackBtn: null,

        multiSelectBtn: null,
        editBtn: null,
        syncBtn: null,
        configBtn: null,
        stdSaveBtn: null,
        customBtn: null,

        cachedContainerHeight: 400,
        resizeObserver: null,

        // rAF handles — cancel-and-reschedule keeps rapid updates coalesced into one paint
        _pendingRenderFrame: null,
        _pendingResizeFrame: null,

        // ── Carousel system state (purely visual; zero functional logic) ──────
        _carousel: {
            isActive: false,         // Whether carousel mode is currently engaged
            currentId: 'main',       // ID of the currently-visible panel
            panelEls: {},            // { queue, recent, main, trending } → DOM refs
            layoutEl: null,
            track: null,
            arrowPrev: null,
            arrowNext: null,
            dotsEl: null,
            pillEl: null,
            clip: null,
            wheelTimer: null,
            _resizeHandler: null,
            _mouseUpHandler: null,
            breakpointPx: CONFIG.CAROUSEL_BREAKPOINT_PX, // see CONFIG — moved from magic number
            cachedCardWidth: 0,      // cached layout width — avoids getBoundingClientRect() on every swipe
            isSwitching: false,      // guard against overlapping mode-switch calls during rapid resize
        },

        initTemplates() {
            this.deleteBtnTemplate = document.createElement('button');
            this.deleteBtnTemplate.className = `${CONFIG.UI_PREFIX}-delete-btn`;
            this.deleteBtnTemplate.title = "Delete Entry";
            this.deleteBtnTemplate.appendChild(this._createSVG(ICONS.trash));

            this.editItemBtnTemplate = document.createElement('button');
            this.editItemBtnTemplate.className = `${CONFIG.UI_PREFIX}-edit-item-btn`;
            this.editItemBtnTemplate.title = "Rename Entry";
            this.editItemBtnTemplate.appendChild(this._createSVG(ICONS.edit));
        },

        _createSVG(pathD, viewBox = '0 0 24 24') {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', viewBox);
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathD);
            svg.appendChild(path);
            return svg;
        },

        injectStyles() {
            GM_addStyle(`
                :root {
                    --tm-primary: #ff4081;
                    --tm-primary-hover: #e91e63;
                    --tm-bg-base: #0d0d0d;
                    --tm-bg-panel: #0a0a0a;
                    --tm-bg-input: #161616;
                    --tm-bg-hover: #1c1c1c;
                    --tm-bg-hover-subtle: #2a2a2a;
                    --tm-bg-elevated: #1a1a1a;   /* raised surfaces: icon-btns, inputs, badges */
                    --tm-border: #222;
                    --tm-border-light: #333;
                    --tm-border-focus: #555;
                    --tm-text-main: #fff;
                    --tm-text-heading: #eee;     /* panel headings, slightly softer than pure white */
                    --tm-text-muted: #aaa;
                    --tm-text-dark: #666;
                    --tm-text-subtle: #888;      /* badges, secondary labels */
                    --tm-text-dim: #999;         /* placeholder / inactive controls */
                    --tm-danger: #e57373;
                    --tm-success: #81c784;
                    --tm-warning: #ffb74d;
                    /* Custom Save confirm button — green accent */
                    --tm-confirm-bg: #1e3a2b;
                    --tm-confirm-border: #2c5941;
                    --tm-confirm-text: #4ade80;
                    --tm-confirm-hover: #244935;
                }

                /* ── Floating Action Button ───────────────────────────────── */
                /* ── FAB: Liquid Glass ────────────────────────────────────── */
                /* Layered glass effect adapted for this button's existing
                   circular shape and drag-to-corner positioning. Structure:
                   scatter (blur/saturation) → chroma (tint wash) → rim (inner
                   highlight) → icon, plus ::before (gradient border ring) and
                   ::after (top glare) pseudo-elements. Visual only — the
                   element's position/click/drag logic lives in JS untouched. */
                .${CONFIG.UI_PREFIX}-fab {
                    position: fixed;
                    top: calc(100vh - 6rem); left: calc(100vw - 6rem);
                    width: 3.5rem; height: 3.5rem;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    z-index: ${CONFIG.FAB_Z_INDEX};
                    overflow: hidden;
                    background: rgba(255,255,255,0.06);
                    backdrop-filter: blur(16px) saturate(180%) brightness(1.08);
                    -webkit-backdrop-filter: blur(16px) saturate(180%) brightness(1.08);
                    box-shadow:
                        0 0.5rem 1.5rem rgba(0,0,0,0.6),
                        inset 0 1px 1px rgba(255,255,255,0.3),
                        inset 0 -1px 1px rgba(0,0,0,0.2);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    user-select: none; -webkit-user-select: none; -moz-user-select: none;
                }
                /* Gradient border ring — mask trick so only the ring itself
                   (not the whole circle) picks up the gradient */
                .${CONFIG.UI_PREFIX}-fab::before {
                    content: '';
                    position: absolute; inset: 0; border-radius: 50%;
                    padding: 1px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.25));
                    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    pointer-events: none;
                }
                /* Top glare — soft highlight suggesting a curved glass surface */
                .${CONFIG.UI_PREFIX}-fab::after {
                    content: '';
                    position: absolute; top: 4%; left: 12%; right: 12%; height: 40%;
                    border-radius: 50% 50% 60% 60% / 60% 60% 100% 100%;
                    background: linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(255,255,255,0));
                    pointer-events: none;
                }
                .${CONFIG.UI_PREFIX}-fab-glass-scatter {
                    position: absolute;
                    inset: 0; border-radius: 50%;
                    backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
                    pointer-events: none;
                }
                .${CONFIG.UI_PREFIX}-fab-glass-chroma {
                    position: absolute;
                    inset: 0; border-radius: 50%;
                    background: radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), transparent 60%);
                    mix-blend-mode: overlay;
                    pointer-events: none;
                }
                .${CONFIG.UI_PREFIX}-fab-glass-rim {
                    position: absolute;
                    inset: 0; border-radius: 50%;
                    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15);
                    pointer-events: none;
                }
                .${CONFIG.UI_PREFIX}-fab-icon-wrapper {
                    position: relative;
                    z-index: 5;
                    display: flex; align-items: center; justify-content: center;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
                }
                .${CONFIG.UI_PREFIX}-fab-icon-wrapper svg { width: 1.5rem; height: 1.5rem; fill: var(--tm-text-main); }
                .${CONFIG.UI_PREFIX}-fab:hover {
                    transform: scale(1.05);
                    box-shadow:
                        0 0.6rem 1.8rem rgba(0,0,0,0.65),
                        inset 0 1px 1px rgba(255,255,255,0.4),
                        inset 0 -1px 1px rgba(0,0,0,0.2),
                        0 0 1.2rem rgba(255,255,255,0.15);
                }
                .${CONFIG.UI_PREFIX}-fab:active { transform: scale(0.96); }
                .${CONFIG.UI_PREFIX}-fab:focus-visible {
                    outline: 2px solid var(--tm-primary);
                    outline-offset: 3px;
                }
                /* Ripple — expanding circle from pointer position, self-removes on animationend */
                .${CONFIG.UI_PREFIX}-fab-ripple {
                    position: absolute;
                    z-index: 4;
                    width: 0; height: 0; border-radius: 50%;
                    background: rgba(255,255,255,0.35);
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                    animation: ${CONFIG.UI_PREFIX}-fab-ripple-anim 0.5s ease-out forwards;
                }
                @keyframes ${CONFIG.UI_PREFIX}-fab-ripple-anim {
                    to { width: 4rem; height: 4rem; opacity: 0; }
                }

                /* ── Overlay ──────────────────────────────────────────────── */
                #${CONFIG.UI_PREFIX}-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(0,0,0,0.85); z-index: ${CONFIG.OVERLAY_Z_INDEX};
                    /* !important guards against page CSS overriding these alignment rules */
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-family: 'Inter', -apple-system, sans-serif; backdrop-filter: blur(8px);
                    /* App chrome shouldn't behave like selectable page text —
                       matches the slider's no-highlight treatment, applied
                       everywhere. Actual text inputs opt back in below,
                       since selecting/copying typed text is real functionality.
                    */
                    user-select: none;
                    -webkit-user-select: none; -moz-user-select: none;
                }
                #${CONFIG.UI_PREFIX}-overlay input,
                #${CONFIG.UI_PREFIX}-overlay textarea {
                    user-select: text;
                    -webkit-user-select: text; -moz-user-select: text;
                }
                /* ── Global Focus-Visible ─────────────────────────────────── */
                /* One centralized rule for every interactive element, rather
                   than styling each button class individually — covers
                   native <button>s, icon-btn divs (now keyboard-focusable
                   via Utils.makeFocusable), and role="button" elements.
                */
                #${CONFIG.UI_PREFIX}-overlay button:focus-visible,
                #${CONFIG.UI_PREFIX}-overlay [role="button"]:focus-visible {
                    outline: 2px solid var(--tm-primary);
                    outline-offset: 2px;
                    border-radius: 0.3rem;
                }

                /* ── Fluid Desktop Layout ─────────────────────────────────── */
                /* All widths/heights use clamp() — scales from ~600 px to 4 K  */
                .${CONFIG.UI_PREFIX}-layout {
                    display: flex;
                    flex-wrap: nowrap;
                    gap: clamp(0.5rem, 1.2vw, 1.5rem);
                    max-width: min(98vw, 120rem);
                    max-height: 94vh;
                    justify-content: center;
                    align-items: flex-end;
                    position: relative;
                }

                /* Carousel track — desktop mode: a flex container that mirrors
                   the parent gap/alignment so panels lay out identically to
                   direct children. Avoids display:contents browser quirks with
                   flex re-centering when panel count changes dynamically.
                */
                .${CONFIG.UI_PREFIX}-carousel-track {
                    display: flex;
                    flex-wrap: nowrap;
                    gap: inherit;          /* inherit gap from .layout */
                    align-items: flex-end; /* match .layout align-items */
                    /* No explicit width — content-sized, centred by .layout */
                }

                /* ── Panel dimensions (fluid) ─────────────────────────────── */
                .${CONFIG.UI_PREFIX}-main-container {
                    display: flex; flex-direction: column;
                    order: 2;
                    width: clamp(17rem, 26vw, 28rem);
                    height: clamp(60vh, 78vh, 88vh);
                    position: relative; flex-shrink: 1;
                }
                .${CONFIG.UI_PREFIX}-panel {
                    background: var(--tm-bg-base);
                    border-radius: 1.5rem; padding: 1.5rem; border: 1px solid var(--tm-border);
                    box-shadow: 0 2rem 4rem rgba(0,0,0,0.8); color: var(--tm-text-main);
                    display: flex; flex-direction: column;
                    box-sizing: border-box; overflow: hidden;
                }
                .${CONFIG.UI_PREFIX}-main { width: 100%; height: 100%; position: relative; }
                .${CONFIG.UI_PREFIX}-side {
                    width: clamp(13rem, 20vw, 22rem);
                    height: clamp(60vh, 78vh, 88vh);
                    background: var(--tm-bg-panel); flex-shrink: 1;
                }
                .${CONFIG.UI_PREFIX}-side.left  { order: 1; }
                .${CONFIG.UI_PREFIX}-side.right { order: 3; }

                /* ── Panel Change Glow ────────────────────────────────────── */
                /* Brief, self-cleaning pulse (see _openGroupInMainPanel) so
                   drilling into a group from a side panel is noticeable even
                   when the list content swap itself is easy to miss at a
                   glance. Keeps the panel's existing shadow, adds a second
                   fading glow shadow alongside it — subtle, not flashy.
                */
                @keyframes ${CONFIG.UI_PREFIX}-panel-glow-pulse {
                    0%   { box-shadow: 0 2rem 4rem rgba(0,0,0,0.8), 0 0 0 0 transparent; }
                    25%  { box-shadow: 0 2rem 4rem rgba(0,0,0,0.8), 0 0 1rem 0.2rem var(--tm-primary); }
                    100% { box-shadow: 0 2rem 4rem rgba(0,0,0,0.8), 0 0 0 0 transparent; }
                }
                .${CONFIG.UI_PREFIX}-panel-glow {
                    animation: ${CONFIG.UI_PREFIX}-panel-glow-pulse 0.8s ease-out;
                }

                /* ── Queue / Cart panel — fluid width-reveal ─────────────── */
                /* Intentional layout transition: panel opens/closes as part of
                   the core UX — not a hover/interaction animation.
                */
                .${CONFIG.UI_PREFIX}-cart-panel {
                    order: 0;
                    flex-shrink: 0;
                    width: 0; min-width: 0;
                    height: clamp(60vh, 78vh, 88vh);
                    padding-left: 0; padding-right: 0;
                    opacity: 0; overflow: hidden; border: none;
                    margin-left: calc(-1 * clamp(0.5rem, 1.2vw, 1.5rem));
                    transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
                                opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
                                padding 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
                                margin-left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
                                border-color 0.3s;
                    display: flex; flex-direction: column;
                    pointer-events: none;
                }
                .${CONFIG.UI_PREFIX}-cart-panel.active {
                    width: clamp(13rem, 20vw, 22rem);
                    padding-left: 1.5rem; padding-right: 1.5rem;
                    opacity: 1; border: 1px solid var(--tm-border);
                    margin-left: 0; pointer-events: auto;
                }

                /* ── Header ───────────────────────────────────────────────── */
                .${CONFIG.UI_PREFIX}-header {
                    display: flex;
                    align-items: center; justify-content: space-between; gap: 1rem;
                    height: 2.5rem; margin-bottom: 1rem; flex-shrink: 0; width: 100%;
                }
                .${CONFIG.UI_PREFIX}-header-left  { display: flex; align-items: center; gap: 0.8rem; overflow: hidden; flex-grow: 1; }
                .${CONFIG.UI_PREFIX}-header-right { display: flex; align-items: center; justify-content: flex-end; flex-shrink: 0; gap: 0.4rem; }

                /* ── Panel Icon Titles ────────────────────────────────────── */
                /* Monochrome SVG + text, replacing emoji for cross-platform
                   rendering consistency. Every panel (Database, Queue, Recent,
                   Trending) uses this exact pattern.
                */
                .${CONFIG.UI_PREFIX}-icon-title { display: flex; align-items: center; gap: 0.45rem; }
                .${CONFIG.UI_PREFIX}-icon-title-svg { width: 1.1rem; height: 1.1rem; fill: var(--tm-text-main); flex-shrink: 0; }
                .${CONFIG.UI_PREFIX}-header h2 {
                    font-size: clamp(0.85rem, 1.1vw, 1.1rem);
                    margin: 0; font-weight: 600; color: var(--tm-text-heading); text-align: left;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-grow: 1;
                }
                .${CONFIG.UI_PREFIX}-history-subtitle {
                    font-size: 0.7rem;
                    color: var(--tm-text-dark); margin-top: 0.2rem;
                    font-weight: 500; cursor: help; display: none;
                }

                .${CONFIG.UI_PREFIX}-icon-btn {
                    background: var(--tm-bg-elevated);
                    border: 1px solid var(--tm-border-light);
                    border-radius: 0.7rem; width: 2.5rem; height: 2.5rem;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: background 0.2s, border-color 0.2s; flex-shrink: 0;
                }
                .${CONFIG.UI_PREFIX}-icon-btn:hover { background: var(--tm-border); border-color: var(--tm-border-focus); }
                .${CONFIG.UI_PREFIX}-icon-btn svg { width: 1.1rem; height: 1.1rem; fill: var(--tm-text-main); transition: fill 0.2s; }


                @keyframes tmSpin { 100% { transform: rotate(360deg); } }
                .${CONFIG.UI_PREFIX}-spin svg { animation: tmSpin 1s linear infinite; }

                .${CONFIG.UI_PREFIX}-notification-dot {
                    position: absolute;
                    top: -2px; right: -2px; width: 10px; height: 10px;
                    background-color: var(--tm-danger); border-radius: 50%; border: 2px solid var(--tm-bg-elevated); box-sizing: content-box;
                }

                /* ── Toast Notifications ──────────────────────────────────── */
                #${CONFIG.UI_PREFIX}-toast-wrapper {
                    position: fixed;
                    bottom: 2rem; left: 2rem;
                    display: flex; flex-direction: column; gap: 0.8rem; z-index: ${CONFIG.OVERLAY_Z_INDEX + 10};
                    pointer-events: none; align-items: flex-start;
                    font-family: 'Inter', -apple-system, sans-serif;
                }
                .${CONFIG.UI_PREFIX}-toast {
                    background: rgba(20,20,20,0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--tm-border-light); border-left: 4px solid var(--tm-primary);
                    color: var(--tm-text-main); padding: 0.8rem 1.2rem; border-radius: 0.6rem;
                    font-size: 0.85rem;
                    font-weight: 500; box-shadow: 0 8px 16px rgba(0,0,0,0.5);
                    display: flex; align-items: center; gap: 0.6rem; pointer-events: auto;
                    max-width: 320px; will-change: transform, opacity;
                }
                .${CONFIG.UI_PREFIX}-dl-toast { flex-direction: column; align-items: flex-start; gap: 0; padding: 0.8rem 1rem 1rem 1rem; position: relative; overflow: hidden; min-width: 250px; }
                .${CONFIG.UI_PREFIX}-dl-info  { display: flex; flex-direction: column; gap: 0.2rem; width: 100%; }
                .${CONFIG.UI_PREFIX}-dl-title  { font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 100%; }
                .${CONFIG.UI_PREFIX}-dl-status { font-size: 0.75rem; color: var(--tm-text-muted); font-variant-numeric: tabular-nums; }
                .${CONFIG.UI_PREFIX}-progress-bg   { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: rgba(255,255,255,0.1); }
                .${CONFIG.UI_PREFIX}-progress-fill { height: 100%; background: var(--tm-primary); border-radius: 2px; }
                .${CONFIG.UI_PREFIX}-toast.syncing            { border-left-color: var(--tm-warning); }
                .${CONFIG.UI_PREFIX}-toast.syncing  .${CONFIG.UI_PREFIX}-progress-fill { background: var(--tm-warning); }
                .${CONFIG.UI_PREFIX}-toast.success            { border-left-color: var(--tm-success); }
                .${CONFIG.UI_PREFIX}-toast.success  .${CONFIG.UI_PREFIX}-progress-fill { background: var(--tm-success); }
                .${CONFIG.UI_PREFIX}-toast.error              { border-left-color: var(--tm-danger); }
                .${CONFIG.UI_PREFIX}-toast.error    .${CONFIG.UI_PREFIX}-progress-fill { background: var(--tm-danger); }
                @keyframes tmToastFadeIn   { from { opacity: 0; transform: translateX(-20px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }
                @keyframes tmToastFadeOut  { from { opacity: 1; transform: translateX(0) scale(1); height: auto; } to { opacity: 0; transform: translateX(-20px) scale(0.95); margin-top: -10px; } }
                @keyframes tmCountdownBorder { 0% { border-left-color: var(--tm-success); } 50% { border-left-color: var(--tm-warning); } 100% { border-left-color: var(--tm-danger); } }
                @keyframes tmCountdownFill   { 0% { background-color: var(--tm-success); } 50% { background-color: var(--tm-warning); } 100% { background-color: var(--tm-danger); } }
                @keyframes tmCountdownWidth  { 0% { width: 100%; } 100% { width: 0%; } }
                .${CONFIG.UI_PREFIX}-cancel-btn {
                    background: #222;
                    color: var(--tm-text-main); border: 1px solid #444;
                    padding: 0.3rem 0.5rem; border-radius: 0.4rem; font-size: 0.75rem;
                    cursor: pointer; transition: background 0.2s, border-color 0.2s;
                    outline: none; flex-shrink: 0;
                }
                .${CONFIG.UI_PREFIX}-cancel-btn:hover { background: var(--tm-border-light); border-color: var(--tm-text-dark); }

                /* ── Queue Panel Items ────────────────────────────────────── */
                .${CONFIG.UI_PREFIX}-queue-item {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 42px;
                    background: var(--tm-bg-input); border: 1px solid var(--tm-border-light);
                    border-radius: 0.6rem; padding: 0 0.8rem;
                    display: flex;
                    justify-content: space-between; align-items: center; gap: 0.5rem;
                    transition: background 0.15s; box-sizing: border-box; will-change: transform;
                }
                .${CONFIG.UI_PREFIX}-queue-item:hover { background: var(--tm-bg-hover); border-color: var(--tm-border-focus); }
                .${CONFIG.UI_PREFIX}-history-selected { border-color: var(--tm-danger) !important; background: rgba(229,115,115,0.1) !important; }
                .${CONFIG.UI_PREFIX}-queue-remove {
                    background: none;
                    border: none; color: var(--tm-danger); cursor: pointer;
                    padding: 0 0.5rem 0 0; font-size: 1rem; font-weight: bold; line-height: 1; transition: color 0.2s;
                }
                .${CONFIG.UI_PREFIX}-queue-remove:hover { color: var(--tm-text-main); }

                /* ── Search & Toolbar ─────────────────────────────────────── */
                .${CONFIG.UI_PREFIX}-search-container { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; flex-shrink: 0; }
                .${CONFIG.UI_PREFIX}-search-input {
                    flex-grow: 1;
                    min-width: 0; background: var(--tm-bg-input); border: 1px solid var(--tm-border-light);
                    border-radius: 0.8rem; padding: 0.8rem 1rem; color: var(--tm-text-main);
                    font-size: 0.95rem; outline: none;
                    box-sizing: border-box; transition: border-color 0.2s, background 0.2s;
                }
                .${CONFIG.UI_PREFIX}-search-input:focus { border-color: var(--tm-text-dark); background: var(--tm-bg-elevated); }

                /* ── Virtual List Architecture ────────────────────────────── */
                .${CONFIG.UI_PREFIX}-list-wrapper { flex-grow: 1; min-height: 0; width: 100%; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; }
                .${CONFIG.UI_PREFIX}-list { width: 100%; overflow-y: auto; overflow-x: hidden; position: relative; padding-right: 0.5rem; box-sizing: border-box; outline: none; }
                .${CONFIG.UI_PREFIX}-list::-webkit-scrollbar { width: 6px; }
                .${CONFIG.UI_PREFIX}-list::-webkit-scrollbar-thumb { background: var(--tm-border-light); border-radius: 10px; }
                .${CONFIG.UI_PREFIX}-list-inner { position: relative; width: 100%; min-height: 100%; }
                .${CONFIG.UI_PREFIX}-empty-state { position: absolute; top: 2rem; width: 100%; text-align: center; color: var(--tm-text-dark); font-size: 0.9rem; font-style: italic; }

                .${CONFIG.UI_PREFIX}-item {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 42px;
                    background: #141414; border: 1px solid transparent; padding: 0 1rem; border-radius: 0.8rem;
                    cursor: pointer; transition: background 0.15s; font-size: 0.95rem;
                    display: flex; justify-content: space-between; align-items: center;
                    box-sizing: border-box; will-change: transform;
                }
                .${CONFIG.UI_PREFIX}-item:hover,
                .${CONFIG.UI_PREFIX}-item.active-focus { background: var(--tm-bg-hover); border-color: var(--tm-border-focus); }

                .${CONFIG.UI_PREFIX}-badge {
                    font-size: 0.7rem;
                    color: var(--tm-text-subtle); background: var(--tm-bg-elevated); padding: 0.2rem 0.5rem;
                    border-radius: 0.4rem; border: 1px solid #252525; font-weight: 500;
                    transition: background 0.2s, border-color 0.2s, color 0.2s;
                }
                .${CONFIG.UI_PREFIX}-badge.accent { color: var(--tm-text-muted); border-color: var(--tm-border-focus); background: var(--tm-border); }
                .${CONFIG.UI_PREFIX}-badge-actionable:hover       { background: var(--tm-bg-hover-subtle); border-color: var(--tm-border-focus); color: var(--tm-text-main); cursor: pointer; }
                .${CONFIG.UI_PREFIX}-badge-actionable.accent:hover { background: var(--tm-border-light); border-color: var(--tm-text-dark); color: var(--tm-text-main); }

                /* ── Trending Panel Member/Group Sliding Toggle ────────────── */
                /* Pure CSS state machine: a visually-hidden checkbox drives
                   everything below via the :checked sibling selector — the
                   thumb's position and each label's color. No JS animates
                   any of this; the checkbox's change event only tells the
                   app which data to render, mirroring the reference AM/PM
                   slider's architecture exactly.
                */
                .${CONFIG.UI_PREFIX}-trending-switch {
                    position: relative;
                    display: block;
                    width: calc(100% - 2 * clamp(0.6rem, 2vw, 0.9rem));
                    margin: 0 clamp(0.6rem, 2vw, 0.9rem) 0.7rem;
                    height: 2.2rem;
                    cursor: pointer;
                }
                .${CONFIG.UI_PREFIX}-trending-switch-checkbox {
                    position: absolute;
                    opacity: 0; width: 0; height: 0;
                }
                .${CONFIG.UI_PREFIX}-trending-switch-track {
                    position: absolute;
                    inset: 0;
                    background: var(--tm-bg-elevated);
                    border: 1px solid var(--tm-border-light);
                    border-radius: 999px;
                    display: flex; align-items: center;
                    padding: 0.2rem;
                    overflow: hidden;
                    transition: border-color 0.2s ease;
                }
                /* Visible focus ring on the track since the real checkbox is hidden —
                   keyboard users still get a clear focus indicator (Tab + Space toggles) */
                .${CONFIG.UI_PREFIX}-trending-switch-checkbox:focus-visible ~ .${CONFIG.UI_PREFIX}-trending-switch-track {
                    outline: 2px solid var(--tm-primary); outline-offset: 2px;
                }
                .${CONFIG.UI_PREFIX}-trending-switch-labels {
                    position: relative;
                    z-index: 1;
                    display: flex; width: 100%;
                }
                .${CONFIG.UI_PREFIX}-trending-switch-member,
                .${CONFIG.UI_PREFIX}-trending-switch-group {
                    flex: 1;
                    text-align: center;
                    font-size: 0.75rem; font-weight: 700; letter-spacing: 0.03em;
                    color: var(--tm-text-dim);
                    transition: color 0.2s ease;
                }
                .${CONFIG.UI_PREFIX}-trending-switch-checkbox:not(:checked) ~ .${CONFIG.UI_PREFIX}-trending-switch-track .${CONFIG.UI_PREFIX}-trending-switch-member,
                .${CONFIG.UI_PREFIX}-trending-switch-checkbox:checked ~ .${CONFIG.UI_PREFIX}-trending-switch-track .${CONFIG.UI_PREFIX}-trending-switch-group {
                    color: var(--tm-text-main);
                }
                .${CONFIG.UI_PREFIX}-trending-switch-thumb {
                    position: absolute;
                    top: 0.2rem; bottom: 0.2rem; left: 0.2rem;
                    width: calc(50% - 0.2rem);
                    background: var(--tm-primary);
                    border-radius: 999px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    /* translateZ(0) forces its own compositor layer alongside
                       will-change, so the browser slides this via the GPU
                       instead of repainting it as part of regular layout —
                       this is what actually fixes the low-FPS feel, not the
                       transition timing (which was already fine).
                    */
                    will-change: transform;
                    transform: translateZ(0);
                    z-index: 0;
                }
                .${CONFIG.UI_PREFIX}-trending-switch-checkbox:checked ~ .${CONFIG.UI_PREFIX}-trending-switch-track .${CONFIG.UI_PREFIX}-trending-switch-thumb {
                    transform: translateX(100%) translateZ(0);
                }

                /* ── Footer & Action Buttons ──────────────────────────────── */
                .${CONFIG.UI_PREFIX}-footer       { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--tm-border); flex-shrink: 0; display: flex; flex-direction: column; gap: 0.5rem; }
                .${CONFIG.UI_PREFIX}-panel-footer { margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--tm-border); display: none; }
                .${CONFIG.UI_PREFIX}-btn-row      { display: flex; gap: 0.5rem; width: 100%; }
                .${CONFIG.UI_PREFIX}-action-btn {
                    flex: 1;
                    display: flex; align-items: center; justify-content: center;
                    background: var(--tm-bg-elevated); color: var(--tm-text-dim); border: 1px dashed var(--tm-border-focus); padding: 0.8rem;
                    border-radius: 0.8rem; cursor: pointer;
                    font-size: 0.9rem; transition: background 0.2s, border-color 0.2s, color 0.2s; outline: none;
                }
                .${CONFIG.UI_PREFIX}-action-btn:hover:not(:disabled),
                .${CONFIG.UI_PREFIX}-action-btn:focus:not(:disabled) { background: var(--tm-border); color: var(--tm-text-main); border-color: var(--tm-text-dark); }
                .${CONFIG.UI_PREFIX}-action-btn:disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }

                /* ── Custom Input Prompt ──────────────────────────────────── */
                .${CONFIG.UI_PREFIX}-custom-wrapper  { display: none; width: 100%; gap: 0.5rem; align-items: center; }
                .${CONFIG.UI_PREFIX}-custom-input    { background: var(--tm-bg-input); border: 1px solid var(--tm-border-light); border-radius: 0.5rem; padding: 0.7rem 0.8rem; color: var(--tm-text-main); font-size: 0.9rem; outline: none; transition: border-color 0.2s, background 0.2s; }
                .${CONFIG.UI_PREFIX}-custom-input:focus { border-color: var(--tm-text-dark); background: var(--tm-bg-elevated); }
                .${CONFIG.UI_PREFIX}-custom-confirm, .${CONFIG.UI_PREFIX}-custom-cancel { background: var(--tm-bg-elevated); color: var(--tm-text-main); border: 1px solid #444; padding: 0.7rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; }
                .${CONFIG.UI_PREFIX}-custom-confirm       { background: var(--tm-confirm-bg); border-color: var(--tm-confirm-border); color: var(--tm-confirm-text); }
                .${CONFIG.UI_PREFIX}-custom-confirm:hover { background: var(--tm-confirm-hover); }
                .${CONFIG.UI_PREFIX}-custom-cancel:hover  { background: var(--tm-bg-hover-subtle); border-color: var(--tm-text-dark); }

                /* ── Input Clear Button ───────────────────────────────────── */
                /* Wraps search/CRUD/settings inputs — shows a "×" once the
                   input has a value so users don't have to backspace repeatedly.
                */
                .${CONFIG.UI_PREFIX}-input-clear-wrapper { position: relative; display: flex; align-items: center; flex-grow: 1; min-width: 0; }
                .${CONFIG.UI_PREFIX}-input-clear-wrapper input { width: 100%; padding-right: 2.2rem; box-sizing: border-box; }
                .${CONFIG.UI_PREFIX}-input-clear-btn {
                    position: absolute;
                    right: 0.4rem; top: 50%; transform: translateY(-50%);
                    width: 1.5rem; height: 1.5rem; display: flex; align-items: center; justify-content: center;
                    background: transparent; border: none;
                    border-radius: 50%; color: var(--tm-text-dim);
                    font-size: 1.1rem; line-height: 1; cursor: pointer; opacity: 0; pointer-events: none;
                    transition: opacity 0.15s, background 0.15s, color 0.15s;
                }
                .${CONFIG.UI_PREFIX}-input-clear-btn.${CONFIG.UI_PREFIX}-visible { opacity: 1; pointer-events: auto; }
                .${CONFIG.UI_PREFIX}-input-clear-btn:hover,
                .${CONFIG.UI_PREFIX}-input-clear-btn:focus { background: var(--tm-bg-hover-subtle); color: var(--tm-text-main); outline: none; }

                /* ── CRUD Bar ─────────────────────────────────────────────── */
                .${CONFIG.UI_PREFIX}-crud-bar       { display: none; gap: 0.5rem; margin-bottom: 1rem; flex-shrink: 0; transition: opacity 0.2s; }
                .${CONFIG.UI_PREFIX}-crud-input     { flex-grow: 1; background: var(--tm-bg-input); border: 1px solid var(--tm-border-light); border-radius: 0.6rem; padding: 0.7rem 0.8rem; color: var(--tm-text-main); font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
                .${CONFIG.UI_PREFIX}-crud-input:focus { border-color: var(--tm-text-dark); }
                .${CONFIG.UI_PREFIX}-crud-add-btn   { background: #222; color: var(--tm-text-main); border: 1px solid var(--tm-border-light); border-radius: 0.6rem; padding: 0.7rem 1rem; font-size: 0.85rem; cursor: pointer; white-space: nowrap; transition: background 0.2s, border-color 0.2s; }
                .${CONFIG.UI_PREFIX}-crud-add-btn:hover:not(:disabled) { background: var(--tm-border-light); border-color: var(--tm-border-focus); }
                .${CONFIG.UI_PREFIX}-edit-item-btn, .${CONFIG.UI_PREFIX}-delete-btn { background: transparent; border: none; cursor: pointer; padding: 0.4rem; display: flex; align-items: center; justify-content: center; border-radius: 0.4rem; transition: background 0.2s; margin-left: 0.2rem; }
                .${CONFIG.UI_PREFIX}-edit-item-btn svg, .${CONFIG.UI_PREFIX}-delete-btn svg { width: 1.1rem; height: 1.1rem; transition: fill 0.2s; }
                .${CONFIG.UI_PREFIX}-edit-item-btn svg         { fill: var(--tm-text-muted); }
                .${CONFIG.UI_PREFIX}-edit-item-btn:hover       { background: rgba(255,255,255,0.15); }
                .${CONFIG.UI_PREFIX}-edit-item-btn:hover svg   { fill: var(--tm-text-main); }
                .${CONFIG.UI_PREFIX}-delete-btn svg            { fill: var(--tm-danger); }
                .${CONFIG.UI_PREFIX}-delete-btn:hover          { background: rgba(229,115,115,0.15); }

                /* ── Config Panel ─────────────────────────────────────────── */
                .${CONFIG.UI_PREFIX}-config-wrapper { display: none; flex-direction: column; height: 100%; overflow: hidden; }
                .${CONFIG.UI_PREFIX}-config-body    { flex-grow: 1; overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column; gap: 0.8rem; }
                .${CONFIG.UI_PREFIX}-config-body::-webkit-scrollbar       { width: 6px; }
                .${CONFIG.UI_PREFIX}-config-body::-webkit-scrollbar-thumb { background: var(--tm-border-light); border-radius: 10px; }
                .${CONFIG.UI_PREFIX}-config-footer  { flex-shrink: 0; padding-top: 1rem; margin-top: 0.5rem; border-top: 1px solid var(--tm-border); display: flex; }
                .${CONFIG.UI_PREFIX}-settings-field { display: flex; flex-direction: column; gap: 0.3rem; }
                .${CONFIG.UI_PREFIX}-settings-field label { font-size: 0.8rem; color: var(--tm-text-muted); font-weight: 500; text-align: left; }
                .${CONFIG.UI_PREFIX}-settings-input { background: var(--tm-bg-input); border: 1px solid var(--tm-border-light); border-radius: 0.6rem; padding: 0.7rem 0.8rem; color: var(--tm-text-main); font-size: 0.9rem; outline: none; transition: border-color 0.2s, background 0.2s; }
                .${CONFIG.UI_PREFIX}-settings-input:focus { border-color: var(--tm-primary); background: var(--tm-bg-elevated); }
                .${CONFIG.UI_PREFIX}-settings-save-btn    { width: 100%; background: var(--tm-primary); color: var(--tm-text-main); border: none; border-radius: 0.6rem; padding: 0.8rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
                .${CONFIG.UI_PREFIX}-settings-utility-btn { width: 100%; background: transparent; color: var(--tm-text-main); border: 1px solid var(--tm-border-light); border-radius: 0.6rem; padding: 0.7rem; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: background 0.2s, border-color 0.2s; }
                .${CONFIG.UI_PREFIX}-settings-utility-btn:hover { background: var(--tm-bg-hover-subtle); border-color: var(--tm-text-dark); }
                .${CONFIG.UI_PREFIX}-settings-utility-btn--bottom { margin-top: auto; }
                .${CONFIG.UI_PREFIX}-settings-hint { font-size: 0.78rem; color: var(--tm-text-dim); margin: 0.4rem 0 1.2rem; line-height: 1.4; }

                /* ── Diagnostics Panel ────────────────────────────────────── */
                .${CONFIG.UI_PREFIX}-diagnostics-section {
                    font-size: 0.72rem;
                    font-weight: 700; letter-spacing: 0.04em;
                    color: var(--tm-text-dim); text-transform: uppercase;
                    margin: 1rem 0 0.4rem; padding-bottom: 0.3rem;
                    border-bottom: 1px solid var(--tm-border-light);
                }
                .${CONFIG.UI_PREFIX}-diagnostics-section:first-child { margin-top: 0; }
                .${CONFIG.UI_PREFIX}-diagnostics-row {
                    display: flex;
                    justify-content: space-between; align-items: baseline;
                    gap: 1rem; padding: 0.35rem 0; font-size: 0.85rem;
                }
                .${CONFIG.UI_PREFIX}-diagnostics-label { color: var(--tm-text-dim); flex-shrink: 0; }
                .${CONFIG.UI_PREFIX}-diagnostics-value { color: var(--tm-text-main); text-align: right; word-break: break-word; }
                .${CONFIG.UI_PREFIX}-settings-save-btn:hover:not(:disabled) { background: var(--tm-primary-hover); }
                .${CONFIG.UI_PREFIX}-history-delete-btn   { width: 100%; background: rgba(229,115,115,0.15); color: var(--tm-danger); border: 1px solid var(--tm-danger); border-radius: 0.6rem; padding: 0.8rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s, color 0.2s; }
                .${CONFIG.UI_PREFIX}-history-delete-btn:hover:not(:disabled) { background: var(--tm-danger); color: #fff; }
                .${CONFIG.UI_PREFIX}-settings-save-btn:disabled,
                .${CONFIG.UI_PREFIX}-history-delete-btn:disabled { opacity: 0.4; cursor: not-allowed; border-color: var(--tm-border-focus); color: var(--tm-text-dark); background: var(--tm-bg-elevated); }

                /* ════════════════════════════════════════════════════════════
                   CAROUSEL SYSTEM
                   Applied by JS via .${CONFIG.UI_PREFIX}-carousel class on
                   layoutWrapper. Below 920 px wide the 4-panel side-by-side
                   layout becomes a full-width card carousel.
                ════════════════════════════════════════════════════════════ */

                /* Queue Pill — in-flow element between the list wrapper and
                   the footer. Never overlaps buttons. Visible only in carousel
                   mode when multi-select is active and the queue has items.
                */
                .${CONFIG.UI_PREFIX}-queue-pill {
                    display: none; /* hidden by default; shown only in carousel mode */
                    width: 100%;
                    align-items: center; justify-content: center;
                    gap: 0.45rem;
                    background: rgba(255, 64, 129, 0.12);
                    color: var(--tm-primary);
                    border: 1px solid rgba(255, 64, 129, 0.35);
                    border-radius: 0.7rem;
                    padding: 0.55rem 1rem;
                    font-size: 0.82rem; font-weight: 600; font-family: inherit;
                    cursor: pointer; white-space: nowrap;
                    flex-shrink: 0;
                    margin-top: 0.5rem;
                    opacity: 0; pointer-events: none;
                    transition: opacity 0.22s ease, background 0.2s ease;
                }
                .${CONFIG.UI_PREFIX}-queue-pill svg {
                    width: 0.95rem; height: 0.95rem; fill: var(--tm-primary); flex-shrink: 0;
                }
                .${CONFIG.UI_PREFIX}-queue-pill:hover {
                    background: rgba(255, 64, 129, 0.22);
                    border-color: rgba(255, 64, 129, 0.6);
                }
                .${CONFIG.UI_PREFIX}-queue-pill.visible {
                    display: flex; opacity: 1;
                    pointer-events: auto;
                }
                /* Desktop: queue panel is always visible — pill never needed */
                .${CONFIG.UI_PREFIX}-layout:not(.${CONFIG.UI_PREFIX}-carousel) .${CONFIG.UI_PREFIX}-queue-pill {
                    display: none !important;
                }

                /* Carousel Arrow Buttons */
                .${CONFIG.UI_PREFIX}-carousel-arrow {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 2.4rem; height: 2.4rem;
                    background: rgba(15,15,15,0.92);
                    border: 1px solid var(--tm-border-light); border-radius: 50%;
                    display: none; /* shown only in carousel mode */
                    align-items: center; justify-content: center;
                    cursor: pointer; z-index: 30;
                    opacity: 0.8;
                    transition: opacity 0.2s, background 0.2s;
                    backdrop-filter: blur(6px);
                }
                .${CONFIG.UI_PREFIX}-carousel-arrow:hover      { opacity: 1; background: rgba(40,40,40,0.97); }
                .${CONFIG.UI_PREFIX}-carousel-arrow.prev        { left:  -1.3rem; }
                .${CONFIG.UI_PREFIX}-carousel-arrow.next        { right: -1.3rem; }
                .${CONFIG.UI_PREFIX}-carousel-arrow svg         { width: 1rem; height: 1rem; fill: var(--tm-text-main); }
                .${CONFIG.UI_PREFIX}-carousel-arrow.edge-disabled { opacity: 0.2; pointer-events: none; }

                /* Carousel Dot Indicators */
                .${CONFIG.UI_PREFIX}-carousel-dots {
                    position: absolute;
                    bottom: -1.7rem; left: 50%;
                    transform: translateX(-50%);
                    display: none; /* shown only in carousel mode */
                    gap: 0.4rem; align-items: center;
                }
                .${CONFIG.UI_PREFIX}-carousel-dot {
                    width: 0.45rem; height: 0.45rem; border-radius: 50%;
                    background: var(--tm-border-focus);
                    transition: background 0.2s, transform 0.2s;
                    cursor: pointer; border: none; padding: 0; outline: none;
                }
                .${CONFIG.UI_PREFIX}-carousel-dot.active {
                    background: var(--tm-primary); transform: scale(1.5);
                }

                /* ── Carousel Mode (JS toggles .${CONFIG.UI_PREFIX}-carousel) ── */
                /* CENTERING STRATEGY: position:fixed + translate(-50%,-50%) is the
                   only approach that is fully immune to parent flex/grid layout and
                   page-CSS interference. The overlay stays as a dark backdrop only;
                   the layoutWrapper is independently anchored to the viewport centre.
                */
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel {
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;

                    overflow: visible; /* arrows poke outside; track clips cards   */
                    width: min(92vw, 26rem); max-width: min(92vw, 26rem);
                    min-width: 0;
                    height: clamp(60vh, 76vh, 86vh);
                    max-height: clamp(60vh, 76vh, 86vh);
                    gap: 0;
                    align-items: stretch;
                    /* No padding-bottom needed — dots use position:absolute below */
                }

                /* Show carousel-specific UI only in carousel mode */
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-arrow { display: flex; }
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-dots  { display: flex; }

                /* Carousel clip — stationary overflow window.
                   overflow:hidden MUST be on this parent, NOT on the track.
                   When overflow:hidden and transform are on the SAME element,
                   the clip region moves with the transform → only panel[0] ever
                   appears, just displaced. The clip must be stationary.      */
                .${CONFIG.UI_PREFIX}-carousel-clip {
                    display: contents; /* invisible passthrough in desktop mode */
                }
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-clip {
                    display: block; overflow: hidden; width: 100%; height: 100%;
                    border-radius: 1.5rem;
                    box-shadow: 0 24px 64px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.07);
                    transform: translateZ(0); /* own GPU layer — prevents sub-pixel blur */
                    backface-visibility: hidden; -webkit-backface-visibility: hidden;
                    isolation: isolate;
                }

                /* Track slides freely inside the clip — no overflow on itself */
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-track {
                    display: flex; flex-wrap: nowrap;
                    width: 100%; height: 100%;
                    will-change: transform;
                    transition: transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
                }

                /* Each panel = one full-width card inside the clip */
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-track > * {
                    flex: 0 0 100%; flex-shrink: 0; order: 0 !important;
                    width: 100% !important; max-width: 100% !important;
                    height: 100% !important; min-height: 0;
                    margin: 0 !important; padding: 1.5rem !important;
                    border: none !important; border-radius: 0 !important;
                    box-shadow: none !important; opacity: 1 !important;
                    pointer-events: auto !important; overflow: hidden;
                    box-sizing: border-box !important;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    text-rendering: optimizeLegibility;
                }

                /* Queue card active-state overrides inside carousel */
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-track .${CONFIG.UI_PREFIX}-cart-panel.active {
                    width: 100% !important; padding: 1.5rem !important; margin: 0 !important;
                }




                /* ── FIX: Multi-select queue item indicator ──────────────── */
                .${CONFIG.UI_PREFIX}-item-selected {
                    border-color: var(--tm-primary) !important; background: rgba(255, 64, 129, 0.12) !important;
                }
                .${CONFIG.UI_PREFIX}-cart-check {
                    color: var(--tm-primary); font-weight: 700;
                    font-size: 0.95rem;
                    flex-shrink: 0;
                    line-height: 1;
                }

                /* ── FIX 1: .main-container is a wrapper div, not a panel.
                   The carousel > * rule adds padding: 1.5rem to it, then the
                   inner .panel adds ANOTHER 1.5rem — double padding shrinks
                   the usable content area. Zero the wrapper's padding so only
                   the inner .panel's padding applies.
                */
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel
                .${CONFIG.UI_PREFIX}-carousel-track > .${CONFIG.UI_PREFIX}-main-container {
                    padding: 0 !important;
                }
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel
                .${CONFIG.UI_PREFIX}-carousel-track > .${CONFIG.UI_PREFIX}-main-container
                > .${CONFIG.UI_PREFIX}-panel {
                    height: 100% !important; border-radius: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    box-sizing: border-box !important;
                }




                /* ── Mode-switch transition ───────────────────────────────
                   Simple opacity fade only — lightweight, no scale, no JS
                   timer chains. Layout class swap happens at opacity:0.    */
                .${CONFIG.UI_PREFIX}-layout {
                    transition: opacity 0.18s ease;
                }
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-mode-switching {
                    opacity: 0; pointer-events: none;
                }
            `);
        },


        // ═══════════════════════════════════════════════════════════════════
        // CAROUSEL SYSTEM — purely visual layer; zero functional logic here
        // ═══════════════════════════════════════════════════════════════════

        /** Returns the ordered list of panel IDs currently in the deck. */
        _carouselGetActivePanels() {
            const ids = ['recent', 'main', 'trending'];
            if (this.isMultiSelectMode) ids.unshift('queue');
            return ids;
        },

        /** Resolves the numeric index for the currently-shown panel ID. */
        _carouselCurrentIndex() {
            const panels = this._carouselGetActivePanels();
            const idx = panels.indexOf(this._carousel.currentId);
            return idx === -1 ? 0 : idx;
        },

        /** Navigate to a panel by ID string or absolute index. */
        _carouselGoTo(idOrIndex) {
            if (!this._carousel.isActive) return;
            const panels = this._carouselGetActivePanels();
            let idx;
            if (typeof idOrIndex === 'string') {
                idx = panels.indexOf(idOrIndex);
                if (idx === -1) return;
            } else {
                idx = Math.max(0, Math.min(idOrIndex, panels.length - 1));
            }
            this._carousel.currentId = panels[idx];
            this._carouselApplyTransform(true);
            this._carouselRefreshNav();
        },

        _carouselPrev() {
            if (!this._carousel.isActive) return;
            const idx = this._carouselCurrentIndex();
            if (idx > 0) this._carouselGoTo(idx - 1);
        },

        _carouselNext() {
            if (!this._carousel.isActive) return;
            const idx = this._carouselCurrentIndex();
            const panels = this._carouselGetActivePanels();
            if (idx < panels.length - 1) this._carouselGoTo(idx + 1);
        },

        /**
         * Applies the correct translateX to the carousel track.
         * Also JS-manages panel visibility (show/hide) to keep the
         * flex order consistent without CSS class conflicts.
         * @param {boolean} animated - true = CSS transition, false = instant
         */
        _carouselApplyTransform(animated) {
            const track = this._carousel.track;
            const layoutEl = this._carousel.layoutEl;
            if (!track || !layoutEl || !this._carousel.isActive) return;

            const panels = this._carouselGetActivePanels();
            // Show panels that belong in the current deck; hide others.
            // Inline style is used so it can be cleanly reset on mode exit.
            ['queue', 'recent', 'main', 'trending'].forEach(id => {
                const el = this._carousel.panelEls[id];
                if (!el) return;
                el.style.display = panels.includes(id) ? '' : 'none';
            });
            const idx = this._carouselCurrentIndex();

            // Use cached card width — only measure the layout when the cache is stale.
            // getBoundingClientRect() forces a synchronous layout reflow; calling it on
            // every swipe is the primary source of carousel jank. The cache is invalidated
            // in _carouselUpdateMode() whenever a resize event fires.
            if (!this._carousel.cachedCardWidth) {
                this._carousel.cachedCardWidth = layoutEl.getBoundingClientRect().width;
            }
            const cardWidth = this._carousel.cachedCardWidth;
            if (!animated) {
                // Instant snap — suppress the CSS transition, apply the new position,
                // then restore the transition in the next rAF so subsequent swipes
                // still animate. A single rAF is sufficient because transition:none and
                // the new transform are both committed in the same synchronous style
                // update; the browser processes them together with no animation.
                // This replaces the old `void track.offsetWidth` forced-reflow hack.
                track.style.transition = 'none';
                track.style.transform  = `translateX(${-idx * cardWidth}px)`;
                requestAnimationFrame(() => { track.style.transition = ''; });
            } else {
                track.style.transform = `translateX(${-idx * cardWidth}px)`;
            }
        },

        /** Re-renders the dot indicators to match the current deck state. */
        _carouselUpdateDots() {
            const dotsEl = this._carousel.dotsEl;
            if (!dotsEl) return;
            const panels     = this._carouselGetActivePanels();
            const currentIdx = this._carouselCurrentIndex();
            const labels     = { queue: 'Queue', recent: 'Recent', main: 'Main', trending: 'Trending' };
            // Fast path: panel count is unchanged (normal navigation).
            // Toggle the active class on existing dot elements — no DOM creation at all.
            // The slow rebuild path only runs when multi-select is toggled (Queue card
            // enters or leaves the deck), which is rare.
            const existingDots = dotsEl.children;
            if (existingDots.length === panels.length) {
                for (let i = 0; i < existingDots.length; i++) {
                    existingDots[i].classList.toggle('active', i === currentIdx);
                }
                return;
            }

            // Slow path: panel count changed — rebuild from scratch with a fragment
            dotsEl.textContent = '';
            const frag = document.createDocumentFragment();
            panels.forEach((id, i) => {
                const dot = document.createElement('button');
                dot.className = `${CONFIG.UI_PREFIX}-carousel-dot${i === currentIdx ? ' active' : ''}`;
                dot.setAttribute('aria-label', `Go to ${labels[id] || id} panel`);
                dot.onclick = () => this._carouselGoTo(i);
                frag.appendChild(dot);
            });
            dotsEl.appendChild(frag);
        },

        /** Dims the prev/next arrow that would navigate past the deck edge. */
        _carouselUpdateArrows() {
            const { arrowPrev, arrowNext } = this._carousel;
            if (!arrowPrev || !arrowNext) return;
            const idx    = this._carouselCurrentIndex();
            const panels = this._carouselGetActivePanels();
            arrowPrev.classList.toggle('edge-disabled', idx === 0);
            arrowNext.classList.toggle('edge-disabled', idx >= panels.length - 1);
        },

        /**
         * Updates the "View Queue →" pill on the Main card.
         * Shown only in carousel mode when multi-select is active, queue has
         * items, and the user is currently on the Main card.
         */
        _carouselUpdatePill() {
            const pill = this._carousel.pillEl;
            if (!pill) return;
            const count = this.cart ? this.cart.length : 0;
            const show  = this._carousel.isActive &&
                          this.isMultiSelectMode &&
                          count > 0 &&
                          this._carousel.currentId === 'main';
            const label = count === 1 ? '1 item in queue' : `${count} items in queue`;
            // Update text node only (SVG arrow is a sibling element in the DOM)
            const textNode = pill.querySelector(`.${CONFIG.UI_PREFIX}-queue-pill-label`);
            if (textNode) textNode.textContent = label;
            pill.classList.toggle('visible', show);
        },

        /** Builds a single arrow button element. */
        /** Refreshes all carousel nav elements (dots, arrows, pill) in one call. */
        _carouselRefreshNav() {
            this._carouselUpdateDots();
            this._carouselUpdateArrows();
            this._carouselUpdatePill();
        },

        _buildCarouselArrow(direction) {
            const btn = document.createElement('button');
            btn.className = `${CONFIG.UI_PREFIX}-carousel-arrow ${direction}`;
            btn.setAttribute('aria-label', direction === 'prev' ? 'Previous panel' : 'Next panel');
            // Material chevron paths
            const pathD = direction === 'prev'
                ? 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z'
                : 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z';
            btn.appendChild(this._createSVG(pathD));
            btn.onclick = (e) => {
                e.stopPropagation();
                direction === 'prev' ? this._carouselPrev() : this._carouselNext();
            };
            return btn;
        },

        /** Builds the dot-indicator container (populated by _carouselUpdateDots). */
        _buildCarouselDots() {
            const el = document.createElement('div');
            el.className = `${CONFIG.UI_PREFIX}-carousel-dots`;
            return el;
        },

        /**
         * Attaches all input handlers for carousel navigation.
         * Covers: touch swipe · mouse drag · trackpad wheel · (keyboard handled in bindEvents)
         */
        _carouselSetupInputs(trackEl, layoutEl) {
            // ── Touch: swipe ────────────────────────────────────────────────
            let touchStartX = 0, touchStartY = 0;
            trackEl.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
            trackEl.addEventListener('touchend', (e) => {
                if (!this._carousel.isActive) return;
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                // Trigger only on clearly horizontal swipes (angle < ~40°)
                if (Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 45) {
                    if (dx < 0) this._carouselNext();
                    else        this._carouselPrev();
                }
            }, { passive: true });
            // ── Mouse: drag (desktop narrow mode) ───────────────────────────
            let mouseStartX = 0, mouseDragging = false;
            trackEl.addEventListener('mousedown', (e) => {
                if (!this._carousel.isActive) return;
                mouseStartX  = e.clientX;
                mouseDragging = true;
            });
            // Prevent text-selection cursor during drag
            trackEl.addEventListener('mousemove', (e) => {
                if (mouseDragging) e.preventDefault();
            });
            // mouseup must be on document to catch drags that end outside track
            this._carousel._mouseUpHandler = (e) => {
                if (!mouseDragging) return;
                mouseDragging = false;
                if (!this._carousel.isActive) return;
                const dx = e.clientX - mouseStartX;
                if (Math.abs(dx) > 60) {
                    if (dx < 0) this._carouselNext();
                    else        this._carouselPrev();
                }
            };
            document.addEventListener('mouseup', this._carousel._mouseUpHandler);

            // ── Trackpad / wheel horizontal scroll ───────────────────────────
            // passive:false required for e.preventDefault() on horizontal swipe
            layoutEl.addEventListener('wheel', (e) => {
                if (!this._carousel.isActive) return;
                const absX = Math.abs(e.deltaX);
                const absY = Math.abs(e.deltaY);
                // Ignore predominantly vertical scrolls (mouse wheel, page scroll)
                if (absX < absY * 0.5 || absX < 15) return;
                e.preventDefault();
                const deltaX = e.deltaX; // capture before setTimeout
                clearTimeout(this._carousel.wheelTimer);
                // Debounce: trackpads fire dozens of events per gesture
                this._carousel.wheelTimer = setTimeout(() => {
                    if (deltaX > 0) this._carouselNext();
                    else        this._carouselPrev();
                }, 60);
            }, { passive: false });
        },

        /**
         * Master carousel initialiser — called once after render() builds the DOM.
         * Attaches input handlers and performs the initial responsive mode check.
         */
        _carouselInit() {
            const layoutEl = this._carousel.layoutEl;
            const trackEl  = this._carousel.track;
            if (!layoutEl || !trackEl) return;

            this._carouselSetupInputs(trackEl, layoutEl);
            // Debounced resize handler — switches carousel on/off at the breakpoint
            this._carousel._resizeHandler = Utils.debounce(() => {
                this._carouselUpdateMode();
            }, 120);
            window.addEventListener('resize', this._carousel._resizeHandler);

            // Synchronous initial check so carousel state is set before first paint
            this._carouselUpdateMode();
            this._updatePanelCloseButtonVisibility();
        },

        /**
         * Evaluates viewport width and activates or deactivates carousel mode.
         * Called on init and on every debounced resize event.
         */
        _carouselUpdateMode() {
            const layoutEl = this._carousel.layoutEl;
            if (!layoutEl) return;

            // Always invalidate the cached card width on resize — the layout may
            // have changed dimensions even if the mode hasn't switched.
            this._carousel.cachedCardWidth = 0;

            const shouldBeCarousel = window.innerWidth <= this._carousel.breakpointPx;
            const wasActive = this._carousel.isActive;
            if (shouldBeCarousel === wasActive) {
                // Same mode — re-apply layout in case a resize changed card width
                if (shouldBeCarousel) {
                    this._carouselApplyTransform(false);
                    this._carouselRefreshNav();
                }
                return;
            }

            // Guard against overlapping mode-switch calls that can occur when the
            // viewport is resized repeatedly near the breakpoint. Without this,
            // each resize fires a new 180 ms timeout that mutates the same elements.
            if (this._carousel.isSwitching) return;
            this._carousel.isSwitching = true;

            // ── Mode-switch transition ─────────────────────────────────────
            // Simple opacity fade: add switching class (opacity:0, no pointer
            // events), perform the structural changes while invisible, then
            // remove the switching class so the layout fades back in.
            const P = CONFIG.UI_PREFIX;
            const switchingClass = `${P}-mode-switching`;

            layoutEl.classList.add(switchingClass);

            // Wait for the fade-out transition to complete (matches CSS 0.18s)
            const FADE_MS = 180;
            setTimeout(() => {
                // Perform structural mode switch while invisible
                layoutEl.classList.toggle(`${P}-carousel`, shouldBeCarousel);
                this._carousel.isActive = shouldBeCarousel;
                this._updatePanelCloseButtonVisibility();

                if (!shouldBeCarousel) {
                    ['queue', 'recent', 'main', 'trending'].forEach(id => {
                        const el = this._carousel.panelEls[id];
                        if (el) el.style.display = '';
                    });
                    const track = this._carousel.track;
                    if (track) { track.style.transform = ''; track.style.transition = ''; }
                } else {
                    // Re-measure width after class swap so the first snap uses correct dimensions
                    this._carousel.cachedCardWidth = 0;
                    this._carouselApplyTransform(false);
                    this._carouselRefreshNav();
                }

                // One rAF to let the browser commit the new layout,
                // then remove the switching class to trigger the fade-in.
                requestAnimationFrame(() => {
                    layoutEl.classList.remove(switchingClass);
                    this._carousel.isSwitching = false;
                });
            }, FADE_MS);
        },

        /**
         * Called when multi-select is activated (user stays on Main card).
         * Updates the deck to include Queue card, shows the pill, shows hint once.
         */
        _carouselOnMultiSelectActivate() {
            if (!this._carousel.isActive) return;
            // Stay on Main — queue is reachable via pill or swipe
            this._carouselRefreshNav();
            // One-time discoverable hint for first-time users
            if (!GM_getValue(`${CONFIG.STORAGE_PREFIX}_carousel_hint_shown`, false)) {
                GM_setValue(`${CONFIG.STORAGE_PREFIX}_carousel_hint_shown`, true);
                this.showToast('Your queue is a swipe away — slide left to view it.', 'info');
            }
        },

        /**
         * Called at the START of exitMultiSelectMode(), before isMultiSelectMode
         * is set to false. If the user was viewing the Queue card, snaps back to
         * Main instantly (Queue is about to disappear from the deck).
         */
        _carouselOnMultiSelectDeactivate() {
            if (!this._carousel.isActive) return;
            if (this._carousel.currentId === 'queue') {
                this._carousel.currentId = 'main';
            }
            // isMultiSelectMode is still true here, so _carouselGetActivePanels()
            // still includes 'queue'. We snap without animation so the queue card
            // disappears cleanly when its CSS reveal class is removed.
            this._carouselApplyTransform(false);
            // Defer UI update until after exitMultiSelectMode sets isMultiSelectMode=false
            requestAnimationFrame(() => {
                this._carouselApplyTransform(false);
                this._carouselRefreshNav();
            });
        },

        /** Tears down all carousel listeners and resets state for the next showMenu(). */
        _carouselDestroy() {
            if (this._carousel._resizeHandler) {
                window.removeEventListener('resize', this._carousel._resizeHandler);
                this._carousel._resizeHandler = null;
            }
            if (this._carousel._mouseUpHandler) {
                document.removeEventListener('mouseup', this._carousel._mouseUpHandler);
                this._carousel._mouseUpHandler = null;
            }
            clearTimeout(this._carousel.wheelTimer);
            // Reset mutable state so the next render() starts clean
            this._carousel.isActive       = false;
            this._carousel.currentId      = 'main';
            this._carousel.panelEls       = {};
            this._carousel.layoutEl       = null;
            this._carousel.clip           = null;
            this._carousel.track          = null;
            this._carousel.arrowPrev      = null;
            this._carousel.arrowNext      = null;
            this._carousel.dotsEl         = null;
            this._carousel.pillEl         = null;
            this._carousel.closeButtons   = null;
            this._carousel.cachedCardWidth = 0;
            this._carousel.isSwitching    = false;
        },

        injectGlobals() {
            if (!document.getElementById(`${CONFIG.UI_PREFIX}-fab`)) {
                this.fab = document.createElement('div');
                this.fab.id = `${CONFIG.UI_PREFIX}-fab`;
                this.fab.className = `${CONFIG.UI_PREFIX}-fab`;
                this.fab.title = "Open Download Manager (Ctrl+S)";
                // Liquid-glass depth layers — purely visual, sit behind the icon.
                // Styling only: does not touch existing click/drag behavior below.
                const glassScatter = document.createElement('div');
                glassScatter.className = `${CONFIG.UI_PREFIX}-fab-glass-scatter`;
                const glassChroma = document.createElement('div');
                glassChroma.className = `${CONFIG.UI_PREFIX}-fab-glass-chroma`;
                const glassRim = document.createElement('div');
                glassRim.className = `${CONFIG.UI_PREFIX}-fab-glass-rim`;
                this.fab.appendChild(glassScatter);
                this.fab.appendChild(glassChroma);
                this.fab.appendChild(glassRim);
                const iconWrapper = document.createElement('span');
                iconWrapper.className = `${CONFIG.UI_PREFIX}-fab-icon-wrapper`;
                iconWrapper.appendChild(this._createSVG(ICONS.fab));
                this.fab.appendChild(iconWrapper);

                this.fab.onclick = () => this.showMenu();
                Utils.makeFocusable(this.fab);
                // Visual-only ripple on press — does not interfere with the
                // click handler above or the drag-to-corner logic below.
                this.fab.addEventListener('pointerdown', (e) => this._spawnFabRipple(e));

                // Set initial default placement explicitly to match initial state
                this.fab.style.top = 'calc(100vh - 6rem)';
                this.fab.style.left = 'calc(100vw - 6rem)';

                document.body.appendChild(this.fab);
            }
            if (!document.getElementById(`${CONFIG.UI_PREFIX}-toast-wrapper`)) {
                this.toastContainer = document.createElement('div');
                this.toastContainer.id = `${CONFIG.UI_PREFIX}-toast-wrapper`;
                document.body.appendChild(this.toastContainer);
            }
        },

        /**
         * Spawns a single expanding ripple circle at the pointer's position
         * within the FAB, then removes itself after the animation completes.
         * Purely decorative — no state, no behavior, self-cleaning.
         * @param {PointerEvent} e
         */
        _spawnFabRipple(e) {
            if (!this.fab) return;
            const rect = this.fab.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = `${CONFIG.UI_PREFIX}-fab-ripple`;
            ripple.style.left = `${e.clientX - rect.left}px`;
            ripple.style.top = `${e.clientY - rect.top}px`;
            this.fab.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        },

        updateFABPosition(cursorX, cursorY) {
            if (!this.fab) return;
            const halfW = window.innerWidth / 2;
            const halfH = window.innerHeight / 2;
            let newQuad = (cursorY < halfH ? 'N' : 'S') + (cursorX < halfW ? 'W' : 'E');
            if (newQuad !== this.fabTargetQuad) {
                this.fabTargetQuad = newQuad;
                this.processFABMove();
            }
        },

        processFABMove() {
            // Block execution if currently performing a node traverse.
            // Ensures intermediate legs must complete before recalculating paths.
            if (this.fabIsAnimating || this.fabCurrentQuad === this.fabTargetQuad) return;

            let nextQuad;
            if (this.fabCurrentQuad[0] === this.fabTargetQuad[0] || this.fabCurrentQuad[1] === this.fabTargetQuad[1]) {
                // Adjacent quadrant found (sharing an axis). Travel directly.
                nextQuad = this.fabTargetQuad;
            } else {
                // Diagonal quadrant target identified.
                // Enforce strict perimeter routing by traveling horizontally to adjacent intermediate node first.
                nextQuad = this.fabCurrentQuad[0] + this.fabTargetQuad[1];
            }

            this.fabIsAnimating = true;
            const targetTop = nextQuad[0] === 'N' ? '2.5rem' : 'calc(100vh - 6rem)';
            const targetLeft = nextQuad[1] === 'W' ? '2.5rem' : 'calc(100vw - 6rem)';

            const isFinalLeg = nextQuad === this.fabTargetQuad;
            const easing = isFinalLeg ? 'cubic-bezier(0.25, 0.8, 0.25, 1)' : 'linear';

            this.fab.style.transition = `top 0.2s ${easing}, left 0.2s ${easing}, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease`;
            this.fab.style.top = targetTop;
            this.fab.style.left = targetLeft;

            setTimeout(() => {
                this.fabCurrentQuad = nextQuad;
                this.fabIsAnimating = false;
                this.processFABMove(); // Fire again to clear queue or re-evaluate latest mouse position
            }, 200);
        },

        manageToastCount() {
            if (!this.toastContainer) return;
            while (this.toastContainer.childElementCount >= CONFIG.MAX_ACTIVE_TOASTS) {
                const oldest = this.toastContainer.firstElementChild;
                if (oldest) oldest.remove();
            }
        },

        createDownloadToast(filename) {
            if (!this.toastContainer) return null;
            this.manageToastCount();

            const toast = document.createElement('div');
            toast.className = `${CONFIG.UI_PREFIX}-toast ${CONFIG.UI_PREFIX}-dl-toast`;

            const dlInfo   = document.createElement('div');
            dlInfo.className = `${CONFIG.UI_PREFIX}-dl-info`;
            const dlTitle  = document.createElement('div');
            dlTitle.className = `${CONFIG.UI_PREFIX}-dl-title`;
            dlTitle.textContent = `Saving: ${filename}`;
            const dlStatus = document.createElement('div');
            dlStatus.className = `${CONFIG.UI_PREFIX}-dl-status`;
            dlStatus.textContent = 'Initializing stream...';
            dlInfo.appendChild(dlTitle);
            dlInfo.appendChild(dlStatus);
            const progBg   = document.createElement('div');
            progBg.className = `${CONFIG.UI_PREFIX}-progress-bg`;
            const progFill = document.createElement('div');
            progFill.className = `${CONFIG.UI_PREFIX}-progress-fill`;
            progBg.appendChild(progFill);
            toast.appendChild(dlInfo);
            toast.appendChild(progBg);
            toast.style.animation = 'tmToastFadeIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';

            this.toastContainer.appendChild(toast);
            return { el: toast, fill: progFill, status: dlStatus };
        },

        updateDownloadToast(toastObj, loaded, total, customMessage) {
            if (!toastObj || !toastObj.el) return;
            if (customMessage) {
                toastObj.status.textContent = customMessage;
                return;
            }
            if (total && total > 0) {
                const percent = Math.min(100, Math.round((loaded / total) * 100));
                toastObj.fill.style.width = `${percent}%`;
                toastObj.status.textContent = `${Utils.formatBytes(loaded)} / ${Utils.formatBytes(total)} (${percent}%)`;
            } else {
                toastObj.fill.style.width = '100%';
                toastObj.fill.style.background = 'var(--tm-text-subtle)';
                toastObj.status.textContent = `${Utils.formatBytes(loaded)} buffered...`;
            }
        },

        finishDownloadToast(toastObj, type, message) {
            if (!toastObj || !toastObj.el) return;
            toastObj.el.classList.add(type);
            toastObj.fill.style.width = '100%';

            if (type === 'success') {
                toastObj.status.textContent = message || 'Complete!';
            } else {
                toastObj.status.textContent = message || 'Failed';
            }

            setTimeout(() => {
                if (toastObj.el && toastObj.el.parentNode) {
                    toastObj.el.style.animation = 'tmToastFadeOut 0.3s ease forwards';
                    setTimeout(() => {
                        if (toastObj.el.parentNode) toastObj.el.remove();
                    }, 300);
                }
            }, 3000);
        },

        showToast(message, type = 'info') {
            if (!this.toastContainer) return;
            this.manageToastCount();

            const toast = document.createElement('div');
            toast.className = `${CONFIG.UI_PREFIX}-toast ${type}`;
            toast.textContent = message;
            toast.style.animation = 'tmToastFadeIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
            this.toastContainer.appendChild(toast);
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.style.animation = 'tmToastFadeOut 0.3s ease forwards';
                    setTimeout(() => {
                        if (toast.parentNode) toast.remove();
                    }, 300);
                }
            }, 3000);
        },

        startAutoCloseSequence(skipCloudSync = false) {
            this.manageToastCount();
            let toast = document.createElement('div');
            if (this.toastContainer) this.toastContainer.appendChild(toast);

            let actionText = 'Saved!';
            if (!skipCloudSync && CloudAPI.isValid() && !CloudAPI.isRateLimited()) {
                actionText = 'Queued for Cloud!';
                toast.style.borderLeftColor = 'var(--tm-warning)';
            } else if (skipCloudSync) {
                actionText = 'Saved Locally!';
                toast.style.borderLeftColor = 'var(--tm-danger)';
            }

            const duration = CONFIG.AUTO_CLOSE_COUNTDOWN_MS;
            toast.className = `${CONFIG.UI_PREFIX}-toast ${CONFIG.UI_PREFIX}-dl-toast`;
            toast.style.animation = `tmToastFadeIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, tmCountdownBorder ${duration}ms linear forwards`;
            const rowDiv    = document.createElement('div');
            rowDiv.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;gap:1rem;';
            const textSpan  = document.createElement('span');
            textSpan.className = `${CONFIG.UI_PREFIX}-countdown-text`;
            textSpan.style.fontWeight = '500';
            textSpan.textContent = `${actionText} Closing in ${Math.ceil(duration / 1000)}s...`;
            const cancelBtn = document.createElement('button');
            cancelBtn.className = `${CONFIG.UI_PREFIX}-cancel-btn`;
            cancelBtn.textContent = 'Cancel';
            rowDiv.appendChild(textSpan);
            rowDiv.appendChild(cancelBtn);
            const progBg2   = document.createElement('div');
            progBg2.className = `${CONFIG.UI_PREFIX}-progress-bg`;
            const fill      = document.createElement('div');
            fill.className  = `${CONFIG.UI_PREFIX}-progress-fill`;
            progBg2.appendChild(fill);
            toast.appendChild(rowDiv);
            toast.appendChild(progBg2);

            let isCancelled = false;
            const startTime = Date.now();
            fill.style.animation = `tmCountdownFill ${duration}ms linear forwards, tmCountdownWidth ${duration}ms linear forwards`;
            const interval = setInterval(() => {
                if (isCancelled) return;
                const remaining = Math.max(0, duration - (Date.now() - startTime));
                textSpan.textContent = `${actionText} Closing in ${Math.ceil(remaining / 1000)}s...`;
            }, 100);
            const closeTimeout = setTimeout(async () => {
                clearInterval(interval);
                if (!isCancelled) {
                    await Storage._taskQueue;
                    try { window.close(); } catch (e) { Logger.warn("Window close blocked by browser."); }
                }
            }, duration);
            cancelBtn.onclick = () => {
                isCancelled = true;
                clearInterval(interval);
                clearTimeout(closeTimeout);

                const currentBorder = window.getComputedStyle(toast).borderLeftColor;
                const currentBg = window.getComputedStyle(fill).backgroundColor;
                const currentWidth = window.getComputedStyle(fill).width;

                toast.style.animation = 'none';
                fill.style.animation = 'none';
                toast.style.borderLeftColor = currentBorder;
                fill.style.backgroundColor = currentBg;
                fill.style.width = currentWidth;

                textSpan.textContent = "Auto-close cancelled.";
                cancelBtn.remove();
                setTimeout(() => {
                    if (toast && toast.parentNode) {
                        toast.style.animation = 'tmToastFadeOut 0.3s ease forwards';
                        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
                    }
                }, 2000);
            };
        },

        updateSyncTimeUI() {
            const timeEl = document.getElementById(`${CONFIG.UI_PREFIX}-sync-time`);
            if (!timeEl) return;
            const lastSync = GM_getValue(`${CONFIG.UI_PREFIX}_last_sync_time`, 0);
            if (!lastSync) {
                timeEl.textContent = '(last synced: never)';
                timeEl.title = 'No successful sync yet.';
            } else {
                timeEl.textContent = `(last synced: ${Utils.timeAgo(lastSync)})`;
                timeEl.title = new Date(lastSync).toLocaleString();
            }
        },

        updateHistoryDeleteBtn() {
            const btn = document.getElementById(`${CONFIG.UI_PREFIX}-history-delete-btn`);
            if (!btn) return;

            if (this.historySelected.size > 0) {
                btn.disabled = false;
                btn.textContent = `Delete Selected (${this.historySelected.size})`;
            } else {
                btn.disabled = true;
                btn.textContent = `Delete Selected`;
            }
        },

        _renderSidePanelVirtual(type) {
            const panelObj = this.sidePanels[type];
            if (!panelObj.container || !panelObj.inner) return;

            const totalItems = panelObj.data.length;
            const emptyMsg = type === 'recent' ? (this.recentPanelMode === 'history' ? 'No history found.' : 'No recent saves.') : 'No data for this month.';
            if (totalItems === 0) {
                panelObj.inner.style.height = '100%';
                panelObj.inner.textContent = '';
                const emptyState = document.createElement('div');
                emptyState.className = `${CONFIG.UI_PREFIX}-empty-state`;
                emptyState.textContent = emptyMsg;
                panelObj.inner.appendChild(emptyState);
                return;
            }

            const itemHeight = CONFIG.VIRTUAL_ITEM_HEIGHT;
            panelObj.inner.style.height = `${totalItems * itemHeight}px`;

            const scrollTop = panelObj.container.scrollTop;
            const contHeight = panelObj.cachedHeight || 400;
            const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
            const endIndex = Math.min(totalItems, Math.floor((scrollTop + contHeight) / itemHeight) + 5);
            panelObj.inner.textContent = '';
            const fragment = document.createDocumentFragment();

            for (let i = startIndex; i < endIndex; i++) {
                const itemData = panelObj.data[i];
                const btn = document.createElement('div');
                btn.className = `${CONFIG.UI_PREFIX}-item`;
                btn.style.transform = `translate3d(0, ${i * itemHeight}px, 0)`;
                btn.dataset.index = i;
                if (type === 'recent' && this.recentPanelMode === 'history') {
                    const id = `${itemData.t}-${itemData.g}-${itemData.n}`;
                    if (this.historySelected.has(id)) {
                        btn.classList.add(`${CONFIG.UI_PREFIX}-history-selected`);
                    }

                    // Build history item with DOM APIs — avoids innerHTML parsing overhead
                    // and eliminates any XSS surface from stored group/member names.
                    const histLeftDiv = document.createElement('div');
                    histLeftDiv.style.cssText = 'display:flex;align-items:center;gap:0.5rem;overflow:hidden;';

                    const histRemoveBtn = document.createElement('button');
                    histRemoveBtn.className = `${CONFIG.UI_PREFIX}-queue-remove`;
                    histRemoveBtn.dataset.id = id;
                    histRemoveBtn.textContent = '✕';
                    const histNameSpan = document.createElement('span');
                    histNameSpan.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                    histNameSpan.textContent = itemData.n;

                    histLeftDiv.appendChild(histRemoveBtn);
                    histLeftDiv.appendChild(histNameSpan);

                    const histBadge = document.createElement('span');
                    histBadge.className = `${CONFIG.UI_PREFIX}-badge accent`;
                    histBadge.style.flexShrink = '0';
                    histBadge.textContent = itemData.g;

                    btn.appendChild(histLeftDiv);
                    btn.appendChild(histBadge);
                } else {
                    const isTrendingGroupMode = type === 'trending' && this.sidePanels.trending.viewMode === 'group';
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = isTrendingGroupMode ? itemData.g : itemData.n;
                    // Bugs 2+3 fix: show pink selection state in side panels too,
                    // synced with the cart exactly like the main list does.
                    // Group-mode rows have no single member to select — skip entirely.
                    const isInCart = !isTrendingGroupMode && this.isMultiSelectMode &&
                        this.cart.some(c => c.g === itemData.g && c.n === itemData.n);
                    if (isInCart) btn.classList.add(`${CONFIG.UI_PREFIX}-item-selected`);

                    let badgeText, badgeClass;
                    if (isTrendingGroupMode) {
                        // Group name is already the row's label — badge is just the count.
                        // Not marked actionable: the whole row already drills in on click.
                        badgeText = `${itemData.count}x`;
                        badgeClass = `${CONFIG.UI_PREFIX}-badge accent`;
                    } else {
                        badgeText = type !== 'recent' ? `${itemData.count}x • ${itemData.g}` : itemData.g;
                        badgeClass = type !== 'recent' ? `${CONFIG.UI_PREFIX}-badge accent ${CONFIG.UI_PREFIX}-badge-actionable` : `${CONFIG.UI_PREFIX}-badge ${CONFIG.UI_PREFIX}-badge-actionable`;
                    }
                    const badgeSpan = document.createElement('span');
                    badgeSpan.className = badgeClass;
                    badgeSpan.textContent = badgeText;
                    if (!isTrendingGroupMode) badgeSpan.title = `View ${itemData.g}`;

                    const rightWrapper = document.createElement('div');
                    rightWrapper.style.display = 'flex';
                    rightWrapper.style.alignItems = 'center';
                    rightWrapper.style.gap = '0.4rem';

                    if (isInCart) {
                        const check = document.createElement('span');
                        check.className = `${CONFIG.UI_PREFIX}-cart-check`;
                        check.textContent = '✓';
                        rightWrapper.appendChild(check);
                    }

                    rightWrapper.appendChild(badgeSpan);
                    btn.appendChild(nameSpan);
                    btn.appendChild(rightWrapper);
                }

                fragment.appendChild(btn);
            }
            panelObj.inner.appendChild(fragment);
        },

        createRecentHistoryPanel() {
            const panel = document.createElement('div');
            panel.id = `${CONFIG.UI_PREFIX}-left-panel`;
            panel.className = `${CONFIG.UI_PREFIX}-panel ${CONFIG.UI_PREFIX}-side left`;

            const header = document.createElement('div');
            header.className = `${CONFIG.UI_PREFIX}-header`;

            const leftGroup = document.createElement('div');
            leftGroup.className = `${CONFIG.UI_PREFIX}-header-left`;
            leftGroup.style.flexDirection = 'column';
            leftGroup.style.alignItems = 'flex-start';
            leftGroup.style.gap = '0';

            const title = document.createElement('h2');
            title.className = `${CONFIG.UI_PREFIX}-icon-title`;
            /**
             * Rebuilds the title's icon+text in place — needed because this
             * h2 toggles between two states (Recent/Raw History) rather than
             * being built once like other panel titles.
             */
            const setTitle = (iconPathD, text) => {
                title.replaceChildren();
                const icon = this._createSVG(iconPathD);
                icon.classList.add(`${CONFIG.UI_PREFIX}-icon-title-svg`);
                title.appendChild(icon);
                title.appendChild(document.createTextNode(text));
            };
            setTitle(ICONS.recent, 'Recent');

            const subtitle = document.createElement('div');
            subtitle.id = `${CONFIG.UI_PREFIX}-sync-time`;
            subtitle.className = `${CONFIG.UI_PREFIX}-history-subtitle`;
            leftGroup.appendChild(title);
            leftGroup.appendChild(subtitle);
            const rightGroup = document.createElement('div');
            rightGroup.className = `${CONFIG.UI_PREFIX}-header-right`;

            const toggleBtn = document.createElement('div');
            toggleBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
            Utils.makeFocusable(toggleBtn);
            toggleBtn.title = "View Raw History";
            toggleBtn.appendChild(this._createSVG(ICONS.history));
            toggleBtn.onclick = () => {
                this.recentPanelMode = this.recentPanelMode === 'recent' ? 'history' : 'recent';
                this.historySelected.clear();

                if (this.recentPanelMode === 'history') {
                    setTitle(ICONS.history, 'Raw History');
                    subtitle.style.display = 'block';
                    toggleBtn.replaceChildren();
                    toggleBtn.appendChild(this._createSVG(ICONS.recent));
                    toggleBtn.title = "View Recent";
                    footer.style.display = 'flex';
                } else {
                    setTitle(ICONS.recent, 'Recent');
                    subtitle.style.display = 'none';
                    toggleBtn.replaceChildren();
                    toggleBtn.appendChild(this._createSVG(ICONS.history));
                    toggleBtn.title = "View Raw History";
                    footer.style.display = 'none';
                }

                this.refreshSidePanels();
                this.updateHistoryDeleteBtn();
            };

            rightGroup.appendChild(toggleBtn);
            rightGroup.appendChild(this._createPanelCloseBtn('recent'));
            header.appendChild(leftGroup);
            header.appendChild(rightGroup);
            panel.appendChild(header);

            const wrapper = document.createElement('div');
            wrapper.className = `${CONFIG.UI_PREFIX}-list-wrapper`;

            const list = document.createElement('div');
            list.className = `${CONFIG.UI_PREFIX}-list`;
            const inner = document.createElement('div');
            inner.className = `${CONFIG.UI_PREFIX}-list-inner`;

            list.appendChild(inner);
            wrapper.appendChild(list);

            this.sidePanels['recent'].wrapper = wrapper;
            this.sidePanels['recent'].container = list;
            this.sidePanels['recent'].inner = inner;
            list.addEventListener('scroll', () => {
                requestAnimationFrame(() => this._renderSidePanelVirtual('recent'));
            });
            inner.addEventListener('click', (e) => {
                if (this.recentPanelMode === 'history') {
                    const removeBtn = e.target.closest(`.${CONFIG.UI_PREFIX}-queue-remove`);
                    const itemEl = e.target.closest(`.${CONFIG.UI_PREFIX}-item`);

                    if (removeBtn || itemEl) {
                        e.stopPropagation();
                        let id;
                        if (removeBtn) {
                            id = removeBtn.dataset.id;
                        } else {
                            const index = parseInt(itemEl.dataset.index, 10);
                            const itemData = this.sidePanels.recent.data[index];
                            id = `${itemData.t}-${itemData.g}-${itemData.n}`;
                        }

                        if (this.historySelected.has(id)) {
                            this.historySelected.delete(id);
                        } else {
                            this.historySelected.add(id);
                        }
                        this._renderSidePanelVirtual('recent');
                        this.updateHistoryDeleteBtn();
                    }
                    return;
                }

                const badge = e.target.closest(`.${CONFIG.UI_PREFIX}-badge-actionable`);
                if (badge) {
                    e.stopPropagation();
                    const index = parseInt(badge.closest(`.${CONFIG.UI_PREFIX}-item`).dataset.index, 10);
                    const itemData = this.sidePanels['recent'].data[index];
                    this._openGroupInMainPanel(itemData.g);
                    return;
                }

                const itemEl = e.target.closest(`.${CONFIG.UI_PREFIX}-item`);
                if (itemEl) {
                    const index = parseInt(itemEl.dataset.index, 10);
                    const itemData = this.sidePanels['recent'].data[index];

                    if (this.isMultiSelectMode) {
                        const idx = this.cart.findIndex(c => c.g === itemData.g && c.n === itemData.n);
                        if (idx === -1) {
                            this.cart.push({ g: itemData.g, n: itemData.n });
                        } else {
                            this.cart.splice(idx, 1);
                        }
                        this.renderCart();
                    } else {
                        Downloader.executeIdolSave(itemData.g, itemData.n);
                    }
                }
            });
            panel.appendChild(wrapper);

            const footer = document.createElement('div');
            footer.className = `${CONFIG.UI_PREFIX}-panel-footer`;

            const deleteBtn = document.createElement('button');
            deleteBtn.id = `${CONFIG.UI_PREFIX}-history-delete-btn`;
            deleteBtn.className = `${CONFIG.UI_PREFIX}-history-delete-btn`;
            deleteBtn.textContent = 'Delete Selected';
            deleteBtn.disabled = true;

            deleteBtn.onclick = () => {
                if (this.historySelected.size === 0) return;
                Storage.deleteRawHistory(this.historySelected);
                this.historySelected.clear();
                this.updateHistoryDeleteBtn();
                this.refreshSidePanels();
            };

            footer.appendChild(deleteBtn);
            panel.appendChild(footer);

            return panel;
        },

        /**
         * Shared close-button factory — every carousel panel (Main, Queue,
         * Recent, Trending) uses this exact same button, always appended
         * last in its header's right-side group, so the close action sits
         * in an identical top-right position across every panel.
         *
         * On desktop (multiple panels visible side-by-side), only Main's
         * close button should be visible — one close action, not four. On
         * carousel/mobile (one panel visible at a time), each panel needs
         * its own. Passing panelId registers the button so
         * _updatePanelCloseButtonVisibility() can toggle it; Main's call
         * omits panelId so it's never hidden.
         * @param {string} [panelId] - 'queue' | 'recent' | 'trending'
         * @returns {HTMLDivElement}
         */
        _createPanelCloseBtn(panelId) {
            const closeBtn = document.createElement('div');
            closeBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
            closeBtn.appendChild(this._createSVG(ICONS.close));
            closeBtn.title = "Close";
            closeBtn.setAttribute('tabindex', '0');
            closeBtn.setAttribute('role', 'button');
            closeBtn.setAttribute('aria-label', 'Close panel');
            closeBtn.onclick = () => this.closeMenu();
            closeBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.closeMenu(); }
            });
            if (panelId) {
                if (!this._carousel.closeButtons) this._carousel.closeButtons = {};
                this._carousel.closeButtons[panelId] = closeBtn;
            }
            return closeBtn;
        },

        /**
         * Shows/hides the Queue/Recent/Trending close buttons based on
         * layout mode. Desktop (multiple panels visible at once): hidden —
         * Main's single close button is enough. Carousel/mobile (one panel
         * visible at a time): all shown, since whichever panel is currently
         * on-screen needs its own way to close.
         */
        _updatePanelCloseButtonVisibility() {
            if (!this._carousel.closeButtons) return;
            const showAll = this._carousel.isActive;
            Object.values(this._carousel.closeButtons).forEach(btn => {
                btn.style.display = showAll ? '' : 'none';
            });
        },

        /**
         * Builds an icon+text title (monochrome SVG, not emoji) for panel
         * headers — used by every panel so icon styling stays consistent.
         * @param {string} iconPathD - an ICONS.* path
         * @param {string} text
         * @returns {HTMLHeadingElement}
         */
        _createIconTitle(iconPathD, text) {
            const h2 = document.createElement('h2');
            h2.className = `${CONFIG.UI_PREFIX}-icon-title`;
            const icon = this._createSVG(iconPathD);
            icon.classList.add(`${CONFIG.UI_PREFIX}-icon-title-svg`);
            h2.appendChild(icon);
            h2.appendChild(document.createTextNode(text));
            return h2;
        },

        createSidePanel(title, customClass, type, iconPathD) {
            const panel = document.createElement('div');
            panel.className = `${CONFIG.UI_PREFIX}-panel ${CONFIG.UI_PREFIX}-side ${customClass}`;

            const header = document.createElement('div');
            header.className = `${CONFIG.UI_PREFIX}-header`;
            const h2 = iconPathD ? this._createIconTitle(iconPathD, title) : document.createElement('h2');
            if (!iconPathD) h2.textContent = title;
            header.appendChild(h2);

            const rightGroup = document.createElement('div');
            rightGroup.className = `${CONFIG.UI_PREFIX}-header-right`;
            rightGroup.appendChild(this._createPanelCloseBtn(type));
            header.appendChild(rightGroup);

            panel.appendChild(header);
            // Trending panel only: MEMBER/GROUP segmented toggle, sits between
            // the header and the list. Defaults to member view.
            if (type === 'trending') {
                panel.appendChild(this._createTrendingViewToggle());
            }

            const wrapper = document.createElement('div');
            wrapper.className = `${CONFIG.UI_PREFIX}-list-wrapper`;
            const list = document.createElement('div');
            list.className = `${CONFIG.UI_PREFIX}-list`;

            const inner = document.createElement('div');
            inner.className = `${CONFIG.UI_PREFIX}-list-inner`;

            list.appendChild(inner);
            wrapper.appendChild(list);

            this.sidePanels[type].wrapper = wrapper;
            this.sidePanels[type].container = list;
            this.sidePanels[type].inner = inner;
            list.addEventListener('scroll', () => {
                requestAnimationFrame(() => this._renderSidePanelVirtual(type));
            });
            inner.addEventListener('click', (e) => {
                const badge = e.target.closest(`.${CONFIG.UI_PREFIX}-badge-actionable`);
                if (badge) {
                    e.stopPropagation();
                    const index = parseInt(badge.closest(`.${CONFIG.UI_PREFIX}-item`).dataset.index, 10);
                    const itemData = this.sidePanels[type].data[index];
                    this._openGroupInMainPanel(itemData.g);
                    return;
                }

                const itemEl = e.target.closest(`.${CONFIG.UI_PREFIX}-item`);
                if (itemEl) {
                    const index = parseInt(itemEl.dataset.index, 10);
                    const itemData = this.sidePanels[type].data[index];

                    // Trending panel in GROUP mode: rows aren't individual
                    // downloadable members, so the whole row drills into that
                    // group instead of toggling cart/triggering a download.
                    if (type === 'trending' && this.sidePanels.trending.viewMode === 'group') {
                        this._openGroupInMainPanel(itemData.g);
                        return;
                    }

                    if (this.isMultiSelectMode) {
                        const idx = this.cart.findIndex(c => c.g === itemData.g && c.n === itemData.n);
                        if (idx === -1) {
                            this.cart.push({ g: itemData.g, n: itemData.n });
                        } else {
                            this.cart.splice(idx, 1);
                        }
                        this.renderCart();
                    } else {
                        Downloader.executeIdolSave(itemData.g, itemData.n);
                    }
                }
            });
            panel.appendChild(wrapper);
            return panel;
        },

        /**
         * Builds the MEMBER/GROUP segmented toggle for the Trending panel.
         * @returns {HTMLDivElement}
         */
        /**
         * Builds the MEMBER/GROUP sliding toggle for the Trending panel.
         * Visual mechanism: a visually-hidden checkbox drives the slide via a
         * pure CSS `:checked` sibling selector — no JS animates the thumb.
         * Unchecked = Member (default), checked = Group.
         * @returns {HTMLLabelElement}
         */
        _createTrendingViewToggle() {
            const switchLabel = document.createElement('label');
            switchLabel.className = `${CONFIG.UI_PREFIX}-trending-switch`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = `${CONFIG.UI_PREFIX}-trending-switch-checkbox`;
            checkbox.setAttribute('role', 'switch');
            checkbox.setAttribute('aria-label', 'Toggle between member and group view');
            checkbox.checked = this.sidePanels.trending.viewMode === 'group';

            const track = document.createElement('span');
            track.className = `${CONFIG.UI_PREFIX}-trending-switch-track`;
            const labels = document.createElement('span');
            labels.className = `${CONFIG.UI_PREFIX}-trending-switch-labels`;
            labels.setAttribute('aria-hidden', 'true');

            const memberLabel = document.createElement('span');
            memberLabel.className = `${CONFIG.UI_PREFIX}-trending-switch-member`;
            memberLabel.textContent = 'MEMBER';
            const groupLabel = document.createElement('span');
            groupLabel.className = `${CONFIG.UI_PREFIX}-trending-switch-group`;
            groupLabel.textContent = 'GROUP';

            const thumb = document.createElement('span');
            thumb.className = `${CONFIG.UI_PREFIX}-trending-switch-thumb`;

            labels.append(memberLabel, groupLabel);
            track.append(labels, thumb);
            switchLabel.append(checkbox, track);

            /**
             * Switches view mode while preserving each mode's own scroll
             * position — Member and Group render into the same physical
             * scroll container, so without this, scrolling one mode would
             * visibly carry over into the other.
             * @param {'member'|'group'} nextMode
             */
            const switchMode = (nextMode) => {
                const trendingState = this.sidePanels.trending;
                if (trendingState.viewMode === nextMode) return;

                if (trendingState.container) {
                    trendingState.scrollPositions[trendingState.viewMode] = trendingState.container.scrollTop;
                }

                trendingState.viewMode = nextMode;
                // Deferred one frame: refreshSidePanels() rebuilds list content
                // and re-renders virtualized rows — real DOM work. Running it
                // synchronously here competes with the CSS slide transition for
                // the same frame, which is what actually caused the "low FPS"
                // feel (the transition itself was already fine). Deferring lets
                // the browser start compositing the slide immediately; the list
                // rebuild happens a frame later instead of blocking its start.
                requestAnimationFrame(() => {
                    this.refreshSidePanels();
                    if (trendingState.container) {
                        trendingState.container.scrollTop = trendingState.scrollPositions[nextMode] || 0;
                        this._renderSidePanelVirtual('trending');
                    }
                });
            };

            checkbox.addEventListener('change', () => {
                switchMode(checkbox.checked ? 'group' : 'member');
            });
            return switchLabel;
        },

        /**
         * Shared drill-in action: opens a group's members in the main panel.
         * Used by both the badge-click delegation and Trending's group-mode row
         * click — extracted to avoid duplicating the same five lines twice.
         * @param {string} group
         */
        _openGroupInMainPanel(group) {
            this.selectedGroup = group;
            this.currentView = 'members';
            if (this.searchInput) this.searchInput.value = '';

            // Deferred one frame: updateListData() rebuilds and re-renders the
            // virtualized list — real DOM work that would otherwise compete
            // with the glow/carousel-slide animations starting this same
            // frame (the same class of jank fixed for the Trending toggle).
            requestAnimationFrame(() => this.updateListData(''));

            // Brief, self-cleaning glow so the panel change is noticeable
            // even when the content swap itself is easy to miss at a glance.
            const mainContainer = this._carousel.panelEls ? this._carousel.panelEls.main : null;
            const mainPanelBox = mainContainer ? mainContainer.querySelector(`.${CONFIG.UI_PREFIX}-panel`) : null;
            if (mainPanelBox) {
                const glowClass = `${CONFIG.UI_PREFIX}-panel-glow`;
                mainPanelBox.classList.remove(glowClass); // restart cleanly if already mid-animation
                void mainPanelBox.offsetWidth; // force reflow so re-adding the class actually restarts it
                mainPanelBox.classList.add(glowClass);
                mainPanelBox.addEventListener('animationend', () => {
                    mainPanelBox.classList.remove(glowClass);
                }, { once: true });
            }

            // Carousel: jump to Main so the drill-in is actually visible,
            // matching the same guarded pattern used elsewhere.
            if (this._carousel.isActive && this._carousel.currentId !== 'main') {
                this._carouselGoTo('main');
            }
        },

        refreshSidePanels() {
            if (!this.overlay) return;
            if (this.recentPanelMode === 'history') {
                this.sidePanels.recent.data = Storage.getRawHistory();
            } else {
                this.sidePanels.recent.data = Storage.getRecentStats();
            }

            this.sidePanels.trending.data = this.sidePanels.trending.viewMode === 'group'
                ? Storage.getGroupTrendingStats()
                : Storage.getTrendingStats();
            this._renderSidePanelVirtual('recent');
            this._renderSidePanelVirtual('trending');
            this.updateSyncTimeUI();
        },

        // Re-renders all three visible list panels from already-loaded data.
        // Used by renderCart() so cart state changes (add/remove/cancel) are
        // reflected instantly across Main, Recent, and Trending without the
        // heavier Storage reload that refreshSidePanels() performs.
        //
        // Wrapped in a cancel-and-reschedule rAF so that rapid cart toggles
        // (e.g. quickly checking several members) coalesce into a single paint
        // cycle instead of triggering three full list rebuilds per tap.
        _reRenderAllPanels() {
            if (this._pendingRenderFrame !== null) {
                cancelAnimationFrame(this._pendingRenderFrame);
            }
            this._pendingRenderFrame = requestAnimationFrame(() => {
                this._pendingRenderFrame = null;
                this.renderVirtualList();
                this._renderSidePanelVirtual('recent');
                this._renderSidePanelVirtual('trending');
            });
        },

        get currentConfigState() {
            if (!this.configInputs) return {};
            return {
                token: this.configInputs.token.value.trim()
            };
        },

        hasUnsavedChanges() {
            if (!this.initialConfigState || !this.configInputs) return false;
            return JSON.stringify(this.currentConfigState) !== JSON.stringify(this.initialConfigState);
        },

        exitMultiSelectMode() {
            // Notify carousel BEFORE state changes so it can animate away
            // from the Queue card while it is still theoretically active.
            this._carouselOnMultiSelectDeactivate();

            this.isMultiSelectMode = false;
            this.cart = [];

            if (this.cartContainer && this.cartContainer.classList.contains('active')) {
                this.cartContainer.classList.remove('active');
            }

            if (this.multiSelectBtn) {
                this.multiSelectBtn.title = "Select Multiple Members";
                this.multiSelectBtn.replaceChildren();
                this.multiSelectBtn.appendChild(this._createSVG(ICONS.checklist));
                this.multiSelectBtn.style.borderColor = '';
                const svg = this.multiSelectBtn.querySelector('svg');
                if (svg) svg.style.fill = 'var(--tm-text-main)';
                this.multiSelectBtn.classList.remove(`${CONFIG.UI_PREFIX}-multi-active`);
            }
            if (this.stdSaveBtn) {
                this.stdSaveBtn.disabled = false;
            }

            // Bug 2 fix: re-render all panels so pink borders from the
            // just-cleared cart are removed immediately on Cancel.
            this._reRenderAllPanels();
        },

        _renderCartVirtual() {
            if (!this.cartList || !this.cartListInner) return;
            const totalItems = this.cart.length;
            const countEl = document.getElementById(`${CONFIG.UI_PREFIX}-cart-count`);
            if (countEl) countEl.textContent = totalItems;
            if (this.cartSaveBtn) {
                this.cartSaveBtn.disabled = totalItems === 0;
            }
            // Keep the carousel pill count in sync with cart state
            this._carouselUpdatePill();
            if (totalItems === 0) {
                this.cartListInner.style.height = '100%';
                this.cartListInner.textContent = '';
                const emptyState = document.createElement('div');
                emptyState.className = `${CONFIG.UI_PREFIX}-empty-state`;
                emptyState.textContent = 'No members selected.';
                this.cartListInner.appendChild(emptyState);
                return;
            }

            const itemHeight = CONFIG.VIRTUAL_ITEM_HEIGHT;
            this.cartListInner.style.height = `${totalItems * itemHeight}px`;

            const scrollTop = this.cartList.scrollTop;
            const contHeight = this.cachedCartHeight || 400;
            const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
            const endIndex = Math.min(totalItems, Math.floor((scrollTop + contHeight) / itemHeight) + 5);
            this.cartListInner.textContent = '';
            const fragment = document.createDocumentFragment();

            for (let i = startIndex; i < endIndex; i++) {
                const item = this.cart[i];
                const el = document.createElement('div');
                el.className = `${CONFIG.UI_PREFIX}-queue-item`;
                el.style.transform = `translate3d(0, ${i * itemHeight}px, 0)`;
                // Build queue item with DOM APIs — avoids innerHTML parsing overhead
                // and eliminates any XSS surface from stored group/member names.
                const cartLeftDiv = document.createElement('div');
                cartLeftDiv.style.cssText = 'display:flex;align-items:center;gap:0.5rem;overflow:hidden;';

                const cartRemoveBtn = document.createElement('button');
                cartRemoveBtn.className = `${CONFIG.UI_PREFIX}-queue-remove`;
                cartRemoveBtn.dataset.index = i;
                cartRemoveBtn.textContent = '✕';
                const cartNameSpan = document.createElement('span');
                cartNameSpan.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                cartNameSpan.textContent = item.n;

                cartLeftDiv.appendChild(cartRemoveBtn);
                cartLeftDiv.appendChild(cartNameSpan);

                const cartBadge = document.createElement('span');
                cartBadge.className = `${CONFIG.UI_PREFIX}-badge accent`;
                cartBadge.style.flexShrink = '0';
                cartBadge.textContent = item.g;

                el.appendChild(cartLeftDiv);
                el.appendChild(cartBadge);
                fragment.appendChild(el);
            }
            this.cartListInner.appendChild(fragment);
        },

        renderCart() {
            this._renderCartVirtual();
            // Sync cart highlight state across all panels instantly —
            // main list, recent, and trending all re-render from existing data.
            this._reRenderAllPanels();
        },

        createMainPanel() {
            const container = document.createElement('div');
            container.className = `${CONFIG.UI_PREFIX}-main-container`;
            const panel = document.createElement('div');
            panel.className = `${CONFIG.UI_PREFIX}-panel ${CONFIG.UI_PREFIX}-main`;
            // --- Header ---
            const header = document.createElement('div');
            header.className = `${CONFIG.UI_PREFIX}-header`;

            const leftGroup = document.createElement('div');
            leftGroup.className = `${CONFIG.UI_PREFIX}-header-left`;

            this.headerBackBtn = document.createElement('div');
            this.headerBackBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
            Utils.makeFocusable(this.headerBackBtn);
            this.headerBackBtn.appendChild(this._createSVG(ICONS.back));
            this.headerBackBtn.title = "Back";
            this.headerBackBtn.onclick = (e) => {
                e.stopPropagation();
                if (this.currentView === 'diagnostics') {
                    this.currentView = this._previousView || 'config';
                    this._previousView = null;
                } else if (this.currentView === 'config') {
                    if (this.hasUnsavedChanges() && !confirm("You have unsaved changes. Discard them?")) return;
                    this.currentView = this.selectedGroup ? 'members' : 'groups';
                } else if (this.currentView === 'members') {
                    this.currentView = 'groups';
                    this.selectedGroup = null;
                    this.searchInput.value = '';
                    this.updateListData('');
                }
                this.updateVisibility();
            };
            leftGroup.appendChild(this.headerBackBtn);

            this.headerTitle = document.createElement('h2');
            this.headerTitle.className = `${CONFIG.UI_PREFIX}-icon-title`;
            leftGroup.appendChild(this.headerTitle);

            const rightGroup = document.createElement('div');
            rightGroup.className = `${CONFIG.UI_PREFIX}-header-right`;
            rightGroup.appendChild(this._createPanelCloseBtn());

            header.appendChild(leftGroup);
            header.appendChild(rightGroup);
            panel.appendChild(header);
            // --- Config View Architecture ---
            this.configContainer = document.createElement('div');
            this.configContainer.className = `${CONFIG.UI_PREFIX}-config-wrapper`;

            const configBody = document.createElement('div');
            configBody.className = `${CONFIG.UI_PREFIX}-config-body`;

            const configFooter = document.createElement('div');
            configFooter.className = `${CONFIG.UI_PREFIX}-config-footer`;
            const createSettingsField = (labelTxt, inputType, inputId, defaultVal, placeholder) => {
                const field = document.createElement('div');
                field.className = `${CONFIG.UI_PREFIX}-settings-field`;
                const label = document.createElement('label');
                label.textContent = labelTxt;
                const input = document.createElement('input');
                input.type = inputType;
                input.className = `${CONFIG.UI_PREFIX}-settings-input`;
                input.placeholder = placeholder || '';
                input.value = GM_getValue(inputId, defaultVal);
                field.appendChild(label);
                field.appendChild(Utils.attachClearButton(input));
                return { fieldWrapper: field, inputElement: input };
            };
            const token = createSettingsField('GitHub Fine-Grained Access Token', 'password', `${CONFIG.STORAGE_PREFIX}_github_token`, '', 'github_pat_...');
            this.configInputs = {
                token: token.inputElement
            };
            const saveConfigBtn = document.createElement('button');
            saveConfigBtn.className = `${CONFIG.UI_PREFIX}-settings-save-btn`;
            saveConfigBtn.textContent = 'Save Configuration';
            saveConfigBtn.onclick = () => {
                GM_setValue(`${CONFIG.STORAGE_PREFIX}_github_token`, this.configInputs.token.value.trim());
                this.initialConfigState = this.currentConfigState;

                CloudAPI.loadConfig();
                this.showToast('Configurations saved. Re-synchronizing environments...');
                this.currentView = 'groups';
                if (CloudAPI.isValid()) {
                    const dot = this.configBtn.querySelector(`.${CONFIG.UI_PREFIX}-notification-dot`);
                    if (dot) dot.remove();
                }

                Storage.fetchCloudBackground(true);
                Database.init().then(() => {
                    this.updateListData('');
                    this.updateVisibility();
                });
            };

            // Enter key mapping for quick save
            this.configInputs.token.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveConfigBtn.click();
                }
            });

            configBody.appendChild(token.fieldWrapper);
            // ── Local Backup (export/import) ─────────────────────────────
            // Independent of the GitHub sync path — a local safety net in
            // case the token or GitHub itself is ever unavailable mid-session.
            const backupRow = document.createElement('div');
            backupRow.style.display = 'flex';
            backupRow.style.gap = '0.5rem';

            const exportBtn = document.createElement('button');
            exportBtn.className = `${CONFIG.UI_PREFIX}-settings-utility-btn`;
            exportBtn.style.flex = '1';
            exportBtn.textContent = 'Export Backup';
            exportBtn.onclick = () => this._exportLocalBackup(exportBtn);

            const importBtn = document.createElement('button');
            importBtn.className = `${CONFIG.UI_PREFIX}-settings-utility-btn`;
            importBtn.style.flex = '1';
            importBtn.textContent = 'Import Backup';

            const importFileInput = document.createElement('input');
            importFileInput.type = 'file';
            importFileInput.accept = 'application/json';
            importFileInput.style.display = 'none';
            importFileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) this._importLocalBackup(file, importBtn);
                importFileInput.value = ''; // allow re-selecting the same file later
            });
            importBtn.onclick = () => importFileInput.click();

            backupRow.appendChild(exportBtn);
            backupRow.appendChild(importBtn);
            backupRow.appendChild(importFileInput);

            const backupHint = document.createElement('div');
            backupHint.className = `${CONFIG.UI_PREFIX}-settings-hint`;
            backupHint.textContent = 'A local file backup of your database and history — independent of GitHub.';

            configBody.appendChild(backupRow);
            configBody.appendChild(backupHint);
            const resyncBtn = document.createElement('button');
            // margin-top: auto pushes this to the bottom of configBody's flex
            // column, regardless of how much content sits above it.
            resyncBtn.className = `${CONFIG.UI_PREFIX}-settings-utility-btn ${CONFIG.UI_PREFIX}-settings-utility-btn--bottom`;
            resyncBtn.textContent = 'Resync History from Cloud';
            resyncBtn.onclick = async () => {
                if (!CloudAPI.isValid()) {
                    this.showToast('Configure and save your GitHub token first.', 'error');
                    return;
                }
                if (!confirm('This discards any unsynced local history and reloads the latest version from GitHub. Continue?')) {
                    return;
                }
                try {
                    resyncBtn.disabled = true;
                    resyncBtn.textContent = 'Resyncing...';
                    await Storage.resyncFromCloud();
                    this.showToast('History resynced from GitHub.');
                } catch (e) {
                    Logger.warn('[UI] Resync from cloud failed.', e);
                    this.showToast('Resync failed — check your connection and token.', 'error');
                } finally {
                    resyncBtn.disabled = false;
                    resyncBtn.textContent = 'Resync History from Cloud';
                }
            };

            configBody.appendChild(resyncBtn);
            const diagnosticsBtn = document.createElement('button');
            diagnosticsBtn.className = `${CONFIG.UI_PREFIX}-settings-utility-btn`;
            diagnosticsBtn.textContent = 'View Diagnostics';
            diagnosticsBtn.onclick = () => {
                this._previousView = this.currentView;
                this.currentView = 'diagnostics';
                this._populateDiagnostics();
                this.updateVisibility();
            };
            configBody.appendChild(diagnosticsBtn);

            configFooter.appendChild(saveConfigBtn);

            this.configContainer.appendChild(configBody);
            this.configContainer.appendChild(configFooter);
            panel.appendChild(this.configContainer);
            // --- Diagnostics View (reuses config-wrapper/config-body styling) ---
            this.diagnosticsContainer = document.createElement('div');
            this.diagnosticsContainer.className = `${CONFIG.UI_PREFIX}-config-wrapper`;
            this.diagnosticsBody = document.createElement('div');
            this.diagnosticsBody.className = `${CONFIG.UI_PREFIX}-config-body ${CONFIG.UI_PREFIX}-diagnostics-body`;
            this.diagnosticsContainer.appendChild(this.diagnosticsBody);
            panel.appendChild(this.diagnosticsContainer);
            // --- Search & Contextual Toolbar ---
            this.searchContainer = document.createElement('div');
            this.searchContainer.className = `${CONFIG.UI_PREFIX}-search-container`;

            this.searchInput = document.createElement('input');
            this.searchInput.className = `${CONFIG.UI_PREFIX}-search-input`;
            this.searchInput.placeholder = "Search idols or groups...";

            this.multiSelectBtn = document.createElement('div');
            this.multiSelectBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
            Utils.makeFocusable(this.multiSelectBtn);
            this.multiSelectBtn.title = "Select Multiple Members";
            this.multiSelectBtn.appendChild(this._createSVG(ICONS.checklist));
            this.multiSelectBtn.onclick = () => {
                if (!this.isMultiSelectMode) {
                    this.isMultiSelectMode = true;
                    this.multiSelectBtn.title = "Cancel Selection";
                    this.multiSelectBtn.replaceChildren();
                    this.multiSelectBtn.appendChild(this._createSVG(ICONS.close));
                    this.multiSelectBtn.style.borderColor = 'var(--tm-danger)';
                    this.multiSelectBtn.querySelector('svg').style.fill = 'var(--tm-danger)';

                    this.cart = [];
                    this.renderCart();
                    if (this.cartContainer && !this.cartContainer.classList.contains('active')) {
                        // Force reflow and add active class for smooth expansion
                        void this.cartContainer.offsetWidth;
                        this.cartContainer.classList.add('active');
                    }
                    if (this.stdSaveBtn) this.stdSaveBtn.disabled = true;
                    // Carousel stays on Main — updates dots/pill to reflect queue presence
                    this._carouselOnMultiSelectActivate();
                    this.updateVisibility();
                } else {
                    this.exitMultiSelectMode();
                }
            };

            this.editBtn = document.createElement('div');
            this.editBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
            Utils.makeFocusable(this.editBtn);
            this.editBtn.appendChild(this._createSVG(ICONS.edit));
            this.editBtn.title = "Toggle CRUD Editing";
            this.editBtn.onclick = () => {
                if (!CloudAPI.isValid()) {
                    this.showToast('Configure Cloud Engine credentials first to enable CRUD.', 'error');
                    if (this.currentView !== 'config') {
                        this.currentView = 'config';
                        this.initialConfigState = this.currentConfigState;
                    }
                    this.updateVisibility();
                    return;
                }
                this.isCrudMode = !this.isCrudMode;
                this.updateVisibility();
                this.renderVirtualList();
            };

            this.searchContainer.appendChild(Utils.attachClearButton(this.searchInput));
            this.searchContainer.appendChild(this.multiSelectBtn);
            this.searchContainer.appendChild(this.editBtn);
            panel.appendChild(this.searchContainer);

            // --- CRUD Bar ---
            this.crudBarContainer = document.createElement('div');
            this.crudBarContainer.className = `${CONFIG.UI_PREFIX}-crud-bar`;
            this.crudInput = document.createElement('input');
            this.crudInput.className = `${CONFIG.UI_PREFIX}-crud-input`;

            this.crudBtn = document.createElement('button');
            this.crudBtn.className = `${CONFIG.UI_PREFIX}-crud-add-btn`;
            this.crudBtn.onclick = () => {
                if (this.crudBtn.disabled) return;
                const val = this.crudInput.value.trim();
                if (!val) return;

                let success = false;
                if (this.currentView === 'groups') {
                    success = Database.addGroup(val);
                } else if (this.currentView === 'members') {
                    success = Database.addMember(this.selectedGroup, val);
                }

                if (success) {
                    this.crudInput.value = '';
                    this.updateListData(this.searchInput.value.toLowerCase().trim());
                    this.triggerCloudSync();
                } else {
                    this.showToast('Element empty or already exists.', 'error');
                }
            };
            this.crudBarContainer.appendChild(Utils.attachClearButton(this.crudInput));
            this.crudBarContainer.appendChild(this.crudBtn);
            panel.appendChild(this.crudBarContainer);
            // --- List View Wrapper Architecture ---
            this.mainListWrapper = document.createElement('div');
            this.mainListWrapper.className = `${CONFIG.UI_PREFIX}-list-wrapper`;

            this.listContainer = document.createElement('div');
            this.listContainer.className = `${CONFIG.UI_PREFIX}-list`;

            this.listInner = document.createElement('div');
            this.listInner.className = `${CONFIG.UI_PREFIX}-list-inner`;
            this.listContainer.appendChild(this.listInner);

            this.mainListWrapper.appendChild(this.listContainer);
            this.listContainer.addEventListener('scroll', () => {
                requestAnimationFrame(() => this.renderVirtualList());
            });
            // Event Delegation for List Items & Delete/Edit Buttons
            this.listInner.addEventListener('click', (e) => {
                const badge = e.target.closest(`.${CONFIG.UI_PREFIX}-badge-actionable`);
                if (badge) {
                    e.stopPropagation();

                    const index = parseInt(badge.closest(`.${CONFIG.UI_PREFIX}-item`).dataset.index, 10);
                    const itemData = this.currentListData[index];
                    this.selectedGroup = itemData.group;
                    this.currentView = 'members';
                    this.searchInput.value = '';
                    this.updateListData('');
                    return;
                }

                const delBtn = e.target.closest(`.${CONFIG.UI_PREFIX}-delete-btn`);
                if (delBtn) {
                    e.stopPropagation();
                    const index = parseInt(delBtn.dataset.index, 10);
                    const itemData = this.currentListData[index];

                    if (itemData.type === 'group') {
                        if (confirm(`Confirm complete destruction of group data and profiles connected to: "${itemData.group}"?`)) {
                            if (Database.deleteGroup(itemData.group)) {
                                this.updateListData(this.searchInput.value.toLowerCase().trim());
                                this.triggerCloudSync();
                            }
                        }
                    } else if (itemData.type === 'member') {
                        if (confirm(`Confirm target detachment and deletion of profile structural reference: "${itemData.member}"?`)) {
                             if (Database.deleteMember(itemData.group, itemData.member)) {
                                this.updateListData(this.searchInput.value.toLowerCase().trim());
                                this.triggerCloudSync();
                            }
                        }
                    }
                    return;
                }

                const editBtn = e.target.closest(`.${CONFIG.UI_PREFIX}-edit-item-btn`);
                if (editBtn) {
                    e.stopPropagation();
                    const index = parseInt(editBtn.dataset.index, 10);
                    const itemData = this.currentListData[index];

                    if (itemData.type === 'group') {
                        const newName = prompt(`Rename group "${itemData.group}":`, itemData.group);
                        if (newName && newName.trim() !== itemData.group) {
                            if (Database.renameGroup(itemData.group, newName)) {
                                Storage.renameGroupHistory(itemData.group, newName.trim());
                                this.updateListData(this.searchInput.value.toLowerCase().trim());
                                this.triggerCloudSync();
                            } else {
                                this.showToast('Invalid name or group already exists.', 'error');
                            }
                        }
                    } else if (itemData.type === 'member') {
                        const newName = prompt(`Rename member "${itemData.member}":`, itemData.member);
                        if (newName && newName.trim() !== itemData.member) {
                            if (Database.renameMember(itemData.group, itemData.member, newName)) {
                                Storage.renameMemberHistory(itemData.group, itemData.member, newName.trim());
                                this.updateListData(this.searchInput.value.toLowerCase().trim());
                                this.triggerCloudSync();
                            } else {
                                this.showToast('Invalid name or member already exists.', 'error');
                            }
                        }
                    }
                    return;
                }

                const itemEl = e.target.closest(`.${CONFIG.UI_PREFIX}-item`);
                if (!itemEl) return;
                const index = parseInt(itemEl.dataset.index, 10);
                if (!isNaN(index) && this.currentListData[index]) {
                    this.handleItemClick(this.currentListData[index]);
                }
            });
            this.searchInput.addEventListener('keydown', (e) => {
                if (this.currentView === 'config') return;
                if (this.currentListData.length === 0) return;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.activeIndex = Math.min(this.activeIndex + 1, this.currentListData.length - 1);
                    this.adjustScrollToActive();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.activeIndex = Math.max(0, this.activeIndex - 1);
                    this.adjustScrollToActive();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const activeItem = this.currentListData[this.activeIndex];
                    if (activeItem) this.handleItemClick(activeItem);
                }
            });
            this.searchInput.oninput = Utils.debounce((e) => {
                this.updateListData(e.target.value.toLowerCase().trim());
            }, 150);
            // --- Footer ---
            this.footer = document.createElement('div');
            this.footer.className = `${CONFIG.UI_PREFIX}-footer`;

            this.footerMainRow = document.createElement('div');
            this.footerMainRow.style.display = 'flex';
            this.footerMainRow.style.gap = '1rem';
            this.footerMainRow.style.width = '100%';
            this.footerMainRow.style.alignItems = 'center';
            const footerLeftControls = document.createElement('div');
            footerLeftControls.style.display = 'flex';
            footerLeftControls.style.gap = '0.5rem';
            footerLeftControls.style.alignItems = 'center';

            this.syncBtn = document.createElement('div');
            this.syncBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
            Utils.makeFocusable(this.syncBtn);
            this.syncBtn.appendChild(this._createSVG(ICONS.sync));
            this.syncBtn.title = "Force Manual Sync";
            this.syncBtn.onclick = () => {
                if (!CloudAPI.isValid()) {
                    this.showToast('Configure Cloud Engine credentials first.', 'error');
                    return;
                }
                this.syncBtn.classList.add(`${CONFIG.UI_PREFIX}-spin`);
                this.showToast('Forcing manual synchronization...', 'syncing');

                Promise.all([
                    Storage.fetchCloudBackground(true),
                    Database.init()
                ]).then(() => {
                    this.syncBtn.classList.remove(`${CONFIG.UI_PREFIX}-spin`);
                    this.showToast('Manual sync complete.', 'success');
                }).catch((e) => {
                    this.syncBtn.classList.remove(`${CONFIG.UI_PREFIX}-spin`);
                    this.showToast(`Sync failed: ${e.message}`, 'error');
                });
            };

            this.configBtn = document.createElement('div');
            this.configBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
            Utils.makeFocusable(this.configBtn);
            this.configBtn.style.position = 'relative';
            this.configBtn.appendChild(this._createSVG(ICONS.config));
            this.configBtn.title = "Cloud Engine Config";
            this.configBtn.onclick = () => {
                if (this.currentView === 'config') {
                    if (this.hasUnsavedChanges() && !confirm("You have unsaved changes. Discard them?")) return;
                    this.currentView = this.selectedGroup ? 'members' : 'groups';
                } else {
                    this.currentView = 'config';
                    this.initialConfigState = this.currentConfigState;
                }
                this.updateVisibility();
            };

            if (!CloudAPI.isValid()) {
                const configWarningDot = document.createElement('div');
                configWarningDot.className = `${CONFIG.UI_PREFIX}-notification-dot`;
                this.configBtn.appendChild(configWarningDot);
            }

            footerLeftControls.appendChild(this.configBtn);
            footerLeftControls.appendChild(this.syncBtn);
            const btnRow = document.createElement('div');
            btnRow.className = `${CONFIG.UI_PREFIX}-btn-row`;

            this.stdSaveBtn = document.createElement('button');
            this.stdSaveBtn.className = `${CONFIG.UI_PREFIX}-action-btn`;
            this.stdSaveBtn.innerText = "Standard";
            this.stdSaveBtn.title = "Save with the original file name";
            this.stdSaveBtn.onclick = () => {
                if (this.isMultiSelectMode) return;
                Downloader.executeStandardSave();
            };

            this.customBtn = document.createElement('button');
            this.customBtn.className = `${CONFIG.UI_PREFIX}-action-btn`;
            this.customBtn.innerText = "Custom";
            this.customBtn.title = "Specify a custom file name";

            btnRow.appendChild(this.stdSaveBtn);
            btnRow.appendChild(this.customBtn);
            this.footerMainRow.appendChild(footerLeftControls);
            this.footerMainRow.appendChild(btnRow);

            const customWrapper = document.createElement('div');
            customWrapper.className = `${CONFIG.UI_PREFIX}-custom-wrapper`;

            const customNameInput = document.createElement('input');
            customNameInput.className = `${CONFIG.UI_PREFIX}-custom-input`;
            customNameInput.type = 'text';
            customNameInput.placeholder = 'Enter custom name...';

            const customCancelBtn = document.createElement('button');
            customCancelBtn.className = `${CONFIG.UI_PREFIX}-custom-cancel`;
            customCancelBtn.innerText = 'Cancel';

            const customConfirmBtn = document.createElement('button');
            customConfirmBtn.className = `${CONFIG.UI_PREFIX}-custom-confirm`;
            customConfirmBtn.innerText = 'Save';

            customWrapper.appendChild(Utils.attachClearButton(customNameInput));
            customWrapper.appendChild(customCancelBtn);
            customWrapper.appendChild(customConfirmBtn);

            this.footer.appendChild(this.footerMainRow);
            this.footer.appendChild(customWrapper);
            const resetCustomInput = () => {
                customWrapper.style.display = 'none';
                this.footerMainRow.style.display = 'flex';
                customNameInput.value = '';
            };

            const submitCustomSave = () => {
                const customName = customNameInput.value.trim();
                if (customName) {
                    Downloader.executeCustomSave(customName, this.isMultiSelectMode ? this.cart : null);
                    if (this.isMultiSelectMode) this.exitMultiSelectMode();
                } else {
                    customNameInput.focus();
                }
            };
            // "Custom" button: swaps the footer in place — the underlying
            // groups/members list stays exactly as it was, no view change.
            this.customBtn.onclick = () => {
                this.footerMainRow.style.display = 'none';
                customWrapper.style.display = 'flex';
                requestAnimationFrame(() => customNameInput.focus());
            };

            customCancelBtn.onclick = resetCustomInput;
            customConfirmBtn.onclick = submitCustomSave;
            customNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitCustomSave();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    resetCustomInput();
                    this.searchInput.focus();
                }
            });
            panel.appendChild(this.mainListWrapper);
            panel.appendChild(this.footer);
            container.appendChild(panel);

            return container;
        },

        updateVisibility() {
            if (this.diagnosticsContainer) this.diagnosticsContainer.style.display = 'none';
            if (this.currentView === 'diagnostics') {
                this.headerTitle.replaceChildren();
                this.headerTitle.textContent = 'Diagnostics';
                this.headerBackBtn.style.display = 'flex';
                this.searchContainer.style.display = 'none';
                this.mainListWrapper.style.display = 'none';
                this.footer.style.display = 'none';
                this.crudBarContainer.style.display = 'none';
                this.configContainer.style.display = 'none';
                this.diagnosticsContainer.style.display = 'flex';
            } else if (this.currentView === 'config') {
                this.headerTitle.replaceChildren();
                this.headerTitle.textContent = 'Cloud Engine Config';
                this.headerBackBtn.style.display = 'flex';
                this.searchContainer.style.display = 'none';
                this.mainListWrapper.style.display = 'none';
                this.footer.style.display = 'none';
                this.crudBarContainer.style.display = 'none';
                this.configContainer.style.display = 'flex';

                requestAnimationFrame(() => {
                    if (this.configInputs && this.configInputs.token) this.configInputs.token.focus();
                });
            } else {
                this.configContainer.style.display = 'none';
                this.searchContainer.style.display = 'flex';
                this.mainListWrapper.style.display = 'flex';
                this.footer.style.display = 'flex';

                if (this.currentView === 'groups') {
                    this.headerTitle.replaceChildren();
                    const dbIcon = this._createSVG(ICONS.database);
                    dbIcon.classList.add(`${CONFIG.UI_PREFIX}-icon-title-svg`);
                    this.headerTitle.appendChild(dbIcon);
                    this.headerTitle.appendChild(document.createTextNode('Database'));
                    this.headerBackBtn.style.display = 'none';
                } else {
                    this.headerTitle.replaceChildren();
                    this.headerTitle.textContent = this.selectedGroup;
                    this.headerBackBtn.style.display = 'flex';
                }

                if (this.isCrudMode) {
                    this.crudBarContainer.style.display = 'flex';
                    this.crudInput.placeholder = this.currentView === 'groups' ? 'Enter new group name...' : 'Enter new member name...';
                    this.crudBtn.textContent = this.currentView === 'groups' ? 'Add Group' : 'Add Member';
                    if (this.editBtn) {
                        this.editBtn.style.borderColor = 'var(--tm-primary)';
                        const svg = this.editBtn.querySelector('svg');
                        if (svg) svg.style.fill = 'var(--tm-primary)';
                    }
                } else {
                    this.crudBarContainer.style.display = 'none';
                    if (this.editBtn) {
                        this.editBtn.style.borderColor = '';
                        const svg = this.editBtn.querySelector('svg');
                        if (svg) svg.style.fill = '';
                    }
                }
            }
        },

        updateListData(searchVal) {
            this.currentListData = [];
            const isSearch = searchVal.length > 0;

            if (this.currentView === 'groups') {
                Database.sortedGroups.forEach(gName => {
                    const groupMatches = !isSearch || gName.toLowerCase().includes(searchVal);
                    if (groupMatches) {
                        this.currentListData.push({ type: 'group', group: gName, label: gName, badge: 'Group' });
                    }
                    if (isSearch) {
                        Database.data[gName].forEach(mName => {
                            if (mName.toLowerCase().includes(searchVal)) {
                                this.currentListData.push({ type: 'member', group: gName, member: mName, label: mName, badge: gName });
                            }
                        });
                    }
                });
            } else if (this.currentView === 'members') {
                if (Database.data[this.selectedGroup]) {
                    Database.data[this.selectedGroup].forEach(mName => {
                        if (!isSearch || mName.toLowerCase().includes(searchVal)) {
                            this.currentListData.push({ type: 'member', group: this.selectedGroup, member: mName, label: mName, badge: '' });
                        }
                    });
                }
            }

            this.activeIndex = this.currentListData.length > 0 ? 0 : -1;
            this.listContainer.scrollTop = 0;
            this.updateVisibility();
            this.renderVirtualList();

            // Carousel: any content change in the main panel should bring the
            // user to the Main card. The guard prevents firing on search keystrokes
            // when already on Main (currentId === 'main' → no-op).
            if (this._carousel.isActive && this._carousel.currentId !== 'main') {
                this._carouselGoTo('main');
            }
        },

        renderVirtualList() {
            if (!this.listContainer || !this.listInner || this.currentView === 'config') return;
            if (Database.isLoading) {
                this.listInner.style.height = '100%';
                this.listInner.textContent = '';
                const emptyState = document.createElement('div');
                emptyState.className = `${CONFIG.UI_PREFIX}-empty-state`;
                emptyState.textContent = 'Loading database parameters...';
                this.listInner.appendChild(emptyState);
                return;
            }

            const totalItems = this.currentListData.length;
            if (totalItems === 0) {
                this.listInner.style.height = '100%';
                this.listInner.textContent = '';
                const emptyState = document.createElement('div');
                emptyState.className = `${CONFIG.UI_PREFIX}-empty-state`;
                emptyState.textContent = 'No matching database profiles tracked.';
                this.listInner.appendChild(emptyState);
                return;
            }

            const itemHeight = CONFIG.VIRTUAL_ITEM_HEIGHT;
            this.listInner.style.height = `${totalItems * itemHeight}px`;

            const scrollTop = this.listContainer.scrollTop;
            const containerHeight = this.cachedContainerHeight || 400;
            const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
            const endIndex = Math.min(totalItems, Math.floor((scrollTop + containerHeight) / itemHeight) + 5);
            this.listInner.textContent = '';
            const fragment = document.createDocumentFragment();

            for (let i = startIndex; i < endIndex; i++) {
                const itemData = this.currentListData[i];
                const btn = document.createElement('div');

                btn.className = `${CONFIG.UI_PREFIX}-item ${i === this.activeIndex ? 'active-focus' : ''}`;
                btn.style.transform = `translate3d(0, ${i * itemHeight}px, 0)`;
                btn.dataset.index = i;
                // Visual indicator: item is already in the queue
                const isInCart = this.isMultiSelectMode &&
                    itemData.type === 'member' &&
                    this.cart.some(c => c.g === itemData.group && c.n === itemData.member);
                if (isInCart) btn.classList.add(`${CONFIG.UI_PREFIX}-item-selected`);

                const nameSpan = document.createElement('span');
                nameSpan.textContent = itemData.label;
                btn.appendChild(nameSpan);

                const rightWrapper = document.createElement('div');
                rightWrapper.style.display = 'flex';
                rightWrapper.style.alignItems = 'center';
                rightWrapper.style.gap = '0.4rem';

                if (isInCart) {
                    const check = document.createElement('span');
                    check.className = `${CONFIG.UI_PREFIX}-cart-check`;
                    check.textContent = '✓';
                    rightWrapper.appendChild(check);
                }

                if (itemData.badge) {
                    const badgeSpan = document.createElement('span');
                    badgeSpan.className = `${CONFIG.UI_PREFIX}-badge`;
                    badgeSpan.textContent = itemData.badge;

                    if (itemData.type === 'member' && this.currentView === 'groups') {
                        badgeSpan.classList.add(`${CONFIG.UI_PREFIX}-badge-actionable`);
                        badgeSpan.title = `View ${itemData.group}`;
                        badgeSpan.onclick = (e) => {
                            e.stopPropagation();
                            this.selectedGroup = itemData.group;
                            this.currentView = 'members';
                            if (this.searchInput) this.searchInput.value = '';
                            this.updateListData('');
                        };
                    }

                    rightWrapper.appendChild(badgeSpan);
                }

                if (this.isCrudMode) {
                    if (this.editItemBtnTemplate) {
                        const editBtn = this.editItemBtnTemplate.cloneNode(true);
                        editBtn.dataset.index = i;
                        rightWrapper.appendChild(editBtn);
                    }
                    if (this.deleteBtnTemplate) {
                        const delBtn = this.deleteBtnTemplate.cloneNode(true);
                        delBtn.dataset.index = i;
                        rightWrapper.appendChild(delBtn);
                    }
                }

                btn.appendChild(rightWrapper);
                fragment.appendChild(btn);
            }
            this.listInner.appendChild(fragment);
        },

        adjustScrollToActive() {
            if (this.activeIndex < 0) return;
            const itemHeight = CONFIG.VIRTUAL_ITEM_HEIGHT;
            const itemTop = this.activeIndex * itemHeight;
            const itemBottom = itemTop + itemHeight;

            const scrollTop = this.listContainer.scrollTop;
            const containerHeight = this.cachedContainerHeight;

            if (itemTop < scrollTop) {
                this.listContainer.scrollTop = itemTop;
            } else if (itemBottom > scrollTop + containerHeight) {
                this.listContainer.scrollTop = itemBottom - containerHeight;
            }

            this.renderVirtualList();
        },

        handleItemClick(itemData) {
            if (itemData.type === 'group') {
                this.selectedGroup = itemData.group;
                this.currentView = 'members';
                this.searchInput.value = '';
                this.updateListData('');
            } else {
                if (this.isMultiSelectMode) {
                    const idx = this.cart.findIndex(c => c.g === itemData.group && c.n === itemData.member);
                    if (idx === -1) {
                        // Not in cart — add (select)
                        this.cart.push({ g: itemData.group, n: itemData.member });
                    } else {
                        // Already in cart — remove (deselect)
                        this.cart.splice(idx, 1);
                    }
                    this.renderCart();
                } else {
                    Downloader.executeIdolSave(itemData.group, itemData.member);
                }
            }
        },

        /**
         * Builds the diagnostics view's content fresh each time it's opened,
         * so the data (last sync time, storage sizes, recent issues) is
         * always current rather than stale from whenever the panel was built.
         */
        _populateDiagnostics() {
            if (!this.diagnosticsBody) return;
            this.diagnosticsBody.replaceChildren();

            const addRow = (label, value) => {
                const row = document.createElement('div');
                row.className = `${CONFIG.UI_PREFIX}-diagnostics-row`;
                const labelEl = document.createElement('span');
                labelEl.className = `${CONFIG.UI_PREFIX}-diagnostics-label`;
                labelEl.textContent = label;
                const valueEl = document.createElement('span');
                valueEl.className = `${CONFIG.UI_PREFIX}-diagnostics-value`;
                valueEl.textContent = value;
                row.appendChild(labelEl);
                row.appendChild(valueEl);
                this.diagnosticsBody.appendChild(row);
            };

            const addSectionTitle = (text) => {
                const title = document.createElement('div');
                title.className = `${CONFIG.UI_PREFIX}-diagnostics-section`;
                title.textContent = text;
                this.diagnosticsBody.appendChild(title);
            };

            let version = 'unknown';
            try {
                if (typeof GM_info !== 'undefined' && GM_info.script) version = GM_info.script.version;
            } catch (e) { /* GM_info not available in some managers — safe fallback above */ }

            const lastSync = GM_getValue(`${CONFIG.UI_PREFIX}_last_sync_time`, 0);
            const groupCount = Object.keys(Database.data || {}).length;
            const memberCount = Object.values(Database.data || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
            const historyCount = (Storage._cache || []).length;
            const historySizeBytes = JSON.stringify(Storage._cache || []).length;

            addSectionTitle('Script');
            addRow('Version', version);
            addRow('Cloud connected', CloudAPI.isValid() ? 'Yes' : 'No (token not configured)');
            addRow('Last cloud sync', lastSync ? Utils.timeAgo(lastSync) : 'Never');

            addSectionTitle('Storage Summary');
            addRow('Database groups', String(groupCount));
            addRow('Database members', String(memberCount));
            addRow('History entries', String(historyCount));
            addRow('History size (local)', Utils.formatBytes(historySizeBytes));

            addSectionTitle('Recent Issues');
            if (Logger._recentIssues.length === 0) {
                addRow('Status', 'No warnings or errors logged this session.');
            } else {
                Logger._recentIssues.forEach(issue => {
                    addRow(`[${issue.level}] ${Utils.timeAgo(issue.timestamp)}`, issue.msg);
                });
            }
        },

        /**
         * Downloads a local JSON file containing the current Database and
         * History state — independent of the GitHub sync path, so it stays
         * usable even if GitHub or the token is ever unavailable.
         * @param {HTMLButtonElement} btn - the triggering button, for inline feedback
         */
        _exportLocalBackup(btn) {
            try {
                const payload = {
                    exportedAt: new Date().toISOString(),
                    scriptVersion: GM_info && GM_info.script ? GM_info.script.version : 'unknown',
                    database: Database.data,
                    history: Storage._cache
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const stamp = new Date().toISOString().slice(0, 10);

                GM_download({
                    url,
                    name: `xiv-media-downloader-backup-${stamp}.json`,
                    saveAs: true,
                    onload: () => URL.revokeObjectURL(url),
                    onerror: () => {
                        URL.revokeObjectURL(url);
                        this.showToast('Export failed — check download permissions.', 'error');
                    }
                });
                this.showToast('Backup exported.');
            } catch (e) {
                Logger.warn('[UI] Export backup failed.', e);
                this.showToast('Export failed — see console for details.', 'error');
            }
        },

        /**
         * Restores Database/History from a previously exported backup file.
         * Validates shape defensively before touching any state — a malformed
         * file must never partially corrupt what's already loaded.
         * @param {File} file
         * @param {HTMLButtonElement} btn
         */
        async _importLocalBackup(file, btn) {
            let parsed;
            try {
                const text = await file.text();
                parsed = JSON.parse(text);
            } catch (e) {
                this.showToast('That file isn\'t valid JSON.', 'error');
                return;
            }

            if (!parsed || typeof parsed !== 'object' ||
                typeof parsed.database !== 'object' || parsed.database === null ||
                !Array.isArray(parsed.history)) {
                this.showToast('That file doesn\'t look like a Xiv Media Downloader backup.', 'error');
                return;
            }

            if (!confirm('This replaces your current database and history with the backup file\'s contents, then pushes the result to GitHub. Continue?')) {
                return;
            }

            try {
                btn.disabled = true;
                btn.textContent = 'Importing...';

                Database.data = parsed.database;
                Storage._cache = parsed.history;
                GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(Storage._cache));
                Database.setCache(Database.data);
                if (CloudAPI.isValid()) {
                    await Database.saveCloud();
                    await Storage.saveCloud();
                }

                this.updateListData(this.searchInput ? this.searchInput.value.toLowerCase().trim() : '');
                this.refreshSidePanels();
                this.showToast('Backup imported successfully.');
            } catch (e) {
                Logger.warn('[UI] Import backup failed.', e);
                this.showToast('Import failed partway — check your connection and try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Import Backup';
            }
        },

        async triggerCloudSync() {
            if (!CloudAPI.isValid() || CloudAPI.isRateLimited()) return;
            this.updateCloudStatus('syncing');
            try {
                await Database.saveCloud();
                this.updateCloudStatus('success');
            } catch (e) {
                Logger.error('Cloud synchronization transaction failure exception', e);
                this.updateCloudStatus('error', e.message);
            }
        },

        updateCloudStatus(status, message = '') {
            let text = '';
            let type = 'info';

            if (status === 'syncing') {
                text = 'Committing changes to cloud...';
                type = 'syncing';
            } else if (status === 'success') {
                text = 'Successfully synced to cloud.';
                type = 'success';
            } else if (status === 'error') {
                text = `Sync failed: ${message}`;
                type = 'error';
            }

            if (text) this.showToast(text, type);
            if (this.crudInput && this.crudBtn) {
                const isSyncing = (status === 'syncing');
                this.crudInput.disabled = isSyncing;
                this.crudBtn.disabled = isSyncing;
                this.crudInput.style.opacity = isSyncing ? '0.5' : '1';
                this.crudBtn.style.opacity = isSyncing ? '0.5' : '1';
                this.crudBtn.style.cursor = isSyncing ? 'wait' : 'pointer';
            }
        },

        render() {
            if (this.overlay) this.overlay.remove();
            this.overlay = document.createElement('div');
            this.overlay.id = `${CONFIG.UI_PREFIX}-overlay`;

            document.body.style.overflow = 'hidden';
            const layoutWrapper = document.createElement('div');
            layoutWrapper.className = `${CONFIG.UI_PREFIX}-layout`;
            if (typeof ResizeObserver !== 'undefined') {
                this.resizeObserver = new ResizeObserver(entries => {
                    // Cancel any pending resize render so rapid resize events
                    // (e.g. dragging a window edge) coalesce into one render pass.
                    if (this._pendingResizeFrame !== null) {
                        cancelAnimationFrame(this._pendingResizeFrame);
                    }

                    // Sync phase: update cached dimensions only — pure math, no DOM reads.
                    // Track which panels need re-rendering so the rAF knows what to do.
                    let needsMain = false, needsRecent = false, needsTrending = false, needsCart = false;

                    for (let entry of entries) {
                        const h = entry.contentRect.height;
                        const snappedHeight = Math.floor(h / CONFIG.VIRTUAL_ITEM_HEIGHT) * CONFIG.VIRTUAL_ITEM_HEIGHT;
                        const finalHeight = Math.max(CONFIG.VIRTUAL_ITEM_HEIGHT, snappedHeight);
                        if (entry.target === this.mainListWrapper) {
                            this.listContainer.style.height = `${finalHeight}px`;
                            this.cachedContainerHeight = finalHeight;
                            needsMain = true;
                        } else if (entry.target === this.sidePanels.recent.wrapper) {
                            this.sidePanels.recent.container.style.height = `${finalHeight}px`;
                            this.sidePanels.recent.cachedHeight = finalHeight;
                            needsRecent = true;
                        } else if (entry.target === this.sidePanels.trending.wrapper) {
                            this.sidePanels.trending.container.style.height = `${finalHeight}px`;
                            this.sidePanels.trending.cachedHeight = finalHeight;
                            needsTrending = true;
                        } else if (entry.target === this.cartListWrapper) {
                            this.cartList.style.height = `${finalHeight}px`;
                            this.cachedCartHeight = finalHeight;
                            needsCart = true;
                        }
                    }

                    // Render phase: schedule a single paint after all dimension
                    // updates are committed. Flags are captured in the closure.
                    this._pendingResizeFrame = requestAnimationFrame(() => {
                        this._pendingResizeFrame = null;
                        if (needsMain)   this.renderVirtualList();
                        if (needsRecent) this._renderSidePanelVirtual('recent');
                        if (needsTrending) this._renderSidePanelVirtual('trending');
                        if (needsCart)   this._renderCartVirtual();
                    });
                });
            }

            // Create global selection queue container
            this.cartContainer = document.createElement('div');
            this.cartContainer.id = `${CONFIG.UI_PREFIX}-queue`;
            this.cartContainer.className = `${CONFIG.UI_PREFIX}-panel ${CONFIG.UI_PREFIX}-cart-panel`;
            this.cartContainer.style.order = '0';

            const cartHeader = document.createElement('div');
            cartHeader.className = `${CONFIG.UI_PREFIX}-header`;
            cartHeader.style.justifyContent = 'space-between';
            cartHeader.style.marginBottom = '1rem';

            const cartTitle = document.createElement('h2');
            cartTitle.className = `${CONFIG.UI_PREFIX}-icon-title`;
            cartTitle.style.margin = '0';
            cartTitle.style.fontSize = '1rem';
            cartTitle.style.whiteSpace = 'nowrap';
            const cartTitleIcon = this._createSVG(ICONS.inbox);
            cartTitleIcon.classList.add(`${CONFIG.UI_PREFIX}-icon-title-svg`);
            cartTitle.appendChild(cartTitleIcon);
            cartTitle.appendChild(document.createTextNode('Queue ('));
            const cartCountSpan = document.createElement('span');
            cartCountSpan.id = `${CONFIG.UI_PREFIX}-cart-count`;
            cartCountSpan.textContent = '0';
            cartTitle.appendChild(cartCountSpan);
            cartTitle.appendChild(document.createTextNode(')'));
            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
            btnGroup.style.alignItems = 'center';
            btnGroup.style.gap = '0.5rem';

            const cartCancelBtn = document.createElement('button');
            cartCancelBtn.className = `${CONFIG.UI_PREFIX}-cancel-btn`;
            cartCancelBtn.style.color = 'var(--tm-danger)';
            cartCancelBtn.style.borderColor = 'var(--tm-danger)';
            cartCancelBtn.style.background = 'rgba(229, 115, 115, 0.1)';
            cartCancelBtn.textContent = 'Cancel';
            cartCancelBtn.onclick = () => this.exitMultiSelectMode();
            const cartClearBtn = document.createElement('button');
            cartClearBtn.className = `${CONFIG.UI_PREFIX}-cancel-btn`;
            cartClearBtn.textContent = 'Clear';
            cartClearBtn.onclick = () => {
                this.cart = [];
                this.renderCart();
            };

            btnGroup.appendChild(cartCancelBtn);
            btnGroup.appendChild(cartClearBtn);
            // Close button always last — same top-right position as every other panel
            btnGroup.appendChild(this._createPanelCloseBtn('queue'));
            cartHeader.appendChild(cartTitle);
            cartHeader.appendChild(btnGroup);

            const listWrapper = document.createElement('div');
            listWrapper.className = `${CONFIG.UI_PREFIX}-list-wrapper`;
            this.cartListWrapper = listWrapper;

            this.cartList = document.createElement('div');
            this.cartList.id = `${CONFIG.UI_PREFIX}-cart-list`;
            this.cartList.className = `${CONFIG.UI_PREFIX}-list`;

            this.cartListInner = document.createElement('div');
            this.cartListInner.className = `${CONFIG.UI_PREFIX}-list-inner`;

            this.cartList.appendChild(this.cartListInner);
            this.cartList.addEventListener('scroll', () => {
                requestAnimationFrame(() => this._renderCartVirtual());
            });
            this.cartListInner.addEventListener('click', (e) => {
                const removeBtn = e.target.closest(`.${CONFIG.UI_PREFIX}-queue-remove`);
                if (removeBtn) {
                    const idx = parseInt(removeBtn.dataset.index, 10);
                    this.cart.splice(idx, 1);
                    // Bug 4 fix: use renderCart() so all panels (main, recent,
                    // trending) immediately lose the pink border for the removed item.
                    this.renderCart();
                }
            });
            listWrapper.appendChild(this.cartList);
            this.cartContainer.appendChild(cartHeader);
            this.cartContainer.appendChild(listWrapper);

            // Queue Footer
            const cartFooter = document.createElement('div');
            cartFooter.className = `${CONFIG.UI_PREFIX}-footer`;
            cartFooter.style.marginTop = 'auto'; // push to bottom
            cartFooter.style.paddingTop = '1rem';
            this.cartSaveBtn = document.createElement('button');
            this.cartSaveBtn.className = `${CONFIG.UI_PREFIX}-settings-save-btn`;
            this.cartSaveBtn.textContent = 'Save Selection';
            this.cartSaveBtn.disabled = true;
            this.cartSaveBtn.onclick = () => {
                if (this.cart.length > 0) {
                    Downloader.executeBatchSave(this.cart);
                    this.exitMultiSelectMode();
                }
            };

            cartFooter.appendChild(this.cartSaveBtn);
            this.cartContainer.appendChild(cartFooter);
            // ── Carousel track ─────────────────────────────────────────────
            // display:contents in desktop = transparent flex passthrough.
            // display:flex in carousel = the sliding container.
            const carouselTrack = document.createElement('div');
            carouselTrack.className = `${CONFIG.UI_PREFIX}-carousel-track`;
            // Assemble panels into the track (DOM order = carousel order)
            // Order: 0 Queue → 1 Recent → 2 Main → 3 Trending
            carouselTrack.appendChild(this.cartContainer);
            const recentPanelEl = this.createRecentHistoryPanel();
            carouselTrack.appendChild(recentPanelEl);

            const mainPanelEl = this.createMainPanel();

            // Queue pill — in-flow between list and footer inside the Main card.
            // Visible only in carousel mode when queue has items.
            // Arrow points LEFT (←) because the Queue card is to the left of Main.
            const queuePill = document.createElement('button');
            queuePill.className = `${CONFIG.UI_PREFIX}-queue-pill`;
            queuePill.setAttribute('aria-label', 'View queue');
            queuePill.onclick = () => this._carouselGoTo('queue');
            // ← chevron SVG
            const pillArrow = this._createSVG('M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z');
            const pillLabel = document.createElement('span');
            pillLabel.className = `${CONFIG.UI_PREFIX}-queue-pill-label`;
            pillLabel.textContent = '0 items in queue';
            queuePill.appendChild(pillArrow);
            queuePill.appendChild(pillLabel);
            // Insert between mainListWrapper and footer — both are children of the inner panel
            const innerPanel = mainPanelEl.querySelector(`.${CONFIG.UI_PREFIX}-main`);
            if (innerPanel && this.footer && this.footer.parentNode === innerPanel) {
                innerPanel.insertBefore(queuePill, this.footer);
            } else {
                mainPanelEl.appendChild(queuePill);
            }
            this._carousel.pillEl = queuePill;

            carouselTrack.appendChild(mainPanelEl);
            const trendingPanelEl = this.createSidePanel('Trending', 'right', 'trending', ICONS.flame);
            carouselTrack.appendChild(trendingPanelEl);

            // Carousel chrome — hidden via CSS in desktop mode
            const arrowPrev = this._buildCarouselArrow('prev');
            const arrowNext = this._buildCarouselArrow('next');
            const dotsEl    = this._buildCarouselDots();

            // carouselClip is the STATIONARY overflow:hidden window.
            // carouselTrack slides inside it via transform.
            // Arrows + dots are siblings of the clip (on layoutWrapper) so they
            // are never cropped by the clip's overflow:hidden.
            const carouselClip = document.createElement('div');
            carouselClip.className = `${CONFIG.UI_PREFIX}-carousel-clip`;
            carouselClip.appendChild(carouselTrack);

            layoutWrapper.appendChild(carouselClip);
            layoutWrapper.appendChild(arrowPrev);
            layoutWrapper.appendChild(arrowNext);
            layoutWrapper.appendChild(dotsEl);
            // Store references for use by carousel methods
            this._carousel.clip      = carouselClip;
            this._carousel.track     = carouselTrack;
            this._carousel.layoutEl  = layoutWrapper;
            this._carousel.arrowPrev = arrowPrev;
            this._carousel.arrowNext = arrowNext;
            this._carousel.dotsEl    = dotsEl;
            this._carousel.panelEls  = {
                queue:  this.cartContainer,
                recent: recentPanelEl,
                main:   mainPanelEl,
                trending: trendingPanelEl,
            };
            if (this.resizeObserver) {
                if (this.mainListWrapper) this.resizeObserver.observe(this.mainListWrapper);
                if (this.sidePanels.recent.wrapper) this.resizeObserver.observe(this.sidePanels.recent.wrapper);
                if (this.sidePanels.trending.wrapper) this.resizeObserver.observe(this.sidePanels.trending.wrapper);
                if (this.cartListWrapper) this.resizeObserver.observe(this.cartListWrapper);
            }

            this.overlay.appendChild(layoutWrapper);
            document.body.appendChild(this.overlay);
            this.updateListData('');
            this.refreshSidePanels();

            // Init carousel after the overlay is in the DOM (needs live dimensions)
            this._carouselInit();
            setTimeout(() => { if (this.searchInput) this.searchInput.focus(); }, 50);
        },

        async showMenu() {
            if (this.overlay) return;
            if (CloudAPI.isValid() && !CloudAPI.isRateLimited()) {
                Storage.fetchCloudBackground(true);
            }

            if (!Database.isLoaded) {
                document.body.style.cursor = 'wait';
                await Database.waitForLoad();
                document.body.style.cursor = '';
            }

            this.activeIndex = -1;
            this.currentView = 'groups';
            this.isCrudMode = false;
            this.isMultiSelectMode = false;
            this.cart = [];
            this.historySelected.clear();
            this.recentPanelMode = 'recent';

            this.render();
            this.syncInterval = setInterval(() => {
                if (CloudAPI.isValid() && !CloudAPI.isRateLimited()) {
                    Storage.fetchCloudBackground(true);
                }
            }, CONFIG.CLOUD_MENU_POLL_MS);
            this.syncTimeInterval = setInterval(() => {
                if (this.recentPanelMode === 'history') {
                    this.updateSyncTimeUI();
                }
            }, 15000);
        },

        closeMenu() {
            if (this.currentView === 'config' && this.hasUnsavedChanges()) {
                if (!confirm("You have unsaved changes. Discard them?")) return;
            }
            if (this.overlay) {
                this.exitMultiSelectMode();
                this.overlay.remove();
                this.overlay = null;
                document.body.style.overflow = '';

                if (this.resizeObserver) {
                    this.resizeObserver.disconnect();
                }
                if (this.syncInterval) {
                    clearInterval(this.syncInterval);
                    this.syncInterval = null;
                }
                if (this.syncTimeInterval) {
                    clearInterval(this.syncTimeInterval);
                    this.syncTimeInterval = null;
                }
                // Cancel any in-flight rAF render passes to prevent
                // callbacks firing against detached DOM elements.
                if (this._pendingRenderFrame !== null) {
                    cancelAnimationFrame(this._pendingRenderFrame);
                    this._pendingRenderFrame = null;
                }
                if (this._pendingResizeFrame !== null) {
                    cancelAnimationFrame(this._pendingResizeFrame);
                    this._pendingResizeFrame = null;
                }
                // Detach resize + mouseup listeners; reset carousel state
                this._carouselDestroy();
            }
        }
    };
    // =========================================================
    // CORE APPLICATION MODULE
    // =========================================================
    const App = {
        isSilentMode: false,

        init() {
            if (window.__XivMediaDlInitialized) return;
            window.__XivMediaDlInitialized = true;

            this.isSilentMode = !this.isDirectMediaPage();

            CloudAPI.loadConfig();
            Storage.init(this.isSilentMode);

            if (this.isSilentMode) {
                Logger.info('Initialized Silent Cloud Worker v21.1');
                return;
            }

            UI.initTemplates();
            UI.injectGlobals();
            UI.injectStyles();
            this.bindEvents();
            // Initialize the database first — isLoaded must be set as early as
            // possible so showMenu() doesn't stall in waitForLoad().
            Database.init();

            setInterval(() => {
                if (document.visibilityState === 'visible' && !UI.overlay) {
                    Storage.fetchCloudBackground();
                }
            }, CONFIG.CLOUD_HISTORY_THROTTLE_MS);
            Logger.info('Initialized Xiv Media Downloader v21.1');
        },

        isDirectMediaPage() {
            const type = document.contentType || '';
            return type.startsWith('image/') || type.startsWith('video/');
        },

        bindEvents() {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    Storage.fetchCloudBackground();
                }
            });
            // Handle Dynamic FAB Tracking
            document.addEventListener('mousemove', (e) => {
                if (UI.overlay) return; // Disconnect tracking when overlay is open to save CPU
                if (!UI.fabTicking) {
                    window.requestAnimationFrame(() => {
                        UI.updateFABPosition(e.clientX, e.clientY);
                        UI.fabTicking = false;
                    });
                    UI.fabTicking = true;
                }
            });

            window.addEventListener('keydown', (e) => {
                // Overlay/Menu Exclusive Shortcuts
                if (UI.overlay) {
                    if (e.key === 'Escape') {
                        UI.closeMenu();
                        return;
                    }
                    // ← / → navigate the carousel (only when not typing in a field)
                    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
                        !e.target.matches('input, textarea, [contenteditable]')) {
                        e.preventDefault();
                        if (e.key === 'ArrowLeft') UI._carouselPrev();
                        else                       UI._carouselNext();
                        return;
                    }
                    if (e.altKey && e.key.toLowerCase() === 's') {
                        e.preventDefault();
                        if (UI.stdSaveBtn && !UI.stdSaveBtn.disabled) UI.stdSaveBtn.click();
                        return;
                    }
                    if (e.altKey && e.key.toLowerCase() === 'c') {
                        e.preventDefault();
                        if (UI.customBtn && !UI.customBtn.disabled) UI.customBtn.click();
                        return;
                    }
                }

                // Global Shortcuts
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    UI.showMenu();
                }
            }, true);
        }
    };

    App.init();

})();
