// ==UserScript==
// @name         [Universal] K-Media Downloader
// @namespace    https://github.com/myouisaur/Universal
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FF4081'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 11h3l-4 4-4-4h3V8h2v5z'/%3E%3C/svg%3E
// @version      12.1
// @description  Organizes, tracks, and saves categorized K-Pop media files through a centralized overlay.
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
// @connect      kmedia-db-proxy.myouisaur.workers.dev
// @connect      *
// @noframes
// @run-at       document-end
// @updateURL    https://myouisaur.github.io/Universal/kmedia-downloader.user.js
// @downloadURL  https://myouisaur.github.io/Universal/kmedia-downloader.user.js
// ==/UserScript==

(function () {
    'use strict';

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
        WORKER_URL: 'https://kmedia-db-proxy.myouisaur.workers.dev',
        GITHUB_OWNER: 'myouisaur',
        GITHUB_REPO: 'Universal',
        GITHUB_DB_PATH: 'kmedia-downloader-db.json',
        GITHUB_HISTORY_PATH: 'kmedia-downloader-history.json',
        GITHUB_BRANCH: 'main',

        // UI & Storage Core
        UI_PREFIX: 'tm-kpop-dl',
        STORAGE_KEY: 'tm_kpop_dl_history',
        HISTORY_MAX_DAYS: 30,
        HISTORY_MAX_ENTRIES: 1000,
        FAB_Z_INDEX: 999990,
        OVERLAY_Z_INDEX: 999999,
        SAVE_DEBOUNCE_MS: 1000,
        CLOUD_HISTORY_DEBOUNCE_MS: 1000,
        CLOUD_HISTORY_THROTTLE_MS: 30000,
        CLOUD_MENU_POLL_MS: 10000,
        VIRTUAL_ITEM_HEIGHT: 50,
        MAX_ACTIVE_TOASTS: 3,
        AUTO_CLOSE_COUNTDOWN_MS: 3000,

        // Database
        DB_URL: 'https://raw.githubusercontent.com/myouisaur/Universal/refs/heads/main/kmedia-downloader-db.json',
        DB_CACHE_KEY: 'tm_kpop_dl_db_cache',
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
        checklist: "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
        history: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
        recent: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
    };

    // =========================================================
    // UTILITIES
    // =========================================================
    const Logger = {
        info(msg) { console.log(`[K-Pop DL] ${msg}`); },
        warn(msg) { console.warn(`[K-Pop DL] ${msg}`); },
        error(msg, err) { console.error(`[K-Pop DL] ${msg}`, err); }
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
            this.config.token = GM_getValue('tm_kpop_dl_github_token', '');
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
                'tm_kpop_dl_worker_url',
                'tm_kpop_dl_github_owner',
                'tm_kpop_dl_github_repo',
                'tm_kpop_dl_github_path',
                'tm_kpop_dl_history_path',
                'tm_kpop_dl_github_branch'
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

            this._cache = this._cache
                .filter(item => item.t >= cutoffDate)
                .slice(-CONFIG.HISTORY_MAX_ENTRIES);

            if (this._cache.length !== initialLength) {
                this._saveLocalDebounced();
            }
            return this._cache;
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

        getFlavorStats() {
            const frequencies = {};
            this._cache.forEach(item => {
                const identifier = `${item.g}|${item.n}`;
                if (!frequencies[identifier]) {
                    frequencies[identifier] = { g: item.g, n: item.n, count: 0 };
                }
                frequencies[identifier].count++;
            });
            return Object.values(frequencies).sort((a, b) => b.count - a.count);
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

        executeCustomSave(customName, cart = null) {
            const ext = this.getExtension();
            const safeName = customName.replace(/[\\/:*?"<>|]/g, '_').trim();
            const fileName = CONFIG.CUSTOM_NAMING_FORMAT
                .replace('{custom}', safeName)
                .replace('{random}', this.generateRandomString(CONFIG.RANDOM_STRING_LENGTH))
                .replace('{ext}', ext);

            UI.closeMenu();

            let skipCloudSync = true;
            if (cart && cart.length > 0) skipCloudSync = false;

            this.triggerDownload(window.location.href, fileName, null, null, true, skipCloudSync, cart);
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

        triggerDownload(url, name, groupContext, nameContext, promptUser = true, skipCloudSync = false, cartContext = null) {
            const displayFileName = name.includes('/') ? name.substring(name.lastIndexOf('/') + 1) : name;
            const toastObj = UI.createDownloadToast(displayFileName);

            if (url.startsWith('file://')) {
                this.bufferLocalFile(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext);
                return;
            }

            let isSafeImage = false;
            try {
                isSafeImage = !!new URL(url).pathname.match(/\.(jpg|jpeg|png|webp|avif|gif)$/i);
            } catch (e) {}

            if (isSafeImage && typeof GM_download === 'function') {
                this._executeGMDownload(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext);
            } else {
                this.fallbackDownload(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext);
            }
        },

        bufferLocalFile(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext) {
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
                                this._saveBlob(blob, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext);
                            } else {
                                this._bufferViaNetwork(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext);
                            }
                        }, mimeType, 1.0);
                        return;
                    } catch (e) {
                        Logger.warn("Canvas fallback failed, routing to network buffer.");
                    }
                }
            }

            this._bufferViaNetwork(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext);
        },

        async _bufferViaNetwork(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const blob = await res.blob();
                    this._saveBlob(blob, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext);
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
                            this._saveBlob(res.response, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext);
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

        _saveBlob(blob, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext) {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = name.substring(name.lastIndexOf('/') + 1);
            a.click();

            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

            if (cartContext && cartContext.length > 0) Storage.recordBatchSuccess(cartContext);
            else if (groupContext && nameContext) Storage.recordSuccess(groupContext, nameContext);

            UI.finishDownloadToast(toastObj, 'success', 'Saved Successfully!');
            UI.startAutoCloseSequence(skipCloudSync);
        },

        _executeGMDownload(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext) {
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

                    UI.finishDownloadToast(toastObj, 'success', 'Saved Successfully!');
                    UI.startAutoCloseSequence(skipCloudSync);
                },
                onerror: () => {
                    if (hasStarted) {
                        UI.finishDownloadToast(toastObj, 'error', 'Download interrupted or blocked.');
                    } else {
                        UI.updateDownloadToast(toastObj, 0, 0, 'GM Engine blocked, triggering fallback override...');
                        this.fallbackDownload(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext);
                    }
                },
                ontimeout: () => {
                    UI.finishDownloadToast(toastObj, 'error', 'Download timed out.');
                }
            });
        },

        fallbackDownload(url, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext) {
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
                            this._saveBlob(res.response, name, groupContext, nameContext, toastObj, promptUser, skipCloudSync, cartContext);
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
            flavor: { data: [], wrapper: null, container: null, inner: null, cachedHeight: 400 }
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
                    --tm-border: #222;
                    --tm-border-light: #333;
                    --tm-border-focus: #555;
                    --tm-text-main: #fff;
                    --tm-text-muted: #aaa;
                    --tm-text-dark: #666;
                    --tm-danger: #e57373;
                    --tm-success: #81c784;
                    --tm-warning: #ffb74d;
                }

                /* Floating Action Button */
                .${CONFIG.UI_PREFIX}-fab {
                    position: fixed;
                    top: calc(100vh - 6rem);
                    left: calc(100vw - 6rem);
                    width: 3.5rem; height: 3.5rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.6);
                    z-index: ${CONFIG.FAB_Z_INDEX};
                    /* Dynamic transition handled strictly by JS routing */
                }
                .${CONFIG.UI_PREFIX}-fab:hover { background: rgba(255, 255, 255, 0.2); }
                .${CONFIG.UI_PREFIX}-fab svg { width: 1.5rem; height: 1.5rem; fill: var(--tm-text-main); }

                /* Overlay & Layout */
                #${CONFIG.UI_PREFIX}-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(0,0,0,0.85); z-index: ${CONFIG.OVERLAY_Z_INDEX};
                    display: flex; align-items: center; justify-content: center;
                    font-family: 'Inter', -apple-system, sans-serif; backdrop-filter: blur(8px);
                }
                .${CONFIG.UI_PREFIX}-layout {
                    display: flex;
                    gap: 1.5rem; max-width: 95vw; max-height: 95vh;
                    justify-content: center; align-items: flex-end; position: relative;
                }

                /* Panels & Containers */
                .${CONFIG.UI_PREFIX}-main-container {
                    display: flex;
                    flex-direction: column; order: 2; width: 25rem; height: 80vh; position: relative;
                }
                .${CONFIG.UI_PREFIX}-panel {
                    background: var(--tm-bg-base);
                    border-radius: 1.5rem; padding: 1.5rem; border: 1px solid var(--tm-border);
                    box-shadow: 0 2rem 4rem rgba(0,0,0,0.8); color: var(--tm-text-main);
                    display: flex; flex-direction: column;
                    box-sizing: border-box; overflow: hidden;
                }
                .${CONFIG.UI_PREFIX}-main { width: 100%; height: 100%; position: relative; }
                .${CONFIG.UI_PREFIX}-side { width: 20rem; height: 80vh; background: var(--tm-bg-panel); }
                .${CONFIG.UI_PREFIX}-side.left { order: 1; }
                .${CONFIG.UI_PREFIX}-side.right { order: 3; }

                /* Header */
                .${CONFIG.UI_PREFIX}-header {
                    display: flex;
                    align-items: center; justify-content: space-between; gap: 1rem;
                    height: 2.5rem; margin-bottom: 1rem; flex-shrink: 0; width: 100%;
                }
                .${CONFIG.UI_PREFIX}-header-left { display: flex; align-items: center; gap: 0.8rem; overflow: hidden; flex-grow: 1; }
                .${CONFIG.UI_PREFIX}-header-right { display: flex; align-items: center; justify-content: flex-end; flex-shrink: 0; }
                .${CONFIG.UI_PREFIX}-header h2 {
                    font-size: 1.1rem;
                    margin: 0; font-weight: 600; color: #eee; text-align: left;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-grow: 1;
                }
                .${CONFIG.UI_PREFIX}-history-subtitle {
                    font-size: 0.7rem; color: var(--tm-text-dark); margin-top: 0.2rem;
                    font-weight: 500; cursor: help; display: none;
                }

                .${CONFIG.UI_PREFIX}-icon-btn {
                    background: #1a1a1a;
                    border: 1px solid var(--tm-border-light);
                    border-radius: 0.7rem; width: 2.5rem; height: 2.5rem; display: flex;
                    align-items: center; justify-content: center; cursor: pointer;
                    transition: 0.2s; flex-shrink: 0;
                }
                .${CONFIG.UI_PREFIX}-icon-btn:hover { background: var(--tm-border); border-color: var(--tm-border-focus); }
                .${CONFIG.UI_PREFIX}-icon-btn svg { width: 1.1rem; height: 1.1rem; fill: var(--tm-text-main); transition: fill 0.2s; }

                .${CONFIG.UI_PREFIX}-multi-btn { transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), background 0.2s, border-color 0.2s !important; z-index: 10; }
                .${CONFIG.UI_PREFIX}-multi-active { transform: translateX(-43rem); }

                @keyframes tmSpin { 100% { transform: rotate(360deg); } }
                .${CONFIG.UI_PREFIX}-spin svg { animation: tmSpin 1s linear infinite; }

                .${CONFIG.UI_PREFIX}-notification-dot {
                    position: absolute; top: -2px; right: -2px; width: 10px; height: 10px;
                    background-color: var(--tm-danger); border-radius: 50%; border: 2px solid #1a1a1a; box-sizing: content-box;
                }

                /* Modern Toast Notifications */
                #${CONFIG.UI_PREFIX}-toast-wrapper {
                    position: fixed; bottom: 2rem; left: 2rem;
                    display: flex; flex-direction: column; gap: 0.8rem; z-index: ${CONFIG.OVERLAY_Z_INDEX + 10};
                    pointer-events: none; align-items: flex-start;
                    font-family: 'Inter', -apple-system, sans-serif;
                }
                .${CONFIG.UI_PREFIX}-toast {
                    background: rgba(20, 20, 20, 0.95); backdrop-filter: blur(10px);
                    border: 1px solid var(--tm-border-light); border-left: 4px solid var(--tm-primary);
                    color: var(--tm-text-main); padding: 0.8rem 1.2rem; border-radius: 0.6rem;
                    font-size: 0.85rem; font-weight: 500; box-shadow: 0 8px 16px rgba(0,0,0,0.5);
                    display: flex; align-items: center; gap: 0.6rem; pointer-events: auto;
                    max-width: 320px; will-change: transform, opacity;
                }

                .${CONFIG.UI_PREFIX}-dl-toast { flex-direction: column; align-items: flex-start; gap: 0; padding: 0.8rem 1rem 1rem 1rem; position: relative; overflow: hidden; min-width: 250px; }
                .${CONFIG.UI_PREFIX}-dl-info { display: flex; flex-direction: column; gap: 0.2rem; width: 100%; }
                .${CONFIG.UI_PREFIX}-dl-title { font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 100%; }
                .${CONFIG.UI_PREFIX}-dl-status { font-size: 0.75rem; color: var(--tm-text-muted); font-variant-numeric: tabular-nums; }

                .${CONFIG.UI_PREFIX}-progress-bg { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: rgba(255,255,255,0.1); }
                .${CONFIG.UI_PREFIX}-progress-fill { height: 100%; background: var(--tm-primary); border-radius: 2px; }

                .${CONFIG.UI_PREFIX}-toast.syncing { border-left-color: var(--tm-warning); color: var(--tm-text-main); }
                .${CONFIG.UI_PREFIX}-toast.syncing .${CONFIG.UI_PREFIX}-progress-fill { background: var(--tm-warning); }
                .${CONFIG.UI_PREFIX}-toast.success { border-left-color: var(--tm-success); color: var(--tm-text-main); }
                .${CONFIG.UI_PREFIX}-toast.success .${CONFIG.UI_PREFIX}-progress-fill { background: var(--tm-success); }
                .${CONFIG.UI_PREFIX}-toast.error { border-left-color: var(--tm-danger); color: var(--tm-text-main); }
                .${CONFIG.UI_PREFIX}-toast.error .${CONFIG.UI_PREFIX}-progress-fill { background: var(--tm-danger); }

                @keyframes tmToastFadeIn { from { opacity: 0; transform: translateX(-20px) scale(0.95); } to { opacity: 1; transform: translateX(0) scale(1); } }
                @keyframes tmToastFadeOut { from { opacity: 1; transform: translateX(0) scale(1); height: auto; } to { opacity: 0; transform: translateX(-20px) scale(0.95); margin-top: -10px; } }
                @keyframes tmCountdownBorder { 0% { border-left-color: var(--tm-success); } 50% { border-left-color: var(--tm-warning); } 100% { border-left-color: var(--tm-danger); } }
                @keyframes tmCountdownFill { 0% { background-color: var(--tm-success); } 50% { background-color: var(--tm-warning); } 100% { background-color: var(--tm-danger); } }
                @keyframes tmCountdownWidth { 0% { width: 100%; } 100% { width: 0%; } }

                .${CONFIG.UI_PREFIX}-cancel-btn {
                    background: #222; color: var(--tm-text-main); border: 1px solid #444;
                    padding: 0.3rem 0.5rem; border-radius: 0.4rem; font-size: 0.75rem;
                    cursor: pointer; transition: 0.2s; outline: none; flex-shrink: 0;
                }
                .${CONFIG.UI_PREFIX}-cancel-btn:hover { background: #333; border-color: #666; }

                /* Selection Queue Panel Animations & Layout */
                .${CONFIG.UI_PREFIX}-cart-panel {
                    width: 0; height: 80vh; padding-left: 0; padding-right: 0;
                    opacity: 0; overflow: hidden; border: none; margin-left: -1.5rem;
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); pointer-events: none;
                    display: flex; flex-direction: column;
                }
                .${CONFIG.UI_PREFIX}-cart-panel.active {
                    width: 20rem; padding-left: 1.5rem; padding-right: 1.5rem;
                    opacity: 1; border: 1px solid var(--tm-border); margin-left: 0; pointer-events: auto;
                }

                /* Virtual Queue Items */
                .${CONFIG.UI_PREFIX}-queue-item {
                    position: absolute; top: 0; left: 0; width: 100%; height: 42px;
                    background: var(--tm-bg-input); border: 1px solid var(--tm-border-light);
                    border-radius: 0.6rem; padding: 0 0.8rem; display: flex;
                    justify-content: space-between; align-items: center; gap: 0.5rem; transition: background 0.15s;
                    box-sizing: border-box; will-change: transform;
                }
                .${CONFIG.UI_PREFIX}-queue-item:hover { background: var(--tm-bg-hover); border-color: var(--tm-border-focus); }
                .${CONFIG.UI_PREFIX}-history-selected { border-color: var(--tm-danger) !important; background: rgba(229, 115, 115, 0.1) !important; }
                .${CONFIG.UI_PREFIX}-queue-remove {
                    background: none; border: none; color: var(--tm-danger); cursor: pointer;
                    padding: 0 0.5rem 0 0; font-size: 1rem; font-weight: bold; line-height: 1; transition: 0.2s;
                }
                .${CONFIG.UI_PREFIX}-queue-remove:hover { color: #fff; }

                /* Search & Contextual Toolbar */
                .${CONFIG.UI_PREFIX}-search-container { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; flex-shrink: 0; }
                .${CONFIG.UI_PREFIX}-search-input {
                    flex-grow: 1; min-width: 0; background: var(--tm-bg-input); border: 1px solid var(--tm-border-light); border-radius: 0.8rem;
                    padding: 0.8rem 1rem; color: var(--tm-text-main); font-size: 0.95rem; outline: none; box-sizing: border-box; transition: 0.2s;
                }
                .${CONFIG.UI_PREFIX}-search-input:focus { border-color: var(--tm-text-dark); background: #1a1a1a; }

                /* Virtual List Architecture */
                .${CONFIG.UI_PREFIX}-list-wrapper { flex-grow: 1; min-height: 0; width: 100%; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; }
                .${CONFIG.UI_PREFIX}-list { width: 100%; overflow-y: auto; overflow-x: hidden; position: relative; padding-right: 0.5rem; box-sizing: border-box; outline: none; }
                .${CONFIG.UI_PREFIX}-list::-webkit-scrollbar { width: 6px; }
                .${CONFIG.UI_PREFIX}-list::-webkit-scrollbar-thumb { background: var(--tm-border-light); border-radius: 10px; }
                .${CONFIG.UI_PREFIX}-list-inner { position: relative; width: 100%; min-height: 100%; }
                .${CONFIG.UI_PREFIX}-empty-state { position: absolute; top: 2rem; width: 100%; text-align: center; color: var(--tm-text-dark); font-size: 0.9rem; font-style: italic; }

                .${CONFIG.UI_PREFIX}-item {
                    position: absolute; top: 0; left: 0; width: 100%; height: 42px;
                    background: #141414; border: 1px solid transparent; padding: 0 1rem; border-radius: 0.8rem;
                    cursor: pointer; transition: background 0.15s; font-size: 0.95rem; display: flex;
                    justify-content: space-between; align-items: center; box-sizing: border-box; will-change: transform;
                }
                .${CONFIG.UI_PREFIX}-item:hover, .${CONFIG.UI_PREFIX}-item.active-focus { background: var(--tm-bg-hover); border-color: var(--tm-border-focus); }

                .${CONFIG.UI_PREFIX}-badge {
                    font-size: 0.7rem; color: #888; background: #1a1a1a; padding: 0.2rem 0.5rem;
                    border-radius: 0.4rem; border: 1px solid #252525; font-weight: 500; transition: 0.2s;
                }
                .${CONFIG.UI_PREFIX}-badge.accent { color: var(--tm-text-muted); border-color: #444; background: #222; }
                .${CONFIG.UI_PREFIX}-badge-actionable:hover { background: var(--tm-bg-hover-subtle); border-color: var(--tm-border-focus); color: var(--tm-text-main); cursor: pointer; }
                .${CONFIG.UI_PREFIX}-badge-actionable.accent:hover { background: var(--tm-border-light); border-color: var(--tm-text-dark); color: var(--tm-text-main); }

                /* Footer & Actions */
                .${CONFIG.UI_PREFIX}-footer { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--tm-border); flex-shrink: 0; display: flex; flex-direction: column; gap: 0.5rem; }
                .${CONFIG.UI_PREFIX}-panel-footer { margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--tm-border); display: none; }
                .${CONFIG.UI_PREFIX}-btn-row { display: flex; gap: 0.5rem; width: 100%; }

                .${CONFIG.UI_PREFIX}-action-btn {
                    flex: 1; display: flex; align-items: center; justify-content: center;
                    background: #1a1a1a; color: #999; border: 1px dashed #444; padding: 0.8rem; border-radius: 0.8rem;
                    cursor: pointer; font-size: 0.9rem; transition: 0.2s; outline: none;
                }
                .${CONFIG.UI_PREFIX}-action-btn:hover:not(:disabled), .${CONFIG.UI_PREFIX}-action-btn:focus:not(:disabled) { background: #222; color: var(--tm-text-main); border-color: var(--tm-text-dark); }
                .${CONFIG.UI_PREFIX}-action-btn:disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }

                /* Custom Input Prompt */
                .${CONFIG.UI_PREFIX}-custom-wrapper { display: none; width: 100%; gap: 0.5rem; align-items: center; }
                .${CONFIG.UI_PREFIX}-custom-input { flex: 1; background: var(--tm-bg-input); border: 1px solid var(--tm-border-light); border-radius: 0.5rem; padding: 0.7rem 0.8rem; color: var(--tm-text-main); font-size: 0.9rem; outline: none; transition: 0.2s; }
                .${CONFIG.UI_PREFIX}-custom-input:focus { border-color: var(--tm-text-dark); background: #1a1a1a; }
                .${CONFIG.UI_PREFIX}-custom-confirm, .${CONFIG.UI_PREFIX}-custom-cancel { background: #1a1a1a; color: var(--tm-text-main); border: 1px solid #444; padding: 0.7rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.9rem; transition: 0.2s; }
                .${CONFIG.UI_PREFIX}-custom-confirm { background: #1e3a2b; border-color: #2c5941; color: #4ade80; }
                .${CONFIG.UI_PREFIX}-custom-confirm:hover { background: #244935; }
                .${CONFIG.UI_PREFIX}-custom-cancel:hover { background: var(--tm-bg-hover-subtle); border-color: var(--tm-text-dark); }

                /* CRUD UI */
                .${CONFIG.UI_PREFIX}-crud-bar { display: none; gap: 0.5rem; margin-bottom: 1rem; flex-shrink: 0; transition: opacity 0.2s; }
                .${CONFIG.UI_PREFIX}-crud-input { flex-grow: 1; background: var(--tm-bg-input); border: 1px solid var(--tm-border-light); border-radius: 0.6rem; padding: 0.7rem 0.8rem; color: var(--tm-text-main); font-size: 0.9rem; outline: none; transition: 0.2s; }
                .${CONFIG.UI_PREFIX}-crud-input:focus { border-color: var(--tm-text-dark); }
                .${CONFIG.UI_PREFIX}-crud-add-btn { background: #222; color: var(--tm-text-main); border: 1px solid var(--tm-border-light); border-radius: 0.6rem; padding: 0.7rem 1rem; font-size: 0.85rem; cursor: pointer; white-space: nowrap; transition: 0.2s; }
                .${CONFIG.UI_PREFIX}-crud-add-btn:hover:not(:disabled) { background: var(--tm-border-light); border-color: var(--tm-border-focus); }

                .${CONFIG.UI_PREFIX}-edit-item-btn, .${CONFIG.UI_PREFIX}-delete-btn { background: transparent; border: none; cursor: pointer; padding: 0.4rem; display: flex; align-items: center; justify-content: center; border-radius: 0.4rem; transition: background 0.2s; margin-left: 0.2rem; }
                .${CONFIG.UI_PREFIX}-edit-item-btn svg, .${CONFIG.UI_PREFIX}-delete-btn svg { width: 1.1rem; height: 1.1rem; transition: fill 0.2s; }
                .${CONFIG.UI_PREFIX}-edit-item-btn svg { fill: var(--tm-text-muted); }
                .${CONFIG.UI_PREFIX}-edit-item-btn:hover { background: rgba(255, 255, 255, 0.15); }
                .${CONFIG.UI_PREFIX}-edit-item-btn:hover svg { fill: var(--tm-text-main); }
                .${CONFIG.UI_PREFIX}-delete-btn svg { fill: var(--tm-danger); }
                .${CONFIG.UI_PREFIX}-delete-btn:hover { background: rgba(229, 115, 115, 0.15); }

                /* Configuration Panel Architecture */
                .${CONFIG.UI_PREFIX}-config-wrapper { display: none; flex-direction: column; height: 100%; overflow: hidden; }
                .${CONFIG.UI_PREFIX}-config-body { flex-grow: 1; overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column; gap: 0.8rem; }
                .${CONFIG.UI_PREFIX}-config-body::-webkit-scrollbar { width: 6px; }
                .${CONFIG.UI_PREFIX}-config-body::-webkit-scrollbar-thumb { background: var(--tm-border-light); border-radius: 10px; }
                .${CONFIG.UI_PREFIX}-config-footer { flex-shrink: 0; padding-top: 1rem; margin-top: 0.5rem; border-top: 1px solid var(--tm-border); display: flex; }
                .${CONFIG.UI_PREFIX}-settings-field { display: flex; flex-direction: column; gap: 0.3rem; }
                .${CONFIG.UI_PREFIX}-settings-field label { font-size: 0.8rem; color: var(--tm-text-muted); font-weight: 500; text-align: left; }
                .${CONFIG.UI_PREFIX}-settings-input { background: var(--tm-bg-input); border: 1px solid var(--tm-border-light); border-radius: 0.6rem; padding: 0.7rem 0.8rem; color: var(--tm-text-main); font-size: 0.9rem; outline: none; transition: 0.2s; }
                .${CONFIG.UI_PREFIX}-settings-input:focus { border-color: var(--tm-primary); background: #1a1a1a; }
                .${CONFIG.UI_PREFIX}-settings-save-btn { width: 100%; background: var(--tm-primary); color: var(--tm-text-main); border: none; border-radius: 0.6rem; padding: 0.8rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
                .${CONFIG.UI_PREFIX}-settings-save-btn:hover:not(:disabled) { background: var(--tm-primary-hover); }

                .${CONFIG.UI_PREFIX}-history-delete-btn { width: 100%; background: rgba(229, 115, 115, 0.15); color: var(--tm-danger); border: 1px solid var(--tm-danger); border-radius: 0.6rem; padding: 0.8rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
                .${CONFIG.UI_PREFIX}-history-delete-btn:hover:not(:disabled) { background: var(--tm-danger); color: #fff; }
                .${CONFIG.UI_PREFIX}-settings-save-btn:disabled, .${CONFIG.UI_PREFIX}-history-delete-btn:disabled { opacity: 0.4; cursor: not-allowed; border-color: #444; color: #666; background: #1a1a1a; }

                @media (max-width: 1100px) {
                    .${CONFIG.UI_PREFIX}-layout { flex-direction: column; justify-content: flex-start; overflow-y: auto; height: 100vh; max-height: 100vh; width: 100%; padding: 4rem 0 4rem 0; box-sizing: border-box; }
                    .${CONFIG.UI_PREFIX}-layout::-webkit-scrollbar { display: none; }
                    .${CONFIG.UI_PREFIX}-side { height: 65vh; width: 90vw; max-width: 25rem; flex-shrink: 0; }
                    .${CONFIG.UI_PREFIX}-cart-panel { margin-left: 0; margin-top: -1.5rem; }
                    .${CONFIG.UI_PREFIX}-cart-panel.active { width: 90vw; margin-top: 0; }
                    .${CONFIG.UI_PREFIX}-main-container { order: 1; height: auto; width: 90vw; max-width: 25rem; flex-shrink: 0; margin-top: 2rem; }
                    .${CONFIG.UI_PREFIX}-main { height: 65vh; }
                    .${CONFIG.UI_PREFIX}-side.left { order: 2; }
                    .${CONFIG.UI_PREFIX}-side.right { order: 3; }
                    .${CONFIG.UI_PREFIX}-multi-active { transform: translateY(calc(-80vh - 3.5rem)); }
                }
            `);
        },

        injectGlobals() {
            if (!document.getElementById(`${CONFIG.UI_PREFIX}-fab`)) {
                this.fab = document.createElement('div');
                this.fab.id = `${CONFIG.UI_PREFIX}-fab`;
                this.fab.className = `${CONFIG.UI_PREFIX}-fab`;
                this.fab.title = "Open Download Manager (Ctrl+S)";
                this.fab.appendChild(this._createSVG(ICONS.fab));
                this.fab.onclick = () => this.showMenu();

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

            this.fab.style.transition = `top 0.2s ${easing}, left 0.2s ${easing}, background 0.2s ease`;
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

            toast.innerHTML = `
                <div class="${CONFIG.UI_PREFIX}-dl-info">
                    <div class="${CONFIG.UI_PREFIX}-dl-title">Saving: ${filename}</div>
                    <div class="${CONFIG.UI_PREFIX}-dl-status">Initializing stream...</div>
                </div>
                <div class="${CONFIG.UI_PREFIX}-progress-bg">
                    <div class="${CONFIG.UI_PREFIX}-progress-fill"></div>
                </div>
            `;
            toast.style.animation = 'tmToastFadeIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';

            this.toastContainer.appendChild(toast);
            return {
                el: toast,
                fill: toast.querySelector(`.${CONFIG.UI_PREFIX}-progress-fill`),
                status: toast.querySelector(`.${CONFIG.UI_PREFIX}-dl-status`)
            };
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
                toastObj.fill.style.background = '#888';
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
            toast.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap: 1rem;">
                    <span class="${CONFIG.UI_PREFIX}-countdown-text" style="font-weight: 500;">${actionText} Closing in ${Math.ceil(duration / 1000)}s...</span>
                    <button class="${CONFIG.UI_PREFIX}-cancel-btn">Cancel</button>
                </div>
                <div class="${CONFIG.UI_PREFIX}-progress-bg">
                    <div class="${CONFIG.UI_PREFIX}-progress-fill"></div>
                </div>
            `;
            const textSpan = toast.querySelector(`.${CONFIG.UI_PREFIX}-countdown-text`);
            const cancelBtn = toast.querySelector(`.${CONFIG.UI_PREFIX}-cancel-btn`);
            const fill = toast.querySelector(`.${CONFIG.UI_PREFIX}-progress-fill`);

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
            const emptyMsg = type === 'recent' ?
                (this.recentPanelMode === 'history' ? 'No history found.' : 'No recent saves.') : 'No data for this month.';
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

                    btn.innerHTML = `
                        <div style="display:flex; align-items:center; gap:0.5rem; overflow:hidden;">
                            <button class="${CONFIG.UI_PREFIX}-queue-remove" data-id="${id}">✕</button>
                            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${itemData.n}</span>
                        </div>
                        <span class="${CONFIG.UI_PREFIX}-badge accent" style="flex-shrink:0;">${itemData.g}</span>
                    `;
                } else {
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = itemData.n;

                    const badgeText = type !== 'recent' ? `${itemData.count}x • ${itemData.g}` : itemData.g;
                    const badgeClass = type !== 'recent' ? `${CONFIG.UI_PREFIX}-badge accent ${CONFIG.UI_PREFIX}-badge-actionable` : `${CONFIG.UI_PREFIX}-badge ${CONFIG.UI_PREFIX}-badge-actionable`;
                    const badgeSpan = document.createElement('span');
                    badgeSpan.className = badgeClass;
                    badgeSpan.textContent = badgeText;
                    badgeSpan.title = `View ${itemData.g}`;

                    btn.appendChild(nameSpan);
                    btn.appendChild(badgeSpan);
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
            title.textContent = '🕒 Recent Saves';

            const subtitle = document.createElement('div');
            subtitle.id = `${CONFIG.UI_PREFIX}-sync-time`;
            subtitle.className = `${CONFIG.UI_PREFIX}-history-subtitle`;

            leftGroup.appendChild(title);
            leftGroup.appendChild(subtitle);
            const rightGroup = document.createElement('div');
            rightGroup.className = `${CONFIG.UI_PREFIX}-header-right`;

            const toggleBtn = document.createElement('div');
            toggleBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
            toggleBtn.title = "View Raw History";
            toggleBtn.appendChild(this._createSVG(ICONS.history));
            toggleBtn.onclick = () => {
                this.recentPanelMode = this.recentPanelMode === 'recent' ? 'history' : 'recent';
                this.historySelected.clear();

                if (this.recentPanelMode === 'history') {
                    title.textContent = '📜 Raw History';
                    subtitle.style.display = 'block';
                    toggleBtn.innerHTML = '';
                    toggleBtn.appendChild(this._createSVG(ICONS.recent));
                    toggleBtn.title = "View Recent Saves";
                    footer.style.display = 'flex';
                } else {
                    title.textContent = '🕒 Recent Saves';
                    subtitle.style.display = 'none';
                    toggleBtn.innerHTML = '';
                    toggleBtn.appendChild(this._createSVG(ICONS.history));
                    toggleBtn.title = "View Raw History";
                    footer.style.display = 'none';
                }

                this.refreshSidePanels();
                this.updateHistoryDeleteBtn();
            };

            rightGroup.appendChild(toggleBtn);
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
                    this.selectedGroup = itemData.g;
                    this.currentView = 'members';
                    if (this.searchInput) this.searchInput.value = '';
                    this.updateListData('');
                    return;
                }

                const itemEl = e.target.closest(`.${CONFIG.UI_PREFIX}-item`);
                if (itemEl) {
                    const index = parseInt(itemEl.dataset.index, 10);
                    const itemData = this.sidePanels['recent'].data[index];

                    if (this.isMultiSelectMode) {
                        const exists = this.cart.some(c => c.g === itemData.g && c.n === itemData.n);
                        if (!exists) {
                            this.cart.push({ g: itemData.g, n: itemData.n });
                            this.renderCart();
                        }
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

        createSidePanel(title, customClass, type) {
            const panel = document.createElement('div');
            panel.className = `${CONFIG.UI_PREFIX}-panel ${CONFIG.UI_PREFIX}-side ${customClass}`;

            const header = document.createElement('div');
            header.className = `${CONFIG.UI_PREFIX}-header`;
            const h2 = document.createElement('h2');
            h2.textContent = title;
            header.appendChild(h2);
            panel.appendChild(header);

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
                    this.selectedGroup = itemData.g;
                    this.currentView = 'members';
                    if (this.searchInput) this.searchInput.value = '';
                    this.updateListData('');
                    return;
                }

                const itemEl = e.target.closest(`.${CONFIG.UI_PREFIX}-item`);
                if (itemEl) {
                    const index = parseInt(itemEl.dataset.index, 10);
                    const itemData = this.sidePanels[type].data[index];

                    if (this.isMultiSelectMode) {
                        const exists = this.cart.some(c => c.g === itemData.g && c.n === itemData.n);
                        if (!exists) {
                            this.cart.push({ g: itemData.g, n: itemData.n });
                            this.renderCart();
                        }
                    } else {
                        Downloader.executeIdolSave(itemData.g, itemData.n);
                    }
                }
            });
            panel.appendChild(wrapper);
            return panel;
        },

        refreshSidePanels() {
            if (!this.overlay) return;
            if (this.recentPanelMode === 'history') {
                this.sidePanels.recent.data = Storage.getRawHistory();
            } else {
                this.sidePanels.recent.data = Storage.getRecentStats();
            }

            this.sidePanels.flavor.data = Storage.getFlavorStats();
            this._renderSidePanelVirtual('recent');
            this._renderSidePanelVirtual('flavor');
            this.updateSyncTimeUI();
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
            this.isMultiSelectMode = false;
            this.cart = [];

            if (this.cartContainer && this.cartContainer.classList.contains('active')) {
                this.cartContainer.classList.remove('active');
            }

            if (this.multiSelectBtn) {
                this.multiSelectBtn.title = "Select Multiple Members";
                this.multiSelectBtn.innerHTML = '';
                this.multiSelectBtn.appendChild(this._createSVG(ICONS.checklist));
                this.multiSelectBtn.style.borderColor = '';
                const svg = this.multiSelectBtn.querySelector('svg');
                if (svg) svg.style.fill = 'var(--tm-text-main)';
                this.multiSelectBtn.classList.remove(`${CONFIG.UI_PREFIX}-multi-active`);
            }
            if (this.stdSaveBtn) {
                this.stdSaveBtn.disabled = false;
            }
        },

        _renderCartVirtual() {
            if (!this.cartList || !this.cartListInner) return;
            const totalItems = this.cart.length;
            const countEl = document.getElementById(`${CONFIG.UI_PREFIX}-cart-count`);
            if (countEl) countEl.textContent = totalItems;
            if (this.cartSaveBtn) {
                this.cartSaveBtn.disabled = totalItems === 0;
            }

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
                el.innerHTML = `
                    <div style="display:flex; align-items:center; gap:0.5rem; overflow:hidden;">
                        <button class="${CONFIG.UI_PREFIX}-queue-remove" data-index="${i}">✕</button>
                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.n}</span>
                    </div>
                    <span class="${CONFIG.UI_PREFIX}-badge accent" style="flex-shrink:0;">${item.g}</span>
                `;
                fragment.appendChild(el);
            }
            this.cartListInner.appendChild(fragment);
        },

        renderCart() {
            this._renderCartVirtual();
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
            this.headerBackBtn.appendChild(this._createSVG(ICONS.back));
            this.headerBackBtn.title = "Back";
            this.headerBackBtn.onclick = (e) => {
                e.stopPropagation();
                if (this.currentView === 'config') {
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
            leftGroup.appendChild(this.headerTitle);

            const rightGroup = document.createElement('div');
            rightGroup.className = `${CONFIG.UI_PREFIX}-header-right`;

            const closeBtn = document.createElement('div');
            closeBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
            closeBtn.appendChild(this._createSVG(ICONS.close));
            closeBtn.title = "Close";
            closeBtn.onclick = () => this.closeMenu();
            rightGroup.appendChild(closeBtn);

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
                field.appendChild(input);
                return { fieldWrapper: field, inputElement: input };
            };

            const token = createSettingsField('GitHub Fine-Grained Access Token', 'password', 'tm_kpop_dl_github_token', '', 'github_pat_...');

            this.configInputs = {
                token: token.inputElement
            };

            const saveConfigBtn = document.createElement('button');
            saveConfigBtn.className = `${CONFIG.UI_PREFIX}-settings-save-btn`;
            saveConfigBtn.textContent = 'Save Configuration';
            saveConfigBtn.onclick = () => {
                GM_setValue('tm_kpop_dl_github_token', this.configInputs.token.value.trim());
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
            configFooter.appendChild(saveConfigBtn);

            this.configContainer.appendChild(configBody);
            this.configContainer.appendChild(configFooter);
            panel.appendChild(this.configContainer);

            // --- Search & Contextual Toolbar ---
            this.searchContainer = document.createElement('div');
            this.searchContainer.className = `${CONFIG.UI_PREFIX}-search-container`;

            this.searchInput = document.createElement('input');
            this.searchInput.className = `${CONFIG.UI_PREFIX}-search-input`;
            this.searchInput.placeholder = "Search idols or groups...";

            this.multiSelectBtn = document.createElement('div');
            this.multiSelectBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
            this.multiSelectBtn.title = "Select Multiple Members";
            this.multiSelectBtn.appendChild(this._createSVG(ICONS.checklist));
            this.multiSelectBtn.onclick = () => {
                if (!this.isMultiSelectMode) {
                    this.isMultiSelectMode = true;
                    this.multiSelectBtn.title = "Cancel Selection";
                    this.multiSelectBtn.innerHTML = '';
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
                    this.updateVisibility();
                } else {
                    this.exitMultiSelectMode();
                }
            };

            this.editBtn = document.createElement('div');
            this.editBtn.className = `${CONFIG.UI_PREFIX}-icon-btn`;
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

            this.searchContainer.appendChild(this.searchInput);
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
            this.crudBarContainer.appendChild(this.crudInput);
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
            customNameInput.type = "text";
            customNameInput.placeholder = "Enter custom name...";

            const customCancelBtn = document.createElement('button');
            customCancelBtn.className = `${CONFIG.UI_PREFIX}-custom-cancel`;
            customCancelBtn.innerText = "Cancel";

            const customConfirmBtn = document.createElement('button');
            customConfirmBtn.className = `${CONFIG.UI_PREFIX}-custom-confirm`;
            customConfirmBtn.innerText = "Save";

            customWrapper.appendChild(customNameInput);
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
            if (this.currentView === 'config') {
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
                    this.headerTitle.textContent = 'K-Pop Database';
                    this.headerBackBtn.style.display = 'none';
                } else {
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

                const nameSpan = document.createElement('span');
                nameSpan.textContent = itemData.label;
                btn.appendChild(nameSpan);

                const rightWrapper = document.createElement('div');
                rightWrapper.style.display = 'flex';
                rightWrapper.style.alignItems = 'center';

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
                    const exists = this.cart.some(c => c.g === itemData.group && c.n === itemData.member);
                    if (!exists) {
                        this.cart.push({ g: itemData.group, n: itemData.member });
                        this.renderCart();
                    }
                } else {
                    Downloader.executeIdolSave(itemData.group, itemData.member);
                }
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
                    for (let entry of entries) {
                        const h = entry.contentRect.height;
                        const snappedHeight = Math.floor(h / CONFIG.VIRTUAL_ITEM_HEIGHT) * CONFIG.VIRTUAL_ITEM_HEIGHT;
                        const finalHeight = Math.max(CONFIG.VIRTUAL_ITEM_HEIGHT, snappedHeight);

                        if (entry.target === this.mainListWrapper) {
                            this.listContainer.style.height = `${finalHeight}px`;
                            this.cachedContainerHeight = finalHeight;
                            this.renderVirtualList();
                        } else if (entry.target === this.sidePanels.recent.wrapper) {
                            this.sidePanels.recent.container.style.height = `${finalHeight}px`;
                            this.sidePanels.recent.cachedHeight = finalHeight;
                            this._renderSidePanelVirtual('recent');
                        } else if (entry.target === this.sidePanels.flavor.wrapper) {
                            this.sidePanels.flavor.container.style.height = `${finalHeight}px`;
                            this.sidePanels.flavor.cachedHeight = finalHeight;
                            this._renderSidePanelVirtual('flavor');
                        } else if (entry.target === this.cartListWrapper) {
                            this.cartList.style.height = `${finalHeight}px`;
                            this.cachedCartHeight = finalHeight;
                            this._renderCartVirtual();
                        }
                    }
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
            cartTitle.style.margin = '0';
            cartTitle.style.fontSize = '1rem';
            cartTitle.style.whiteSpace = 'nowrap';
            cartTitle.innerHTML = `Queue (<span id="${CONFIG.UI_PREFIX}-cart-count">0</span>)`;

            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
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
                    this._renderCartVirtual();
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

            // Assemble layout order: 0 Queue -> 1 Recent/History -> 2 Main -> 3 Flavor
            layoutWrapper.appendChild(this.cartContainer);
            layoutWrapper.appendChild(this.createRecentHistoryPanel());
            layoutWrapper.appendChild(this.createMainPanel());
            layoutWrapper.appendChild(this.createSidePanel('❤️‍🔥 Flavor of the Month', 'right', 'flavor'));

            if (this.resizeObserver) {
                if (this.mainListWrapper) this.resizeObserver.observe(this.mainListWrapper);
                if (this.sidePanels.recent.wrapper) this.resizeObserver.observe(this.sidePanels.recent.wrapper);
                if (this.sidePanels.flavor.wrapper) this.resizeObserver.observe(this.sidePanels.flavor.wrapper);
                if (this.cartListWrapper) this.resizeObserver.observe(this.cartListWrapper);
            }

            this.overlay.appendChild(layoutWrapper);
            document.body.appendChild(this.overlay);
            this.updateListData('');
            this.refreshSidePanels();

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
            }
        }
    };

    // =========================================================
    // CORE APPLICATION MODULE
    // =========================================================
    const App = {
        isSilentMode: false,

        init() {
            if (window.__KpopDlInitialized) return;
            window.__KpopDlInitialized = true;

            this.isSilentMode = !this.isDirectMediaPage();

            CloudAPI.loadConfig();
            Storage.init(this.isSilentMode);

            if (this.isSilentMode) {
                Logger.info('Initialized Silent Cloud Worker v11.9');
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

            Logger.info('Initialized K-Pop Media Downloader v11.9');
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
