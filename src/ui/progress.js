import { html } from '../html.js';
import { formatFileSize, formatTime } from '../utils/format.js';
import { qs } from '../utils/dom.js';

export class ProgressBar {
  constructor(container) {
    this.container = container;
  }

  show(message = '正在下载附件...') {
    this.container.style.display = 'block';
    this.container.style.cssText = 'display:block;padding:var(--am-space-4) var(--am-space-5);border-top:1px solid var(--am-border);background:var(--am-bg);position:absolute;bottom:0;left:0;right:0;z-index:1001';
    this.container.innerHTML = `
      <div style="margin-bottom:var(--am-space-2);font-weight:500;color:var(--am-text)">${message}</div>
      <div class="am-progress" style="height:6px;margin-bottom:var(--am-space-2)">
        <div id="am-progress-bar" class="am-progress-bar" style="width:0%"></div>
      </div>
      <div id="am-progress-status" style="font-size:12px;color:var(--am-text-tertiary)">准备开始...</div>
    `;
  }

  hide() {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }

  update(stats) {
    const bar = qs('#am-progress-bar');
    const status = qs('#am-progress-status');
    if (!bar || !status) return;

    const effective = stats.completedBytes + (stats.activeFileBytes || 0);
    const percent = stats.totalBytes > 0 ? (effective / stats.totalBytes * 100) : 0;
    bar.style.width = `${Math.min(percent, 100)}%`;

    const remaining = stats.speed > 0 ? (stats.totalBytes - effective) / stats.speed : 0;

    status.textContent = `下载中 ${stats.completedCount}/${stats.totalCount} · ${formatFileSize(effective)} / ${formatFileSize(stats.totalBytes)} · ${formatFileSize(Math.round(stats.speed))}/s · 剩余约 ${formatTime(remaining)}`;
  }
}
