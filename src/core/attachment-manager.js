import { QQMailDownloader } from '../api/downloader.js';
import { Settings } from './settings.js';
import { NamingEngine } from './naming-engine.js';
import { DownloadEngine } from './download-engine.js';
import { FileComparer } from './file-comparer.js';
import { Panel } from '../ui/panel.js';
import { BentoLayout } from '../ui/bento.js';
import { AttachmentGrid } from '../ui/attachment-grid.js';
import { Toolbar } from '../ui/toolbar.js';
import { Dialogs } from '../ui/dialogs.js';
import { ProgressBar } from '../ui/progress.js';
import { showToast } from '../ui/toast.js';

export class AttachmentManager {
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
    this.selectedAttachments = new Set();
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
      setTimeout(() => { this.toggleInProgress = false; }, 500);
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
      this.grid.showLoading(contentArea, '正在获取邮件列表...');
      await this._loadData(contentArea);
      this._renderContent(contentArea);
    } catch (error) {
      this.grid.showError(contentArea, `初始化失败: ${error.message}`);
      showToast(`初始化失败: ${error.message}`, 'error', 5000);
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

    this.grid.showLoading(contentArea, '正在获取邮件...');
    const { mails, total, failedPages } = await this.downloader.fetchAllMails(folderId);
    this.totalMailCount = total;

    if (failedPages.length > 0) {
      showToast(`${failedPages.length} 页邮件获取失败，已加载其余邮件`, 'warning');
    }

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
      skippedCount: this.skippedAttachments.length,
    };
    this.bento.render(contentArea, this.attachments, stats);
  }

  async downloadAll() {
    const attachments = this.toolbar.getFilteredAttachments(this.attachments);
    await this._performDownload(attachments, '全部');
  }

  async downloadSelected() {
    const selected = this.attachments.filter(a =>
      this.selectedAttachments.has(a.fileid || a.name)
    );
    if (selected.length === 0) {
      showToast('请先选择要下载的附件', 'warning');
      return;
    }
    await this._performDownload(selected, '选中');
  }

  async _performDownload(attachments, label) {
    if (attachments.length === 0) {
      showToast('没有可下载的附件', 'warning');
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
      const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') throw new Error('需要文件夹写入权限');

      this.progress?.show(`正在下载${label}附件...`);
      this.downloadEngine.onProgress = (stats) => this.progress?.update(stats);

      const results = await this.downloadEngine.downloadAll(attachments, dirHandle, this.settings);

      const success = results.filter(r => !r.error).length;
      const fail = results.filter(r => r.error).length;
      showToast(`下载完成：${success} 成功，${fail} 失败`, fail > 0 ? 'warning' : 'success');

      if (this.settings.data.downloadBehavior.autoCompareAfterDownload) {
        await this.dialogs.showComparisonResults(dirHandle);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        showToast(`下载失败: ${error.message}`, 'error');
      }
    } finally {
      this.progress?.hide();
    }
  }

  async showCompare() {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read', startIn: 'downloads' });
      await this.dialogs.showComparisonResults(dirHandle);
    } catch (error) {
      if (error.name !== 'AbortError') {
        showToast(`对比失败: ${error.message}`, 'error');
      }
    }
  }

  showSettings() {
    this.dialogs.showSettings();
  }
}
