// ==UserScript==
// @name         [Universal] K-Media Downloader
// @namespace    https://github.com/myouisaur/Universal
// @version      5.2
// @description  Provides a centralized UI, shortcuts, and tracking for saving categorized K-Pop media.
// @author       Xiv
// @match        *://*/*
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      raw.githubusercontent.com
// @updateURL    https://myouisaur.github.io/Universal/kmedia-downloader.user.js
// @downloadURL  https://myouisaur.github.io/Universal/kmedia-downloader.user.js
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================
    // CONFIGURATION
    // =========================================================
    const CONFIG = {
        NAMING_FORMAT: '[{group}] {member} {random}.{ext}', // Allowed vars: {group}, {member}, {random}, {ext}
        RANDOM_STRING_LENGTH: 15,
        UI_PREFIX: 'tm-kpop-dl',
        STORAGE_KEY: 'tm_kpop_dl_history',
        HISTORY_MAX_DAYS: 30,
        HISTORY_MAX_ENTRIES: 1000,
        FAB_Z_INDEX: 999990,
        OVERLAY_Z_INDEX: 999999,
        SAVE_DEBOUNCE_MS: 1000,

        // Database Constants
        DB_URL: 'https://raw.githubusercontent.com/myouisaur/Universal/refs/heads/main/kmedia-downloader.json',
        DB_CACHE_KEY: 'tm_kpop_dl_db_cache',
        DB_CACHE_TTL_MS: 12 * 60 * 60 * 1000 // 12 hours cache duration
    };

    // =========================================================
    // UTILITIES
    // =========================================================
    const Logger = {
        info(msg) { console.log(`[K-Pop DL] ${msg}`); },
        warn(msg) { console.warn(`[K-Pop DL] ${msg}`); },
        error(msg, err) { console.error(`[K-Pop DL] ${msg}`, err); }
    };

    function debounce(fn, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // =========================================================
    // DATABASE MODULE (Fetch & Cache Logic)
    // =========================================================
    const Database = {
        data: {},
        sortedGroups: [],
        isLoaded: false,

        async init() {
            try {
                const cached = this.getCache();
                if (cached) {
                    this.processData(cached);
                    this.isLoaded = true;
                    this.fetchBackground(); // Silently update cache in the background
                } else {
                    const freshData = await this.fetch();
                    this.processData(freshData);
                    this.isLoaded = true;
                }
            } catch (e) {
                Logger.error('Failed to initialize database', e);
                // Fallback to empty if absolutely nothing is available to prevent hard crashes
                if (!this.data || Object.keys(this.data).length === 0) {
                    this.processData({});
                    this.isLoaded = true;
                }
            }
        },

        getCache() {
            try {
                const cacheStr = GM_getValue(CONFIG.DB_CACHE_KEY, null);
                if (!cacheStr) return null;

                const cacheObj = JSON.parse(cacheStr);
                // Validate TTL
                if (Date.now() - cacheObj.timestamp > CONFIG.DB_CACHE_TTL_MS) return null;

                return cacheObj.data;
            } catch (e) {
                return null;
            }
        },

        setCache(data) {
            try {
                GM_setValue(CONFIG.DB_CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data: data
                }));
            } catch (e) {
                Logger.warn('Failed to save DB cache');
            }
        },

        fetchBackground() {
            this.fetch()
                .then(data => {
                    this.setCache(data);
                    this.processData(data); // Refresh in-memory data
                })
                .catch(() => Logger.warn('Background database update failed.'));
        },

        fetch() {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: CONFIG.DB_URL,
                    responseType: 'json',
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300) {
                            let responseData = res.response;
                            // Fail-safe for managers that don't parse responseType: 'json' automatically
                            if (typeof responseData === 'string') {
                                try {
                                    responseData = JSON.parse(responseData);
                                } catch (e) {
                                    return reject(new Error('Invalid JSON format from URL'));
                                }
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
        }
    };

    // =========================================================
    // STORAGE & TRACKING MODULE (Optimized w/ Cache)
    // =========================================================
    const Storage = {
        _cache: null,
        _saveDebounced: null,

        init() {
            try {
                this._cache = JSON.parse(GM_getValue(CONFIG.STORAGE_KEY, '[]'));
            } catch (e) {
                Logger.warn('Corrupted storage data, resetting.');
                this._cache = [];
            }

            this._saveDebounced = debounce(() => {
                GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(this._cache));
            }, CONFIG.SAVE_DEBOUNCE_MS);

            this.clean();
        },

        clean() {
            const cutoffDate = Date.now() - (CONFIG.HISTORY_MAX_DAYS * 24 * 60 * 60 * 1000);
            const initialLength = this._cache.length;

            this._cache = this._cache
                .filter(item => item.t >= cutoffDate)
                .slice(-CONFIG.HISTORY_MAX_ENTRIES);

            if (this._cache.length !== initialLength) {
                this._saveDebounced();
            }
            return this._cache;
        },

        recordSuccess(group, name) {
            if (!group || !name) return;
            this.clean();
            this._cache.push({ g: group, n: name, t: Date.now() });
            this._saveDebounced();
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
                    if (result.length >= 10) break;
                }
            }
            return result;
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

            return Object.values(frequencies)
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
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
            return window.location.pathname.split('.').pop().split(/[?#]/)[0] || 'jpg';
        },

        generateFileName(group, member) {
            const ext = this.getExtension();
            return CONFIG.NAMING_FORMAT
                .replace('{group}', group)
                .replace('{member}', member.toLowerCase())
                .replace('{random}', this.generateRandomString(CONFIG.RANDOM_STRING_LENGTH))
                .replace('{ext}', ext);
        },

        executeStandardSave() {
            const url = window.location.href;
            const originalName = url.substring(url.lastIndexOf('/') + 1).split(/[?#]/)[0] || 'download';
            UI.closeMenu();
            this.triggerDownload(url, originalName, null, null);
        },

        executeIdolSave(group, name) {
            const fileName = this.generateFileName(group, name);
            UI.closeMenu();
            this.triggerDownload(window.location.href, fileName, group, name);
        },

        triggerDownload(url, name, groupContext, nameContext) {
            if (typeof GM_download === 'function') {
                GM_download({
                    url: url,
                    name: name,
                    saveAs: true,
                    onload: () => {
                        if (groupContext && nameContext) Storage.recordSuccess(groupContext, nameContext);
                    },
                    onerror: () => this.fallbackDownload(url, name, groupContext, nameContext)
                });
            } else {
                this.fallbackDownload(url, name, groupContext, nameContext);
            }
        },

        fallbackDownload(url, name, groupContext, nameContext) {
            Logger.info('Using fallback XHR download method...');
            if (typeof GM_xmlhttpRequest === 'function') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    onload: (res) => {
                        const blobUrl = URL.createObjectURL(res.response);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = name;
                        a.click();
                        URL.revokeObjectURL(blobUrl);
                        if (groupContext && nameContext) Storage.recordSuccess(groupContext, nameContext);
                    },
                    onerror: (err) => Logger.error('Fallback download failed', err)
                });
            } else {
                Logger.warn('No capable download API found. Opening in new tab.');
                window.open(url, '_blank');
            }
        }
    };

    // =========================================================
    // UI MODULE
    // =========================================================
    const UI = {
        overlay: null,
        currentView: 'groups',
        selectedGroup: null,
        activeIndex: -1,

        injectStyles() {
            GM_addStyle(`
                /* Floating Action Button */
                .${CONFIG.UI_PREFIX}-fab {
                    position: fixed; bottom: 2.5rem; right: 2.5rem;
                    width: 3.5rem; height: 3.5rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.6);
                    z-index: ${CONFIG.FAB_Z_INDEX}; transition: background 0.2s ease;
                }
                .${CONFIG.UI_PREFIX}-fab:hover { background: rgba(255, 255, 255, 0.2); }
                .${CONFIG.UI_PREFIX}-fab svg { width: 1.5rem; height: 1.5rem; fill: #fff; }

                /* Overlay & Layout */
                #${CONFIG.UI_PREFIX}-overlay {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(0,0,0,0.85); z-index: ${CONFIG.OVERLAY_Z_INDEX};
                    display: flex; align-items: center; justify-content: center;
                    font-family: 'Inter', -apple-system, sans-serif; backdrop-filter: blur(8px);
                }
                .${CONFIG.UI_PREFIX}-layout {
                    display: flex; gap: 1.5rem; max-width: 95vw; max-height: 95vh;
                    justify-content: center; align-items: stretch; position: relative;
                }

                /* Panels */
                .${CONFIG.UI_PREFIX}-panel {
                    background: #0d0d0d; border-radius: 1.5rem;
                    padding: 1.5rem; border: 1px solid #222;
                    box-shadow: 0 2rem 4rem rgba(0,0,0,0.8); color: #fff;
                    display: flex; flex-direction: column;
                    box-sizing: border-box; overflow: hidden;
                }
                .${CONFIG.UI_PREFIX}-main { width: 25rem; height: 80vh; order: 2; position: relative; }
                .${CONFIG.UI_PREFIX}-side { width: 20rem; height: 80vh; background: #0a0a0a; }
                .${CONFIG.UI_PREFIX}-side.left { order: 1; }
                .${CONFIG.UI_PREFIX}-side.right { order: 3; }

                /* Header & Controls */
                .${CONFIG.UI_PREFIX}-header {
                    position: relative; height: 2.5rem; margin-bottom: 1rem;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                }
                .${CONFIG.UI_PREFIX}-header h2 { font-size: 1.1rem; margin: 0; font-weight: 600; color: #eee; }

                .${CONFIG.UI_PREFIX}-back-btn, .${CONFIG.UI_PREFIX}-close-btn {
                    position: absolute; background: #1a1a1a; border: 1px solid #333;
                    border-radius: 0.7rem; width: 2.5rem; height: 2.5rem; display: flex;
                    align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;
                }
                .${CONFIG.UI_PREFIX}-back-btn { left: 0; }
                .${CONFIG.UI_PREFIX}-close-btn { right: 0; }
                .${CONFIG.UI_PREFIX}-back-btn:hover, .${CONFIG.UI_PREFIX}-close-btn:hover { background: #222; border-color: #555; }
                .${CONFIG.UI_PREFIX}-back-btn svg, .${CONFIG.UI_PREFIX}-close-btn svg { width: 1.1rem; height: 1.1rem; fill: #fff; }

                /* Search */
                .${CONFIG.UI_PREFIX}-search-container { margin-bottom: 1rem; flex-shrink: 0; }
                .${CONFIG.UI_PREFIX}-search-input {
                    width: 100%; background: #161616; border: 1px solid #333;
                    border-radius: 0.8rem; padding: 0.8rem 1rem; color: #fff;
                    font-size: 0.95rem; outline: none; box-sizing: border-box; transition: 0.2s;
                }
                .${CONFIG.UI_PREFIX}-search-input:focus { border-color: #666; background: #1a1a1a; }

                /* List & Items */
                .${CONFIG.UI_PREFIX}-list {
                    flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column;
                    gap: 0.5rem; padding-right: 8px; outline: none;
                }
                .${CONFIG.UI_PREFIX}-list::-webkit-scrollbar { width: 6px; }
                .${CONFIG.UI_PREFIX}-list::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }

                .${CONFIG.UI_PREFIX}-empty-state { text-align: center; color: #666; font-size: 0.9rem; margin-top: 2rem; }

                .${CONFIG.UI_PREFIX}-item {
                    background: #141414; border: 1px solid transparent; padding: 0.8rem 1rem;
                    border-radius: 0.8rem; cursor: pointer; transition: 0.15s;
                    font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center;
                    box-sizing: border-box;
                }
                .${CONFIG.UI_PREFIX}-item:hover, .${CONFIG.UI_PREFIX}-item.active-focus {
                    background: #1c1c1c; border-color: #555;
                }

                .${CONFIG.UI_PREFIX}-badge {
                    font-size: 0.7rem; color: #888; background: #1a1a1a;
                    padding: 0.2rem 0.5rem; border-radius: 0.4rem; border: 1px solid #252525; font-weight: 500;
                }
                .${CONFIG.UI_PREFIX}-badge.accent { color: #aaa; border-color: #444; background: #222; }

                .${CONFIG.UI_PREFIX}-footer { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #222; flex-shrink: 0; }
                .${CONFIG.UI_PREFIX}-std-btn {
                    width: 100%; background: #1a1a1a; color: #999; border: 1px dashed #444;
                    padding: 0.8rem; border-radius: 0.8rem; cursor: pointer; font-size: 0.9rem; transition: 0.2s; outline: none;
                }
                .${CONFIG.UI_PREFIX}-std-btn:hover, .${CONFIG.UI_PREFIX}-std-btn:focus { background: #222; color: #fff; border-color: #666; }

                /* Responsive Design - FIX APPLIED HERE */
                @media (max-width: 1100px) {
                    .${CONFIG.UI_PREFIX}-layout {
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-start; /* Fixes top content being unreachable */
                        overflow-y: auto;
                        height: 100vh;
                        max-height: 100vh;
                        width: 100%;
                        padding: 2rem 0 4rem 0; /* Padding bottom to prevent flush sticking */
                        box-sizing: border-box;
                    }
                    .${CONFIG.UI_PREFIX}-layout::-webkit-scrollbar { display: none; }
                    .${CONFIG.UI_PREFIX}-panel { height: 65vh; width: 90vw; max-width: 25rem; flex-shrink: 0; }
                    .${CONFIG.UI_PREFIX}-main { order: 1; }
                    .${CONFIG.UI_PREFIX}-side.left { order: 2; }
                    .${CONFIG.UI_PREFIX}-side.right { order: 3; }
                }
            `);
        },

        injectFAB() {
            if (document.getElementById(`${CONFIG.UI_PREFIX}-fab`)) return;
            const fab = document.createElement('div');
            fab.id = `${CONFIG.UI_PREFIX}-fab`;
            fab.className = `${CONFIG.UI_PREFIX}-fab`;
            fab.title = "Open Download Manager (Ctrl+S)";
            fab.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
            fab.onclick = () => this.showMenu();
            document.body.appendChild(fab);
        },

        createSidePanel(title, customClass, data, emptyMessage, isFlavor = false) {
            const panel = document.createElement('div');
            panel.className = `${CONFIG.UI_PREFIX}-panel ${CONFIG.UI_PREFIX}-side ${customClass}`;

            const header = document.createElement('div');
            header.className = `${CONFIG.UI_PREFIX}-header`;
            header.innerHTML = `<h2>${title}</h2>`;
            panel.appendChild(header);

            const list = document.createElement('div');
            list.className = `${CONFIG.UI_PREFIX}-list`;

            if (data.length === 0) {
                list.innerHTML = `<div class="${CONFIG.UI_PREFIX}-empty-state">${emptyMessage}</div>`;
            } else {
                data.forEach(item => {
                    const btn = document.createElement('div');
                    btn.className = `${CONFIG.UI_PREFIX}-item`;

                    const badgeText = isFlavor ? `${item.count}x • ${item.g}` : item.g;
                    const badgeClass = isFlavor ? `${CONFIG.UI_PREFIX}-badge accent` : `${CONFIG.UI_PREFIX}-badge`;

                    btn.innerHTML = `<span>${item.n}</span><span class="${badgeClass}">${badgeText}</span>`;
                    btn.onclick = () => Downloader.executeIdolSave(item.g, item.n);
                    list.appendChild(btn);
                });
            }
            panel.appendChild(list);
            return panel;
        },

        createMainPanel() {
            const panel = document.createElement('div');
            panel.className = `${CONFIG.UI_PREFIX}-panel ${CONFIG.UI_PREFIX}-main`;

            // Header
            const header = document.createElement('div');
            header.className = `${CONFIG.UI_PREFIX}-header`;

            if (this.currentView === 'members') {
                const back = document.createElement('div');
                back.className = `${CONFIG.UI_PREFIX}-back-btn`;
                back.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`;
                back.onclick = (e) => { e.stopPropagation(); this.currentView = 'groups'; this.render(); };
                header.appendChild(back);
            }

            const title = document.createElement('h2');
            title.innerText = this.currentView === 'groups' ? 'K-Pop Database' : this.selectedGroup;
            header.appendChild(title);

            const closeBtn = document.createElement('div');
            closeBtn.className = `${CONFIG.UI_PREFIX}-close-btn`;
            closeBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
            closeBtn.onclick = () => this.closeMenu();
            header.appendChild(closeBtn);
            panel.appendChild(header);

            // Search
            const searchContainer = document.createElement('div');
            searchContainer.className = `${CONFIG.UI_PREFIX}-search-container`;
            const searchInput = document.createElement('input');
            searchInput.className = `${CONFIG.UI_PREFIX}-search-input`;
            searchInput.placeholder = "Search idols or groups...";
            searchContainer.appendChild(searchInput);
            panel.appendChild(searchContainer);

            // List
            const list = document.createElement('div');
            list.className = `${CONFIG.UI_PREFIX}-list`;
            const fragment = document.createDocumentFragment();

            if (this.currentView === 'groups') {
                Database.sortedGroups.forEach(gName => {
                    const gBtn = document.createElement('div');
                    gBtn.className = `${CONFIG.UI_PREFIX}-item`;
                    gBtn.dataset.type = "group";
                    gBtn.dataset.name = gName.toLowerCase();
                    gBtn.innerHTML = `<span>${gName}</span><span class="${CONFIG.UI_PREFIX}-badge">Group</span>`;
                    gBtn.onclick = () => { this.selectedGroup = gName; this.currentView = 'members'; this.render(); };
                    fragment.appendChild(gBtn);

                    Database.data[gName].forEach(mName => {
                        const mBtn = document.createElement('div');
                        mBtn.className = `${CONFIG.UI_PREFIX}-item`;
                        mBtn.style.display = "none";
                        mBtn.dataset.type = "member";
                        mBtn.dataset.name = mName.toLowerCase();
                        mBtn.innerHTML = `<span>${mName}</span><span class="${CONFIG.UI_PREFIX}-badge">${gName}</span>`;
                        mBtn.onclick = () => Downloader.executeIdolSave(gName, mName);
                        fragment.appendChild(mBtn);
                    });
                });
            } else {
                Database.data[this.selectedGroup].forEach(mName => {
                    const mBtn = document.createElement('div');
                    mBtn.className = `${CONFIG.UI_PREFIX}-item`;
                    mBtn.dataset.name = mName.toLowerCase();
                    mBtn.innerText = mName;
                    mBtn.onclick = () => Downloader.executeIdolSave(this.selectedGroup, mName);
                    fragment.appendChild(mBtn);
                });
            }

            // Keyboard Navigation Handling
            const updateFocus = (items) => {
                items.forEach(el => el.classList.remove('active-focus'));
                if (this.activeIndex >= 0 && this.activeIndex < items.length) {
                    items[this.activeIndex].classList.add('active-focus');
                    items[this.activeIndex].scrollIntoView({ block: 'nearest' });
                }
            };

            searchInput.addEventListener('keydown', (e) => {
                const visibleItems = Array.from(list.querySelectorAll(`.${CONFIG.UI_PREFIX}-item`)).filter(el => el.style.display !== 'none');

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.activeIndex = (this.activeIndex + 1) % visibleItems.length;
                    updateFocus(visibleItems);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.activeIndex = this.activeIndex <= 0 ? visibleItems.length - 1 : this.activeIndex - 1;
                    updateFocus(visibleItems);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (this.activeIndex >= 0 && visibleItems[this.activeIndex]) {
                        visibleItems[this.activeIndex].click();
                    }
                }
            });

            // Debounced Search Logic
            searchInput.oninput = debounce((e) => {
                const val = e.target.value.toLowerCase().trim();
                this.activeIndex = -1; // Reset selection
                const allItems = list.querySelectorAll(`.${CONFIG.UI_PREFIX}-item`);

                allItems.forEach(item => {
                    item.classList.remove('active-focus');
                    const name = item.dataset.name;
                    const type = item.dataset.type;
                    if (this.currentView === 'groups') {
                        item.style.display = (val === "") ? (type === "group" ? "flex" : "none") : (name.includes(val) ? "flex" : "none");
                    } else {
                        item.style.display = name.includes(val) ? "flex" : "none";
                    }
                });
            }, 150);

            // Footer
            const footer = document.createElement('div');
            footer.className = `${CONFIG.UI_PREFIX}-footer`;
            const stdBtn = document.createElement('button');
            stdBtn.className = `${CONFIG.UI_PREFIX}-std-btn`;
            stdBtn.innerText = "Standard Save (Original Name)";
            stdBtn.onclick = () => Downloader.executeStandardSave();

            list.appendChild(fragment);
            footer.appendChild(stdBtn);
            panel.appendChild(list);
            panel.appendChild(footer);

            setTimeout(() => searchInput.focus(), 50);
            return panel;
        },

        render() {
            if (this.overlay) this.overlay.remove();
            this.overlay = document.createElement('div');
            this.overlay.id = `${CONFIG.UI_PREFIX}-overlay`;
            this.overlay.onclick = (e) => { if (e.target === this.overlay || e.target.className === `${CONFIG.UI_PREFIX}-layout`) this.closeMenu(); };

            // Trap Focus / Prevent page scroll
            document.body.style.overflow = 'hidden';

            const layoutWrapper = document.createElement('div');
            layoutWrapper.className = `${CONFIG.UI_PREFIX}-layout`;

            const recentData = Storage.getRecentStats();
            const flavorData = Storage.getFlavorStats();

            layoutWrapper.appendChild(this.createSidePanel('🕒 Recent Saves', 'left', recentData, 'No recent saves.', false));
            layoutWrapper.appendChild(this.createMainPanel());
            layoutWrapper.appendChild(this.createSidePanel('❤️‍🔥 Flavor of the Month', 'right', flavorData, 'No data for this month.', true));

            this.overlay.appendChild(layoutWrapper);
            document.body.appendChild(this.overlay);
        },

        async showMenu() {
            if (this.overlay) return;

            // Defensively wait for Database if user clicks instantly on load
            if (!Database.isLoaded) {
                document.body.style.cursor = 'wait';
                await Database.waitForLoad();
                document.body.style.cursor = '';
            }

            this.activeIndex = -1;
            this.currentView = 'groups';
            this.render();
        },

        closeMenu() {
            if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
                document.body.style.overflow = ''; // Restore scroll
            }
        }
    };

    // =========================================================
    // CORE APPLICATION MODULE
    // =========================================================
    const App = {
        init() {
            if (window.__KpopDlInitialized || !this.isDirectMediaPage()) return;
            window.__KpopDlInitialized = true;

            Storage.init();
            UI.injectStyles();
            this.bindEvents();

            // Asynchronously initialize database, inject FAB when ready
            Database.init().then(() => {
                UI.injectFAB();
            });

            Logger.info('Initialized K-Pop Media Downloader v5.2');
        },

        isDirectMediaPage() {
            // Bulletproof detection based on content type
            const type = document.contentType || '';
            return type.startsWith('image/') || type.startsWith('video/');
        },

        bindEvents() {
            window.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    UI.showMenu();
                }
                if (e.key === 'Escape' && UI.overlay) {
                    UI.closeMenu();
                }
            }, true);
        }
    };

    // Boot
    App.init();

})();
