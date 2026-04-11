import { html, trusted } from '../html.js';
import { FILE_TYPES } from '../constants.js';
import { el, qs, qsa } from '../utils/dom.js';
import { getExtension } from '../utils/sanitize.js';

/**
 * Filter / Sort / Search / Batch-action toolbar.
 * Rendered inside the panel's content area, above the attachment grid.
 */
export class Toolbar {
  constructor(manager) {
    this.manager = manager;
    this.currentFilter = 'all';
    this.currentSort = 'date';
    this.searchKeyword = '';
    this._sortMenu = null;
    this._closeSortMenu = null;
  }

  /* -------------------------------------------------- */
  /*  Public                                             */
  /* -------------------------------------------------- */

  /** Build toolbar DOM and append to `container`. */
  render(container) {
    const wrapper = el('div', { className: 'am-toolbar' });
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

    let result = attachments.filter(att => {
      if (!att) return false;

      // -- type filter --
      if (this.currentFilter !== 'all') {
        const type = this._getFileType(att.name);
        switch (this.currentFilter) {
          case 'images':    if (type !== '图片') return false; break;
          case 'documents': if (!['文档', '表格', '演示'].includes(type)) return false; break;
          case 'archives':  if (type !== '压缩包') return false; break;
          case 'media':     if (!['音频', '视频'].includes(type)) return false; break;
          case 'others':
            if (['图片', '文档', '表格', '演示', '压缩包', '音频', '视频'].includes(type)) return false;
            break;
        }
      }

      // -- keyword search --
      if (keyword) {
        const name    = (att.name || '').toLowerCase();
        const subject = (att.mailSubject || '').toLowerCase();
        const sender  = (att.senderName || '').toLowerCase();
        if (!name.includes(keyword) && !subject.includes(keyword) && !sender.includes(keyword)) {
          return false;
        }
      }

      return true;
    });

    // -- sort --
    result = this._sort(result);
    return result;
  }

  /** Destroy any floating menus this toolbar owns. */
  destroy() {
    this._removeSortMenu();
  }

  /* -------------------------------------------------- */
  /*  Internal — HTML                                   */
  /* -------------------------------------------------- */

  _buildHTML() {
    const filterButtons = [
      { key: 'all',       label: '全部' },
      { key: 'images',    label: '图片' },
      { key: 'documents', label: '文档' },
      { key: 'archives',  label: '压缩包' },
      { key: 'media',     label: '音视频' },
      { key: 'others',    label: '其他' },
    ];

    const filterHtml = filterButtons
      .map(f => {
        const active = f.key === this.currentFilter ? ' am-tab active' : ' am-tab';
        return `<button class="${active}" data-filter="${f.key}">${f.label}</button>`;
      })
      .join('');

    const sortLabels = { date: '按日期', size: '按大小', name: '按名称' };
    const sortLabel = sortLabels[this.currentSort] || '排序';

    return `
      <div class="am-toolbar__filters am-tabs">
        ${filterHtml}
      </div>
      <div class="am-toolbar__actions">
        <input class="am-input am-toolbar__search" type="text"
               placeholder="搜索文件名、邮件主题、发件人…"
               data-role="search" />
        <button class="am-btn am-btn--ghost am-btn--sm" data-role="sort">${html`${sortLabel}`} ▾</button>
        <button class="am-btn am-btn--sm" data-role="download-selected">下载选中</button>
        <button class="am-btn am-btn--primary am-btn--sm" data-role="download-all">全部下载</button>
      </div>
    `;
  }

  /* -------------------------------------------------- */
  /*  Internal — events                                  */
  /* -------------------------------------------------- */

  _setupEvents(wrapper) {
    // filter tabs
    qsa('[data-filter]', wrapper).forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentFilter = btn.dataset.filter;
        // toggle active class
        qsa('[data-filter]', wrapper).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._notify();
      });
    });

    // search
    const searchInput = qs('[data-role="search"]', wrapper);
    if (searchInput) {
      let timer = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.searchKeyword = searchInput.value.trim();
          this._notify();
        }, 200);
      });
    }

    // sort button
    const sortBtn = qs('[data-role="sort"]', wrapper);
    if (sortBtn) {
      sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._showSortMenu(sortBtn, wrapper);
      });
    }

    // batch actions
    const dlSelected = qs('[data-role="download-selected"]', wrapper);
    if (dlSelected) {
      dlSelected.addEventListener('click', () => this.manager.downloadSelected?.());
    }

    const dlAll = qs('[data-role="download-all"]', wrapper);
    if (dlAll) {
      dlAll.addEventListener('click', () => this.manager.downloadAll?.());
    }
  }

  _notify() {
    // tell the manager that filters changed so it can re-render the grid
    this.manager.onFilterChange?.();
  }

  /* -------------------------------------------------- */
  /*  Internal — sort menu                               */
  /* -------------------------------------------------- */

  _showSortMenu(button, wrapper) {
    this._removeSortMenu();

    const rect = button.getBoundingClientRect();
    const menu = el('div', { className: 'am-menu' });
    menu.style.top  = (rect.bottom + 4) + 'px';
    menu.style.left = rect.left + 'px';

    const options = [
      { value: 'date', label: '按日期' },
      { value: 'size', label: '按大小' },
      { value: 'name', label: '按名称' },
    ];

    options.forEach(opt => {
      const item = el('div', {
        className: 'am-menu-item',
        events: {
          click: () => {
            this.currentSort = opt.value;
            // update button label
            button.textContent = opt.label + ' ▾';
            this._removeSortMenu();
            this._notify();
          },
        },
      }, opt.label);

      if (this.currentSort === opt.value) {
        item.style.background = 'var(--am-bg-muted)';
        item.style.fontWeight = '600';
      }
      menu.appendChild(item);
    });

    document.body.appendChild(menu);
    this._sortMenu = menu;

    // close on outside click (deferred to avoid immediate trigger)
    this._closeSortMenu = (e) => {
      if (!menu.contains(e.target) && e.target !== button) {
        this._removeSortMenu();
      }
    };
    setTimeout(() => document.addEventListener('click', this._closeSortMenu), 0);
  }

  _removeSortMenu() {
    if (this._sortMenu) {
      this._sortMenu.remove();
      this._sortMenu = null;
    }
    if (this._closeSortMenu) {
      document.removeEventListener('click', this._closeSortMenu);
      this._closeSortMenu = null;
    }
  }

  /* -------------------------------------------------- */
  /*  Internal — helpers                                 */
  /* -------------------------------------------------- */

  /** Classify a filename into a Chinese type label via FILE_TYPES. */
  _getFileType(filename) {
    const ext = getExtension(filename);
    for (const [type, extensions] of Object.entries(FILE_TYPES)) {
      if (extensions.includes(ext)) return type;
    }
    return '其他';
  }

  /** Sort an array of attachments in-place and return it. */
  _sort(attachments) {
    return [...attachments].sort((a, b) => {
      switch (this.currentSort) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'date':
        default: {
          const da = a.date || a.totime || 0;
          const db = b.date || b.totime || 0;
          return db - da; // newest first
        }
      }
    });
  }
}
