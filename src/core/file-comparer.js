import { formatFileSize } from '../utils/format.js';
import { getExtension, getBaseName } from '../utils/sanitize.js';

/**
 * FileComparer — 文件对比引擎
 * 纯逻辑类，负责本地文件扫描、附件匹配、重复检测
 */
export class FileComparer {

  // ─── 本地文件扫描 ──────────────────────────────────────

  /**
   * 递归获取目录下所有文件
   * @param {FileSystemDirectoryHandle} dirHandle
   * @param {Function|null} onProgress  回调 (stage, detail, current, total)
   * @param {string} path  当前路径前缀
   */
  async getLocalFiles(dirHandle, onProgress = null, path = '') {
    if (onProgress) {
      return this._getLocalFilesWithProgress(dirHandle, onProgress, path);
    }
    return this._getLocalFilesSimple(dirHandle, path);
  }

  /** 简单递归，无进度回调 */
  async _getLocalFilesSimple(dirHandle, path = '') {
    const files = [];

    for await (const [name, handle] of dirHandle.entries()) {
      const fullPath = path ? `${path}/${name}` : name;

      if (handle.kind === 'file') {
        try {
          const file = await handle.getFile();
          files.push({
            name,
            path: fullPath,
            size: file.size,
            type: getExtension(name),
            lastModified: file.lastModified,
            handle,
          });
        } catch (_) { /* 静默忽略 */ }
      } else if (handle.kind === 'directory') {
        const subFiles = await this._getLocalFilesSimple(handle, fullPath);
        files.push(...subFiles);
      }
    }

    return files;
  }

  /** 带进度、超时、深度保护的递归扫描 */
  async _getLocalFilesWithProgress(dirHandle, updateProgress, path = '') {
    const files = [];
    let processedCount = 0;
    const visitedPaths = new Set();
    const MAX_DEPTH = 10;
    const MAX_FILES = 10000;
    const MAX_DIR_ENTRIES = 1000;
    const startTime = Date.now();
    const MAX_TIME = 30000;

    const _checkTimeout = () => {
      if (Date.now() - startTime > MAX_TIME) {
        throw new Error('文件扫描超时，请选择文件数量较少的文件夹');
      }
    };

    // 第一遍：统计总数
    const countFiles = async (handle, currentPath = '', depth = 0) => {
      _checkTimeout();
      if (depth > MAX_DEPTH) return 0;

      const normalizedPath = currentPath.toLowerCase();
      if (visitedPaths.has(normalizedPath)) return 0;
      visitedPaths.add(normalizedPath);

      let count = 0;
      try {
        const entries = [];
        for await (const [name, subHandle] of handle.entries()) {
          entries.push([name, subHandle]);
          if (entries.length > MAX_DIR_ENTRIES) break;
        }
        for (const [name, subHandle] of entries) {
          if (count > MAX_FILES) break;
          if (subHandle.kind === 'file') {
            count++;
          } else if (subHandle.kind === 'directory') {
            try {
              count += await countFiles(subHandle, currentPath ? `${currentPath}/${name}` : name, depth + 1);
            } catch (_) { /* skip */ }
          }
        }
      } catch (_) { /* skip */ }

      visitedPaths.delete(normalizedPath);
      return count;
    };

    updateProgress('正在扫描本地文件', '统计文件数量...', 0, 1);
    const totalCount = await countFiles(dirHandle);

    if (totalCount === 0) {
      updateProgress('扫描完成', '未找到任何文件', 1, 1);
      return files;
    }
    if (totalCount > MAX_FILES) {
      throw new Error(`文件数量过多(${totalCount})，请选择包含文件较少的文件夹(建议少于${MAX_FILES}个)`);
    }

    updateProgress('正在扫描本地文件', `发现 ${totalCount} 个文件，开始处理...`, 0, totalCount);
    visitedPaths.clear();

    // 第二遍：读取文件信息
    const processFiles = async (handle, currentPath = '', depth = 0) => {
      _checkTimeout();
      if (depth > MAX_DEPTH) return;

      const normalizedPath = currentPath.toLowerCase();
      if (visitedPaths.has(normalizedPath)) return;
      visitedPaths.add(normalizedPath);

      try {
        const entries = [];
        for await (const [name, subHandle] of handle.entries()) {
          entries.push([name, subHandle]);
          if (entries.length > MAX_DIR_ENTRIES) break;
        }

        for (const [name, subHandle] of entries) {
          if (files.length >= MAX_FILES) break;
          const fullPath = currentPath ? `${currentPath}/${name}` : name;

          if (subHandle.kind === 'file') {
            try {
              const file = await subHandle.getFile();
              files.push({
                name,
                path: fullPath,
                size: file.size,
                type: getExtension(name),
                lastModified: file.lastModified,
                handle: subHandle,
              });
              processedCount++;
              if (processedCount % 50 === 0 || processedCount === totalCount) {
                updateProgress('正在扫描本地文件', `已处理 ${processedCount}/${totalCount} 个文件`, processedCount, totalCount);
                await new Promise(r => setTimeout(r, 10));
              }
            } catch (_) {
              processedCount++;
            }
          } else if (subHandle.kind === 'directory') {
            try { await processFiles(subHandle, fullPath, depth + 1); } catch (_) { /* skip */ }
          }
        }
      } catch (_) { /* skip */ }

      visitedPaths.delete(normalizedPath);
    };

    await processFiles(dirHandle, path);
    updateProgress('扫描完成', `成功处理 ${files.length} 个文件`, files.length, totalCount);
    return files;
  }

  // ─── 文件名工具 ──────────────────────────────────────

  /** 标准化文件名，移除常见重命名后缀 */
  normalizeFileName(fileName) {
    const nameWithoutExt = getBaseName(fileName);
    return nameWithoutExt
      .replace(/\s*\(\d+\)$/, '')
      .replace(/\s*_\d+$/, '')
      .replace(/\s*-\d+$/, '')
      .replace(/\s*副本$/, '')
      .replace(/\s*[Cc]opy$/, '')
      .replace(/\s*复制$/, '')
      .trim()
      .toLowerCase();
  }

  /** 计算两个文件名的相似度 (0-1) */
  calculateSimilarity(name1, name2) {
    const norm1 = this.normalizeFileName(name1);
    const norm2 = this.normalizeFileName(name2);

    if (norm1 === norm2) return 0.95;

    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /** Levenshtein 编辑距离（滚动数组优化） */
  levenshteinDistance(str1, str2) {
    if (str1 === str2) return 0;
    if (!str1.length) return str2.length;
    if (!str2.length) return str1.length;

    let prev = Array.from({ length: str2.length + 1 }, (_, i) => i);
    let curr = new Array(str2.length + 1);

    for (let i = 1; i <= str1.length; i++) {
      curr[0] = i;
      for (let j = 1; j <= str2.length; j++) {
        curr[j] = str1[i - 1] === str2[j - 1]
          ? prev[j - 1]
          : Math.min(prev[j - 1], prev[j], curr[j - 1]) + 1;
      }
      [prev, curr] = [curr, prev];
    }
    return prev[str2.length];
  }

  // ─── 文件对比 ──────────────────────────────────────

  /** 对比本地文件与邮件附件 */
  compareFiles(localFiles, emailAttachments) {
    const result = {
      missing: [], duplicates: [], matched: [], localOnly: [],
      summary: {
        totalEmail: emailAttachments.length,
        totalLocal: localFiles.length,
        missingCount: 0,
        duplicateCount: 0,
        matchedCount: 0,
        emailTotalSize: 0,
        localTotalSize: 0,
        matchedTotalSize: 0,
        missingTotalSize: 0,
      },
    };

    // 建立本地文件索引
    const localFileMap = new Map();
    const usedLocalFiles = new Set();

    for (const file of localFiles) {
      const normalizedKey = this.normalizeFileName(file.name);
      const sizeTypeKey = `${file.size}_${file.type}`;

      if (!localFileMap.has(normalizedKey)) localFileMap.set(normalizedKey, []);
      if (!localFileMap.has(sizeTypeKey)) localFileMap.set(sizeTypeKey, []);

      localFileMap.get(normalizedKey).push({ file, type: 'exact' });
      localFileMap.get(sizeTypeKey).push({ file, type: 'fuzzy' });
    }

    // 匹配附件
    for (const attachment of emailAttachments) {
      const normalizedName = this.normalizeFileName(attachment.name);
      const sizeTypeKey = `${attachment.size}_${attachment.type}`;
      let bestMatch = null;

      // 精确匹配
      const exactCandidates = localFileMap.get(normalizedName) ?? [];
      for (const { file } of exactCandidates.filter(c => c.type === 'exact')) {
        if (!usedLocalFiles.has(file) && file.size === attachment.size && file.type === attachment.type) {
          bestMatch = { file, type: 'exact', similarity: 1.0 };
          break;
        }
      }

      // 模糊匹配
      if (!bestMatch) {
        const fuzzyCandidates = localFileMap.get(sizeTypeKey) ?? [];
        let bestSimilarity = 0;
        for (const { file } of fuzzyCandidates.filter(c => c.type === 'fuzzy')) {
          if (usedLocalFiles.has(file)) continue;
          const similarity = this.calculateSimilarity(attachment.name, file.name);
          if (similarity > 0.6 && similarity > bestSimilarity) {
            bestMatch = { file, type: 'renamed', similarity };
            bestSimilarity = similarity;
          }
        }
      }

      if (bestMatch) {
        result.matched.push({
          email: attachment,
          local: bestMatch.file,
          matchType: bestMatch.type,
          similarity: bestMatch.similarity,
        });
        usedLocalFiles.add(bestMatch.file);
      } else {
        result.missing.push(attachment);
      }
    }

    // 重复检测 & 本地独有
    const localFileUsage = new Map();
    for (const match of result.matched) {
      const key = `${match.local.path}_${match.local.size}`;
      if (!localFileUsage.has(key)) localFileUsage.set(key, []);
      localFileUsage.get(key).push(match);
    }
    for (const matches of localFileUsage.values()) {
      if (matches.length > 1) {
        result.duplicates.push({ localFile: matches[0].local, emailAttachments: matches.map(m => m.email) });
      }
    }
    result.localOnly = localFiles.filter(f => !usedLocalFiles.has(f));

    // 统计
    result.summary.emailTotalSize = emailAttachments.reduce((s, a) => s + a.size, 0);
    result.summary.localTotalSize = localFiles.reduce((s, f) => s + f.size, 0);
    result.summary.matchedTotalSize = result.matched.reduce((s, m) => s + m.email.size, 0);
    result.summary.missingTotalSize = result.missing.reduce((s, a) => s + a.size, 0);
    Object.assign(result.summary, {
      matchedCount: result.matched.length,
      missingCount: result.missing.length,
      duplicateCount: result.duplicates.length,
    });

    return result;
  }

  // ─── 重复检测 ──────────────────────────────────────

  /** 全面重复检测 */
  detectDuplicates(matchedFiles, localFiles, emailAttachments) {
    const duplicates = [];

    // 1. 一个本地文件匹配多个邮件附件
    const localToEmails = new Map();
    for (const match of matchedFiles) {
      const key = this._generateFileKey(match.local);
      if (!localToEmails.has(key)) localToEmails.set(key, []);
      localToEmails.get(key).push(match);
    }
    for (const [, matches] of localToEmails) {
      if (matches.length > 1) {
        duplicates.push({
          type: 'oneToMany',
          localFile: matches[0].local,
          emailAttachments: matches.map(m => m.email),
          reason: '一个本地文件匹配多个邮件附件',
          severity: 'high',
        });
      }
    }

    // 2. 多个本地文件匹配同一个邮件附件
    const emailToLocals = new Map();
    for (const match of matchedFiles) {
      const key = this._generateEmailKey(match.email);
      if (!emailToLocals.has(key)) emailToLocals.set(key, []);
      emailToLocals.get(key).push(match);
    }
    for (const [, matches] of emailToLocals) {
      if (matches.length > 1) {
        duplicates.push({
          type: 'manyToOne',
          emailAttachment: matches[0].email,
          localFiles: matches.map(m => m.local),
          reason: '多个本地文件匹配同一个邮件附件',
          severity: 'medium',
        });
      }
    }

    // 3. 本地重复
    for (const dup of this.findLocalDuplicates(localFiles)) {
      duplicates.push({ type: 'localDuplicate', localFiles: dup.files, reason: dup.reason, severity: 'low' });
    }

    // 4. 邮件附件重复
    for (const dup of this.findEmailDuplicates(emailAttachments)) {
      duplicates.push({ type: 'emailDuplicate', emailAttachments: dup.files, reason: dup.reason, severity: 'info' });
    }

    return duplicates;
  }

  /** 查找本地文件中的重复 */
  findLocalDuplicates(localFiles) {
    const duplicates = [];
    const sizeGroups = new Map();

    for (const file of localFiles) {
      if (!sizeGroups.has(file.size)) sizeGroups.set(file.size, []);
      sizeGroups.get(file.size).push(file);
    }

    for (const [size, files] of sizeGroups) {
      if (files.length <= 1) continue;

      // 按标准化文件名分组
      const nameGroups = new Map();
      for (const file of files) {
        const norm = this.normalizeFileName(file.name);
        if (!nameGroups.has(norm)) nameGroups.set(norm, []);
        nameGroups.get(norm).push(file);
      }

      // 同名同大小
      for (const [, sameNameFiles] of nameGroups) {
        if (sameNameFiles.length > 1) {
          duplicates.push({
            files: sameNameFiles,
            reason: `相同大小(${formatFileSize(size)})和相似文件名的文件`,
          });
        }
      }

      // 不同名但相同大小且文件名相似（>1KB）
      if (nameGroups.size > 1 && size > 1024) {
        const allFiles = Array.from(nameGroups.values()).flat();
        const similarFiles = [];
        for (let i = 0; i < allFiles.length; i++) {
          for (let j = i + 1; j < allFiles.length; j++) {
            if (this.calculateSimilarity(allFiles[i].name, allFiles[j].name) > 0.7) {
              if (!similarFiles.includes(allFiles[i])) similarFiles.push(allFiles[i]);
              if (!similarFiles.includes(allFiles[j])) similarFiles.push(allFiles[j]);
            }
          }
        }
        if (similarFiles.length > 1) {
          duplicates.push({
            files: similarFiles,
            reason: `相同大小(${formatFileSize(size)})和相似文件名的可疑重复文件`,
          });
        }
      }
    }

    return duplicates;
  }

  /** 查找邮件附件中的重复 */
  findEmailDuplicates(emailAttachments) {
    const duplicates = [];
    const groups = new Map();

    for (const att of emailAttachments) {
      const key = `${this.normalizeFileName(att.name)}_${att.size}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(att);
    }

    for (const [, attachments] of groups) {
      if (attachments.length > 1) {
        const uniqueEmails = new Set(attachments.map(a => a.mailSubject || a.mailId));
        if (uniqueEmails.size > 1) {
          duplicates.push({
            files: attachments,
            reason: `相同文件在${uniqueEmails.size}封不同邮件中出现`,
          });
        }
      }
    }

    return duplicates;
  }

  // ─── 内部辅助 ──────────────────────────────────────

  _generateFileKey(file) {
    return `${this.normalizeFileName(file.name)}_${file.size}_${file.lastModified ?? 0}`;
  }

  _generateEmailKey(attachment) {
    return `${this.normalizeFileName(attachment.name)}_${attachment.size}`;
  }
}
