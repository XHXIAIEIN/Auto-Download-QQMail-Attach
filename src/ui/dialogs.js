import { html, trusted } from '../html.js';
import { el, qs, qsa, remove } from '../utils/dom.js';
import { showToast } from './toast.js';
import { formatFileSize, formatDate, normalizeDate } from '../utils/format.js';
import { getExtension } from '../utils/sanitize.js';

export class Dialogs {
  constructor(manager) {
    this.manager = manager;
  }

  // === Settings Dialog ===

  async showSettings() {
    const overlay = this._createOverlay();
    const dialog = el('div', { className: 'am-dialog' });

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

    // Tab switching
    this._setupTabs(dialog);
    // Load initial tab
    this._renderSettingsTab(dialog, 'basic');
    // Events
    qs('#settings-close', dialog).addEventListener('click', () => overlay.remove());
    qs('#settings-save', dialog).addEventListener('click', () => {
      this._saveSettings(dialog);
      showToast('设置已保存', 'success');
      overlay.remove();
    });
    qs('#settings-reset', dialog).addEventListener('click', () => {
      this.manager.settings.reset();
      this._renderSettingsTab(dialog, 'basic');
      showToast('已恢复默认设置', 'info');
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  _setupTabs(dialog) {
    qsa('.am-tab', dialog).forEach(tab => {
      tab.addEventListener('click', () => {
        qsa('.am-tab', dialog).forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderSettingsTab(dialog, tab.dataset.tab);
      });
    });
  }

  _renderSettingsTab(dialog, tabName) {
    const body = qs('#settings-body', dialog);
    const s = this.manager.settings.data;

    switch (tabName) {
      case 'basic':
        body.innerHTML = `
          <div class="am-form-section">
            <div class="am-form-section-title">文件夹结构</div>
            <div class="am-form-item">
              <select class="am-select" id="opt-folder-structure">
                <option value="flat" ${s.folderStructure === 'flat' ? 'selected' : ''}>平铺（所有文件放在同一目录）</option>
                <option value="subject" ${s.folderStructure === 'subject' ? 'selected' : ''}>按邮件主题分文件夹</option>
                <option value="sender" ${s.folderStructure === 'sender' ? 'selected' : ''}>按发件人分文件夹</option>
                <option value="date" ${s.folderStructure === 'date' ? 'selected' : ''}>按日期分文件夹</option>
                <option value="custom" ${s.folderStructure === 'custom' ? 'selected' : ''}>自定义模板</option>
              </select>
            </div>
            <div class="am-form-item" id="custom-folder-group" style="display:${s.folderStructure === 'custom' ? 'block' : 'none'}">
              <label class="am-form-label">自定义文件夹模板</label>
              <input class="am-input" id="opt-folder-template" value="${html`${s.folderNaming?.customTemplate || ''}`}">
              <div class="am-form-desc">可用变量: {date}, {senderName}, {subject}</div>
            </div>
          </div>
          <div class="am-form-section">
            <div class="am-form-section-title">冲突处理</div>
            <div class="am-form-item">
              <select class="am-select" id="opt-conflict">
                <option value="rename" ${s.conflictResolution === 'rename' ? 'selected' : ''}>自动重命名</option>
                <option value="skip" ${s.conflictResolution === 'skip' ? 'selected' : ''}>跳过</option>
                <option value="overwrite" ${s.conflictResolution === 'overwrite' ? 'selected' : ''}>覆盖</option>
              </select>
            </div>
          </div>
          <div class="am-form-section">
            <div class="am-form-section-title">下载行为</div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-verify" ${s.downloadBehavior?.verifyDownloads ? 'checked' : ''}> <label>下载后验证文件完整性</label></div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-notify" ${s.downloadBehavior?.notifyOnComplete ? 'checked' : ''}> <label>下载完成后通知</label></div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-auto-compare" ${s.downloadBehavior?.autoCompareAfterDownload ? 'checked' : ''}> <label>下载后自动对比本地文件</label></div>
            <div class="am-form-item">
              <label class="am-form-label">并发下载数</label>
              <select class="am-select" id="opt-concurrent">
                <option value="auto" ${s.downloadBehavior?.concurrentDownloads === 'auto' ? 'selected' : ''}>自动</option>
                <option value="1" ${s.downloadBehavior?.concurrentDownloads === '1' ? 'selected' : ''}>1</option>
                <option value="2" ${s.downloadBehavior?.concurrentDownloads === '2' ? 'selected' : ''}>2</option>
                <option value="3" ${s.downloadBehavior?.concurrentDownloads === '3' ? 'selected' : ''}>3</option>
                <option value="5" ${s.downloadBehavior?.concurrentDownloads === '5' ? 'selected' : ''}>5</option>
              </select>
            </div>
          </div>
        `;
        // Dynamic show/hide for custom folder template
        qs('#opt-folder-structure', body)?.addEventListener('change', (e) => {
          const group = qs('#custom-folder-group', body);
          if (group) group.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
        break;

      case 'naming':
        body.innerHTML = `
          <div class="am-form-section">
            <div class="am-form-section-title">命名模式</div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-custom-pattern" ${s.fileNaming?.useCustomPattern ? 'checked' : ''}> <label>使用自定义命名模板</label></div>
            <div class="am-form-item" id="pattern-group" style="display:${s.fileNaming?.useCustomPattern ? 'block' : 'none'}">
              <input class="am-input" id="opt-pattern" value="${html`${s.fileNaming?.customPattern || ''}`}" placeholder="{date}_{subject}_{fileName}">
              <div class="am-form-desc">可用变量: {date}, {subject}, {fileName}, {senderName}, {senderEmail}, {mailId}, {fileIndex}</div>
            </div>
            <div class="am-form-row">
              <div class="am-form-item">
                <label class="am-form-label">前缀</label>
                <input class="am-input" id="opt-prefix" value="${html`${s.fileNaming?.prefix || ''}`}">
              </div>
              <div class="am-form-item">
                <label class="am-form-label">后缀</label>
                <input class="am-input" id="opt-suffix" value="${html`${s.fileNaming?.suffix || ''}`}">
              </div>
            </div>
            <div class="am-form-item">
              <label class="am-form-label">分隔符</label>
              <input class="am-input" id="opt-separator" value="${html`${s.fileNaming?.separator || '_'}`}" style="width:80px">
            </div>
          </div>
          <div class="am-form-section">
            <div class="am-form-section-title">文件名验证</div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-validation" ${s.fileNaming?.validation?.enabled ? 'checked' : ''}> <label>启用文件名正则验证</label></div>
            <div class="am-form-item">
              <label class="am-form-label">验证正则</label>
              <input class="am-input" id="opt-validation-pattern" value="${html`${s.fileNaming?.validation?.pattern || ''}`}">
            </div>
            <div class="am-form-item">
              <label class="am-form-label">验证失败回退策略</label>
              <select class="am-select" id="opt-fallback">
                <option value="auto" ${s.fileNaming?.validation?.fallbackPattern === 'auto' ? 'selected' : ''}>自动分析</option>
                <option value="mailSubject" ${s.fileNaming?.validation?.fallbackPattern === 'mailSubject' ? 'selected' : ''}>使用邮件主题</option>
                <option value="senderEmail" ${s.fileNaming?.validation?.fallbackPattern === 'senderEmail' ? 'selected' : ''}>使用发件人</option>
                <option value="customTemplate" ${s.fileNaming?.validation?.fallbackPattern === 'customTemplate' ? 'selected' : ''}>自定义模板</option>
              </select>
            </div>
          </div>
        `;
        qs('#opt-custom-pattern', body)?.addEventListener('change', (e) => {
          const group = qs('#pattern-group', body);
          if (group) group.style.display = e.target.checked ? 'block' : 'none';
        });
        break;

      case 'advanced':
        body.innerHTML = `
          <div class="am-form-section">
            <div class="am-form-section-title">内容替换</div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-replacement" ${s.contentReplacement?.enabled ? 'checked' : ''}> <label>启用文件名内容替换</label></div>
            <div class="am-form-desc">对文件名中的特定内容进行替换</div>
          </div>
          <div class="am-form-section">
            <div class="am-form-section-title">智能分组</div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-smart-group" ${s.smartGrouping?.enabled ? 'checked' : ''}> <label>启用智能分组</label></div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-group-type" ${s.smartGrouping?.groupByType ? 'checked' : ''}> <label>按文件类型分组</label></div>
            <div class="am-form-checkbox"><input type="checkbox" id="opt-group-date" ${s.smartGrouping?.groupByDate ? 'checked' : ''}> <label>按日期分组</label></div>
          </div>
        `;
        break;
    }
  }

  _saveSettings(dialog) {
    const s = this.manager.settings.data;

    // Basic tab values (may not be rendered)
    const folderStructure = qs('#opt-folder-structure', dialog)?.value;
    if (folderStructure) s.folderStructure = folderStructure;
    const folderTemplate = qs('#opt-folder-template', dialog)?.value;
    if (folderTemplate !== undefined) s.folderNaming.customTemplate = folderTemplate;
    const conflict = qs('#opt-conflict', dialog)?.value;
    if (conflict) s.conflictResolution = conflict;
    const verify = qs('#opt-verify', dialog);
    if (verify) s.downloadBehavior.verifyDownloads = verify.checked;
    const notify = qs('#opt-notify', dialog);
    if (notify) s.downloadBehavior.notifyOnComplete = notify.checked;
    const autoCompare = qs('#opt-auto-compare', dialog);
    if (autoCompare) s.downloadBehavior.autoCompareAfterDownload = autoCompare.checked;
    const concurrent = qs('#opt-concurrent', dialog)?.value;
    if (concurrent) s.downloadBehavior.concurrentDownloads = concurrent;

    // Naming tab
    const customPattern = qs('#opt-custom-pattern', dialog);
    if (customPattern) s.fileNaming.useCustomPattern = customPattern.checked;
    const pattern = qs('#opt-pattern', dialog)?.value;
    if (pattern !== undefined) s.fileNaming.customPattern = pattern;
    const prefix = qs('#opt-prefix', dialog)?.value;
    if (prefix !== undefined) s.fileNaming.prefix = prefix;
    const suffix = qs('#opt-suffix', dialog)?.value;
    if (suffix !== undefined) s.fileNaming.suffix = suffix;
    const separator = qs('#opt-separator', dialog)?.value;
    if (separator !== undefined) s.fileNaming.separator = separator;
    const validation = qs('#opt-validation', dialog);
    if (validation) s.fileNaming.validation.enabled = validation.checked;
    const valPattern = qs('#opt-validation-pattern', dialog)?.value;
    if (valPattern !== undefined) s.fileNaming.validation.pattern = valPattern;
    const fallback = qs('#opt-fallback', dialog)?.value;
    if (fallback) s.fileNaming.validation.fallbackPattern = fallback;

    // Advanced tab
    const replacement = qs('#opt-replacement', dialog);
    if (replacement) s.contentReplacement.enabled = replacement.checked;
    const smartGroup = qs('#opt-smart-group', dialog);
    if (smartGroup) s.smartGrouping.enabled = smartGroup.checked;
    const groupType = qs('#opt-group-type', dialog);
    if (groupType) s.smartGrouping.groupByType = groupType.checked;
    const groupDate = qs('#opt-group-date', dialog);
    if (groupDate) s.smartGrouping.groupByDate = groupDate.checked;

    this.manager.settings.save();
  }

  // === Comparison Dialog ===

  async showComparisonResults(dirHandle) {
    const overlay = this._createOverlay();
    const dialog = el('div', { className: 'am-dialog', attrs: { style: 'max-width:900px' } });

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

    qs('#compare-close', dialog).addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    try {
      const body = qs('#compare-body', dialog);

      // Scan local files
      const localFiles = await this.manager.fileComparer.getLocalFiles(dirHandle, (progress) => {
        body.innerHTML = `<div class="am-state am-state--loading">正在扫描... 已发现 ${progress} 个文件</div>`;
      });

      body.innerHTML = '<div class="am-state am-state--loading">正在对比文件...</div>';

      // Compare
      const result = this.manager.fileComparer.compareFiles(localFiles, this.manager.attachments);

      // Render results
      this._renderComparisonResults(body, result);

    } catch (error) {
      qs('#compare-body', dialog).innerHTML = html`<div class="am-state am-state--error">对比失败: ${error.message}</div>`;
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
          ${missing.slice(0, 20).map(att => html`
            <div class="am-list-item" style="margin-bottom:var(--am-space-2)">
              <div style="font-weight:500">${att.name}</div>
              <div style="font-size:12px;color:var(--am-text-secondary)">${formatFileSize(parseInt(att.size) || 0)} \u00b7 ${att.mailSubject || ''}</div>
            </div>
          `).join('')}
          ${missing.length > 20 ? `<div class="am-list-more">还有 ${missing.length - 20} 个...</div>` : ''}
        </div>
      ` : ''}

      ${matched.length > 0 ? `
        <div class="am-form-section">
          <div class="am-form-section-title" style="color:var(--am-success)">已匹配 (${matched.length})</div>
          ${matched.slice(0, 10).map(m => html`
            <div class="am-list-item" style="margin-bottom:var(--am-space-2)">
              <div style="font-weight:500">${m.emailAttachment?.name || m.name || ''}</div>
            </div>
          `).join('')}
          ${matched.length > 10 ? `<div class="am-list-more">还有 ${matched.length - 10} 个...</div>` : ''}
        </div>
      ` : ''}
    `;
  }

  // === Detail List Dialog ===

  showDetailList({ title, data, itemRenderer, searchable = true, sortable = false, pageSize = 20 }) {
    const overlay = this._createOverlay();
    const dialog = el('div', { className: 'am-dialog', attrs: { style: 'max-width:800px' } });

    let currentPage = 0;
    let filteredData = [...data];
    let searchTerm = '';

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
          ` : ''}
          <div id="detail-list">
            ${pageData.length > 0
              ? pageData.map((item, i) => `<div class="am-list-item" style="margin-bottom:var(--am-space-2)">${itemRenderer(item, start + i)}</div>`).join('')
              : '<div class="am-state am-state--empty">无数据</div>'
            }
          </div>
        </div>
        <div class="am-dialog-footer" style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;color:var(--am-text-secondary)">第 ${currentPage + 1} / ${totalPages} 页</span>
          <div>
            <button class="am-btn am-btn--ghost" id="detail-prev" ${currentPage === 0 ? 'disabled' : ''}>上一页</button>
            <button class="am-btn am-btn--ghost" id="detail-next" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>下一页</button>
          </div>
        </div>
      `;

      // Bind events
      qs('#detail-close', dialog).addEventListener('click', () => overlay.remove());
      qs('#detail-prev', dialog)?.addEventListener('click', () => { currentPage--; render(); });
      qs('#detail-next', dialog)?.addEventListener('click', () => { currentPage++; render(); });

      const searchInput = qs('#detail-search', dialog);
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          searchTerm = e.target.value.trim().toLowerCase();
          filteredData = searchTerm
            ? data.filter(item => JSON.stringify(item).toLowerCase().includes(searchTerm))
            : [...data];
          currentPage = 0;
          render();
          // Restore focus
          const newInput = qs('#detail-search', dialog);
          if (newInput) { newInput.focus(); newInput.selectionStart = newInput.selectionEnd = newInput.value.length; }
        });
      }
    };

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    render();
  }

  // === Variable Selector ===

  showVariableSelector(targetInputId) {
    remove('#am-variable-selector');

    const variables = [
      { name: 'date', desc: '邮件日期' },
      { name: 'subject', desc: '邮件主题' },
      { name: 'fileName', desc: '原始文件名' },
      { name: 'senderName', desc: '发件人名称' },
      { name: 'senderEmail', desc: '发件人邮箱' },
      { name: 'mailId', desc: '邮件ID' },
      { name: 'fileIndex', desc: '文件序号' },
      { name: 'ext', desc: '文件扩展名' },
    ];

    const popup = el('div', {
      className: 'am-menu',
      id: 'am-variable-selector',
      attrs: { style: 'position:fixed;z-index:10003' },
    });

    for (const v of variables) {
      const item = el('div', {
        className: 'am-menu-item',
        events: {
          click: () => {
            const input = qs(`#${targetInputId}`);
            if (input) {
              const pos = input.selectionStart || input.value.length;
              const val = input.value;
              input.value = val.slice(0, pos) + `{${v.name}}` + val.slice(pos);
              input.focus();
            }
            popup.remove();
          },
        },
      });
      item.innerHTML = html`<strong>{${v.name}}</strong> \u2014 ${v.desc}`;
      popup.appendChild(item);
    }

    // Position near the target input
    const input = qs(`#${targetInputId}`);
    if (input) {
      const rect = input.getBoundingClientRect();
      popup.style.top = `${rect.bottom + 4}px`;
      popup.style.left = `${rect.left}px`;
    }

    document.body.appendChild(popup);

    // Close on outside click
    const closeHandler = (e) => {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  }

  // === Helpers ===

  _createOverlay() {
    const overlay = el('div', { className: 'am-dialog-overlay' });
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', keyHandler);
      }
    };
    document.addEventListener('keydown', keyHandler);
    return overlay;
  }
}
