(() => {
  const sidebar=document.querySelector("#sidebar");
  document.querySelector("[data-sidebar]")?.addEventListener("click",()=>sidebar?.classList.toggle("open"));
  const acc=document.querySelector("[data-account]"),menu=document.querySelector("[data-account-menu]");
  acc?.addEventListener("click",e=>{e.stopPropagation();menu?.classList.toggle("open")});
  document.querySelectorAll("[data-more]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();const m=btn.parentElement?.querySelector(".more-menu");document.querySelectorAll(".more-menu.open").forEach(x=>{if(x!==m)x.classList.remove("open")});m?.classList.toggle("open")}));
  document.addEventListener("click",()=>{menu?.classList.remove("open");document.querySelectorAll(".more-menu.open").forEach(x=>x.classList.remove("open"))});
  document.querySelectorAll("[data-pw]").forEach(btn=>btn.addEventListener("click",()=>{const input=document.getElementById(btn.dataset.pw);if(!input)return;input.type=input.type==="password"?"text":"password";const i=btn.querySelector("i");if(i)i.className=input.type==="password"?"fi fi-rr-eye":"fi fi-rr-eye-crossed"}));
  document.querySelector("[data-all]")?.addEventListener("click",()=>document.querySelectorAll('input[name="permissions"]:not(:disabled)').forEach(x=>x.checked=true));
  document.querySelector("[data-none]")?.addEventListener("click",()=>document.querySelectorAll('input[name="permissions"]:not(:disabled)').forEach(x=>x.checked=false));
  const modal=document.querySelector("[data-modal]"); let pending=null;
  document.querySelectorAll("[data-confirm]").forEach(form=>form.addEventListener("submit",e=>{if(form.dataset.confirmed==="1")return;e.preventDefault();pending=form;modal.querySelector("[data-modal-title]").textContent=form.dataset.title||"Confirm action";modal.querySelector("[data-modal-text]").textContent=form.dataset.text||"Are you sure?";modal.hidden=false}));
  modal?.querySelector("[data-cancel]")?.addEventListener("click",()=>{modal.hidden=true;pending=null});
  modal?.querySelector("[data-ok]")?.addEventListener("click",()=>{if(!pending)return;pending.dataset.confirmed="1";modal.hidden=true;pending.requestSubmit();pending=null});

  document.querySelectorAll("[data-print]").forEach(b=>b.addEventListener("click",()=>window.print()));
})();
