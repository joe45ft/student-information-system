const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cross-origin-opener-policy": "same-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-robots-tag": "noindex, nofollow, noarchive"
};

const HTML_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://cdn-uicons.flaticon.com",
  "font-src 'self' https://cdn-uicons.flaticon.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'"
].join("; ");

export const nowIso = () => new Date().toISOString();
export const clean = (v = "", max = 5000) => String(v ?? "").trim().slice(0, max);
export const normalizeEmail = (v = "") => String(v ?? "").trim().toLowerCase();
export const intId = v => {
  const n = Number.parseInt(String(v), 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

export const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
export const oneOf = (value, allowed) => allowed.includes(String(value));

export function validIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function pageNumber(value) {
  const n = Number.parseInt(String(value ?? "1"), 10);
  return Number.isSafeInteger(n) && n > 0 ? n : 1;
}

export function esc(v = "") {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function validatePassword(p) {
  const errors = [];
  if (p.length < 8) errors.push("Password must be at least 8 characters.");
  if (p.length > 128) errors.push("Password is too long.");
  if (!/[A-Z]/.test(p)) errors.push("Add an uppercase letter.");
  if (!/[a-z]/.test(p)) errors.push("Add a lowercase letter.");
  if (!/[0-9]/.test(p)) errors.push("Add a number.");
  return errors;
}

export async function readForm(request) {
  const formData = await request.formData();
  const output = {};
  for (const [key, value] of formData.entries()) {
    if (key in output) output[key] = Array.isArray(output[key]) ? [...output[key], value] : [output[key], value];
    else output[key] = value;
  }
  return output;
}

export function redirect(location, status = 303, headers = {}) {
  return new Response(null, {
    status,
    headers: { location, "cache-control": "no-store", ...SECURITY_HEADERS, ...headers }
  });
}

export function html(body, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    "content-type": "text/html; charset=UTF-8",
    "cache-control": "no-store",
    "content-security-policy": HTML_CSP,
    ...SECURITY_HEADERS
  });
  for (const [key, value] of Object.entries(extraHeaders)) headers.append(key, value);
  return new Response(body, { status, headers });
}

export function text(body, status = 200, type = "text/plain; charset=UTF-8", headers = {}) {
  return new Response(body, {
    status,
    headers: { "content-type": type, ...SECURITY_HEADERS, ...headers }
  });
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      ...SECURITY_HEADERS,
      ...headers
    }
  });
}

export function csvEscape(v) {
  const value = String(v ?? "");
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function csvResponse(rows, filename) {
  const body = "\uFEFF" + rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=UTF-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      ...SECURITY_HEADERS
    }
  });
}

export function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else {
      if (c === '"') quoted = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        field = "";
      } else field += c;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter(r => r.some(v => String(v).trim() !== ""));
}

export function msg(url) {
  const message = url.searchParams.get("msg");
  return message ? { text: message, type: url.searchParams.get("type") === "error" ? "error" : "success" } : null;
}
