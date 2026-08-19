import { AUTO_REFRESH_INTERVAL_SECONDS } from "./config.js";

export const CLIENT_JS = `(() => {
  const root = document.documentElement;
  const body = document.body;
  const THEME_KEY = "student-ims-theme";
  const SIDEBAR_KEY = "student-ims-sidebar";
  const DENSITY_KEY = "student-ims-density";
  const AUTO_REFRESH_KEY = "student-ims-auto-refresh";
  const AUTO_REFRESH_SECONDS = ${AUTO_REFRESH_INTERVAL_SECONDS};
  let autoRefreshRemaining = AUTO_REFRESH_SECONDS;
  let autoRefreshTimer = null;
  let formDirty = false;

  const storage = {
    get(key, fallback = "") {
      try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch { /* Preferences remain session-only. */ }
    }
  };

  function systemDark(){ return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches; }
  function storedTheme(){ return storage.get(THEME_KEY, "system"); }
  function resolveTheme(value){ return value === "system" ? (systemDark() ? "dark" : "light") : value; }

  function setTheme(value, persist = true){
    const allowed = ["light","dark","system"];
    if(!allowed.includes(value)) value = "system";
    root.dataset.themeMode = value;
    root.dataset.theme = resolveTheme(value);
    if(persist) storage.set(THEME_KEY, value);
    document.querySelectorAll("[data-theme-label]").forEach(el => {
      el.textContent = value === "system" ? "System" : value[0].toUpperCase() + value.slice(1);
    });
    document.querySelectorAll("[data-theme-icon]").forEach(el => {
      el.className = value === "dark" ? "fi fi-rr-moon" : value === "light" ? "fi fi-rr-sun" : "fi fi-rr-computer";
    });
  }

  function cycleTheme(){
    const current = storedTheme();
    const next = current === "system" ? "light" : current === "light" ? "dark" : "system";
    setTheme(next);
  }

  function setSidebar(collapsed, persist = true){
    body.classList.toggle("sidebar-collapsed", collapsed);
    if(persist) storage.set(SIDEBAR_KEY, collapsed ? "1" : "0");
    document.querySelectorAll("[data-sidebar-collapse]").forEach(el => el.setAttribute("aria-expanded", collapsed ? "false" : "true"));
    document.querySelectorAll("[data-sidebar-collapse-icon]").forEach(el => {
      el.className = collapsed ? "fi fi-rr-angle-double-small-right" : "fi fi-rr-angle-double-small-left";
    });
  }

  function setDensity(compact, persist = true){
    body.classList.toggle("density-compact", compact);
    if(persist) storage.set(DENSITY_KEY, compact ? "compact" : "comfortable");
    document.querySelectorAll("[data-density-label]").forEach(el => el.textContent = compact ? "Compact" : "Comfortable");
  }

  function setMobileNav(open){
    body.classList.toggle("mobile-nav-open", open);
    document.querySelectorAll("[data-mobile-menu]").forEach(el => el.setAttribute("aria-expanded", open ? "true" : "false"));
    if(open) document.querySelector(".sidebar .nav a")?.focus();
  }

  function autoRefreshAvailable(){
    return body.dataset.autoRefresh === "1" && !!document.querySelector("[data-auto-refresh-toggle]");
  }

  function autoRefreshEnabled(){
    return storage.get(AUTO_REFRESH_KEY, "1") !== "0";
  }

  function autoRefreshPaused(){
    const active = document.activeElement;
    const editing = active && /INPUT|TEXTAREA|SELECT/.test(active.tagName || "");
    return document.hidden || formDirty || editing || body.classList.contains("mobile-nav-open") || !!document.querySelector("form[data-submitting='1']");
  }

  function updateAutoRefreshUI(){
    const enabled = autoRefreshEnabled();
    document.querySelectorAll("[data-auto-refresh-toggle]").forEach(el => {
      el.setAttribute("aria-pressed", enabled ? "true" : "false");
      el.title = enabled ? "Automatic refresh is on · " + autoRefreshRemaining + "s remaining" : "Automatic refresh is off";
    });
    document.querySelectorAll("[data-auto-refresh-label]").forEach(el => {
      el.textContent = enabled ? "Auto " + autoRefreshRemaining + "s" : "Auto Off";
    });
    document.querySelectorAll("[data-auto-refresh-icon]").forEach(el => {
      el.className = enabled ? "fi fi-rr-refresh" : "fi fi-rr-pause";
    });
  }

  function resetAutoRefreshCountdown(){
    autoRefreshRemaining = AUTO_REFRESH_SECONDS;
    updateAutoRefreshUI();
  }

  function setAutoRefresh(enabled){
    storage.set(AUTO_REFRESH_KEY, enabled ? "1" : "0");
    resetAutoRefreshCountdown();
  }

  function startAutoRefresh(){
    if(!autoRefreshAvailable()) return;
    resetAutoRefreshCountdown();
    autoRefreshTimer = window.setInterval(() => {
      if(!autoRefreshEnabled()){
        updateAutoRefreshUI();
        return;
      }
      if(autoRefreshPaused()){
        resetAutoRefreshCountdown();
        return;
      }
      autoRefreshRemaining -= 1;
      updateAutoRefreshUI();
      if(autoRefreshRemaining <= 0){
        window.clearInterval(autoRefreshTimer);
        window.location.reload();
      }
    }, 1000);
  }


  function filterOfferingGroups(){
    const batch = document.querySelector("[data-offering-batch]");
    const group = document.querySelector("[data-offering-group]");
    if(!batch || !group) return;
    const batchId = batch.value || "";
    [...group.options].forEach(option => {
      if(!option.value){ option.hidden = false; return; }
      const optionBatch = option.dataset.batchId || "";
      option.hidden = !!batchId && !!optionBatch && optionBatch !== batchId;
    });
    const selected = group.selectedOptions?.[0];
    if(selected?.hidden) group.value = "";
  }

  function prepareScrollableTables(){
    document.querySelectorAll(".table-wrap").forEach(el => {
      if(el.scrollWidth > el.clientWidth){
        el.tabIndex = 0;
        if(!el.getAttribute("aria-label")) el.setAttribute("aria-label", "Scrollable data table");
      }
    });
  }

  function resetSubmittingForms(){
    document.querySelectorAll("form[data-submitting='1']").forEach(form => {
      form.dataset.submitting = "0";
      form.removeAttribute("aria-busy");
      form.querySelectorAll("[data-was-disabled]").forEach(control => {
        control.disabled = false;
        control.removeAttribute("data-was-disabled");
        if(control.dataset.originalText) {
          control.textContent = control.dataset.originalText;
          delete control.dataset.originalText;
        }
      });
    });
  }

  setTheme(storedTheme(), false);
  setSidebar(storage.get(SIDEBAR_KEY) === "1", false);
  setDensity(storage.get(DENSITY_KEY) === "compact", false);
  setMobileNav(false);
  prepareScrollableTables();
  filterOfferingGroups();
  startAutoRefresh();

  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if(storedTheme() === "system") setTheme("system", false);
  });

  window.addEventListener("resize", prepareScrollableTables, { passive: true });
  window.addEventListener("pageshow", () => { resetSubmittingForms(); resetAutoRefreshCountdown(); });
  document.addEventListener("visibilitychange", () => { if(!document.hidden) resetAutoRefreshCountdown(); });

  document.addEventListener("click", (e) => {
    const autoRefresh = e.target.closest("[data-auto-refresh-toggle]");
    if(autoRefresh){ setAutoRefresh(!autoRefreshEnabled()); return; }
    const theme = e.target.closest("[data-theme-toggle]");
    if(theme){ cycleTheme(); return; }
    const sidebar = e.target.closest("[data-sidebar-collapse]");
    if(sidebar){ setSidebar(!body.classList.contains("sidebar-collapsed")); return; }
    const mobile = e.target.closest("[data-mobile-menu]");
    if(mobile){ setMobileNav(!body.classList.contains("mobile-nav-open")); return; }
    const overlay = e.target.closest("[data-mobile-overlay]");
    if(overlay){ setMobileNav(false); return; }
    const density = e.target.closest("[data-density-toggle]");
    if(density){ setDensity(!body.classList.contains("density-compact")); return; }
    const permissionAction = e.target.closest("[data-permission-action]");
    if(permissionAction){
      const group = permissionAction.dataset.permissionGroup || "";
      const checked = permissionAction.dataset.permissionAction === "all";
      document.querySelectorAll("[data-permission-group-name]").forEach(input => {
        if(input.dataset.permissionGroupName === group && !input.disabled) input.checked = checked;
      });
      formDirty = true;
      resetAutoRefreshCountdown();
      return;
    }
    const resetDefaults = e.target.closest("[data-reset-role-defaults]");
    if(resetDefaults){
      const form = resetDefaults.closest("form[data-user-form]");
      const role = form?.querySelector("[data-user-role]")?.value || "VIEWER";
      let defaults = {};
      try { defaults = JSON.parse(form?.dataset.roleDefaults || "{}"); } catch { defaults = {}; }
      const enabled = new Set(defaults[role] || []);
      form?.querySelectorAll("[data-permission]").forEach(input => { if(!input.disabled) input.checked = enabled.has(input.value); });
      formDirty = true;
      resetAutoRefreshCountdown();
      return;
    }
  });

  document.querySelectorAll(".nav a").forEach(a => a.addEventListener("click", () => setMobileNav(false)));

  const markFormDirty = e => {
    if(e.target?.closest?.("form")){
      formDirty = true;
      resetAutoRefreshCountdown();
    }
  };
  document.addEventListener("input", markFormDirty);
  document.addEventListener("change", e => {
    markFormDirty(e);
    const batchSelect = e.target?.closest?.("[data-offering-batch]");
    if(batchSelect) filterOfferingGroups();
    const roleSelect = e.target?.closest?.("[data-user-role]");
    if(!roleSelect) return;
    const form = roleSelect.closest("form[data-user-form]");
    let defaults = {};
    try { defaults = JSON.parse(form?.dataset.roleDefaults || "{}"); } catch { defaults = {}; }
    const enabled = new Set(defaults[roleSelect.value] || []);
    form?.querySelectorAll("[data-permission]").forEach(input => { if(!input.disabled) input.checked = enabled.has(input.value); });
  });

  document.addEventListener("submit", e => {
    const form = e.target;
    if(!(form instanceof HTMLFormElement)) return;
    let confirmation = form.dataset.confirm || "";
    if(!confirmation && form.matches("[data-user-form]")){
      const role = form.querySelector('[name="role"]')?.value || "";
      const status = form.querySelector('[name="status"]')?.value || "";
      const roleChanged = role && role !== (form.dataset.originalRole || role);
      const statusChanged = status && status !== (form.dataset.originalStatus || status);
      if(roleChanged || statusChanged){
        const changes = [roleChanged ? "role" : "", statusChanged ? "status" : ""].filter(Boolean).join(" and ");
        confirmation = "Confirm this user's " + changes + " change? This may immediately change access.";
      }
    }
    if(confirmation && !window.confirm(confirmation)){ e.preventDefault(); return; }
    if(form.dataset.submitting === "1"){
      e.preventDefault();
      return;
    }
    formDirty = false;
    form.dataset.submitting = "1";
    form.setAttribute("aria-busy", "true");
    form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(control => {
      if(control.disabled) return;
      control.dataset.wasDisabled = "1";
      if(control.tagName === "BUTTON"){
        control.dataset.originalText = control.textContent;
        control.textContent = "Working…";
      }
      control.disabled = true;
    });
  });

  document.addEventListener("keydown", e => {
    if(e.key === "Escape") setMobileNav(false);
    if(e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")){
      const search = document.querySelector('input[name="q"]');
      if(search){ e.preventDefault(); search.focus(); }
    }
  });
})();`;
