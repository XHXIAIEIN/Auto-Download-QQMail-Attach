export const MAIL_CONSTANTS = {
  BASE_URL: 'https://wx.mail.qq.com',
  API_ENDPOINTS: {
    MAIL_LIST: '/list/maillist',
    ATTACH_DOWNLOAD: '/attach/download',
    ATTACH_THUMBNAIL: '/attach/thumbnail',
    ATTACH_PREVIEW: '/attach/preview',
  },
};

export const REDIRECT_PATTERNS = [
  /window\.location\.href\s*=\s*['"]([^'"]+)['"]/,
  /location\.href\s*=\s*['"]([^'"]+)['"]/,
  /window\.location\s*=\s*['"]([^'"]+)['"]/,
  /location\s*=\s*['"]([^'"]+)['"]/,
  /window\.location\.replace\(['"]([^'"]+)['"]\)/,
  /location\.replace\(['"]([^'"]+)['"]\)/,
  /document\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/,
  /<meta[^>]+http-equiv=['"]refresh['"][^>]+content=['"][^'"]*url=([^'"]+)['"]/i,
  /href=['"]([^'"]*download[^'"]*)['"]/i,
  /url\(['"]([^'"]*download[^'"]*)['"]\)/i,
  /(https?:\/\/[^'">\s]+download[^'">\s]*)/i,
];

export const DEFAULT_HEADERS = Object.freeze({
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-language': 'en,zh-CN;q=0.9,zh;q=0.8',
  'sec-ch-ua-mobile': '?0',
  'sec-fetch-dest': 'iframe',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
});

export const FILE_TYPES = {
  '图片': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff'],
  '文档': ['doc', 'docx', 'pdf', 'txt', 'rtf', 'odt', 'pages', 'md'],
  '表格': ['xls', 'xlsx', 'csv', 'ods', 'numbers'],
  '演示': ['ppt', 'pptx', 'key', 'odp'],
  '压缩包': ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
  '音频': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
  '视频': ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
};

export const FILE_ICONS = {
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', webp: '🖼️', svg: '🖼️',
  doc: '📄', docx: '📄', pdf: '📄', txt: '📄', rtf: '📄', md: '📄',
  xls: '📊', xlsx: '📊', csv: '📊',
  ppt: '📑', pptx: '📑',
  zip: '🗜️', rar: '🗜️', '7z': '🗜️', tar: '🗜️', gz: '🗜️',
  mp3: '🎵', wav: '🎵', flac: '🎵',
  mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬',
};

export const TOAST_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

export const ATTACH_SOURCE = { NORMAL: 'normal', CLOUD: 'cloud' };

export const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024;

export const STALL_TIMEOUT = 30000;

export const PAGE_FETCH_CONCURRENT = 3;
export const PAGE_FETCH_DELAY = 200;
export const PAGE_FETCH_RETRY = 2;
export const PAGE_SIZE = 50;
