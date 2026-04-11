// ==UserScript==
// @name         QQ邮箱附件批量下载器
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  批量下载QQ邮箱附件，支持筛选、排序和批量操作
// @author       XHXIAIEIN
// @homepage     https://github.com/XHXIAIEIN/Auto-Download-QQMail-Attach/
// @match        https://wx.mail.qq.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_notification
// @connect      mail.qq.com
// @connect      wx.mail.qq.com
// @license      MIT
// @connect      gzc-dfsdown.mail.ftn.qq.com
// @downloadURL   https://update.greasyfork.org/scripts/535160/qqmail-downloader.user.js
// @updateURL     https://update.greasyfork.org/scripts/535160/qqmail-downloader.meta.js
// ==/UserScript==
(function() {
	//#region \0vite/all-css
	try {
		if (typeof document != "undefined") {
			var elementStyle = document.createElement("style");
			elementStyle.appendChild(document.createTextNode("/* ========================================\n   AM Design System — Design Tokens\n   Matched to QQ Mail (wx.mail.qq.com) native styles\n   ======================================== */\n:root {\n    --am-bg: #ffffff;\n    --am-bg-subtle: #f5f6f7;\n    --am-bg-muted: #f0f1f2;\n    --am-bg-elevated: #ffffff;\n    --am-overlay: rgba(0, 0, 0, 0.4);\n    --am-overlay-blur: 4px;\n\n    --am-text: rgba(19, 24, 29, 1);\n    --am-text-secondary: rgba(22, 30, 38, 0.8);\n    --am-text-tertiary: rgba(25, 38, 54, 0.3);\n    --am-text-inverse: #ffffff;\n\n    --am-border: rgba(22, 46, 74, 0.1);\n    --am-border-strong: rgba(22, 46, 74, 0.15);\n\n    --am-accent: #0F7AF5;\n    --am-accent-hover: #0E6FD9;\n    --am-accent-subtle: rgba(15, 122, 245, 0.08);\n    --am-accent-text: #ffffff;\n\n    --am-success: #18a058;\n    --am-success-subtle: rgba(24, 160, 88, 0.08);\n    --am-warning: #f0a020;\n    --am-warning-subtle: rgba(240, 160, 32, 0.08);\n    --am-error: #d03050;\n    --am-error-subtle: rgba(208, 48, 80, 0.08);\n\n    --am-font: -apple-system, BlinkMacSystemFont, system-ui, \"PingFang SC\", \"Microsoft YaHei UI\", \"Microsoft YaHei\", sans-serif;\n    --am-font-mono: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;\n\n    --am-space-1: 4px;\n    --am-space-2: 8px;\n    --am-space-3: 12px;\n    --am-space-4: 16px;\n    --am-space-5: 20px;\n    --am-space-6: 24px;\n    --am-space-8: 32px;\n    --am-space-10: 40px;\n    --am-space-12: 48px;\n\n    --am-radius-sm: 4px;\n    --am-radius-md: 4px;\n    --am-radius-lg: 8px;\n    --am-radius-xl: 12px;\n    --am-radius-2xl: 16px;\n    --am-radius-full: 9999px;\n\n    --am-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);\n    --am-shadow-md: 0 4px 12px rgba(0,0,0,0.08);\n    --am-shadow-lg: 0 8px 24px rgba(0,0,0,0.12);\n    --am-shadow-xl: 0 20px 60px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.1);\n\n    --am-ease: cubic-bezier(0.4, 0, 0.2, 1);\n    --am-duration: 0.2s;\n    --am-duration-slow: 0.3s;\n}\n\n/* ========================================\n   Animations\n   ======================================== */\n@keyframes am-spin { to { transform: rotate(360deg); } }\n@keyframes am-slide-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }\n@keyframes am-fade-in { from { opacity: 0; } to { opacity: 1; } }\n@keyframes am-scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }\n\n/* ========================================\n   Overlay & Window\n   ======================================== */\n.am-overlay {\n    position: fixed;\n    top: 0; left: 0; width: 100%; height: 100%;\n    background: var(--am-overlay);\n    backdrop-filter: blur(var(--am-overlay-blur));\n    z-index: 9999;\n    opacity: 0;\n    transition: opacity var(--am-duration-slow) var(--am-ease);\n    pointer-events: none;\n}\n.am-overlay.show {\n    opacity: 1;\n    pointer-events: auto;\n}\n\n.am-window {\n    position: fixed;\n    top: 50%; left: 50%;\n    transform: translate(-50%, -50%) scale(0.9);\n    width: 75%; max-width: 900px;\n    height: 95%; max-height: 95vh;\n    min-width: 600px; min-height: 700px;\n    background: var(--am-bg-elevated);\n    border-radius: var(--am-radius-xl);\n    box-shadow: var(--am-shadow-xl);\n    z-index: 10000;\n    display: flex; flex-direction: column;\n    font-family: var(--am-font);\n    overflow: hidden;\n    resize: both;\n    opacity: 0;\n    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);\n}\n.am-window.show {\n    opacity: 1;\n    transform: translate(-50%, -50%) scale(1);\n}\n.am-window.maximized {\n    top: 0 !important; left: 0 !important;\n    transform: none !important;\n    width: 100% !important; height: 100% !important;\n    border-radius: 0 !important;\n    max-width: none !important; max-height: none !important;\n}\n.am-window.minimized {\n    height: 60px !important;\n    overflow: hidden;\n}\n.am-window.minimized .am-window-content {\n    display: none;\n}\n\n.am-window-header {\n    display: flex; align-items: center; justify-content: space-between;\n    padding: var(--am-space-4) var(--am-space-5);\n    background: var(--am-bg);\n    border-bottom: 1px solid var(--am-border);\n    cursor: move; user-select: none; flex-shrink: 0;\n}\n\n.am-window-content {\n    flex: 1; overflow: hidden;\n    display: flex; flex-direction: column;\n    background: var(--am-bg-subtle);\n}\n\n.am-window-dot {\n    width: 12px; height: 12px;\n    border-radius: var(--am-radius-full);\n    cursor: pointer;\n    transition: all var(--am-duration) var(--am-ease);\n    border: none;\n    display: inline-block;\n}\n.am-window-dot:hover { transform: scale(1.15); }\n.am-window-dot--close { background: #ff5f57; border: 1px solid #e0443e; }\n.am-window-dot--close:hover { background: #e0443e; }\n.am-window-dot--minimize { background: #ffbd2e; border: 1px solid #dea123; }\n.am-window-dot--minimize:hover { background: #dea123; }\n.am-window-dot--maximize { background: #28ca42; border: 1px solid #1aab29; }\n.am-window-dot--maximize:hover { background: #1aab29; }\n\n/* ========================================\n   Buttons\n   ======================================== */\n.am-btn {\n    height: 32px;\n    padding: 0 7px;\n    border-radius: var(--am-radius-sm);\n    font-family: var(--am-font);\n    font-size: 14px; font-weight: 400;\n    cursor: pointer;\n    display: inline-flex; align-items: center; justify-content: center; gap: var(--am-space-1);\n    transition: all var(--am-duration) var(--am-ease);\n    border: 0.667px solid var(--am-border);\n    background: var(--am-bg);\n    color: var(--am-text);\n    line-height: 1.4;\n    text-decoration: none;\n    white-space: nowrap;\n    box-sizing: border-box;\n}\n.am-btn:hover { background: var(--am-bg-muted); border-color: var(--am-border-strong); }\n.am-btn:active { transform: scale(0.98); }\n.am-btn:focus-visible { outline: 2px solid var(--am-accent); outline-offset: 2px; }\n\n.am-btn--primary {\n    background: var(--am-accent);\n    color: var(--am-accent-text);\n    border-color: var(--am-accent-hover);\n}\n.am-btn--primary:hover { background: var(--am-accent-hover); }\n\n.am-btn--ghost {\n    background: transparent;\n    border: 1px solid var(--am-border);\n}\n.am-btn--ghost:hover { background: var(--am-bg-muted); }\n\n.am-btn--icon {\n    width: 32px; height: 32px;\n    padding: 0;\n    background: transparent;\n    border: 1px solid var(--am-border);\n}\n.am-btn--icon:hover { background: var(--am-bg-muted); border-color: var(--am-border-strong); }\n\n.am-btn--sm {\n    padding: var(--am-space-1) var(--am-space-2);\n    font-size: 12px;\n}\n\n.am-btn--danger {\n    background: var(--am-error);\n    color: var(--am-text-inverse);\n    border-color: var(--am-error);\n}\n.am-btn--danger:hover { background: #b82848; }\n\n/* ========================================\n   Cards\n   ======================================== */\n.am-card {\n    background: var(--am-bg);\n    border: 1px solid var(--am-border);\n    border-radius: var(--am-radius-lg);\n    padding: var(--am-space-6);\n    transition: all var(--am-duration) var(--am-ease);\n    position: relative; overflow: hidden;\n}\n\n.am-card--stat {\n    min-height: 120px;\n    display: flex; flex-direction: column;\n}\n\n.am-card--attachment {\n    aspect-ratio: 1;\n    cursor: pointer;\n    padding: 0;\n    box-shadow: none;\n}\n\n.am-card--hover:hover {\n    transform: translateY(-2px);\n    box-shadow: var(--am-shadow-md);\n    border-color: var(--am-border-strong);\n}\n\n.am-card-preview {\n    width: 100%; height: 100%;\n    display: flex; align-items: center; justify-content: center;\n    background: var(--am-bg-muted);\n    overflow: hidden;\n}\n\n.am-card-title {\n    font-weight: 600; font-size: 14px;\n    color: var(--am-text);\n    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;\n}\n\n.am-card-meta {\n    font-size: 12px;\n    color: var(--am-text-tertiary);\n    display: flex; align-items: center; gap: var(--am-space-3);\n}\n\n/* ========================================\n   Grid\n   ======================================== */\n.am-grid {\n    display: grid;\n    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));\n    gap: var(--am-space-4);\n}\n\n.am-grid--stats {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));\n    gap: var(--am-space-5);\n}\n\n/* ========================================\n   Form Elements\n   ======================================== */\n.am-input {\n    width: 100%;\n    height: 32px;\n    padding: 0 var(--am-space-3);\n    border: 0.667px solid var(--am-border);\n    border-radius: var(--am-radius-sm);\n    font-family: var(--am-font);\n    font-size: 14px;\n    color: var(--am-text);\n    background: var(--am-bg);\n    transition: all var(--am-duration) var(--am-ease);\n    box-sizing: border-box;\n    outline: none;\n}\n.am-input:focus {\n    border-color: var(--am-accent);\n    box-shadow: 0 0 0 3px var(--am-accent-subtle);\n}\n.am-input::placeholder { color: var(--am-text-tertiary); }\n\n.am-select {\n    width: 100%;\n    height: 32px;\n    padding: 0 var(--am-space-3);\n    border: 0.667px solid var(--am-border);\n    border-radius: var(--am-radius-sm);\n    font-family: var(--am-font);\n    font-size: 14px;\n    color: var(--am-text);\n    background: var(--am-bg);\n    transition: all var(--am-duration) var(--am-ease);\n    box-sizing: border-box;\n    outline: none;\n    cursor: pointer;\n}\n.am-select:focus {\n    border-color: var(--am-accent);\n    box-shadow: 0 0 0 3px var(--am-accent-subtle);\n}\n\n.am-checkbox {\n    width: 20px; height: 20px;\n    accent-color: var(--am-accent);\n    cursor: pointer;\n    border-radius: var(--am-radius-sm);\n}\n\n.am-switch {\n    position: relative;\n    width: 36px; height: 20px;\n    background: var(--am-bg-muted);\n    border-radius: var(--am-radius-full);\n    border: 1px solid var(--am-border-strong);\n    cursor: pointer;\n    transition: all var(--am-duration) var(--am-ease);\n}\n.am-switch::after {\n    content: '';\n    position: absolute;\n    top: 2px; left: 2px;\n    width: 14px; height: 14px;\n    background: var(--am-bg);\n    border-radius: var(--am-radius-full);\n    box-shadow: var(--am-shadow-sm);\n    transition: transform var(--am-duration) var(--am-ease);\n}\n.am-switch.active {\n    background: var(--am-accent);\n    border-color: var(--am-accent);\n}\n.am-switch.active::after {\n    transform: translateX(16px);\n}\n\n/* ========================================\n   Feedback — Toast\n   ======================================== */\n.am-toast {\n    position: fixed;\n    top: var(--am-space-5); right: var(--am-space-5);\n    padding: var(--am-space-3) var(--am-space-4);\n    border-radius: var(--am-radius-md);\n    color: var(--am-text-inverse);\n    font-family: var(--am-font);\n    font-size: 13px;\n    z-index: 10002;\n    box-shadow: var(--am-shadow-md);\n    display: flex; align-items: center; gap: var(--am-space-2);\n    max-width: 320px;\n    word-wrap: break-word;\n    opacity: 0;\n    transform: translateX(100%);\n    transition: all var(--am-duration-slow) ease;\n}\n.am-toast.show {\n    opacity: 1;\n    transform: translateX(0);\n}\n.am-toast--info { background: var(--am-accent); }\n.am-toast--success { background: var(--am-success); }\n.am-toast--warning { background: var(--am-warning); }\n.am-toast--error { background: var(--am-error); }\n\n/* ========================================\n   Feedback — Progress\n   ======================================== */\n.am-progress {\n    width: 100%;\n    height: 4px;\n    background: var(--am-bg-muted);\n    border-radius: var(--am-radius-full);\n    overflow: hidden;\n}\n.am-progress-bar {\n    height: 100%;\n    background: var(--am-accent);\n    border-radius: var(--am-radius-full);\n    transition: width var(--am-duration-slow) var(--am-ease);\n}\n\n/* ========================================\n   Feedback — State\n   ======================================== */\n.am-state {\n    display: flex; flex-direction: column;\n    align-items: center; justify-content: center;\n    padding: var(--am-space-10) var(--am-space-5);\n    text-align: center;\n    color: var(--am-text-secondary);\n    font-size: 14px;\n}\n.am-state--loading::before {\n    content: '';\n    width: 32px; height: 32px;\n    border: 2px solid var(--am-border);\n    border-top-color: var(--am-accent);\n    border-radius: 50%;\n    animation: am-spin 1s linear infinite;\n    margin-bottom: var(--am-space-3);\n}\n.am-state--empty { color: var(--am-text-tertiary); }\n.am-state--error { color: var(--am-error); }\n\n/* ========================================\n   Menu\n   ======================================== */\n.am-menu {\n    position: fixed;\n    background: var(--am-bg-elevated);\n    border: 1px solid var(--am-border);\n    border-radius: var(--am-radius-lg);\n    box-shadow: var(--am-shadow-md);\n    padding: var(--am-space-2) 0;\n    min-width: 160px;\n    z-index: 1001;\n    animation: am-scale-in var(--am-duration) var(--am-ease);\n}\n.am-menu-item {\n    padding: var(--am-space-2) var(--am-space-4);\n    cursor: pointer;\n    display: flex; align-items: center; gap: var(--am-space-2);\n    font-size: 13px;\n    color: var(--am-text);\n    transition: background var(--am-duration) var(--am-ease);\n}\n.am-menu-item:hover {\n    background: var(--am-bg-muted);\n}\n.am-menu-divider {\n    height: 1px;\n    background: var(--am-border);\n    margin: var(--am-space-1) 0;\n}\n\n/* ========================================\n   Dialog\n   ======================================== */\n.am-dialog-overlay {\n    position: fixed;\n    top: 0; left: 0; width: 100%; height: 100%;\n    background: var(--am-overlay);\n    backdrop-filter: blur(var(--am-overlay-blur));\n    z-index: 10000;\n    display: flex; align-items: center; justify-content: center;\n    animation: am-fade-in var(--am-duration-slow) var(--am-ease);\n}\n.am-dialog {\n    background: var(--am-bg-elevated);\n    border-radius: var(--am-radius-2xl);\n    box-shadow: var(--am-shadow-xl);\n    max-width: 800px; width: 90%;\n    max-height: 80vh;\n    overflow: hidden;\n    display: flex; flex-direction: column;\n    animation: am-scale-in var(--am-duration-slow) var(--am-ease);\n}\n.am-dialog-header {\n    padding: var(--am-space-6) var(--am-space-8);\n    border-bottom: 1px solid var(--am-border);\n    font-size: 18px; font-weight: 600;\n    color: var(--am-text);\n}\n.am-dialog-body {\n    padding: var(--am-space-8);\n    overflow-y: auto;\n    flex: 1;\n}\n.am-dialog-footer {\n    padding: var(--am-space-4) var(--am-space-8);\n    border-top: 1px solid var(--am-border);\n    display: flex; gap: var(--am-space-3);\n    justify-content: flex-end;\n}\n\n/* ========================================\n   Tabs\n   ======================================== */\n.am-tabs {\n    display: flex;\n    border-bottom: 1px solid var(--am-border);\n    gap: 0;\n}\n.am-tab {\n    padding: var(--am-space-3) var(--am-space-4);\n    font-size: 13px; font-weight: 500;\n    color: var(--am-text-secondary);\n    cursor: pointer;\n    border-bottom: 2px solid transparent;\n    transition: all var(--am-duration) var(--am-ease);\n    background: none; border-top: none; border-left: none; border-right: none;\n}\n.am-tab:hover { color: var(--am-text); }\n.am-tab.active {\n    color: var(--am-accent);\n    border-bottom-color: var(--am-accent);\n}\n\n/* ========================================\n   Toolbar\n   ======================================== */\n.am-toolbar {\n    display: flex; align-items: center; justify-content: space-between;\n    padding: var(--am-space-3) var(--am-space-5);\n    background: var(--am-bg);\n    border-bottom: 1px solid var(--am-border);\n    gap: var(--am-space-3);\n    flex-shrink: 0;\n    flex-wrap: wrap;\n}\n.am-toolbar__filters {\n    border-bottom: none;\n    flex-shrink: 0;\n}\n.am-toolbar__actions {\n    display: flex; align-items: center; gap: var(--am-space-2);\n    flex-shrink: 0;\n}\n.am-toolbar__search {\n    width: 200px;\n    padding: var(--am-space-1) var(--am-space-3);\n    font-size: 12px;\n}\n\n/* ========================================\n   Bento Grid Layout\n   ======================================== */\n.am-bento {\n    display: flex; flex-direction: column;\n    gap: var(--am-space-6);\n    padding: var(--am-space-8);\n    max-width: 800px; margin: 0 auto;\n    min-height: 100%;\n    background: var(--am-bg-subtle);\n}\n\n.am-bento-header {\n    background: var(--am-bg);\n    border: 1px solid var(--am-border);\n    border-radius: var(--am-radius-xl);\n    padding: var(--am-space-5);\n    display: flex; justify-content: space-between; align-items: center;\n    min-height: 80px;\n}\n\n.am-bento-row {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    gap: var(--am-space-5);\n    width: 100%;\n}\n\n.am-bento-card {\n    background: var(--am-bg);\n    border: 1px solid var(--am-border);\n    border-radius: var(--am-radius-xl);\n    padding: var(--am-space-6);\n    transition: all var(--am-duration) var(--am-ease);\n    position: relative; overflow: hidden;\n    min-height: 120px;\n    display: flex; flex-direction: column;\n}\n.am-bento-card--primary {\n    background: var(--am-accent-subtle);\n    color: var(--am-accent);\n    border: 2px solid var(--am-accent);\n    cursor: pointer;\n    box-shadow: 0 2px 8px rgba(15, 122, 245, 0.08);\n    min-height: 160px;\n}\n.am-bento-card--primary:hover {\n    transform: translateY(-2px);\n    box-shadow: 0 4px 16px rgba(15, 122, 245, 0.15);\n    background: rgba(15, 122, 245, 0.08);\n}\n.am-bento-card--hover:hover {\n    transform: translateY(-2px);\n    box-shadow: var(--am-shadow-md);\n    border-color: var(--am-border-strong);\n}\n\n.am-bento-title {\n    font-size: 16px; font-weight: 600;\n    color: var(--am-text);\n    margin: 0 0 var(--am-space-3) 0;\n    line-height: 1.3;\n}\n\n.am-stat-grid {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));\n    gap: var(--am-space-5);\n    width: 100%;\n}\n\n.am-stat-item {\n    text-align: center;\n    padding: var(--am-space-3);\n}\n\n.am-stat-number {\n    font-size: 32px; font-weight: 700;\n    color: var(--am-text);\n    margin: 0; line-height: 1.1;\n    font-family: var(--am-font);\n    letter-spacing: -0.02em;\n}\n.am-stat-number--lg {\n    font-size: 42px; font-weight: 800;\n    color: inherit;\n}\n\n.am-stat-label {\n    font-size: 14px; font-weight: 600;\n    color: var(--am-text);\n    margin: 6px 0 0 0;\n    line-height: 1.3;\n}\n\n.am-stat-desc {\n    font-size: 12px;\n    color: var(--am-text-secondary);\n    line-height: 1.4;\n    margin: var(--am-space-1) 0 0 0;\n}\n\n.am-overview-row {\n    display: flex; justify-content: space-between; align-items: center;\n    padding: var(--am-space-3) 0;\n    border-bottom: 1px solid var(--am-border);\n}\n.am-overview-row:last-child { border-bottom: none; }\n.am-overview-row-label {\n    font-size: 14px;\n    color: var(--am-text-secondary);\n}\n.am-overview-row-value {\n    font-size: 16px; font-weight: 600;\n    color: var(--am-text);\n}\n\n/* ========================================\n   List Components\n   ======================================== */\n.am-list-card {\n    background: var(--am-bg);\n    border: 1px solid var(--am-border);\n    border-radius: var(--am-radius-xl);\n    padding: var(--am-space-6);\n    display: none;\n}\n.am-list-card.visible { display: block; }\n\n.am-list-item {\n    padding: var(--am-space-3);\n    background: var(--am-bg-subtle);\n    border-radius: var(--am-radius-md);\n    border: 1px solid var(--am-border);\n    cursor: pointer;\n    transition: background var(--am-duration) var(--am-ease);\n}\n.am-list-item:hover {\n    background: var(--am-bg-muted);\n}\n\n.am-list-more {\n    padding: var(--am-space-3);\n    text-align: center;\n    border-top: 1px solid var(--am-border);\n    margin-top: var(--am-space-2);\n    font-size: 12px;\n    color: var(--am-text-secondary);\n}\n\n.am-group-card {\n    padding: var(--am-space-3);\n    background: var(--am-bg-subtle);\n    border-radius: var(--am-radius-md);\n    border: 1px solid var(--am-border);\n}\n\n.am-tag {\n    display: inline-block;\n    padding: 1px var(--am-space-1);\n    border-radius: var(--am-radius-sm);\n    font-size: 11px; font-weight: 500;\n    line-height: 1.4;\n}\n.am-tag--warning {\n    background: var(--am-warning-subtle);\n    color: var(--am-warning);\n}\n.am-tag--error {\n    background: var(--am-error-subtle);\n    color: var(--am-error);\n}\n.am-tag--success {\n    background: var(--am-success-subtle);\n    color: var(--am-success);\n}\n\n/* ========================================\n   Form Settings\n   ======================================== */\n.am-form-section {\n    margin-bottom: var(--am-space-8);\n    padding-bottom: var(--am-space-6);\n    border-bottom: 1px solid var(--am-border);\n}\n.am-form-section:last-child { border-bottom: none; margin-bottom: 0; }\n\n.am-form-section-title {\n    font-size: 18px; font-weight: 600;\n    color: var(--am-text);\n    margin-bottom: var(--am-space-4);\n}\n\n.am-form-item {\n    margin-bottom: var(--am-space-5);\n}\n\n.am-form-label {\n    font-size: 14px; font-weight: 600;\n    color: var(--am-text);\n    margin-bottom: var(--am-space-2);\n    display: block;\n}\n\n.am-form-desc {\n    font-size: 13px;\n    color: var(--am-text-secondary);\n    margin-top: var(--am-space-1);\n    line-height: 1.4;\n}\n\n.am-form-row {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    gap: var(--am-space-5);\n    margin-bottom: var(--am-space-5);\n}\n\n.am-form-checkbox {\n    display: flex; align-items: center;\n    margin-bottom: var(--am-space-3);\n}\n.am-form-checkbox input[type=\"checkbox\"] {\n    margin-right: var(--am-space-2);\n    transform: scale(1.2);\n}\n\n.am-form-panel {\n    background: var(--am-bg-subtle);\n    padding: var(--am-space-4);\n    border-radius: var(--am-radius-lg);\n    margin-top: var(--am-space-3);\n}\n\n.am-form-actions {\n    display: flex; gap: var(--am-space-3);\n    justify-content: flex-end;\n    margin-top: var(--am-space-8);\n    padding-top: var(--am-space-6);\n    border-top: 1px solid var(--am-border);\n}\n\n/* ========================================\n   Utility\n   ======================================== */\n.am-divider {\n    height: 1px;\n    background: var(--am-border);\n    border: none;\n    margin: var(--am-space-4) 0;\n}\n\n.am-badge {\n    display: inline-flex; align-items: center; justify-content: center;\n    padding: 2px var(--am-space-2);\n    font-size: 11px; font-weight: 600;\n    border-radius: var(--am-radius-full);\n    background: var(--am-accent-subtle);\n    color: var(--am-accent);\n    line-height: 1.4;\n}\n\n.am-text-truncate {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n}\n\n.am-scroll {\n    overflow-y: auto;\n    scrollbar-width: thin;\n    scrollbar-color: var(--am-border-strong) transparent;\n}\n.am-scroll::-webkit-scrollbar { width: 6px; }\n.am-scroll::-webkit-scrollbar-track { background: transparent; }\n.am-scroll::-webkit-scrollbar-thumb {\n    background: var(--am-border-strong);\n    border-radius: var(--am-radius-full);\n}\n.am-scroll::-webkit-scrollbar-thumb:hover { background: var(--am-text-tertiary); }\n\n/* ========================================\n   Responsive Breakpoints\n   ======================================== */\n@media (max-width: 1024px) {\n    .am-window {\n        width: 85% !important; height: 95% !important; min-width: 500px !important;\n    }\n}\n@media (max-width: 768px) {\n    .am-window {\n        width: 100% !important; height: 100% !important;\n        min-width: 320px !important; border-radius: 0 !important;\n        top: 0 !important; left: 0 !important; transform: none !important;\n    }\n    .am-bento-row { grid-template-columns: 1fr !important; gap: var(--am-space-4) !important; }\n    .am-stat-grid { grid-template-columns: repeat(2, 1fr) !important; gap: var(--am-space-3) !important; }\n    .am-bento { padding: var(--am-space-4) !important; }\n    .am-form-row { grid-template-columns: 1fr !important; }\n}\n@media (max-width: 480px) {\n    .am-stat-grid { grid-template-columns: 1fr !important; }\n}\n/*$vite$:1*/"));
			document.head.appendChild(elementStyle);
		}
	} catch (e) {
		console.error("vite-plugin-css-injected-by-js", e);
	}
	//#endregion
})();
(function() {
	//#region src/constants.js
	var MAIL_CONSTANTS = {
		BASE_URL: "https://wx.mail.qq.com",
		API_ENDPOINTS: {
			MAIL_LIST: "/list/maillist",
			ATTACH_DOWNLOAD: "/attach/download",
			ATTACH_THUMBNAIL: "/attach/thumbnail",
			ATTACH_PREVIEW: "/attach/preview"
		}
	};
	var REDIRECT_PATTERNS = [
		/window\.location\.href\s*=\s*['"]([^'"]+)['"]/,
		/location\.href\s*=\s*['"]([^'"]+)['"]/,
		/window\.location\s*=\s*['"]([^'"]+)['"]/,
		/location\s*=\s*['"]([^'"]+)['"]/,
		/window\.location\.replace\(['"]([^'"]+)['"]\)/,
		/location\.replace\(['"]([^'"]+)['"]\)/,
		/document\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/,
		/<meta[^>]+http-equiv=['"]refresh['"][^>]+content=['"][^'"]*url=([^'"]+)['"]/i,
		/href=['"]([^'"]*download[^'"]*)['"]/i,
		/url\(['"]([^'"]*download[^'"]*)['"]\)/i,
		/(https?:\/\/[^'">\s]+download[^'">\s]*)/i
	];
	var DEFAULT_HEADERS = Object.freeze({
		"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
		"accept-language": "en,zh-CN;q=0.9,zh;q=0.8",
		"sec-ch-ua-mobile": "?0",
		"sec-fetch-dest": "iframe",
		"sec-fetch-mode": "navigate",
		"sec-fetch-site": "same-origin",
		"sec-fetch-user": "?1",
		"upgrade-insecure-requests": "1"
	});
	var FILE_TYPES = {
		"图片": [
			"jpg",
			"jpeg",
			"png",
			"gif",
			"bmp",
			"webp",
			"svg",
			"ico",
			"tiff"
		],
		"文档": [
			"doc",
			"docx",
			"pdf",
			"txt",
			"rtf",
			"odt",
			"pages",
			"md"
		],
		"表格": [
			"xls",
			"xlsx",
			"csv",
			"ods",
			"numbers"
		],
		"演示": [
			"ppt",
			"pptx",
			"key",
			"odp"
		],
		"压缩包": [
			"zip",
			"rar",
			"7z",
			"tar",
			"gz",
			"bz2",
			"xz"
		],
		"音频": [
			"mp3",
			"wav",
			"flac",
			"aac",
			"ogg",
			"wma",
			"m4a"
		],
		"视频": [
			"mp4",
			"avi",
			"mkv",
			"mov",
			"wmv",
			"flv",
			"webm"
		]
	};
	var FILE_ICONS = {
		jpg: "🖼️",
		jpeg: "🖼️",
		png: "🖼️",
		gif: "🖼️",
		bmp: "🖼️",
		webp: "🖼️",
		svg: "🖼️",
		doc: "📄",
		docx: "📄",
		pdf: "📄",
		txt: "📄",
		rtf: "📄",
		md: "📄",
		xls: "📊",
		xlsx: "📊",
		csv: "📊",
		ppt: "📑",
		pptx: "📑",
		zip: "🗜️",
		rar: "🗜️",
		"7z": "🗜️",
		tar: "🗜️",
		gz: "🗜️",
		mp3: "🎵",
		wav: "🎵",
		flac: "🎵",
		mp4: "🎬",
		avi: "🎬",
		mkv: "🎬",
		mov: "🎬"
	};
	var TOAST_ICONS = {
		success: "✅",
		error: "❌",
		warning: "⚠️",
		info: "ℹ️"
	};
	var ATTACH_SOURCE = {
		NORMAL: "normal",
		CLOUD: "cloud"
	};
	var STALL_TIMEOUT = 3e4;
	//#endregion
	//#region src/utils/sanitize.js
	var ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;
	var RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
	var MAX_FILENAME_LENGTH = 200;
	function sanitizeFileName(fileName, replacementChar = "_") {
		if (!fileName) return "untitled";
		let result = fileName.replace(ILLEGAL_CHARS, replacementChar).replace(/\s+/g, " ").trim();
		const dotIndex = result.lastIndexOf(".");
		const name = dotIndex > 0 ? result.substring(0, dotIndex) : result;
		const ext = dotIndex > 0 ? result.substring(dotIndex) : "";
		if (RESERVED_NAMES.test(name)) result = `_${name}${ext}`;
		if (result.length > MAX_FILENAME_LENGTH) {
			const extLen = ext.length;
			result = result.substring(0, MAX_FILENAME_LENGTH - extLen) + ext;
		}
		return result || "untitled";
	}
	function getExtension(fileName) {
		if (!fileName) return "";
		const dotIndex = fileName.lastIndexOf(".");
		return dotIndex > 0 ? fileName.substring(dotIndex + 1).toLowerCase() : "";
	}
	function getBaseName(fileName) {
		if (!fileName) return "";
		const dotIndex = fileName.lastIndexOf(".");
		return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
	}
	//#endregion
	//#region src/api/downloader.js
	var QQMailDownloader = class {
		constructor() {
			this.sid = null;
		}
		init() {
			this.sid = this._getSid();
			return !!this.sid;
		}
		_getSid() {
			const fromQuery = new URLSearchParams(window.location.search).get("sid");
			if (fromQuery) return fromQuery;
			const hashMatch = window.location.hash.match(/sid=([^&]+)/);
			return hashMatch ? hashMatch[1] : "";
		}
		getCurrentFolderId() {
			const match = window.location.hash.match(/\/list\/(\d+)/);
			return match ? match[1] : "1";
		}
		/**
		* Fetch all mails from a folder with pagination fault tolerance.
		* Uses Promise.allSettled + batch concurrency + retry for failed pages.
		*/
		async fetchAllMails(folderId) {
			const first = await this._fetchMailListPage(folderId, 0);
			const total = first.total;
			const allMails = [...first.mails];
			if (total <= 50) return {
				mails: this._dedup(allMails),
				total,
				failedPages: []
			};
			const totalPages = Math.ceil(total / 50);
			const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
			const failedPages = [];
			for (let i = 0; i < remainingPages.length; i += 3) {
				const batch = remainingPages.slice(i, i + 3);
				const results = await Promise.allSettled(batch.map((page) => this._fetchMailListPage(folderId, page)));
				for (let j = 0; j < results.length; j++) if (results[j].status === "fulfilled" && results[j].value.mails?.length) allMails.push(...results[j].value.mails);
				else failedPages.push(batch[j]);
				if (i + 3 < remainingPages.length) await this._delay(200);
			}
			const retryFailed = [];
			for (const page of failedPages) {
				let success = false;
				for (let retry = 0; retry < 2; retry++) try {
					await this._delay(500 * (retry + 1));
					const result = await this._fetchMailListPage(folderId, page);
					allMails.push(...result.mails);
					success = true;
					break;
				} catch {}
				if (!success) retryFailed.push(page);
			}
			return {
				mails: this._dedup(allMails),
				total,
				failedPages: retryFailed
			};
		}
		async _fetchMailListPage(folderId, page) {
			const params = new URLSearchParams({
				sid: this.sid,
				r: Date.now(),
				dir: folderId,
				dirid: folderId,
				func: 1,
				sort_type: 1,
				sort_direction: 1,
				page_now: page,
				page_size: 50,
				enable_topmail: true
			});
			const url = `${MAIL_CONSTANTS.BASE_URL}${MAIL_CONSTANTS.API_ENDPOINTS.MAIL_LIST}?${params}`;
			const response = await this._gmRequest(url, "", 15e3);
			const data = JSON.parse(response.responseText);
			if (!data?.head) throw new Error("响应格式错误");
			if (data.head.ret !== 0) throw new Error(`API错误: ${data.head.msg || data.head.ret}`);
			return {
				mails: data.body?.list || [],
				total: data.body?.total_num || 0
			};
		}
		_dedup(mails) {
			const map = /* @__PURE__ */ new Map();
			mails.forEach((m) => map.set(m.emailid, m));
			return [...map.values()];
		}
		/**
		* Extract attachments from mail list.
		* Merges normal_attach + cloud_attach, logs skipped items.
		* @returns {{ valid: Object[], skipped: Object[] }}
		*/
		extractAttachments(mails) {
			const valid = [];
			const skipped = [];
			for (const mail of mails) {
				const sources = [{
					key: "normal_attach",
					type: ATTACH_SOURCE.NORMAL
				}, {
					key: "cloud_attach",
					type: ATTACH_SOURCE.CLOUD
				}];
				for (const { key, type } of sources) {
					if (!Array.isArray(mail[key]) || mail[key].length === 0) continue;
					for (const attach of mail[key]) {
						if (!attach?.name) {
							skipped.push({
								...attach,
								mailSubject: mail.subject,
								skipReason: "附件名为空"
							});
							continue;
						}
						if (!attach.download_url && type === ATTACH_SOURCE.NORMAL) {
							skipped.push({
								...attach,
								mailSubject: mail.subject,
								skipReason: "下载链接缺失"
							});
							continue;
						}
						valid.push(this._normalizeAttachment(attach, mail, type));
					}
				}
			}
			valid.forEach((att, i) => {
				att.fileIndex = i + 1;
			});
			return {
				valid,
				skipped
			};
		}
		_normalizeAttachment(attach, mail, type) {
			let downloadUrl = attach.download_url || "";
			if (downloadUrl && !downloadUrl.startsWith("http")) downloadUrl = MAIL_CONSTANTS.BASE_URL + downloadUrl;
			if (downloadUrl && !downloadUrl.includes("sid=")) downloadUrl += `${downloadUrl.includes("?") ? "&" : "?"}sid=${this.sid}`;
			return {
				...attach,
				_attachType: type,
				mailId: mail.emailid,
				mailSubject: mail.subject,
				totime: mail.totime,
				date: mail.totime,
				sender: mail.senders?.item?.[0]?.email,
				senderName: mail.senders?.item?.[0]?.nick,
				nameWithoutExt: getBaseName(attach.name),
				ext: getExtension(attach.name),
				type: getExtension(attach.name),
				download_url: downloadUrl
			};
		}
		async resolveDownloadUrl(attachment) {
			if (attachment._attachType === ATTACH_SOURCE.CLOUD) return this._resolveCloudUrl(attachment);
			return this._resolveNormalUrl(attachment);
		}
		async _resolveNormalUrl(attachment) {
			const urlObj = new URL(attachment.download_url, MAIL_CONSTANTS.BASE_URL);
			const params = new URLSearchParams(urlObj.search);
			const sid = new URLSearchParams(window.location.search).get("sid") || this.sid;
			const initialUrl = `${MAIL_CONSTANTS.BASE_URL}${MAIL_CONSTANTS.API_ENDPOINTS.ATTACH_DOWNLOAD}?mailid=${params.get("mailid")}&fileid=${params.get("fileid")}&name=${encodeURIComponent(attachment.name)}&sid=${sid}`;
			try {
				return await this._fetchRedirectUrl(initialUrl);
			} catch {
				return attachment.download_url ? this._ensureSid(attachment.download_url, sid) : initialUrl;
			}
		}
		async _resolveCloudUrl(attachment) {
			if (attachment.download_url?.startsWith("http")) return attachment.download_url;
			return this._resolveNormalUrl(attachment);
		}
		async _fetchRedirectUrl(url) {
			const response = await this._gmRequest(url);
			if (response.finalUrl && response.finalUrl !== url) return response.finalUrl;
			const text = response.responseText;
			for (const pattern of REDIRECT_PATTERNS) {
				const match = text.match(pattern);
				if (match?.[1]) return match[1];
			}
			try {
				const json = JSON.parse(text);
				const found = json.url || json.download_url || json.redirect_url;
				if (found) return found;
			} catch {}
			throw new Error("No redirect URL found");
		}
		_gmRequest(url, responseType = "", timeout = 0) {
			return new Promise((resolve, reject) => {
				GM_xmlhttpRequest({
					method: "GET",
					url,
					headers: {
						...DEFAULT_HEADERS,
						"Referer": MAIL_CONSTANTS.BASE_URL + "/"
					},
					responseType,
					timeout,
					onload(res) {
						res.status === 200 ? resolve(res) : reject(/* @__PURE__ */ new Error(`HTTP ${res.status} ${res.statusText}`));
					},
					onerror(err) {
						reject(err);
					},
					ontimeout() {
						reject(/* @__PURE__ */ new Error("请求超时"));
					}
				});
			});
		}
		_ensureSid(url, sid) {
			if (!url.startsWith("http")) url = MAIL_CONSTANTS.BASE_URL + url;
			if (!url.includes("sid=")) url += `${url.includes("?") ? "&" : "?"}sid=${sid}`;
			return url;
		}
		_delay(ms) {
			return new Promise((r) => setTimeout(r, ms));
		}
	};
	//#endregion
	//#region src/core/settings.js
	var STORAGE_KEY = "qqmail_downloader_settings";
	var DEFAULTS = {
		fileNaming: {
			prefix: "",
			suffix: "",
			includeMailId: false,
			includeAttachmentId: false,
			includeMailSubject: false,
			includeFileType: false,
			separator: "_",
			useCustomPattern: false,
			customPattern: "{date}_{subject}_{fileName}",
			validation: {
				enabled: true,
				pattern: "\\d{6,}",
				fallbackPattern: "auto",
				fallbackTemplate: "{subject}_{fileName}",
				replacementChar: "_",
				removeInvalidChars: true
			}
		},
		folderStructure: "flat",
		dateFormat: "YYYY-MM-DD",
		createDateSubfolders: false,
		folderNaming: { customTemplate: "{date}/{senderName}" },
		conflictResolution: "rename",
		downloadBehavior: {
			showProgress: true,
			retryOnFail: true,
			verifyDownloads: true,
			notifyOnComplete: true,
			concurrentDownloads: "auto",
			autoCompareAfterDownload: true
		},
		smartGrouping: {
			enabled: false,
			maxGroupSize: 5,
			groupByType: true,
			groupByDate: true
		},
		contentReplacement: {
			enabled: false,
			rules: []
		},
		customVariables: []
	};
	var Settings = class {
		constructor() {
			this.data = this.load();
		}
		load() {
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (!stored) return structuredClone(DEFAULTS);
				return this._merge(DEFAULTS, JSON.parse(stored));
			} catch {
				return structuredClone(DEFAULTS);
			}
		}
		save() {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
			} catch (e) {
				console.warn("[Settings] save failed:", e);
			}
		}
		reset() {
			this.data = structuredClone(DEFAULTS);
			this.save();
		}
		get(path) {
			return path.split(".").reduce((obj, key) => obj?.[key], this.data);
		}
		set(path, value) {
			const keys = path.split(".");
			const last = keys.pop();
			const target = keys.reduce((obj, key) => {
				if (!obj[key]) obj[key] = {};
				return obj[key];
			}, this.data);
			target[last] = value;
			this.save();
		}
		_merge(defaults, stored) {
			const result = structuredClone(defaults);
			for (const [key, val] of Object.entries(stored)) if (key in result) if (val && typeof val === "object" && !Array.isArray(val) && typeof result[key] === "object" && !Array.isArray(result[key])) result[key] = this._merge(result[key], val);
			else result[key] = val;
			return result;
		}
	};
	//#endregion
	//#region src/utils/format.js
	function formatFileSize(bytes) {
		if (!bytes || bytes <= 0) return "0 B";
		const units = [
			"B",
			"KB",
			"MB",
			"GB",
			"TB"
		];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
	}
	function formatDate(dateOrTimestamp, format) {
		const date = normalizeDate(dateOrTimestamp);
		if (!date) return "";
		if (!format) return date.toLocaleDateString("zh-CN") + " " + date.toLocaleTimeString("zh-CN", {
			hour: "2-digit",
			minute: "2-digit"
		});
		const pad = (n) => String(n).padStart(2, "0");
		const y = date.getFullYear();
		const M = pad(date.getMonth() + 1);
		const d = pad(date.getDate());
		const H = pad(date.getHours());
		const h = pad(date.getHours() % 12 || 12);
		const m = pad(date.getMinutes());
		const s = pad(date.getSeconds());
		return format.replace("YYYY", y).replace("MM", M).replace("DD", d).replace("HH", H).replace("hh", h).replace("mm", m).replace("ss", s);
	}
	function normalizeDate(data) {
		if (!data) return null;
		if (data instanceof Date) return isNaN(data.getTime()) ? null : data;
		const ts = typeof data === "number" && data < 1e10 ? data * 1e3 : data;
		const date = new Date(ts);
		return isNaN(date.getTime()) ? null : date;
	}
	function formatTime(seconds) {
		if (!seconds || seconds <= 0) return "计算中...";
		if (seconds < 60) return `${Math.round(seconds)}秒`;
		if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
		return `${Math.round(seconds / 3600)}小时`;
	}
	//#endregion
	//#region src/core/naming-engine.js
	/**
	* NamingEngine — 文件命名引擎
	* 负责模板变量替换、文件名验证、智能命名策略分析、备用名生成
	*/
	var NamingEngine = class {
		constructor(settings) {
			this.settings = settings;
		}
		/** 设置快捷访问 */
		get _fileNaming() {
			return this.settings.data.fileNaming;
		}
		get _validation() {
			return this._fileNaming.validation;
		}
		calculatePaddingDigits(total) {
			return Math.max(2, total.toString().length);
		}
		formatIndex(index, total) {
			const digits = this.calculatePaddingDigits(total);
			return String(index || 1).padStart(digits, "0");
		}
		/**
		* 构建模板变量上下文
		* @param {object} attachment - 附件对象
		* @param {object} [context] - 额外上下文 { totalMails, totalAttachments, folderName }
		*/
		buildVariableData(attachment, context = {}) {
			const now = /* @__PURE__ */ new Date();
			const rawDate = attachment.date || attachment.totime;
			const mailDate = rawDate ? normalizeDate(rawDate) || now : now;
			const totalMails = context.totalMails || 1;
			const totalAttachments = context.totalAttachments || 1;
			const folderName = context.folderName || "未知文件夹";
			return {
				subject: sanitizeFileName(attachment.mailSubject || attachment.subject || "未知主题"),
				sender: sanitizeFileName(attachment.sender || "未知发件人"),
				senderEmail: attachment.senderEmail || "",
				senderName: sanitizeFileName(attachment.senderName || attachment.sender || "未知发件人"),
				mailIndex: this.formatIndex(attachment.mailIndex, totalMails),
				folderID: attachment.folderId || "",
				folderName: sanitizeFileName(folderName),
				mailId: attachment.mailId || "",
				fileName: attachment.name || "未知文件",
				fileNameNoExt: getBaseName(attachment.name || "未知文件"),
				fileType: getExtension(attachment.name || ""),
				fileId: attachment.fileid || "",
				fileIndex: this.formatIndex(attachment.fileIndex, totalAttachments),
				attachIndex: this.formatIndex(attachment.attachIndex, totalAttachments),
				size: attachment.size || 0,
				date: mailDate,
				time: formatDate(mailDate, "HH-mm-ss"),
				datetime: formatDate(mailDate, "YYYY-MM-DD_HH-mm-ss"),
				timestamp: Math.floor(mailDate.getTime() / 1e3),
				year: formatDate(mailDate, "YYYY"),
				month: formatDate(mailDate, "MM"),
				day: formatDate(mailDate, "DD"),
				hour: formatDate(mailDate, "HH"),
				hour12: formatDate(mailDate, "hh"),
				minute: formatDate(mailDate, "mm"),
				second: formatDate(mailDate, "ss")
			};
		}
		/**
		* 通用变量替换（支持 {date:YYYY-MM} 格式化语法）
		*/
		replaceVariables(template, variableData) {
			if (!template || !variableData) return template;
			let result = template;
			result = result.replace(/\{(\w+):([^}]+)\}/g, (match, varName, format) => {
				if (varName === "date" && variableData.date) {
					const mailDate = normalizeDate(variableData.date);
					if (mailDate) return formatDate(mailDate, format);
				}
				return match;
			});
			result = result.replace(/\{(\w+)\}/g, (match, varName) => {
				const value = variableData[varName];
				return value !== void 0 && value !== null ? String(value) : match;
			});
			return result;
		}
		/**
		* 自定义变量处理
		*/
		processCustomVariables(variables, attachment) {
			if (!variables?.length) return {};
			const result = {};
			const entries = Object.entries(attachment);
			for (const variable of variables) if (variable.name && variable.value) {
				let value = variable.value;
				for (const [key, val] of entries) if (value.includes(`{${key}}`)) value = value.replaceAll(`{${key}}`, val ?? "");
				result[variable.name] = value;
			}
			return result;
		}
		/**
		* 简易命名模式解析（用于 prefix / fallback 等场景）
		*/
		parseNamingPattern(pattern, attachment) {
			if (!pattern || !attachment) return "";
			const replacements = {
				name: attachment.name,
				fileName: attachment.name,
				mailSubject: sanitizeFileName(attachment.mailSubject || ""),
				subject: sanitizeFileName(attachment.mailSubject || ""),
				sender: sanitizeFileName(attachment.senderName || attachment.sender || ""),
				senderEmail: attachment.sender || "",
				mailId: attachment.mailId,
				attachmentId: attachment.fid,
				date: attachment.totime ? formatDate(normalizeDate(attachment.totime), "YYYYMMDD") : "",
				toTime: attachment.totime ? formatDate(normalizeDate(attachment.totime), "YYYYMMDDHHmmss") : "",
				fileType: getExtension(attachment.name),
				size: attachment.size ? formatFileSize(attachment.size) : ""
			};
			return pattern.replace(/\{(\w+)\}/g, (match, key) => replacements[key] ?? match);
		}
		/**
		* 验证文件名是否符合正则模式
		*/
		validateFileName(fileName) {
			const v = this._validation;
			if (!v?.enabled || !v.pattern) return true;
			try {
				return new RegExp(v.pattern).test(getBaseName(fileName));
			} catch {
				return true;
			}
		}
		/**
		* 应用内容替换规则
		*/
		applyContentReplacement(fileName, attachment = null) {
			const cr = this._validation?.contentReplacement;
			if (!cr?.enabled || !cr.search) return fileName;
			try {
				let result = fileName;
				const searchPattern = cr.search;
				let replaceContent = cr.replace ?? "";
				if (attachment && replaceContent.includes("{")) replaceContent = this.parseNamingPattern(replaceContent, attachment);
				if (cr.mode === "regex") {
					const flags = (cr.global ? "g" : "") + (cr.caseSensitive ? "" : "i");
					result = result.replace(new RegExp(searchPattern, flags), replaceContent);
				} else if (cr.global) if (cr.caseSensitive) while (result.includes(searchPattern)) result = result.replace(searchPattern, replaceContent);
				else {
					const escaped = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
					result = result.replace(new RegExp(escaped, "gi"), replaceContent);
				}
				else {
					const idx = cr.caseSensitive ? result.indexOf(searchPattern) : result.toLowerCase().indexOf(searchPattern.toLowerCase());
					if (idx !== -1) result = result.substring(0, idx) + replaceContent + result.substring(idx + searchPattern.length);
				}
				return result;
			} catch {
				return fileName;
			}
		}
		/**
		* 清理文件名（结合验证规则）
		*/
		sanitize(fileName, attachment = null) {
			const v = this._validation;
			if (!v?.enabled) return sanitizeFileName(fileName);
			let cleanName = this.applyContentReplacement(fileName, attachment);
			const replacementChar = v.replacementChar || "_";
			if (v.removeInvalidChars !== false) cleanName = cleanName.replace(/[<>:"/\\|?*\x00-\x1f]/g, replacementChar);
			cleanName = cleanName.replace(/\s+/g, " ").trim();
			if (replacementChar && replacementChar !== " ") {
				const escaped = replacementChar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				cleanName = cleanName.replace(new RegExp(`${escaped}{2,}`, "g"), replacementChar);
			}
			cleanName = cleanName.replace(/^[._\-\s]+|[._\-\s]+$/g, "");
			return cleanName || "unnamed_file";
		}
		generateFallbackPrefix(fallbackPattern, attachment) {
			if (!fallbackPattern || !attachment) return "";
			switch (fallbackPattern) {
				case "mailSubject": return sanitizeFileName(attachment.mailSubject || "");
				case "senderEmail": return sanitizeFileName(attachment.sender || "");
				case "toTime": return attachment.totime ? formatDate(normalizeDate(attachment.totime), "YYYYMMDDHHmmss") : "";
				default: return "";
			}
		}
		generateFallbackFileName(originalFileName, attachment) {
			const v = this._validation;
			const fallbackPattern = v?.fallbackPattern || "auto";
			const ext = getExtension(originalFileName);
			let newName;
			switch (fallbackPattern) {
				case "mailSubject":
					newName = attachment.mailSubject || attachment.subject || "untitled";
					break;
				case "senderEmail":
					newName = attachment.sender || "unknown_sender";
					break;
				case "toTime":
					newName = attachment.totime ? formatDate(normalizeDate(attachment.totime), "YYYYMMDDHHmmss") : Date.now().toString();
					break;
				case "customTemplate": {
					const template = v?.fallbackTemplate || "{subject}_{fileName}";
					newName = this.parseNamingPattern(template, attachment);
					break;
				}
				default: {
					const nameNoExt = getBaseName(originalFileName);
					const numbers = nameNoExt.match(/\d+/g);
					const letters = nameNoExt.match(/[a-zA-Z\u4e00-\u9fff]+/g);
					if (numbers?.length) newName = numbers.join("_");
					else if (letters?.length) newName = letters.slice(0, 3).join("_");
					else newName = attachment.mailSubject || attachment.subject || `file_${Date.now()}`;
					break;
				}
			}
			newName = this.sanitize(newName, attachment);
			return ext ? `${newName}.${ext}` : newName;
		}
		findCommonPrefix(fileNames) {
			if (!fileNames?.length || fileNames.length < 2) return "";
			const separators = new Set([
				"+",
				"-",
				"_",
				" ",
				".",
				"(",
				")",
				"[",
				"]"
			]);
			let prefix = fileNames[0];
			for (let i = 1; i < fileNames.length && prefix.length > 0; i++) {
				const current = fileNames[i];
				const minLen = Math.min(prefix.length, current.length);
				let j = 0;
				while (j < minLen && prefix[j] === current[j]) j++;
				prefix = prefix.substring(0, j);
			}
			const lastSepIndex = [...prefix].findLastIndex((ch) => separators.has(ch));
			return lastSepIndex > 0 ? prefix.substring(0, lastSepIndex + 1) : prefix;
		}
		extractNamingPattern(fileName) {
			const patterns = [
				/^(.+?[+\-_\s])(\d+)([+\-_\s])(\d+)([+\-_\s]).*/,
				/^(.+?[+\-_\s])(\d+)([+\-_\s]).*/,
				/^(.+?)(\d{6,}).*/
			];
			for (const pattern of patterns) {
				const match = fileName.match(pattern);
				if (!match) continue;
				if (pattern === patterns[0]) return match[1] + match[2] + match[3] + match[4] + match[5];
				if (pattern === patterns[1]) return match[1] + match[2] + match[3];
				const beforeNumber = match[1];
				const number = match[2];
				const separators = [
					"+",
					"-",
					"_",
					" "
				];
				for (let i = beforeNumber.length - 1; i >= 0; i--) if (separators.includes(beforeNumber[i])) return beforeNumber.substring(0, i + 1) + number;
				return beforeNumber + number;
			}
			return "";
		}
		/**
		* 分析附件命名模式，返回策略
		*/
		analyzeNaming(attachments, validationPattern) {
			if (!attachments?.length) return {
				strategy: "default",
				prefix: ""
			};
			let regex;
			try {
				regex = new RegExp(validationPattern);
			} catch {
				return {
					strategy: "default",
					prefix: ""
				};
			}
			const validAttachments = [];
			for (const att of attachments) if (regex.test(att.name)) validAttachments.push(att);
			const validCount = validAttachments.length;
			if (attachments.length === 1 || validCount === 0) return {
				strategy: "mailSubject",
				prefix: ""
			};
			if (attachments.length >= 2 && validCount > 1) {
				const commonPrefix = this.findCommonPrefix(validAttachments.map((a) => a.name));
				if (commonPrefix?.length > 0) return {
					strategy: "commonPrefix",
					prefix: commonPrefix
				};
			}
			if (validCount === 1) {
				const extracted = this.extractNamingPattern(validAttachments[0].name);
				if (extracted) return {
					strategy: "extractedPattern",
					prefix: extracted
				};
			}
			return {
				strategy: "mailSubject",
				prefix: ""
			};
		}
		/**
		* 生成文件名（支持智能 auto 模式）
		* @param {object} attachment - 附件对象
		* @param {object[]} [allAttachments] - 所有附件（用于 auto 分析）
		* @param {object} [namingStrategy] - 预计算的命名策略
		*/
		generateFileName(attachment, allAttachments = null, namingStrategy = null) {
			const cfg = this._fileNaming;
			if (!cfg) return this.sanitize(attachment.name, attachment);
			let needsFallback = false;
			if (cfg.validation?.enabled && cfg.validation.pattern) try {
				needsFallback = !new RegExp(cfg.validation.pattern).test(attachment.name);
			} catch {
				needsFallback = false;
			}
			const parts = [];
			const ext = getExtension(attachment.name);
			let baseFileName = getBaseName(attachment.name);
			if (cfg.useCustomPattern && cfg.customPattern) baseFileName = this.parseNamingPattern(cfg.customPattern, attachment);
			else if (needsFallback && cfg.validation.fallbackPattern) {
				if (cfg.validation.fallbackPattern === "auto") return this._generateAutoFileName(attachment, cfg, allAttachments, namingStrategy);
				if (cfg.validation.fallbackPattern === "customTemplate" && cfg.validation.fallbackTemplate) baseFileName = this.parseNamingPattern(cfg.validation.fallbackTemplate, attachment);
				else {
					const prefix = this.generateFallbackPrefix(cfg.validation.fallbackPattern, attachment);
					if (prefix) baseFileName = prefix + "_" + baseFileName;
				}
			}
			if (needsFallback && cfg.validation.fallbackPattern && cfg.validation.fallbackPattern !== "auto" && cfg.validation.fallbackPattern !== "customTemplate") {
				const fallbackPrefix = this.generateFallbackPrefix(cfg.validation.fallbackPattern, attachment);
				if (fallbackPrefix && !baseFileName.startsWith(fallbackPrefix)) parts.push(fallbackPrefix);
			}
			if (cfg.prefix) parts.push(cfg.prefix);
			if (baseFileName) parts.push(baseFileName);
			if (cfg.suffix) parts.push(cfg.suffix);
			if (parts.length > 0) {
				const sep = cfg.separator || "_";
				const finalBase = parts.join(sep);
				return this.sanitize(ext ? `${finalBase}.${ext}` : finalBase, attachment);
			}
			return this.sanitize(attachment.name, attachment);
		}
		/**
		* 智能 auto 模式文件名生成（内部方法）
		*/
		_generateAutoFileName(attachment, cfg, allAttachments, namingStrategy) {
			if (!namingStrategy) {
				if (!allAttachments) {
					const parts = [];
					const ext = getExtension(attachment.name);
					if (attachment.mailSubject) parts.push(attachment.mailSubject);
					if (cfg.prefix) parts.push(cfg.prefix);
					const base = getBaseName(attachment.name);
					if (base) parts.push(base);
					if (cfg.suffix) parts.push(cfg.suffix);
					const sep = cfg.separator || "_";
					const finalBase = parts.join(sep);
					return this.sanitize(ext ? `${finalBase}.${ext}` : finalBase, attachment);
				}
				namingStrategy = this.analyzeNaming(allAttachments, cfg.validation.pattern);
			}
			const nameWithoutExt = attachment.nameWithoutExt || getBaseName(attachment.name);
			const ext = attachment.ext || getExtension(attachment.name);
			const parts = [];
			let baseFileName = "";
			switch (namingStrategy.strategy) {
				case "mailSubject":
					baseFileName = `${attachment.mailSubject}_${nameWithoutExt}`;
					break;
				case "commonPrefix": {
					const remaining = attachment.name.startsWith(namingStrategy.prefix) ? attachment.name.substring(namingStrategy.prefix.length) : attachment.name;
					baseFileName = `${namingStrategy.prefix}${getBaseName(remaining)}`;
					break;
				}
				case "extractedPattern":
					if (nameWithoutExt.startsWith(namingStrategy.prefix)) {
						const suffix = nameWithoutExt.substring(namingStrategy.prefix.length);
						baseFileName = `${namingStrategy.prefix}${suffix}`;
					} else baseFileName = `${namingStrategy.prefix}${nameWithoutExt}`;
					break;
				default:
					baseFileName = `${attachment.mailSubject}_${nameWithoutExt}`;
					break;
			}
			if (cfg.prefix) parts.push(cfg.prefix);
			if (baseFileName) parts.push(baseFileName);
			if (cfg.suffix) parts.push(cfg.suffix);
			const sep = cfg.separator || "_";
			const finalBase = parts.length > 0 ? parts.join(sep) : baseFileName;
			const finalName = ext ? `${finalBase}.${ext}` : finalBase;
			const sanitized = this.sanitize(finalName, attachment);
			if (!this.validateFileName(sanitized)) return this.generateFallbackFileName(sanitized, attachment);
			return sanitized;
		}
	};
	//#endregion
	//#region src/core/download-engine.js
	var DownloadEngine = class {
		constructor(downloader, namingEngine) {
			this.downloader = downloader;
			this.namingEngine = namingEngine;
			this.mainChannel = {
				maxConcurrent: 3,
				active: /* @__PURE__ */ new Set(),
				queue: []
			};
			this.largeChannel = {
				maxConcurrent: 1,
				active: /* @__PURE__ */ new Set(),
				queue: []
			};
			this.stats = {
				totalBytes: 0,
				completedBytes: 0,
				activeFileBytes: 0,
				completedCount: 0,
				totalCount: 0,
				speed: 0,
				startTime: 0
			};
			this.retryCount = 3;
			this.cancelled = false;
			this.onProgress = null;
			this.onComplete = null;
			this._successCount = 0;
			this._failCount = 0;
			this._lastAdjust = 0;
		}
		async downloadAll(attachments, dirHandle, settings) {
			this.cancelled = false;
			this.mainChannel.queue = [];
			this.mainChannel.active = /* @__PURE__ */ new Set();
			this.largeChannel.queue = [];
			this.largeChannel.active = /* @__PURE__ */ new Set();
			this._successCount = 0;
			this._failCount = 0;
			this.stats = {
				totalBytes: attachments.reduce((s, a) => s + (parseInt(a.size) || 0), 0),
				completedBytes: 0,
				activeFileBytes: 0,
				completedCount: 0,
				totalCount: attachments.length,
				speed: 0,
				startTime: Date.now()
			};
			let namingStrategy = null;
			const validation = settings.data.fileNaming?.validation;
			if (validation?.enabled && validation.fallbackPattern === "auto") namingStrategy = this.namingEngine.analyzeNaming(attachments, validation.pattern);
			for (const att of attachments) ((parseInt(att.size) || 0) > 52428800 ? this.largeChannel : this.mainChannel).queue.push({
				attachment: att,
				retries: 0,
				status: "pending",
				namingStrategy
			});
			const results = [];
			await Promise.all([this._runChannel(this.mainChannel, dirHandle, settings, results), this._runChannel(this.largeChannel, dirHandle, settings, results)]);
			this.onComplete?.(results);
			return results;
		}
		cancel() {
			this.cancelled = true;
		}
		async _runChannel(channel, dirHandle, settings, results) {
			const fillSlots = () => {
				while (!this.cancelled && channel.active.size < channel.maxConcurrent) {
					const task = channel.queue.find((t) => t.status === "pending");
					if (!task) break;
					task.status = "processing";
					const promise = this._processTask(task, dirHandle, settings, results, channel).finally(() => {
						channel.active.delete(promise);
						fillSlots();
					});
					channel.active.add(promise);
				}
			};
			fillSlots();
			while (channel.active.size > 0) await Promise.race(channel.active);
		}
		async _processTask(task, dirHandle, settings, results, channel) {
			try {
				const { attachment, namingStrategy } = task;
				const url = await this.downloader.resolveDownloadUrl(attachment);
				const fileName = this.namingEngine.generateFileName(attachment, null, namingStrategy);
				const targetDir = await this._getTargetFolder(dirHandle, attachment, settings);
				const finalName = await this._resolveConflict(targetDir, fileName, settings.data.conflictResolution);
				if (finalName === null) {
					task.status = "completed";
					results.push({
						attachment,
						error: null,
						skipped: true
					});
					this.stats.completedCount++;
					this._emitProgress();
					return;
				}
				const fileHandle = await targetDir.getFileHandle(finalName, { create: true });
				const size = parseInt(attachment.size) || 0;
				if (size > 52428800) await this._downloadLarge(url, fileHandle, attachment);
				else await this._downloadSmall(url, fileHandle, size);
				if (settings.data.downloadBehavior?.verifyDownloads) {
					const file = await fileHandle.getFile();
					if (size > 0 && file.size !== size) console.warn(`[Download] Size mismatch for ${finalName}: expected ${size}, got ${file.size}`);
				}
				task.status = "completed";
				results.push({
					attachment,
					error: null
				});
				this.stats.completedCount++;
				this.stats.completedBytes += size;
				this._successCount++;
				this._adjustConcurrency(channel);
				this._emitProgress();
			} catch (error) {
				if (task.retries < this.retryCount) {
					task.retries++;
					task.status = "pending";
					console.warn(`[Download] Retry ${task.retries}/${this.retryCount} for ${task.attachment.name}:`, error.message);
				} else {
					task.status = "failed";
					results.push({
						attachment: task.attachment,
						error
					});
					this.stats.completedCount++;
					this._failCount++;
					this._adjustConcurrency(channel);
					this._emitProgress();
				}
			}
		}
		async _downloadSmall(url, fileHandle, size) {
			const timeout = Math.max(3e4, Math.ceil(size / 1024) * 1e3);
			const response = await this.downloader._gmRequest(url, "blob", timeout);
			const writable = await fileHandle.createWritable();
			try {
				await writable.write(response.response);
				await writable.close();
			} catch (e) {
				await writable.abort();
				throw e;
			}
		}
		async _downloadLarge(url, fileHandle, attachment) {
			const writable = await fileHandle.createWritable();
			let stallTimer = null;
			return new Promise((resolve, reject) => {
				const resetStall = () => {
					clearTimeout(stallTimer);
					stallTimer = setTimeout(() => {
						writable.abort();
						reject(/* @__PURE__ */ new Error("下载停滞超过30秒"));
					}, STALL_TIMEOUT);
				};
				resetStall();
				GM_xmlhttpRequest({
					method: "GET",
					url,
					responseType: "blob",
					timeout: 0,
					onprogress: (event) => {
						resetStall();
						this.stats.activeFileBytes = event.loaded;
						this._emitProgress();
					},
					onload: async (res) => {
						clearTimeout(stallTimer);
						this.stats.activeFileBytes = 0;
						if (res.status !== 200) {
							await writable.abort();
							return reject(/* @__PURE__ */ new Error(`HTTP ${res.status}`));
						}
						try {
							await writable.write(res.response);
							await writable.close();
							resolve({ size: res.response.size });
						} catch (e) {
							await writable.abort();
							reject(e);
						}
					},
					onerror: (err) => {
						clearTimeout(stallTimer);
						this.stats.activeFileBytes = 0;
						writable.abort();
						reject(err);
					}
				});
			});
		}
		_adjustConcurrency(channel) {
			if (channel === this.largeChannel) return;
			const now = Date.now();
			if (now - this._lastAdjust < 1e4) return;
			this._lastAdjust = now;
			const total = this._successCount + this._failCount;
			if (total < 5) return;
			const failRate = this._failCount / total;
			if (failRate > .3 && channel.maxConcurrent > 2) channel.maxConcurrent--;
			else if (failRate < .1 && channel.maxConcurrent < 5) channel.maxConcurrent++;
		}
		_emitProgress() {
			if (!this.onProgress) return;
			const elapsed = (Date.now() - this.stats.startTime) / 1e3;
			const effective = this.stats.completedBytes + this.stats.activeFileBytes;
			this.stats.speed = elapsed > 0 ? effective / elapsed : 0;
			this.onProgress({ ...this.stats });
		}
		async _getTargetFolder(baseDirHandle, attachment, settings) {
			const structure = settings.data.folderStructure;
			if (structure === "flat") return baseDirHandle;
			let folderName;
			switch (structure) {
				case "subject":
					folderName = attachment.mailSubject || "untitled";
					break;
				case "sender":
					folderName = attachment.senderName || attachment.sender || "unknown";
					break;
				case "date": {
					const d = normalizeDate(attachment.date || attachment.totime);
					folderName = d ? formatDate(d, settings.data.dateFormat) : "unknown-date";
					break;
				}
				case "custom": {
					const template = settings.data.folderNaming?.customTemplate || "{date}/{senderName}";
					const vars = this.namingEngine.buildVariableData(attachment);
					folderName = this.namingEngine.replaceVariables(template, vars);
					break;
				}
				default: return baseDirHandle;
			}
			const parts = folderName.split("/").filter(Boolean);
			let handle = baseDirHandle;
			for (const part of parts) {
				const safePart = sanitizeFileName(part);
				handle = await handle.getDirectoryHandle(safePart, { create: true });
			}
			return handle;
		}
		async _resolveConflict(dirHandle, fileName, resolution) {
			if (resolution === "overwrite") return fileName;
			try {
				await dirHandle.getFileHandle(fileName);
				if (resolution === "skip") return null;
				return this._generateUniqueName(dirHandle, fileName);
			} catch {
				return fileName;
			}
		}
		async _generateUniqueName(dirHandle, fileName) {
			const dotIndex = fileName.lastIndexOf(".");
			const base = dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
			const ext = dotIndex > 0 ? fileName.substring(dotIndex) : "";
			for (let i = 1; i <= 999; i++) {
				const candidate = `${base} (${i})${ext}`;
				try {
					await dirHandle.getFileHandle(candidate);
				} catch {
					return candidate;
				}
			}
			return `${base}_${Date.now()}${ext}`;
		}
	};
	//#endregion
	//#region src/core/file-comparer.js
	/**
	* FileComparer — 文件对比引擎
	* 纯逻辑类，负责本地文件扫描、附件匹配、重复检测
	*/
	var FileComparer = class {
		/**
		* 递归获取目录下所有文件
		* @param {FileSystemDirectoryHandle} dirHandle
		* @param {Function|null} onProgress  回调 (stage, detail, current, total)
		* @param {string} path  当前路径前缀
		*/
		async getLocalFiles(dirHandle, onProgress = null, path = "") {
			if (onProgress) return this._getLocalFilesWithProgress(dirHandle, onProgress, path);
			return this._getLocalFilesSimple(dirHandle, path);
		}
		/** 简单递归，无进度回调 */
		async _getLocalFilesSimple(dirHandle, path = "") {
			const files = [];
			for await (const [name, handle] of dirHandle.entries()) {
				const fullPath = path ? `${path}/${name}` : name;
				if (handle.kind === "file") try {
					const file = await handle.getFile();
					files.push({
						name,
						path: fullPath,
						size: file.size,
						type: getExtension(name),
						lastModified: file.lastModified,
						handle
					});
				} catch (_) {}
				else if (handle.kind === "directory") {
					const subFiles = await this._getLocalFilesSimple(handle, fullPath);
					files.push(...subFiles);
				}
			}
			return files;
		}
		/** 带进度、超时、深度保护的递归扫描 */
		async _getLocalFilesWithProgress(dirHandle, updateProgress, path = "") {
			const files = [];
			let processedCount = 0;
			const visitedPaths = /* @__PURE__ */ new Set();
			const MAX_DEPTH = 10;
			const MAX_FILES = 1e4;
			const MAX_DIR_ENTRIES = 1e3;
			const startTime = Date.now();
			const MAX_TIME = 3e4;
			const _checkTimeout = () => {
				if (Date.now() - startTime > MAX_TIME) throw new Error("文件扫描超时，请选择文件数量较少的文件夹");
			};
			const countFiles = async (handle, currentPath = "", depth = 0) => {
				_checkTimeout();
				if (depth > MAX_DEPTH) return 0;
				const normalizedPath = currentPath.toLowerCase();
				if (visitedPaths.has(normalizedPath)) return 0;
				visitedPaths.add(normalizedPath);
				let count = 0;
				try {
					const entries = [];
					for await (const [name, subHandle] of handle.entries()) {
						entries.push([name, subHandle]);
						if (entries.length > MAX_DIR_ENTRIES) break;
					}
					for (const [name, subHandle] of entries) {
						if (count > MAX_FILES) break;
						if (subHandle.kind === "file") count++;
						else if (subHandle.kind === "directory") try {
							count += await countFiles(subHandle, currentPath ? `${currentPath}/${name}` : name, depth + 1);
						} catch (_) {}
					}
				} catch (_) {}
				visitedPaths.delete(normalizedPath);
				return count;
			};
			updateProgress("正在扫描本地文件", "统计文件数量...", 0, 1);
			const totalCount = await countFiles(dirHandle);
			if (totalCount === 0) {
				updateProgress("扫描完成", "未找到任何文件", 1, 1);
				return files;
			}
			if (totalCount > MAX_FILES) throw new Error(`文件数量过多(${totalCount})，请选择包含文件较少的文件夹(建议少于${MAX_FILES}个)`);
			updateProgress("正在扫描本地文件", `发现 ${totalCount} 个文件，开始处理...`, 0, totalCount);
			visitedPaths.clear();
			const processFiles = async (handle, currentPath = "", depth = 0) => {
				_checkTimeout();
				if (depth > MAX_DEPTH) return;
				const normalizedPath = currentPath.toLowerCase();
				if (visitedPaths.has(normalizedPath)) return;
				visitedPaths.add(normalizedPath);
				try {
					const entries = [];
					for await (const [name, subHandle] of handle.entries()) {
						entries.push([name, subHandle]);
						if (entries.length > MAX_DIR_ENTRIES) break;
					}
					for (const [name, subHandle] of entries) {
						if (files.length >= MAX_FILES) break;
						const fullPath = currentPath ? `${currentPath}/${name}` : name;
						if (subHandle.kind === "file") try {
							const file = await subHandle.getFile();
							files.push({
								name,
								path: fullPath,
								size: file.size,
								type: getExtension(name),
								lastModified: file.lastModified,
								handle: subHandle
							});
							processedCount++;
							if (processedCount % 50 === 0 || processedCount === totalCount) {
								updateProgress("正在扫描本地文件", `已处理 ${processedCount}/${totalCount} 个文件`, processedCount, totalCount);
								await new Promise((r) => setTimeout(r, 10));
							}
						} catch (_) {
							processedCount++;
						}
						else if (subHandle.kind === "directory") try {
							await processFiles(subHandle, fullPath, depth + 1);
						} catch (_) {}
					}
				} catch (_) {}
				visitedPaths.delete(normalizedPath);
			};
			await processFiles(dirHandle, path);
			updateProgress("扫描完成", `成功处理 ${files.length} 个文件`, files.length, totalCount);
			return files;
		}
		/** 标准化文件名，移除常见重命名后缀 */
		normalizeFileName(fileName) {
			return getBaseName(fileName).replace(/\s*\(\d+\)$/, "").replace(/\s*_\d+$/, "").replace(/\s*-\d+$/, "").replace(/\s*副本$/, "").replace(/\s*[Cc]opy$/, "").replace(/\s*复制$/, "").trim().toLowerCase();
		}
		/** 计算两个文件名的相似度 (0-1) */
		calculateSimilarity(name1, name2) {
			const norm1 = this.normalizeFileName(name1);
			const norm2 = this.normalizeFileName(name2);
			if (norm1 === norm2) return .95;
			const distance = this.levenshteinDistance(norm1, norm2);
			const maxLength = Math.max(norm1.length, norm2.length);
			return maxLength === 0 ? 1 : 1 - distance / maxLength;
		}
		/** Levenshtein 编辑距离（滚动数组优化） */
		levenshteinDistance(str1, str2) {
			if (str1 === str2) return 0;
			if (!str1.length) return str2.length;
			if (!str2.length) return str1.length;
			let prev = Array.from({ length: str2.length + 1 }, (_, i) => i);
			let curr = new Array(str2.length + 1);
			for (let i = 1; i <= str1.length; i++) {
				curr[0] = i;
				for (let j = 1; j <= str2.length; j++) curr[j] = str1[i - 1] === str2[j - 1] ? prev[j - 1] : Math.min(prev[j - 1], prev[j], curr[j - 1]) + 1;
				[prev, curr] = [curr, prev];
			}
			return prev[str2.length];
		}
		/** 对比本地文件与邮件附件 */
		compareFiles(localFiles, emailAttachments) {
			const result = {
				missing: [],
				duplicates: [],
				matched: [],
				localOnly: [],
				summary: {
					totalEmail: emailAttachments.length,
					totalLocal: localFiles.length,
					missingCount: 0,
					duplicateCount: 0,
					matchedCount: 0,
					emailTotalSize: 0,
					localTotalSize: 0,
					matchedTotalSize: 0,
					missingTotalSize: 0
				}
			};
			const localFileMap = /* @__PURE__ */ new Map();
			const usedLocalFiles = /* @__PURE__ */ new Set();
			for (const file of localFiles) {
				const normalizedKey = this.normalizeFileName(file.name);
				const sizeTypeKey = `${file.size}_${file.type}`;
				if (!localFileMap.has(normalizedKey)) localFileMap.set(normalizedKey, []);
				if (!localFileMap.has(sizeTypeKey)) localFileMap.set(sizeTypeKey, []);
				localFileMap.get(normalizedKey).push({
					file,
					type: "exact"
				});
				localFileMap.get(sizeTypeKey).push({
					file,
					type: "fuzzy"
				});
			}
			for (const attachment of emailAttachments) {
				const normalizedName = this.normalizeFileName(attachment.name);
				const sizeTypeKey = `${attachment.size}_${attachment.type}`;
				let bestMatch = null;
				const exactCandidates = localFileMap.get(normalizedName) ?? [];
				for (const { file } of exactCandidates.filter((c) => c.type === "exact")) if (!usedLocalFiles.has(file) && file.size === attachment.size && file.type === attachment.type) {
					bestMatch = {
						file,
						type: "exact",
						similarity: 1
					};
					break;
				}
				if (!bestMatch) {
					const fuzzyCandidates = localFileMap.get(sizeTypeKey) ?? [];
					let bestSimilarity = 0;
					for (const { file } of fuzzyCandidates.filter((c) => c.type === "fuzzy")) {
						if (usedLocalFiles.has(file)) continue;
						const similarity = this.calculateSimilarity(attachment.name, file.name);
						if (similarity > .6 && similarity > bestSimilarity) {
							bestMatch = {
								file,
								type: "renamed",
								similarity
							};
							bestSimilarity = similarity;
						}
					}
				}
				if (bestMatch) {
					result.matched.push({
						email: attachment,
						local: bestMatch.file,
						matchType: bestMatch.type,
						similarity: bestMatch.similarity
					});
					usedLocalFiles.add(bestMatch.file);
				} else result.missing.push(attachment);
			}
			const localFileUsage = /* @__PURE__ */ new Map();
			for (const match of result.matched) {
				const key = `${match.local.path}_${match.local.size}`;
				if (!localFileUsage.has(key)) localFileUsage.set(key, []);
				localFileUsage.get(key).push(match);
			}
			for (const matches of localFileUsage.values()) if (matches.length > 1) result.duplicates.push({
				localFile: matches[0].local,
				emailAttachments: matches.map((m) => m.email)
			});
			result.localOnly = localFiles.filter((f) => !usedLocalFiles.has(f));
			result.summary.emailTotalSize = emailAttachments.reduce((s, a) => s + a.size, 0);
			result.summary.localTotalSize = localFiles.reduce((s, f) => s + f.size, 0);
			result.summary.matchedTotalSize = result.matched.reduce((s, m) => s + m.email.size, 0);
			result.summary.missingTotalSize = result.missing.reduce((s, a) => s + a.size, 0);
			Object.assign(result.summary, {
				matchedCount: result.matched.length,
				missingCount: result.missing.length,
				duplicateCount: result.duplicates.length
			});
			return result;
		}
		/** 全面重复检测 */
		detectDuplicates(matchedFiles, localFiles, emailAttachments) {
			const duplicates = [];
			const localToEmails = /* @__PURE__ */ new Map();
			for (const match of matchedFiles) {
				const key = this._generateFileKey(match.local);
				if (!localToEmails.has(key)) localToEmails.set(key, []);
				localToEmails.get(key).push(match);
			}
			for (const [, matches] of localToEmails) if (matches.length > 1) duplicates.push({
				type: "oneToMany",
				localFile: matches[0].local,
				emailAttachments: matches.map((m) => m.email),
				reason: "一个本地文件匹配多个邮件附件",
				severity: "high"
			});
			const emailToLocals = /* @__PURE__ */ new Map();
			for (const match of matchedFiles) {
				const key = this._generateEmailKey(match.email);
				if (!emailToLocals.has(key)) emailToLocals.set(key, []);
				emailToLocals.get(key).push(match);
			}
			for (const [, matches] of emailToLocals) if (matches.length > 1) duplicates.push({
				type: "manyToOne",
				emailAttachment: matches[0].email,
				localFiles: matches.map((m) => m.local),
				reason: "多个本地文件匹配同一个邮件附件",
				severity: "medium"
			});
			for (const dup of this.findLocalDuplicates(localFiles)) duplicates.push({
				type: "localDuplicate",
				localFiles: dup.files,
				reason: dup.reason,
				severity: "low"
			});
			for (const dup of this.findEmailDuplicates(emailAttachments)) duplicates.push({
				type: "emailDuplicate",
				emailAttachments: dup.files,
				reason: dup.reason,
				severity: "info"
			});
			return duplicates;
		}
		/** 查找本地文件中的重复 */
		findLocalDuplicates(localFiles) {
			const duplicates = [];
			const sizeGroups = /* @__PURE__ */ new Map();
			for (const file of localFiles) {
				if (!sizeGroups.has(file.size)) sizeGroups.set(file.size, []);
				sizeGroups.get(file.size).push(file);
			}
			for (const [size, files] of sizeGroups) {
				if (files.length <= 1) continue;
				const nameGroups = /* @__PURE__ */ new Map();
				for (const file of files) {
					const norm = this.normalizeFileName(file.name);
					if (!nameGroups.has(norm)) nameGroups.set(norm, []);
					nameGroups.get(norm).push(file);
				}
				for (const [, sameNameFiles] of nameGroups) if (sameNameFiles.length > 1) duplicates.push({
					files: sameNameFiles,
					reason: `相同大小(${formatFileSize(size)})和相似文件名的文件`
				});
				if (nameGroups.size > 1 && size > 1024) {
					const allFiles = Array.from(nameGroups.values()).flat();
					const similarFiles = [];
					for (let i = 0; i < allFiles.length; i++) for (let j = i + 1; j < allFiles.length; j++) if (this.calculateSimilarity(allFiles[i].name, allFiles[j].name) > .7) {
						if (!similarFiles.includes(allFiles[i])) similarFiles.push(allFiles[i]);
						if (!similarFiles.includes(allFiles[j])) similarFiles.push(allFiles[j]);
					}
					if (similarFiles.length > 1) duplicates.push({
						files: similarFiles,
						reason: `相同大小(${formatFileSize(size)})和相似文件名的可疑重复文件`
					});
				}
			}
			return duplicates;
		}
		/** 查找邮件附件中的重复 */
		findEmailDuplicates(emailAttachments) {
			const duplicates = [];
			const groups = /* @__PURE__ */ new Map();
			for (const att of emailAttachments) {
				const key = `${this.normalizeFileName(att.name)}_${att.size}`;
				if (!groups.has(key)) groups.set(key, []);
				groups.get(key).push(att);
			}
			for (const [, attachments] of groups) if (attachments.length > 1) {
				const uniqueEmails = new Set(attachments.map((a) => a.mailSubject || a.mailId));
				if (uniqueEmails.size > 1) duplicates.push({
					files: attachments,
					reason: `相同文件在${uniqueEmails.size}封不同邮件中出现`
				});
			}
			return duplicates;
		}
		_generateFileKey(file) {
			return `${this.normalizeFileName(file.name)}_${file.size}_${file.lastModified ?? 0}`;
		}
		_generateEmailKey(attachment) {
			return `${this.normalizeFileName(attachment.name)}_${attachment.size}`;
		}
	};
	//#endregion
	//#region src/utils/dom.js
	function el(tag, opts = {}, ...children) {
		const elem = document.createElement(tag);
		if (opts.className) elem.className = opts.className;
		if (opts.id) elem.id = opts.id;
		if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) elem.setAttribute(k, v);
		if (opts.events) for (const [k, v] of Object.entries(opts.events)) elem.addEventListener(k, v);
		const allChildren = [...opts.children || [], ...children];
		for (const child of allChildren) if (typeof child === "string") elem.appendChild(document.createTextNode(child));
		else if (child instanceof HTMLElement) elem.appendChild(child);
		return elem;
	}
	function qs(selector, parent = document) {
		return parent.querySelector(selector);
	}
	function qsa(selector, parent = document) {
		return [...parent.querySelectorAll(selector)];
	}
	function remove(selectorOrElement) {
		if (typeof selectorOrElement === "string") qsa(selectorOrElement).forEach((el) => el.remove());
		else if (selectorOrElement?.remove) selectorOrElement.remove();
	}
	//#endregion
	//#region src/ui/panel.js
	var Panel = class {
		constructor(manager) {
			this.manager = manager;
			this.overlay = null;
			this.window = null;
			this.isMinimized = false;
			this.isMaximized = false;
			this.dragState = {
				isDragging: false,
				startX: 0,
				startY: 0,
				startLeft: 0,
				startTop: 0
			};
			this._keyHandler = null;
			this._moveHandler = null;
			this._upHandler = null;
		}
		create() {
			this.overlay = el("div", {
				className: "am-overlay",
				id: "attachment-manager-overlay",
				events: { click: () => this.manager.close() }
			});
			this.window = el("div", {
				className: "am-window",
				id: "am-window"
			});
			this.window.innerHTML = this._buildWindowHTML();
			document.body.appendChild(this.overlay);
			document.body.appendChild(this.window);
			requestAnimationFrame(() => {
				this.overlay.classList.add("show");
				this.window.classList.add("show");
			});
			this._setupDrag();
			this._setupControls();
			this._setupKeyboard();
			return {
				contentArea: qs("#attachment-content-area", this.window),
				progressArea: qs("#attachment-progress-area", this.window)
			};
		}
		destroy() {
			if (this._keyHandler) {
				document.removeEventListener("keydown", this._keyHandler);
				this._keyHandler = null;
			}
			if (this._moveHandler) {
				document.removeEventListener("mousemove", this._moveHandler);
				this._moveHandler = null;
			}
			if (this._upHandler) {
				document.removeEventListener("mouseup", this._upHandler);
				this._upHandler = null;
			}
			this.overlay?.remove();
			this.window?.remove();
			this.overlay = null;
			this.window = null;
			this.isMinimized = false;
			this.isMaximized = false;
		}
		_buildWindowHTML() {
			return `
      <div class="am-window-header" id="am-window-header">
        <div style="display:flex;align-items:center;gap:var(--am-space-2)">
          <div class="am-window-dot am-window-dot--close" id="am-btn-close" title="关闭"></div>
          <div class="am-window-dot am-window-dot--minimize" id="am-btn-minimize" title="最小化"></div>
          <div class="am-window-dot am-window-dot--maximize" id="am-btn-maximize" title="最大化"></div>
        </div>
        <div style="font-size:14px;font-weight:600;color:var(--am-text)">${qs(".toolbar-folder-name")?.textContent?.trim() || "附件管理器"}</div>
        <div id="attachment-count-info" style="font-size:12px;color:var(--am-text-tertiary)">加载中...</div>
      </div>
      <div class="am-window-content" style="position:relative">
        <div id="attachment-content-area" class="am-scroll" style="flex:1;overflow-y:auto"></div>
        <div id="attachment-progress-area" style="display:none"></div>
      </div>
    `;
		}
		_setupDrag() {
			const header = qs("#am-window-header", this.window);
			if (!header) return;
			header.addEventListener("mousedown", (e) => {
				if (e.target.closest(".am-window-dot")) return;
				if (this.isMaximized) return;
				this.dragState.isDragging = true;
				this.dragState.startX = e.clientX;
				this.dragState.startY = e.clientY;
				const rect = this.window.getBoundingClientRect();
				this.dragState.startLeft = rect.left;
				this.dragState.startTop = rect.top;
			});
			this._moveHandler = (e) => {
				if (!this.dragState.isDragging) return;
				const dx = e.clientX - this.dragState.startX;
				const dy = e.clientY - this.dragState.startY;
				this.window.style.left = `${this.dragState.startLeft + dx}px`;
				this.window.style.top = `${this.dragState.startTop + dy}px`;
				this.window.style.transform = "none";
			};
			document.addEventListener("mousemove", this._moveHandler);
			this._upHandler = () => {
				this.dragState.isDragging = false;
			};
			document.addEventListener("mouseup", this._upHandler);
		}
		_setupControls() {
			qs("#am-btn-close", this.window)?.addEventListener("click", () => this.manager.close());
			qs("#am-btn-minimize", this.window)?.addEventListener("click", () => {
				this.isMinimized = !this.isMinimized;
				this.window.classList.toggle("minimized", this.isMinimized);
			});
			qs("#am-btn-maximize", this.window)?.addEventListener("click", () => {
				this.isMaximized = !this.isMaximized;
				this.window.classList.toggle("maximized", this.isMaximized);
			});
		}
		_setupKeyboard() {
			this._keyHandler = (e) => {
				if (e.key === "Escape") this.manager.close();
			};
			document.addEventListener("keydown", this._keyHandler);
		}
	};
	//#endregion
	//#region src/html.js
	/**
	* Tagged template literal，自动对插值做 HTML 转义。
	* 用法: container.innerHTML = html`<div>${unsafeString}</div>`;
	*/
	var ESC_MAP = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	};
	var ESC_RE = /[&<>"']/g;
	function escapeHtml(str) {
		return str.replace(ESC_RE, (ch) => ESC_MAP[ch]);
	}
	/**
	* Tagged template literal that auto-escapes interpolated values.
	* Values wrapped in trusted() bypass escaping.
	*/
	function html(strings, ...values) {
		return strings.reduce((out, str, i) => {
			if (i >= values.length) return out + str;
			const val = values[i];
			const escaped = val && val.__trusted ? val.toString() : escapeHtml(String(val ?? ""));
			return out + str + escaped;
		}, "");
	}
	/**
	* 标记一段 HTML 为"已信任"，跳过转义。
	* 仅用于代码中定义的常量（如 SVG 图标），绝不用于用户数据。
	*/
	function trusted(rawHtml) {
		return {
			__trusted: true,
			toString: () => rawHtml
		};
	}
	//#endregion
	//#region src/ui/bento.js
	var BentoLayout = class {
		constructor(manager) {
			this.manager = manager;
		}
		/**
		* Render the full bento layout.
		* @param {HTMLElement} container - #attachment-content-area
		* @param {Object[]} attachments - all attachments
		* @param {{ mailCount: number, attachmentCount: number, totalSize: number, skippedCount: number }} stats
		*/
		render(container, attachments, stats) {
			container.innerHTML = "";
			const bento = el("div", { className: "am-bento am-scroll" });
			bento.appendChild(this._createHeaderCard(stats));
			bento.appendChild(this._createStatsRow(stats, attachments));
			const toolbarContainer = el("div");
			this.manager.toolbar.render(toolbarContainer);
			bento.appendChild(toolbarContainer);
			const gridContainer = el("div", { id: "attachment-grid-area" });
			const filtered = this.manager.toolbar.getFilteredAttachments(attachments);
			this.manager.grid.render(gridContainer, filtered);
			bento.appendChild(gridContainer);
			container.appendChild(bento);
		}
		_createHeaderCard(stats) {
			const card = el("div", { className: "am-bento-header" });
			card.innerHTML = html`
      <div style="display:flex;align-items:center;gap:var(--am-space-4)">
        <button class="am-btn am-btn--icon" id="am-back-btn" title="关闭">
          ${trusted(`<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>`)}
        </button>
        <div>
          <div class="am-bento-title" style="font-size:20px">${String(stats.mailCount)} 封邮件的附件</div>
          <div style="font-size:13px;color:var(--am-text-secondary)">
            ${String(stats.attachmentCount)} 个附件 · ${formatFileSize(stats.totalSize)}${trusted(stats.skippedCount > 0 ? ` · <span style="color:var(--am-warning)">${stats.skippedCount} 个已跳过</span>` : "")}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:var(--am-space-3)">
        <button class="am-btn am-btn--ghost" id="am-btn-settings" title="设置">
          ${trusted(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>`)}
        </button>
        <button class="am-btn am-btn--ghost" id="am-btn-compare" title="对比本地">
          ${trusted(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
          </svg>`)}
        </button>
        <button class="am-btn am-btn--primary" id="am-btn-download-all">
          ${trusted(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>`)}
          全部下载
        </button>
      </div>
    `;
			qs("#am-back-btn", card)?.addEventListener("click", () => this.manager.close());
			qs("#am-btn-settings", card)?.addEventListener("click", () => this.manager.showSettings());
			qs("#am-btn-compare", card)?.addEventListener("click", () => this.manager.showCompare());
			qs("#am-btn-download-all", card)?.addEventListener("click", () => this.manager.downloadAll());
			return card;
		}
		_createStatsRow(stats, attachments) {
			const typeCounts = {};
			for (const att of attachments) {
				const ext = getExtension(att.name);
				let typeName = "其他";
				for (const [name, exts] of Object.entries(FILE_TYPES)) if (exts.includes(ext)) {
					typeName = name;
					break;
				}
				typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
			}
			const row = el("div", { className: "am-stat-grid" });
			const items = [
				{
					label: "邮件数",
					value: String(stats.mailCount)
				},
				{
					label: "附件数",
					value: String(stats.attachmentCount)
				},
				{
					label: "总大小",
					value: formatFileSize(stats.totalSize)
				}
			];
			for (const [name, count] of Object.entries(typeCounts)) items.push({
				label: name,
				value: String(count)
			});
			for (const item of items) {
				const stat = el("div", { className: "am-stat-item" });
				stat.innerHTML = html`
        <div class="am-stat-number">${item.value}</div>
        <div class="am-stat-label">${item.label}</div>
      `;
				row.appendChild(stat);
			}
			return row;
		}
		updateStats(stats) {
			const info = qs("#attachment-count-info");
			if (info) info.textContent = `${stats.mailCount} 封邮件 · ${stats.attachmentCount} 个附件`;
		}
	};
	//#endregion
	//#region src/ui/attachment-grid.js
	var AttachmentGrid = class {
		constructor(manager) {
			this.manager = manager;
			this.container = null;
		}
		/** Render attachments into container */
		render(container, attachments) {
			this.container = container;
			if (attachments.length === 0) {
				this.showEmpty(container);
				return;
			}
			container.innerHTML = "";
			const grid = document.createElement("div");
			grid.className = "am-grid";
			for (const att of attachments) grid.appendChild(this._createCard(att));
			container.appendChild(grid);
		}
		showLoading(container, message = "加载中...") {
			container.innerHTML = html`<div class="am-state am-state--loading">${message}</div>`;
		}
		showEmpty(container) {
			container.innerHTML = "<div class=\"am-state am-state--empty\">暂无附件</div>";
		}
		showError(container, message) {
			container.innerHTML = html`<div class="am-state am-state--error">${message}</div>`;
		}
		/** Create a single attachment card element */
		_createCard(attachment) {
			const card = document.createElement("div");
			card.className = "am-card am-card--attachment am-card--hover";
			const icon = this._getFileIcon(attachment.name);
			const thumbUrl = this._getThumbnailUrl(attachment);
			const size = formatFileSize(parseInt(attachment.size) || 0);
			const date = normalizeDate(attachment.date || attachment.totime);
			const dateStr = date ? formatDate(date, "MM-DD") : "";
			card.innerHTML = html`
      <input type="checkbox" class="am-checkbox"
        style="position:absolute;top:var(--am-space-2);left:var(--am-space-2);z-index:10"
        ${trusted(this.manager.selectedAttachments.has(attachment.fileid || attachment.name) ? "checked" : "")}
        data-attachment-id="${attachment.fileid || attachment.name}">
      <div class="am-card-preview">
        ${trusted(thumbUrl ? `<img src="${thumbUrl}" alt="" style="width:100%;height:100%;object-fit:cover"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
             <span style="display:none;font-size:24px;width:100%;height:100%;align-items:center;justify-content:center">${icon}</span>` : `<span style="font-size:24px">${icon}</span>`)}
      </div>
      <div style="padding:var(--am-space-2);display:flex;flex-direction:column;gap:2px">
        <div class="am-card-title" title="${attachment.name}">${attachment.name}</div>
        <div class="am-card-meta">${size}${trusted(dateStr ? ` · ${dateStr}` : "")}</div>
      </div>
    `;
			const checkbox = qs("input[type=\"checkbox\"]", card);
			checkbox?.addEventListener("change", (e) => {
				e.stopPropagation();
				const id = attachment.fileid || attachment.name;
				if (e.target.checked) this.manager.selectedAttachments.add(id);
				else this.manager.selectedAttachments.delete(id);
			});
			card.addEventListener("click", (e) => {
				if (e.target === checkbox) return;
				checkbox.checked = !checkbox.checked;
				checkbox.dispatchEvent(new Event("change"));
			});
			return card;
		}
		_getFileIcon(filename) {
			return FILE_ICONS[getExtension(filename)] || "📎";
		}
		_getThumbnailUrl(attachment) {
			if (!attachment?.fileid || !attachment?.mailId) return null;
			const ext = getExtension(attachment.name);
			if (![
				"jpg",
				"jpeg",
				"png",
				"gif",
				"bmp",
				"webp",
				"pdf",
				"doc",
				"docx",
				"ppt",
				"pptx",
				"xls",
				"xlsx"
			].includes(ext)) return null;
			const sid = this.manager.downloader?.sid || "";
			if (!sid) return null;
			return `${MAIL_CONSTANTS.BASE_URL}${MAIL_CONSTANTS.API_ENDPOINTS.ATTACH_THUMBNAIL}?mailid=${attachment.mailId}&fileid=${attachment.fileid}&name=${encodeURIComponent(attachment.name)}&sid=${sid}`;
		}
	};
	//#endregion
	//#region src/ui/toolbar.js
	/**
	* Filter / Sort / Search / Batch-action toolbar.
	* Rendered inside the panel's content area, above the attachment grid.
	*/
	var Toolbar = class {
		constructor(manager) {
			this.manager = manager;
			this.currentFilter = "all";
			this.currentSort = "date";
			this.searchKeyword = "";
			this._sortMenu = null;
			this._closeSortMenu = null;
		}
		/** Build toolbar DOM and append to `container`. */
		render(container) {
			const wrapper = el("div", { className: "am-toolbar" });
			wrapper.innerHTML = this._buildHTML();
			container.appendChild(wrapper);
			this._setupEvents(wrapper);
		}
		/**
		* Apply current filter + search + sort to an attachments array.
		* Returns a **new** array — never mutates the input.
		*/
		getFilteredAttachments(attachments) {
			if (!Array.isArray(attachments)) return [];
			const keyword = this.searchKeyword.toLowerCase();
			let result = attachments.filter((att) => {
				if (!att) return false;
				if (this.currentFilter !== "all") {
					const type = this._getFileType(att.name);
					switch (this.currentFilter) {
						case "images":
							if (type !== "图片") return false;
							break;
						case "documents":
							if (![
								"文档",
								"表格",
								"演示"
							].includes(type)) return false;
							break;
						case "archives":
							if (type !== "压缩包") return false;
							break;
						case "media":
							if (!["音频", "视频"].includes(type)) return false;
							break;
						case "others":
							if ([
								"图片",
								"文档",
								"表格",
								"演示",
								"压缩包",
								"音频",
								"视频"
							].includes(type)) return false;
							break;
					}
				}
				if (keyword) {
					const name = (att.name || "").toLowerCase();
					const subject = (att.mailSubject || "").toLowerCase();
					const sender = (att.senderName || "").toLowerCase();
					if (!name.includes(keyword) && !subject.includes(keyword) && !sender.includes(keyword)) return false;
				}
				return true;
			});
			result = this._sort(result);
			return result;
		}
		/** Destroy any floating menus this toolbar owns. */
		destroy() {
			this._removeSortMenu();
		}
		_buildHTML() {
			return `
      <div class="am-toolbar__filters am-tabs">
        ${[
				{
					key: "all",
					label: "全部"
				},
				{
					key: "images",
					label: "图片"
				},
				{
					key: "documents",
					label: "文档"
				},
				{
					key: "archives",
					label: "压缩包"
				},
				{
					key: "media",
					label: "音视频"
				},
				{
					key: "others",
					label: "其他"
				}
			].map((f) => {
				return `<button class="${f.key === this.currentFilter ? " am-tab active" : " am-tab"}" data-filter="${f.key}">${f.label}</button>`;
			}).join("")}
      </div>
      <div class="am-toolbar__actions">
        <input class="am-input am-toolbar__search" type="text"
               placeholder="搜索文件名、邮件主题、发件人…"
               data-role="search" />
        <button class="am-btn am-btn--ghost am-btn--sm" data-role="sort">${html`${{
				date: "按日期",
				size: "按大小",
				name: "按名称"
			}[this.currentSort] || "排序"}`} ▾</button>
        <button class="am-btn am-btn--sm" data-role="download-selected">下载选中</button>
        <button class="am-btn am-btn--primary am-btn--sm" data-role="download-all">全部下载</button>
      </div>
    `;
		}
		_setupEvents(wrapper) {
			qsa("[data-filter]", wrapper).forEach((btn) => {
				btn.addEventListener("click", () => {
					this.currentFilter = btn.dataset.filter;
					qsa("[data-filter]", wrapper).forEach((b) => b.classList.remove("active"));
					btn.classList.add("active");
					this._notify();
				});
			});
			const searchInput = qs("[data-role=\"search\"]", wrapper);
			if (searchInput) {
				let timer = null;
				searchInput.addEventListener("input", () => {
					clearTimeout(timer);
					timer = setTimeout(() => {
						this.searchKeyword = searchInput.value.trim();
						this._notify();
					}, 200);
				});
			}
			const sortBtn = qs("[data-role=\"sort\"]", wrapper);
			if (sortBtn) sortBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this._showSortMenu(sortBtn, wrapper);
			});
			const dlSelected = qs("[data-role=\"download-selected\"]", wrapper);
			if (dlSelected) dlSelected.addEventListener("click", () => this.manager.downloadSelected?.());
			const dlAll = qs("[data-role=\"download-all\"]", wrapper);
			if (dlAll) dlAll.addEventListener("click", () => this.manager.downloadAll?.());
		}
		_notify() {
			this.manager.onFilterChange?.();
		}
		_showSortMenu(button, wrapper) {
			this._removeSortMenu();
			const rect = button.getBoundingClientRect();
			const menu = el("div", { className: "am-menu" });
			menu.style.top = rect.bottom + 4 + "px";
			menu.style.left = rect.left + "px";
			[
				{
					value: "date",
					label: "按日期"
				},
				{
					value: "size",
					label: "按大小"
				},
				{
					value: "name",
					label: "按名称"
				}
			].forEach((opt) => {
				const item = el("div", {
					className: "am-menu-item",
					events: { click: () => {
						this.currentSort = opt.value;
						button.textContent = opt.label + " ▾";
						this._removeSortMenu();
						this._notify();
					} }
				}, opt.label);
				if (this.currentSort === opt.value) {
					item.style.background = "var(--am-bg-muted)";
					item.style.fontWeight = "600";
				}
				menu.appendChild(item);
			});
			document.body.appendChild(menu);
			this._sortMenu = menu;
			this._closeSortMenu = (e) => {
				if (!menu.contains(e.target) && e.target !== button) this._removeSortMenu();
			};
			setTimeout(() => document.addEventListener("click", this._closeSortMenu), 0);
		}
		_removeSortMenu() {
			if (this._sortMenu) {
				this._sortMenu.remove();
				this._sortMenu = null;
			}
			if (this._closeSortMenu) {
				document.removeEventListener("click", this._closeSortMenu);
				this._closeSortMenu = null;
			}
		}
		/** Classify a filename into a Chinese type label via FILE_TYPES. */
		_getFileType(filename) {
			const ext = getExtension(filename);
			for (const [type, extensions] of Object.entries(FILE_TYPES)) if (extensions.includes(ext)) return type;
			return "其他";
		}
		/** Sort an array of attachments in-place and return it. */
		_sort(attachments) {
			return [...attachments].sort((a, b) => {
				switch (this.currentSort) {
					case "name": return (a.name || "").localeCompare(b.name || "");
					case "size": return (b.size || 0) - (a.size || 0);
					default: {
						const da = a.date || a.totime || 0;
						return (b.date || b.totime || 0) - da;
					}
				}
			});
		}
	};
	//#endregion
	//#region src/ui/toast.js
	function showToast(message, type = "info", duration = 3e3) {
		const icon = TOAST_ICONS[type] || TOAST_ICONS.info;
		const toast = document.createElement("div");
		toast.className = `am-toast am-toast--${type}`;
		toast.innerHTML = html`${trusted(icon)} ${message}`;
		document.body.appendChild(toast);
		requestAnimationFrame(() => toast.classList.add("show"));
		setTimeout(() => {
			toast.classList.remove("show");
			setTimeout(() => toast.remove(), 300);
		}, duration);
	}
	//#endregion
	//#region src/ui/dialogs.js
	var Dialogs = class {
		constructor(manager) {
			this.manager = manager;
		}
		async showSettings() {
			const overlay = this._createOverlay();
			const dialog = el("div", { className: "am-dialog" });
			dialog.innerHTML = `
      <div class="am-dialog-header" style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:18px;font-weight:600">下载设置</span>
        <button class="am-btn am-btn--icon" id="settings-close">\u00d7</button>
      </div>
      <div class="am-tabs" id="settings-tabs">
        <div class="am-tab active" data-tab="basic">基础设置</div>
        <div class="am-tab" data-tab="naming">文件命名</div>
        <div class="am-tab" data-tab="advanced">高级设置</div>
      </div>
      <div class="am-dialog-body am-scroll" id="settings-body"></div>
      <div class="am-dialog-footer">
        <button class="am-btn am-btn--ghost" id="settings-reset">恢复默认</button>
        <button class="am-btn am-btn--primary" id="settings-save">保存设置</button>
      </div>
    `;
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);
			this._setupTabs(dialog);
			this._renderSettingsTab(dialog, "basic");
			qs("#settings-close", dialog).addEventListener("click", () => overlay.remove());
			qs("#settings-save", dialog).addEventListener("click", () => {
				this._saveSettings(dialog);
				showToast("设置已保存", "success");
				overlay.remove();
			});
			qs("#settings-reset", dialog).addEventListener("click", () => {
				this.manager.settings.reset();
				this._renderSettingsTab(dialog, "basic");
				showToast("已恢复默认设置", "info");
			});
			overlay.addEventListener("click", (e) => {
				if (e.target === overlay) overlay.remove();
			});
		}
		_setupTabs(dialog) {
			qsa(".am-tab", dialog).forEach((tab) => {
				tab.addEventListener("click", () => {
					qsa(".am-tab", dialog).forEach((t) => t.classList.remove("active"));
					tab.classList.add("active");
					this._renderSettingsTab(dialog, tab.dataset.tab);
				});
			});
		}
		_renderSettingsTab(dialog, tabName) {
			const body = qs("#settings-body", dialog);
			const s = this.manager.settings.data;
			switch (tabName) {
				case "basic":
					body.innerHTML = `
          <div class="am-form-section">
            <div class="am-form-section-title">文件夹结构</div>
            <div class="am-form-item">
              <select class="am-select" id="opt-folder-structure">
                <option value="flat" ${s.folderStructure === "flat" ? "selected" : ""}>平铺（所有文件放在同一目录）</option>
                <option value="subject" ${s.folderStructure === "subject" ? "selected" : ""}>按邮件主题分文件夹</option>
                <option value="sender" ${s.folderStructure === "sender" ? "selected" : ""}>按发件人分文件夹</option>
                <option value="date" ${s.folderStructure === "date" ? "selected" : ""}>按日期分文件夹</option>
                <option value="custom" ${s.folderStructure === "custom" ? "selected" : ""}>自定义模板</option>
              </select>
            </div>
            <div class="am-form-item" id="custom-folder-group" style="display:${s.folderStructure === "custom" ? "block" : "none"}">
              <label class="am-form-label">自定义文件夹模板</label>
              <input class="am-input" id="opt-folder-template" value="${html`${s.folderNaming?.customTemplate || ""}`}">
              <div class="am-form-desc">可用变量: {date}, {senderName}, {subject}</div>
            </div>
          </div>
          <div class="am-form-section">
            <div class="am-form-section-title">冲突处理</div>
            <div class="am-form-item">
              <select class="am-select" id="opt-conflict">
                <option value="rename" ${s.conflictResolution === "rename" ? "selected" : ""}>自动重命名</option>
                <option value="skip" ${s.conflictResolution === "skip" ? "selected" : ""}>跳过</option>
                <option value="overwrite" ${s.conflictResolution === "overwrite" ? "selected" : ""}>覆盖</option>
              </select>
            </div>
          </div>
          <div class="am-form-section">
            <div class="am-form-section-title">下载行为</div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-verify" ${s.downloadBehavior?.verifyDownloads ? "checked" : ""}> <label>下载后验证文件完整性</label></div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-notify" ${s.downloadBehavior?.notifyOnComplete ? "checked" : ""}> <label>下载完成后通知</label></div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-auto-compare" ${s.downloadBehavior?.autoCompareAfterDownload ? "checked" : ""}> <label>下载后自动对比本地文件</label></div>
            <div class="am-form-item">
              <label class="am-form-label">并发下载数</label>
              <select class="am-select" id="opt-concurrent">
                <option value="auto" ${s.downloadBehavior?.concurrentDownloads === "auto" ? "selected" : ""}>自动</option>
                <option value="1" ${s.downloadBehavior?.concurrentDownloads === "1" ? "selected" : ""}>1</option>
                <option value="2" ${s.downloadBehavior?.concurrentDownloads === "2" ? "selected" : ""}>2</option>
                <option value="3" ${s.downloadBehavior?.concurrentDownloads === "3" ? "selected" : ""}>3</option>
                <option value="5" ${s.downloadBehavior?.concurrentDownloads === "5" ? "selected" : ""}>5</option>
              </select>
            </div>
          </div>
        `;
					qs("#opt-folder-structure", body)?.addEventListener("change", (e) => {
						const group = qs("#custom-folder-group", body);
						if (group) group.style.display = e.target.value === "custom" ? "block" : "none";
					});
					break;
				case "naming":
					body.innerHTML = `
          <div class="am-form-section">
            <div class="am-form-section-title">命名模式</div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-custom-pattern" ${s.fileNaming?.useCustomPattern ? "checked" : ""}> <label>使用自定义命名模板</label></div>
            <div class="am-form-item" id="pattern-group" style="display:${s.fileNaming?.useCustomPattern ? "block" : "none"}">
              <input class="am-input" id="opt-pattern" value="${html`${s.fileNaming?.customPattern || ""}`}" placeholder="{date}_{subject}_{fileName}">
              <div class="am-form-desc">可用变量: {date}, {subject}, {fileName}, {senderName}, {senderEmail}, {mailId}, {fileIndex}</div>
            </div>
            <div class="am-form-row">
              <div class="am-form-item">
                <label class="am-form-label">前缀</label>
                <input class="am-input" id="opt-prefix" value="${html`${s.fileNaming?.prefix || ""}`}">
              </div>
              <div class="am-form-item">
                <label class="am-form-label">后缀</label>
                <input class="am-input" id="opt-suffix" value="${html`${s.fileNaming?.suffix || ""}`}">
              </div>
            </div>
            <div class="am-form-item">
              <label class="am-form-label">分隔符</label>
              <input class="am-input" id="opt-separator" value="${html`${s.fileNaming?.separator || "_"}`}" style="width:80px">
            </div>
          </div>
          <div class="am-form-section">
            <div class="am-form-section-title">文件名验证</div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-validation" ${s.fileNaming?.validation?.enabled ? "checked" : ""}> <label>启用文件名正则验证</label></div>
            <div class="am-form-item">
              <label class="am-form-label">验证正则</label>
              <input class="am-input" id="opt-validation-pattern" value="${html`${s.fileNaming?.validation?.pattern || ""}`}">
            </div>
            <div class="am-form-item">
              <label class="am-form-label">验证失败回退策略</label>
              <select class="am-select" id="opt-fallback">
                <option value="auto" ${s.fileNaming?.validation?.fallbackPattern === "auto" ? "selected" : ""}>自动分析</option>
                <option value="mailSubject" ${s.fileNaming?.validation?.fallbackPattern === "mailSubject" ? "selected" : ""}>使用邮件主题</option>
                <option value="senderEmail" ${s.fileNaming?.validation?.fallbackPattern === "senderEmail" ? "selected" : ""}>使用发件人</option>
                <option value="customTemplate" ${s.fileNaming?.validation?.fallbackPattern === "customTemplate" ? "selected" : ""}>自定义模板</option>
              </select>
            </div>
          </div>
        `;
					qs("#opt-custom-pattern", body)?.addEventListener("change", (e) => {
						const group = qs("#pattern-group", body);
						if (group) group.style.display = e.target.checked ? "block" : "none";
					});
					break;
				case "advanced":
					body.innerHTML = `
          <div class="am-form-section">
            <div class="am-form-section-title">内容替换</div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-replacement" ${s.contentReplacement?.enabled ? "checked" : ""}> <label>启用文件名内容替换</label></div>
            <div class="am-form-desc">对文件名中的特定内容进行替换</div>
          </div>
          <div class="am-form-section">
            <div class="am-form-section-title">智能分组</div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-smart-group" ${s.smartGrouping?.enabled ? "checked" : ""}> <label>启用智能分组</label></div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-group-type" ${s.smartGrouping?.groupByType ? "checked" : ""}> <label>按文件类型分组</label></div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-group-date" ${s.smartGrouping?.groupByDate ? "checked" : ""}> <label>按日期分组</label></div>
          </div>
        `;
					break;
			}
		}
		_saveSettings(dialog) {
			const s = this.manager.settings.data;
			const folderStructure = qs("#opt-folder-structure", dialog)?.value;
			if (folderStructure) s.folderStructure = folderStructure;
			const folderTemplate = qs("#opt-folder-template", dialog)?.value;
			if (folderTemplate !== void 0) s.folderNaming.customTemplate = folderTemplate;
			const conflict = qs("#opt-conflict", dialog)?.value;
			if (conflict) s.conflictResolution = conflict;
			const verify = qs("#opt-verify", dialog);
			if (verify) s.downloadBehavior.verifyDownloads = verify.checked;
			const notify = qs("#opt-notify", dialog);
			if (notify) s.downloadBehavior.notifyOnComplete = notify.checked;
			const autoCompare = qs("#opt-auto-compare", dialog);
			if (autoCompare) s.downloadBehavior.autoCompareAfterDownload = autoCompare.checked;
			const concurrent = qs("#opt-concurrent", dialog)?.value;
			if (concurrent) s.downloadBehavior.concurrentDownloads = concurrent;
			const customPattern = qs("#opt-custom-pattern", dialog);
			if (customPattern) s.fileNaming.useCustomPattern = customPattern.checked;
			const pattern = qs("#opt-pattern", dialog)?.value;
			if (pattern !== void 0) s.fileNaming.customPattern = pattern;
			const prefix = qs("#opt-prefix", dialog)?.value;
			if (prefix !== void 0) s.fileNaming.prefix = prefix;
			const suffix = qs("#opt-suffix", dialog)?.value;
			if (suffix !== void 0) s.fileNaming.suffix = suffix;
			const separator = qs("#opt-separator", dialog)?.value;
			if (separator !== void 0) s.fileNaming.separator = separator;
			const validation = qs("#opt-validation", dialog);
			if (validation) s.fileNaming.validation.enabled = validation.checked;
			const valPattern = qs("#opt-validation-pattern", dialog)?.value;
			if (valPattern !== void 0) s.fileNaming.validation.pattern = valPattern;
			const fallback = qs("#opt-fallback", dialog)?.value;
			if (fallback) s.fileNaming.validation.fallbackPattern = fallback;
			const replacement = qs("#opt-replacement", dialog);
			if (replacement) s.contentReplacement.enabled = replacement.checked;
			const smartGroup = qs("#opt-smart-group", dialog);
			if (smartGroup) s.smartGrouping.enabled = smartGroup.checked;
			const groupType = qs("#opt-group-type", dialog);
			if (groupType) s.smartGrouping.groupByType = groupType.checked;
			const groupDate = qs("#opt-group-date", dialog);
			if (groupDate) s.smartGrouping.groupByDate = groupDate.checked;
			this.manager.settings.save();
		}
		async showComparisonResults(dirHandle) {
			const overlay = this._createOverlay();
			const dialog = el("div", {
				className: "am-dialog",
				attrs: { style: "max-width:900px" }
			});
			dialog.innerHTML = `
      <div class="am-dialog-header">文件对比结果</div>
      <div class="am-dialog-body am-scroll" id="compare-body">
        <div class="am-state am-state--loading">正在扫描本地文件...</div>
      </div>
      <div class="am-dialog-footer">
        <button class="am-btn am-btn--ghost" id="compare-close">关闭</button>
      </div>
    `;
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);
			qs("#compare-close", dialog).addEventListener("click", () => overlay.remove());
			overlay.addEventListener("click", (e) => {
				if (e.target === overlay) overlay.remove();
			});
			try {
				const body = qs("#compare-body", dialog);
				const localFiles = await this.manager.fileComparer.getLocalFiles(dirHandle, (progress) => {
					body.innerHTML = `<div class="am-state am-state--loading">正在扫描... 已发现 ${progress} 个文件</div>`;
				});
				body.innerHTML = "<div class=\"am-state am-state--loading\">正在对比文件...</div>";
				const result = this.manager.fileComparer.compareFiles(localFiles, this.manager.attachments);
				this._renderComparisonResults(body, result);
			} catch (error) {
				qs("#compare-body", dialog).innerHTML = html`<div class="am-state am-state--error">对比失败: ${error.message}</div>`;
			}
		}
		_renderComparisonResults(body, result) {
			const { missing, matched, duplicates } = result;
			body.innerHTML = `
      <div class="am-stat-grid" style="margin-bottom:var(--am-space-6)">
        <div class="am-stat-item">
          <div class="am-stat-number" style="color:var(--am-error)">${missing.length}</div>
          <div class="am-stat-label">缺失文件</div>
        </div>
        <div class="am-stat-item">
          <div class="am-stat-number" style="color:var(--am-success)">${matched.length}</div>
          <div class="am-stat-label">已匹配</div>
        </div>
        <div class="am-stat-item">
          <div class="am-stat-number" style="color:var(--am-warning)">${duplicates?.length || 0}</div>
          <div class="am-stat-label">重复文件</div>
        </div>
      </div>

      ${missing.length > 0 ? `
        <div class="am-form-section">
          <div class="am-form-section-title" style="color:var(--am-error)">缺失文件 (${missing.length})</div>
          ${missing.slice(0, 20).map((att) => html`
            <div class="am-list-item" style="margin-bottom:var(--am-space-2)">
              <div style="font-weight:500">${att.name}</div>
              <div style="font-size:12px;color:var(--am-text-secondary)">${formatFileSize(parseInt(att.size) || 0)} \u00b7 ${att.mailSubject || ""}</div>
            </div>
          `).join("")}
          ${missing.length > 20 ? `<div class="am-list-more">还有 ${missing.length - 20} 个...</div>` : ""}
        </div>
      ` : ""}

      ${matched.length > 0 ? `
        <div class="am-form-section">
          <div class="am-form-section-title" style="color:var(--am-success)">已匹配 (${matched.length})</div>
          ${matched.slice(0, 10).map((m) => html`
            <div class="am-list-item" style="margin-bottom:var(--am-space-2)">
              <div style="font-weight:500">${m.emailAttachment?.name || m.name || ""}</div>
            </div>
          `).join("")}
          ${matched.length > 10 ? `<div class="am-list-more">还有 ${matched.length - 10} 个...</div>` : ""}
        </div>
      ` : ""}
    `;
		}
		showDetailList({ title, data, itemRenderer, searchable = true, sortable = false, pageSize = 20 }) {
			const overlay = this._createOverlay();
			const dialog = el("div", {
				className: "am-dialog",
				attrs: { style: "max-width:800px" }
			});
			let currentPage = 0;
			let filteredData = [...data];
			let searchTerm = "";
			const render = () => {
				const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
				if (currentPage >= totalPages) currentPage = totalPages - 1;
				const start = currentPage * pageSize;
				const pageData = filteredData.slice(start, start + pageSize);
				dialog.innerHTML = `
        <div class="am-dialog-header" style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:18px;font-weight:600">${html`${title}`} (${filteredData.length})</span>
          <button class="am-btn am-btn--icon" id="detail-close">\u00d7</button>
        </div>
        <div class="am-dialog-body am-scroll">
          ${searchable ? `
            <div class="am-form-item" style="margin-bottom:var(--am-space-4)">
              <input class="am-input" id="detail-search" placeholder="搜索..." value="${html`${searchTerm}`}">
            </div>
          ` : ""}
          <div id="detail-list">
            ${pageData.length > 0 ? pageData.map((item, i) => `<div class="am-list-item" style="margin-bottom:var(--am-space-2)">${itemRenderer(item, start + i)}</div>`).join("") : "<div class=\"am-state am-state--empty\">无数据</div>"}
          </div>
        </div>
        <div class="am-dialog-footer" style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;color:var(--am-text-secondary)">第 ${currentPage + 1} / ${totalPages} 页</span>
          <div>
            <button class="am-btn am-btn--ghost" id="detail-prev" ${currentPage === 0 ? "disabled" : ""}>上一页</button>
            <button class="am-btn am-btn--ghost" id="detail-next" ${currentPage >= totalPages - 1 ? "disabled" : ""}>下一页</button>
          </div>
        </div>
      `;
				qs("#detail-close", dialog).addEventListener("click", () => overlay.remove());
				qs("#detail-prev", dialog)?.addEventListener("click", () => {
					currentPage--;
					render();
				});
				qs("#detail-next", dialog)?.addEventListener("click", () => {
					currentPage++;
					render();
				});
				const searchInput = qs("#detail-search", dialog);
				if (searchInput) searchInput.addEventListener("input", (e) => {
					searchTerm = e.target.value.trim().toLowerCase();
					filteredData = searchTerm ? data.filter((item) => JSON.stringify(item).toLowerCase().includes(searchTerm)) : [...data];
					currentPage = 0;
					render();
					const newInput = qs("#detail-search", dialog);
					if (newInput) {
						newInput.focus();
						newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
					}
				});
			};
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);
			overlay.addEventListener("click", (e) => {
				if (e.target === overlay) overlay.remove();
			});
			render();
		}
		showVariableSelector(targetInputId) {
			remove("#am-variable-selector");
			const variables = [
				{
					name: "date",
					desc: "邮件日期"
				},
				{
					name: "subject",
					desc: "邮件主题"
				},
				{
					name: "fileName",
					desc: "原始文件名"
				},
				{
					name: "senderName",
					desc: "发件人名称"
				},
				{
					name: "senderEmail",
					desc: "发件人邮箱"
				},
				{
					name: "mailId",
					desc: "邮件ID"
				},
				{
					name: "fileIndex",
					desc: "文件序号"
				},
				{
					name: "ext",
					desc: "文件扩展名"
				}
			];
			const popup = el("div", {
				className: "am-menu",
				id: "am-variable-selector",
				attrs: { style: "position:fixed;z-index:10003" }
			});
			for (const v of variables) {
				const item = el("div", {
					className: "am-menu-item",
					events: { click: () => {
						const input = qs(`#${targetInputId}`);
						if (input) {
							const pos = input.selectionStart || input.value.length;
							const val = input.value;
							input.value = val.slice(0, pos) + `{${v.name}}` + val.slice(pos);
							input.focus();
						}
						popup.remove();
					} }
				});
				item.innerHTML = html`<strong>{${v.name}}</strong> \u2014 ${v.desc}`;
				popup.appendChild(item);
			}
			const input = qs(`#${targetInputId}`);
			if (input) {
				const rect = input.getBoundingClientRect();
				popup.style.top = `${rect.bottom + 4}px`;
				popup.style.left = `${rect.left}px`;
			}
			document.body.appendChild(popup);
			const closeHandler = (e) => {
				if (!popup.contains(e.target)) {
					popup.remove();
					document.removeEventListener("click", closeHandler);
				}
			};
			setTimeout(() => document.addEventListener("click", closeHandler), 0);
		}
		_createOverlay() {
			const overlay = el("div", { className: "am-dialog-overlay" });
			const keyHandler = (e) => {
				if (e.key === "Escape") {
					overlay.remove();
					document.removeEventListener("keydown", keyHandler);
				}
			};
			document.addEventListener("keydown", keyHandler);
			return overlay;
		}
	};
	//#endregion
	//#region src/ui/progress.js
	var ProgressBar = class {
		constructor(container) {
			this.container = container;
		}
		show(message = "正在下载附件...") {
			this.container.style.display = "block";
			this.container.style.cssText = "display:block;padding:var(--am-space-4) var(--am-space-5);border-top:1px solid var(--am-border);background:var(--am-bg);position:absolute;bottom:0;left:0;right:0;z-index:1001";
			this.container.innerHTML = `
      <div style="margin-bottom:var(--am-space-2);font-weight:500;color:var(--am-text)">${message}</div>
      <div class="am-progress" style="height:6px;margin-bottom:var(--am-space-2)">
        <div id="am-progress-bar" class="am-progress-bar" style="width:0%"></div>
      </div>
      <div id="am-progress-status" style="font-size:12px;color:var(--am-text-tertiary)">准备开始...</div>
    `;
		}
		hide() {
			this.container.style.display = "none";
			this.container.innerHTML = "";
		}
		update(stats) {
			const bar = qs("#am-progress-bar");
			const status = qs("#am-progress-status");
			if (!bar || !status) return;
			const effective = stats.completedBytes + (stats.activeFileBytes || 0);
			const percent = stats.totalBytes > 0 ? effective / stats.totalBytes * 100 : 0;
			bar.style.width = `${Math.min(percent, 100)}%`;
			const remaining = stats.speed > 0 ? (stats.totalBytes - effective) / stats.speed : 0;
			status.textContent = `下载中 ${stats.completedCount}/${stats.totalCount} · ${formatFileSize(effective)} / ${formatFileSize(stats.totalBytes)} · ${formatFileSize(Math.round(stats.speed))}/s · 剩余约 ${formatTime(remaining)}`;
		}
	};
	//#endregion
	//#region src/core/attachment-manager.js
	var AttachmentManager = class {
		constructor(downloader) {
			this.downloader = downloader;
			this.settings = new Settings();
			this.namingEngine = new NamingEngine(this.settings);
			this.downloadEngine = new DownloadEngine(this.downloader, this.namingEngine);
			this.fileComparer = new FileComparer();
			this.panel = new Panel(this);
			this.bento = new BentoLayout(this);
			this.grid = new AttachmentGrid(this);
			this.toolbar = new Toolbar(this);
			this.dialogs = new Dialogs(this);
			this.progress = null;
			this.attachments = [];
			this.skippedAttachments = [];
			this.selectedAttachments = /* @__PURE__ */ new Set();
			this.isLoading = false;
			this.isActive = false;
			this.totalMailCount = 0;
			this.toggleInProgress = false;
		}
		toggle() {
			if (this.toggleInProgress) return;
			this.toggleInProgress = true;
			try {
				this.isActive ? this.close() : this.open();
			} finally {
				setTimeout(() => {
					this.toggleInProgress = false;
				}, 500);
			}
		}
		async open() {
			if (this.isActive) return;
			this.isActive = true;
			this.isLoading = true;
			this.attachments = [];
			this.skippedAttachments = [];
			this.selectedAttachments.clear();
			const { contentArea, progressArea } = this.panel.create();
			this.progress = new ProgressBar(progressArea);
			try {
				this.grid.showLoading(contentArea, "正在获取邮件列表...");
				await this._loadData(contentArea);
				this._renderContent(contentArea);
			} catch (error) {
				this.grid.showError(contentArea, `初始化失败: ${error.message}`);
				showToast(`初始化失败: ${error.message}`, "error", 5e3);
			} finally {
				this.isLoading = false;
			}
		}
		close() {
			this.isActive = false;
			this.isLoading = false;
			this.panel.destroy();
			this.progress = null;
		}
		async _loadData(contentArea) {
			const folderId = this.downloader.getCurrentFolderId();
			this.grid.showLoading(contentArea, "正在获取邮件...");
			const { mails, total, failedPages } = await this.downloader.fetchAllMails(folderId);
			this.totalMailCount = total;
			if (failedPages.length > 0) showToast(`${failedPages.length} 页邮件获取失败，已加载其余邮件`, "warning");
			this.grid.showLoading(contentArea, `正在处理 ${mails.length} 封邮件的附件...`);
			const { valid, skipped } = this.downloader.extractAttachments(mails);
			this.attachments = valid;
			this.skippedAttachments = skipped;
		}
		_renderContent(contentArea) {
			const stats = {
				mailCount: this.totalMailCount,
				attachmentCount: this.attachments.length,
				totalSize: this.attachments.reduce((s, a) => s + (parseInt(a.size) || 0), 0),
				skippedCount: this.skippedAttachments.length
			};
			this.bento.render(contentArea, this.attachments, stats);
		}
		async downloadAll() {
			const attachments = this.toolbar.getFilteredAttachments(this.attachments);
			await this._performDownload(attachments, "全部");
		}
		async downloadSelected() {
			const selected = this.attachments.filter((a) => this.selectedAttachments.has(a.fileid || a.name));
			if (selected.length === 0) {
				showToast("请先选择要下载的附件", "warning");
				return;
			}
			await this._performDownload(selected, "选中");
		}
		async _performDownload(attachments, label) {
			if (attachments.length === 0) {
				showToast("没有可下载的附件", "warning");
				return;
			}
			try {
				const dirHandle = await window.showDirectoryPicker({
					mode: "readwrite",
					startIn: "downloads"
				});
				if (await dirHandle.requestPermission({ mode: "readwrite" }) !== "granted") throw new Error("需要文件夹写入权限");
				this.progress?.show(`正在下载${label}附件...`);
				this.downloadEngine.onProgress = (stats) => this.progress?.update(stats);
				const results = await this.downloadEngine.downloadAll(attachments, dirHandle, this.settings);
				const success = results.filter((r) => !r.error).length;
				const fail = results.filter((r) => r.error).length;
				showToast(`下载完成：${success} 成功，${fail} 失败`, fail > 0 ? "warning" : "success");
				if (this.settings.data.downloadBehavior.autoCompareAfterDownload) await this.dialogs.showComparisonResults(dirHandle);
			} catch (error) {
				if (error.name !== "AbortError") showToast(`下载失败: ${error.message}`, "error");
			} finally {
				this.progress?.hide();
			}
		}
		async showCompare() {
			try {
				const dirHandle = await window.showDirectoryPicker({
					mode: "read",
					startIn: "downloads"
				});
				await this.dialogs.showComparisonResults(dirHandle);
			} catch (error) {
				if (error.name !== "AbortError") showToast(`对比失败: ${error.message}`, "error");
			}
		}
		showSettings() {
			this.dialogs.showSettings();
		}
	};
	//#endregion
	//#region src/index.js
	(function() {
		"use strict";
		let downloader = null;
		let manager = null;
		function init() {
			if (manager) return;
			downloader = new QQMailDownloader();
			if (!downloader.init()) {
				console.warn("[QQMailDownloader] SID not found, skipping init");
				return;
			}
			if (window.location.pathname.includes("/login")) return;
			try {
				manager = new AttachmentManager(downloader);
				window.attachmentManager = manager;
				console.log("[QQMailDownloader] v2.0.0 initialized");
			} catch (e) {
				console.error("[QQMailDownloader] init failed:", e);
				manager = null;
			}
			injectToolbarButton();
			listenFolderChange();
		}
		/** 在邮件列表工具栏（删除/转发那一栏）中注入"附件管理"按钮 */
		function injectToolbarButton(retries = 0) {
			document.querySelectorAll("[data-attachment-manager-btn]").forEach((el) => el.remove());
			const rightWrap = document.querySelector(".mail-list-page-toolbar .right-wrap");
			if (!rightWrap) {
				if (retries < 10) {
					setTimeout(() => injectToolbarButton(retries + 1), 500);
					return;
				}
				injectFloatingButton();
				return;
			}
			const btn = document.createElement("div");
			btn.className = "xmail-ui-btn ui-btn-size32 ui-btn-border ui-btn-them-clear-gray";
			btn.setAttribute("data-attachment-manager-btn", "true");
			btn.setAttribute("data-a11y", "button");
			btn.style.marginRight = "8px";
			btn.innerHTML = `
      <div class="xmail-ui-icon ui-btn-icon" style="width:20px;height:20px">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      </div>
      <div class="ui-btn-text">附件管理</div>
    `;
			btn.addEventListener("click", () => manager?.toggle());
			const totalWrap = rightWrap.querySelector(".mail-list-page-toolbar-mail-total");
			if (totalWrap) rightWrap.insertBefore(btn, totalWrap);
			else {
				const ellipsis = rightWrap.querySelector(".xmail-ui-toolbar-ellipsis");
				if (ellipsis && ellipsis.nextSibling) rightWrap.insertBefore(btn, ellipsis.nextSibling);
				else rightWrap.appendChild(btn);
			}
		}
		/** 回退方案：右下角浮动按钮 */
		function injectFloatingButton() {
			const btn = document.createElement("button");
			btn.id = "attachment-downloader-btn";
			btn.setAttribute("data-attachment-manager-btn", "true");
			btn.className = "am-btn am-btn--primary";
			btn.textContent = "📎 附件管理";
			btn.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9998;padding:10px 20px;font-size:14px;border-radius:var(--am-radius-full);box-shadow:var(--am-shadow-lg);";
			btn.addEventListener("click", () => manager?.toggle());
			document.body.appendChild(btn);
		}
		function listenFolderChange() {
			let currentFolder = downloader.getCurrentFolderId();
			window.addEventListener("hashchange", () => {
				const newFolder = downloader.getCurrentFolderId();
				if (currentFolder !== newFolder) {
					currentFolder = newFolder;
					setTimeout(() => injectToolbarButton(), 500);
				}
			});
		}
		const observer = new MutationObserver(() => {
			if (document.querySelector("#mailMainApp") && !manager) {
				observer.disconnect();
				init();
			}
		});
		function start() {
			if (document.querySelector("#mailMainApp")) init();
			else observer.observe(document.body, {
				childList: true,
				subtree: true
			});
		}
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
		else start();
	})();
	//#endregion
})();
