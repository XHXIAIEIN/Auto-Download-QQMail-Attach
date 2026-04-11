import { html, trusted } from '../html.js';
import { formatFileSize } from '../utils/format.js';
import { FILE_TYPES } from '../constants.js';
import { el, qs } from '../utils/dom.js';
import { getExtension } from '../utils/sanitize.js';

export class BentoLayout {
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
    container.innerHTML = '';

    const bento = el('div', { className: 'am-bento am-scroll' });

    // Header card
    bento.appendChild(this._createHeaderCard(stats));

    // Stats row
    bento.appendChild(this._createStatsRow(stats, attachments));

    // Toolbar
    const toolbarContainer = el('div');
    this.manager.toolbar.render(toolbarContainer);
    bento.appendChild(toolbarContainer);

    // Attachment grid
    const gridContainer = el('div', { id: 'attachment-grid-area' });
    const filtered = this.manager.toolbar.getFilteredAttachments(attachments);
    this.manager.grid.render(gridContainer, filtered);
    bento.appendChild(gridContainer);

    container.appendChild(bento);
  }

  _createHeaderCard(stats) {
    const card = el('div', { className: 'am-bento-header' });
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
            ${String(stats.attachmentCount)} 个附件 · ${formatFileSize(stats.totalSize)}${trusted(stats.skippedCount > 0
              ? ` · <span style="color:var(--am-warning)">${stats.skippedCount} 个已跳过</span>`
              : '')}
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

    // Events
    qs('#am-back-btn', card)?.addEventListener('click', () => this.manager.close());
    qs('#am-btn-settings', card)?.addEventListener('click', () => this.manager.showSettings());
    qs('#am-btn-compare', card)?.addEventListener('click', () => this.manager.showCompare());
    qs('#am-btn-download-all', card)?.addEventListener('click', () => this.manager.downloadAll());

    return card;
  }

  _createStatsRow(stats, attachments) {
    // Count by type
    const typeCounts = {};
    for (const att of attachments) {
      const ext = getExtension(att.name);
      let typeName = '其他';
      for (const [name, exts] of Object.entries(FILE_TYPES)) {
        if (exts.includes(ext)) { typeName = name; break; }
      }
      typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
    }

    const row = el('div', { className: 'am-stat-grid' });

    // Main stats
    const items = [
      { label: '邮件数', value: String(stats.mailCount) },
      { label: '附件数', value: String(stats.attachmentCount) },
      { label: '总大小', value: formatFileSize(stats.totalSize) },
    ];

    // Type distribution
    for (const [name, count] of Object.entries(typeCounts)) {
      items.push({ label: name, value: String(count) });
    }

    for (const item of items) {
      const stat = el('div', { className: 'am-stat-item' });
      stat.innerHTML = html`
        <div class="am-stat-number">${item.value}</div>
        <div class="am-stat-label">${item.label}</div>
      `;
      row.appendChild(stat);
    }

    return row;
  }

  updateStats(stats) {
    const info = qs('#attachment-count-info');
    if (info) {
      info.textContent = `${stats.mailCount} 封邮件 · ${stats.attachmentCount} 个附件`;
    }
  }
}
