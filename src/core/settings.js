const STORAGE_KEY = 'qqmail_downloader_settings';

const DEFAULTS = {
  fileNaming: {
    prefix: '',
    suffix: '',
    includeMailId: false,
    includeAttachmentId: false,
    includeMailSubject: false,
    includeFileType: false,
    separator: '_',
    useCustomPattern: false,
    customPattern: '{date}_{subject}_{fileName}',
    validation: {
      enabled: true,
      pattern: '\\d{6,}',
      fallbackPattern: 'auto',
      fallbackTemplate: '{subject}_{fileName}',
      replacementChar: '_',
      removeInvalidChars: true,
    },
  },
  folderStructure: 'flat',
  dateFormat: 'YYYY-MM-DD',
  createDateSubfolders: false,
  folderNaming: { customTemplate: '{date}/{senderName}' },
  conflictResolution: 'rename',
  downloadBehavior: {
    showProgress: true,
    retryOnFail: true,
    verifyDownloads: true,
    notifyOnComplete: true,
    concurrentDownloads: 'auto',
    autoCompareAfterDownload: true,
  },
  smartGrouping: {
    enabled: false,
    maxGroupSize: 5,
    groupByType: true,
    groupByDate: true,
  },
  contentReplacement: {
    enabled: false,
    rules: [],
  },
  customVariables: [],
};

export class Settings {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return structuredClone(DEFAULTS);
      return this._merge(DEFAULTS, JSON.parse(stored));
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[Settings] save failed:', e);
    }
  }

  reset() {
    this.data = structuredClone(DEFAULTS);
    this.save();
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.data);
  }

  set(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.data);
    target[last] = value;
    this.save();
  }

  _merge(defaults, stored) {
    const result = structuredClone(defaults);
    for (const [key, val] of Object.entries(stored)) {
      if (key in result) {
        if (val && typeof val === 'object' && !Array.isArray(val) &&
            typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = this._merge(result[key], val);
        } else {
          result[key] = val;
        }
      }
    }
    return result;
  }
}

export { DEFAULTS as SETTING_DEFAULTS };
