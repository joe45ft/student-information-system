export const CLIENT_JS = `(() => {
  const root = document.documentElement;
  const body = document.body;
  const THEME_KEY = "student-ims-theme";
  const SIDEBAR_KEY = "student-ims-sidebar";
  const DENSITY_KEY = "student-ims-density";

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

  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if(storedTheme() === "system") setTheme("system", false);
  });

  window.addEventListener("resize", prepareScrollableTables, { passive: true });
  window.addEventListener("pageshow", resetSubmittingForms);

  document.addEventListener("click", (e) => {
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
  });

  document.querySelectorAll(".nav a").forEach(a => a.addEventListener("click", () => setMobileNav(false)));

  document.addEventListener("submit", e => {
    const form = e.target;
    if(!(form instanceof HTMLFormElement)) return;
    if(form.dataset.submitting === "1"){
      e.preventDefault();
      return;
    }
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
