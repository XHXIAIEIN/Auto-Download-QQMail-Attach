import {
  MAIL_CONSTANTS, DEFAULT_HEADERS,
  ATTACH_SOURCE, PAGE_FETCH_CONCURRENT, PAGE_FETCH_DELAY,
  PAGE_FETCH_RETRY, PAGE_SIZE,
} from '../constants.js';
import { getExtension, getBaseName } from '../utils/sanitize.js';

export class QQMailDownloader {
  constructor() {
    this.sid = null;
  }

  init() {
    this.sid = this._getSid();
    return !!this.sid;
  }

  _getSid() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('sid');
    if (fromQuery) return fromQuery;
    const hashMatch = window.location.hash.match(/sid=([^&]+)/);
    return hashMatch ? hashMatch[1] : '';
  }

  getCurrentFolderId() {
    const match = window.location.hash.match(/\/list\/(\d+)/);
    return match ? match[1] : '1';
  }

  /**
   * Fetch all mails from a folder with pagination fault tolerance.
   * Uses Promise.allSettled + batch concurrency + retry for failed pages.
   */
  async fetchAllMails(folderId) {
    const first = await this._fetchMailListPage(folderId, 0);
    const total = first.total;
    const allMails = [...first.mails];

    if (total <= PAGE_SIZE) {
      return { mails: this._dedup(allMails), total, failedPages: [] };
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);

    // Batch concurrent fetching
    const failedPages = [];
    for (let i = 0; i < remainingPages.length; i += PAGE_FETCH_CONCURRENT) {
      const batch = remainingPages.slice(i, i + PAGE_FETCH_CONCURRENT);
      const results = await Promise.allSettled(
        batch.map(page => this._fetchMailListPage(folderId, page))
      );

      for (let j = 0; j < results.length; j++) {
        if (results[j].status === 'fulfilled' && results[j].value.mails?.length) {
          allMails.push(...results[j].value.mails);
        } else {
          failedPages.push(batch[j]);
        }
      }

      if (i + PAGE_FETCH_CONCURRENT < remainingPages.length) {
        await this._delay(PAGE_FETCH_DELAY);
      }
    }

    // Retry failed pages sequentially
    const retryFailed = [];
    for (const page of failedPages) {
      let success = false;
      for (let retry = 0; retry < PAGE_FETCH_RETRY; retry++) {
        try {
          await this._delay(500 * (retry + 1));
          const result = await this._fetchMailListPage(folderId, page);
          allMails.push(...result.mails);
          success = true;
          break;
        } catch { /* continue retry */ }
      }
      if (!success) retryFailed.push(page);
    }

    return { mails: this._dedup(allMails), total, failedPages: retryFailed };
  }

  async _fetchMailListPage(folderId, page) {
    const params = new URLSearchParams({
      sid: this.sid, r: Date.now(),
      dir: folderId, dirid: folderId,
      func: 1, sort_type: 1, sort_direction: 1,
      page_now: page, page_size: PAGE_SIZE,
      enable_topmail: true,
    });
    const url = `${MAIL_CONSTANTS.BASE_URL}${MAIL_CONSTANTS.API_ENDPOINTS.MAIL_LIST}?${params}`;

    const response = await this._gmRequest(url, '', 15000);
    const data = JSON.parse(response.responseText);

    if (!data?.head) throw new Error('响应格式错误');
    if (data.head.ret !== 0) throw new Error(`API错误: ${data.head.msg || data.head.ret}`);

    return {
      mails: data.body?.list || [],
      total: data.body?.total_num || 0,
    };
  }

  _dedup(mails) {
    const map = new Map();
    mails.forEach(m => map.set(m.emailid, m));
    return [...map.values()];
  }

  /**
   * Extract attachments from mail list.
   * Merges normal_attach + cloud_attach, logs skipped items.
   * @returns {{ valid: Object[], skipped: Object[] }}
   */
  extractAttachments(mails) {
    const valid = [];
    const skipped = [];

    for (const mail of mails) {
      const sources = [
        { key: 'normal_attach', type: ATTACH_SOURCE.NORMAL },
        { key: 'cloud_attach', type: ATTACH_SOURCE.CLOUD },
      ];

      for (const { key, type } of sources) {
        if (!Array.isArray(mail[key]) || mail[key].length === 0) continue;

        for (const attach of mail[key]) {
          if (!attach?.name) {
            skipped.push({ ...attach, mailSubject: mail.subject, skipReason: '附件名为空' });
            continue;
          }
          if (!attach.download_url && type === ATTACH_SOURCE.NORMAL) {
            skipped.push({ ...attach, mailSubject: mail.subject, skipReason: '下载链接缺失' });
            continue;
          }

          valid.push(this._normalizeAttachment(attach, mail, type));
        }
      }
    }

    valid.forEach((att, i) => { att.fileIndex = i + 1; });
    return { valid, skipped };
  }

  _normalizeAttachment(attach, mail, type) {
    let downloadUrl = attach.download_url || '';
    if (downloadUrl && !downloadUrl.startsWith('http')) {
      downloadUrl = MAIL_CONSTANTS.BASE_URL + downloadUrl;
    }
    if (downloadUrl && !downloadUrl.includes('sid=')) {
      downloadUrl += `${downloadUrl.includes('?') ? '&' : '?'}sid=${this.sid}`;
    }

    return {
      ...attach,
      _attachType: type,
      mailId: mail.emailid,
      mailSubject: mail.subject,
      totime: mail.totime,
      date: mail.totime,
      sender: mail.senders?.item?.[0]?.email,
      senderName: mail.senders?.item?.[0]?.nick,
      nameWithoutExt: getBaseName(attach.name),
      ext: getExtension(attach.name),
      type: getExtension(attach.name),
      download_url: downloadUrl,
    };
  }

  // --- Download URL resolution ---

  /**
   * 返回附件的下载 URL。
   * QQ 邮箱的 /attach/download 是 302 重定向，
   * GM_xmlhttpRequest 会自动跟随，不需要手动解析。
   */
  resolveDownloadUrl(attachment) {
    const sid = new URLSearchParams(window.location.search).get('sid') || this.sid;
    return this._ensureSid(attachment.download_url, sid);
  }

  // --- Low-level request ---

  _gmRequest(url, responseType = '', timeout = 0) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers: { ...DEFAULT_HEADERS, 'Referer': MAIL_CONSTANTS.BASE_URL + '/' },
        responseType,
        timeout,
        onload(res) {
          res.status === 200
            ? resolve(res)
            : reject(new Error(`HTTP ${res.status} ${res.statusText}`));
        },
        onerror(err) { reject(err); },
        ontimeout() { reject(new Error('请求超时')); },
      });
    });
  }

  _ensureSid(url, sid) {
    if (!url.startsWith('http')) url = MAIL_CONSTANTS.BASE_URL + url;
    if (!url.includes('sid=')) url += `${url.includes('?') ? '&' : '?'}sid=${sid}`;
    return url;
  }

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}
