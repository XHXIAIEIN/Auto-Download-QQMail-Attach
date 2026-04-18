// ==UserScript==
// @name         QQ Mail 附件批量下载
// @namespace    https://github.com/xhxiaiein/Auto-Download-QQMail-Attach
// @version      3.0.0
// @description  批量下载QQ邮箱附件，提取全部附件，智能分类命名
// @author       XHXIAIEIN
// @match        https://wx.mail.qq.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
	'use strict';

	// ============================================================
	//  Constants
	// ============================================================

	const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'bmp', 'tiff', 'tif', 'raw', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf']);
	const PROJECT_EXTS = new Set(['psd', 'ai', 'sketch', 'fig', 'xd', 'indd', 'cdr', 'eps', 'afdesign', 'afphoto', 'blend', 'c4d', 'max', 'ma', 'mb']);
	const DOC_EXTS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'md', 'epub']);
	const AUDIO_EXTS = new Set(['mp3', 'wav', 'aac', 'flac', 'ogg', 'wma', 'm4a', 'ape', 'alac']);
	const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'mpg', 'mpeg', 'm4v', 'gif']);
	const ARCHIVE_EXTS = new Set(['zip', 'rar', '7z', 'gz', 'tar', 'bz2', 'xz', 'zst']);

	const DB_NAME = 'mail_downloader_db';
	const DB_VERSION = 30000;
	const CONCURRENCY = 10;

	const DIR_IMAGE   = '图片';
	const DIR_PROJECT = '项目文件';
	const DIR_DOC     = '文档';
	const DIR_AUDIO   = '音频';
	const DIR_VIDEO   = '视频';
	const DIR_ARCHIVE = '压缩文件';
	const DIR_DUP     = '重复';
	const DIR_OTHER   = '其他';
	const DIR_MANUAL  = '转人工';

	// `detailTitle` absent → category has a custom report section (DUP / MANUAL) instead of a plain listing.
	const DIR_META = [
		{ name: DIR_IMAGE,   desc: 'jpg/png/webp/heic/ 等', detailTitle: '图片清单' },
		{ name: DIR_PROJECT, desc: 'psd/ai/sketch/xd 等',   detailTitle: '项目文件清单' },
		{ name: DIR_DOC,     desc: 'pdf/doc/xls/ppt 等',    detailTitle: '文档清单' },
		{ name: DIR_AUDIO,   desc: 'mp3/wav/flac 等',       detailTitle: '音频清单' },
		{ name: DIR_VIDEO,   desc: 'mp4/mov/avi 等',        detailTitle: '视频清单' },
		{ name: DIR_ARCHIVE, desc: 'zip/rar/7z 等',         detailTitle: '压缩文件清单' },
		{ name: DIR_DUP,     desc: '已保留最新' },
		{ name: DIR_OTHER,   desc: '未归类格式',            detailTitle: '其他文件清单' },
		{ name: DIR_MANUAL,  desc: '第三方链接' },
	];

	const TAG_NO_ATTACH = 4001;
	const TAG_READ = 4004;
	const TAG_DOWNLOADED = 4008;

	// ============================================================
	//  State
	// ============================================================

	let db = null;
	let rootHandle = null;
	let engineRunning = false;
	let sid = null;
	let folderId = null;
	let folderName = '';
	let identityMap = new Map();
	let mailMap = {};

	// ============================================================
	//  Utilities
	// ============================================================

	function getSidFromUrl() {
		const m = location.href.match(/sid=([^&#]+)/);
		return m ? m[1] : null;
	}

	function getFolderIdFromUrl() {
		const m = location.href.match(/#\/list\/(\d+)/);
		return m ? parseInt(m[1]) : null;
	}

	function waitForSelector(selector, timeout = 5000) {
		return new Promise(resolve => {
			const el = document.querySelector(selector);
			if (el) return resolve(el);
			const iv = setInterval(() => {
				const el = document.querySelector(selector);
				if (el) {
					clearInterval(iv);
					resolve(el);
				}
			}, 250);
			setTimeout(() => {
				clearInterval(iv);
				resolve(null);
			}, timeout);
		});
	}

	function sanitizeFilename(name) {
		return name.replace(/[<>:"|?*]/g, '_').replace(/\//g, '_');
	}

	// HTML-escape before writing to innerHTML. Mail subject / sender nick / attachment name
	// are attacker-controlled: a subject like `<img src=x onerror=...>` would execute in the
	// wx.mail.qq.com origin, where this script has full session access.
	function escapeHtml(s) {
		return String(s ?? '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	// Escape for markdown table cells: pipe would break table structure, newline would split row.
	function escapeMd(s) {
		return String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
	}

	// A "convention-compliant" filename has 6+ consecutive digits (QQ/phone) with clean boundaries
	// on both sides — separator / CJK / edge / QQ-prefix marker. This rejects digit runs embedded
	// in hex/hash strings like "6992751ddbd0..." that would otherwise pollute identity extraction.
	const CONV_BOUNDARY_RE = /[-_\s+·()（）【】\[\]、，\u4e00-\u9fa5QqＱ]/;
	const CONV_TRAIL_SEP_RE = /[-_\s+·]/;

	function isConventionBoundary(ch) {
		return ch === '' || CONV_BOUNDARY_RE.test(ch);
	}

	function findBoundedDigitRuns(s, re) {
		const runs = [];
		re.lastIndex = 0;
		let m;
		while ((m = re.exec(s)) !== null) {
			const start = m.index;
			const end = start + m[0].length;
			const before = start > 0 ? s[start - 1] : '';
			const after = end < s.length ? s[end] : '';
			if (isConventionBoundary(before) && isConventionBoundary(after)) {
				runs.push({ start, end, text: m[0] });
			}
		}
		return runs;
	}

	function hasConventionDigits(s) {
		return findBoundedDigitRuns(s, /\d{6,}/g).length > 0;
	}

	function extractConventionPrefix(s) {
		const runs = findBoundedDigitRuns(s, /\d{6,}/g);
		if (runs.length === 0) return null;
		let end = runs[runs.length - 1].end;
		if (end < s.length && CONV_TRAIL_SEP_RE.test(s[end])) end++;
		return s.slice(0, end);
	}

	function getAttachments(mail) {
		return [...(mail.normal_attach || []), ...(mail.cloud_attach || [])];
	}

	function hasAttachments(mail) {
		return (mail.normal_attach?.length || 0) + (mail.cloud_attach?.length || 0) > 0;
	}

	function getSenderEmail(mail) {
		return mail.senders?.item?.[0]?.email || '';
	}

	function getSenderNick(mail) {
		return mail.senders?.item?.[0]?.nick || '';
	}

	function buildIdentitySegs(identity) {
		const s = [];
		if (identity.name) s.push(identity.name);
		if (identity.qq) s.push(identity.qq);
		if (identity.phone) s.push(identity.phone);
		return s;
	}

	function countByDir(tasks) {
		const s = {};
		for (const t of tasks) s[t.dir] = (s[t.dir] || 0) + 1;
		return s;
	}

	function formatDirStats(stats) {
		return DIR_META.map(({ name }) =>
			name === DIR_IMAGE ? `${name} ${stats[name] || 0}` : stats[name] ? `${name} ${stats[name]}` : ''
		).filter(Boolean);
	}

	async function batchParallel(items, concurrency, fn) {
		for (let i = 0; i < items.length; i += concurrency) {
			await Promise.all(items.slice(i, i + concurrency).map(fn));
		}
	}

	function ensureAbsoluteUrl(url) {
		if (url.startsWith('/')) url = 'https://wx.mail.qq.com' + url;
		if (!url.includes('sid=')) url += (url.includes('?') ? '&' : '?') + 'sid=' + sid;
		return url;
	}

	function replaceSid(url, newSid) {
		return url.replace(/sid=[^&]+/, 'sid=' + newSid);
	}

	// Filter out date-like digit strings (YYYYMMDD, YYMMDD) that otherwise look like QQ numbers.
	// Accepts 19xx/20xx so it doesn't silently break in 2030.
	const DATE8_RE = /^(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])$/;
	const DATE6_RE = /^\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])$/;
	function cleanQQs(qqs) {
		return qqs.filter(q => {
			if (DATE8_RE.test(q)) return false;
			if (q.length < 5) return false;
			if (q.length === 6 && DATE6_RE.test(q)) return false;
			return true;
		});
	}

	// ============================================================
	//  IndexedDB
	// ============================================================

	function openDB() {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = e => {
				const d = e.target.result;
				if (!d.objectStoreNames.contains('tasks')) d.createObjectStore('tasks', { keyPath: 'id' });
				if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	function dbPut(store, data) {
		return new Promise((resolve, reject) => {
			const tx = db.transaction(store, 'readwrite');
			tx.objectStore(store).put(data);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}

	function dbGetAll(store) {
		return new Promise((resolve, reject) => {
			const tx = db.transaction(store, 'readonly');
			const req = tx.objectStore(store).getAll();
			req.onsuccess = () => resolve(req.result);
			tx.onerror = () => reject(tx.error);
		});
	}

	function dbPutBatch(store, items) {
		return new Promise((resolve, reject) => {
			const tx = db.transaction(store, 'readwrite');
			const s = tx.objectStore(store);
			for (const item of items) s.put(item);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}

	async function dbDeleteByFolder(targetFolderId) {
		const all = await dbGetAll('tasks');
		const toDelete = all.filter(t => t.folderId === targetFolderId);
		if (toDelete.length === 0) return;
		return new Promise((resolve, reject) => {
			const tx = db.transaction('tasks', 'readwrite');
			const store = tx.objectStore('tasks');
			for (const t of toDelete) store.delete(t.id);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}

	// ============================================================
	//  QQ Mail API
	// ============================================================

	function rnd() {
		return Math.random().toString().slice(2) + Date.now();
	}

	function apiGet(path) {
		const sep = path.includes('?') ? '&' : '?';
		return fetch(path + sep + 'r=' + rnd(), { credentials: 'include' }).then(r => r.json());
	}

	function apiPost(path, params) {
		params.r = rnd();
		params.sid = sid;
		return fetch(path, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams(params).toString(),
		}).then(r => r.json());
	}

	async function verifySession() {
		const data = await apiGet(`/list/folderlist?sid=${sid}`);
		return data.head.ret === 0 ? data : null;
	}

	async function fetchMailList(page) {
		const url = `/list/maillist?sid=${sid}&dir=${folderId}&dirid=${folderId}&func=1&sort_type=1&sort_direction=1&page_now=${page}&page_size=50`;
		const data = await apiGet(url);
		if (data.head.ret !== 0) throw new Error(`API ret=${data.head.ret}: ${data.head.msg || data.head.stack || ''}`);
		return data.body;
	}

	async function fetchReadMail(mailId) {
		const data = await apiGet(`/read/readmail?sid=${sid}&mailid=${mailId}&func=1`);
		return data;
	}

	async function markMailRead(mailId) {
		return apiPost('/mgr/mailmgr', { func: 4, mailid: mailId, folderid: folderId, choose_type: 1 });
	}

	async function addTag(mailId, tagId) {
		return apiPost('/mgr/mailmgr', { func: 12, mailid: mailId, tagid: tagId, folderid: folderId, choose_type: 1 });
	}

	async function addTags(mailId, tagIds) {
		await Promise.all(tagIds.map(t => addTag(mailId, t)));
	}

	async function pollAsyncTask(taskId) {
		for (let i = 0; i < 60; i++) {
			const r = await apiPost('/mgr/mailmgr', { func: 26, async_task_func: 1, async_taskid: taskId });
			if (r.head.ret !== 0) return false;
			if (!r.body?.is_async) return true;
			await new Promise(resolve => setTimeout(resolve, 500));
		}
		return false;
	}

	async function markAllUnread() {
		const r = await apiPost('/mgr/mailmgr', { func: 5, folderid: folderId, choose_type: 2 });
		if (r.head.ret !== 0) return false;
		if (r.body?.is_async && r.body?.async_taskid) {
			return pollAsyncTask(r.body.async_taskid);
		}
		return true;
	}

	// ============================================================
	//  Phase 2: Scan mails
	// ============================================================

	async function scanAllMails(totalNum, onProgress) {
		const totalPages = Math.ceil(totalNum / 50);
		const allMails = [];

		for (let i = 0; i < totalPages; i += 3) {
			const batch = [];
			for (let j = i; j < Math.min(i + 3, totalPages); j++) {
				batch.push(fetchMailList(j));
			}
			const results = await Promise.all(batch);
			for (const body of results) {
				if (body.list) allMails.push(...body.list);
			}
			onProgress?.(allMails.length, totalNum);
		}

		return allMails;
	}

	// ============================================================
	//  Phase 3: Build identity map
	// ============================================================

	// Accepts both attach_list entries and legacy mail objects.
	function buildIdentityMap(items) {
		identityMap = new Map();

		function extractPhoneQQ(text, id) {
			for (const r of findBoundedDigitRuns(text, /1[3-9]\d{9}/g)) id.phones.add(r.text);
			for (const r of findBoundedDigitRuns(text, /(?<!\d)[1-9]\d{4,10}(?!\d)/g)) {
				if (!/^1[3-9]\d{9}$/.test(r.text)) id.qqs.add(r.text);
			}
		}

		function ensure(email) {
			if (!identityMap.has(email)) {
				identityMap.set(email, { names: new Set(), qqs: new Set(), phones: new Set(), nicks: new Set() });
			}
			return identityMap.get(email);
		}

		for (const item of items) {
			const email = item.sender?.addr || getSenderEmail(item);
			const nick = item.sender?.name || getSenderNick(item);
			if (!email) continue;

			const id = ensure(email);
			if (nick) id.nicks.add(nick);

			const parts = (item.subject || '').split(/[+＋]/);
			if (parts.length >= 4) id.names.add(parts[2].trim());
			for (const p of parts) extractPhoneQQ(p, id);

			const eqq = email.match(/^(\d{5,11})@qq\.com$/);
			if (eqq) id.qqs.add(eqq[1]);

			if (item.name) extractPhoneQQ(item.name, id);
			if (item.normal_attach || item.cloud_attach) {
				for (const a of getAttachments(item)) {
					if (a.name) extractPhoneQQ(a.name, id);
				}
			}
		}
	}

	function getIdentity(email) {
		const id = identityMap.get(email);
		if (!id) return { name: '', qq: '', phone: '' };
		const qqs = cleanQQs([...id.qqs]);
		const pickNonDigit = set => [...set].find(n => n && !/^\d+$/.test(n)) || '';
		return {
			name: pickNonDigit(id.names) || pickNonDigit(id.nicks) || '',
			qq: qqs[0] || '',
			phone: [...id.phones][0] || '',
		};
	}

	// ============================================================
	//  Phase 3a: Chrome Built-in AI enhancement
	// ============================================================

	let aiSession = null;
	let aiAvailable = false;

	async function initBuiltinAI() {
		try {
			if (!window.LanguageModel) return false;
			const caps = await window.LanguageModel.availability();
			if (caps === 'unavailable') return false;
			aiSession = await window.LanguageModel.create({
				systemPrompt: '你是一个邮件主题解析器。从投稿邮件的主题中提取信息。只输出 JSON，不要其他文字。',
			});
			aiAvailable = true;
			return true;
		} catch (e) {
			return false;
		}
	}

	async function aiParseSubject(subject) {
		if (!aiSession || !subject) return null;
		try {
			const result = await aiSession.prompt(`从这个邮件主题中提取投稿人信息，返回 JSON：{"name":"姓名","qq":"QQ号","phone":"手机号","work":"作品名"}。提取不到的字段留空字符串。\n\n主题：${subject}`, {
				responseConstraint: {
					type: 'object',
					properties: {
						name: { type: 'string' },
						qq: { type: 'string' },
						phone: { type: 'string' },
						work: { type: 'string' },
					},
					required: ['name', 'qq', 'phone', 'work'],
				},
			});
			return typeof result === 'string' ? JSON.parse(result) : result;
		} catch (e) {
			return null;
		}
	}

	async function enhanceIdentityWithAI(allMails, onProgress) {
		if (!aiAvailable) return 0;

		const needAI = [];
		for (const mail of allMails) {
			const email = mail.senders?.item?.[0]?.email;
			if (!email) continue;
			const id = identityMap.get(email);
			if (id && id.names.size === 0 && mail.subject) {
				needAI.push(mail);
			}
		}

		if (needAI.length === 0) return 0;

		let enhanced = 0;
		const seen = new Set();
		for (let i = 0; i < needAI.length; i++) {
			const mail = needAI[i];
			const email = mail.senders?.item?.[0]?.email;
			if (seen.has(email)) continue;
			seen.add(email);

			onProgress?.(`AI 解析 ${i + 1}/${needAI.length}`);
			const parsed = await aiParseSubject(mail.subject);
			if (!parsed) continue;

			const id = identityMap.get(email);
			if (parsed.name) {
				id.names.add(parsed.name);
				enhanced++;
			}
			if (parsed.qq && /^\d{5,11}$/.test(parsed.qq)) id.qqs.add(parsed.qq);
			if (parsed.phone && /^1[3-9]\d{9}$/.test(parsed.phone)) id.phones.add(parsed.phone);
		}

		return enhanced;
	}

	// ============================================================
	//  Phase 3b: Recalled mails + innerpiclist + tagging
	// ============================================================

	async function processRecalledMails(allMails, onProgress) {
		const recalled = [];
		const remaining = [];
		for (const m of allMails) {
			if ((m.subject || '').startsWith('发信方已撤回邮件：')) {
				recalled.push(m);
			} else {
				remaining.push(m);
			}
		}
		let tagged = 0;
		await batchParallel(recalled, 5, async m => {
			await addTags(m.emailid, [TAG_NO_ATTACH, TAG_READ]);
			onProgress?.(`处理已撤回 ${++tagged}/${recalled.length}`);
		});
		return { recalled, remaining };
	}

	async function processInnerPicList(noAttachMails, sendersWithAttach, onProgress) {
		const inlineEntries = [];
		const emptyMails = [];
		let processed = 0;

		async function processOne(mail) {
			try {
				const data = await fetchReadMail(mail.emailid);
				onProgress?.(`检查内嵌图片 ${++processed}/${noAttachMails.length}`);
				if (data.head?.ret !== 0) return;

				const picList = data.body?.item?.innerpiclist;
				if (!picList || picList.length === 0) {
					emptyMails.push(mail);
					await addTags(mail.emailid, [TAG_NO_ATTACH, TAG_READ]);
					return;
				}

				const senderEmail = getSenderEmail(mail);
				if (sendersWithAttach.has(senderEmail)) {
					await addTags(mail.emailid, [TAG_NO_ATTACH, TAG_READ]);
					return;
				}

				// Only TAG_NO_ATTACH here — TAG_DOWNLOADED is applied after all its inline pics download.
				await addTag(mail.emailid, TAG_NO_ATTACH);

				for (let pi = 0; pi < picList.length; pi++) {
					const pic = picList[pi];
					let ext = 'jpg';
					const nameMatch = (pic.name || '').match(/\.([a-zA-Z0-9]{2,5})(?:\.[a-zA-Z0-9]{2,5})?$/);
					if (nameMatch) ext = nameMatch[1].toLowerCase();

					const identity = getIdentity(senderEmail);
					const segs = buildIdentitySegs(identity);
					if (picList.length > 1) segs.push(`内嵌${pi + 1}`);
					const filename = sanitizeFilename((segs.length ? segs.join('_') : 'unnamed') + '.' + ext);

					inlineEntries.push({
						url: ensureAbsoluteUrl(pic.downloadurl || ''),
						folderId,
						dir: DIR_IMAGE,
						filename,
						mailid: mail.emailid,
						fileid: pic.fileid || `inline_${pi}`,
						size: pic.size || 0,
						isInline: true,
						senderEmail,
					});
				}
			} catch (e) {
				// swallow per-mail failures — inner-pic check is best-effort
			}
		}

		await batchParallel(noAttachMails, 5, processOne);
		return { inlineEntries, emptyMails };
	}

	// ============================================================
	//  Phase 4: Build mail map + classify + generate download list
	// ============================================================

	function buildMailMapFromAttach(attachments) {
		mailMap = {};
		const byMail = new Map();
		for (const a of attachments) {
			if (!byMail.has(a.mailid)) byMail.set(a.mailid, []);
			byMail.get(a.mailid).push(a);
		}
		let mailIdx = 0;
		for (const [mid, items] of byMail) {
			mailIdx++;
			const first = items[0];
			mailMap[mid] = {
				subject: first.subject,
				senderEmail: first.sender?.addr || '',
				senderNick: first.sender?.name || '',
				attachCount: items.length,
				mailIdx,
				totime: first.ctime,
			};
			items.forEach((a, idx) => {
				mailMap[mid + '|' + a.fileid] = { attachIdx: idx + 1, attachTotal: items.length, origName: a.name };
			});
		}
	}

	function buildMailMap(allMails) {
		mailMap = {};
		let mailIdx = 0;
		for (const mail of allMails) {
			const attachAll = getAttachments(mail);
			const has = attachAll.length > 0;
			if (has) mailIdx++;
			mailMap[mail.emailid] = {
				subject: mail.subject,
				senderEmail: getSenderEmail(mail),
				senderNick: getSenderNick(mail),
				attachCount: attachAll.length,
				mailIdx: has ? mailIdx : 0,
				totime: mail.totime,
			};
			attachAll.forEach((a, idx) => {
				mailMap[mail.emailid + '|' + a.fileid] = { attachIdx: idx + 1, attachTotal: attachAll.length, origName: a.name };
			});
		}
	}

	function classifyExt(ext) {
		if (ARCHIVE_EXTS.has(ext)) return DIR_ARCHIVE;
		if (IMAGE_EXTS.has(ext)) return DIR_IMAGE;
		if (PROJECT_EXTS.has(ext)) return DIR_PROJECT;
		if (DOC_EXTS.has(ext)) return DIR_DOC;
		if (AUDIO_EXTS.has(ext)) return DIR_AUDIO;
		if (VIDEO_EXTS.has(ext)) return DIR_VIDEO;
		return DIR_OTHER;
	}

	function buildDownloadListFromAttach(attachments) {
		// Duplicates keyed by sender_email + file_size; newest (by ctime) wins within each group.
		const ssMap = new Map();
		for (const a of attachments) {
			const k = `${a.sender?.addr || ''}_${a.size}`;
			if (!ssMap.has(k)) ssMap.set(k, []);
			ssMap.get(k).push({ t: a.ctime, eid: a.mailid, fid: a.fileid });
		}
		const dupKeys = new Set();
		const dupGroupMap = new Map();
		const dupKeptMap = new Map();
		for (const [groupKey, items] of ssMap) {
			if (items.length > 1) {
				items.sort((a, b) => b.t - a.t);
				const kept = items[0];
				dupKeptMap.set(groupKey, `${kept.eid}_${kept.fid}`);
				for (const item of items) dupGroupMap.set(`${item.eid}_${item.fid}`, groupKey);
				for (let i = 1; i < items.length; i++) dupKeys.add(`${items[i].eid}_${items[i].fid}`);
			}
		}

		function resolveStemExt(a) {
			let ext = (a.type || '').toLowerCase();
			if (!ext && a.name?.includes('.')) ext = a.name.split('.').pop().toLowerCase();
			let stem = a.name || '';
			if (ext && stem.toLowerCase().endsWith('.' + ext)) stem = stem.slice(0, -ext.length - 1);
			return { stem, ext };
		}

		// Most-common prefix per sender — tolerates one-off outliers if a sender has mixed naming.
		const senderPrefix = new Map();
		{
			const prefixCounts = new Map();
			for (const a of attachments) {
				const { stem } = resolveStemExt(a);
				const p = extractConventionPrefix(stem);
				if (!p) continue;
				const email = a.sender?.addr || '';
				let counts = prefixCounts.get(email);
				if (!counts) prefixCounts.set(email, counts = new Map());
				counts.set(p, (counts.get(p) || 0) + 1);
			}
			for (const [email, counts] of prefixCounts) {
				const [best] = [...counts.entries()].sort((x, y) => y[1] - x[1])[0];
				senderPrefix.set(email, best);
			}
		}

		const downloads = [];
		let id = 0;

		for (const a of attachments) {
			let { stem: origName, ext } = resolveStemExt(a);
			if (!ext) ext = 'jpg';

			const dk = `${a.mailid}_${a.fileid}`;
			const downloadHost = (() => {
				try {
					return new URL(a.download_url || '', 'https://wx.mail.qq.com').hostname;
				} catch {
					return '';
				}
			})();
			const isThirdParty = downloadHost && !downloadHost.endsWith('mail.qq.com') && !downloadHost.endsWith('qq.com');

			let dir;
			if (dupKeys.has(dk)) dir = DIR_DUP;
			else if (isThirdParty) dir = DIR_MANUAL;
			else dir = classifyExt(ext);

			const sender = a.sender?.addr || '';

			// Priority: (1) filename already has identity token → keep as-is;
			// (2) sender has compliant siblings → mirror their prefix; (3) synthesize from identity map.
			let filename;
			if (hasConventionDigits(origName)) {
				filename = (origName || 'unnamed') + '.' + ext;
			} else if (senderPrefix.has(sender)) {
				filename = senderPrefix.get(sender) + (origName || 'unnamed') + '.' + ext;
			} else {
				const segs = buildIdentitySegs(getIdentity(sender));
				if (origName) segs.push(origName);
				filename = (segs.length ? segs.join('_') : 'unnamed') + '.' + ext;
			}
			filename = sanitizeFilename(filename);

			const url = ensureAbsoluteUrl(a.download_url || '');

			const task = {
				id: id++,
				folderId,
				url,
				dir,
				filename,
				mailid: a.mailid,
				fileid: a.fileid,
				status: 'pending',
			};
			const gk = dupGroupMap.get(dk);
			if (gk) {
				task.dupGroup = gk;
				if (dupKeys.has(dk)) task.keptBy = dupKeptMap.get(gk);
			}

			downloads.push(task);
		}

		const nameCount = new Map();
		for (const task of downloads) {
			const key = `${task.dir}/${task.filename}`;
			const count = (nameCount.get(key) || 0) + 1;
			nameCount.set(key, count);
			if (count > 1) {
				const dot = task.filename.lastIndexOf('.');
				if (dot > 0) {
					task.filename = `${task.filename.slice(0, dot)} (${count})${task.filename.slice(dot)}`;
				} else {
					task.filename = `${task.filename} (${count})`;
				}
			}
		}

		return downloads;
	}

	// ============================================================
	//  Manifest (local file tracking)
	// ============================================================

	async function readManifest() {
		try {
			const fh = await rootHandle.getFileHandle('manifest.json', { create: false });
			const file = await fh.getFile();
			const text = await file.text();
			return JSON.parse(text);
		} catch (e) {
			return {};
		}
	}

	async function writeManifest(manifest) {
		const fh = await rootHandle.getFileHandle('manifest.json', { create: true });
		const w = await fh.createWritable();
		await w.write(JSON.stringify(manifest, null, 2));
		await w.close();
	}

	let manifestCache = null;
	let manifestDirty = false;
	let manifestFlushTimer = null;

	// Debounce: coalesce bursts of appends from parallel workers into at most one write per 2s.
	async function manifestAppend(entry) {
		if (!manifestCache) manifestCache = await readManifest();
		const key = `${entry.mailid}_${entry.fileid}`;
		const val = { dir: entry.dir, filename: entry.filename, size: entry.size, time: Date.now() };
		if (entry.keptBy) val.keptBy = entry.keptBy;
		manifestCache[key] = val;
		manifestDirty = true;

		if (!manifestFlushTimer) {
			manifestFlushTimer = setTimeout(() => {
				manifestFlushTimer = null;
				if (manifestDirty) {
					manifestDirty = false;
					writeManifest(manifestCache).catch(() => {});
				}
			}, 2000);
		}
	}

	async function manifestFlush() {
		if (manifestDirty && manifestCache) {
			manifestDirty = false;
			if (manifestFlushTimer) {
				clearTimeout(manifestFlushTimer);
				manifestFlushTimer = null;
			}
			await writeManifest(manifestCache);
		}
	}

	// ============================================================
	//  Phase 8: Audit report
	// ============================================================

	async function generateReport(tasks, pipelineStats) {
		const d = new Date();
		const now = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
		const done = tasks.filter(t => t.status === 'done');
		const failed = tasks.filter(t => t.status === 'failed');

		const byDir = {};
		for (const t of tasks) {
			byDir[t.dir] = byDir[t.dir] || [];
			byDir[t.dir].push(t);
		}

		const lines = [];
		lines.push(`# ${folderName} · 投稿收集报告`);
		lines.push(``);
		lines.push(`> ${now} · ${done.length} 个文件 · ${failed.length > 0 ? failed.length + ' 失败' : '全部成功'}`);
		lines.push(``);

		lines.push(`## 概览`);
		lines.push(``);
		lines.push(`| 分类 | 数量 | 说明 |`);
		lines.push(`|------|------|------|`);
		for (const { name, desc } of DIR_META) {
			lines.push(`| ${name} | ${(byDir[name] || []).length} | ${desc} |`);
		}
		if (pipelineStats) {
			lines.push(`| 已撤回 | ${pipelineStats.recalledCount || 0} | 发信方已撤回 |`);
			lines.push(`| 空邮件 | ${pipelineStats.emptyCount || 0} | 无附件无内嵌图 |`);
			lines.push(`| 内嵌图 | ${pipelineStats.inlineCount || 0} | 从正文提取 |`);
		}
		lines.push(`| **合计** | **${tasks.length}** | 下载成功 ${done.length}，失败 ${failed.length} |`);
		lines.push(``);

		const totalMailsInTasks = new Set(tasks.map(t => t.mailid)).size;
		const totalScanned = pipelineStats?.totalScanned || totalMailsInTasks;
		const noAttachCount = Math.max(0, totalScanned - totalMailsInTasks - (pipelineStats?.recalledCount || 0));
		const manifest = manifestCache || (await readManifest());
		const manifestCount = Object.keys(manifest).length;
		const diskMatch = manifestCount >= done.length;

		lines.push(`## 审计校验`);
		lines.push(``);
		lines.push(`| 校验项 | 结果 |`);
		lines.push(`|--------|------|`);
		lines.push(`| 邮件 | 共 ${totalScanned} 封，${totalMailsInTasks} 封有附件，${noAttachCount} 封无附件 |`);
		lines.push(`| 附件 | 共 ${tasks.length} 个任务，成功 ${done.length}，失败 ${failed.length} |`);
		lines.push(`| 落盘 | manifest ${manifestCount} 条记录 ${diskMatch ? '✓' : '⚠ 不一致'} |`);
		lines.push(``);

		// DIRs without `detailTitle` (DUP, MANUAL) get their own custom sections below.
		for (const { name, detailTitle } of DIR_META) {
			if (!detailTitle) continue;
			const items = byDir[name] || [];
			if (items.length === 0) continue;
			lines.push(`## ${detailTitle}`);
			lines.push(``);
			lines.push(`| # | 发件人 | 主题 | 最终文件名 |`);
			lines.push(`|---|--------|------|------------|`);
			items.forEach((t, i) => {
				const info = mailMap[t.mailid];
				lines.push(`| ${i + 1} | ${escapeMd(info?.senderEmail)} | ${escapeMd((info?.subject || '').slice(0, 30))} | ${escapeMd(t.filename)} |`);
			});
			lines.push(``);
		}

		const dups = byDir[DIR_DUP] || [];
		if (dups.length > 0) {
			lines.push(`## 重复投稿`);
			lines.push(``);

			const dupGroups = new Map();
			for (const t of tasks) {
				if (!t.dupGroup) continue;
				if (!dupGroups.has(t.dupGroup)) dupGroups.set(t.dupGroup, []);
				dupGroups.get(t.dupGroup).push(t);
			}

			const fmtTime = ts => {
				if (!ts) return '';
				const d = new Date(ts * 1000);
				return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
			};

			let groupIdx = 0;
			for (const [, group] of dupGroups) {
				group.sort((a, b) => {
					if (a.dir !== DIR_DUP && b.dir === DIR_DUP) return -1;
					if (a.dir === DIR_DUP && b.dir !== DIR_DUP) return 1;
					const ta = mailMap[a.mailid]?.totime || 0;
					const tb = mailMap[b.mailid]?.totime || 0;
					return tb - ta;
				});
				groupIdx++;
				lines.push(`### 重复组 ${groupIdx}`);
				lines.push(``);
				lines.push(`| 状态 | 文件名 | 发件人 | 邮箱 | 主题 | 时间 |`);
				lines.push(`|------|--------|--------|------|------|------|`);
				for (const t of group) {
					const info = mailMap[t.mailid] || {};
					const kept = t.dir !== DIR_DUP ? '● 保留' : '○ 重复';
					const subject = (info.subject || '').slice(0, 25);
					lines.push(`| ${kept} | ${escapeMd(t.filename)} | ${escapeMd(info.senderNick)} | ${escapeMd(info.senderEmail)} | ${escapeMd(subject)} | ${fmtTime(info.totime)} |`);
				}
				lines.push(``);
			}
		}

		const manual = byDir[DIR_MANUAL] || [];
		if (manual.length > 0) {
			lines.push(`## 待人工处理`);
			lines.push(``);
			lines.push(`| 文件名 | 发件人 | URL |`);
			lines.push(`|--------|--------|-----|`);
			for (const t of manual) {
				const info = mailMap[t.mailid];
				lines.push(`| ${escapeMd(t.filename)} | ${escapeMd(info?.senderEmail)} | ${escapeMd(t.url.slice(0, 60))}... |`);
			}
			lines.push(``);
		}

		if (failed.length > 0) {
			lines.push(`## 下载失败`);
			lines.push(``);
			lines.push(`| 文件名 | 错误 |`);
			lines.push(`|--------|------|`);
			for (const t of failed) {
				lines.push(`| ${escapeMd(t.filename)} | ${escapeMd(t.error || 'unknown')} |`);
			}
			lines.push(``);
		}

		const content = lines.join('\n');

		try {
			const fh = await rootHandle.getFileHandle('report.md', { create: true });
			const w = await fh.createWritable();
			await w.write(content);
			await w.close();
		} catch (e) {
			console.error('[QQMail DL] Failed to write report:', e);
		}

		return { done: done.length, failed: failed.length, total: tasks.length, manifestCount };
	}

	// ============================================================
	//  Download engine (with session expiry recovery)
	// ============================================================

	let sessionExpired = false;
	let sessionRecoverResolve = null;

	function waitForSessionRecovery() {
		sessionExpired = true;
		return new Promise(resolve => {
			sessionRecoverResolve = resolve;
			showSessionExpiredUI();
		});
	}

	function showSessionExpiredUI() {
		const panel = getOrCreatePanel();
		const banner = document.createElement('div');
		banner.id = '__dl_session_banner';
		banner.style.cssText = 'background:#FFF3E0;border:1px solid #FFB74D;border-radius:6px;padding:10px 16px;margin-bottom:10px;display:flex;align-items:center;gap:8px;';
		banner.innerHTML = `
      <span style="color:#E65100;font-weight:700;">⚠ 登录态失效</span>
      <span style="color:#BF360C;font-size:13px;">请刷新页面重新登录，然后回到此文件夹</span>
      <span style="flex:1;"></span>
      <button id="__dl_recover" style="background:#0F7AF5;color:#fff;border:none;border-radius:6px;padding:4px 12px;font-size:13px;cursor:pointer;">已刷新，继续下载</button>
    `;

		const existing = document.getElementById('__dl_session_banner');
		if (existing) existing.remove();
		banner.querySelector('#__dl_recover').addEventListener('click', async () => {
			const newSid = getSidFromUrl();
			if (!newSid) {
				banner.querySelector('span:nth-child(2)').textContent = 'URL 中未找到 sid，请确认已刷新并进入文件夹';
				return;
			}
			const oldSid = sid;
			sid = newSid;
			const check = await verifySession();
			if (!check) {
				sid = oldSid;
				banner.querySelector('span:nth-child(2)').textContent = '新 session 无效，请重新登录';
				return;
			}
			banner.remove();
			sessionExpired = false;
			sessionRecoverResolve?.(newSid);
			sessionRecoverResolve = null;
		});
		panel.insertBefore(banner, panel.firstChild);
	}

	// Also auto-detect: listen for URL changes that bring a new sid
	let sidRecoveryInterval = null;
	function setupAutoSidRecovery() {
		if (sidRecoveryInterval) clearInterval(sidRecoveryInterval);
		sidRecoveryInterval = setInterval(() => {
			if (!sessionExpired) return;
			const newSid = getSidFromUrl();
			if (newSid && newSid !== sid) {
				const recoverBtn = document.getElementById('__dl_recover');
				if (recoverBtn) recoverBtn.click();
			}
		}, 2000);
	}

	async function startEngine(tasks, onProgress) {
		if (engineRunning) return;
		engineRunning = true;

		const dirCache = {};
		async function getDirHandle(name) {
			if (!dirCache[name]) dirCache[name] = await rootHandle.getDirectoryHandle(name, { create: true });
			return dirCache[name];
		}

		async function downloadOne(task) {
			try {
				const blob = await new Promise((res, rej) => {
					const xhr = new XMLHttpRequest();
					xhr.open('GET', task.url, true);
					xhr.responseType = 'blob';
					xhr.onload = () => (xhr.status === 200 ? res(xhr.response) : rej(new Error(`HTTP ${xhr.status}`)));
					xhr.onerror = () => rej(new Error('network'));
					xhr.send();
				});

				// QQ Mail returns a JSON error body (not HTTP 4xx) when the session expires.
				if (blob.type === 'application/json' && blob.size < 1000) {
					const j = JSON.parse(await blob.text());
					if (j.head?.ret === -20002 || j.ret === -20002) throw new Error('session_expired');
					if (j.head?.ret !== undefined) throw new Error('api_error');
				}

				const dh = await getDirHandle(task.dir);
				const fh = await dh.getFileHandle(task.filename, { create: true });
				const w = await fh.createWritable();
				await w.write(blob);
				await w.close();
				task.status = 'done';
				await manifestAppend({ mailid: task.mailid, fileid: task.fileid, dir: task.dir, filename: task.filename, size: blob.size, keptBy: task.keptBy });
			} catch (e) {
				if (e.message === 'session_expired') throw e; // bubble up for retry; caller requeues
				task.status = 'failed';
				task.error = e.message;
			}
			if (task.status !== 'pending') await dbPut('tasks', task);
		}

		const mailTotalCount = new Map();
		const mailDoneCount = new Map();
		for (const task of tasks) {
			mailTotalCount.set(task.mailid, (mailTotalCount.get(task.mailid) || 0) + 1);
			mailDoneCount.set(task.mailid, 0);
		}

		const wrappedProgress = task => {
			onProgress?.(task);
			if (task.status === 'done' && task.mailid) {
				const mid = task.mailid;
				mailDoneCount.set(mid, (mailDoneCount.get(mid) || 0) + 1);
				if (mailDoneCount.get(mid) >= mailTotalCount.get(mid)) {
					markMailRead(mid).catch(() => {});
				}
			}
		};

		const queue = [...tasks];
		const workers = [];
		for (let i = 0; i < CONCURRENCY; i++) {
			workers.push(
				(async () => {
					while (queue.length > 0 && engineRunning) {
						const task = queue.shift();
						try {
							await downloadOne(task);
							wrappedProgress(task);
						} catch (e) {
							if (e.message === 'session_expired') {
								queue.unshift(task);
								// Exactly one worker drives recovery; the rest poll until sessionExpired clears.
								if (!sessionExpired) {
									const newSid = await waitForSessionRecovery();
									for (const t of queue) {
										t.url = replaceSid(t.url, newSid);
									}
								} else {
									await new Promise(r => {
										const iv = setInterval(() => {
											if (!sessionExpired) {
												clearInterval(iv);
												r();
											}
										}, 500);
									});
								}
								continue;
							}
						}
					}
				})()
			);
		}
		await Promise.all(workers);
		await manifestFlush();
		engineRunning = false;
	}

	// ============================================================
	//  UI
	// ============================================================

	const ICONS = {
		download:
			'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" style="color:#0F7AF5;flex-shrink:0;"><path d="M8 1a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V1.75A.75.75 0 0 1 8 1ZM2.75 13a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H2.75Z"/></svg>',
		check: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#07C160" style="flex-shrink:0;"><path d="M12.03 4.47a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06L6 9.44l4.97-4.97a.75.75 0 0 1 1.06 0Z"/></svg>',
		fail: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#E84C3D" style="flex-shrink:0;"><path d="M4.47 3.47a.75.75 0 0 0-1.06 1.06L6.44 7.5 3.41 10.53a.75.75 0 1 0 1.06 1.06L7.5 8.56l3.03 3.03a.75.75 0 0 0 1.06-1.06L8.56 7.5l3.03-3.03a.75.75 0 0 0-1.06-1.06L7.5 6.44 4.47 3.47Z"/></svg>',
		mail: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="rgba(20,46,77,0.4)" style="flex-shrink:0;"><path fill-rule="evenodd" d="M2 3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2Zm.22 1.97a.75.75 0 0 0-.44 1.36l3.5 2.5a1.25 1.25 0 0 0 1.44 0l3.5-2.5a.75.75 0 0 0-.44-1.36L6.5 7.22a.75.75 0 0 1-.86 0L2.22 4.97Z"/></svg>',
		file: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" style="flex-shrink:0;"><rect x="1" y="1" width="10" height="10" rx="2" stroke="rgba(20,46,77,0.2)" stroke-width="1"/></svg>',
	};

	const CARD_STYLE = `
    background: #fff;
    font-family: -apple-system, BlinkMacSystemFont, system-ui, "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
    font-size: 13px;
    color: #1a2033;
    line-height: 1.6;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(20,46,77,0.06);
  `.replace(/\n\s+/g, '');

	const BTN_PRIMARY_STYLE = 'background:#0F7AF5;color:#fff;border:none;border-radius:6px;padding:6px 16px;font-size:14px;cursor:pointer;font-family:inherit;';
	const TEXT_MUTED = 'font-size:14px;color:rgba(20,46,77,0.45);';

	// `subtitleId` is set only for UIs whose subtitle is live-updated by updateScanMessage().
	function headerRow(subtitle, right = '', subtitleId = '') {
		const idAttr = subtitleId ? ` id="${subtitleId}"` : '';
		return `<div style="display:flex;align-items:center;gap:8px;height:32px;">
			<span style="font-size:16px;font-weight:700;color:rgb(19,24,29);">附件下载</span>
			<span${idAttr} style="${TEXT_MUTED}">${subtitle}</span>
			<span style="flex:1;"></span>${right}
		</div>`;
	}

	function getOrCreatePanel() {
		let panel = document.getElementById('__dl_panel');
		if (!panel) {
			panel = document.createElement('div');
			panel.id = '__dl_panel';
			panel.style.cssText = CARD_STYLE;
		}
		return panel;
	}

	async function mountPanel(panel) {
		if (panel.parentElement) return;
		const mailApp = await waitForSelector('.mail_app');
		if (mailApp?.firstChild) mailApp.insertBefore(panel, mailApp.firstChild);
	}

	function showStartUI() {
		const panel = getOrCreatePanel();
		panel.innerHTML = headerRow('点击开始扫描当前文件夹', `<button id="__dl_start" style="${BTN_PRIMARY_STYLE}">开始扫描</button>`);
		panel.querySelector('#__dl_start').onclick = () => runFullPipeline();
		mountPanel(panel);
	}

	function showResumeUI(pendingCount) {
		const panel = getOrCreatePanel();
		panel.innerHTML = headerRow(
			`还有 <strong style="color:rgb(19,24,29);">${pendingCount}</strong> 个待下载`,
			`<button id="__dl_resume" style="${BTN_PRIMARY_STYLE}">选择目录</button>
			 <button id="__dl_reset" style="background:none;color:rgba(20,46,77,0.45);border:1px solid rgba(20,46,77,0.1);border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer;font-family:inherit;">重新扫描</button>`
		);
		panel.querySelector('#__dl_resume').onclick = async () => {
			try {
				rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
				await resumeDownloads();
			} catch (e) {}
		};
		panel.querySelector('#__dl_reset').onclick = async () => {
			await dbDeleteByFolder(folderId);
			runFullPipeline();
		};
		mountPanel(panel);
	}

	function showProgressUI(done, total, failed, mailCount) {
		const panel = getOrCreatePanel();
		const pct = total > 0 ? (((done + failed) / total) * 100).toFixed(1) : '0';
		const mailLabel = mailCount ? `${mailCount} 封邮件` : '';
		const right = `
			<span id="__dl_speed_inline" style="font-size:13px;color:rgba(20,46,77,0.45);"></span>
			<span style="font-size:13px;color:rgba(20,46,77,0.45);"><span id="__dl_done">${done}</span>/${total} 个附件</span>
			<span id="__dl_pct" style="font-size:13px;color:rgba(20,46,77,0.45);">${pct}%</span>`;
		panel.innerHTML = `
			${headerRow(mailLabel, right)}
			<div style="background:rgba(20,46,77,0.06);border-radius:100px;height:4px;margin:10px 0 12px;">
				<div id="__dl_bar" style="background:#0F7AF5;height:100%;border-radius:100px;width:${pct}%;transition:width 0.3s;"></div>
			</div>
			<div id="__dl_fail_section"></div>
			<div id="__dl_current_mail" style="font-size:13px;"></div>
			<div id="__dl_current" style="margin-top:4px;font-size:13px;"></div>
		`;
		mountPanel(panel);
	}

	function createProgressTracker(total) {
		let done = 0;
		let failed = 0;
		const startTime = Date.now();
		const failedTasks = [];
		const recentTasks = [];

		const bar = document.getElementById('__dl_bar');
		const pctEl = document.getElementById('__dl_pct');
		const doneEl = document.getElementById('__dl_done');
		const speedEl = document.getElementById('__dl_speed_inline');
		const mailDiv = document.getElementById('__dl_current_mail');
		const filesDiv = document.getElementById('__dl_current');
		const failSection = document.getElementById('__dl_fail_section');

		let lastMailId = null;
		let lastFailCount = 0;

		function renderMailInfo(mInfo) {
			const idx = mInfo.mailIdx || '';
			const count = mInfo.attachCount || 0;
			const email = escapeHtml(mInfo.senderEmail || '');
			const nick = escapeHtml(mInfo.senderNick || '');
			const subject = escapeHtml(mInfo.subject || '');
			mailDiv.innerHTML = `
				<div style="display:flex;align-items:center;gap:8px;color:rgba(20,46,77,0.55);margin-bottom:2px;">
					${ICONS.mail}
					<span style="color:rgba(20,46,77,0.35);white-space:nowrap;">${idx}</span>
					<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${subject}</span>
					<span style="color:rgba(20,46,77,0.35);white-space:nowrap;">${email}</span>
					<span style="white-space:nowrap;">${nick}</span>
					<span style="color:rgba(20,46,77,0.35);white-space:nowrap;">+${count}</span>
				</div>`;
		}

		function renderRecentFiles() {
			filesDiv.innerHTML = recentTasks
				.slice(-3)
				.map(t => {
					const ai = mailMap[t.mailid + '|' + t.fileid];
					const name = escapeHtml(ai?.origName || t.filename);
					const idx = ai?.attachIdx || '';
					const tot = ai?.attachTotal || '';
					return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;line-height:1.6;color:rgba(20,46,77,0.55);">
						${ICONS.file}
						<span style="color:rgba(20,46,77,0.35);font-size:11px;white-space:nowrap;">${idx}/${tot}</span>
						<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
					</div>`;
				})
				.join('');
		}

		function renderFailSection() {
			failSection.innerHTML = `
				<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(20,46,77,0.06);">
					<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
						${ICONS.fail}
						<span style="color:#E84C3D;font-weight:700;font-size:14px;">失败 ${failedTasks.length}</span>
						<span style="flex:1;"></span>
						<button id="__dl_retry_all" style="background:#0F7AF5;color:#fff;border:none;border-radius:4px;padding:2px 10px;font-size:11px;cursor:pointer;">重试全部</button>
					</div>
					${failedTasks
						.slice(-3)
						.map(
							t => `<div style="font-size:12px;color:rgba(20,46,77,0.55);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.filename)}</div>`
						)
						.join('')}
				</div>`;
			const retryBtn = document.getElementById('__dl_retry_all');
			if (retryBtn) retryBtn.onclick = () => retryFailed(failedTasks);
		}

		return {
			onTask(task) {
				if (task.status === 'done') done++;
				else if (task.status === 'failed') {
					failed++;
					failedTasks.push(task);
				}
				recentTasks.push(task);
				if (recentTasks.length > 5) recentTasks.shift();

				const pct = (((done + failed) / total) * 100).toFixed(1);
				const el = (Date.now() - startTime) / 1000;
				const speed = el > 0 ? (done + failed) / el : 0;
				const rem = total - done - failed;
				const eta = speed > 0 ? Math.ceil(rem / speed) : 0;

				if (bar) bar.style.width = pct + '%';
				if (pctEl) pctEl.textContent = pct + '%';
				if (doneEl) doneEl.textContent = done;
				if (speedEl) {
					const etaMin = Math.floor(eta / 60);
					const etaSec = eta % 60;
					speedEl.textContent = done + failed >= total ? `已完成 · ${Math.floor(el)}秒` : `${speed.toFixed(1)}/秒 · ${etaMin > 0 ? etaMin + '分' : ''}${etaSec}秒`;
				}

				if (mailDiv && task.mailid !== lastMailId) {
					const mInfo = mailMap[task.mailid];
					if (mInfo) renderMailInfo(mInfo);
					lastMailId = task.mailid;
				}
				if (filesDiv) renderRecentFiles();

				if (failSection && failedTasks.length !== lastFailCount) {
					lastFailCount = failedTasks.length;
					if (failedTasks.length > 0) renderFailSection();
				}

				if (done + failed >= total && bar) {
					bar.style.background = failed > 0 ? '#E84C3D' : '#07C160';
				}
			},
		};
	}

	// ============================================================
	//  Scanning UI
	// ============================================================

	function showScanningUI(message) {
		const panel = getOrCreatePanel();
		panel.innerHTML = headerRow(message, '', '__dl_scan_msg');
		mountPanel(panel);
	}

	function updateScanMessage(msg) {
		const el = document.getElementById('__dl_scan_msg');
		if (el) el.textContent = msg;
	}

	// ============================================================
	//  Pipeline
	// ============================================================

	async function runFullPipeline() {
		sid = getSidFromUrl();
		folderId = getFolderIdFromUrl();

		if (!sid || !folderId) {
			showScanningUI('请先打开一个邮件文件夹');
			return;
		}
		try {
			await _runFullPipeline();
		} catch (e) {
			console.error('[QQMailDL] pipeline error:', e);
			showScanningUI(`出错: ${escapeHtml(e.message || String(e))}`);
		}
	}

	async function _runFullPipeline() {
		showScanningUI('验证登录状态...');
		const folderData = await verifySession();
		if (!folderData) {
			showScanningUI('登录态失效，请刷新页面重新登录');
			return;
		}

		const allFolders = [...(folderData.body.list.personal_list || []), ...(folderData.body.list.sys_list || [])];
		const folder = allFolders.find(f => f.dirid === folderId);
		folderName = folder?.name || `文件夹${folderId}`;
		const totalMailNum = folder?.total_num || 0;

		if (totalMailNum === 0) {
			showScanningUI(`${escapeHtml(folderName)} 中没有邮件`);
			return;
		}

		showScanningUI(`扫描邮件...`);
		const allMails = await scanAllMails(totalMailNum, (loaded, total) => {
			updateScanMessage(`扫描邮件 ${loaded}/${total}`);
		});

		const attachments = [];
		let mailTotal = 0;
		for (const mail of allMails) {
			const attaches = getAttachments(mail);
			if (attaches.length === 0) continue;
			mailTotal++;
			const email = getSenderEmail(mail);
			const nick = getSenderNick(mail);
			for (const a of attaches) {
				attachments.push({
					mailid: mail.emailid,
					fileid: a.fileid,
					name: a.name,
					size: a.size,
					type: a.type || '',
					download_url: a.download_url || '',
					ctime: mail.totime,
					subject: mail.subject,
					sender: { addr: email, name: nick },
				});
			}
		}

		buildIdentityMap(attachments);
		buildMailMapFromAttach(attachments);

		const markUnreadPromise = markAllUnread();

		const aiReady = await initBuiltinAI();
		let aiEnhancedCount = 0;
		if (aiReady) {
			updateScanMessage('AI 增强解析...');
			aiEnhancedCount = await enhanceIdentityWithAI(allMails, updateScanMessage);
		}

		updateScanMessage(`检查撤回和空邮件...`);
		const { recalled } = await processRecalledMails(allMails, updateScanMessage);

		const noAttachMails = allMails.filter(m => !hasAttachments(m) && !(m.subject || '').startsWith('发信方已撤回邮件：'));
		const sendersWithAttach = new Set(attachments.map(a => a.sender?.addr).filter(Boolean));

		let inlineEntries = [];
		let emptyMails = [];
		if (noAttachMails.length > 0) {
			updateScanMessage(`检查 ${noAttachMails.length} 封无附件邮件...`);
			const innerResult = await processInnerPicList(noAttachMails, sendersWithAttach, updateScanMessage);
			inlineEntries = innerResult.inlineEntries;
			emptyMails = innerResult.emptyMails;
		}

		await markUnreadPromise;

		const statParts = [
			`${totalMailNum} 封邮件`,
			`${attachments.length} 个附件（${mailTotal} 封有附件）`,
			recalled.length > 0 ? `${recalled.length} 封已撤回` : '',
			inlineEntries.length > 0 ? `${inlineEntries.length} 个正文图片` : '',
			emptyMails.length > 0 ? `${emptyMails.length} 封空邮件` : '',
			aiEnhancedCount > 0 ? `AI 解析 ${aiEnhancedCount} 封` : '',
		].filter(Boolean);

		const panel = getOrCreatePanel();
		panel.innerHTML = `
			${headerRow('扫描完成', `<button id="__dl_pick" style="${BTN_PRIMARY_STYLE}">选择保存目录</button>`)}
			<div style="display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:8px;font-size:13px;color:rgba(20,46,77,0.55);">
				${statParts.map(s => `<span>${s}</span>`).join('')}
			</div>
		`;
		const pickPromise = new Promise(resolve => {
			panel.querySelector('#__dl_pick').addEventListener('click', async () => {
				try {
					const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
					resolve(handle);
				} catch (e) {}
			});
		});
		mountPanel(panel);
		rootHandle = await pickPromise;

		showScanningUI('分析分类...');
		const downloads = buildDownloadListFromAttach(attachments);

		for (const entry of inlineEntries) {
			entry.id = downloads.length;
			entry.status = 'pending';
			downloads.push(entry);
		}

		updateScanMessage('对比本地文件...');
		manifestCache = await readManifest();
		const manifestKeys = new Set(Object.keys(manifestCache));

		const diskFileSet = new Map();
		const dirNames = new Set(downloads.map(d => d.dir));
		for (const dirName of dirNames) {
			const fileSet = new Set();
			try {
				const dh = await rootHandle.getDirectoryHandle(dirName, { create: false });
				for await (const [name, handle] of dh) {
					if (handle.kind === 'file') fileSet.add(name);
				}
			} catch {}
			diskFileSet.set(dirName, fileSet);
		}

		let alreadyDownloaded = 0;
		let manifestRebuilt = false;
		for (const task of downloads) {
			const mKey = `${task.mailid}_${task.fileid}`;
			const onDisk = diskFileSet.get(task.dir)?.has(task.filename);
			const inManifest = manifestKeys.has(mKey);

			if (onDisk) {
				task.status = 'done';
				alreadyDownloaded++;
				if (!inManifest) {
					try {
						const dh = await rootHandle.getDirectoryHandle(task.dir);
						const fh = await dh.getFileHandle(task.filename);
						const file = await fh.getFile();
						manifestCache[mKey] = { dir: task.dir, filename: task.filename, size: file.size, time: Date.now() };
						manifestRebuilt = true;
					} catch {}
				}
			} else if (inManifest) {
				delete manifestCache[mKey];
				manifestRebuilt = true;
			}
		}
		if (manifestRebuilt) await writeManifest(manifestCache);

		const diskTotal = [...diskFileSet.values()].reduce((s, set) => s + set.size, 0);
		console.log(`[QQMailDL] 本地对比: ${diskTotal} 磁盘文件, ${alreadyDownloaded} 匹配, ${downloads.length - alreadyDownloaded} 待下载`);

		const mailCount = mailTotal;
		const pipelineStats = {
			recalledCount: recalled.length,
			emptyCount: emptyMails.length,
			inlineCount: inlineEntries.length,
			totalScanned: totalMailNum,
			aiEnhancedCount,
			alreadyDownloaded,
		};

		const stats = countByDir(downloads);
		const renamedCount = downloads.filter(d => {
			const aInfo = mailMap[d.mailid + '|' + d.fileid];
			return aInfo && d.filename !== aInfo.origName;
		}).length;
		const pending = downloads.filter(t => t.status === 'pending');

		updateScanMessage('保存下载列表...');
		await dbDeleteByFolder(folderId);
		await dbPutBatch('tasks', downloads);

		const dlStatLine = [
			`${totalMailNum} 封邮件`,
			`${downloads.length} 个附件`,
			alreadyDownloaded > 0 ? `已下载 ${alreadyDownloaded}` : '',
			pending.length > 0 ? `待下载 ${pending.length}` : '',
			...formatDirStats(stats),
			recalled.length > 0 ? `已撤回 ${recalled.length}` : '',
			emptyMails.length > 0 ? `空邮件 ${emptyMails.length}` : '',
			inlineEntries.length > 0 ? `内嵌图 ${inlineEntries.length}` : '',
			renamedCount > 0 ? `重命名 ${renamedCount}` : '',
		]
			.filter(Boolean)
			.join(' · ');

		if (pending.length === 0) {
			await syncReadStatus(downloads);
			await onDownloadComplete(downloads, mailCount, pipelineStats);
			return;
		}

		if (alreadyDownloaded > 0) {
			updateScanMessage(`跳过 ${alreadyDownloaded} 个已有文件，同步已读状态...`);
			await syncReadStatus(downloads);
		}

		showProgressUI(alreadyDownloaded, downloads.length, 0, mailCount);
		const scanMsg = document.getElementById('__dl_scan_msg');
		if (scanMsg) scanMsg.textContent = dlStatLine;

		const tracker = createProgressTracker(pending.length);
		await startEngine(pending, task => tracker.onTask(task));

		updateScanMessage('标记已下载...');
		const doneMails = [...new Set(downloads.filter(t => t.status === 'done').map(t => t.mailid))];
		await batchParallel(doneMails, 10, mid => addTag(mid, TAG_DOWNLOADED).catch(() => {}));

		await onDownloadComplete(downloads, mailCount, pipelineStats);
	}

	async function syncReadStatus(tasks) {
		const mailAttachCount = new Map();
		for (const task of tasks) {
			const mid = task.mailid;
			if (!mid) continue;
			if (!mailAttachCount.has(mid)) mailAttachCount.set(mid, { total: 0, done: 0 });
			const m = mailAttachCount.get(mid);
			m.total++;
			if (task.status === 'done') m.done++;
		}
		const readPromises = [];
		for (const [mid, counts] of mailAttachCount) {
			if (counts.done >= counts.total) {
				readPromises.push(markMailRead(mid).catch(() => {}));
			}
		}
		for (let i = 0; i < readPromises.length; i += 10) {
			await Promise.all(readPromises.slice(i, i + 10));
		}
	}

	async function onDownloadComplete(tasks, mc, pipelineStats) {
		showScanningUI('生成审计报告...');
		const reportStats = await generateReport(tasks, pipelineStats);

		const panel = getOrCreatePanel();
		const done = tasks.filter(t => t.status === 'done').length;
		const failed = tasks.filter(t => t.status === 'failed').length;
		const total = tasks.length;
		const stats = countByDir(tasks);

		const summaryParts = [
			`${done}/${total} 成功`,
			failed > 0 ? `${failed} 失败` : '',
			...formatDirStats(stats),
		]
			.filter(Boolean)
			.join(' · ');

		const barColor = failed > 0 ? '#E84C3D' : '#07C160';

		panel.innerHTML = `
			<div style="display:flex;align-items:center;gap:8px;height:32px;">
				<span style="font-size:16px;font-weight:700;color:rgb(19,24,29);">附件下载</span>
				${ICONS.check}
				<span style="${TEXT_MUTED}">${summaryParts}</span>
				<span style="flex:1;"></span>
				<span style="font-size:12px;color:rgba(20,46,77,0.35);">report.md 已保存</span>
			</div>
			<div style="background:rgba(20,46,77,0.06);border-radius:100px;height:4px;margin:10px 0 0;">
				<div style="background:${barColor};height:100%;border-radius:100px;width:100%;"></div>
			</div>
		`;
		mountPanel(panel);
	}

	async function resumeDownloads() {
		const allStored = await dbGetAll('tasks');
		const allTasks = allStored.filter(t => t.folderId === folderId);
		const pending = allTasks.filter(t => t.status === 'pending' || t.status === 'failed');
		const total = allTasks.length;

		const currentSid = getSidFromUrl();
		if (currentSid) {
			for (const t of pending) {
				t.url = replaceSid(t.url, currentSid);
				t.status = 'pending';
				t.error = undefined;
			}
			await dbPutBatch('tasks', pending);
			sid = currentSid;
		}

		let mc = 0;
		if (Object.keys(mailMap).length === 0) {
			folderId = getFolderIdFromUrl();
			if (folderId && sid) {
				try {
					const folderData = await verifySession();
					if (folderData) {
						const allFolders = [...(folderData.body.list.personal_list || []), ...(folderData.body.list.sys_list || [])];
						const folder = allFolders.find(f => f.dirid === folderId);
						const totalNum = folder?.total_num || 0;
						if (totalNum > 0) {
							const allMails = await scanAllMails(totalNum);
							buildIdentityMap(allMails);
							buildMailMap(allMails);
							mc = allMails.filter(hasAttachments).length;
						}
					}
				} catch (e) {}
			}
		}

		showScanningUI('读取本地已有文件...');
		manifestCache = await readManifest();
		const manifestKeys = new Set(Object.keys(manifestCache));

		showScanningUI('标记全部未读...');
		await markAllUnread();

		let skipped = 0;
		for (const task of pending) {
			const key = `${task.mailid}_${task.fileid}`;
			if (manifestKeys.has(key)) {
				task.status = 'done';
				await dbPut('tasks', task);
				skipped++;
			}
		}

		if (skipped > 0) {
			updateScanMessage(`跳过 ${skipped} 个已有文件，同步已读状态...`);
			await syncReadStatus(allTasks);
		}

		const actualPending = pending.filter(t => t.status === 'pending');
		const actualDone = total - actualPending.length;

		if (actualPending.length === 0) {
			showProgressUI(actualDone, total, 0, mc);
			return;
		}

		showProgressUI(actualDone, total, 0, mc);
		const tracker = createProgressTracker(actualPending.length);
		await startEngine(actualPending, task => tracker.onTask(task));
	}

	async function retryFailed(failedTasks) {
		if (!rootHandle) {
			try {
				rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
			} catch (e) {
				return;
			}
		}

		const currentSid = getSidFromUrl();
		for (const t of failedTasks) {
			t.url = replaceSid(t.url, currentSid);
			t.status = 'pending';
			t.error = undefined;
		}
		await dbPutBatch('tasks', failedTasks);

		const allTasks = await dbGetAll('tasks');
		const doneCount = allTasks.filter(t => t.status === 'done').length;
		const total = allTasks.length;
		const mailCount = new Set(allTasks.map(t => t.mailid)).size;
		showProgressUI(doneCount, total, 0, mailCount);

		let retryDone = 0;
		const tracker = createProgressTracker(failedTasks.length);
		const origOnTask = tracker.onTask.bind(tracker);
		tracker.onTask = function (task) {
			origOnTask(task);
			if (task.status === 'done') retryDone++;
			const doneEl = document.getElementById('__dl_done');
			if (doneEl) doneEl.textContent = doneCount + retryDone;
		};

		await startEngine(failedTasks, task => tracker.onTask(task));

		const section = document.getElementById('__dl_fail_section');
		if (section) {
			const remaining = failedTasks.filter(t => t.status === 'failed');
			if (remaining.length === 0) {
				section.innerHTML = '';
			}
		}
	}

	// ============================================================
	//  Init
	// ============================================================

	async function init() {
		if (!window.showDirectoryPicker) return; // FSAPI required
		sid = getSidFromUrl();
		folderId = getFolderIdFromUrl();
		folderName = '';
		if (!sid || !folderId) return;

		db = await openDB();
		setupAutoSidRecovery();

		const existing = await dbGetAll('tasks');
		const folderTasks = existing.filter(t => t.folderId === folderId);
		if (folderTasks.length > 0) {
			const pending = folderTasks.filter(t => t.status === 'pending' || t.status === 'failed');
			if (pending.length > 0) {
				showResumeUI(pending.length);
				return;
			}
		}

		showStartUI();
	}

	// Handle SPA navigation (QQ Mail uses hash-based routing)
	window.addEventListener('hashchange', () => {
		const newFolderId = getFolderIdFromUrl();
		if (newFolderId && newFolderId !== folderId) {
			folderId = newFolderId;
			sid = getSidFromUrl();
			const old = document.getElementById('__dl_panel');
			if (old) old.remove();
			init();
		}
	});

	// @run-at document-idle guarantees DOM is ready
	setTimeout(init, 1000);
})();
