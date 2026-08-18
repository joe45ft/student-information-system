export const CLIENT_JS = `(() => {
  const root = document.documentElement;
  const body = document.body;
  const THEME_KEY = "student-ims-theme";
  const SIDEBAR_KEY = "student-ims-sidebar";
  const DENSITY_KEY = "student-ims-density";

  function systemDark(){ return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches; }
  function storedTheme(){ return localStorage.getItem(THEME_KEY) || "system"; }
  function resolveTheme(value){ return value === "system" ? (systemDark() ? "dark" : "light") : value; }
  function setTheme(value, persist = true){
    const allowed = ["light","dark","system"];
    if(!allowed.includes(value)) value = "system";
    root.dataset.themeMode = value;
    root.dataset.theme = resolveTheme(value);
    if(persist) localStorage.setItem(THEME_KEY, value);
    document.querySelectorAll("[data-theme-label]").forEach(el => el.textContent = value === "system" ? "System" : value[0].toUpperCase()+value.slice(1));
    document.querySelectorAll("[data-theme-icon]").forEach(el => el.className = value === "dark" ? "fi fi-rr-moon" : value === "light" ? "fi fi-rr-sun" : "fi fi-rr-computer");
  }
  function cycleTheme(){
    const current = storedTheme();
    const next = current === "system" ? "light" : current === "light" ? "dark" : "system";
    setTheme(next);
  }

  function setSidebar(collapsed, persist = true){
    body.classList.toggle("sidebar-collapsed", collapsed);
    if(persist) localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    document.querySelectorAll("[data-sidebar-collapse-icon]").forEach(el => el.className = collapsed ? "fi fi-rr-angle-double-small-right" : "fi fi-rr-angle-double-small-left");
  }

  function setDensity(compact, persist = true){
    body.classList.toggle("density-compact", compact);
    if(persist) localStorage.setItem(DENSITY_KEY, compact ? "compact" : "comfortable");
    document.querySelectorAll("[data-density-label]").forEach(el => el.textContent = compact ? "Compact" : "Comfortable");
  }

  setTheme(storedTheme(), false);
  setSidebar(localStorage.getItem(SIDEBAR_KEY) === "1", false);
  setDensity(localStorage.getItem(DENSITY_KEY) === "compact", false);

  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if(storedTheme() === "system") setTheme("system", false);
  });

  document.addEventListener("click", (e) => {
    const theme = e.target.closest("[data-theme-toggle]");
    if(theme){ cycleTheme(); return; }
    const sidebar = e.target.closest("[data-sidebar-collapse]");
    if(sidebar){ setSidebar(!body.classList.contains("sidebar-collapsed")); return; }
    const mobile = e.target.closest("[data-mobile-menu]");
    if(mobile){ body.classList.toggle("mobile-nav-open"); return; }
    const overlay = e.target.closest("[data-mobile-overlay]");
    if(overlay){ body.classList.remove("mobile-nav-open"); return; }
    const density = e.target.closest("[data-density-toggle]");
    if(density){ setDensity(!body.classList.contains("density-compact")); return; }
  });

  document.querySelectorAll(".nav a").forEach(a => a.addEventListener("click", () => body.classList.remove("mobile-nav-open")));

  document.addEventListener("keydown", e => {
    if(e.key === "Escape") body.classList.remove("mobile-nav-open");
    if(e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")){
      const search = document.querySelector('input[name="q"]');
      if(search){ e.preventDefault(); search.focus(); }
    }
  });
})();`;
