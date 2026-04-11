import { LARGE_FILE_THRESHOLD, STALL_TIMEOUT } from '../constants.js';
import { normalizeDate, formatDate } from '../utils/format.js';
import { sanitizeFileName } from '../utils/sanitize.js';

export class DownloadEngine {
  constructor(downloader, namingEngine) {
    this.downloader = downloader;
    this.namingEngine = namingEngine;

    this.mainChannel = { maxConcurrent: 3, active: new Set(), queue: [] };
    this.largeChannel = { maxConcurrent: 1, active: new Set(), queue: [] };

    this.stats = {
      totalBytes: 0, completedBytes: 0, activeFileBytes: 0,
      completedCount: 0, totalCount: 0, speed: 0, startTime: 0,
    };

    this.retryCount = 3;
    this.cancelled = false;
    this.onProgress = null;
    this.onComplete = null;

    this._successCount = 0;
    this._failCount = 0;
    this._lastAdjust = 0;
  }

  async downloadAll(attachments, dirHandle, settings) {
    this.cancelled = false;
    this.mainChannel.queue = [];
    this.mainChannel.active = new Set();
    this.largeChannel.queue = [];
    this.largeChannel.active = new Set();
    this._successCount = 0;
    this._failCount = 0;

    this.stats = {
      totalBytes: attachments.reduce((s, a) => s + (parseInt(a.size) || 0), 0),
      completedBytes: 0, activeFileBytes: 0,
      completedCount: 0, totalCount: attachments.length,
      speed: 0, startTime: Date.now(),
    };

    // Analyze naming strategy once
    let namingStrategy = null;
    const validation = settings.data.fileNaming?.validation;
    if (validation?.enabled && validation.fallbackPattern === 'auto') {
      namingStrategy = this.namingEngine.analyzeNaming(attachments, validation.pattern);
    }

    // Route to channels
    for (const att of attachments) {
      const size = parseInt(att.size) || 0;
      const channel = size > LARGE_FILE_THRESHOLD ? this.largeChannel : this.mainChannel;
      channel.queue.push({ attachment: att, retries: 0, status: 'pending', namingStrategy });
    }

    const results = [];
    await Promise.all([
      this._runChannel(this.mainChannel, dirHandle, settings, results),
      this._runChannel(this.largeChannel, dirHandle, settings, results),
    ]);

    this.onComplete?.(results);
    return results;
  }

  cancel() { this.cancelled = true; }

  async _runChannel(channel, dirHandle, settings, results) {
    const fillSlots = () => {
      while (!this.cancelled && channel.active.size < channel.maxConcurrent) {
        const task = channel.queue.find(t => t.status === 'pending');
        if (!task) break;
        task.status = 'processing';
        const promise = this._processTask(task, dirHandle, settings, results, channel)
          .finally(() => {
            channel.active.delete(promise);
            fillSlots();
          });
        channel.active.add(promise);
      }
    };

    fillSlots();

    while (channel.active.size > 0) {
      await Promise.race(channel.active);
    }
  }

  async _processTask(task, dirHandle, settings, results, channel) {
    try {
      const { attachment, namingStrategy } = task;
      const url = await this.downloader.resolveDownloadUrl(attachment);
      const fileName = this.namingEngine.generateFileName(attachment, null, namingStrategy);
      const targetDir = await this._getTargetFolder(dirHandle, attachment, settings);

      // Handle file conflict
      const finalName = await this._resolveConflict(targetDir, fileName, settings.data.conflictResolution);
      if (finalName === null) {
        // skip conflict resolution
        task.status = 'completed';
        results.push({ attachment, error: null, skipped: true });
        this.stats.completedCount++;
        this._emitProgress();
        return;
      }

      const fileHandle = await targetDir.getFileHandle(finalName, { create: true });

      const size = parseInt(attachment.size) || 0;
      if (size > LARGE_FILE_THRESHOLD) {
        await this._downloadLarge(url, fileHandle, attachment);
      } else {
        await this._downloadSmall(url, fileHandle, size);
      }

      // Verify
      if (settings.data.downloadBehavior?.verifyDownloads) {
        const file = await fileHandle.getFile();
        if (size > 0 && file.size !== size) {
          console.warn(`[Download] Size mismatch for ${finalName}: expected ${size}, got ${file.size}`);
        }
      }

      task.status = 'completed';
      results.push({ attachment, error: null });
      this.stats.completedCount++;
      this.stats.completedBytes += size;
      this._successCount++;
      this._adjustConcurrency(channel);
      this._emitProgress();

    } catch (error) {
      if (task.retries < this.retryCount) {
        task.retries++;
        task.status = 'pending';
        console.warn(`[Download] Retry ${task.retries}/${this.retryCount} for ${task.attachment.name}:`, error.message);
      } else {
        task.status = 'failed';
        results.push({ attachment: task.attachment, error });
        this.stats.completedCount++;
        this._failCount++;
        this._adjustConcurrency(channel);
        this._emitProgress();
      }
    }
  }

  async _downloadSmall(url, fileHandle, size) {
    const timeout = Math.max(30000, Math.ceil(size / 1024) * 1000);
    const response = await this.downloader._gmRequest(url, 'blob', timeout);
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(response.response);
      await writable.close();
    } catch (e) {
      await writable.abort();
      throw e;
    }
  }

  async _downloadLarge(url, fileHandle, attachment) {
    const writable = await fileHandle.createWritable();
    let stallTimer = null;

    return new Promise((resolve, reject) => {
      const resetStall = () => {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          writable.abort();
          reject(new Error('下载停滞超过30秒'));
        }, STALL_TIMEOUT);
      };

      resetStall();

      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'blob',
        timeout: 0,
        onprogress: (event) => {
          resetStall();
          this.stats.activeFileBytes = event.loaded;
          this._emitProgress();
        },
        onload: async (res) => {
          clearTimeout(stallTimer);
          this.stats.activeFileBytes = 0;
          if (res.status !== 200) {
            await writable.abort();
            return reject(new Error(`HTTP ${res.status}`));
          }
          try {
            await writable.write(res.response);
            await writable.close();
            resolve({ size: res.response.size });
          } catch (e) {
            await writable.abort();
            reject(e);
          }
        },
        onerror: (err) => {
          clearTimeout(stallTimer);
          this.stats.activeFileBytes = 0;
          writable.abort();
          reject(err);
        },
      });
    });
  }

  _adjustConcurrency(channel) {
    // Only adjust main channel
    if (channel === this.largeChannel) return;

    const now = Date.now();
    if (now - this._lastAdjust < 10000) return;
    this._lastAdjust = now;

    const total = this._successCount + this._failCount;
    if (total < 5) return;

    const failRate = this._failCount / total;
    if (failRate > 0.3 && channel.maxConcurrent > 2) {
      channel.maxConcurrent--;
    } else if (failRate < 0.1 && channel.maxConcurrent < 5) {
      channel.maxConcurrent++;
    }
  }

  _emitProgress() {
    if (!this.onProgress) return;
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const effective = this.stats.completedBytes + this.stats.activeFileBytes;
    this.stats.speed = elapsed > 0 ? effective / elapsed : 0;
    this.onProgress({ ...this.stats });
  }

  async _getTargetFolder(baseDirHandle, attachment, settings) {
    const structure = settings.data.folderStructure;
    if (structure === 'flat') return baseDirHandle;

    let folderName;
    switch (structure) {
      case 'subject':
        folderName = attachment.mailSubject || 'untitled';
        break;
      case 'sender':
        folderName = attachment.senderName || attachment.sender || 'unknown';
        break;
      case 'date': {
        const d = normalizeDate(attachment.date || attachment.totime);
        folderName = d ? formatDate(d, settings.data.dateFormat) : 'unknown-date';
        break;
      }
      case 'custom': {
        const template = settings.data.folderNaming?.customTemplate || '{date}/{senderName}';
        const vars = this.namingEngine.buildVariableData(attachment);
        folderName = this.namingEngine.replaceVariables(template, vars);
        break;
      }
      default:
        return baseDirHandle;
    }

    const parts = folderName.split('/').filter(Boolean);
    let handle = baseDirHandle;
    for (const part of parts) {
      const safePart = sanitizeFileName(part);
      handle = await handle.getDirectoryHandle(safePart, { create: true });
    }
    return handle;
  }

  async _resolveConflict(dirHandle, fileName, resolution) {
    if (resolution === 'overwrite') return fileName;

    try {
      await dirHandle.getFileHandle(fileName);
      // File exists
      if (resolution === 'skip') return null;
      // Default: rename with number suffix
      return this._generateUniqueName(dirHandle, fileName);
    } catch {
      // File doesn't exist, use as-is
      return fileName;
    }
  }

  async _generateUniqueName(dirHandle, fileName) {
    const dotIndex = fileName.lastIndexOf('.');
    const base = dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
    const ext = dotIndex > 0 ? fileName.substring(dotIndex) : '';

    for (let i = 1; i <= 999; i++) {
      const candidate = `${base} (${i})${ext}`;
      try {
        await dirHandle.getFileHandle(candidate);
        // exists, try next
      } catch {
        return candidate;
      }
    }
    return `${base}_${Date.now()}${ext}`;
  }
}
