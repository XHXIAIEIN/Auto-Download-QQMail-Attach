import { html, trusted } from '../html.js';
import { FILE_ICONS, MAIL_CONSTANTS } from '../constants.js';
import { formatFileSize, formatDate, normalizeDate } from '../utils/format.js';
import { getExtension } from '../utils/sanitize.js';
import { qs } from '../utils/dom.js';

export class AttachmentGrid {
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

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'am-grid';

    for (const att of attachments) {
      grid.appendChild(this._createCard(att));
    }
    container.appendChild(grid);
  }

  showLoading(container, message = '加载中...') {
    container.innerHTML = html`<div class="am-state am-state--loading">${message}</div>`;
  }

  showEmpty(container) {
    container.innerHTML = '<div class="am-state am-state--empty">暂无附件</div>';
  }

  showError(container, message) {
    container.innerHTML = html`<div class="am-state am-state--error">${message}</div>`;
  }

  /** Create a single attachment card element */
  _createCard(attachment) {
    const card = document.createElement('div');
    card.className = 'am-card am-card--attachment am-card--hover';

    const icon = this._getFileIcon(attachment.name);
    const thumbUrl = this._getThumbnailUrl(attachment);
    const size = formatFileSize(parseInt(attachment.size) || 0);
    const date = normalizeDate(attachment.date || attachment.totime);
    const dateStr = date ? formatDate(date, 'MM-DD') : '';
    const isSelected = this.manager.selectedAttachments.has(attachment.fileid || attachment.name);

    // Build card HTML — no inline event handlers (CSP blocks them)
    card.innerHTML = html`
      <input type="checkbox" class="am-checkbox"
        style="position:absolute;top:var(--am-space-2);left:var(--am-space-2);z-index:10"
        ${trusted(isSelected ? 'checked' : '')}
        data-attachment-id="${attachment.fileid || attachment.name}">
      <div class="am-card-preview">
        ${trusted(thumbUrl
          ? `<img class="am-thumb" src="${thumbUrl}" alt="" style="width:100%;height:100%;object-fit:cover;display:none">
             <span class="am-thumb-fallback" style="font-size:24px;display:flex;width:100%;height:100%;align-items:center;justify-content:center">${icon}</span>`
          : `<span style="font-size:24px">${icon}</span>`
        )}
      </div>
      <div style="padding:var(--am-space-2);display:flex;flex-direction:column;gap:2px">
        <div class="am-card-title" title="${attachment.name}">${attachment.name}</div>
        <div class="am-card-meta">${size}${trusted(dateStr ? ` · ${dateStr}` : '')}</div>
      </div>
    `;

    // Thumbnail load/error via addEventListener (CSP-safe)
    const img = qs('.am-thumb', card);
    if (img) {
      const fallback = qs('.am-thumb-fallback', card);
      img.addEventListener('load', () => {
        img.style.display = '';
        if (fallback) fallback.style.display = 'none';
      });
      img.addEventListener('error', () => {
        img.style.display = 'none';
        if (fallback) fallback.style.display = 'flex';
      });
    }

    // Checkbox toggle
    const checkbox = qs('input[type="checkbox"]', card);
    checkbox?.addEventListener('change', (e) => {
      e.stopPropagation();
      const id = attachment.fileid || attachment.name;
      if (e.target.checked) {
        this.manager.selectedAttachments.add(id);
      } else {
        this.manager.selectedAttachments.delete(id);
      }
    });

    // Card click = toggle checkbox
    card.addEventListener('click', (e) => {
      if (e.target === checkbox) return;
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });

    return card;
  }

  _getFileIcon(filename) {
    const ext = getExtension(filename);
    return FILE_ICONS[ext] || '📎';
  }

  _getThumbnailUrl(attachment) {
    if (!attachment?.fileid || !attachment?.mailId) return null;
    const ext = getExtension(attachment.name);
    const supported = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
    if (!supported.includes(ext)) return null;
    const sid = this.manager.downloader?.sid || '';
    if (!sid) return null;
    return `${MAIL_CONSTANTS.BASE_URL}${MAIL_CONSTANTS.API_ENDPOINTS.ATTACH_THUMBNAIL}?mailid=${attachment.mailId}&fileid=${attachment.fileid}&name=${encodeURIComponent(attachment.name)}&sid=${sid}`;
  }
}
