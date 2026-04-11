import { TOAST_ICONS } from '../constants.js';
import { html, trusted } from '../html.js';

export function showToast(message, type = 'info', duration = 3000) {
  const icon = TOAST_ICONS[type] || TOAST_ICONS.info;

  const toast = document.createElement('div');
  toast.className = `am-toast am-toast--${type}`;
  toast.innerHTML = html`${trusted(icon)} ${message}`;

  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
