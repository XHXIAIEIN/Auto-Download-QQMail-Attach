import { el, qs, remove } from '../utils/dom.js';

export class Panel {
  constructor(manager) {
    this.manager = manager;
    this.overlay = null;
    this.window = null;
    this.isMinimized = false;
    this.isMaximized = false;
    this.dragState = { isDragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
    this._keyHandler = null;
    this._moveHandler = null;
    this._upHandler = null;
  }

  create() {
    // Overlay
    this.overlay = el('div', {
      className: 'am-overlay',
      id: 'attachment-manager-overlay',
      events: { click: () => this.manager.close() },
    });

    // Window
    this.window = el('div', { className: 'am-window', id: 'am-window' });
    this.window.innerHTML = this._buildWindowHTML();

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.window);

    // Animate in
    requestAnimationFrame(() => {
      this.overlay.classList.add('show');
      this.window.classList.add('show');
    });

    this._setupDrag();
    this._setupControls();
    this._setupKeyboard();

    return {
      contentArea: qs('#attachment-content-area', this.window),
      progressArea: qs('#attachment-progress-area', this.window),
    };
  }

  destroy() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._moveHandler) {
      document.removeEventListener('mousemove', this._moveHandler);
      this._moveHandler = null;
    }
    if (this._upHandler) {
      document.removeEventListener('mouseup', this._upHandler);
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
    const folderName = qs('.toolbar-folder-name')?.textContent?.trim() || '附件管理器';
    return `
      <div class="am-window-header" id="am-window-header">
        <div style="display:flex;align-items:center;gap:var(--am-space-2)">
          <div class="am-window-dot am-window-dot--close" id="am-btn-close" title="关闭"></div>
          <div class="am-window-dot am-window-dot--minimize" id="am-btn-minimize" title="最小化"></div>
          <div class="am-window-dot am-window-dot--maximize" id="am-btn-maximize" title="最大化"></div>
        </div>
        <div style="font-size:14px;font-weight:600;color:var(--am-text)">${folderName}</div>
        <div id="attachment-count-info" style="font-size:12px;color:var(--am-text-tertiary)">加载中...</div>
      </div>
      <div class="am-window-content" style="position:relative">
        <div id="attachment-content-area" class="am-scroll" style="flex:1;overflow-y:auto"></div>
        <div id="attachment-progress-area" style="display:none"></div>
      </div>
    `;
  }

  _setupDrag() {
    const header = qs('#am-window-header', this.window);
    if (!header) return;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.am-window-dot')) return;
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
      this.window.style.transform = 'none';
    };
    document.addEventListener('mousemove', this._moveHandler);

    this._upHandler = () => { this.dragState.isDragging = false; };
    document.addEventListener('mouseup', this._upHandler);
  }

  _setupControls() {
    qs('#am-btn-close', this.window)?.addEventListener('click', () => this.manager.close());
    qs('#am-btn-minimize', this.window)?.addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      this.window.classList.toggle('minimized', this.isMinimized);
    });
    qs('#am-btn-maximize', this.window)?.addEventListener('click', () => {
      this.isMaximized = !this.isMaximized;
      this.window.classList.toggle('maximized', this.isMaximized);
    });
  }

  _setupKeyboard() {
    this._keyHandler = (e) => {
      if (e.key === 'Escape') this.manager.close();
    };
    document.addEventListener('keydown', this._keyHandler);
  }
}
