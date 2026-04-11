export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${size} ${units[i]}`;
}

export function formatDate(dateOrTimestamp, format) {
  const date = normalizeDate(dateOrTimestamp);
  if (!date) return '';

  if (!format) {
    return date.toLocaleDateString('zh-CN') + ' ' +
      date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  const pad = n => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const M = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const H = pad(date.getHours());
  const h = pad(date.getHours() % 12 || 12);
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  return format
    .replace('YYYY', y).replace('MM', M).replace('DD', d)
    .replace('HH', H).replace('hh', h).replace('mm', m).replace('ss', s);
}

export function normalizeDate(data) {
  if (!data) return null;
  if (data instanceof Date) return isNaN(data.getTime()) ? null : data;
  const ts = typeof data === 'number' && data < 10000000000 ? data * 1000 : data;
  const date = new Date(ts);
  return isNaN(date.getTime()) ? null : date;
}

export function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '计算中...';
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
  return `${Math.round(seconds / 3600)}小时`;
}
