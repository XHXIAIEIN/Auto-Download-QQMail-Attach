import { formatDate, formatFileSize, normalizeDate } from '../utils/format.js';
import { sanitizeFileName, getExtension, getBaseName } from '../utils/sanitize.js';

/**
 * NamingEngine — 文件命名引擎
 * 负责模板变量替换、文件名验证、智能命名策略分析、备用名生成
 */
export class NamingEngine {
  constructor(settings) {
    this.settings = settings;
  }

  /** 设置快捷访问 */
  get _fileNaming() {
    return this.settings.data.fileNaming;
  }

  get _validation() {
    return this._fileNaming.validation;
  }

  // ─── 索引 / 补零 ──────────────────────────────────

  calculatePaddingDigits(total) {
    return Math.max(2, total.toString().length);
  }

  formatIndex(index, total) {
    const digits = this.calculatePaddingDigits(total);
    return String(index || 1).padStart(digits, '0');
  }

  // ─── 变量数据构建 ─────────────────────────────────

  /**
   * 构建模板变量上下文
   * @param {object} attachment - 附件对象
   * @param {object} [context] - 额外上下文 { totalMails, totalAttachments, folderName }
   */
  buildVariableData(attachment, context = {}) {
    const now = new Date();
    const rawDate = attachment.date || attachment.totime;
    const mailDate = rawDate ? normalizeDate(rawDate) || now : now;

    const totalMails = context.totalMails || 1;
    const totalAttachments = context.totalAttachments || 1;
    const folderName = context.folderName || '未知文件夹';

    return {
      // 邮件信息
      subject: sanitizeFileName(attachment.mailSubject || attachment.subject || '未知主题'),
      sender: sanitizeFileName(attachment.sender || '未知发件人'),
      senderEmail: attachment.senderEmail || '',
      senderName: sanitizeFileName(attachment.senderName || attachment.sender || '未知发件人'),
      mailIndex: this.formatIndex(attachment.mailIndex, totalMails),
      folderID: attachment.folderId || '',
      folderName: sanitizeFileName(folderName),
      mailId: attachment.mailId || '',

      // 附件信息
      fileName: attachment.name || '未知文件',
      fileNameNoExt: getBaseName(attachment.name || '未知文件'),
      fileType: getExtension(attachment.name || ''),
      fileId: attachment.fileid || '',
      fileIndex: this.formatIndex(attachment.fileIndex, totalAttachments),
      attachIndex: this.formatIndex(attachment.attachIndex, totalAttachments),
      size: attachment.size || 0,

      // 日期时间
      date: mailDate,
      time: formatDate(mailDate, 'HH-mm-ss'),
      datetime: formatDate(mailDate, 'YYYY-MM-DD_HH-mm-ss'),
      timestamp: Math.floor(mailDate.getTime() / 1000),
      year: formatDate(mailDate, 'YYYY'),
      month: formatDate(mailDate, 'MM'),
      day: formatDate(mailDate, 'DD'),
      hour: formatDate(mailDate, 'HH'),
      hour12: formatDate(mailDate, 'hh'),
      minute: formatDate(mailDate, 'mm'),
      second: formatDate(mailDate, 'ss'),
    };
  }

  // ─── 模板变量替换 ─────────────────────────────────

  /**
   * 通用变量替换（支持 {date:YYYY-MM} 格式化语法）
   */
  replaceVariables(template, variableData) {
    if (!template || !variableData) return template;

    let result = template;

    // 带格式的变量，如 {date:YYYY-MM}
    result = result.replace(/\{(\w+):([^}]+)\}/g, (match, varName, format) => {
      if (varName === 'date' && variableData.date) {
        const mailDate = normalizeDate(variableData.date);
        if (mailDate) return formatDate(mailDate, format);
      }
      return match;
    });

    // 普通变量，如 {senderName}
    result = result.replace(/\{(\w+)\}/g, (match, varName) => {
      const value = variableData[varName];
      return value !== undefined && value !== null ? String(value) : match;
    });

    return result;
  }

  /**
   * 自定义变量处理
   */
  processCustomVariables(variables, attachment) {
    if (!variables?.length) return {};

    const result = {};
    const entries = Object.entries(attachment);

    for (const variable of variables) {
      if (variable.name && variable.value) {
        let value = variable.value;
        for (const [key, val] of entries) {
          if (value.includes(`{${key}}`)) {
            value = value.replaceAll(`{${key}}`, val ?? '');
          }
        }
        result[variable.name] = value;
      }
    }
    return result;
  }

  // ─── 命名模式解析 ─────────────────────────────────

  /**
   * 简易命名模式解析（用于 prefix / fallback 等场景）
   */
  parseNamingPattern(pattern, attachment) {
    if (!pattern || !attachment) return '';

    const replacements = {
      name: attachment.name,
      fileName: attachment.name,
      mailSubject: sanitizeFileName(attachment.mailSubject || ''),
      subject: sanitizeFileName(attachment.mailSubject || ''),
      sender: sanitizeFileName(attachment.senderName || attachment.sender || ''),
      senderEmail: attachment.sender || '',
      mailId: attachment.mailId,
      attachmentId: attachment.fid,
      date: attachment.totime
        ? formatDate(normalizeDate(attachment.totime), 'YYYYMMDD')
        : '',
      toTime: attachment.totime
        ? formatDate(normalizeDate(attachment.totime), 'YYYYMMDDHHmmss')
        : '',
      fileType: getExtension(attachment.name),
      size: attachment.size ? formatFileSize(attachment.size) : '',
    };

    return pattern.replace(/\{(\w+)\}/g, (match, key) => replacements[key] ?? match);
  }

  // ─── 验证 ─────────────────────────────────────────

  /**
   * 验证文件名是否符合正则模式
   */
  validateFileName(fileName) {
    const v = this._validation;
    if (!v?.enabled || !v.pattern) return true;

    try {
      const regex = new RegExp(v.pattern);
      return regex.test(getBaseName(fileName));
    } catch {
      return true;
    }
  }

  // ─── 内容替换 ──────────────────────────────────────

  /**
   * 应用内容替换规则
   */
  applyContentReplacement(fileName, attachment = null) {
    const cr = this._validation?.contentReplacement;
    if (!cr?.enabled || !cr.search) return fileName;

    try {
      let result = fileName;
      const searchPattern = cr.search;
      let replaceContent = cr.replace ?? '';

      if (attachment && replaceContent.includes('{')) {
        replaceContent = this.parseNamingPattern(replaceContent, attachment);
      }

      if (cr.mode === 'regex') {
        const flags = (cr.global ? 'g' : '') + (cr.caseSensitive ? '' : 'i');
        result = result.replace(new RegExp(searchPattern, flags), replaceContent);
      } else if (cr.global) {
        if (cr.caseSensitive) {
          while (result.includes(searchPattern)) {
            result = result.replace(searchPattern, replaceContent);
          }
        } else {
          const escaped = searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          result = result.replace(new RegExp(escaped, 'gi'), replaceContent);
        }
      } else {
        // 单次替换
        const idx = cr.caseSensitive
          ? result.indexOf(searchPattern)
          : result.toLowerCase().indexOf(searchPattern.toLowerCase());
        if (idx !== -1) {
          result =
            result.substring(0, idx) +
            replaceContent +
            result.substring(idx + searchPattern.length);
        }
      }

      return result;
    } catch {
      return fileName;
    }
  }

  /**
   * 清理文件名（结合验证规则）
   */
  sanitize(fileName, attachment = null) {
    const v = this._validation;

    if (!v?.enabled) {
      return sanitizeFileName(fileName);
    }

    let cleanName = this.applyContentReplacement(fileName, attachment);

    const replacementChar = v.replacementChar || '_';
    if (v.removeInvalidChars !== false) {
      cleanName = cleanName.replace(/[<>:"/\\|?*\x00-\x1f]/g, replacementChar);
    }

    cleanName = cleanName.replace(/\s+/g, ' ').trim();

    if (replacementChar && replacementChar !== ' ') {
      const escaped = replacementChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleanName = cleanName.replace(new RegExp(`${escaped}{2,}`, 'g'), replacementChar);
    }

    cleanName = cleanName.replace(/^[._\-\s]+|[._\-\s]+$/g, '');

    return cleanName || 'unnamed_file';
  }

  // ─── 备用名生成 ────────────────────────────────────

  generateFallbackPrefix(fallbackPattern, attachment) {
    if (!fallbackPattern || !attachment) return '';

    switch (fallbackPattern) {
      case 'mailSubject':
        return sanitizeFileName(attachment.mailSubject || '');
      case 'senderEmail':
        return sanitizeFileName(attachment.sender || '');
      case 'toTime':
        return attachment.totime
          ? formatDate(normalizeDate(attachment.totime), 'YYYYMMDDHHmmss')
          : '';
      case 'customTemplate':
      case 'auto':
      default:
        return '';
    }
  }

  generateFallbackFileName(originalFileName, attachment) {
    const v = this._validation;
    const fallbackPattern = v?.fallbackPattern || 'auto';
    const ext = getExtension(originalFileName);

    let newName;

    switch (fallbackPattern) {
      case 'mailSubject':
        newName = attachment.mailSubject || attachment.subject || 'untitled';
        break;
      case 'senderEmail':
        newName = attachment.sender || 'unknown_sender';
        break;
      case 'toTime':
        newName = attachment.totime
          ? formatDate(normalizeDate(attachment.totime), 'YYYYMMDDHHmmss')
          : Date.now().toString();
        break;
      case 'customTemplate': {
        const template = v?.fallbackTemplate || '{subject}_{fileName}';
        newName = this.parseNamingPattern(template, attachment);
        break;
      }
      case 'auto':
      default: {
        const nameNoExt = getBaseName(originalFileName);
        const numbers = nameNoExt.match(/\d+/g);
        const letters = nameNoExt.match(/[a-zA-Z\u4e00-\u9fff]+/g);
        if (numbers?.length) {
          newName = numbers.join('_');
        } else if (letters?.length) {
          newName = letters.slice(0, 3).join('_');
        } else {
          newName = attachment.mailSubject || attachment.subject || `file_${Date.now()}`;
        }
        break;
      }
    }

    newName = this.sanitize(newName, attachment);
    return ext ? `${newName}.${ext}` : newName;
  }

  // ─── 命名分析 ──────────────────────────────────────

  findCommonPrefix(fileNames) {
    if (!fileNames?.length || fileNames.length < 2) return '';

    const separators = new Set(['+', '-', '_', ' ', '.', '(', ')', '[', ']']);
    let prefix = fileNames[0];

    for (let i = 1; i < fileNames.length && prefix.length > 0; i++) {
      const current = fileNames[i];
      const minLen = Math.min(prefix.length, current.length);
      let j = 0;
      while (j < minLen && prefix[j] === current[j]) j++;
      prefix = prefix.substring(0, j);
    }

    const lastSepIndex = [...prefix].findLastIndex((ch) => separators.has(ch));
    return lastSepIndex > 0 ? prefix.substring(0, lastSepIndex + 1) : prefix;
  }

  extractNamingPattern(fileName) {
    const patterns = [
      /^(.+?[+\-_\s])(\d+)([+\-_\s])(\d+)([+\-_\s]).*/,
      /^(.+?[+\-_\s])(\d+)([+\-_\s]).*/,
      /^(.+?)(\d{6,}).*/,
    ];

    for (const pattern of patterns) {
      const match = fileName.match(pattern);
      if (!match) continue;

      if (pattern === patterns[0]) {
        return match[1] + match[2] + match[3] + match[4] + match[5];
      }
      if (pattern === patterns[1]) {
        return match[1] + match[2] + match[3];
      }
      // patterns[2]
      const beforeNumber = match[1];
      const number = match[2];
      const separators = ['+', '-', '_', ' '];
      for (let i = beforeNumber.length - 1; i >= 0; i--) {
        if (separators.includes(beforeNumber[i])) {
          return beforeNumber.substring(0, i + 1) + number;
        }
      }
      return beforeNumber + number;
    }

    return '';
  }

  /**
   * 分析附件命名模式，返回策略
   */
  analyzeNaming(attachments, validationPattern) {
    if (!attachments?.length) return { strategy: 'default', prefix: '' };

    let regex;
    try {
      regex = new RegExp(validationPattern);
    } catch {
      return { strategy: 'default', prefix: '' };
    }

    const validAttachments = [];
    for (const att of attachments) {
      if (regex.test(att.name)) validAttachments.push(att);
    }
    const validCount = validAttachments.length;

    if (attachments.length === 1 || validCount === 0) {
      return { strategy: 'mailSubject', prefix: '' };
    }

    if (attachments.length >= 2 && validCount > 1) {
      const commonPrefix = this.findCommonPrefix(validAttachments.map((a) => a.name));
      if (commonPrefix?.length > 0) {
        return { strategy: 'commonPrefix', prefix: commonPrefix };
      }
    }

    if (validCount === 1) {
      const extracted = this.extractNamingPattern(validAttachments[0].name);
      if (extracted) {
        return { strategy: 'extractedPattern', prefix: extracted };
      }
    }

    return { strategy: 'mailSubject', prefix: '' };
  }

  // ─── 主入口 ────────────────────────────────────────

  /**
   * 生成文件名（支持智能 auto 模式）
   * @param {object} attachment - 附件对象
   * @param {object[]} [allAttachments] - 所有附件（用于 auto 分析）
   * @param {object} [namingStrategy] - 预计算的命名策略
   */
  generateFileName(attachment, allAttachments = null, namingStrategy = null) {
    const cfg = this._fileNaming;

    if (!cfg) return this.sanitize(attachment.name, attachment);

    let needsFallback = false;

    // 检查验证
    if (cfg.validation?.enabled && cfg.validation.pattern) {
      try {
        needsFallback = !new RegExp(cfg.validation.pattern).test(attachment.name);
      } catch {
        needsFallback = false;
      }
    }

    const parts = [];
    const ext = getExtension(attachment.name);
    let baseFileName = getBaseName(attachment.name);

    // 1. 命名策略
    if (cfg.useCustomPattern && cfg.customPattern) {
      baseFileName = this.parseNamingPattern(cfg.customPattern, attachment);
    } else if (needsFallback && cfg.validation.fallbackPattern) {
      if (cfg.validation.fallbackPattern === 'auto') {
        return this._generateAutoFileName(attachment, cfg, allAttachments, namingStrategy);
      }
      if (
        cfg.validation.fallbackPattern === 'customTemplate' &&
        cfg.validation.fallbackTemplate
      ) {
        baseFileName = this.parseNamingPattern(cfg.validation.fallbackTemplate, attachment);
      } else {
        const prefix = this.generateFallbackPrefix(cfg.validation.fallbackPattern, attachment);
        if (prefix) baseFileName = prefix + '_' + baseFileName;
      }
    }

    // 2. 备用命名前缀
    if (
      needsFallback &&
      cfg.validation.fallbackPattern &&
      cfg.validation.fallbackPattern !== 'auto' &&
      cfg.validation.fallbackPattern !== 'customTemplate'
    ) {
      const fallbackPrefix = this.generateFallbackPrefix(
        cfg.validation.fallbackPattern,
        attachment,
      );
      if (fallbackPrefix && !baseFileName.startsWith(fallbackPrefix)) {
        parts.push(fallbackPrefix);
      }
    }

    // 3. 前缀
    if (cfg.prefix) parts.push(cfg.prefix);

    // 基础文件名
    if (baseFileName) parts.push(baseFileName);

    // 后缀
    if (cfg.suffix) parts.push(cfg.suffix);

    // 合并
    if (parts.length > 0) {
      const sep = cfg.separator || '_';
      const finalBase = parts.join(sep);
      return this.sanitize(ext ? `${finalBase}.${ext}` : finalBase, attachment);
    }

    return this.sanitize(attachment.name, attachment);
  }

  /**
   * 智能 auto 模式文件名生成（内部方法）
   */
  _generateAutoFileName(attachment, cfg, allAttachments, namingStrategy) {
    if (!namingStrategy) {
      if (!allAttachments) {
        // 单附件，无法分析 → 简单拼接
        const parts = [];
        const ext = getExtension(attachment.name);

        if (attachment.mailSubject) parts.push(attachment.mailSubject);
        if (cfg.prefix) parts.push(cfg.prefix);

        const base = getBaseName(attachment.name);
        if (base) parts.push(base);
        if (cfg.suffix) parts.push(cfg.suffix);

        const sep = cfg.separator || '_';
        const finalBase = parts.join(sep);
        return this.sanitize(ext ? `${finalBase}.${ext}` : finalBase, attachment);
      }
      namingStrategy = this.analyzeNaming(allAttachments, cfg.validation.pattern);
    }

    // 预计算字段
    const nameWithoutExt = attachment.nameWithoutExt || getBaseName(attachment.name);
    const ext = attachment.ext || getExtension(attachment.name);

    const parts = [];
    let baseFileName = '';

    switch (namingStrategy.strategy) {
      case 'mailSubject':
        baseFileName = `${attachment.mailSubject}_${nameWithoutExt}`;
        break;

      case 'commonPrefix': {
        const remaining = attachment.name.startsWith(namingStrategy.prefix)
          ? attachment.name.substring(namingStrategy.prefix.length)
          : attachment.name;
        baseFileName = `${namingStrategy.prefix}${getBaseName(remaining)}`;
        break;
      }

      case 'extractedPattern':
        if (nameWithoutExt.startsWith(namingStrategy.prefix)) {
          const suffix = nameWithoutExt.substring(namingStrategy.prefix.length);
          baseFileName = `${namingStrategy.prefix}${suffix}`;
        } else {
          baseFileName = `${namingStrategy.prefix}${nameWithoutExt}`;
        }
        break;

      default:
        baseFileName = `${attachment.mailSubject}_${nameWithoutExt}`;
        break;
    }

    if (cfg.prefix) parts.push(cfg.prefix);
    if (baseFileName) parts.push(baseFileName);
    if (cfg.suffix) parts.push(cfg.suffix);

    const sep = cfg.separator || '_';
    const finalBase = parts.length > 0 ? parts.join(sep) : baseFileName;
    const finalName = ext ? `${finalBase}.${ext}` : finalBase;
    const sanitized = this.sanitize(finalName, attachment);

    if (!this.validateFileName(sanitized)) {
      return this.generateFallbackFileName(sanitized, attachment);
    }

    return sanitized;
  }
}
