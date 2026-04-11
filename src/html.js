/**
 * Tagged template literal，自动对插值做 HTML 转义。
 * 用法: container.innerHTML = html`<div>${unsafeString}</div>`;
 */

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const ESC_RE = /[&<>"']/g;

function escapeHtml(str) {
  return str.replace(ESC_RE, ch => ESC_MAP[ch]);
}

/**
 * Tagged template literal that auto-escapes interpolated values.
 * Values wrapped in trusted() bypass escaping.
 */
export function html(strings, ...values) {
  return strings.reduce((out, str, i) => {
    if (i >= values.length) return out + str;
    const val = values[i];
    const escaped = val && val.__trusted
      ? val.toString()
      : escapeHtml(String(val ?? ''));
    return out + str + escaped;
  }, '');
}

/**
 * 标记一段 HTML 为"已信任"，跳过转义。
 * 仅用于代码中定义的常量（如 SVG 图标），绝不用于用户数据。
 */
export function trusted(rawHtml) {
  return { __trusted: true, toString: () => rawHtml };
}
