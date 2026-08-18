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

  const setupForm=document.querySelector("[data-setup-form]");
  if(setupForm){
    const setupButton=setupForm.querySelector("[data-setup-submit]");
    const setupError=setupForm.querySelector("[data-setup-error]");
    setupForm.addEventListener("submit",e=>{
      const name=setupForm.elements.full_name?.value.trim()||"";
      const email=setupForm.elements.email?.value.trim()||"";
      const password=setupForm.elements.password?.value||"";
      const confirm=setupForm.elements.confirm_password?.value||"";
      const errors=[];
      let focus=null;
      if(!name){errors.push("Enter your full name.");focus=focus||setupForm.elements.full_name}
      if(!email){errors.push("Enter your email address.");focus=focus||setupForm.elements.email}
      if(password.length<8){errors.push("Password must be at least 8 characters.");focus=focus||setupForm.elements.password}
      if(password&&!/[A-Z]/.test(password))errors.push("Add an uppercase letter to the password.");
      if(password&&!/[a-z]/.test(password))errors.push("Add a lowercase letter to the password.");
      if(password&&!/[0-9]/.test(password))errors.push("Add a number to the password.");
      if(password!==confirm){errors.push("Passwords do not match.");focus=focus||setupForm.elements.confirm_password}
      if(errors.length){
        e.preventDefault();
        if(setupError){setupError.hidden=false;setupError.textContent=errors.join(" ")}
        focus?.focus();
        return;
      }
      if(setupError){setupError.hidden=true;setupError.textContent=""}
      if(setupButton){setupButton.disabled=true;setupButton.textContent="Creating Owner..."}
    });
  }

})();
