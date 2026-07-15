// ==UserScript==
// @name         [Universal] Xiv Media Downloader
// @namespace    https://github.com/myouisaur/Universal
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FF4081'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 11h3l-4 4-4-4h3V8h2v5z'/%3E%3C/svg%3E
// @version      24.3
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
        STORAGE_PREFIX: 'xiv_media_dl',
        STORAGE_KEY: 'xiv_media_dl_history',
        HISTORY_MAX_DAYS: 180,
        FAB_Z_INDEX: 999990,
        OVERLAY_Z_INDEX: 999999,
        SAVE_DEBOUNCE_MS: 1000,
        CLOUD_SAVE_QUIET_WINDOW_MS: 10000,
        CLOUD_HISTORY_THROTTLE_MS: 30000,
        CLOUD_MENU_POLL_MS: 10000,
        VIRTUAL_ITEM_HEIGHT: 50,
        MAX_ACTIVE_TOASTS: 3,
        AUTO_CLOSE_COUNTDOWN_MS: 5000,
        AUTO_CLOSE_MAX_WAIT_MS: 5000,
        TRENDING_SCOPE_DAYS: 365,
        TRENDING_HALF_LIFE_DAYS: 4,
        CAROUSEL_BREAKPOINT_PX: 1450,
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
        flame: "M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z",
        globe: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.09 13.36 4 12.69 4 12s.09-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.34.16-2h4.68c.09.66.16 1.32.16 2s-.07 1.34-.16 2zm1.8 4h-2.95c.32-1.25.78-2.45 1.38-3.56 1.84.63 3.37 1.9 4.33 3.56zm1.6-6h-3.38c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.17.64.26 1.31.26 2s-.09 1.36-.26 2z",
        link: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
        plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
    };

    // =========================================================
    // UTILITIES
    // =========================================================
    const Logger = {
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
        toProperCase(str) {
            return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        },
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

            clearBtn.addEventListener('mousedown', (e) => e.preventDefault());
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                inputEl.value = '';
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.focus();
                toggle();
            });
            inputEl.addEventListener('input', toggle);
            toggle();

            return wrapper;
        },
        makeFocusable(el) {
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    el.click();
                }
            });
        },
        createInfoTooltip(text) {
            const wrapper = document.createElement('span');
            wrapper.className = `${CONFIG.UI_PREFIX}-tooltip-wrapper`;

            const icon = document.createElement('button');
            icon.type = 'button';
            icon.className = `${CONFIG.UI_PREFIX}-tooltip-icon`;
            icon.textContent = '?';
            icon.setAttribute('aria-label', text);

            const bubble = document.createElement('span');
            bubble.className = `${CONFIG.UI_PREFIX}-tooltip-bubble`;
            bubble.setAttribute('role', 'tooltip');
            bubble.textContent = text;

            wrapper.appendChild(icon);
            wrapper.appendChild(bubble);
            return wrapper;
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
        metaLinks: {},
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
                    this.setCache(freshData);
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
            const payload = { ...this.data, _xiv_links: this.metaLinks };
            await CloudAPI.put(CONFIG.GITHUB_DB_PATH, payload);
            this.setCache(payload);
        },

        processData(data) {
            data = data || {};
            this.metaLinks = data._xiv_links || {};
            const cleanData = { ...data };
            delete cleanData._xiv_links;
            this.data = cleanData;
            this.sortedGroups = Object.keys(this.data).sort((a, b) => a.localeCompare(b));
        },

        getLinks(id) {
            return this.metaLinks[id] || [];
        },

        addLink(id, text, url) {
            if (!this.metaLinks[id]) this.metaLinks[id] = [];
            this.metaLinks[id].push({ t: text.trim(), u: url.trim() });
        },

        editLink(id, index, text, url) {
            if (this.metaLinks[id] && this.metaLinks[id][index]) {
                this.metaLinks[id][index] = { t: text.trim(), u: url.trim() };
            }
        },

        deleteLink(id, index) {
            if (this.metaLinks[id]) {
                this.metaLinks[id].splice(index, 1);
                if (this.metaLinks[id].length === 0) delete this.metaLinks[id];
            }
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

            const payload = { ...this.data, _xiv_links: this.metaLinks };
            this.processData(payload);
            return true;
        },

        deleteGroup(groupName) {
            if (!this.data[groupName]) return false;
            delete this.data[groupName];

            const payload = { ...this.data, _xiv_links: this.metaLinks };
            this.processData(payload);
            return true;
        },

        renameGroup(oldName, newName) {
            const normalized = newName.trim();
            if (!normalized || this.data[normalized] || !this.data[oldName]) return false;
            this.data[normalized] = this.data[oldName];
            delete this.data[oldName];

            const payload = { ...this.data, _xiv_links: this.metaLinks };
            this.processData(payload);
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
        _quietPushTimer: null,
        _lastCloudFetch: 0,
        _taskQueue: Promise.resolve(),

        init(isSilentMode = false) {
            this.cleanupDeprecatedConfig();
            this.syncFromStorage();

            this._saveLocalDebounced = Utils.debounce(() => {
                GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(this._cache));
            }, CONFIG.SAVE_DEBOUNCE_MS);
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

        _scheduleQuietPush() {
            const activityKey = `${CONFIG.STORAGE_PREFIX}_last_save_activity`;
            GM_setValue(activityKey, Date.now());

            if (this._quietPushTimer) clearTimeout(this._quietPushTimer);

            const checkQuiet = () => {
                this._quietPushTimer = null;
                const lastActivity = GM_getValue(activityKey, 0);
                const elapsed = Date.now() - lastActivity;

                if (elapsed >= CONFIG.CLOUD_SAVE_QUIET_WINDOW_MS) {
                    this.saveCloud();
                } else {
                    this._quietPushTimer = setTimeout(checkQuiet, CONFIG.CLOUD_SAVE_QUIET_WINDOW_MS - elapsed);
                }
            };

            this._quietPushTimer = setTimeout(checkQuiet, CONFIG.CLOUD_SAVE_QUIET_WINDOW_MS);
        },

        clearLocalHistory() {
            this._cache = [];
            GM_setValue(CONFIG.STORAGE_KEY, '[]');
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
                    this._scheduleQuietPush();
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
                    this._scheduleQuietPush();
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
                    this._scheduleQuietPush();
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

        _trendingWeight(timestampMs, nowMs) {
            const ageMs = nowMs - timestampMs;
            const scopeMs = CONFIG.TRENDING_SCOPE_DAYS * 24 * 60 * 60 * 1000;
            if (ageMs < 0 || ageMs > scopeMs) return 0;
            const HALF_LIFE_MS = CONFIG.TRENDING_HALF_LIFE_DAYS * 24 * 60 * 60 * 1000;
            return Math.pow(2, -ageMs / HALF_LIFE_MS);
        },

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
        currentView: 'groups', // 'groups', 'members', 'config', 'diagnostics', 'links'
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

        // Links state
        currentLinkTargetId: null,
        currentLinkTitle: null,
        isLinkFormActive: false,
        editLinkIndex: null,

        linksWrapper: null,
        linksListInner: null,
        linkFormContainer: null,
        linkTextInput: null,
        linkUrlInput: null,
        linkSaveBtn: null,
        headerAddLinkBtn: null,

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

        diagnosticsContainer: null,
        diagnosticsBody: null,
        _previousView: null,

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
        linksCachedHeight: 400,
        resizeObserver: null,

        _pendingRenderFrame: null,
        _pendingResizeFrame: null,

        // ── Carousel system state
        _carousel: {
            isActive: false,
            currentId: 'main',
            panelEls: {},
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
            breakpointPx: CONFIG.CAROUSEL_BREAKPOINT_PX,
            cachedCardWidth: 0,
            isSwitching: false,
            closeButtons: null
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
                    --tm-bg-elevated: #1a1a1a;
                    --tm-border: #222;
                    --tm-border-light: #333;
                    --tm-border-focus: #555;
                    --tm-text-main: #fff;
                    --tm-text-heading: #eee;
                    --tm-text-muted: #aaa;
                    --tm-text-dark: #666;
                    --tm-text-subtle: #888;
                    --tm-text-dim: #999;
                    --tm-danger: #e57373;
                    --tm-success: #81c784;
                    --tm-warning: #ffb74d;
                    --tm-confirm-bg: #1e3a2b;
                    --tm-confirm-border: #2c5941;
                    --tm-confirm-text: #4ade80;
                    --tm-confirm-hover: #244935;
                }

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

                #${CONFIG.UI_PREFIX}-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(0,0,0,0.85); z-index: ${CONFIG.OVERLAY_Z_INDEX};
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-family: 'Inter', -apple-system, sans-serif; backdrop-filter: blur(8px);
                    user-select: none;
                    -webkit-user-select: none; -moz-user-select: none;
                }
                #${CONFIG.UI_PREFIX}-overlay input,
                #${CONFIG.UI_PREFIX}-overlay textarea {
                    user-select: text;
                    -webkit-user-select: text; -moz-user-select: text;
                }
                #${CONFIG.UI_PREFIX}-overlay button:focus-visible,
                #${CONFIG.UI_PREFIX}-overlay [role="button"]:focus-visible {
                    outline: 2px solid var(--tm-primary);
                    outline-offset: 2px;
                    border-radius: 0.3rem;
                }

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

                .${CONFIG.UI_PREFIX}-carousel-track {
                    display: flex;
                    flex-wrap: nowrap;
                    gap: inherit;
                    align-items: flex-end;
                }

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

                @keyframes ${CONFIG.UI_PREFIX}-panel-glow-pulse {
                    0%   { box-shadow: 0 2rem 4rem rgba(0,0,0,0.8), 0 0 0 0 transparent; }
                    25%  { box-shadow: 0 2rem 4rem rgba(0,0,0,0.8), 0 0 1rem 0.2rem var(--tm-primary); }
                    100% { box-shadow: 0 2rem 4rem rgba(0,0,0,0.8), 0 0 0 0 transparent; }
                }
                .${CONFIG.UI_PREFIX}-panel-glow {
                    animation: ${CONFIG.UI_PREFIX}-panel-glow-pulse 0.8s ease-out;
                }

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

                .${CONFIG.UI_PREFIX}-header {
                    display: flex;
                    align-items: center; justify-content: space-between; gap: 1rem;
                    height: 2.5rem; margin-bottom: 1rem; flex-shrink: 0; width: 100%;
                }
                .${CONFIG.UI_PREFIX}-header-left  { display: flex; align-items: center; gap: 0.8rem; overflow: hidden; flex-grow: 1; }
                .${CONFIG.UI_PREFIX}-header-right { display: flex; align-items: center; justify-content: flex-end; flex-shrink: 0; gap: 0.4rem; }

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
                .${CONFIG.UI_PREFIX}-settings-section {
                    display: flex; align-items: center; gap: 0.4rem;
                    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em;
                    color: var(--tm-text-dim); text-transform: uppercase;
                    margin: 0.6rem 0 0.5rem;
                }
                .${CONFIG.UI_PREFIX}-settings-section--bottom { margin-top: auto; }

                /* ── Info Tooltip ─────────────────────────────────────────── */
                .${CONFIG.UI_PREFIX}-tooltip-wrapper { position: relative; display: inline-flex; }
                .${CONFIG.UI_PREFIX}-tooltip-icon {
                    width: 1rem; height: 1rem; border-radius: 50%;
                    background: var(--tm-bg-elevated); border: 1px solid var(--tm-border-light);
                    color: var(--tm-text-dim); font-size: 0.65rem; font-weight: 700;
                    line-height: 1; cursor: help; display: flex; align-items: center;
                    justify-content: center; padding: 0; text-transform: none;
                    letter-spacing: normal; transition: background 0.15s, color 0.15s;
                }
                .${CONFIG.UI_PREFIX}-tooltip-icon:hover,
                .${CONFIG.UI_PREFIX}-tooltip-icon:focus-visible {
                    background: var(--tm-primary); color: var(--tm-text-main); border-color: var(--tm-primary);
                }
                .${CONFIG.UI_PREFIX}-tooltip-bubble {
                    position: absolute; bottom: calc(100% + 0.5rem); left: 0;
                    transform: translateY(0.3rem);
                    width: max-content; max-width: 14rem;
                    background: var(--tm-bg-elevated); border: 1px solid var(--tm-border-light);
                    border-radius: 0.5rem; padding: 0.55rem 0.7rem;
                    font-size: 0.78rem; font-weight: 400; color: var(--tm-text-main);
                    text-transform: none; letter-spacing: normal; line-height: 1.4;
                    box-shadow: 0 0.4rem 1rem rgba(0,0,0,0.4);
                    opacity: 0; pointer-events: none; z-index: 20;
                    transition: opacity 0.15s ease, transform 0.15s ease;
                }
                .${CONFIG.UI_PREFIX}-tooltip-icon:hover ~ .${CONFIG.UI_PREFIX}-tooltip-bubble,
                .${CONFIG.UI_PREFIX}-tooltip-icon:focus-visible ~ .${CONFIG.UI_PREFIX}-tooltip-bubble {
                    opacity: 1; transform: translateY(0);
                }

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

                /* ── Links View ───────────────────────────────────────────── */
                /* Outer — flex-sized by the panel layout, not scrollable
                   itself. Mirrors .${CONFIG.UI_PREFIX}-list-wrapper exactly. */
                .${CONFIG.UI_PREFIX}-links-wrapper {
                    display: none; flex-grow: 1; min-height: 0; width: 100%;
                    overflow: hidden; flex-direction: column; justify-content: flex-start;
                }
                /* Middle — the actual scrollable element, height set explicitly
                   by the ResizeObserver (snapped to itemHeight multiples), same
                   as .${CONFIG.UI_PREFIX}-list. */
                .${CONFIG.UI_PREFIX}-links-list {
                    width: 100%; overflow-y: auto; overflow-x: hidden;
                    position: relative; padding-right: 0.5rem;
                    box-sizing: border-box; outline: none;
                }
                .${CONFIG.UI_PREFIX}-links-list::-webkit-scrollbar { width: 6px; }
                .${CONFIG.UI_PREFIX}-links-list::-webkit-scrollbar-thumb { background: var(--tm-border-light); border-radius: 10px; }
                /* Inner — height set to totalItems*itemHeight so the scrollbar
                   is correctly sized; only the currently-visible rows are
                   actually rendered inside it (real virtualization, not just
                   visual styling this time). Mirrors .${CONFIG.UI_PREFIX}-list-inner. */
                .${CONFIG.UI_PREFIX}-links-list-inner {
                    position: relative; width: 100%; min-height: 100%;
                }
                /* Matches .${CONFIG.UI_PREFIX}-item exactly — same fixed
                   height/position/transform-based placement, not flex flow,
                   so each row occupies a fixed "slot" like every other list
                   in the app. */
                .${CONFIG.UI_PREFIX}-link-item {
                    position: absolute; top: 0; left: 0; width: 100%; height: 42px;
                    background: #141414; border: 1px solid transparent;
                    padding: 0 1rem; border-radius: 0.8rem; display: flex;
                    justify-content: space-between; align-items: center; gap: 0.5rem;
                    transition: background 0.15s, border-color 0.15s;
                    box-sizing: border-box; will-change: transform;
                }
                .${CONFIG.UI_PREFIX}-link-item:hover {
                    background: var(--tm-bg-hover); border-color: var(--tm-border-focus);
                }
                .${CONFIG.UI_PREFIX}-link-text {
                    flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                    color: var(--tm-text-main) !important; text-decoration: none !important;
                    font-size: 0.95rem; outline: none; display: block;
                }
                .${CONFIG.UI_PREFIX}-link-actions { display: flex; align-items: center; gap: 0.2rem; flex-shrink: 0; }
                /* Full vertical + horizontal centering — not just a small
                   fixed offset from the top like the main list's empty state,
                   since a links panel is usually either fully empty or has
                   just a couple rows, so centering in the middle reads better. */
                .${CONFIG.UI_PREFIX}-links-empty-state {
                    position: absolute; inset: 0;
                    display: flex; align-items: center; justify-content: center;
                    text-align: center; color: var(--tm-text-dark);
                    font-size: 0.9rem; font-style: italic; padding: 0 1rem;
                }
                .${CONFIG.UI_PREFIX}-link-form {
                    display: none; flex-direction: column; gap: 0.8rem; flex-grow: 1;
                }
                /* The clear-button wrapper defaults to flex-grow:1 for its
                   original horizontal contexts (search/CRUD bars). Inside this
                   vertical form, that made each field stretch to fill available
                   column height, spreading Title/URL/Save far apart. Scoped
                   override: natural height only, fields stack tightly instead. */
                .${CONFIG.UI_PREFIX}-link-form .${CONFIG.UI_PREFIX}-input-clear-wrapper {
                    flex-grow: 0;
                }

                /* ════════════════════════════════════════════════════════════
                   CAROUSEL SYSTEM
                ════════════════════════════════════════════════════════════ */
                .${CONFIG.UI_PREFIX}-queue-pill {
                    display: none; width: 100%;
                    align-items: center; justify-content: center; gap: 0.45rem;
                    background: rgba(255, 64, 129, 0.12); color: var(--tm-primary);
                    border: 1px solid rgba(255, 64, 129, 0.35); border-radius: 0.7rem;
                    padding: 0.55rem 1rem; font-size: 0.82rem; font-weight: 600; font-family: inherit;
                    cursor: pointer; white-space: nowrap; flex-shrink: 0;
                    margin-top: 0.5rem; opacity: 0; pointer-events: none;
                    transition: opacity 0.22s ease, background 0.2s ease;
                }
                .${CONFIG.UI_PREFIX}-queue-pill svg { width: 0.95rem; height: 0.95rem; fill: var(--tm-primary); flex-shrink: 0; }
                .${CONFIG.UI_PREFIX}-queue-pill:hover { background: rgba(255, 64, 129, 0.22); border-color: rgba(255, 64, 129, 0.6); }
                .${CONFIG.UI_PREFIX}-queue-pill.visible { display: flex; opacity: 1; pointer-events: auto; }
                .${CONFIG.UI_PREFIX}-layout:not(.${CONFIG.UI_PREFIX}-carousel) .${CONFIG.UI_PREFIX}-queue-pill { display: none !important; }

                .${CONFIG.UI_PREFIX}-carousel-arrow {
                    position: absolute; top: 50%; transform: translateY(-50%);
                    width: 2.4rem; height: 2.4rem; background: rgba(15,15,15,0.92);
                    border: 1px solid var(--tm-border-light); border-radius: 50%;
                    display: none; align-items: center; justify-content: center;
                    cursor: pointer; z-index: 30; opacity: 0.8;
                    transition: opacity 0.2s, background 0.2s; backdrop-filter: blur(6px);
                }
                .${CONFIG.UI_PREFIX}-carousel-arrow:hover      { opacity: 1; background: rgba(40,40,40,0.97); }
                .${CONFIG.UI_PREFIX}-carousel-arrow.prev        { left:  -1.3rem; }
                .${CONFIG.UI_PREFIX}-carousel-arrow.next        { right: -1.3rem; }
                .${CONFIG.UI_PREFIX}-carousel-arrow svg         { width: 1rem; height: 1rem; fill: var(--tm-text-main); }
                .${CONFIG.UI_PREFIX}-carousel-arrow.edge-disabled { opacity: 0.2; pointer-events: none; }

                .${CONFIG.UI_PREFIX}-carousel-dots {
                    position: absolute; bottom: -1.7rem; left: 50%;
                    transform: translateX(-50%); display: none; gap: 0.4rem; align-items: center;
                }
                .${CONFIG.UI_PREFIX}-carousel-dot {
                    width: 0.45rem; height: 0.45rem; border-radius: 50%;
                    background: var(--tm-border-focus); transition: background 0.2s, transform 0.2s;
                    cursor: pointer; border: none; padding: 0; outline: none;
                }
                .${CONFIG.UI_PREFIX}-carousel-dot.active { background: var(--tm-primary); transform: scale(1.5); }

                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel {
                    position: fixed !important; top: 50% !important; left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    overflow: visible; width: min(92vw, 26rem); max-width: min(92vw, 26rem);
                    min-width: 0; height: clamp(60vh, 76vh, 86vh); max-height: clamp(60vh, 76vh, 86vh);
                    gap: 0; align-items: stretch;
                }
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-arrow { display: flex; }
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-dots  { display: flex; }

                .${CONFIG.UI_PREFIX}-carousel-clip { display: contents; }
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-clip {
                    display: block; overflow: hidden; width: 100%; height: 100%; border-radius: 1.5rem;
                    box-shadow: 0 24px 64px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.07);
                    transform: translateZ(0); backface-visibility: hidden; -webkit-backface-visibility: hidden; isolation: isolate;
                }

                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-track {
                    display: flex; flex-wrap: nowrap; width: 100%; height: 100%;
                    will-change: transform; transition: transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
                }

                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-track > * {
                    flex: 0 0 100%; flex-shrink: 0; order: 0 !important;
                    width: 100% !important; max-width: 100% !important; height: 100% !important; min-height: 0;
                    margin: 0 !important; padding: 1.5rem !important; border: none !important; border-radius: 0 !important;
                    box-shadow: none !important; opacity: 1 !important; pointer-events: auto !important; overflow: hidden;
                    box-sizing: border-box !important; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility;
                }

                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-track .${CONFIG.UI_PREFIX}-cart-panel.active {
                    width: 100% !important; padding: 1.5rem !important; margin: 0 !important;
                }

                .${CONFIG.UI_PREFIX}-item-selected { border-color: var(--tm-primary) !important; background: rgba(255, 64, 129, 0.12) !important; }
                .${CONFIG.UI_PREFIX}-cart-check { color: var(--tm-primary); font-weight: 700; font-size: 0.95rem; flex-shrink: 0; line-height: 1; }

                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-track > .${CONFIG.UI_PREFIX}-main-container { padding: 0 !important; }
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-carousel .${CONFIG.UI_PREFIX}-carousel-track > .${CONFIG.UI_PREFIX}-main-container > .${CONFIG.UI_PREFIX}-panel {
                    height: 100% !important; border-radius: 0 !important; box-shadow: none !important; border: none !important; box-sizing: border-box !important;
                }

                .${CONFIG.UI_PREFIX}-layout { transition: opacity 0.18s ease; }
                .${CONFIG.UI_PREFIX}-layout.${CONFIG.UI_PREFIX}-mode-switching { opacity: 0; pointer-events: none; }
            `);
        },

        _carouselGetActivePanels() {
            const ids = ['recent', 'main', 'trending'];
            if (this.isMultiSelectMode) ids.unshift('queue');
            return ids;
        },

        _carouselCurrentIndex() {
            const panels = this._carouselGetActivePanels();
            const idx = panels.indexOf(this._carousel.currentId);
            return idx === -1 ? 0 : idx;
        },

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

        _carouselApplyTransform(animated) {
            const track = this._carousel.track;
            const layoutEl = this._carousel.layoutEl;
            if (!track || !layoutEl || !this._carousel.isActive) return;

            const panels = this._carouselGetActivePanels();
            ['queue', 'recent', 'main', 'trending'].forEach(id => {
                const el = this._carousel.panelEls[id];
                if (!el) return;
                el.style.display = panels.includes(id) ? '' : 'none';
            });
            const idx = this._carouselCurrentIndex();

            if (!this._carousel.cachedCardWidth) {
                this._carousel.cachedCardWidth = layoutEl.getBoundingClientRect().width;
            }
            const cardWidth = this._carousel.cachedCardWidth;
            if (!animated) {
                track.style.transition = 'none';
                track.style.transform  = `translateX(${-idx * cardWidth}px)`;
                requestAnimationFrame(() => { track.style.transition = ''; });
            } else {
                track.style.transform = `translateX(${-idx * cardWidth}px)`;
            }
        },

        _carouselUpdateDots() {
            const dotsEl = this._carousel.dotsEl;
            if (!dotsEl) return;
            const panels     = this._carouselGetActivePanels();
            const currentIdx = this._carouselCurrentIndex();
            const labels     = { queue: 'Queue', recent: 'Recent', main: 'Main', trending: 'Trending' };
            const existingDots = dotsEl.children;
            if (existingDots.length === panels.length) {
                for (let i = 0; i < existingDots.length; i++) {
                    existingDots[i].classList.toggle('active', i === currentIdx);
                }
                return;
            }

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

        _carouselUpdateArrows() {
            const { arrowPrev, arrowNext } = this._carousel;
            if (!arrowPrev || !arrowNext) return;
            const idx    = this._carouselCurrentIndex();
            const panels = this._carouselGetActivePanels();
            arrowPrev.classList.toggle('edge-disabled', idx === 0);
            arrowNext.classList.toggle('edge-disabled', idx >= panels.length - 1);
        },

        _carouselUpdatePill() {
            const pill = this._carousel.pillEl;
            if (!pill) return;
            const count = this.cart ? this.cart.length : 0;
            const show  = this._carousel.isActive &&
                          this.isMultiSelectMode &&
                          count > 0 &&
                          this._carousel.currentId === 'main';
            const label = count === 1 ? '1 item in queue' : `${count} items in queue`;
            const textNode = pill.querySelector(`.${CONFIG.UI_PREFIX}-queue-pill-label`);
            if (textNode) textNode.textContent = label;
            pill.classList.toggle('visible', show);
        },

        _carouselRefreshNav() {
            this._carouselUpdateDots();
            this._carouselUpdateArrows();
            this._carouselUpdatePill();
        },

        _buildCarouselArrow(direction) {
            const btn = document.createElement('button');
            btn.className = `${CONFIG.UI_PREFIX}-carousel-arrow ${direction}`;
            btn.setAttribute('aria-label', direction === 'prev' ? 'Previous panel' : 'Next panel');
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

        _buildCarouselDots() {
            const el = document.createElement('div');
            el.className = `${CONFIG.UI_PREFIX}-carousel-dots`;
            return el;
        },

        _carouselSetupInputs(trackEl, layoutEl) {
            let touchStartX = 0, touchStartY = 0;
            trackEl.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
            trackEl.addEventListener('touchend', (e) => {
                if (!this._carousel.isActive) return;
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                if (Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 45) {
                    if (dx < 0) this._carouselNext();
                    else        this._carouselPrev();
                }
            }, { passive: true });
            let mouseStartX = 0, mouseDragging = false;
            trackEl.addEventListener('mousedown', (e) => {
                if (!this._carousel.isActive) return;
                mouseStartX  = e.clientX;
                mouseDragging = true;
            });
            trackEl.addEventListener('mousemove', (e) => {
                if (mouseDragging) e.preventDefault();
            });
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

            layoutEl.addEventListener('wheel', (e) => {
                if (!this._carousel.isActive) return;
                const absX = Math.abs(e.deltaX);
                const absY = Math.abs(e.deltaY);
                if (absX < absY * 0.5 || absX < 15) return;
                e.preventDefault();
                const deltaX = e.deltaX;
                clearTimeout(this._carousel.wheelTimer);
                this._carousel.wheelTimer = setTimeout(() => {
                    if (deltaX > 0) this._carouselNext();
                    else        this._carouselPrev();
                }, 60);
            }, { passive: false });
        },

        _carouselInit() {
            const layoutEl = this._carousel.layoutEl;
            const trackEl  = this._carousel.track;
            if (!layoutEl || !trackEl) return;

            this._carouselSetupInputs(trackEl, layoutEl);
            this._carousel._resizeHandler = Utils.debounce(() => {
                this._carouselUpdateMode();
            }, 120);
            window.addEventListener('resize', this._carousel._resizeHandler);

            this._carouselUpdateMode();
            this._updatePanelCloseButtonVisibility();
        },

        _carouselUpdateMode() {
            const layoutEl = this._carousel.layoutEl;
            if (!layoutEl) return;

            this._carousel.cachedCardWidth = 0;

            const shouldBeCarousel = window.innerWidth <= this._carousel.breakpointPx;
            const wasActive = this._carousel.isActive;
            if (shouldBeCarousel === wasActive) {
                if (shouldBeCarousel) {
                    this._carouselApplyTransform(false);
                    this._carouselRefreshNav();
                }
                return;
            }

            if (this._carousel.isSwitching) return;
            this._carousel.isSwitching = true;

            const P = CONFIG.UI_PREFIX;
            const switchingClass = `${P}-mode-switching`;

            layoutEl.classList.add(switchingClass);

            const FADE_MS = 180;
            setTimeout(() => {
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
                    this._carousel.cachedCardWidth = 0;
                    this._carouselApplyTransform(false);
                    this._carouselRefreshNav();
                }

                requestAnimationFrame(() => {
                    layoutEl.classList.remove(switchingClass);
                    this._carousel.isSwitching = false;
                });
            }, FADE_MS);
        },

        _carouselOnMultiSelectActivate() {
            if (!this._carousel.isActive) return;
            this._carouselRefreshNav();
            if (!GM_getValue(`${CONFIG.STORAGE_PREFIX}_carousel_hint_shown`, false)) {
                GM_setValue(`${CONFIG.STORAGE_PREFIX}_carousel_hint_shown`, true);
                this.showToast('Your queue is a swipe away — slide left to view it.', 'info');
            }
        },

        _carouselOnMultiSelectDeactivate() {
            if (!this._carousel.isActive) return;
            if (this._carousel.currentId === 'queue') {
                this._carousel.currentId = 'main';
            }
            this._carouselApplyTransform(false);
            requestAnimationFrame(() => {
                this._carouselApplyTransform(false);
                this._carouselRefreshNav();
            });
        },

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
                this.fab.addEventListener('pointerdown', (e) => this._spawnFabRipple(e));

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
            if (this.fabIsAnimating || this.fabCurrentQuad === this.fabTargetQuad) return;

            let nextQuad;
            if (this.fabCurrentQuad[0] === this.fabTargetQuad[0] || this.fabCurrentQuad[1] === this.fabTargetQuad[1]) {
                nextQuad = this.fabTargetQuad;
            } else {
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
                this.processFABMove();
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
                    await Promise.race([
                        Storage._taskQueue,
                        new Promise(resolve => setTimeout(resolve, CONFIG.AUTO_CLOSE_MAX_WAIT_MS))
                    ]);
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
                    const isInCart = !isTrendingGroupMode && this.isMultiSelectMode &&
                        this.cart.some(c => c.g === itemData.g && c.n === itemData.n);
                    if (isInCart) btn.classList.add(`${CONFIG.UI_PREFIX}-item-selected`);

                    let badgeText, badgeClass;
                    if (isTrendingGroupMode) {
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

        _updatePanelCloseButtonVisibility() {
            if (!this._carousel.closeButtons) return;
            const showAll = this._carousel.isActive;
            Object.values(this._carousel.closeButtons).forEach(btn => {
                btn.style.display = showAll ? '' : 'none';
            });
        },

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

            const switchMode = (nextMode) => {
                const trendingState = this.sidePanels.trending;
                if (trendingState.viewMode === nextMode) return;

                if (trendingState.container) {
                    trendingState.scrollPositions[trendingState.viewMode] = trendingState.container.scrollTop;
                }

                trendingState.viewMode = nextMode;
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

        _openGroupInMainPanel(group) {
            this.selectedGroup = group;
            this.currentView = 'members';
            if (this.searchInput) this.searchInput.value = '';

            requestAnimationFrame(() => this.updateListData(''));

            const mainContainer = this._carousel.panelEls ? this._carousel.panelEls.main : null;
            const mainPanelBox = mainContainer ? mainContainer.querySelector(`.${CONFIG.UI_PREFIX}-panel`) : null;
            if (mainPanelBox) {
                const glowClass = `${CONFIG.UI_PREFIX}-panel-glow`;
                mainPanelBox.classList.remove(glowClass);
                void mainPanelBox.offsetWidth;
                mainPanelBox.classList.add(glowClass);
                mainPanelBox.addEventListener('animationend', () => {
                    mainPanelBox.classList.remove(glowClass);
                }, { once: true });
            }

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
                } else if (this.currentView === 'links') {
                    if (this.isLinkFormActive) {
                        this.isLinkFormActive = false;
                    } else {
                        // Restore exactly where we came from — a 'groups'-view
                        // search result showing a member's globe icon must
                        // return to 'groups' (with that search intact), not
                        // always jump to 'members' just because the link
                        // target happened to be a member.
                        this.currentView = this._previousLinksView || 'groups';
                        const restoreSearch = this._previousLinksSearch || '';
                        if (this.searchInput) this.searchInput.value = restoreSearch;
                        this.updateListData(restoreSearch.toLowerCase().trim());
                        this._previousLinksView = null;
                        this._previousLinksSearch = null;
                    }
                } else if (this.currentView === 'members') {
                    this.currentView = 'groups';
                    this.selectedGroup = null;
                    this.searchInput.value = '';
                    this.updateListData('');
                }
                this.updateVisibility();
                if (this.currentView === 'links') this.renderLinks();
            };
            leftGroup.appendChild(this.headerBackBtn);

            this.headerTitle = document.createElement('h2');
            this.headerTitle.className = `${CONFIG.UI_PREFIX}-icon-title`;
            leftGroup.appendChild(this.headerTitle);

            const rightGroup = document.createElement('div');
            rightGroup.className = `${CONFIG.UI_PREFIX}-header-right`;

            this.headerAddLinkBtn = document.createElement('div');
            this.headerAddLinkBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
            Utils.makeFocusable(this.headerAddLinkBtn);
            this.headerAddLinkBtn.title = "Add New Link";
            this.headerAddLinkBtn.appendChild(this._createSVG(ICONS.plus));
            this.headerAddLinkBtn.style.display = 'none';
            this.headerAddLinkBtn.onclick = () => {
                this.isLinkFormActive = true;
                this.editLinkIndex = null;
                this.linkTextInput.value = '';
                this.linkUrlInput.value = '';
                this.linkTextInput.dispatchEvent(new Event('input', { bubbles: true }));
                this.linkUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
                this.updateVisibility();
            };
            rightGroup.appendChild(this.headerAddLinkBtn);

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
            const token = createSettingsField('Token', 'password', `${CONFIG.STORAGE_PREFIX}_github_token`, '', 'github_pat_...');

            this.configInputs = { token: token.inputElement };
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

            this.configInputs.token.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveConfigBtn.click(); }
            });

            configBody.appendChild(token.fieldWrapper);

            const backupSectionLabel = document.createElement('div');
            backupSectionLabel.className = `${CONFIG.UI_PREFIX}-settings-section`;
            backupSectionLabel.appendChild(document.createTextNode('Backup'));
            backupSectionLabel.appendChild(Utils.createInfoTooltip('A local file backup of your database and history — independent of GitHub.'));
            configBody.appendChild(backupSectionLabel);

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
                importFileInput.value = '';
            });
            importBtn.onclick = () => importFileInput.click();

            backupRow.appendChild(exportBtn);
            backupRow.appendChild(importBtn);
            backupRow.appendChild(importFileInput);
            configBody.appendChild(backupRow);

            const maintenanceSectionLabel = document.createElement('div');
            maintenanceSectionLabel.className = `${CONFIG.UI_PREFIX}-settings-section ${CONFIG.UI_PREFIX}-settings-section--bottom`;
            maintenanceSectionLabel.appendChild(document.createTextNode('Maintenance'));
            maintenanceSectionLabel.appendChild(Utils.createInfoTooltip('Clear Local History wipes only this device\'s local copy — GitHub is untouched, and the next automatic sync repopulates it.'));
            configBody.appendChild(maintenanceSectionLabel);

            const clearHistoryBtn = document.createElement('button');
            clearHistoryBtn.className = `${CONFIG.UI_PREFIX}-settings-utility-btn`;
            clearHistoryBtn.textContent = 'Clear Local History';
            clearHistoryBtn.onclick = () => {
                if (!confirm('This clears the local history cache on this device only. Continue?')) return;
                Storage.clearLocalHistory();
                this.refreshSidePanels();
                this.showToast('Local history cleared.');
            };
            configBody.appendChild(clearHistoryBtn);

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

            // --- Diagnostics View ---
            this.diagnosticsContainer = document.createElement('div');
            this.diagnosticsContainer.className = `${CONFIG.UI_PREFIX}-config-wrapper`;
            this.diagnosticsBody = document.createElement('div');
            this.diagnosticsBody.className = `${CONFIG.UI_PREFIX}-config-body ${CONFIG.UI_PREFIX}-diagnostics-body`;
            this.diagnosticsContainer.appendChild(this.diagnosticsBody);
            panel.appendChild(this.diagnosticsContainer);

            // --- Links View Architecture (mirrors the main list's 3-tier
            // virtualization: outer flex-sized wrapper → middle scrollable
            // container → inner absolute-positioned row content) ---
            this.linksWrapper = document.createElement('div');
            this.linksWrapper.className = `${CONFIG.UI_PREFIX}-links-wrapper`;

            this.linksContainer = document.createElement('div');
            this.linksContainer.className = `${CONFIG.UI_PREFIX}-links-list`;

            this.linksListInner = document.createElement('div');
            this.linksListInner.className = `${CONFIG.UI_PREFIX}-links-list-inner`;

            this.linksContainer.appendChild(this.linksListInner);
            this.linksWrapper.appendChild(this.linksContainer);

            this.linksContainer.addEventListener('scroll', () => {
                requestAnimationFrame(() => this.renderLinks());
            });

            this.linkFormContainer = document.createElement('div');
            this.linkFormContainer.className = `${CONFIG.UI_PREFIX}-link-form`;

            this.linkTextInput = document.createElement('input');
            this.linkTextInput.className = `${CONFIG.UI_PREFIX}-settings-input`;
            this.linkTextInput.placeholder = "Link Title (e.g. Instagram)";

            this.linkUrlInput = document.createElement('input');
            this.linkUrlInput.className = `${CONFIG.UI_PREFIX}-settings-input`;
            this.linkUrlInput.placeholder = "URL (https://...)";

            this.linkSaveBtn = document.createElement('button');
            this.linkSaveBtn.className = `${CONFIG.UI_PREFIX}-settings-save-btn`;
            this.linkSaveBtn.textContent = 'Save Link';
            this.linkSaveBtn.onclick = () => {
                if (!CloudAPI.isValid()) {
                    this.showToast('Configure Cloud Engine credentials first to save links.', 'error');
                    return;
                }
                const t = this.linkTextInput.value.trim();
                const u = this.linkUrlInput.value.trim();
                if (!t || !u) {
                    this.showToast('Both Title and URL are required.', 'error');
                    return;
                }
                if (this.editLinkIndex !== null) {
                    Database.editLink(this.currentLinkTargetId, this.editLinkIndex, t, u);
                } else {
                    Database.addLink(this.currentLinkTargetId, t, u);
                }
                this.triggerCloudSync();
                this.isLinkFormActive = false;
                this.updateVisibility();
                this.renderLinks();
            };

            this.linkFormContainer.appendChild(Utils.attachClearButton(this.linkTextInput));
            this.linkFormContainer.appendChild(Utils.attachClearButton(this.linkUrlInput));
            this.linkFormContainer.appendChild(this.linkSaveBtn);

            panel.appendChild(this.linksWrapper);
            panel.appendChild(this.linkFormContainer);

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
                        void this.cartContainer.offsetWidth;
                        this.cartContainer.classList.add('active');
                    }
                    if (this.stdSaveBtn) this.stdSaveBtn.disabled = true;
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
                if (this.currentView === 'config' || this.currentView === 'links') return;
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
            if (this.configContainer) this.configContainer.style.display = 'none';
            if (this.searchContainer) this.searchContainer.style.display = 'none';
            if (this.mainListWrapper) this.mainListWrapper.style.display = 'none';
            if (this.footer) this.footer.style.display = 'none';
            if (this.crudBarContainer) this.crudBarContainer.style.display = 'none';
            if (this.linksWrapper) this.linksWrapper.style.display = 'none';
            if (this.linkFormContainer) this.linkFormContainer.style.display = 'none';
            if (this.headerAddLinkBtn) this.headerAddLinkBtn.style.display = 'none';

            if (this.currentView === 'diagnostics') {
                this.headerTitle.replaceChildren();
                this.headerTitle.textContent = 'Diagnostics';
                this.headerBackBtn.style.display = 'flex';
                this.diagnosticsContainer.style.display = 'flex';
            } else if (this.currentView === 'config') {
                this.headerTitle.replaceChildren();
                this.headerTitle.textContent = 'Cloud Engine Config';
                this.headerBackBtn.style.display = 'flex';
                this.configContainer.style.display = 'flex';
                requestAnimationFrame(() => {
                    if (this.configInputs && this.configInputs.token) this.configInputs.token.focus();
                });
            } else if (this.currentView === 'links') {
                this.headerBackBtn.style.display = 'flex';
                if (this.isLinkFormActive) {
                    this.headerTitle.replaceChildren();
                    this.headerTitle.textContent = this.editLinkIndex !== null ? 'Edit Link' : 'Add Link';
                    this.linkFormContainer.style.display = 'flex';
                    requestAnimationFrame(() => {
                        if (this.linkTextInput) this.linkTextInput.focus();
                    });
                } else {
                    this.headerTitle.replaceChildren();
                    const icon = this._createSVG(ICONS.link);
                    icon.classList.add(`${CONFIG.UI_PREFIX}-icon-title-svg`);
                    this.headerTitle.appendChild(icon);
                    this.headerTitle.appendChild(document.createTextNode(this.currentLinkTitle));
                    this.linksWrapper.style.display = 'flex';
                    this.headerAddLinkBtn.style.display = 'flex';
                }
            } else {
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

        renderLinks() {
            if (!this.linksContainer || !this.linksListInner) return;
            const rawLinks = Database.getLinks(this.currentLinkTargetId);

            if (rawLinks.length === 0) {
                this.linksListInner.style.height = '100%';
                this.linksListInner.textContent = '';
                const empty = document.createElement('div');
                empty.className = `${CONFIG.UI_PREFIX}-links-empty-state`;
                empty.textContent = 'No links added yet.';
                this.linksListInner.appendChild(empty);
                return;
            }

            // Sort a copy for display, but keep each entry's original array
            // index attached — editLink()/deleteLink() take a raw index into
            // the underlying (unsorted) array, so sorting the array itself
            // and using the sorted position would silently edit/delete the
            // wrong link.
            const sortedLinks = rawLinks
                .map((link, originalIndex) => ({ ...link, _originalIndex: originalIndex }))
                .sort((a, b) => a.t.localeCompare(b.t, undefined, { sensitivity: 'base' }));

            // Same fixed-slot virtualization as the main list: only the
            // rows currently in (or near) the visible viewport are actually
            // rendered, each placed via transform at its fixed slot position.
            const itemHeight = CONFIG.VIRTUAL_ITEM_HEIGHT;
            const totalItems = sortedLinks.length;
            this.linksListInner.style.height = `${totalItems * itemHeight}px`;

            const scrollTop = this.linksContainer.scrollTop;
            const containerHeight = this.linksCachedHeight || 400;
            const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
            const endIndex = Math.min(totalItems, Math.floor((scrollTop + containerHeight) / itemHeight) + 5);

            this.linksListInner.textContent = '';
            const fragment = document.createDocumentFragment();

            for (let i = startIndex; i < endIndex; i++) {
                const link = sortedLinks[i];
                const idx = link._originalIndex;

                const row = document.createElement('div');
                row.className = `${CONFIG.UI_PREFIX}-link-item`;
                row.style.transform = `translate3d(0, ${i * itemHeight}px, 0)`;

                const linkText = document.createElement('a');
                linkText.className = `${CONFIG.UI_PREFIX}-link-text`;
                linkText.href = link.u.startsWith('http') ? link.u : `https://${link.u}`;
                linkText.target = "_blank";
                linkText.rel = "noopener noreferrer";
                linkText.textContent = link.t;
                linkText.title = link.u;

                const actions = document.createElement('div');
                actions.className = `${CONFIG.UI_PREFIX}-link-actions`;

                const editBtn = document.createElement('button');
                editBtn.className = `${CONFIG.UI_PREFIX}-edit-item-btn`;
                editBtn.appendChild(this._createSVG(ICONS.edit));
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.editLinkIndex = idx;
                    this.isLinkFormActive = true;
                    this.linkTextInput.value = link.t;
                    this.linkUrlInput.value = link.u;
                    this.linkTextInput.dispatchEvent(new Event('input', { bubbles: true }));
                    this.linkUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
                    this.updateVisibility();
                };

                const delBtn = document.createElement('button');
                delBtn.className = `${CONFIG.UI_PREFIX}-delete-btn`;
                delBtn.appendChild(this._createSVG(ICONS.trash));
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete link: ${link.t}?`)) {
                        Database.deleteLink(this.currentLinkTargetId, idx);
                        this.triggerCloudSync();
                        this.renderLinks();
                    }
                };

                actions.appendChild(editBtn);
                actions.appendChild(delBtn);

                row.appendChild(linkText);
                row.appendChild(actions);
                fragment.appendChild(row);
            }
            this.linksListInner.appendChild(fragment);
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

            if (this._carousel.isActive && this._carousel.currentId !== 'main') {
                this._carouselGoTo('main');
            }
        },

        renderVirtualList() {
            if (!this.listContainer || !this.listInner || this.currentView === 'config' || this.currentView === 'links') return;
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

                const globeBtn = document.createElement('button');
                globeBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
                globeBtn.style.background = 'transparent';
                globeBtn.style.border = 'none';
                globeBtn.style.padding = '0.4rem';
                globeBtn.title = "View Links";
                const globeSvg = this._createSVG(ICONS.globe);
                globeSvg.style.width = '1.1rem'; globeSvg.style.height = '1.1rem';
                globeBtn.appendChild(globeSvg);

                const globeLinkId = itemData.type === 'group' ? `group::${itemData.group}` : `member::${itemData.group}::${itemData.member}`;
                const hasLinks = Database.getLinks(globeLinkId).length > 0;
                // Dimmer when empty — the icon itself signals "no links yet"
                // rather than looking identical whether or not there's content.
                globeSvg.style.fill = hasLinks ? 'var(--tm-text-muted)' : 'var(--tm-text-dark)';
                globeSvg.style.opacity = hasLinks ? '1' : '0.5';

                // No background hover — icon-only feedback, matching the request
                globeBtn.onmouseover = () => { globeSvg.style.fill = 'var(--tm-text-main)'; globeSvg.style.opacity = '1'; };
                globeBtn.onmouseout = () => {
                    globeSvg.style.fill = hasLinks ? 'var(--tm-text-muted)' : 'var(--tm-text-dark)';
                    globeSvg.style.opacity = hasLinks ? '1' : '0.5';
                };

                globeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.currentLinkTargetId = globeLinkId;
                    this.currentLinkTitle = itemData.type === 'group' ? itemData.group : itemData.member;
                    // Remember exactly where we came from — inferring it from
                    // the link ID prefix (group:: vs member::) was wrong when
                    // a member's globe icon is clicked from a 'groups'-view
                    // search result rather than an actual 'members' drill-down.
                    this._previousLinksView = this.currentView;
                    this._previousLinksSearch = this.searchInput ? this.searchInput.value : '';
                    this.currentView = 'links';
                    this.isLinkFormActive = false;
                    this.updateVisibility();
                    this.renderLinks();
                };
                rightWrapper.appendChild(globeBtn);

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
                        this.cart.push({ g: itemData.group, n: itemData.member });
                    } else {
                        this.cart.splice(idx, 1);
                    }
                    this.renderCart();
                } else {
                    Downloader.executeIdolSave(itemData.group, itemData.member);
                }
            }
        },

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
            } catch (e) {}

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
                    if (this._pendingResizeFrame !== null) {
                        cancelAnimationFrame(this._pendingResizeFrame);
                    }

                    let needsMain = false, needsRecent = false, needsTrending = false, needsCart = false, needsLinks = false;

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
                        } else if (entry.target === this.linksWrapper) {
                            this.linksContainer.style.height = `${finalHeight}px`;
                            this.linksCachedHeight = finalHeight;
                            needsLinks = true;
                        }
                    }

                    this._pendingResizeFrame = requestAnimationFrame(() => {
                        this._pendingResizeFrame = null;
                        if (needsMain)   this.renderVirtualList();
                        if (needsRecent) this._renderSidePanelVirtual('recent');
                        if (needsTrending) this._renderSidePanelVirtual('trending');
                        if (needsCart)   this._renderCartVirtual();
                        if (needsLinks)  this.renderLinks();
                    });
                });
            }

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
                    this.renderCart();
                }
            });
            listWrapper.appendChild(this.cartList);
            this.cartContainer.appendChild(cartHeader);
            this.cartContainer.appendChild(listWrapper);

            const cartFooter = document.createElement('div');
            cartFooter.className = `${CONFIG.UI_PREFIX}-footer`;
            cartFooter.style.marginTop = 'auto';
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

            const carouselTrack = document.createElement('div');
            carouselTrack.className = `${CONFIG.UI_PREFIX}-carousel-track`;

            carouselTrack.appendChild(this.cartContainer);
            const recentPanelEl = this.createRecentHistoryPanel();
            carouselTrack.appendChild(recentPanelEl);

            const mainPanelEl = this.createMainPanel();

            const queuePill = document.createElement('button');
            queuePill.className = `${CONFIG.UI_PREFIX}-queue-pill`;
            queuePill.setAttribute('aria-label', 'View queue');
            queuePill.onclick = () => this._carouselGoTo('queue');
            const pillArrow = this._createSVG('M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z');
            const pillLabel = document.createElement('span');
            pillLabel.className = `${CONFIG.UI_PREFIX}-queue-pill-label`;
            pillLabel.textContent = '0 items in queue';
            queuePill.appendChild(pillArrow);
            queuePill.appendChild(pillLabel);
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

            const arrowPrev = this._buildCarouselArrow('prev');
            const arrowNext = this._buildCarouselArrow('next');
            const dotsEl    = this._buildCarouselDots();

            const carouselClip = document.createElement('div');
            carouselClip.className = `${CONFIG.UI_PREFIX}-carousel-clip`;
            carouselClip.appendChild(carouselTrack);

            layoutWrapper.appendChild(carouselClip);
            layoutWrapper.appendChild(arrowPrev);
            layoutWrapper.appendChild(arrowNext);
            layoutWrapper.appendChild(dotsEl);
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
                if (this.linksWrapper) this.resizeObserver.observe(this.linksWrapper);
            }

            this.overlay.appendChild(layoutWrapper);
            document.body.appendChild(this.overlay);
            this.updateListData('');
            this.refreshSidePanels();

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
                if (this._pendingRenderFrame !== null) {
                    cancelAnimationFrame(this._pendingRenderFrame);
                    this._pendingRenderFrame = null;
                }
                if (this._pendingResizeFrame !== null) {
                    cancelAnimationFrame(this._pendingResizeFrame);
                    this._pendingResizeFrame = null;
                }
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
                Logger.info('Initialized Silent Cloud Worker v24.3');
                return;
            }

            UI.initTemplates();
            UI.injectGlobals();
            UI.injectStyles();
            this.bindEvents();
            Database.init();

            setInterval(() => {
                if (document.visibilityState === 'visible' && !UI.overlay) {
                    Storage.fetchCloudBackground();
                }
            }, CONFIG.CLOUD_HISTORY_THROTTLE_MS);
            Logger.info('Initialized Xiv Media Downloader v24.3');
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
            document.addEventListener('mousemove', (e) => {
                if (UI.overlay) return;
                if (!UI.fabTicking) {
                    window.requestAnimationFrame(() => {
                        UI.updateFABPosition(e.clientX, e.clientY);
                        UI.fabTicking = false;
                    });
                    UI.fabTicking = true;
                }
            });

            window.addEventListener('keydown', (e) => {
                if (UI.overlay) {
                    if (e.key === 'Escape') {
                        UI.closeMenu();
                        return;
                    }
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
