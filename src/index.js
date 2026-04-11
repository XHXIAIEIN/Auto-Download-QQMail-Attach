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
    if (!downloader.init()) return;

    if (window.location.pathname.includes('/login')) return;

    manager = new AttachmentManager(downloader);
    window.attachmentManager = manager;

    injectButton();
    listenFolderChange();
  }

  function injectButton() {
    document.querySelectorAll('#attachment-downloader-btn, [data-attachment-manager-btn]')
      .forEach(el => el.remove());

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
        setTimeout(() => injectButton(), 500);
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
