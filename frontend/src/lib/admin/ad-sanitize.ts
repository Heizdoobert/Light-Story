import DOMPurify from "dompurify";

/**
 * Allowlist of tags/attrs permitted inside admin-provided ad markup.
 * DOMPurify always strips <script>, so external script tags are re-injected
 * from the source markup afterwards, restricted to allowlisted hosts only.
 */
const ALLOWED_TAGS = [
  "ins",
  "a",
  "img",
  "div",
  "span",
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "small",
  "center",
  "blockquote",
  "table",
  "tbody",
  "thead",
  "tr",
  "td",
  "th",
];

const ALLOWED_ATTR = [
  "src",
  "href",
  "class",
  "target",
  "rel",
  "width",
  "height",
  "style",
  "alt",
  "title",
  "data-ad-client",
  "data-ad-slot",
  "data-ad-format",
  "data-full-width-responsive",
  "data-adtest",
];

const SCRIPT_SRC_REGEX = /<script[^>]*\bsrc\s*=\s*['"]([^'"]+)['"][^>]*>/gi;

const getScriptHost = (src: string): string | null => {
  try {
    return new URL(src, window.location.origin).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const escapeAttr = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Defense-in-depth sanitizer for admin-authored ad markup, applied at render
 * time AFTER `validateAdMarkup` (which gates save + terms policy). DOMPurify
 * strips event handlers, javascript:/data: URLs, <base>, iframes, inline
 * scripts, etc. Only `<script src>` pointing at an allowlisted host survives.
 */
export function sanitizeAdMarkup(
  markup: string,
  allowedScriptHosts: string[],
): string {
  if (!markup) return "";
  if (typeof window === "undefined" || !DOMPurify.isSupported) return "";

  const allowedHosts = new Set(
    allowedScriptHosts.map((host) => host.toLowerCase()),
  );

  const scriptSrcs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = SCRIPT_SRC_REGEX.exec(markup)) !== null) {
    const host = getScriptHost(match[1]);
    if (host && allowedHosts.has(host)) {
      scriptSrcs.push(match[1]);
    }
  }

  const clean = DOMPurify.sanitize(markup, { ALLOWED_TAGS, ALLOWED_ATTR });
  if (clean && scriptSrcs.length > 0) {
    const scripts = scriptSrcs
      .map((src) => `<script async src="${escapeAttr(src)}"></script>`)
      .join("");
    return `${clean}${scripts}`;
  }
  return clean;
}
