const ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;
const RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const MAX_FILENAME_LENGTH = 200;

export function sanitizeFileName(fileName, replacementChar = '_') {
  if (!fileName) return 'untitled';

  let result = fileName
    .replace(ILLEGAL_CHARS, replacementChar)
    .replace(/\s+/g, ' ')
    .trim();

  const dotIndex = result.lastIndexOf('.');
  const name = dotIndex > 0 ? result.substring(0, dotIndex) : result;
  const ext = dotIndex > 0 ? result.substring(dotIndex) : '';

  if (RESERVED_NAMES.test(name)) {
    result = `_${name}${ext}`;
  }

  if (result.length > MAX_FILENAME_LENGTH) {
    const extLen = ext.length;
    result = result.substring(0, MAX_FILENAME_LENGTH - extLen) + ext;
  }

  return result || 'untitled';
}

export function getExtension(fileName) {
  if (!fileName) return '';
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.substring(dotIndex + 1).toLowerCase() : '';
}

export function getBaseName(fileName) {
  if (!fileName) return '';
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
}
