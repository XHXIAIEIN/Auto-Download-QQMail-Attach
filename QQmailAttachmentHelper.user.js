// ==UserScript==
// @name         QQ邮箱附件批量下载器
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  批量下载QQ邮箱附件，支持筛选、排序和批量操作
// @author       You
// @match        https://wx.mail.qq.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_notification
// @connect      mail.qq.com
// @connect      wx.mail.qq.com
// @connect      gzc-dfsdown.mail.ftn.qq.com
// ==/UserScript==

(function() {
    'use strict';

    // URL常量定义
const MAIL_CONSTANTS = {
        BASE_URL: 'https://wx.mail.qq.com',
        API_ENDPOINTS: {
            MAIL_LIST: '/list/maillist',
            ATTACH_DOWNLOAD: '/attach/download',
            ATTACH_THUMBNAIL: '/attach/thumbnail',
            ATTACH_PREVIEW: '/attach/preview'
        }
};

    const STYLE_TEXT = `
.attachment-manager-panel{position:fixed;top:0;right:0;width:400px;height:100vh;background:#fff;border:3px solid red;box-shadow:-2px 0 8px rgba(0,0,0,0.1);z-index:99999;display:none;flex-direction:column;transition:opacity .3s ease,transform .3s ease;opacity:0;transform:translateX(100%)}
.attachment-manager-header{padding:16px;border-bottom:1px solid var(--base_gray_010,rgba(22,46,74,.08));display:flex;justify-content:space-between;align-items:center;background:var(--bg_white_web,#fff)}
.attachment-manager-content{flex:1;overflow-y:auto;padding:16px;background:var(--bg_gray_web_1,#F6F8FA)}
.am-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px}
.am-actions{display:flex;gap:8px}
.am-btn{padding:8px 16px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;display:flex;align-items:center;gap:6px}
.am-btn-primary{background:var(--theme_primary,#0F7AF5);color:#fff;border:none;transition:all .2s}
.am-btn-secondary{background:var(--bg_white_web,#fff);color:var(--base_gray_100,#13181D);border:1px solid var(--base_gray_010,rgba(22,46,74,.08));transition:all .2s}
#attachment-list{display:flex;flex-direction:column;gap:8px}
.close-btn{background:none;border:none;cursor:pointer;padding:8px;border-radius:4px;color:var(--base_gray_030,rgba(25,38,54,.3))}
.close-btn:hover{background:var(--base_gray_005,rgba(20,46,77,.07));color:var(--base_gray_100,#13181D)}
`;
    function injectStyles(){
        if(!document.getElementById('qqmail-attach-style')){
            const s=document.createElement('style');
            s.id='qqmail-attach-style';
            s.textContent=STYLE_TEXT;
            document.head.appendChild(s);
        }
    }

    class AttachmentManager {
        constructor(downloader) {
            this.downloader = downloader;
            this.container = null;
            this.isVisible = false;
            this.selectedAttachments = new Set();
            this.downloadQueue = [];
            this.downloading = false;
            this.retryCount = 3;
            this.attachments = [];
            this.filters = {
                date: 'all',
                dateRange: {
                    start: null,
                    end: null
                },
                minSize: 0,
                maxSize: 0,
                allowedTypes: [],
                excludedTypes: []
            };
            this.sortBy = {
                field: 'date',
                direction: 'desc'
            };
            this.groupBy = 'mail';
            this.isLoading = false;
            this.currentFilter = 'all';
            this.currentSort = 'date';

            // 下载设置
            this.downloadSettings = {
                fileNaming: {
                    prefix: '',
                    suffix: '',
                    includeMailId: false,
                    includeAttachmentId: false,
                    includeSenderEmail: false,
                    includeMailDate: false,
                    includeMailSubject: false,
                    includeFileType: false,
                    separator: '_',
                    useCustomPattern: false,
                    customPattern: '{date}_{subject}_{fileName}',
                    validation: {
                        enabled: true,  // 启用验证功能
                        pattern: '\\d{6,}',  // 正则表达式字符串，例如：'\\d{6,}' 表示至少6个数字
                        fallbackPattern: 'auto'  // 验证失败时的备用命名模式：'auto' 或具体模式如 '{mailSubject}_{fileName}'
                    }
                },
                folderStructure: 'flat', // 'flat', 'byMail', 'byType', 'smart'
                conflictResolution: 'rename', // 'rename', 'overwrite', 'skip'
                downloadBehavior: {
                    showProgress: true,
                    retryOnFail: true,
                    verifyDownloads: true,
                    notifyOnComplete: true,
                    concurrentDownloads: 3
                },
                smartGrouping: {
                    enabled: false,
                    maxGroupSize: 5,
                    groupByType: true,
                    groupByDate: true
                }
            };

            // 添加下载队列管理
            this.downloadQueue = {
                high: [], // 高优先级队列
                normal: [], // 普通优先级队列
                low: [] // 低优先级队列
            };
            this.downloadStats = {
                startTime: null,
                completedSize: 0,
                totalSize: 0,
                speed: 0,
                lastUpdate: null
            };
            // 动态并发控制
            this.concurrentControl = {
                minConcurrent: 2,
                maxConcurrent: 5,
                currentConcurrent: 3,
                successCount: 0,
                failCount: 0,
                lastAdjustTime: null,
                adjustInterval: 10000 // 10秒调整一次
            };
            // Add progress tracking for concurrent downloads
            this.totalTasksForProgress = 0;
            this.completedTasksForProgress = 0;

            // 工具栏状态保存
            this.originalToolbarHTML = null;
            this.originalToolbarStyle = null;
            this.originalToolbarClassName = null;
            this.originalToolbarBtnsHTML = null;
            this.originalMailTotalHTML = null;

            this.init();
        }


        init() {
            injectStyles();
            window.attachmentManager = this;
            this.createAndInjectButton();
            this.initUrlChangeListener();
        }

        initUrlChangeListener() {
            let lastUrl = location.href;
            const observer = new MutationObserver(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    this.createAndInjectButton();
                    const newFolderId = this.downloader.getCurrentFolderId();
                    if (this.currentFolderId !== newFolderId) {
                        this.currentFolderId = newFolderId;
                        if (this.isViewActive) {
                           this.loadAttachments();
                        }
                    }
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            window.addEventListener('hashchange', () => {
                 const newFolderId = this.downloader.getCurrentFolderId();
                 if (this.currentFolderId !== newFolderId) {
                     this.currentFolderId = newFolderId;
                     if (this.isViewActive) {
                        this.loadAttachments();
                     }
                 }
            });
        }

        createToolbarButton() {

            const selector = '.xmail-ui-ellipsis-toolbar .ui-ellipsis-toolbar-btns';

            const insertButton = () => {
                const container = document.querySelector(selector);
                if (!container) return false;

                // 检查是否已经存在按钮
                if (container.querySelector('.attachment-manager-btn')) {
                    return true;
                }

                // 创建按钮元素
                const btn = document.createElement('div');
                btn.className = 'xmail-ui-btn ui-btn-size32 ui-btn-border ui-btn-them-clear-gray attachment-manager-btn';
                btn.setAttribute('style', 'margin-right: 8px;');
                btn.title = '附件管理';
                btn.innerHTML = `<div class="ui-btn-text">附件管理</div>`;
                btn.addEventListener('click', () => {
                    this.isViewActive ? this.hideAttachmentView() : this.showAttachmentView();
                });
                container.appendChild(btn);
                return true;
            };

            // 等待工具栏出现
            const observer = new MutationObserver((_, obs) => {
                if (insertButton()) {
                    obs.disconnect();
                }
            });

            // 立即尝试插入
            if (!insertButton()) {
                // 如果失败，开始观察 DOM 变化
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                // 设置超时 10 秒，避免无限等待
                setTimeout(() => {
                    observer.disconnect();
                }, 10000);
            }
        }



        hidePanel() {

            try {
                // 调用完整的隐藏逻辑
                this.hideAttachmentView();
            } catch (error) {
                console.error('[HidePanel] 隐藏面板时出现错误:', error);
                // 即使出错也要尝试基本清理
                this.forceCleanup();
            }
        }

        // 获取文件夹显示名称
        getFolderDisplayName() {
            // 从原生工具栏获取文件夹名称
            const nativeFolderName = document.querySelector('.toolbar-folder-name');
            if (nativeFolderName && nativeFolderName.textContent.trim()) {
                return nativeFolderName.textContent.trim();
            }

            // 从页面标题或其他元素获取文件夹名称
            const folderElements = [
                '.folder-name',
                '.current-folder',
                '.folder-title',
                '[data-folder-name]',
                '.mail-folder-name'
            ];

            for (const selector of folderElements) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }

            // 根据文件夹ID返回默认名称
            const folderId = this.downloader.getCurrentFolderId();
            const folderNames = {
                '1': '收件箱',
                '2': '已发送',
                '3': '草稿箱',
                '4': '已删除',
                '5': '垃圾邮件',
                '6': '广告邮件'
            };

            return folderNames[folderId] || `文件夹 ${folderId}`;
        }

        createPanel() {
            injectStyles();
            const panel = document.createElement('div');
            panel.className = 'attachment-manager-panel';

            const header = document.createElement('div');
            header.className = 'attachment-manager-header';
            header.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;">
                    <h3 style="margin:0;font-size:16px;color:var(--base_gray_100,#13181D);font-weight:600;">附件管理</h3>
                    <span style="color:var(--base_gray_030,rgba(25,38,54,.3));font-size:13px;" id="attachment-count">0 个附件</span>
                </div>
                <button class="close-btn">×</button>`;

            const content = document.createElement('div');
            content.className = 'attachment-manager-content';

            const toolbar = document.createElement('div');
            toolbar.className = 'am-toolbar';

            const actionButtons = document.createElement('div');
            actionButtons.className = 'am-actions';

            const downloadAllBtn = document.createElement('button');
            downloadAllBtn.className = 'am-btn am-btn-primary';
            downloadAllBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 2v8m0 0l3-3m-3 3L5 7m-2 4v2h10v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                下载全部`;
            downloadAllBtn.onclick = () => this.downloadAll();

            const compareBtn = document.createElement('button');
            compareBtn.className = 'am-btn am-btn-secondary';
            compareBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 3h5l2 2h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                比对`;
            compareBtn.onclick = () => this.showCompareDialog();

            actionButtons.appendChild(downloadAllBtn);
            toolbar.appendChild(compareBtn);
            toolbar.appendChild(actionButtons);

            const attachmentList = document.createElement('div');
            attachmentList.id = 'attachment-list';

            content.appendChild(toolbar);
            content.appendChild(attachmentList);

            panel.appendChild(header);
            panel.appendChild(content);

        // 添加关闭按钮事件
        header.querySelector('.close-btn').onclick = () => this.hidePanel();

        // 添加搜索框事件
        const searchInput = searchBox.querySelector('input');
        searchInput.onfocus = () => {
            searchInput.style.borderColor = 'var(--theme_primary, #0F7AF5)';
            searchInput.style.boxShadow = '0 0 0 2px var(--theme_alpha_010, rgba(15, 122, 245, 0.1))';
        };
        searchInput.onblur = () => {
            searchInput.style.borderColor = 'var(--base_gray_010, rgba(22, 46, 74, 0.08))';
            searchInput.style.boxShadow = 'none';
        };
        searchInput.oninput = () => {
            this.filters.searchKeyword = searchInput.value.trim();
            this.applyFilters();
        };

        // 保存引用
        this.container = panel;
        this.panel = panel;
        this.attachmentList = attachmentList;

        // 添加到页面
        document.body.appendChild(panel);
    }

    // 显示比对对话框
    async showCompareDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'compare-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const dialogContent = document.createElement('div');
        dialogContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        `;

        dialogContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 18px; color: #13181D;">文件完整性比对</h3>
                <button class="close-dialog-btn" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>
            <div style="margin-bottom: 20px;">
                <p style="color: #666; margin: 0 0 16px 0;">选择本地文件夹与当前邮件文件夹进行比对，检查文件完整性</p>
                <button id="select-folder-btn" style="
                    padding: 12px 24px;
                    background: #0F7AF5;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                ">选择本地文件夹</button>
            </div>
            <div id="compare-results" style="display: none;">
                <div id="compare-summary" style="
                    background: #f8f9fa;
                    padding: 16px;
                    border-radius: 6px;
                    margin-bottom: 16px;
                "></div>
                <div id="missing-files" style="margin-bottom: 16px;"></div>
                <div id="duplicate-files" style="margin-bottom: 16px;"></div>
                <div id="matched-files" style="margin-bottom: 16px;"></div>
            </div>
        `;

        dialog.appendChild(dialogContent);
        document.body.appendChild(dialog);

        // 绑定事件
        dialogContent.querySelector('.close-dialog-btn').onclick = () => {
            document.body.removeChild(dialog);
        };

        dialog.onclick = (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        };

        dialogContent.querySelector('#select-folder-btn').onclick = async () => {
            try {
                const dirHandle = await window.showDirectoryPicker();
                await this.performComparison(dirHandle, dialogContent);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    this.showToast('选择文件夹失败: ' + error.message, 'error');
                }
            }
        };
    }

    // 执行比对
    async performComparison(dirHandle, dialogContent) {
        const resultsDiv = dialogContent.querySelector('#compare-results');
        const summaryDiv = dialogContent.querySelector('#compare-summary');
        const missingDiv = dialogContent.querySelector('#missing-files');
        const duplicateDiv = dialogContent.querySelector('#duplicate-files');
        const matchedDiv = dialogContent.querySelector('#matched-files');

        // 显示加载状态
        summaryDiv.innerHTML = '<div style="text-align: center; padding: 20px;">正在比对文件...</div>';
        resultsDiv.style.display = 'block';

        try {
            // 获取本地文件信息
            const localFiles = await this.getLocalFiles(dirHandle);

            // 获取邮件附件信息
            const emailAttachments = this.attachments || [];

            // 执行比对分析
            const comparisonResult = this.compareFiles(localFiles, emailAttachments);

            // 显示比对结果
            this.displayComparisonResults(comparisonResult, summaryDiv, missingDiv, duplicateDiv, matchedDiv);

        } catch (error) {
            summaryDiv.innerHTML = `<div style="color: #e74c3c; text-align: center; padding: 20px;">比对失败: ${error.message}</div>`;
        }
    }

    // 获取本地文件信息
    async getLocalFiles(dirHandle, path = '') {
        const files = [];

        for await (const [name, handle] of dirHandle.entries()) {
            const fullPath = path ? `${path}/${name}` : name;

            if (handle.kind === 'file') {
                try {
                    const file = await handle.getFile();
                    files.push({
                        name: name,
                        path: fullPath,
                        size: file.size,
                        type: this.getFileExtension(name).toLowerCase(),
                        lastModified: file.lastModified,
                        handle: handle
                    });
                } catch (error) {
                    console.warn(`无法读取文件 ${fullPath}:`, error);
                }
            } else if (handle.kind === 'directory') {
                // 递归读取子文件夹
                const subFiles = await this.getLocalFiles(handle, fullPath);
                files.push(...subFiles);
            }
        }

        return files;
    }

    // 比对文件
    compareFiles(localFiles, emailAttachments) {
        const result = {
            missing: [],      // 邮件中有但本地缺少的文件
            duplicates: [],   // 重复的文件
            matched: [],      // 匹配的文件
            localOnly: [],    // 本地有但邮件中没有的文件
            summary: {
                totalEmail: emailAttachments.length,
                totalLocal: localFiles.length,
                missingCount: 0,
                duplicateCount: 0,
                matchedCount: 0
            }
        };

        // 创建本地文件的映射，用于快速查找
        const localFileMap = new Map();
        const localFileSizeMap = new Map();

        localFiles.forEach(file => {
            const key = this.normalizeFileName(file.name);
            if (!localFileMap.has(key)) {
                localFileMap.set(key, []);
            }
            localFileMap.get(key).push(file);

            // 按大小分组，用于处理重命名的文件
            const sizeKey = `${file.size}_${file.type}`;
            if (!localFileSizeMap.has(sizeKey)) {
                localFileSizeMap.set(sizeKey, []);
            }
            localFileSizeMap.get(sizeKey).push(file);
        });

        // 检查每个邮件附件
        emailAttachments.forEach(attachment => {
            const originalName = attachment.name;
            const normalizedName = this.normalizeFileName(originalName);
            const sizeTypeKey = `${attachment.size}_${attachment.type}`;

            let matched = false;
            let matchedFile = null;

            // 1. 首先尝试精确文件名匹配
            if (localFileMap.has(normalizedName)) {
                const candidates = localFileMap.get(normalizedName);
                const exactMatch = candidates.find(file =>
                    file.size === attachment.size &&
                    file.type === attachment.type
                );

                if (exactMatch) {
                    matched = true;
                    matchedFile = exactMatch;
                    result.matched.push({
                        email: attachment,
                        local: exactMatch,
                        matchType: 'exact'
                    });
                }
            }

            // 2. 如果没有精确匹配，尝试按大小和类型匹配（处理重命名情况）
            if (!matched && localFileSizeMap.has(sizeTypeKey)) {
                const candidates = localFileSizeMap.get(sizeTypeKey);

                // 寻找最佳匹配（文件名相似度最高的）
                let bestMatch = null;
                let bestSimilarity = 0;

                candidates.forEach(candidate => {
                    // 跳过已经精确匹配的文件
                    if (result.matched.some(m => m.local === candidate)) {
                        return;
                    }

                    const similarity = this.calculateNameSimilarity(originalName, candidate.name);
                    if (similarity > bestSimilarity && similarity > 0.6) { // 相似度阈值
                        bestSimilarity = similarity;
                        bestMatch = candidate;
                    }
                });

                if (bestMatch) {
                    matched = true;
                    matchedFile = bestMatch;
                    result.matched.push({
                        email: attachment,
                        local: bestMatch,
                        matchType: 'renamed',
                        similarity: bestSimilarity
                    });
                }
            }

            // 3. 如果仍然没有匹配，标记为缺失
            if (!matched) {
                result.missing.push(attachment);
            }
        });

        // 检查重复文件（同一个本地文件匹配多个邮件附件）
        const usedLocalFiles = new Map();
        result.matched.forEach(match => {
            const localFile = match.local;
            const key = `${localFile.path}_${localFile.size}`;

            if (!usedLocalFiles.has(key)) {
                usedLocalFiles.set(key, []);
            }
            usedLocalFiles.get(key).push(match);
        });

        usedLocalFiles.forEach((matches, key) => {
            if (matches.length > 1) {
                result.duplicates.push({
                    localFile: matches[0].local,
                    emailAttachments: matches.map(m => m.email)
                });
            }
        });

        // 找出本地独有的文件
        const matchedLocalFiles = new Set(result.matched.map(m => m.local));
        result.localOnly = localFiles.filter(file => !matchedLocalFiles.has(file));

        // 更新统计信息
        result.summary.missingCount = result.missing.length;
        result.summary.duplicateCount = result.duplicates.length;
        result.summary.matchedCount = result.matched.length;

        return result;
    }

    // 标准化文件名（移除常见的重命名后缀）
    normalizeFileName(fileName) {
        // 移除扩展名
        const nameWithoutExt = this.removeExtension(fileName);

        // 移除常见的重命名后缀，如 (1), (2), _1, _2 等
        const normalized = nameWithoutExt
            .replace(/\s*\(\d+\)$/, '')  // 移除 (1), (2) 等
            .replace(/\s*_\d+$/, '')     // 移除 _1, _2 等
            .replace(/\s*-\d+$/, '')     // 移除 -1, -2 等
            .replace(/\s*副本$/, '')      // 移除"副本"
            .replace(/\s*copy$/, '')      // 移除"copy"
            .trim();

        return normalized.toLowerCase();
    }

    // 计算文件名相似度
    calculateNameSimilarity(name1, name2) {
        const norm1 = this.normalizeFileName(name1);
        const norm2 = this.normalizeFileName(name2);

        // 如果标准化后完全相同，返回高相似度
        if (norm1 === norm2) {
            return 0.95;
        }

        // 使用编辑距离计算相似度
        const distance = this.levenshteinDistance(norm1, norm2);
        const maxLength = Math.max(norm1.length, norm2.length);

        if (maxLength === 0) return 1;

        return 1 - (distance / maxLength);
    }

    // 计算编辑距离
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    // 显示比对结果
    displayComparisonResults(result, summaryDiv, missingDiv, duplicateDiv, matchedDiv) {
        // 显示摘要
        summaryDiv.innerHTML = `
            <h4 style="margin: 0 0 12px 0; color: #13181D;">比对摘要</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: #0F7AF5;">${result.summary.totalEmail}</div>
                    <div style="color: #666; font-size: 14px;">邮件附件总数</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: #28a745;">${result.summary.matchedCount}</div>
                    <div style="color: #666; font-size: 14px;">匹配文件</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: #dc3545;">${result.summary.missingCount}</div>
                    <div style="color: #666; font-size: 14px;">缺失文件</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: #ffc107;">${result.summary.duplicateCount}</div>
                    <div style="color: #666; font-size: 14px;">重复文件</div>
                </div>
            </div>
        `;

        // 显示缺失文件
        if (result.missing.length > 0) {
            missingDiv.innerHTML = `
                <h4 style="margin: 0 0 12px 0; color: #dc3545;">缺失文件 (${result.missing.length})</h4>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e9ecef; border-radius: 4px;">
                    ${result.missing.map(attachment => `
                        <div style="padding: 8px 12px; border-bottom: 1px solid #f8f9fa; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 500;">${this.escapeHtml(attachment.name)}</div>
                                <div style="font-size: 12px; color: #666;">${this.formatSize(attachment.size)} • ${attachment.type}</div>
                            </div>
                            <button onclick="window.attachmentManager.downloadSingleAttachment('${attachment.fileid}')" style="
                                padding: 4px 8px;
                                background: #0F7AF5;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                font-size: 12px;
                                cursor: pointer;
                            ">下载</button>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            missingDiv.innerHTML = `
                <h4 style="margin: 0 0 12px 0; color: #28a745;">✓ 没有缺失文件</h4>
            `;
        }

        // 显示重复文件
        if (result.duplicates.length > 0) {
            duplicateDiv.innerHTML = `
                <h4 style="margin: 0 0 12px 0; color: #ffc107;">重复文件 (${result.duplicates.length})</h4>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e9ecef; border-radius: 4px;">
                    ${result.duplicates.map(dup => `
                        <div style="padding: 8px 12px; border-bottom: 1px solid #f8f9fa;">
                            <div style="font-weight: 500; margin-bottom: 4px;">本地文件: ${this.escapeHtml(dup.localFile.name)}</div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">对应邮件附件:</div>
                            ${dup.emailAttachments.map(att => `
                                <div style="margin-left: 16px; font-size: 12px; color: #666;">• ${this.escapeHtml(att.name)}</div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            duplicateDiv.innerHTML = `
                <h4 style="margin: 0 0 12px 0; color: #28a745;">✓ 没有重复文件</h4>
            `;
        }

        // 显示匹配文件
        if (result.matched.length > 0) {
            matchedDiv.innerHTML = `
                <h4 style="margin: 0 0 12px 0; color: #28a745;">匹配文件 (${result.matched.length})</h4>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e9ecef; border-radius: 4px;">
                    ${result.matched.map(match => `
                        <div style="padding: 8px 12px; border-bottom: 1px solid #f8f9fa;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: 500;">${this.escapeHtml(match.email.name)}</div>
                                    <div style="font-size: 12px; color: #666;">
                                        ${match.matchType === 'exact' ? '✓ 精确匹配' : `⚠ 重命名匹配 (${Math.round(match.similarity * 100)}%)`}
                                        • ${this.formatSize(match.email.size)}
                                    </div>
                                    ${match.matchType === 'renamed' ? `
                                        <div style="font-size: 11px; color: #999; margin-top: 2px;">
                                            本地: ${this.escapeHtml(match.local.name)}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    // 下载单个附件
    async downloadSingleAttachment(fileid) {
        const attachment = this.attachments.find(att => att.fileid === fileid);
        if (!attachment) {
            this.showToast('附件不存在', 'error');
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker();
            await this.downloadAttachment(attachment, dirHandle);
            this.showToast('下载完成', 'success');
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.showToast('下载失败: ' + error.message, 'error');
            }
        }
    }
    updatePageInfo(pageInfoElement) {
        pageInfoElement.textContent = `第 ${this.filters.currentPage} 页 / 共 ${this.filters.totalPages} 页`;
    }

    applyFilters() {
        let filteredAttachments = [...this.attachments];

        // 应用文件类型筛选
        if (this.filters.fileTypes.length > 0 && !this.filters.fileTypes.includes('全部')) {
            filteredAttachments = filteredAttachments.filter(attachment => {
                const ext = attachment.name.split('.').pop().toLowerCase();
                return this.filters.fileTypes.some(type => {
                    switch (type) {
                        case '文档':
                            return ['doc', 'docx', 'pdf', 'txt', 'rtf'].includes(ext);
                        case '图片':
                            return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
                        case '压缩包':
                            return ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
                        case '其他':
                            return !['doc', 'docx', 'pdf', 'txt', 'rtf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
                        default:
                            return false;
                    }
                });
            });
        }

        // 应用时间范围筛选
        if (this.filters.timeRange !== '全部') {
            const now = new Date();
            const ranges = {
                '今天': () => {
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    return attachment => new Date(attachment.date) >= today;
                },
                '本周': () => {
                    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                    return attachment => new Date(attachment.date) >= weekStart;
                },
                '本月': () => {
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    return attachment => new Date(attachment.date) >= monthStart;
                },
                '今年': () => {
                    const yearStart = new Date(now.getFullYear(), 0, 1);
                    return attachment => new Date(attachment.date) >= yearStart;
                }
            };

            if (ranges[this.filters.timeRange]) {
                filteredAttachments = filteredAttachments.filter(ranges[this.filters.timeRange]());
            }
        }

        // 应用搜索关键词
        if (this.filters.searchKeyword) {
            const keyword = this.filters.searchKeyword.toLowerCase();
            filteredAttachments = filteredAttachments.filter(attachment =>
                attachment.name.toLowerCase().includes(keyword) ||
                attachment.mailSubject.toLowerCase().includes(keyword)
            );
        }

        this.updateAttachmentList(filteredAttachments);
    }

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'];
        const docExts = ['doc', 'docx', 'pdf', 'txt', 'rtf', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'];
        const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'];
        const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
        const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg'];

        if (imageExts.includes(ext)) return '图片';
        if (docExts.includes(ext)) return '文档';
        if (archiveExts.includes(ext)) return '压缩包';
        if (videoExts.includes(ext)) return '视频';
        if (audioExts.includes(ext)) return '音频';
        return '其他';
    }

    async loadAttachments() {
        try {
            this.updateStatus('正在初始化...');
            this.showProgress();

            const folderId = this.downloader.getCurrentFolderId();

            if (!folderId) {
                throw new Error('无法获取当前文件夹ID');
            }

            const mails = await this.downloader.getAllMails(folderId);

            if (!mails) {
                throw new Error('获取邮件列表失败：返回数据为空');
            }

            if (!Array.isArray(mails)) {
                throw new Error('获取邮件列表失败：返回数据格式错误');
            }

            if (mails.length === 0) {
                this.attachments = [];
                this.displayAttachments([]);
                this.updateStatus('当前文件夹没有邮件');
                this.updateMailCount([]);
                return;
            }

            this.attachments = [];
            let totalAttachments = 0;
            let processedMails = 0;

            // 开始处理邮件
            for (const mail of mails) {
                if (!mail || typeof mail !== 'object') {
                    continue;
                }

                processedMails++;

                // 检查邮件是否属于当前标签页
                if (folderId && folderId.startsWith('400') && mail.tagid && Array.isArray(mail.tagid) && !mail.tagid.includes(parseInt(folderId))) {
                    continue;
                }

                if (mail.normal_attach && Array.isArray(mail.normal_attach)) {
                    mail.normal_attach.forEach(attach => {
                        if (!attach || typeof attach !== 'object') {
                            return;
                        }

                        if (!attach.name || !attach.download_url) {
                            return;
                        }

                        // 处理附件数据，适配新的API格式
                        const processedAttachment = {
                            ...attach,
                            mailId: mail.emailid,
                            mailSubject: mail.subject,
                            tagid: mail.tagid,
                            totime: mail.totime,
                            mailRaw: mail,

                            // 处理发件人信息 - 新格式
                            sender: mail.senders?.item?.[0]?.email,
                            senderName: mail.senders?.item?.[0]?.nick,

                            // 处理时间信息
                            date: mail.totime || mail.date || Date.now() / 1000,

                            // 处理名称
                            nameWithoutExt: this.removeExtension(attach.name),
                            ext: this.getFileExtension(attach.name),
                        };

                        // 确保下载URL是完整的
                        if (processedAttachment.download_url && !processedAttachment.download_url.startsWith('http')) {
                            processedAttachment.download_url = MAIL_CONSTANTS.BASE_URL + processedAttachment.download_url;
                        }

                        // 确保缩略图URL是完整的
                        if (processedAttachment.thumbnail_url && !processedAttachment.thumbnail_url.startsWith('http')) {
                            processedAttachment.thumbnail_url = MAIL_CONSTANTS.BASE_URL + processedAttachment.thumbnail_url;
                        }

                        // 添加SID到URL中（如果需要）
                        if (processedAttachment.download_url && !processedAttachment.download_url.includes('sid=')) {
                            const separator = processedAttachment.download_url.includes('?') ? '&' : '?';
                            processedAttachment.download_url += `${separator}sid=${this.downloader.sid}`;
                        }

                        if (processedAttachment.thumbnail_url && !processedAttachment.thumbnail_url.includes('sid=')) {
                            const separator = processedAttachment.thumbnail_url.includes('?') ? '&' : '?';
                            processedAttachment.thumbnail_url += `${separator}sid=${this.downloader.sid}`;
                        }

                        this.attachments.push(processedAttachment);
                        totalAttachments++;
                    });
                }
                // 添加小延迟，让UI有时间更新
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            this.displayAttachments(this.attachments);
            this.updateStatus(`加载完成，共 ${totalAttachments} 个附件`);
            this.hideProgress();

            // 更新统计信息
            this.updateMailCount(this.attachments);

        } catch (error) {
            const container = document.querySelector('#attachment-content-area');
            this.showError('加载附件失败: ' + error.message, container);
            this.updateStatus('加载失败');
            this.attachments = [];
            this.displayAttachments([]);
            throw error;
        } finally {
            this.hideProgress();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 安全地将时间戳转换为Date对象
    createSafeDate(timestamp) {
        if (!timestamp) return null;

        let date;
        if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        } else if (typeof timestamp === 'number') {
            if (timestamp < 10000000000) {
                date = new Date(timestamp * 1000);
            } else {
                date = new Date(timestamp);
            }
        } else {
            date = new Date(timestamp);
        }

        // 检查日期是否有效
        if (isNaN(date.getTime())) {
            return null;
        }

        return date;
    }



    createAttachmentCard(attachment) {

        const card = document.createElement('div');
        card.className = 'attachment-card';
        card.style.cssText = `
            background: var(--bg_white_web, #FFFFFF);
            border: 1px solid var(--border_gray_010, rgba(22, 46, 74, 0.05));
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
            transition: box-shadow 0.2s, border 0.2s;
            position: relative;
            aspect-ratio: 1;
            box-shadow: none;
        `;

        // 添加选中状态指示器
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.cssText = `
            position: absolute;
            top: 8px;
            left: 8px;
            width: 20px;
            height: 20px;
            z-index: 10;
            accent-color: var(--theme_primary, #0F7AF5);
            cursor: pointer;
            background: rgba(255,255,255,0.9);
            border-radius: 4px;
            box-shadow: 0 1px 4px 0 rgba(21,46,74,0.08);
            opacity: 0.9;
            transition: opacity 0.2s, box-shadow 0.2s;
            border: 1px solid var(--border_gray_020, #e0e6ed);
        `;
        const attachmentId = attachment.name_md5 || attachment.fid || attachment.name;
        checkbox.dataset.attachmentId = attachmentId;
        checkbox.checked = this.selectedAttachments.has(attachmentId);

        checkbox.onclick = (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            if (checkbox.checked) {
                this.selectedAttachments.add(attachmentId);
            } else {
                this.selectedAttachments.delete(attachmentId);
            }
            this.updateSmartDownloadButton();
        };

        checkbox.onmouseover = () => { checkbox.style.opacity = '1'; checkbox.style.boxShadow = '0 2px 8px 0 rgba(15,122,245,0.12)'; };
        checkbox.onmouseout = () => { checkbox.style.opacity = '0.9'; checkbox.style.boxShadow = '0 1px 4px 0 rgba(21,46,74,0.08)'; };

        card.appendChild(checkbox);

        // 预览图容器
        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--base_gray_005, rgba(20, 46, 77, 0.05));
            overflow: hidden;
        `;

        // 判断是否为图片
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(attachment.name);

        if (isImage) {
            // 使用 API 提供的 thumbnail_url，确保完整的 URL
            let thumbnailUrl = attachment.thumbnail_url;
            if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
                thumbnailUrl = MAIL_CONSTANTS.BASE_URL + thumbnailUrl;
            }

            // 确保 URL 包含 SID 参数
            if (thumbnailUrl && !thumbnailUrl.includes('sid=')) {
                const separator = thumbnailUrl.includes('?') ? '&' : '?';
                thumbnailUrl += `${separator}sid=${this.downloader.sid}`;
            }

            // 如果 URL 包含 HTML 实体编码，进行解码
            if (thumbnailUrl && thumbnailUrl.includes('&amp;')) {
                thumbnailUrl = thumbnailUrl.replace(/&amp;/g, '&');
            }

            // 创建图片预览
            const img = document.createElement('img');
            img.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s ease;
            `;

            img.onload = () => {
                previewContainer.style.background = 'none';
            };

            img.onerror = (error) => {
                const failedUrl = img.src;

                // 检查失败的 URL 是否是 thumbnail 路径，并且之前没有尝试过回退
                if (failedUrl.includes('/attach/thumbnail') && !img.dataset.fallbackAttempted) {
                    img.dataset.fallbackAttempted = 'true'; // 标记已尝试回退

                    // 使用 API 提供的 preview_url 作为回退
                    let previewUrl = attachment.preview_url;
                    if (previewUrl && !previewUrl.startsWith('http')) {
                        previewUrl = MAIL_CONSTANTS.BASE_URL + previewUrl;
                    }

                    // 确保 URL 包含 SID 参数
                    if (previewUrl && !previewUrl.includes('sid=')) {
                        const separator = previewUrl.includes('?') ? '&' : '?';
                        previewUrl += `${separator}sid=${this.downloader.sid}`;
                    }

                    // 如果 URL 包含 HTML 实体编码，进行解码
                    if (previewUrl && previewUrl.includes('&amp;')) {
                        previewUrl = previewUrl.replace(/&amp;/g, '&');
                    }

                    img.src = previewUrl; // 尝试加载 preview
                } else {
                    previewContainer.innerHTML = `
                        <div style="font-size: 24px; color: var(--theme_primary, #0F7AF5);">${this.getFileIcon(attachment.name)}</div>
                    `;
                    previewContainer.style.background = 'var(--base_gray_005, rgba(20, 46, 77, 0.05))';
                }
            };

            img.src = thumbnailUrl;
            previewContainer.appendChild(img);

            // 添加图片悬停效果
            card.onmouseover = () => {
                img.style.transform = 'scale(1.02)';
                card.style.boxShadow = '0 2px 8px 0 rgba(19, 24, 29, 0.08)';
                card.style.borderColor = 'var(--theme_primary, #0F7AF5)';
            };
            card.onmouseout = () => {
                img.style.transform = 'scale(1)';
                card.style.boxShadow = 'none';
                card.style.borderColor = 'var(--border_gray_010, rgba(22, 46, 74, 0.05))';
            };
        } else {
            // 非图片文件显示图标
            const icon = document.createElement('div');
            icon.style.cssText = `
                font-size: 24px;
                color: var(--theme_primary, #0F7AF5);
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                transition: transform 0.3s ease;
            `;
            icon.textContent = this.getFileIcon(attachment.name);
            previewContainer.appendChild(icon);

            // 添加悬停效果
            card.onmouseover = () => {
                card.style.boxShadow = '0 2px 8px 0 rgba(19, 24, 29, 0.08)';
                card.style.borderColor = 'var(--theme_primary, #0F7AF5)';
                icon.style.transform = 'scale(1.05)';
            };
            card.onmouseout = () => {
                card.style.boxShadow = 'none';
                card.style.borderColor = 'var(--border_gray_010, rgba(22, 46, 74, 0.05))';
                icon.style.transform = 'scale(1)';
            };
        }

        card.appendChild(previewContainer);

        // 点击事件
        card.onclick = (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    this.selectedAttachments.add(attachmentId);
                } else {
                    this.selectedAttachments.delete(attachmentId);
                }
                // 更新智能下载按钮状态
                this.updateSmartDownloadButton();
            }
        };

        return card;
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            // 图片
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'webp': '🖼️',
            // 文档
            'doc': '📄', 'docx': '📄', 'pdf': '📄', 'txt': '📄', 'rtf': '📄',
            // 表格
            'xls': '📊', 'xlsx': '📊', 'csv': '📊',
            // 演示文稿
            'ppt': '📑', 'pptx': '📑',
            // 压缩包
            'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️', 'tar': '🗜️', 'gz': '🗜️',
            // 其他
            'default': '📎'
        };
        return icons[ext] || icons.default;
    }

    getFilteredAttachments() {
        if (!Array.isArray(this.attachments)) {
            console.warn('附件列表不是数组，返回空数组');
            return [];
        }

        let filtered = this.attachments.filter(attachment => {
            if (!attachment) {
                console.warn('跳过无效的附件对象');
                return false;
            }

            // 新的文件类型筛选
            if (this.currentFilter !== 'all') {
                const fileType = this.getFileType(attachment.name);
                switch (this.currentFilter) {
                    case 'images':
                        if (fileType !== '图片') return false;
                        break;
                    case 'documents':
                        if (fileType !== '文档') return false;
                        break;
                    case 'archives':
                        if (fileType !== '压缩包') return false;
                        break;
                    case 'others':
                        if (['图片', '文档', '压缩包', '视频', '音频'].includes(fileType)) return false;
                        break;
                }
            }

            // 原有的日期筛选
            if (this.filters.date !== 'all') {
                const date = this.createSafeDate(attachment.date || attachment.totime);
                if (!date) return false; // 如果日期无效，过滤掉

                const now = new Date();
                switch (this.filters.date) {
                    case 'today':
                        if (date.toDateString() !== now.toDateString()) return false;
                        break;
                    case 'week':
                        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                        if (date < weekAgo) return false;
                        break;
                    case 'month':
                        if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
                        break;
                    case 'custom':
                        if (this.filters.dateRange.start && date < this.filters.dateRange.start) return false;
                        if (this.filters.dateRange.end && date > this.filters.dateRange.end) return false;
                        break;
                }
            }

            return true;
        });

        // 应用排序
        return this.getSortedAttachments(filtered);
    }

    getSortedAttachments(attachments) {
        return attachments.sort((a, b) => {
            let comparison = 0;
            switch (this.currentSort) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    comparison = (a.size || 0) - (b.size || 0);
                    break;
                case 'date':
                    const dateA = a.date || a.totime || 0;
                    const dateB = b.date || b.totime || 0;
                    comparison = dateA - dateB;
                    break;
                case 'type':
                    const typeA = this.getFileType(a.name);
                    const typeB = this.getFileType(b.name);
                    comparison = typeA.localeCompare(typeB);
                    break;
                default:
                    // 默认按日期降序
                    const defaultDateA = a.date || a.totime || 0;
                    const defaultDateB = b.date || b.totime || 0;
                    comparison = defaultDateB - defaultDateA;
                    break;
            }
            // 默认降序排列，除非是名称排序
            return this.currentSort === 'name' ? comparison : -comparison;
        });
    }
    applySearch(keyword) {
        if (!keyword) {
            this.displayAttachments(this.attachments);
            return;
        }

        keyword = keyword.toLowerCase();
        const filteredAttachments = this.attachments.filter(attachment =>
            attachment.name.toLowerCase().includes(keyword) ||
            (attachment.mailSubject && attachment.mailSubject.toLowerCase().includes(keyword)) ||
            (attachment.senderName && attachment.senderName.toLowerCase().includes(keyword))
        );
        this.displayAttachments(filteredAttachments);
    }
    async downloadAll() {
        if (this.downloading) {
            this.showToast('已有下载任务正在进行中', 'warning');
            return;
        }

        const filteredAttachments = this.getFilteredAttachments();
        if (filteredAttachments.length === 0) {
            this.showToast('当前没有可下载的附件', 'warning');
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'downloads'
            });

            const permissionStatus = await dirHandle.requestPermission({ mode: 'readwrite' });
            if (permissionStatus !== 'granted') {
                throw new Error('需要文件夹写入权限才能下载文件');
            }

            this.downloading = true;
            this.showToast(`准备并发下载全部 ${filteredAttachments.length} 个附件...`, 'info');

            // Initialize progress for concurrent download
            this.totalTasksForProgress = filteredAttachments.length;
            this.completedTasksForProgress = 0;
            this.showProgress();
            this.updateDownloadProgress();

            // Call downloadWithConcurrency for concurrent processing
            const results = await this.downloadWithConcurrency(filteredAttachments, dirHandle);

            // Process results
            const successCount = results.filter(r => !r.error).length;
            const failCount = results.filter(r => r.error).length;


            if (failCount > 0) {
                this.showToast(`全部附件下载完成。成功: ${successCount}，失败: ${failCount}`, 'warning');
            } else {
                this.showToast(`全部 ${successCount} 个附件下载成功完成。`, 'success');
            }
            this.updateStatus('下载处理完毕');

        } catch (error) {
            if (error.name === 'AbortError') {
                this.showToast('已取消选择文件夹进行批量下载', 'info');
                console.warn('[DownloadAll] Directory picker aborted by user.');
            } else {
                console.error('[DownloadAll] Error during download all process:', error);
                this.showToast('批量下载过程中发生错误: ' + error.message, 'error');
            }
        } finally {
            this.downloading = false;
            this.hideProgress();
        }
    }

    async downloadSelected() {
        if (this.selectedAttachments.size === 0) {
            this.showToast('请先选择要下载的附件', 'warning');
            return;
        }

        if (this.downloading) {
            this.showToast('已有下载任务正在进行中', 'warning');
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'downloads'
            });

            const permissionStatus = await dirHandle.requestPermission({ mode: 'readwrite' });
            if (permissionStatus !== 'granted') {
                throw new Error('需要文件夹写入权限才能下载文件');
            }

            this.downloading = true;
            this.showToast(`准备下载 ${this.selectedAttachments.size} 个附件...`, 'info');

            // 获取选中的附件对象
            const selectedAttachments = this.attachments.filter(att =>
                this.selectedAttachments.has(att.name_md5)
            );


            // Initialize progress
            this.totalTasksForProgress = selectedAttachments.length;
            this.completedTasksForProgress = 0;
            this.showProgress();
            this.updateDownloadProgress();

            // 使用并发下载
            const results = await this.downloadWithConcurrency(selectedAttachments, dirHandle);

            // 处理下载结果
            const successCount = results.filter(r => !r.error).length;
            const failCount = results.filter(r => r.error).length;

            if (failCount > 0) {
                this.showToast(`下载完成，成功: ${successCount}，失败: ${failCount}`, 'warning');
            } else {
                this.showToast(`下载完成，共 ${successCount} 个文件`, 'success');
            }

            // 清空选中状态
            this.selectedAttachments.clear();
            // 更新界面中的复选框状态
            const checkboxes = document.querySelectorAll('#attachment-content-area input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            // 更新智能下载按钮状态
            this.updateSmartDownloadButton();

        } catch (error) {
            if (error.name === 'AbortError') {
                this.showToast('已取消下载', 'info');
            } else {
                console.error('选择文件夹失败:', error);
                this.showToast('选择文件夹失败: ' + error.message, 'error');
            }
        } finally {
            this.downloading = false;
            this.hideProgress();
        }
    }

    async downloadAttachment(attachment, dirHandle, namingStrategy = null) {
        const attachmentName = attachment.name || 'unknown_attachment';

        try {
            // 获取下载URL
            const response = await this.downloader.fetchAttachment(attachment);
            if (!response || !response.response) {
                throw new Error('下载响应无效');
            }

            if (dirHandle) {
                try {
                    // 使用File System Access API
                    const targetFolderHandle = await this.getTargetFolder(dirHandle, attachment);
                    const baseFileName = this.generateFileName(attachment, this.downloadSettings.fileNaming, this.attachments, namingStrategy);
                    const finalFileName = await this.handleFileConflict(targetFolderHandle, baseFileName);

                    const fileHandle = await targetFolderHandle.getFileHandle(finalFileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(response.response);
                    await writable.close();

                    // 验证下载完整性
                    if (this.downloadSettings.downloadBehavior.verifyDownloads) {
                        const isValid = await this.verifyDownload(fileHandle, response.response.size);
                        if (!isValid) {
                            throw new Error('文件完整性验证失败');
                        }
                    }

                    return true;
                } catch (error) {
                    console.error(`[DownloadAttachment] Error saving file ${attachmentName}:`, error);
                    throw error;
                }
            } else {
                try {
                    // 使用GM_download
                    const blob = response.response;
                    const url = URL.createObjectURL(blob);
                    const fileName = this.generateFileName(attachment, this.downloadSettings.fileNaming, this.attachments, namingStrategy);

                    await new Promise((resolve, reject) => {
                        GM_download({
                            url: url,
                            name: fileName,
                            saveAs: true,
                            onload: function() {
                                URL.revokeObjectURL(url);
                                resolve();
                            },
                            onerror: function(error) {
                                URL.revokeObjectURL(url);
                                console.error(`[DownloadAttachment] Failed to download ${fileName}:`, error);
                                reject(error);
                            }
                        });
                    });
                    return true;
                } catch (error) {
                    console.error(`[DownloadAttachment] Error downloading file ${attachmentName}:`, error);
                    throw error;
                }
            }
        } catch (error) {
            console.error(`[DownloadAttachment] Error downloading ${attachmentName}:`, error);
            throw error;
        }
    }

    // 验证下载完整性
    async verifyDownload(fileHandle, expectedSize) {
        try {
            const file = await fileHandle.getFile();
            const actualSize = file.size;
            return actualSize === expectedSize;
        } catch (error) {
            console.error('[VerifyDownload] 验证下载完整性失败:', error);
            return false;
        }
    }
    updateDownloadProgress() {
        if (this.totalTasksForProgress === 0) {
            const progressElement = document.querySelector('#download-progress-bar');
            if (progressElement) {
                progressElement.style.width = '0%';
            }
            return;
        }

        const progress = (this.completedTasksForProgress / this.totalTasksForProgress) * 100;
        const progressElement = document.querySelector('#download-progress-bar');
        const statusElement = document.querySelector('#download-status');

        if (progressElement) {
            progressElement.style.width = `${progress}%`;

            if (progress < 100) {
                progressElement.style.transition = 'width 0.3s ease-in-out';
            } else {
                progressElement.style.transition = 'none';
            }
        }

        if (statusElement) {
            // 计算剩余时间
            const elapsedTime = (Date.now() - this.downloadStats.startTime) / 1000;
            const remainingSize = this.downloadStats.totalSize - this.downloadStats.completedSize;
            const remainingTime = this.downloadStats.speed > 0 ? remainingSize / this.downloadStats.speed : 0;

            // 格式化时间
            const formatTime = (seconds) => {
                if (seconds < 60) return `${Math.round(seconds)}秒`;
                if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
                return `${Math.round(seconds / 3600)}小时`;
            };

            // 更新状态文本
            statusElement.innerHTML = `
                ${Math.round(progress)}% -
                ${this.formatSize(this.downloadStats.completedSize)} / ${this.formatSize(this.downloadStats.totalSize)} -
                ${this.formatSize(this.downloadStats.speed)}/s -
                剩余时间: ${formatTime(remainingTime)}
            `;
        }
    }

    updateStatus(message) {
        const status = document.getElementById('download-status');
        if (status) {
            status.textContent = message;
            // 添加淡入效果
            status.style.opacity = '0';
            setTimeout(() => {
                status.style.transition = 'opacity 0.3s ease';
                status.style.opacity = '1';
            }, 10);
        }
    }

    showProgress() {
        const progressArea = document.getElementById('attachment-progress-area');
        if (progressArea) {
            progressArea.style.cssText = `
                display: block;
                padding: 16px 20px;
                border-top: 1px solid var(--base_gray_010, #e9e9e9);
                background: var(--bg_white_web, #FFFFFF);
            `;

            progressArea.innerHTML = `
                <div style="margin-bottom: 8px; font-weight: 500; color: var(--base_gray_100, #13181D);">
                    正在下载附件...
                </div>
                <div style="background: var(--base_gray_005, rgba(20, 46, 77, 0.05)); border-radius: 4px; height: 8px; overflow: hidden; margin-bottom: 8px;">
                    <div id="download-progress-bar" style="background: var(--theme_primary, #0F7AF5); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <div id="download-status" style="font-size: 12px; color: var(--base_gray_050, #888);">
                    准备开始...
                </div>
            `;
        }
    }

    hideProgress() {
        const progressArea = document.getElementById('attachment-progress-area');
        if (progressArea) {
            progressArea.style.display = 'none';
            progressArea.innerHTML = '';
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        const icon = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type];

        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 16px;
            background: var(--bg_white_web, #FFFFFF);
            border-radius: 4px;
            box-shadow: var(--shadow_2, 0 4px 6px 0 rgba(19, 24, 29, 0.12));
            z-index: 10002;
            animation: slideIn 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--base_gray_100, #13181D);
            border-left: 3px solid ${this.getToastColor(type)};
        `;
        toast.innerHTML = `${icon} ${message}`;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    getToastColor(type) {
        const colors = {
            success: 'var(--chrome_green, #16F761)',
            error: 'var(--chrome_red, #F73116)',
            warning: 'var(--chrome_orange, #F7A316)',
            info: 'var(--theme_primary, #0F7AF5)'
        };
        return colors[type] || colors.info;
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    groupAttachmentsByMail(attachments) {
        const groups = new Map();
        attachments.forEach(attachment => {
            const key = `${attachment.mailId}_${attachment.mailSubject}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    mailId: attachment.mailId,
                    subject: attachment.mailSubject,
                    date: attachment.totime,
                    sender: attachment.sender,
                    senderName: attachment.senderName,
                    raw: attachment.mailRaw,
                    attachments: []
                });
            }
            groups.get(key).attachments.push(attachment);
        });
        return Array.from(groups.values());
    }

    displayGroupedAttachments(groups, container) {
        groups.forEach((group, index) => {
            const groupContainer = document.createElement('div');
            groupContainer.style.cssText = `
                margin: 0 0 16px 0;
                background: transparent;
                border: none;
                border-radius: 0;
                box-shadow: none;
            `;

            // 邮件标题
            const mailHeader = document.createElement('div');
            mailHeader.style.cssText = `
                position: sticky;
                top: 0;
                z-index: 100;
                padding: 12px 16px;
                background: var(--bg_white_web, #FFFFFF);
                border-bottom: 1px solid var(--border_gray_020, #e5e6eb);
                border-radius: 0;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                min-height: 48px;
                margin: 0;
                box-shadow: none;
            `;
            // 主副标题分两行，主标题大且加粗，副信息小且灰色
            mailHeader.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                    <div style="font-size: 16px; font-weight: 700; color: #222;">${group.subject}</div>
                    <div style="font-size: 13px; color: #888;">第 ${index + 1} 封邮件 · ${this.formatMailDate(group.date)} · ${group.attachments.length} 个附件 · ${this.formatTotalSize(group.attachments)}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button class="select-all-btn" style="
                        padding: 0 24px;
                        height: 32px;
                        background: #fff;
                        color: #0F7AF5;
                        border: 1.5px solid #0F7AF5;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">全选</button>
                    <button class="download-group-btn" style="
                        padding: 0 24px;
                        height: 32px;
                        background: #0F7AF5;
                        color: #fff;
                        border: none;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: all 0.2s;
                        box-shadow: 0 2px 8px 0 rgba(15,122,245,0.08);
                    ">下载全部</button>
                </div>
            `;
            // 事件绑定前先获取按钮，避免null
            const selectAllBtn = mailHeader.querySelector('.select-all-btn');
            const downloadBtn = mailHeader.querySelector('.download-group-btn');
            if (selectAllBtn) {
                selectAllBtn.onclick = () => {
                    const checkboxes = groupContainer.querySelectorAll('input[type="checkbox"]');
                    const allSelected = Array.from(checkboxes).every(cb => cb.checked);
                    if (!allSelected) {
                        checkboxes.forEach(cb => {
                            cb.checked = true;
                            this.selectedAttachments.add(cb.dataset.attachmentId);
                        });
                    } else {
                        checkboxes.forEach(cb => {
                            cb.checked = false;
                            this.selectedAttachments.delete(cb.dataset.attachmentId);
                        });
                    }
                    // 更新智能下载按钮状态
                    this.updateSmartDownloadButton();
                };
            }
            if (downloadBtn) {
                downloadBtn.onmouseover = () => {
                    downloadBtn.style.background = '#0e66cb';
                    downloadBtn.style.boxShadow = '0 4px 16px 0 rgba(15,122,245,0.13)';
                };
                downloadBtn.onmouseout = () => {
                    downloadBtn.style.background = '#0F7AF5';
                    downloadBtn.style.boxShadow = '0 2px 8px 0 rgba(15,122,245,0.08)';
                };
                downloadBtn.onclick = async () => {
                    if (this.downloading) {
                        this.showToast('已有下载任务正在进行中', 'warning');
                        return;
                    }
                    const checkboxes = groupContainer.querySelectorAll('input[type="checkbox"]');
                    const selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.dataset.attachmentId);
                    const attachmentsToDownload = selectedIds.length > 0
                        ? group.attachments.filter(a => selectedIds.includes(a.name_md5))
                        : group.attachments;
                    if (!attachmentsToDownload || attachmentsToDownload.length === 0) {
                        this.showToast('此邮件组没有可下载的附件', 'info');
                        return;
                    }
                    try {
                        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
                        const permissionStatus = await dirHandle.requestPermission({ mode: 'readwrite' });
                        if (permissionStatus !== 'granted') throw new Error('需要文件夹写入权限才能下载文件');
                        this.downloading = true;
                        this.showToast(`准备并发下载邮件组中的 ${attachmentsToDownload.length} 个附件...`, 'info');
                        this.totalTasksForProgress = attachmentsToDownload.length;
                        this.completedTasksForProgress = 0;
                        this.showProgress();
                        this.updateDownloadProgress();
                        const results = await this.downloadWithConcurrency(attachmentsToDownload, dirHandle);
                        const successCount = results.filter(r => !r.error).length;
                        const failCount = results.filter(r => r.error).length;
                        if (failCount > 0) {
                            this.showToast(`邮件组下载完成。成功: ${successCount}，失败: ${failCount}`, 'warning');
                        } else {
                            this.showToast(`邮件组中 ${successCount} 个附件下载成功。`, 'success');
                        }
                        this.updateStatus('下载处理完毕');
                    } catch (error) {
                        if (error.name === 'AbortError') {
                            this.showToast('已取消选择文件夹进行分组下载', 'info');
                        } else {
                            this.showToast(`邮件组下载过程中发生错误: ${error.message}`, 'error');
                        }
                    } finally {
                        this.downloading = false;
                        this.hideProgress();
                    }
                };
                // 动态更新下载按钮文本
                const updateDownloadBtnText = () => {
                    const checkboxes = groupContainer.querySelectorAll('input[type="checkbox"]');
                    const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
                    downloadBtn.textContent = selectedCount > 0 ? `下载选中(${selectedCount})` : '下载全部';
                };
                // 初始更新一次
                updateDownloadBtnText();
                // 给每个checkbox添加change事件
                const checkboxes = groupContainer.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => cb.addEventListener('change', updateDownloadBtnText));
            }

            groupContainer.appendChild(mailHeader);

            // 附件网格
            const attachmentsGrid = document.createElement('div');
            attachmentsGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 16px;
                padding: 16px;
                background: transparent;
            `;

            group.attachments.forEach(attachment => {
                const card = this.createAttachmentCard(attachment);
                attachmentsGrid.appendChild(card);
            });

            groupContainer.appendChild(attachmentsGrid);
            container.appendChild(groupContainer);
        });
    }

    formatTotalSize(attachments) {
        const totalBytes = attachments.reduce((sum, att) => sum + att.size, 0);
        return this.formatSize(totalBytes);
    }

    formatMailDate(timestamp) {
        // 调试时间戳问题

        if (!timestamp) return '时间未知';

        // 检查时间戳是否合理（不能是未来时间，且不能太久远）
        const now = Date.now() / 1000; // 当前时间戳（秒）
        const oneYearAgo = now - (365 * 24 * 60 * 60); // 一年前
        const oneYearLater = now + (365 * 24 * 60 * 60); // 一年后

        // 如果时间戳明显不合理，尝试修正
        if (timestamp > oneYearLater) {
            console.warn(`[formatMailDate] 检测到未来时间戳: ${timestamp}, 当前时间: ${now}`);
            // 可能是毫秒时间戳，尝试转换为秒
            if (timestamp > now * 1000) {
                timestamp = timestamp / 1000;
            }

            // 如果还是未来时间，使用当前时间
            if (timestamp > oneYearLater) {
                console.warn(`[formatMailDate] 时间戳仍然不合理，使用当前时间`);
                timestamp = now;
            }
        }

        const safeDate = this.createSafeDate(timestamp);
        if (!safeDate) {
            console.error(`[formatMailDate] 无法创建有效日期，时间戳: ${timestamp}`);
            return '时间解析失败';
        }

        const dateString = safeDate.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        return dateString;
    }

    showLoadingState(container = null) {
        // 移除已存在的加载状态
        const existingLoading = document.getElementById('attachment-loading');
        if (existingLoading) {
            existingLoading.remove();
        }

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'attachment-loading';
        loadingDiv.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--mask_white_095, rgba(255, 255, 255, 0.95));
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 32px;
            height: 32px;
            border: 2px solid var(--base_gray_010, rgba(22, 46, 74, 0.1));
            border-top: 2px solid var(--theme_primary, #0F7AF5);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 12px;
        `;

        const text = document.createElement('div');
        text.textContent = '正在加载附件...';
        text.style.cssText = `
            color: var(--base_gray_080, rgba(22, 30, 38, 0.8));
            font-size: 13px;
        `;

        loadingDiv.appendChild(spinner);
        loadingDiv.appendChild(text);

        // 使用传入的容器或默认容器
        const targetContainer = container || this.container;
        if (targetContainer) {
            targetContainer.style.position = 'relative';
            targetContainer.appendChild(loadingDiv);
        }

        // 添加动画样式（只添加一次）
        if (!document.getElementById('attachment-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'attachment-spinner-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    hideLoadingState() {
        const loadingDiv = document.getElementById('attachment-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    showError(message, container = null) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg_white_web, #FFFFFF);
            padding: 16px 20px;
            border-radius: 4px;
            box-shadow: var(--shadow_2, 0 4px 6px 0 rgba(19, 24, 29, 0.12));
            text-align: center;
            z-index: 1001;
            border-left: 3px solid var(--chrome_red, #F73116);
        `;

        const icon = document.createElement('div');
        icon.style.cssText = `
            color: var(--chrome_red, #F73116);
            font-size: 20px;
            margin-bottom: 8px;
        `;
        icon.textContent = '!';

        const text = document.createElement('div');
        text.textContent = message;
        text.style.cssText = `
            color: var(--base_gray_080, rgba(22, 30, 38, 0.8));
            font-size: 13px;
        `;

        errorDiv.appendChild(icon);
        errorDiv.appendChild(text);

        // 使用传入的容器或默认容器
        const targetContainer = container || this.container;
        if (targetContainer) {
            targetContainer.appendChild(errorDiv);
        }

        // 5秒后自动移除
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // 获取目标文件夹
    async getTargetFolder(baseDirHandle, attachment) {
        let currentDirHandle = baseDirHandle;

        switch (this.downloadSettings.folderStructure) {
            case 'date':
                // 按日期组织
                const timestamp = attachment.date || attachment.totime;
                if (timestamp) {
                    const date = new Date(typeof timestamp === 'number' && timestamp < 10000000000 ? timestamp * 1000 : timestamp);
                    if (!isNaN(date.getTime())) {
                        const dateStr = this.formatDate(date, this.downloadSettings.dateFormat);
                        currentDirHandle = await this.getOrCreateFolder(currentDirHandle, dateStr);

                        if (this.downloadSettings.createDateSubfolders) {
                            const timeStr = this.formatDate(date, 'HH-mm');
                            currentDirHandle = await this.getOrCreateFolder(currentDirHandle, timeStr);
                        }
                    }
                }
                break;

            case 'type':
                // 按文件类型组织
                const fileType = this.getFileType(attachment.name);
                currentDirHandle = await this.getOrCreateFolder(currentDirHandle, fileType);
                break;

            case 'mail':
                // 按邮件组织
                let folderName = attachment.mailSubject;
                if (this.downloadSettings.useMailId) {
                    folderName = `${folderName}_${attachment.mailId}`;
                }
                currentDirHandle = await this.getOrCreateFolder(currentDirHandle, folderName);
                break;

            case 'sender':
                // 按发件人组织
                const senderName = attachment.sender;
                currentDirHandle = await this.getOrCreateFolder(currentDirHandle, senderName);
                break;

            case 'flat':
                // 不创建子文件夹
                return currentDirHandle;
        }

        return currentDirHandle;
    }

    // 处理文件冲突
    async handleFileConflict(folderHandle, fileName) {
        try {
            // 检查文件是否存在
        try {
            await folderHandle.getFileHandle(fileName);
                // 文件已存在，需要处理冲突
                switch (this.downloadSettings.conflictResolution) {
            case 'rename':
                        return this.generateUniqueFileName(folderHandle, fileName);
            case 'overwrite':
                return fileName;
                    case 'skip':
                        throw new Error('文件已存在，跳过下载');
            default:
                        // 默认使用重命名
                        return this.generateUniqueFileName(folderHandle, fileName);
                }
            } catch (error) {
                // 文件不存在，直接返回原文件名
                return fileName;
            }
        } catch (error) {
            console.error('处理文件冲突时出错:', error);
            throw error;
        }
    }

    async generateUniqueFileName(folderHandle, fileName) {
        const ext = fileName.split('.').pop();
        const baseName = fileName.slice(0, -(ext.length + 1));
        let counter = 1;
        let newFileName = fileName;

        while (true) {
            try {
                await folderHandle.getFileHandle(newFileName);
                // 文件存在，尝试下一个名称
                newFileName = `${baseName}_${counter}.${ext}`;
                counter++;
        } catch (error) {
                // 文件不存在，可以使用这个名称
                return newFileName;
            }
        }
    }

    // 并发下载控制
    async downloadWithConcurrency(attachments, dirHandle) {

        // 预先分析命名策略（如果启用了auto模式）
        let namingStrategy = null;
        if (this.downloadSettings.fileNaming.validation &&
            this.downloadSettings.fileNaming.validation.enabled &&
            this.downloadSettings.fileNaming.validation.fallbackPattern === 'auto') {
            namingStrategy = this.analyzeAttachmentNaming(attachments, this.downloadSettings.fileNaming.validation.pattern);
        }

        const results = [];
        const tasks = attachments.map(attachment => ({
            attachment,
            status: 'pending',
            retries: 0,
            namingStrategy // 传递命名策略给每个任务
        }));

        this.totalTasksForProgress = tasks.length;
        this.completedTasksForProgress = 0;
        this.downloadStats.startTime = Date.now();
        this.downloadStats.completedSize = 0;
        this.downloadStats.totalSize = attachments.reduce((sum, att) => sum + (att.size || 0), 0);
        this.downloadStats.lastUpdate = Date.now();

        const maxConcurrent = this.downloadSettings.downloadBehavior.concurrentDownloads || 3;
        const activeDownloads = new Set();

        const processNext = async () => {
            const pendingTask = tasks.find(t => t.status === 'pending');
            if (!pendingTask) return;

            pendingTask.status = 'processing';
            const downloadPromise = this.downloadAttachment(pendingTask.attachment, dirHandle, pendingTask.namingStrategy)
                .then(() => {
                    pendingTask.status = 'completed';
                    results.push({ attachment: pendingTask.attachment, error: null });
                    this.completedTasksForProgress++;
                    this.updateDownloadProgress();
                    activeDownloads.delete(downloadPromise);
                    processNext();
                })
                .catch(error => {
                    console.error(`[DownloadWithConcurrency] Error downloading ${pendingTask.attachment.name}:`, error);
                    if (pendingTask.retries < this.retryCount) {
                        pendingTask.retries++;
                        pendingTask.status = 'pending';
                        activeDownloads.delete(downloadPromise);
                        processNext();
                    } else {
                        pendingTask.status = 'failed';
                        results.push({ attachment: pendingTask.attachment, error });
                        this.completedTasksForProgress++;
                        this.updateDownloadProgress();
                        activeDownloads.delete(downloadPromise);
                        processNext();
                    }
                });

            activeDownloads.add(downloadPromise);
        };

        // 启动初始下载任务
        for (let i = 0; i < Math.min(maxConcurrent, tasks.length); i++) {
            processNext();
        }

        // 等待所有下载完成
        while (activeDownloads.size > 0) {
            await Promise.race(activeDownloads);
        }

        return results;
    }

    // 动态调整并发数
    sanitizeFileName(fileName) {
        if (!fileName) return 'unnamed_file';

        return fileName
            .replace(/[\\/:*?"<>|]/g, '_')  // 替换Windows不允许的字符
            .replace(/\s+/g, ' ')           // 规范化空格
            .trim()                         // 去除首尾空格
            .substring(0, 200);             // 限制长度
    }

    // 解析命名模式，支持变量替换
    parseNamingPattern(pattern, attachment) {
        if (!pattern || !attachment) return '';

        return pattern
            .replace(/\{name\}/g, attachment.name || '')
            .replace(/\{fileName\}/g, attachment.name || '')
            .replace(/\{mailSubject\}/g, attachment.mailSubject || '')
            .replace(/\{subject\}/g, attachment.mailSubject || '')
            .replace(/\{sender\}/g, attachment.senderName || attachment.sender || '')
            .replace(/\{senderEmail\}/g, attachment.sender || '')
            .replace(/\{mailId\}/g, attachment.mailId || '')
            .replace(/\{attachmentId\}/g, attachment.fid || '')
            .replace(/\{date\}/g, attachment.totime ? this.formatDate(new Date(typeof attachment.totime === 'number' && attachment.totime < 10000000000 ? attachment.totime * 1000 : attachment.totime), 'YYYYMMDD') : '')
            .replace(/\{fileType\}/g, this.getFileExtension(attachment.name) || '')
            .replace(/\{size\}/g, attachment.size ? this.formatSize(attachment.size) : '');
    }

    // 智能分析附件命名模式
    analyzeAttachmentNaming(attachments, validationPattern) {
        if (!attachments || attachments.length === 0) {
            return { strategy: 'default', prefix: '' };
        }

        // 创建正则表达式
        let regex;
        try {
            regex = new RegExp(validationPattern);
        } catch (error) {
            console.error('[智能命名] 正则表达式错误:', error);
            return { strategy: 'default', prefix: '' };
        }

        // 分析哪些附件满足验证规则
        const validAttachments = attachments.filter(att => regex.test(att.name));
        const invalidAttachments = attachments.filter(att => !regex.test(att.name));


        // 情况1：只有1个附件，或者全部不满足正则
        if (attachments.length === 1 || validAttachments.length === 0) {
            return { strategy: 'mailSubject', prefix: '' };
        }

        // 情况2：数量大于2张，且大于1张满足匹配
        if (attachments.length >= 2 && validAttachments.length > 1) {
            const commonPrefix = this.findCommonPrefix(validAttachments.map(att => att.name));
            if (commonPrefix && commonPrefix.length > 0) {
                return { strategy: 'commonPrefix', prefix: commonPrefix };
            }
        }

        // 情况3：只有1个满足匹配
        if (validAttachments.length === 1) {
            const extractedPrefix = this.extractNamingPattern(validAttachments[0].name);
            if (extractedPrefix) {
                return { strategy: 'extractedPattern', prefix: extractedPrefix };
            }
        }

        // 默认策略
        return { strategy: 'mailSubject', prefix: '' };
    }

    // 查找多个文件名的公共前缀
    findCommonPrefix(fileNames) {
        if (!fileNames || fileNames.length === 0) return '';
        if (fileNames.length === 1) return '';

        let prefix = fileNames[0];
        for (let i = 1; i < fileNames.length; i++) {
            let j = 0;
            while (j < prefix.length && j < fileNames[i].length && prefix[j] === fileNames[i][j]) {
                j++;
            }
            prefix = prefix.substring(0, j);
            if (prefix.length === 0) break;
        }

        // 确保前缀以完整的分隔符结束，避免截断
        const separators = ['+', '-', '_', ' ', '.', '(', ')', '[', ']'];
        let lastSeparatorIndex = -1;
        for (let i = prefix.length - 1; i >= 0; i--) {
            if (separators.includes(prefix[i])) {
                lastSeparatorIndex = i;
                break;
            }
        }

        if (lastSeparatorIndex > 0) {
            prefix = prefix.substring(0, lastSeparatorIndex + 1);
        }

        return prefix;
    }

    // 从单个文件名中提取命名模式
    extractNamingPattern(fileName) {
        // 匹配模式：{任意?}{分隔符?}{数字}{分隔符?}{数字?}{分隔符?}{任意?}
        // 例如：作者+123456+123456789+作品1.jpg -> 作者+123456+123456789+

        const patterns = [
            // 模式1: 前缀+数字+数字+后缀 (如: 作者+123456+123456789+作品1.jpg)
            /^(.+?[+\-_\s])(\d+)([+\-_\s])(\d+)([+\-_\s]).*/,
            // 模式2: 前缀+数字+后缀 (如: 作者+123456+作品1.jpg)
            /^(.+?[+\-_\s])(\d+)([+\-_\s]).*/,
            // 模式3: 前缀+数字 (如: 作者123456作品1.jpg)
            /^(.+?)(\d{6,}).*/
        ];

        for (const pattern of patterns) {
            const match = fileName.match(pattern);
            if (match) {
                if (pattern === patterns[0]) {
                    // 包含两个数字的情况：返回到第二个数字后的分隔符
                    return match[1] + match[2] + match[3] + match[4] + match[5];
                } else if (pattern === patterns[1]) {
                    // 包含一个数字的情况：返回到数字后的分隔符
                    return match[1] + match[2] + match[3];
                } else {
                    // 简单数字匹配：尝试找到数字前的合理分割点
                    const beforeNumber = match[1];
                    const number = match[2];
                    // 寻找最后一个可能的分隔符
                    const separators = ['+', '-', '_', ' '];
                    for (let i = beforeNumber.length - 1; i >= 0; i--) {
                        if (separators.includes(beforeNumber[i])) {
                            return beforeNumber.substring(0, i + 1) + number;
                        }
                    }
                    return beforeNumber + number;
                }
            }
        }

        return '';
    }

    // 生成文件名（支持智能auto模式）
    generateFileName(attachment, fileNamingConfig, allAttachments = null, namingStrategy = null) {
        // 如果没有配置，直接返回清理后的原文件名
        if (!fileNamingConfig) {
            return this.sanitizeFileName(attachment.name);
        }

        let fileName = attachment.name;

        // 检查是否启用了验证功能
        if (fileNamingConfig.validation && fileNamingConfig.validation.enabled && fileNamingConfig.validation.pattern) {
            try {
                const regex = new RegExp(fileNamingConfig.validation.pattern);
                const isValid = regex.test(attachment.name);


                if (!isValid && fileNamingConfig.validation.fallbackPattern) {
                    // 验证失败，使用备用命名模式
                    if (fileNamingConfig.validation.fallbackPattern === 'auto') {
                        // 使用智能auto模式
                        return this.generateAutoFileName(attachment, fileNamingConfig, allAttachments, namingStrategy);
                    } else {
                        // 使用指定的模式
                        const baseName = this.parseNamingPattern(fileNamingConfig.validation.fallbackPattern, attachment);
                        const ext = this.getFileExtension(attachment.name);
                        fileName = ext ? `${baseName}.${ext}` : baseName;
                        return this.sanitizeFileName(fileName);
                    }
                }
            } catch (error) {
                console.error(`[文件名验证] 正则表达式错误: ${fileNamingConfig.validation.pattern}`, error);
            }
        }

        // 如果验证通过或未启用验证，使用常规命名规则
        const parts = [];

        if (fileNamingConfig.prefix) {
            parts.push(fileNamingConfig.prefix);
        }

        // 邮件日期
        if (fileNamingConfig.includeMailDate && attachment.totime) {
            const timestamp = attachment.totime;
            const date = new Date(typeof timestamp === 'number' && timestamp < 10000000000 ? timestamp * 1000 : timestamp);
            if (!isNaN(date.getTime())) {
                parts.push(this.formatDate(date, 'YYYYMMDD'));
            }
        }

        // 邮件主题
        if (fileNamingConfig.includeMailSubject && attachment.mailSubject) {
            const subject = attachment.mailSubject;
            parts.push(subject);
        }

        // 文件类型
        if (fileNamingConfig.includeFileType) {
            const fileType = this.getFileExtension(attachment.name);
            if (fileType) {
                parts.push(fileType);
            }
        }

        // 后缀
        if (fileNamingConfig.suffix) {
            parts.push(fileNamingConfig.suffix);
        }

        // 合并文件名
        if (parts.length > 0) {
            const ext = this.getFileExtension(attachment.name);
            const baseName = parts.join(fileNamingConfig.separator || '_');
            fileName = ext ? `${baseName}.${ext}` : baseName;
        }

        return this.sanitizeFileName(fileName);
    }

    // 生成智能auto模式文件名
    generateAutoFileName(attachment, fileNamingConfig, allAttachments, namingStrategy) {
        if (!namingStrategy) {
            // 如果没有提供策略，需要分析所有附件
            if (!allAttachments) {
                return this.sanitizeFileName(`${attachment.mailSubject}_${attachment.name}`);
            }
            namingStrategy = this.analyzeAttachmentNaming(allAttachments, fileNamingConfig.validation.pattern);
        }

        // 确保附件对象有预计算的字段（兼容性检查）
        if (!attachment.nameWithoutExt) {
            attachment.nameWithoutExt = this.removeExtension(attachment.name);
        }
        if (!attachment.ext) {
            attachment.ext = this.getFileExtension(attachment.name);
        }

        let baseName = '';

        switch (namingStrategy.strategy) {
            case 'mailSubject':
                // 使用邮件主题+文件名
                baseName = `${attachment.mailSubject}_${attachment.nameWithoutExt}`;
                break;

            case 'commonPrefix':
                // 使用公共前缀+原文件名去掉公共部分
                const remainingName = attachment.name.startsWith(namingStrategy.prefix)
                    ? attachment.name.substring(namingStrategy.prefix.length)
                    : attachment.name;
                const remainingWithoutExt = this.removeExtension(remainingName);
                baseName = `${namingStrategy.prefix}${remainingWithoutExt}`;
                break;

            case 'extractedPattern':
                // 使用提取的模式+原文件名的后缀部分
                // 尝试找到模式后的部分
                if (attachment.nameWithoutExt.startsWith(namingStrategy.prefix)) {
                    const suffix = attachment.nameWithoutExt.substring(namingStrategy.prefix.length);
                    baseName = `${namingStrategy.prefix}${suffix}`;
                } else {
                    // 如果不匹配，直接使用提取的模式
                    baseName = `${namingStrategy.prefix}${attachment.nameWithoutExt}`;
                }
                break;

            default:
                // 默认使用邮件主题+文件名
                baseName = `${attachment.mailSubject}_${attachment.nameWithoutExt}`;
                break;
        }

        const finalName = attachment.ext ? `${baseName}.${attachment.ext}` : baseName;
        return this.sanitizeFileName(finalName);
    }

    // 移除文件扩展名
    removeExtension(fileName) {
        return result;
    }

    // 获取或创建文件夹
    async getOrCreateFolder(parentHandle, folderName) {
        try {
            return await parentHandle.getDirectoryHandle(folderName, { create: true });
        } catch (error) {
            console.error(`Error creating folder ${folderName}:`, error);
            throw error;
        }
    }

    // 格式化日期
    formatDate(dateOrTimestamp, format) {
        if (arguments.length === 1) {
            const date = this.createSafeDate(dateOrTimestamp);
            if (!date) return '';
            return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
        }

        const pad = (num) => String(num).padStart(2, '0');

        // 如果传入的是时间戳，先转换为 Date 对象
        let date;
        if (dateOrTimestamp instanceof Date) {
            date = dateOrTimestamp;
        } else {
            date = this.createSafeDate(dateOrTimestamp);
        }

        // 确保 date 是一个有效的 Date 对象
        if (!date || isNaN(date.getTime())) {
            console.warn('formatDate 接收到无效的参数:', dateOrTimestamp);
            return '';
        }

        // 确保 format 参数存在
        if (!format || typeof format !== 'string') {
            console.warn('formatDate 接收到无效的 format 参数:', format);
            return '';
        }

        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
    }

    // 获取文件类型
    getFileExtension(fileName) {
        const match = fileName.match(/\.([^.]+)$/);
        return match ? match[1].toLowerCase() : null;
    }
    updateMailCount(filteredAttachments) {
        const attachmentList = filteredAttachments || this.attachments || [];
        const mailIdSet = new Set();
        let totalSize = 0;

        attachmentList.forEach(att => {
            if (att.mailId) mailIdSet.add(att.mailId);
            if (att.size) totalSize += att.size;
        });

        // 更新新的统计信息显示
        const countInfoElem = document.getElementById('attachment-count-info');
        if (countInfoElem) {
            const sizeText = totalSize > 0 ? ` · ${this.formatSize(totalSize)}` : '';
            countInfoElem.textContent = `${mailIdSet.size} 封邮件 · ${attachmentList.length} 个附件${sizeText}`;
        }

        // 兼容旧的统计元素（如果存在）
        const folderStatsElem = document.getElementById('folder-stats');
        if (folderStatsElem) {
            const sizeText = totalSize > 0 ? ` · ${this.formatSize(totalSize)}` : '';
            folderStatsElem.textContent = `${mailIdSet.size} 封邮件 · ${attachmentList.length} 个附件${sizeText}`;
        }

        const mailCountElem = document.getElementById('mail-count');
        if (mailCountElem) mailCountElem.textContent = `${mailIdSet.size} 封邮件`;
    }

    createAttachmentItem(attachment) {
        const item = document.createElement('div');
        item.className = 'attachment-item';
        item.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px;
            background: var(--bg_white_web, #FFFFFF);
            border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.08));
            border-radius: 8px;
            gap: 12px;
            transition: all 0.2s;
        `;

        // 文件图标
        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--theme_primary, #0F7AF5);
        `;
        icon.innerHTML = this.getFileIcon(attachment.name);

        // 文件信息
        const info = document.createElement('div');
        info.style.cssText = `
            flex: 1;
            min-width: 0;
        `;
        info.innerHTML = `
            <div style="
                font-size: 14px;
                color: var(--base_gray_100, #13181D);
                font-weight: 500;
                margin-bottom: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            ">${attachment.name}</div>
            <div style="
                font-size: 12px;
                color: var(--base_gray_030, rgba(25, 38, 54, 0.3));
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <span>${this.formatSize(attachment.size)}</span>
                <span>•</span>
                <span>${attachment.mailSubject}</span>
            </div>
        `;

        // 下载按钮
        const downloadBtn = document.createElement('button');
        downloadBtn.style.cssText = `
            padding: 6px 12px;
            border: 1px solid var(--base_gray_010, rgba(22, 46, 74, 0.08));
            border-radius: 6px;
            background: var(--bg_white_web, #FFFFFF);
            color: var(--base_gray_100, #13181D);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        downloadBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2v8m0 0l3-3m-3 3L5 7m-2 4v2h10v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            下载
        `;
        downloadBtn.onclick = () => this.downloadAttachment(attachment);

        // 添加悬停效果
        item.onmouseover = () => {
            item.style.borderColor = 'var(--theme_primary, #0F7AF5)';
            item.style.boxShadow = '0 2px 8px 0 rgba(15,122,245,0.08)';
        };
        item.onmouseout = () => {
            item.style.borderColor = 'var(--base_gray_010, rgba(22, 46, 74, 0.08))';
            item.style.boxShadow = 'none';
        };

        downloadBtn.onmouseover = () => {
            downloadBtn.style.borderColor = 'var(--theme_primary, #0F7AF5)';
            downloadBtn.style.color = 'var(--theme_primary, #0F7AF5)';
        };
        downloadBtn.onmouseout = () => {
            downloadBtn.style.borderColor = 'var(--base_gray_010, rgba(22, 46, 74, 0.08))';
            downloadBtn.style.color = 'var(--base_gray_100, #13181D)';
        };

        item.appendChild(icon);
        item.appendChild(info);
        item.appendChild(downloadBtn);

        return item;
    }


    updateAttachmentList(attachments) {
        if (!this.attachmentList) return;

        this.attachmentList.innerHTML = '';

        // 更新统计信息
        this.updateMailCount(attachments);

        if (attachments.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.style.cssText = `
                text-align: center;
                padding: 40px 20px;
                color: var(--base_gray_030, rgba(25, 38, 54, 0.3));
                font-size: 14px;
            `;
            emptyState.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 16px;">
                    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div>暂无附件</div>
            `;
            this.attachmentList.appendChild(emptyState);
            return;
        }

        attachments.forEach(attachment => {
            const item = this.createAttachmentItem(attachment);
            this.attachmentList.appendChild(item);
        });
    }

    toggleAttachmentManager() {
        if (this.isViewActive) {
            this.hideAttachmentView();
        } else {
            this.showAttachmentView();
        }
    }

    async showAttachmentView() {

        // 创建独立的覆盖面板
        this.createOverlayPanel();

        // 标记视图为激活状态
        this.isViewActive = true;

        // 加载附件数据
        await this.loadAttachments();

        // 添加全局键盘事件监听器
        this.addGlobalKeyListener();
    }

    hideAttachmentView() {

        try {
            // 标记视图为非激活状态（优先设置，防止重复调用）
            this.isViewActive = false;

            // 清理附件管理器状态
            this.cleanupAttachmentManager();

            // 移除覆盖面板
            this.removeOverlayPanel();

            // 确保页面状态完全恢复
            this.restorePageState();

        } catch (error) {
            console.error('[HideAttachmentView] 隐藏过程中出现错误:', error);

            // 出错时执行强制清理
            this.forceCleanup();

            // 显示错误提示（如果Toast功能还可用）
            try {
                this.showToast('关闭附件视图时出现问题，已强制清理', 'warning', 3000);
            } catch (toastError) {
                console.error('[HideAttachmentView] 无法显示错误提示:', toastError);
            }
        }
    }

    cleanupAttachmentManager() {

        // 清理选中状态
        this.selectedAttachments.clear();

        // 清理智能下载按钮引用
        this.smartDownloadButton = null;

        // 清理可能的定时器
        if (this.downloadProgressTimer) {
            clearInterval(this.downloadProgressTimer);
            this.downloadProgressTimer = null;
        }

        // 移除全局键盘事件监听器
        this.removeGlobalKeyListener();

        // 清理可能的事件监听器
        const attachmentElements = document.querySelectorAll('[data-attachment-manager]');
        attachmentElements.forEach(element => {
            element.removeAttribute('data-attachment-manager');
        });

        // 移除可能添加的全局样式
        const customStyles = document.querySelectorAll('style[data-attachment-manager]');
        customStyles.forEach(style => style.remove());

        // 清理可能的进度条和状态显示
        this.hideProgress();

        // 清理可能的Toast消息
        const toasts = document.querySelectorAll('.attachment-toast');
        toasts.forEach(toast => toast.remove());

        // 清理可能的菜单和弹窗
        const menus = document.querySelectorAll('.attachment-menu, .attachment-dialog');
        menus.forEach(menu => menu.remove());

        // 重置内部状态
        this.currentAttachments = [];
        this.filteredAttachments = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;

    }

    createOverlayPanel() {

        // 如果面板已存在，先移除
        this.removeOverlayPanel();

        // 创建覆盖面板容器
        this.overlayPanel = document.createElement('div');
        this.overlayPanel.id = 'attachment-manager-overlay';
        this.overlayPanel.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #fff;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // 添加键盘事件监听器（ESC键关闭面板）
        this.overlayPanel.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hideAttachmentView();
            }
        });

        // 确保面板可以接收键盘事件
        this.overlayPanel.tabIndex = -1;

        // 创建顶部工具栏
        const toolbar = document.createElement('div');
        toolbar.className = 'attachment-overlay-toolbar';
        toolbar.style.cssText = `
            height: 56px;
            background: #fff;
            border-bottom: 1px solid #e5e5e5;
            display: flex;
            align-items: center;
            padding: 0 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            flex-shrink: 0;
        `;

        // 左侧：返回按钮和标题
        const leftSection = document.createElement('div');
        leftSection.style.cssText = `
            display: flex;
            align-items: center;
            flex: 1;
        `;

        const backBtn = document.createElement('button');
        backBtn.style.cssText = `
            background: none;
            border: none;
            padding: 8px;
            margin-right: 12px;
            cursor: pointer;
            border-radius: 4px;
            display: flex;
            align-items: center;
            color: #666;
            transition: background-color 0.2s;
        `;
        backBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
        `;
        backBtn.title = '返回邮件列表';
        backBtn.addEventListener('click', () => this.hideAttachmentView());
        backBtn.addEventListener('mouseenter', () => {
            backBtn.style.backgroundColor = '#f5f5f5';
        });
        backBtn.addEventListener('mouseleave', () => {
            backBtn.style.backgroundColor = 'transparent';
        });

        const title = document.createElement('h1');
        title.style.cssText = `
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #333;
        `;
        title.textContent = this.getFolderDisplayName();

        const subtitle = document.createElement('span');
        subtitle.id = 'attachment-count-info';
        subtitle.style.cssText = `
            margin-left: 12px;
            font-size: 14px;
            color: #666;
        `;
        subtitle.textContent = '加载中...';

        leftSection.appendChild(backBtn);
        leftSection.appendChild(title);
        leftSection.appendChild(subtitle);

        // 中间：操作按钮（已移除筛选和排序按钮）
        const middleSection = document.createElement('div');
        middleSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        // 右侧：操作按钮组
        const rightSection = document.createElement('div');
        rightSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        // 比对按钮
        const compareBtn = document.createElement('button');
        compareBtn.style.cssText = `
            padding: 0 16px;
            height: 32px;
            background: #fff;
            color: #666;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        compareBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 3h5l2 2h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            比对
        `;
        compareBtn.addEventListener('click', () => this.showCompareDialog());
        compareBtn.addEventListener('mouseenter', () => {
            compareBtn.style.backgroundColor = '#f5f5f5';
            compareBtn.style.borderColor = '#40a9ff';
        });
        compareBtn.addEventListener('mouseleave', () => {
            compareBtn.style.backgroundColor = '#fff';
            compareBtn.style.borderColor = '#d9d9d9';
        });

        // 下载按钮
        const downloadBtn = document.createElement('button');
        downloadBtn.style.cssText = `
            padding: 0 24px;
            height: 32px;
            background: #0F7AF5;
            color: #fff;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px 0 rgba(15,122,245,0.08);
        `;
        downloadBtn.innerHTML = `下载全部`;
        downloadBtn.addEventListener('click', () => {
            if (this.selectedAttachments.size > 0) {
                this.downloadSelected();
            } else {
                this.downloadAll();
            }
        });
        downloadBtn.addEventListener('mouseenter', () => {
            downloadBtn.style.backgroundColor = '#40a9ff';
        });
        downloadBtn.addEventListener('mouseleave', () => {
            downloadBtn.style.backgroundColor = '#0F7AF5';
        });

        this.smartDownloadButton = downloadBtn; // 保存引用

        rightSection.appendChild(compareBtn);
        rightSection.appendChild(downloadBtn);

        toolbar.appendChild(leftSection);
        toolbar.appendChild(rightSection);

        // 创建内容区域
        const content = document.createElement('div');
        content.className = 'attachment-overlay-content';
        content.style.cssText = `
            flex: 1;
            overflow: auto;
            background: #f5f5f5;
        `;
        content.innerHTML = this.createNativeAttachmentView();

        this.overlayPanel.appendChild(toolbar);
        this.overlayPanel.appendChild(content);

        // 添加到页面
        document.body.appendChild(this.overlayPanel);

        // 聚焦面板以确保键盘事件正常工作
        setTimeout(() => {
            this.overlayPanel.focus();
        }, 100);

    }

    removeOverlayPanel() {

        // 移除覆盖面板
        if (this.overlayPanel) {
            // 先移除所有事件监听器
            const allElements = this.overlayPanel.querySelectorAll('*');
            allElements.forEach(element => {
                // 克隆元素以移除所有事件监听器
                const newElement = element.cloneNode(true);
                if (element.parentNode) {
                    element.parentNode.replaceChild(newElement, element);
                }
            });

            // 移除面板
            this.overlayPanel.remove();
            this.overlayPanel = null;
        }

        // 移除可能遗留的覆盖面板
        const existingOverlays = document.querySelectorAll('#attachment-manager-overlay');
        existingOverlays.forEach(overlay => overlay.remove());

        // 清理引用
        this.smartDownloadButton = null;

        // 确保页面滚动恢复正常
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';

        // 移除可能的高z-index元素
        const highZIndexElements = document.querySelectorAll('[style*="z-index: 10000"], [style*="z-index: 99999"]');
        highZIndexElements.forEach(element => {
            if (element.id === 'attachment-manager-overlay' ||
                element.classList.contains('attachment-manager-panel') ||
                element.classList.contains('attachment-toast') ||
                element.classList.contains('attachment-menu') ||
                element.classList.contains('attachment-dialog')) {
                element.remove();
            }
        });

    }

    forceCleanup() {

        try {
            // 强制移除所有相关元素
            const elementsToRemove = [
                '#attachment-manager-overlay',
                '.attachment-manager-panel',
                '.attachment-toast',
                '.attachment-menu',
                '.attachment-dialog',
                '[data-attachment-manager]'
            ];

            elementsToRemove.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => element.remove());
            });

            // 重置所有引用
            this.overlayPanel = null;
            this.smartDownloadButton = null;
            this.selectedAttachments.clear();
            this.currentAttachments = [];
            this.filteredAttachments = [];
            this.isViewActive = false;

            // 清理定时器
            if (this.downloadProgressTimer) {
                clearInterval(this.downloadProgressTimer);
                this.downloadProgressTimer = null;
            }

            // 移除全局键盘事件监听器
            this.removeGlobalKeyListener();

            // 恢复页面样式
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';

        } catch (error) {
            console.error('[ForceCleanup] 强制清理时出现错误:', error);
        }
    }

    restorePageState() {

        try {
            // 恢复页面滚动
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            document.documentElement.style.position = '';
            document.body.style.position = '';

            // 移除可能的遮罩层
            const overlays = document.querySelectorAll('[style*="position: fixed"][style*="z-index"]');
            overlays.forEach(overlay => {
                if (overlay.id === 'attachment-manager-overlay' ||
                    overlay.classList.contains('attachment-manager-panel') ||
                    overlay.classList.contains('attachment-overlay')) {
                    overlay.remove();
                }
            });

            // 确保原生页面元素可见和可交互
            const mainApp = document.querySelector('#mailMainApp, .mail-main-app, .main-content');
            if (mainApp) {
                mainApp.style.display = '';
                mainApp.style.visibility = '';
                mainApp.style.pointerEvents = '';
            }

            // 恢复工具栏状态
            const toolbar = document.querySelector('.xmail-ui-ellipsis-toolbar');
            if (toolbar) {
                toolbar.style.display = '';
                toolbar.style.visibility = '';
                toolbar.style.pointerEvents = '';
            }

            // 重新启用页面交互
            document.body.style.pointerEvents = '';

            // 触发窗口resize事件，确保页面布局正确
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 100);

        } catch (error) {
            console.error('[RestorePageState] 恢复页面状态时出现错误:', error);
        }
    }

    addGlobalKeyListener() {
        // 移除可能存在的旧监听器
        this.removeGlobalKeyListener();

        // 创建新的键盘事件处理器
        this.globalKeyHandler = (e) => {
            if (this.isViewActive && e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.hideAttachmentView();
            }
        };

        // 添加全局键盘事件监听器
        document.addEventListener('keydown', this.globalKeyHandler, true);
    }

    removeGlobalKeyListener() {
        if (this.globalKeyHandler) {
            document.removeEventListener('keydown', this.globalKeyHandler, true);
            this.globalKeyHandler = null;
        }
    }

    updateSmartDownloadButton() {
        if (!this.smartDownloadButton) return;

        const selectedCount = this.selectedAttachments.size;

        if (selectedCount > 0) {
            // 有选中项时显示"下载选中"
            const textElement = this.smartDownloadButton.querySelector('svg') ?
                this.smartDownloadButton.childNodes[this.smartDownloadButton.childNodes.length - 1] :
                this.smartDownloadButton;

            if (textElement.nodeType === Node.TEXT_NODE || textElement.textContent) {
                if (this.smartDownloadButton.querySelector('svg')) {
                    // 覆盖面板中的按钮（有SVG图标）
                    textElement.textContent = `下载选中 (${selectedCount})`;
                } else {
                    // 原始工具栏中的按钮
                    this.smartDownloadButton.innerHTML = `下载选中 (${selectedCount})`;
                }
            }
            this.smartDownloadButton.title = `下载选中的 ${selectedCount} 个附件`;
        } else {
            // 没有选中项时显示"下载全部"
            const textElement = this.smartDownloadButton.querySelector('svg') ?
                this.smartDownloadButton.childNodes[this.smartDownloadButton.childNodes.length - 1] :
                this.smartDownloadButton;

            if (textElement.nodeType === Node.TEXT_NODE || textElement.textContent) {
                if (this.smartDownloadButton.querySelector('svg')) {
                    // 覆盖面板中的按钮（有SVG图标）
                    textElement.textContent = '下载全部';
                } else {
                    // 原始工具栏中的按钮
                    this.smartDownloadButton.innerHTML = '下载全部';
                }
            }
            this.smartDownloadButton.title = '下载全部附件';
        }
    }



    createNativeAttachmentView() {
        return `
            <div class="mail-list-page-items" style="border: none; box-shadow: none;">
                <div class="mail-list-page-items-inner" style="border: none; border-radius: 0; box-shadow: none; margin: 0;">
                    <!-- 内容区域 -->
                    <div class="xmail-ui-float-scroll" style="border: none;">
                        <div class="ui-float-scroll-body" tabindex="0" style="padding: 0;">
                            <div id="attachment-content-area" style="padding: 12px 16px;">
                                <!-- 附件列表将在这里显示 -->
                                <div style="text-align: center; padding: 24px; color: var(--base_gray_050, #888);">
                                    正在加载附件...
                                </div>
                            </div>
                        </div>
                        <div class="xmail-ui-float-scroll-bar ui-float-scroll-bar-vertical ui-float-scroll-bar-disabled"></div>
                    </div>

                    <!-- 进度条区域 -->
                    <div id="attachment-progress-area" style="display: none; border: none; margin: 0;"></div>
                </div>
            </div>
        `;
    }



    displayAttachments(attachments) {
        // 在覆盖面板中查找容器
        let container = document.querySelector('#attachment-manager-overlay #attachment-content-area');

        // 如果覆盖面板中没有找到，尝试在原页面中查找（向后兼容）
        if (!container) {
            container = document.querySelector('#attachment-content-area');
        }

        if (!container) {
            console.error('附件内容区域未找到 (#attachment-content-area)');
            this.showError('无法显示附件，请重试。', document.body);
            return;
        }

        container.innerHTML = ''; // 清空之前的内容
        this.showLoadingState(container);

        setTimeout(() => {
            if (!attachments || attachments.length === 0) {
                this.hideLoadingState();
                container.innerHTML = `<div style="text-align: center; padding: 32px; color: #888;">未找到符合条件的附件。</div>`;

                // 更新统计信息为空状态
                this.updateMailCount([]);
                return;
            }

            const groupedAttachments = this.groupAttachmentsByMail(attachments);
            this.hideLoadingState();
            this.displayGroupedAttachments(groupedAttachments, container);

            // 更新统计信息
            this.updateMailCount(attachments);

            // 初始化智能下载按钮状态
            this.updateSmartDownloadButton();

        }, 100);
    }

    createAndInjectButton() {
        const attempts = 5;
        const interval = 1000;
        let currentAttempt = 0;

        const tryInject = () => {
            const toolbar = document.querySelector('.xmail-ui-ellipsis-toolbar .ui-ellipsis-toolbar-btns');
            if (toolbar) {
                const existingButton = toolbar.querySelector('#attachment-downloader-btn');
                if (existingButton) return;

                const button = document.createElement('button');
                button.id = 'attachment-downloader-btn';
                button.className = 'xmail-ui-btn ui-btn-size32 ui-btn-border ui-btn-them-clear-gray';
                button.style.marginLeft = '8px';
                button.innerHTML = `
                    <span class="xmail-ui-icon ui-btn-icon" style="width: 16px; height: 16px; margin-right: 4px;">
                        <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M768 810.7H256c-44.2 0-80-35.8-80-80V547.2c0-17.7 14.3-32 32-32s32 14.3 32 32v183.5c0 8.8 7.2 16 16 16h512c8.8 0 16-7.2 16-16V547.2c0-17.7 14.3-32 32-32s32 14.3 32 32v183.5c0 44.2-35.8 80-80 80zM480 614.4c-8.2 0-16.4-3.1-22.6-9.4L234.8 382.3c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L480 536.7l199.9-199.7c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3L502.6 605c-6.3 6.3-14.4 9.4-22.6 9.4z" fill="#2c2c2c"></path><path d="M512 646.4c-17.7 0-32-14.3-32-32V172.8c0-17.7 14.3-32 32-32s32 14.3 32 32v441.6c0 17.7-14.3 32-32 32z" fill="#2c2c2c"></path></svg>
                    </span>
                    <span>附件下载</span>
                `;
                button.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleAttachmentManager();
                };

                toolbar.appendChild(button);
            } else {
                currentAttempt++;
                if (currentAttempt < attempts) {
                    setTimeout(tryInject, interval);
                } else {
                    console.error('[Downloader] 注入按钮失败：无法找到指定的工具栏。');
                }
            }
        };

        tryInject();
    }
}

class QQMailDownloader {
    constructor() {
        this.sid = null;
        this.headers = this._getDefaultHeaders();
        this.attachmentManager = null;
    }

    _getDefaultHeaders() {
        return {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
            'priority': 'u=0, i',
            'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'iframe',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1'
        };
    }

    async fetchAttachment(attachment) {

        try {
            // 构建初始URL
            const downloadUrlObj = new URL(attachment.download_url, MAIL_CONSTANTS.BASE_URL);
            const params = new URLSearchParams(downloadUrlObj.search);
            const pageUrl = new URL(window.location.href);
            const sid = pageUrl.searchParams.get('sid') || this.sid;
            const initialUrl = `${MAIL_CONSTANTS.BASE_URL}${MAIL_CONSTANTS.API_ENDPOINTS.ATTACH_DOWNLOAD}?mailid=${params.get('mailid')}&fileid=${params.get('fileid')}&name=${encodeURIComponent(attachment.name)}&sid=${sid}`;

            let finalDownloadUrl = null;

            try {
                // 尝试获取重定向URL
                finalDownloadUrl = await this._fetchRedirectUrl(initialUrl, attachment.name);
            } catch (redirectError) {
                console.warn(`[FetchAttachment] Redirect failed for ${attachment.name}, trying direct download:`, redirectError.message);

                // 回退方案1: 尝试直接使用原始下载URL
                if (attachment.download_url) {
                    let directUrl = attachment.download_url;
                    if (!directUrl.startsWith('http')) {
                        directUrl = MAIL_CONSTANTS.BASE_URL + directUrl;
                    }
                    // 确保包含SID参数
                    if (!directUrl.includes('sid=')) {
                        const separator = directUrl.includes('?') ? '&' : '?';
                        directUrl += `${separator}sid=${sid}`;
                    }
                    finalDownloadUrl = directUrl;
                } else {
                    // 回退方案2: 使用初始URL
                    finalDownloadUrl = initialUrl;
                }
            }

            // 获取文件内容
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: finalDownloadUrl,
                    headers: {
                        ...this.headers,
                        'Referer': MAIL_CONSTANTS.BASE_URL + '/'
                    },
                    responseType: 'blob',
                    onload: function(response) {
                        if (response.status === 200) {
                            resolve(response);
                        } else {
                            reject(new Error(`Failed to fetch content: ${response.status} ${response.statusText}`));
                        }
                    },
                    onerror: function(error) {
                        reject(error);
                    }
                });
            });

            return response;
            } catch (error) {
            console.error(`[FetchAttachment] Error fetching ${attachment.name}:`, error);
                throw error;
            }
        }

    async _fetchRedirectUrl(initialUrl, attachmentName) {

        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: initialUrl,
                    headers: {
                        ...this.headers,
                        'Referer': MAIL_CONSTANTS.BASE_URL + '/'
                    },
                    onload: function(response) {
                        if (response.status === 200) {
                            resolve(response);
                        } else {
                            reject(new Error(`Failed to fetch redirect: ${response.status}`));
                        }
                    },
                    onerror: function(error) {
                        reject(error);
                    }
                });
            });


            // 方法1: 检查是否已经重定向到最终URL
            if (response.finalUrl && response.finalUrl !== initialUrl) {
                return response.finalUrl;
            }

            // 方法2: 从响应中提取JavaScript重定向URL
            const responseText = response.responseText;

            // 尝试多种JavaScript重定向模式
            const redirectPatterns = [
                /window\.location\.href\s*=\s*['"]([^'"]+)['"]/,
                /location\.href\s*=\s*['"]([^'"]+)['"]/,
                /window\.location\s*=\s*['"]([^'"]+)['"]/,
                /location\s*=\s*['"]([^'"]+)['"]/,
                /window\.location\.replace\(['"]([^'"]+)['"]\)/,
                /location\.replace\(['"]([^'"]+)['"]\)/,
                /document\.location\s*=\s*['"]([^'"]+)['"]/,
                /document\.location\.href\s*=\s*['"]([^'"]+)['"]/
            ];

            for (const pattern of redirectPatterns) {
                const match = responseText.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            // 方法3: 查找HTML meta refresh重定向
            const metaRefreshMatch = responseText.match(/<meta[^>]+http-equiv=['"]refresh['"][^>]+content=['"][^'"]*url=([^'"]+)['"]/i);
            if (metaRefreshMatch && metaRefreshMatch[1]) {
                return metaRefreshMatch[1];
            }

            // 方法4: 查找可能的下载链接
            const downloadLinkPatterns = [
                /href=['"]([^'"]*download[^'"]*)['"]/i,
                /url\(['"]([^'"]*download[^'"]*)['"]\)/i,
                /(https?:\/\/[^'">\s]+download[^'">\s]*)/i
            ];

            for (const pattern of downloadLinkPatterns) {
                const match = responseText.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            // 方法5: 如果响应是JSON格式，尝试解析
            try {
                const jsonData = JSON.parse(responseText);
                if (jsonData.url || jsonData.download_url || jsonData.redirect_url) {
                    const foundUrl = jsonData.url || jsonData.download_url || jsonData.redirect_url;
                    return foundUrl;
                }
            } catch (e) {
                // 不是JSON格式，继续其他方法
            }

            // 如果所有方法都失败，记录详细信息并抛出错误
            console.error(`[FetchRedirectUrl] No redirect URL found for ${attachmentName}`);
            console.error(`[FetchRedirectUrl] Response details:`, {
                status: response.status,
                finalUrl: response.finalUrl,
                responseTextPreview: responseText.substring(0, 1000)
            });

            throw new Error(`No redirect URL found in response for ${attachmentName}`);

        } catch (error) {
            console.error(`[FetchRedirectUrl] Error fetching redirect for ${attachmentName}:`, error);
            throw error;
        }
    }

    async init() {
        this.sid = this.getSid();
        if (!this.sid) {
            console.error('[QQMailDownloader] No SID found');
            return;
        }

        // 等待页面加载完成
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        if (window.location.pathname.includes("/login")) return;

        // 处理主页面
        this.attachmentManager = new AttachmentManager(this);
        // 设置全局引用，供HTML中的onclick使用
        window.attachmentManager = this.attachmentManager;
    }



    getSid() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('sid') || this.getCookie('xm_sid') || '';
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }

    cleanup() {
        if (this.manager) {
            if (this.manager.container) {
                this.manager.container.remove();
            }
            this.manager = null;
        }
        // Remove hashchange listener
        if (this.boundFolderChangeHandler) {
            window.removeEventListener('hashchange', this.boundFolderChangeHandler, false);
            this.boundFolderChangeHandler = null;
        }
        this.isLoggedIn = false;
        this.currentFolderId = null;
        this.sid = null;
    }

    getCurrentFolderId() {

        // 方法1: 从URL参数中获取
        const urlParams = new URLSearchParams(window.location.search);
        const folderid = urlParams.get('folderid');
        if (folderid) {
            return folderid;
        }

        // 方法2: 从hash中获取 folderid=xxx 格式
        const hash = window.location.hash;
        const folderMatch = hash.match(/folderid=([^&]+)/);
        if (folderMatch) {
            return folderMatch[1];
        }

        // 方法3: 从hash中获取 /list/xxx 格式
        const listMatch = hash.match(/\/list\/(\d+)/);
        if (listMatch) {
            return listMatch[1];
        }

        // 方法4: 从hash中获取 #/folder/xxx 格式
        const folderPathMatch = hash.match(/\/folder\/(\d+)/);
        if (folderPathMatch) {
            return folderPathMatch[1];
        }

        // 方法5: 从完整URL路径中获取
        const pathname = window.location.pathname;
        const pathMatch = pathname.match(/\/folder\/(\d+)/);
        if (pathMatch) {
            return pathMatch[1];
        }

        // 方法6: 尝试从页面DOM中获取当前文件夹信息
        try {
            // 查找可能包含文件夹信息的元素
            const folderElements = document.querySelectorAll('[data-folderid], [data-folder-id], .folder-item.selected, .folder-selected');
            for (const element of folderElements) {
                const dataFolderId = element.getAttribute('data-folderid') || element.getAttribute('data-folder-id');
                if (dataFolderId) {
                    return dataFolderId;
                }
            }
        } catch (error) {
            console.warn('[getCurrentFolderId] 从DOM获取文件夹ID失败:', error);
        }

        // 方法7: 检查是否在特定的邮箱页面
        if (window.location.href.includes('/mail/')) {
            // 可能在邮件详情页，尝试从URL中提取
            const mailMatch = window.location.href.match(/\/mail\/(\d+)/);
            if (mailMatch) {
                return '1'; // 默认收件箱
            }
        }

        // 默认返回收件箱
        return '1';
    }

    // 专门的邮件数据获取函数，根据 fetch.md 文档封装
    async fetchMailList(folderId, pageNow = 0, pageSize = 50) {
        const r = Date.now(); // 时间戳
        const requestUrl = `${MAIL_CONSTANTS.BASE_URL}${MAIL_CONSTANTS.API_ENDPOINTS.MAIL_LIST}?r=${r}&sid=${this.sid}&dir=${folderId}&page_now=${pageNow}&page_size=${pageSize}&sort_type=1&sort_direction=1&func=1&tag=&enable_topmail=true`;


        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: requestUrl,
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
                    'lang': 'zh-CN',
                    'priority': 'u=1, i',
                    'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'Referer': MAIL_CONSTANTS.BASE_URL + '/',
                    'Origin': MAIL_CONSTANTS.BASE_URL
                },
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);

                            // 检查响应格式
                            if (data && data.head && data.head.ret === 0) {
                                if (data.body && data.body.list) {
                                    resolve({
                                        mails: data.body.list,
                                        total: data.body.total_num || data.body.list.length,
                                        unread: data.body.unread_num || 0
                                    });
                                } else {
                                    console.warn(`[fetchMailList] No mail list in response body`);
                                    resolve({ mails: [], total: 0, unread: 0 });
                                }
                            } else {
                                const errorMsg = data && data.head ? data.head.msg : 'Unknown error';
                                reject(new Error(`API error: ${errorMsg}`));
                            }
                        } catch (parseError) {
                            console.error(`[fetchMailList] JSON parse error:`, parseError);
                            console.error(`[fetchMailList] Raw response:`, response.responseText);
                            reject(new Error('响应不是有效的JSON格式'));
                        }
                    } else {
                        reject(new Error(`HTTP error: ${response.status} - ${response.statusText}`));
                    }
                },
                onerror: function(error) {
                    console.error(`[fetchMailList] Network error:`, error);
                    reject(error);
                }
            });
        });
    }

    // 更新 getAllMails 方法使用新的 fetchMailList 函数，支持分页获取所有邮件
    async getAllMails(folderId) {
        try {

            const allMails = [];
            let page = 0;
            let hasMore = true;
            let totalMails = 0;
            const pageSize = 50;

            while (hasMore) {
                try {
                    const result = await this.fetchMailList(folderId, page, pageSize);

                    if (!result.mails || result.mails.length === 0) {
                        hasMore = false;
                        continue;
                    }

                    // 记录总邮件数（从第一页获取）
                    if (page === 0) {
                        totalMails = result.total;
                    }

                    allMails.push(...result.mails);

                    // 检查是否已获取所有邮件
                    if (allMails.length >= totalMails || result.mails.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                        // 添加小延迟，避免请求过快
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                } catch (pageError) {
                    console.error(`[QQMailDownloader] Error fetching page ${page + 1}:`, pageError);
                    // 如果是第一页就失败，抛出错误
                    if (page === 0) {
                        throw pageError;
                    }
                    // 否则停止获取，返回已获取的邮件
                    console.warn(`[QQMailDownloader] Stopping at page ${page + 1} due to error, returning ${allMails.length} mails`);
                    hasMore = false;
                }
            }

            return allMails;

        } catch (error) {
            console.error('[QQMailDownloader] Error getting all mails:', error);
            throw error;
        }
    }
}

// 初始化下载器
let downloader = null;
const observer = new MutationObserver(mutationCallback);

function initDownloader() {
    if (downloader && typeof downloader.cleanup === 'function') {
        try {
            downloader.cleanup();
        } catch (e) {
            console.error('[GlobalInit] Error during cleanup of old instance:', e);
        }
        downloader = null; // Ensure it's null before attempting re-initialization
    }

    try {
        const newDownloaderInstance = new QQMailDownloader();
        // 调用 init 方法
        newDownloaderInstance.init().then(() => {
        }).catch(error => {
            console.error('[GlobalInit] Failed to initialize QQMailDownloader:', error);
        });

        downloader = newDownloaderInstance;
        observer.disconnect();

    } catch (error) {
        console.error('[GlobalInit] Failed to construct QQMailDownloader:', error);
        downloader = null;
    }
}

function mutationCallback(mutationsList, obs) {
    if (document.querySelector('#mailMainApp')) {
        if (!downloader) {
           initDownloader();
        }
    }
}

function startObserver() {
    try {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } catch (e) {
    }
}

// Entry point for the script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector('#mailMainApp')) {
            initDownloader();
        } else {
            startObserver();
        }
    });
} else {
    if (document.querySelector('#mailMainApp')) {
        initDownloader();
    } else {
        startObserver();
    }
}

})();
