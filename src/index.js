import './styles/design-system.css';
import { QQMailDownloader } from './api/downloader.js';
import { AttachmentManager } from './core/attachment-manager.js';

(function () {
  'use strict';

  let downloader = null;
  let manager = null;

  function init() {
    if (manager) return;

    downloader = new QQMailDownloader();
    if (!downloader.init()) {
      console.warn('[QQMailDownloader] SID not found, skipping init');
      return;
    }

    if (window.location.pathname.includes('/login')) return;

    try {
      manager = new AttachmentManager(downloader);
      window.attachmentManager = manager;
      console.log('[QQMailDownloader] v2.0.0 initialized');
    } catch (e) {
      console.error('[QQMailDownloader] init failed:', e);
      manager = null;
    }

    injectToolbarButton();
    listenFolderChange();
  }

  /** 在邮件列表工具栏（删除/转发那一栏）中注入"附件管理"按钮 */
  function injectToolbarButton(retries = 0) {
    // 清理旧按钮
    document.querySelectorAll('[data-attachment-manager-btn]').forEach(el => el.remove());

    const rightWrap = document.querySelector('.mail-list-page-toolbar .right-wrap');
    if (!rightWrap) {
      if (retries < 10) {
        // 工具栏还没渲染，等待重试
        setTimeout(() => injectToolbarButton(retries + 1), 500);
        return;
      }
      // 重试耗尽，回退到浮动按钮
      injectFloatingButton();
      return;
    }

    // 用 QQ 邮箱原生按钮的类名和结构，完全融入
    const btn = document.createElement('div');
    btn.className = 'xmail-ui-btn ui-btn-size32 ui-btn-border ui-btn-them-clear-gray';
    btn.setAttribute('data-attachment-manager-btn', 'true');
    btn.setAttribute('data-a11y', 'button');
    btn.style.marginRight = '8px';
    btn.innerHTML = `
      <div class="xmail-ui-icon ui-btn-icon" style="width:20px;height:20px">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      </div>
      <div class="ui-btn-text">附件管理</div>
    `;
    btn.addEventListener('click', () => manager?.toggle());

    // 插入到 ellipsis 组件之后、"共 N 封"之前，始终可见
    const totalWrap = rightWrap.querySelector('.mail-list-page-toolbar-mail-total');
    if (totalWrap) {
      rightWrap.insertBefore(btn, totalWrap);
    } else {
      const ellipsis = rightWrap.querySelector('.xmail-ui-toolbar-ellipsis');
      if (ellipsis && ellipsis.nextSibling) {
        rightWrap.insertBefore(btn, ellipsis.nextSibling);
      } else {
        rightWrap.appendChild(btn);
      }
    }
  }

  /** 回退方案：右下角浮动按钮 */
  function injectFloatingButton() {
    const btn = document.createElement('button');
    btn.id = 'attachment-downloader-btn';
    btn.setAttribute('data-attachment-manager-btn', 'true');
    btn.className = 'am-btn am-btn--primary';
    btn.textContent = '📎 附件管理';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9998;padding:10px 20px;font-size:14px;border-radius:var(--am-radius-full);box-shadow:var(--am-shadow-lg);';
    btn.addEventListener('click', () => manager?.toggle());
    document.body.appendChild(btn);
  }

  function listenFolderChange() {
    let currentFolder = downloader.getCurrentFolderId();
    window.addEventListener('hashchange', () => {
      const newFolder = downloader.getCurrentFolderId();
      if (currentFolder !== newFolder) {
        currentFolder = newFolder;
        // 文件夹切换后重新注入工具栏按钮
        setTimeout(() => injectToolbarButton(), 500);
      }
    });
  }

  const observer = new MutationObserver(() => {
    if (document.querySelector('#mailMainApp') && !manager) {
      observer.disconnect();
      init();
    }
  });

  function start() {
    if (document.querySelector('#mailMainApp')) {
      init();
    } else {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
