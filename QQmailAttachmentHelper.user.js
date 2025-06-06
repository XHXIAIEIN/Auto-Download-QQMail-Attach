// ==UserScript==
// @name         QQ邮箱附件下载助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  QQ邮箱附件下载助手，支持批量下载、筛选、重命名等功能
// @author       You
// @match        https://wx.mail.qq.com/*
// @connect      mail.qq.com
// @connect      wx.mail.qq.com
// @connect      gzc-dfsdown.mail.ftn.qq.com
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict'

    const STYLES = `
    .ah-panel{position:fixed;right:40px;top:60px;width:640px;max-height:80vh;background:#fff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;z-index:10000;}
    .ah-header{display:flex;justify-content:space-between;align-items:center;padding:20px;border-bottom:1px solid #e5e7eb;}
    .ah-title h2{margin:0;font-size:18px;font-weight:600;color:#111827;}
    .ah-stats{font-size:12px;color:#6b7280;margin-top:4px;}
    .ah-actions{display:flex;gap:8px;align-items:center;}
    .ah-actions button{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;}
    .ah-actions button.primary{background:#2563eb;color:#fff;border-color:#2563eb;}
    .ah-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;}
    .ah-body.grid-view{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));}
    .ah-item{background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:4px;}
    .ah-name{font-weight:500;font-size:14px;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .ah-size{font-size:12px;color:#6b7280;}
    .ah-status{font-size:12px;color:#374151;}
    .ah-progress{height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;}
    .ah-progress-bar{background:#2563eb;height:100%;width:0%;}
    .ah-footer{padding:16px 20px;border-top:1px solid #e5e7eb;font-size:12px;color:#374151;display:flex;justify-content:space-between;}
    .ah-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10001;}
    .ah-dialog{background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);padding:20px;width:320px;}
    .ah-dialog h3{margin-top:0;margin-bottom:12px;font-size:16px;font-weight:600;color:#111827;}
    .ah-dialog label{display:block;font-size:14px;color:#374151;margin-bottom:8px;}
    .ah-dialog input{width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;}
    .ah-dialog .actions{text-align:right;margin-top:16px;}
    .ah-dialog button{background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;margin-left:8px;}
    .ah-dialog button.primary{background:#2563eb;color:#fff;border-color:#2563eb;}
    `;

    function insertStyles(){
        if(document.getElementById('ah-style')) return;
        const style=document.createElement('style');
        style.id='ah-style';
        style.textContent=STYLES;
        document.head.appendChild(style);
    }

    // 核心模块
    const Core = {
        async init() {
            insertStyles()
            await this.addToolbarButton()
            this.initEventListeners()
        },

        async addToolbarButton() {
            console.log('[QQMailDownloader] 开始添加工具栏按钮...')

            const toolbarSelector = '.mail-list-page-toolbar .right-wrap .xmail-ui-ellipsis-toolbar .ui-ellipsis-toolbar-btns'

            try {
                const toolbar = await this.waitForElement(toolbarSelector)
                console.log('[QQMailDownloader] 找到工具栏元素')

                if (toolbar.querySelector('.qqmail-downloader-btn')) {
                    console.log('[QQMailDownloader] 按钮已存在，跳过添加')
                    return
                }

                console.log('[QQMailDownloader] 开始创建按钮')

                const downloadBtn = document.createElement('div')
                downloadBtn.className = 'xmail-ui-btn ui-btn-size32 ui-btn-border ui-btn-them-clear-gray qqmail-downloader-btn'
                downloadBtn.style.marginRight = '8px'
                downloadBtn.innerHTML = `
                    <span class="xmail-ui-icon ui-btn-icon" style="width: 20px; height: 20px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor">
                            <path d="M8 2v8m0 0l3-3m-3 3L5 7m-2 4v2h10v-2"/>
                        </svg>
                    </span>
                    <div class="ui-btn-text">下载附件</div>
                `

                downloadBtn.onclick = () => {
                    console.log('[QQMailDownloader] 按钮被点击')
                    UI.togglePanel()
                }

                toolbar.appendChild(downloadBtn)
                console.log('[QQMailDownloader] 按钮添加成功')

            } catch (error) {
                console.error('[QQMailDownloader] 添加按钮失败:', error)
                throw error
            }
        },

        initEventListeners() {
            document.addEventListener('click', (e) => {
                if (e.target.id === 'attachment-helper-btn' || e.target.closest('#attachment-helper-btn')) {
                    UI.togglePanel()
                }
            })
        },

        getSid() {
            const match = location.href.match(/sid=([^&]+)/)
            return match ? match[1] : ''
        },

        getFolderId() {
            const match = location.href.match(/folderid=([^&]+)/)
            return match ? match[1] : ''
        },

        waitForElement(selector, timeout = 10000) {
            return new Promise((resolve, reject) => {
                const start = Date.now()
                const check = () => {
                    const el = document.querySelector(selector)
                    if (el) return resolve(el)
                    if (Date.now() - start > timeout) return reject(new Error('Element not found: ' + selector))
                    requestAnimationFrame(check)
                }
                check()
            })
        }
    }

    // 数据处理模块
    const DataService = {
        async getMailList(folderId, page = 0, pageSize = 50) {
            const sid = Core.getSid()
            try {
                const response = await this.fetchApi(`https://wx.mail.qq.com/cgi-bin/mail_list?folderid=${folderId}&page=${page}&pagesize=${pageSize}&sid=${sid}`)
                return response.list || []
            } catch (error) {
                console.error('获取邮件列表失败:', error)
                return []
            }
        },

        async getAllMails(folderId) {
            let page = 0
            const result = []
            while (true) {
                const list = await this.getMailList(folderId, page)
                if (!list.length) break
                result.push(...list)
                if (list.length < 50) break
                page++
            }
            return result
        },

        async getMailDetail(mailId) {
            const sid = Core.getSid()
            try {
                const response = await this.fetchApi(`https://wx.mail.qq.com/cgi-bin/readmail?mailid=${mailId}&sid=${sid}`)
                return response
            } catch (error) {
                console.error('获取邮件详情失败:', error)
                return null
            }
        },

        async getAttachments(mailId) {
            const mailDetail = await this.getMailDetail(mailId)
            return mailDetail?.attach || []
        },

        async loadFolderData(folderId) {
            const mails = await this.getAllMails(folderId)
            const attachments = []
            for (let mIndex = 0; mIndex < mails.length; mIndex++) {
                const mail = mails[mIndex]
                const atts = await this.getAttachments(mail.id)
                atts.forEach((att, idx) => {
                    attachments.push(Object.assign({}, att, {
                        mailid: mail.id,
                        subject: mail.subject,
                        fromEmail: mail.from,
                        mailIndex: mIndex + 1,
                        attachIndex: idx + 1,
                        totalAttachments: atts.length
                    }))
                })
            }
            return { mails, attachments }
        },

        async fetchApi(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    responseType: 'json',
                    onload: (response) => {
                        if (response.status === 200) {
                            resolve(response.response)
                        } else {
                            reject(new Error(`请求失败: ${response.status}`))
                        }
                    },
                    onerror: (error) => {
                        reject(error)
                    }
                })
            })
        },

        async downloadAttachment(attachment, options) {
            const sid = Core.getSid()
            const downloadUrl = `https://wx.mail.qq.com/cgi-bin/download?sid=${sid}&mailid=${attachment.mailid}&attach=${attachment.attachid}`
            
            const filename = this.formatFilename(attachment, options)
            
            return new Promise((resolve, reject) => {
                GM_download({
                    url: downloadUrl,
                    name: filename,
                    onload: () => resolve(),
                    onerror: (error) => reject(error),
                    onprogress: (progress) => {
                        DownloadManager.updateProgress(attachment.attachid, progress.loaded, progress.total)
                    }
                })
            })
        },

        formatFilename(attachment, options) {
            let filename = attachment.name
            
            // 署名检查
            if (options.integrityCheck.enabled && !this.hasDigitPattern(filename, options.integrityCheck.pattern)) {
                filename = `${options.integrityCheck.prefix}${filename}`
            }
            
            // 格式检查
            if (options.formatCheck.enabled && !this.hasValidExtension(filename)) {
                filename = `${filename}${options.formatCheck.defaultExt}`
            }
            
            // 应用命名模板
            if (options.naming.template) {
                filename = this.applyNamingTemplate(options.naming.template, attachment, filename)
            }
            
            return filename
        },
        
        hasDigitPattern(filename, pattern = '\\d{6}') {
            const regex = new RegExp(pattern)
            return regex.test(filename)
        },
        
        hasValidExtension(filename) {
            return /\.[^./\\]+$/.test(filename)
        },
        
        applyNamingTemplate(template, attachment, originalFilename) {
            const date = new Date()
            const vars = {
                '{index}': attachment.index || 0,
                '{index_mail}': attachment.mailIndex || 0,
                '{index_attach}': attachment.attachIndex || 0,
                '{mail_subject}': attachment.subject || '',
                '{mail_subject_md5}': this.md5(attachment.subject || '').substring(0, 8),
                '{mail_attach_count}': attachment.totalAttachments || 0,
                '{from_email}': attachment.fromEmail || '',
                '{from_name}': attachment.fromName || '',
                '{attach_name}': originalFilename,
                '{attach_name_md5}': this.md5(originalFilename).substring(0, 8),
                '{attach_index}': attachment.attachIndex || 0,
                '{date}': date.toLocaleDateString(),
                '{date_AMPM}': date.getHours() < 12 ? 'AM' : 'PM',
                '{date_week}': ['日','一','二','三','四','五','六'][date.getDay()],
                '{date_MMDD}': `${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}`,
                '{date_YYYYMMDD}': `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}`,
                '{date_MM-DD}': `${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`,
                '{date_MM}': (date.getMonth()+1).toString().padStart(2,'0'),
                '{date_DD}': date.getDate().toString().padStart(2,'0'),
                '{date_YYYY}': date.getFullYear().toString(),
                '{date_HHMM}': `${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}`,
                '{date_HHMMSS}': `${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}${date.getSeconds().toString().padStart(2,'0')}`,
                '{date_HH}': date.getHours().toString().padStart(2,'0'),
                '{date_mm}': date.getMinutes().toString().padStart(2,'0'),
                '{date_SS}': date.getSeconds().toString().padStart(2,'0')
            }
            let result = template
            for (const [key,value] of Object.entries(vars)) {
                result = result.replace(new RegExp(key,'g'), value)
            }
            return result
        },
        
        md5(str) {
            return Array.from(str).reduce((hash, char) => (((hash << 5) - hash) + char.charCodeAt(0)) | 0, 0).toString(16)
        },
        
        filterAttachment(attachment, options) {
            if (options.filter.fileType.enabled) {
                const ext = this.getFileExtension(attachment.name)
                if (options.filter.fileType.mode === 'include') {
                    if (!options.filter.fileType.types.includes(ext)) return false
                } else if (options.filter.fileType.mode === 'exclude') {
                    if (options.filter.fileType.types.includes(ext)) return false
                }
            }
            if (options.filter.fileSize.enabled) {
                const size = attachment.size
                if (options.filter.fileSize.mode === 'min' && size < options.filter.fileSize.value) return false
                if (options.filter.fileSize.mode === 'max' && size > options.filter.fileSize.value) return false
            }
            if (options.filter.attachName.enabled) {
                const name = attachment.name.toLowerCase()
                if (options.filter.attachName.mode === 'include') {
                    if (!options.filter.attachName.keywords.some(k => name.includes(k.toLowerCase()))) return false
                } else if (options.filter.attachName.mode === 'exclude') {
                    if (options.filter.attachName.keywords.some(k => name.includes(k.toLowerCase()))) return false
                }
            }
            if (options.filter.mailSubject.enabled) {
                const subject = attachment.subject.toLowerCase()
                if (options.filter.mailSubject.mode === 'include') {
                    if (!options.filter.mailSubject.keywords.some(k => subject.includes(k.toLowerCase()))) return false
                } else if (options.filter.mailSubject.mode === 'exclude') {
                    if (options.filter.mailSubject.keywords.some(k => subject.includes(k.toLowerCase()))) return false
                }
            }
            return true
        },
        
        getFileExtension(filename) {
            return filename.split('.').pop().toLowerCase()
        }
    }

    // 下载管理模块
    const DownloadManager = {
        tasks: [],
        activeDownloads: 0,
        maxConcurrent: 3,

        init(options) {
            this.options = options
            this.tasks = []
            this.activeDownloads = 0
            this.maxConcurrent = options.concurrency || 3
        },
        
        addTask(attachment) {
            this.tasks.push({
                attachment,
                status: 'pending',
                progress: 0,
                total: attachment.size || 0
            })
            this.processQueue()
        },
        
        addTasks(attachments) {
            attachments.forEach(att => this.addTask(att))
        },
        
        processQueue() {
            if (this.activeDownloads >= this.maxConcurrent) return
            const pendingTask = this.tasks.find(t => t.status === 'pending')
            if (!pendingTask) return
            pendingTask.status = 'downloading'
            this.activeDownloads++
            DataService.downloadAttachment(pendingTask.attachment, this.options)
                .then(() => {
                    pendingTask.status = 'completed'
                    pendingTask.progress = pendingTask.total
                    this.activeDownloads--
                    this.processQueue()
                    UI.updateDownloadStatus()
                })
                .catch(error => {
                    pendingTask.status = 'failed'
                    pendingTask.error = error.message
                    this.activeDownloads--
                    this.processQueue()
                    UI.updateDownloadStatus()
                })
        },
        
        updateProgress(attachId, loaded, total) {
            const task = this.tasks.find(t => t.attachment.attachid === attachId)
            if (task) {
                task.progress = loaded
                task.total = total
                UI.updateDownloadProgress(task)
            }
        },
        
        getStats() {
            const total = this.tasks.length
            const completed = this.tasks.filter(t => t.status === 'completed').length
            const failed = this.tasks.filter(t => t.status === 'failed').length
            const pending = this.tasks.filter(t => t.status === 'pending').length
            const downloading = this.tasks.filter(t => t.status === 'downloading').length
            const totalSize = this.tasks.reduce((sum, t) => sum + (t.total || 0), 0)
            const downloadedSize = this.tasks.reduce((sum, t) => sum + (t.progress || 0), 0)
            return {
                total,
                completed,
                failed,
                pending,
                downloading,
                totalSize,
                downloadedSize,
                progress: total ? Math.round((downloadedSize / totalSize) * 100) : 0
            }
        }
    }

    // UI模块
    const UI = {
        panel: null,
        currentView: 'preview',
        loaded: false,
        mails: [],
        attachments: [],
        
        init() {
            this.createPanel()
            this.bindEvents()
        },
        
        createPanel() {
            const panel = document.createElement('div')
            panel.className = 'ah-panel'
            panel.style.display = 'none'
            panel.innerHTML = `
                <div class="ah-header">
                    <div class="ah-title">
                        <h2 id="current-folder-name">当前文件夹</h2>
                        <div class="ah-stats"><span id="mail-count">0 封邮件</span> · <span id="attachment-count">0 个附件</span></div>
                    </div>
                    <div class="ah-actions">
                        <button data-view="list">列表</button>
                        <button data-view="grid">网格</button>
                        <button data-view="preview">预览</button>
                        <button id="download-settings-btn">设置</button>
                        <button class="primary" id="start-download-btn">开始下载</button>
                        <button id="close-panel-btn">关闭</button>
                    </div>
                </div>
                <div class="ah-body list-view" id="attachment-list"></div>
                <div class="ah-footer"><div id="download-stats"></div></div>
            `
            document.body.appendChild(panel)
            this.panel = panel
        },
        
        bindEvents() {
            this.panel.addEventListener('click', (e) => {
                if (e.target.id === 'start-download-btn') {
                    this.startDownload()
                } else if (e.target.id === 'close-panel-btn') {
                    UI.togglePanel(false)
                } else if (e.target.dataset.view) {
                    this.switchView(e.target.dataset.view)
                } else if (e.target.id === 'download-settings-btn') {
                    Settings.show()
                }
            })
        },

        async loadData() {
            const folderId = Core.getFolderId()
            if (!folderId) return
            this.panel.querySelector('#mail-count').textContent = '加载中...'
            this.panel.querySelector('#attachment-count').textContent = ''
            const { mails, attachments } = await DataService.loadFolderData(folderId)
            this.mails = mails
            this.attachments = attachments
            const mailCountEl = this.panel.querySelector('#mail-count')
            const attCountEl = this.panel.querySelector('#attachment-count')
            if (mailCountEl) mailCountEl.textContent = `${mails.length} 封邮件`
            if (attCountEl) attCountEl.textContent = `${attachments.length} 个附件`
            this.loaded = true
        },
        
        togglePanel(force) {
            if (!this.panel) this.init()
            const willShow = typeof force === 'boolean'
                ? force
                : this.panel.style.display === 'none'
            this.panel.style.display = willShow ? 'block' : 'none'
            if (willShow && !this.loaded) {
                this.loadData().then(() => this.renderAttachments())
            }
        },
        
        switchView(view) {
            this.currentView = view
            const container = this.panel.querySelector('#attachment-list')
            container.className = `ah-body ${view}-view`
            this.renderAttachments()
        },
        
        renderAttachments() {
            const container = this.panel.querySelector('#attachment-list')
            container.innerHTML = ''
            DownloadManager.tasks.forEach(task => {
                const percent = task.total ? Math.round((task.progress / task.total) * 100) : 0
                const div = document.createElement('div')
                div.className = `ah-item ${this.currentView}`
                div.innerHTML = `
                    <div class="ah-name" title="${task.attachment.name}">${task.attachment.name}</div>
                    <div class="ah-size">${(task.attachment.size/1024).toFixed(1)} KB</div>
                    <div class="ah-status">${task.status}</div>
                    <div class="ah-progress"><div class="ah-progress-bar" data-id="${task.attachment.attachid}" style="width:${percent}%"></div></div>
                `
                container.appendChild(div)
            })
            this.updateDownloadStatus()
        },
        
        updateDownloadProgress(task) {
            const bar = this.panel.querySelector(`.ah-progress-bar[data-id="${task.attachment.attachid}"]`)
            if (bar) {
                const percent = task.total ? Math.round((task.progress / task.total) * 100) : 0
                bar.style.width = percent + '%'
            }
        },
        
        updateDownloadStatus() {
            const stats = DownloadManager.getStats()
            const statsEl = this.panel.querySelector('#download-stats')
            statsEl.textContent = `总数: ${stats.total}, 已完成: ${stats.completed}, 失败: ${stats.failed}, 进度: ${stats.progress}%`
        },
        
        async startDownload() {
            if (!this.loaded) {
                await this.loadData()
            }
            DownloadManager.init(Settings.options)
            let attachmentTotal = 0
            this.attachments.forEach(att => {
                attachmentTotal++
                if (DataService.filterAttachment(att, Settings.options)) {
                    DownloadManager.addTask(att)
                }
            })
            const mailCountEl = this.panel.querySelector('#mail-count')
            const attCountEl = this.panel.querySelector('#attachment-count')
            if (mailCountEl) mailCountEl.textContent = `${this.mails.length} 封邮件`
            if (attCountEl) attCountEl.textContent = `${attachmentTotal} 个附件`
            this.renderAttachments()
        }
    }

    // 设置模块
    const Settings = {
        storageKey: 'attachmentHelperSettings',
        options: {
            integrityCheck: { enabled: false, pattern: '\\d{6}', prefix: 'ID_' },
            formatCheck: { enabled: false, defaultExt: '.dat' },
            naming: { template: '{mail_subject}_{attach_name}' },
            concurrency: 3,
            filter: {
                fileType: { enabled: false, mode: 'include', types: [] },
                fileSize: { enabled: false, mode: 'min', value: 0 },
                attachName: { enabled: false, mode: 'include', keywords: [] },
                mailSubject: { enabled: false, mode: 'include', keywords: [] }
            }
        },

        load() {
            const saved = localStorage.getItem(this.storageKey)
            if (saved) {
                try {
                    const obj = JSON.parse(saved)
                    Object.assign(this.options, obj)
                } catch (e) {
                    console.warn('加载设置失败', e)
                }
            }
        },

        save() {
            localStorage.setItem(this.storageKey, JSON.stringify(this.options))
        },

        show() {
            const tpl = `
                <div class="ah-overlay">
                    <div class="ah-dialog">
                        <h3>下载设置</h3>
                        <label>并发数
                            <input id="ah-setting-concurrency" type="number" min="1" max="10" value="${this.options.concurrency}">
                        </label>
                        <label>命名模板
                            <input id="ah-setting-template" type="text" value="${this.options.naming.template}">
                        </label>
                        <div class="actions">
                            <button id="ah-setting-save" class="primary">保存</button>
                            <button id="ah-setting-cancel">取消</button>
                        </div>
                    </div>
                </div>`
            const wrapper = document.createElement('div')
            wrapper.innerHTML = tpl
            document.body.appendChild(wrapper.firstElementChild)
            const overlay = document.querySelector('.ah-overlay')
            overlay.addEventListener('click', (e) => {
                if (e.target.id === 'ah-setting-save') {
                    const cc = parseInt(document.getElementById('ah-setting-concurrency').value, 10) || 3
                    this.options.concurrency = cc
                    this.options.naming.template = document.getElementById('ah-setting-template').value
                    this.save()
                    overlay.remove()
                } else if (e.target.id === 'ah-setting-cancel' || e.target === overlay) {
                    overlay.remove()
                }
            })
        }
    }

    // 初始化
    Settings.load()
    Core.init()

    // Expose for debug
    window.QQMailAttachmentHelper = {
        Core,
        DataService,
        DownloadManager,
        UI,
        Settings
    }
})()
