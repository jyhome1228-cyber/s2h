/* S2H site motion and accessible mobile navigation */
(()=>{"use strict";
 const root=document.documentElement,top=document.querySelector(".top"),nav=top?.querySelector(".desktop-nav"),mobile=matchMedia("(max-width:760px)"),reduced=matchMedia("(prefers-reduced-motion:reduce)");
 if(top&&nav){
  nav.id="s2h-primary-nav";
  const toggle=document.createElement("button");toggle.type="button";toggle.className="s2h-mobile-toggle";toggle.setAttribute("aria-controls",nav.id);toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-label","메뉴 열기");
  const menuIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const closeIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  function setMenu(open){open=mobile.matches&&open;top.classList.toggle("s2h-menu-open",open);toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"메뉴 닫기":"메뉴 열기");toggle.innerHTML=open?closeIcon:menuIcon;nav.inert=mobile.matches&&!open;}
  top.querySelector(".top-inner").insertBefore(toggle,nav);root.classList.add("s2h-nav-ready");setMenu(false);
  toggle.addEventListener("click",()=>setMenu(!top.classList.contains("s2h-menu-open")));
  nav.addEventListener("click",e=>{if(e.target.closest("a"))setMenu(false)});
  top.addEventListener("focusout",e=>{if(e.relatedTarget&&!top.contains(e.relatedTarget))setMenu(false)});
  window.addEventListener("pageshow",()=>setMenu(false));
  document.addEventListener("pointerdown",e=>{if(!top.contains(e.target))setMenu(false)});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&top.classList.contains("s2h-menu-open")){setMenu(false);toggle.focus()}});
  mobile.addEventListener?.("change",()=>setMenu(false));
 }
 const entry=document.getElementById("entryScreen");
 if(entry){setTimeout(()=>{if(entry.isConnected&&!entry.classList.contains("is-hidden")){entry.classList.add("is-hidden");entry.setAttribute("aria-hidden","true");setTimeout(()=>entry.remove(),350)}},900)}
 // Only animate when entering the viewport. Content remains visible if JS fails.
 if(!reduced.matches&&"IntersectionObserver" in window){
  const selectors=".intro-layout>div,.company-intro-grid>div,.business-head,.business-card,.home-products-heading,.home-partnership-copy,.home-partnership-links,.performance-header,.metric-card,.service-heading,.service-card,.product-heading-line,.seller-section-heading,.brand-section-heading,.partner-feature,.partner-step,.brand-preparation-inner,.partner-apply,.contact-info,.contact-form,.info-table";
  const items=[...document.querySelectorAll(selectors)].filter(el=>el.getBoundingClientRect().top>innerHeight+12);
  const observer=new IntersectionObserver(entries=>{for(const item of entries){if(!item.isIntersecting)continue;observer.unobserve(item.target);if(reduced.matches||document.hidden||item.target.contains(document.activeElement))continue;const index=Array.from(item.target.parentElement.children).indexOf(item.target);item.target.style.setProperty("--s2h-delay",Math.min(index,3)*(mobile.matches?25:45)+"ms");item.target.classList.add("s2h-entering");item.target.addEventListener("animationend",()=>item.target.classList.remove("s2h-entering"),{once:true});}},{threshold:.04});
  items.forEach(el=>observer.observe(el));
  reduced.addEventListener?.("change",()=>{if(reduced.matches){observer.disconnect();items.forEach(el=>el.classList.remove("s2h-entering"))}});
 }
 window.S2HMotion=Object.freeze({
  closeDialog(modal,finish){if(!modal||modal.hidden||modal.classList.contains("s2h-closing"))return;if(reduced.matches||document.hidden){finish();return}modal.classList.add("s2h-closing");const dialog=modal.querySelector('[role="dialog"]');let done=false;function complete(){if(done)return;done=true;modal.classList.remove("s2h-closing");finish()}if(dialog)dialog.addEventListener("animationend",complete,{once:true});setTimeout(complete,220);}
 });
 const title=document.getElementById("heroTitle");
 if(title&&"MutationObserver" in window){let animation;new MutationObserver(()=>{if(reduced.matches||document.hidden||!title.animate)return;animation?.cancel();animation=title.animate([{opacity:.35,transform:"translateY(6px)"},{opacity:1,transform:"translateY(0)"}],{duration:340,easing:"cubic-bezier(.22,.7,.2,1)"});}).observe(title,{childList:true,subtree:true});reduced.addEventListener?.("change",()=>{if(reduced.matches)animation?.cancel()})}
})();