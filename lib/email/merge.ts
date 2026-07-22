// lib/email — merge-tag substitution. Templates use {{snake_case}} tokens.
// Values are HTML-escaped before insertion into the body so requester-supplied
// text (name, reason) can never inject markup. Unknown/empty tags render blank.

export type MergeVars = Record<string, string | number | null | undefined>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const TAG_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/** Fill {{tags}} in an HTML body, escaping every substituted value. */
export function mergeHtml(template: string, vars: MergeVars): string {
  return template.replace(TAG_RE, (_m, key: string) => {
    const value = vars[key];
    if (value === null || value === undefined || value === "") return "";
    return escapeHtml(String(value));
  });
}

/** Fill {{tags}} in a plain-text subject (no escaping — not rendered as HTML). */
export function mergeText(template: string, vars: MergeVars): string {
  return template.replace(TAG_RE, (_m, key: string) => {
    const value = vars[key];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}
