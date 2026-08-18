import { esc, msg } from "./utils.js";
import { can } from "./db.js";
import { APP_VERSION, AUTO_REFRESH_INTERVAL_SECONDS } from "./config.js";

export const CSS = `
:root{color-scheme:light;--bg:#f5f7fb;--panel:#fff;--panel-2:#f9fbff;--text:#172033;--muted:#647188;--line:#dfe5ee;--brand:#3668f2;--brand2:#264fc6;--brand-soft:#edf2ff;--danger:#b82f43;--danger-soft:#fff0f1;--ok:#176a4c;--ok-soft:#ebf9f2;--warning:#8a5a00;--warning-soft:#fff7df;--input:#fff;--table-head:#fbfcfe;--sidebar:#121a2b;--sidebar-text:#dfe7fa;--sidebar-muted:#9aa8c0;--sidebar-hover:#1e2a43;--shadow:0 12px 34px rgba(20,35,60,.07);--shadow-soft:0 5px 18px rgba(25,38,65,.04);--radius:15px;--sidebar-width:244px;--page-pad:24px;--row-pad:11px 12px}
:root[data-theme="dark"]{color-scheme:dark;--bg:#0d111b;--panel:#151b27;--panel-2:#101620;--text:#edf2fb;--muted:#a8b3c7;--line:#2b3548;--brand:#7698ff;--brand2:#9ab2ff;--brand-soft:#202b45;--danger:#ff98a5;--danger-soft:#321b23;--ok:#6cddb0;--ok-soft:#153329;--warning:#ffd27a;--warning-soft:#332812;--input:#101620;--table-head:#111722;--sidebar:#0a0f18;--sidebar-text:#e7ecf7;--sidebar-muted:#98a5ba;--sidebar-hover:#172033;--shadow:0 16px 38px rgba(0,0,0,.28);--shadow-soft:0 7px 20px rgba(0,0,0,.18)}
*{box-sizing:border-box}
html{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:var(--bg);color:var(--text);scroll-behavior:smooth}
body{margin:0;background:var(--bg);min-height:100vh;transition:background .18s,color .18s}
a{text-decoration:none;color:inherit}
button,input,select,textarea{font:inherit}
button:disabled,input:disabled,select:disabled,textarea:disabled{cursor:not-allowed;opacity:.65}
:focus-visible{outline:3px solid color-mix(in srgb,var(--brand) 45%,transparent);outline-offset:2px}
.muted{color:var(--muted)}
.small{font-size:12px}
.skip-link{position:fixed;left:12px;top:10px;z-index:1000;transform:translateY(-160%);background:var(--panel);color:var(--text);border:1px solid var(--brand);border-radius:9px;padding:9px 12px;box-shadow:var(--shadow)}
.skip-link:focus{transform:translateY(0)}
.icon-btn{width:40px;height:40px;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:11px;display:inline-grid;place-items:center;cursor:pointer;transition:.18s ease}
.icon-btn:hover{transform:translateY(-1px);border-color:var(--brand);background:var(--brand-soft);color:var(--brand)}
.display-controls{display:flex;align-items:center;gap:8px}
.control-chip{min-height:40px;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:11px;padding:0 11px;display:flex;align-items:center;gap:8px;cursor:pointer;transition:.16s}
.control-chip:hover{background:var(--brand-soft);color:var(--brand);border-color:var(--brand)}
.auth{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 15% 10%,rgba(54,104,242,.14),transparent 38%),var(--bg);position:relative}
.auth-tools{position:fixed;right:22px;top:22px;z-index:2}
.auth-card{width:min(560px,100%);background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:34px;box-shadow:var(--shadow);transition:background .2s,border-color .2s}
.brand{display:flex;gap:12px;align-items:center;margin-bottom:23px}
.brand i{font-size:29px;color:var(--brand)}
.brand strong{font-size:19px}
.brand small{display:block;color:var(--muted);font-size:11px;margin-top:2px}
h1{font-size:27px;margin:0 0 8px;letter-spacing:-.025em;line-height:1.2}
h2{font-size:19px;margin:0 0 12px;line-height:1.3}
h3{font-size:15px;margin:0 0 10px}
p{line-height:1.55}
.grid{display:grid;gap:15px}
.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.span2{grid-column:1/-1}
label span{display:block;font-size:12px;font-weight:700;margin-bottom:7px}
input,select,textarea{width:100%;border:1px solid var(--line);border-radius:11px;padding:11px 12px;background:var(--input);color:var(--text);outline:none;transition:.16s ease;min-height:42px}
input::placeholder,textarea::placeholder{color:var(--muted)}
textarea{min-height:102px;resize:vertical}
input:focus,select:focus,textarea:focus{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 18%,transparent)}
input:user-invalid,select:user-invalid,textarea:user-invalid{border-color:var(--danger)}
.btn{border:0;border-radius:10px;min-height:40px;padding:10px 14px;font-weight:750;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:.16s ease}
.btn:hover:not(:disabled){transform:translateY(-1px)}
.btn.primary{background:var(--brand);color:#fff}
.btn.primary:hover:not(:disabled){background:var(--brand2)}
.btn.soft{background:var(--brand-soft);color:var(--brand)}
.btn.danger{background:var(--danger-soft);color:var(--danger);border:1px solid var(--line)}
.btn.small{padding:7px 10px;font-size:12px;min-height:34px}
form[aria-busy="true"] .btn[type="submit"]{cursor:progress}
.notice{padding:11px 13px;border-radius:10px;margin:14px 0;font-size:13px;line-height:1.45}
.notice.error{background:var(--danger-soft);color:var(--danger);border:1px solid var(--line)}
.notice.success{background:var(--ok-soft);color:var(--ok);border:1px solid var(--line)}
.notice.warning{background:var(--warning-soft);color:var(--warning);border:1px solid var(--line)}
.app{min-height:100vh;display:grid;grid-template-columns:var(--sidebar-width) minmax(0,1fr);transition:grid-template-columns .22s ease}
.sidebar{background:var(--sidebar);color:var(--sidebar-text);padding:18px 13px;position:sticky;top:0;height:100vh;z-index:20;transition:width .22s,transform .22s;overflow-y:auto}
.side-brand{display:flex;gap:10px;align-items:center;padding:8px 9px 18px;min-height:58px;overflow:hidden}
.side-brand i{font-size:25px;color:#8fb0ff;flex:0 0 auto}
.side-brand strong{display:block;white-space:nowrap;max-width:172px;overflow:hidden;text-overflow:ellipsis}
.side-brand small{display:block;color:var(--sidebar-muted);font-size:11px;white-space:nowrap}
.sidebar-tools{display:flex;justify-content:flex-end;padding:0 4px 10px}
.sidebar-collapse{background:transparent;border:1px solid #33415c;color:#b7c3d7}
.nav{display:grid;gap:4px}
.nav a{padding:10px 11px;border-radius:9px;color:#c4cede;font-size:13px;display:flex;gap:10px;align-items:center;white-space:nowrap;min-height:40px;transition:.15s}
.nav a i{font-size:17px;min-width:18px;text-align:center}
.nav a:hover,.nav a.active{background:var(--sidebar-hover);color:#fff}
.nav a.active{box-shadow:inset 3px 0 0 #7698ff}
.nav .sep{height:1px;background:#24304a;margin:8px 7px}
.sidebar-collapsed{--sidebar-width:76px}
.sidebar-collapsed .side-brand div,.sidebar-collapsed .nav a span,.sidebar-collapsed .side-brand small{display:none}
.sidebar-collapsed .side-brand{justify-content:center}
.sidebar-collapsed .nav a{justify-content:center;padding:10px}
.sidebar-collapsed .nav a.active{box-shadow:inset 0 0 0 1px #3c527d}
.sidebar-collapsed .sidebar-tools{justify-content:center}
.main{min-width:0}
.topbar{height:68px;background:var(--panel);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 var(--page-pad);position:sticky;top:0;z-index:10}
.topbar-left,.topbar-right{display:flex;align-items:center;gap:10px}
.mobile-menu{display:none}
.top-title{font-weight:800;letter-spacing:-.015em}
.userchip{display:flex;align-items:center;gap:9px;border-left:1px solid var(--line);padding-left:12px}
.avatar{width:36px;height:36px;border-radius:12px;background:var(--brand-soft);color:var(--brand);display:grid;place-items:center;font-weight:800}
.page{padding:var(--page-pad);max-width:1500px;width:100%;margin:0 auto}
.page-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px}
.page-head h1{font-size:26px}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow-soft);transition:.18s ease}
.card:hover{transform:translateY(-2px);border-color:var(--brand);box-shadow:var(--shadow)}
.stat{display:flex;justify-content:space-between;align-items:flex-start}
.stat b{font-size:29px;letter-spacing:-.035em}
.stat i{font-size:23px;color:var(--brand);background:var(--brand-soft);padding:10px;border-radius:11px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow-soft);overflow:hidden;margin-bottom:18px}
.panel-head{padding:16px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:10px}
.panel-head h2{margin:0}
.panel-body{padding:18px}
.table-wrap{overflow:auto;max-width:100%;overscroll-behavior-inline:contain}
table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}
th,td{text-align:left;padding:var(--row-pad);border-bottom:1px solid var(--line);vertical-align:middle}
th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.05em;background:var(--table-head);position:sticky;top:0;z-index:1;white-space:nowrap}
tbody tr{transition:background .12s}
tbody tr:hover{background:var(--panel-2)}
.badge{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800;background:var(--brand-soft);color:var(--brand)}
.badge.ok{background:var(--ok-soft);color:var(--ok)}
.badge.off{background:var(--panel-2);color:var(--muted)}
.toolbar{display:flex;gap:9px;align-items:end;flex-wrap:wrap}
.toolbar label{min-width:150px;flex:1}
.toolbar .compact{flex:0 0 auto;min-width:110px}
.checks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.check{display:flex;gap:8px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--panel-2)}
.check input{width:auto;min-height:auto;margin-top:2px}
.check span{margin:0;font-weight:600;font-size:12px}
.empty{padding:28px;text-align:center;color:var(--muted)}
.footer-note{font-size:11px;color:var(--muted);margin-top:16px;line-height:1.5}
.mobile-overlay{display:none}
.pagination{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin:-4px 0 18px}
.pagination .page-label{font-size:12px;color:var(--muted);padding:0 5px}
.pagination .btn[aria-disabled="true"]{pointer-events:none;opacity:.5}
.table-link{color:var(--text);transition:color .15s}.table-link:hover{color:var(--brand)}
.student-name-link{font-weight:750}
.text-link{color:var(--brand);font-weight:750}.text-link:hover{text-decoration:underline}
.dashboard-cards{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:18px}
.stat-link{color:inherit}.stat-link .stat-sub{display:block;color:var(--muted);font-size:11px;margin-top:5px;font-weight:600}
.dashboard-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.dashboard-grid>.panel{margin-bottom:0}
.panel-kicker{font-size:11px;color:var(--muted);margin:3px 0 0}.panel-head>div h2{margin:0}
.coverage-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.coverage{border:1px solid var(--line);background:var(--panel-2);border-radius:12px;padding:15px}.coverage strong{font-size:25px;display:block}.coverage>span{display:block;color:var(--muted);font-size:12px;margin:2px 0 12px}.progress,.bar-track{height:8px;background:var(--brand-soft);border-radius:999px;overflow:hidden}.progress span,.bar-track span{display:block;height:100%;background:var(--brand);border-radius:inherit}
.bar-list{display:grid;gap:13px}.bar-row{display:grid;gap:6px}.bar-label{display:flex;justify-content:space-between;gap:12px;font-size:12px}.bar-label span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bar-label strong{font-size:12px}
.mini-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}.mini-stats>div{border:1px solid var(--line);background:var(--panel-2);border-radius:11px;padding:12px}.mini-stats strong{font-size:20px;display:block}.mini-stats span{color:var(--muted);font-size:11px}.full-btn{width:100%}.compact-empty{padding:12px}.dashboard-signout{display:flex;justify-content:flex-end}
.filter-panel{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow-soft);margin-bottom:14px;overflow:hidden}.filter-panel summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px 18px;font-weight:800}.filter-panel summary::-webkit-details-marker{display:none}.filter-panel summary>span:first-child{display:flex;align-items:center;gap:9px}.filter-panel[open] summary{border-bottom:1px solid var(--line)}.filter-summary{font-size:11px;color:var(--muted);font-weight:600}.filter-grid{display:grid;grid-template-columns:2fr repeat(3,minmax(130px,1fr));gap:12px;align-items:end}.filter-search{grid-column:span 2}.filter-actions{display:flex;gap:8px;align-items:end}.results-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px;margin:0 3px 10px}.results-meta strong{color:var(--text);font-size:14px}.empty-state{display:grid;place-items:center;gap:7px}.empty-state i{font-size:24px;color:var(--brand)}.empty-state strong{color:var(--text)}
.student-hero{display:flex;align-items:center;gap:18px;background:linear-gradient(135deg,var(--panel),var(--brand-soft));border:1px solid var(--line);border-radius:18px;padding:22px;margin-bottom:18px;box-shadow:var(--shadow-soft)}.student-avatar{width:76px;height:76px;border-radius:22px;background:var(--brand);color:#fff;display:grid;place-items:center;font-size:24px;font-weight:850;flex:0 0 auto;box-shadow:0 10px 25px color-mix(in srgb,var(--brand) 22%,transparent)}.student-identity{min-width:0}.student-identity h2{font-size:24px;margin:7px 0 4px}.student-identity p{margin:0;color:var(--muted);font-size:13px}.identity-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.code-pill{display:inline-flex;padding:5px 9px;border-radius:999px;background:var(--panel);border:1px solid var(--line);font-size:11px;font-weight:800;color:var(--brand)}
.profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.profile-grid>.panel{margin-bottom:18px}.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.info-item{display:flex;gap:11px;align-items:flex-start;border:1px solid var(--line);background:var(--panel-2);border-radius:12px;padding:13px;min-width:0}.info-item>i{color:var(--brand);font-size:18px;margin-top:2px}.info-item>div{min-width:0}.info-item span,.record-meta span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.045em;font-weight:750;margin-bottom:4px}.info-item strong{font-size:13px;word-break:break-word}.notes-box{white-space:pre-wrap;line-height:1.65;min-height:50px}.record-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.record-meta>div{border:1px solid var(--line);background:var(--panel-2);border-radius:11px;padding:12px}.record-meta strong{font-size:12px}

.badge.warn{background:var(--warning-soft);color:var(--warning)}
.badge.role{background:var(--panel-2);color:var(--text);border:1px solid var(--line)}
.badge.role.owner{background:var(--warning-soft);color:var(--warning)}
.badge.role.admin{background:var(--brand-soft);color:var(--brand)}
.badge.role.data_entry{background:var(--ok-soft);color:var(--ok)}
.user-name-link{font-weight:800}.row-actions{display:flex;gap:6px;flex-wrap:wrap}.permission-count{font-weight:800;color:var(--brand);white-space:nowrap}
.users-filter{grid-template-columns:2fr minmax(150px,1fr) minmax(150px,1fr) auto}.users-filter .filter-search{grid-column:auto}.users-filter .filter-actions{align-self:end}
.user-hero{display:flex;align-items:center;gap:18px;background:linear-gradient(135deg,var(--panel),var(--brand-soft));border:1px solid var(--line);border-radius:18px;padding:22px;margin-bottom:14px;box-shadow:var(--shadow-soft)}.user-avatar{border-radius:50%}
.user-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 18px;border-bottom:1px solid var(--line);padding-bottom:9px}.user-tab{padding:9px 12px;border-radius:9px;font-size:12px;font-weight:800;color:var(--muted)}.user-tab:hover{background:var(--brand-soft);color:var(--brand)}.user-tab.active{background:var(--brand-soft);color:var(--brand)}
.permission-editor{display:grid;gap:14px}.permission-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.permission-editor-head h3{margin-bottom:4px}.permission-editor-head p{margin:0}
.permission-group{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--panel-2)}.permission-group-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--line);background:var(--panel)}.permission-group-head h3{margin:0 0 2px}.permission-group-head span{font-size:11px;color:var(--muted)}.permission-actions{display:flex;gap:6px;flex-wrap:wrap}.btn.tiny{min-height:30px;padding:5px 8px;font-size:10px}.permission-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px}.permission-check{margin:0}.permission-check span{min-width:0}.permission-check strong{display:block;font-size:12px}.permission-check small{display:block;color:var(--muted);font-size:10px;margin-top:3px;word-break:break-word}.permission-check.locked{opacity:.72}.permission-check.locked input{cursor:not-allowed}.danger-zone{border-color:color-mix(in srgb,var(--danger) 35%,var(--line))}

.density-compact{--page-pad:18px;--row-pad:7px 10px}
.density-compact .panel-body{padding:14px}
.density-compact .card{padding:14px}
.density-compact .topbar{height:60px}
.density-compact .nav a{min-height:35px;padding-top:7px;padding-bottom:7px}
@media(max-width:980px){.cards,.dashboard-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.users-filter{grid-template-columns:repeat(2,minmax(0,1fr))}.permission-grid{grid-template-columns:1fr}.filter-search{grid-column:span 2}.checks{grid-template-columns:1fr 1fr}.control-chip span{display:none}.control-chip{width:40px;padding:0;justify-content:center}}
@media(max-width:820px){.dashboard-grid,.profile-grid{grid-template-columns:1fr}.record-meta{grid-template-columns:1fr 1fr}body.mobile-nav-open{overflow:hidden}.app{grid-template-columns:1fr}.sidebar{position:fixed;left:0;transform:translateX(-105%);width:min(286px,86vw);box-shadow:18px 0 42px rgba(0,0,0,.25)}.sidebar-collapsed{--sidebar-width:244px}.sidebar-collapsed .side-brand div,.sidebar-collapsed .nav a span,.sidebar-collapsed .side-brand small{display:block}.sidebar-collapsed .side-brand{justify-content:flex-start}.sidebar-collapsed .nav a{justify-content:flex-start;padding:10px 11px}.sidebar-tools{display:none}.mobile-nav-open .sidebar{transform:translateX(0)}.mobile-overlay{display:block;position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:19;opacity:0;pointer-events:none;transition:.2s}.mobile-nav-open .mobile-overlay{opacity:1;pointer-events:auto}.mobile-menu{display:inline-grid}.topbar{padding:0 16px}.page{padding:18px}.top-title{display:none}.userchip>div:last-child{display:none}.userchip{padding-left:8px}}
@media(max-width:600px){.two,.cards,.dashboard-cards,.checks,.filter-grid,.users-filter,.info-grid,.record-meta,.coverage-grid,.mini-stats{grid-template-columns:1fr}.permission-editor-head,.permission-group-head{align-items:stretch;flex-direction:column}.permission-actions{width:100%}.permission-actions .btn{flex:1}.filter-search{grid-column:auto}.filter-actions{flex-direction:column;align-items:stretch}.filter-actions .btn{width:100%}.results-meta{align-items:flex-start;flex-direction:column}.student-hero{align-items:flex-start;padding:17px}.student-avatar{width:60px;height:60px;border-radius:17px;font-size:19px}.student-identity h2{font-size:20px}.span2{grid-column:auto}.page{padding:14px}.auth{padding:16px}.auth-card{padding:24px 20px}.page-head{flex-direction:column}.topbar{height:62px}.display-controls [data-density-toggle]{display:none}.auth-tools{right:14px;top:14px}.page-head h1{font-size:23px}.actions{width:100%}.actions .btn{flex:1;min-height:44px}.toolbar>*{width:100%;flex-basis:100%!important}.toolbar .btn{width:100%;min-height:44px}.btn{min-height:44px}.pagination{justify-content:space-between}.pagination .page-label{flex:1;text-align:center}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;

const icon = name => `<i class="fi fi-rr-${name}" aria-hidden="true"></i>`;
const AUTO_REFRESH_PATHS = new Set(["/dashboard","/students","/batches","/lecturers","/subjects","/groups","/users","/reports","/activity","/sessions"]);
export const csrfField = token => `<input type="hidden" name="_csrf" value="${esc(token)}">`;

export function notice(url, explicit = null) {
  const item = explicit || msg(url);
  if (!item) return "";
  const role = item.type === "error" ? "alert" : "status";
  return `<div class="notice ${item.type}" role="${role}" aria-live="polite">${esc(item.text)}</div>`;
}

export function badge(status) {
  return `<span class="badge ${status === "ACTIVE" ? "ok" : "off"}">${esc(status)}</span>`;
}

export function pagination(url, page, hasNext) {
  const link = targetPage => {
    const copy = new URL(url.toString());
    if (targetPage <= 1) copy.searchParams.delete("page");
    else copy.searchParams.set("page", String(targetPage));
    return esc(`${copy.pathname}${copy.search}`);
  };
  const previous = page > 1
    ? `<a class="btn soft small" href="${link(page - 1)}" rel="prev">Previous</a>`
    : `<span class="btn soft small" aria-disabled="true">Previous</span>`;
  const next = hasNext
    ? `<a class="btn soft small" href="${link(page + 1)}" rel="next">Next</a>`
    : `<span class="btn soft small" aria-disabled="true">Next</span>`;
  return `<nav class="pagination" aria-label="Pagination">${previous}<span class="page-label">Page ${page}</span>${next}</nav>`;
}

function head(title) {
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="robots" content="noindex,nofollow,noarchive"><title>${title}</title><link rel="stylesheet" href="https://cdn-uicons.flaticon.com/3.0.0/uicons-regular-rounded/css/uicons-regular-rounded.css"><link rel="stylesheet" href="/assets/app.css?v=${APP_VERSION}"><script defer src="/assets/app.js?v=${APP_VERSION}"></script>`;
}

export function authPage({ title, subtitle = "", content, version = APP_VERSION }) {
  return `<!doctype html><html lang="en" data-theme="light"><head>${head(`${esc(title)} · Student IMS`)}</head><body><a class="skip-link" href="#main-content">Skip to main content</a><div class="auth-tools"><button class="control-chip" type="button" data-theme-toggle aria-label="Change color theme" title="Change color theme"><i class="fi fi-rr-computer" data-theme-icon aria-hidden="true"></i><span data-theme-label>System</span></button></div><main class="auth" id="main-content" tabindex="-1"><section class="auth-card"><div class="brand">${icon("graduation-cap")}<div><strong>Student IMS Next</strong><small>D1 edition · V${esc(version)}</small></div></div><h1>${esc(title)}</h1>${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ""}${content}<div class="footer-note">UIcons by Flaticon · Theme preference stays on this device</div></section></main></body></html>`;
}

const NAV = [
  ["dashboard.view", "/dashboard", "home", "Dashboard", "dashboard"],
  ["students.view", "/students", "users-alt", "Students", "students"],
  ["batches.view", "/batches", "layers", "Batches", "batches"],
  ["lecturers.view", "/lecturers", "chalkboard-user", "Lecturers", "lecturers"],
  ["subjects.view", "/subjects", "book-alt", "Subjects", "subjects"],
  ["groups.view", "/groups", "users-class", "Groups", "groups"],
  ["reports.view", "/reports", "chart-histogram", "Reports", "reports"],
  ["users.view", "/users", "user-gear", "Users & Permissions", "users"],
  ["activity.view", "/activity", "time-past", "Activity", "activity"],
  ["settings.view", "/settings", "settings", "Settings", "settings"]
];

export function appPage({ title, user, settings, active, url, content, actions = "" }) {
  const org = settings.organization_name || "Student Information System";
  const nav = NAV.filter(([permission]) => can(user, permission)).map(([, href, iconName, label, key]) => {
    const current = active === key;
    return `<a href="${href}" class="${current ? "active" : ""}" title="${esc(label)}" ${current ? 'aria-current="page"' : ""}>${icon(iconName)}<span>${esc(label)}</span></a>`;
  }).join("");
  const initials = user.full_name.split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toUpperCase();
  const profileCurrent = active === "profile";
  const sessionsCurrent = active === "sessions";
  const autoRefresh = AUTO_REFRESH_PATHS.has(url.pathname);
  const autoRefreshControl = autoRefresh ? `<button class="control-chip" type="button" data-auto-refresh-toggle aria-label="Toggle automatic page refresh" aria-pressed="true" title="Automatic refresh every ${AUTO_REFRESH_INTERVAL_SECONDS} seconds"><i class="fi fi-rr-refresh" data-auto-refresh-icon aria-hidden="true"></i><span data-auto-refresh-label>Auto ${AUTO_REFRESH_INTERVAL_SECONDS}s</span></button>` : "";

  return `<!doctype html><html lang="en" data-theme="light"><head>${head(`${esc(title)} · ${esc(org)}`)}</head><body data-auto-refresh="${autoRefresh ? "1" : "0"}"><a class="skip-link" href="#main-content">Skip to main content</a><div class="mobile-overlay" data-mobile-overlay aria-hidden="true"></div><div class="app"><aside class="sidebar" id="app-sidebar" aria-label="Primary navigation"><div class="side-brand">${icon("graduation-cap")}<div><strong>${esc(org)}</strong><small>Student IMS Next</small></div></div><div class="sidebar-tools"><button class="icon-btn sidebar-collapse" type="button" data-sidebar-collapse aria-label="Collapse sidebar" aria-expanded="true" title="Collapse sidebar"><i class="fi fi-rr-angle-double-small-left" data-sidebar-collapse-icon aria-hidden="true"></i></button></div><nav class="nav">${nav}<div class="sep" aria-hidden="true"></div><a href="/profile" class="${profileCurrent ? "active" : ""}" ${profileCurrent ? 'aria-current="page"' : ""} title="My Profile">${icon("user")}<span>My Profile</span></a>${can(user,"sessions.manage")?`<a href="/sessions" class="${sessionsCurrent ? "active" : ""}" ${sessionsCurrent ? 'aria-current="page"' : ""} title="Sessions">${icon("devices")}<span>Sessions</span></a>`:""}<a href="/logout" title="Sign Out">${icon("sign-out-alt")}<span>Sign Out</span></a></nav></aside><div class="main"><header class="topbar"><div class="topbar-left"><button class="icon-btn mobile-menu" type="button" data-mobile-menu aria-label="Open navigation menu" aria-controls="app-sidebar" aria-expanded="false">${icon("menu-burger")}</button><span class="top-title">${esc(title)}</span></div><div class="topbar-right"><div class="display-controls">${autoRefreshControl}<button class="control-chip" type="button" data-density-toggle title="Layout density" aria-label="Change layout density">${icon("apps")}<span data-density-label>Comfortable</span></button><button class="control-chip" type="button" data-theme-toggle title="Color theme" aria-label="Change color theme"><i class="fi fi-rr-computer" data-theme-icon aria-hidden="true"></i><span data-theme-label>System</span></button></div><div class="userchip"><div class="avatar" aria-hidden="true">${esc(initials)}</div><div><strong class="small">${esc(user.full_name)}</strong><div class="small muted">${esc(user.role.replaceAll("_", " "))}</div></div></div></div></header><main class="page" id="main-content" tabindex="-1"><div class="page-head"><div><h1>${esc(title)}</h1></div><div class="actions">${actions}</div></div>${notice(url)}${content}</main></div></div></body></html>`;
}
