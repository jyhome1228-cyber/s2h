// S2H browser smoke tests against a local copy of the public site.
// No real inquiries are sent. External images/fonts are isolated from layout checks.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.S2H_TEST_BASE || "http://127.0.0.1:8000/";
const pages = ["index.html","company.html","product.html","seller.html","brand.html","contact.html","privacy.html","terms.html","admin/index.html"];
const sizes = [320,390,768,1440];
const report = [];
await mkdir("qa-results",{recursive:true});
const browser = await chromium.launch({headless:true});
try {
 for (const width of sizes) {
  const context = await browser.newContext({viewport:{width,height:900},reducedMotion:"reduce",isMobile:width<600,hasTouch:width<600,deviceScaleFactor:1});
  await context.route("**/*", async route => {
   const u = new URL(route.request().url());
   if(u.origin===new URL(base).origin) return route.continue();
   if(route.request().resourceType()==="image")return route.fulfill({status:200,contentType:"image/svg+xml",body:'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect width="480" height="480" fill="#edf6f8"/></svg>'});
   return route.abort();
  });
  for (const path of pages) {
   const page = await context.newPage(), errors=[], problems=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("response",r=>{if(r.url().startsWith(base)&&r.status()>=400)problems.push(r.status()+" "+r.url())});
   try {
    const response=await page.goto(base+path,{waitUntil:"domcontentloaded"});
    assert.equal(response?.status(),200,"page response");
    if(path!=="admin/index.html"){
     await page.locator("#entryScreen").waitFor({state:"hidden",timeout:5000});
     await page.locator(".s2h-mobile-toggle").waitFor({state:"attached"});
     if(width<=760){
      await page.locator(".s2h-mobile-toggle").click();
      assert.equal(await page.locator(".s2h-mobile-toggle").getAttribute("aria-expanded"),"true");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".s2h-mobile-toggle").getAttribute("aria-expanded"),"false");
     }
    }
    if(path==="index.html"){
     const old=await page.locator("#heroTitle").innerText();
     await page.locator("#heroNext").click();
     assert.notEqual(await page.locator("#heroTitle").innerText(),old);
     assert.equal(await page.locator("#homeProductsTrack .home-product-card").count(),32);
     await page.locator("#homeProductsNext").click();
    }
    if(path==="company.html"){
     assert.equal(await page.locator(".metric-card").count(),5);
     await page.locator(".metric-card button").nth(1).click();
     assert.equal(await page.locator(".metric-card button").nth(1).getAttribute("aria-pressed"),"true");
    }
    if(path==="product.html"){
     await page.locator(".catalog-card").first().waitFor();
     assert.equal(await page.locator(".catalog-card").count(),62);
     await page.locator("#productSearch").fill("아빠가만든");
     assert.equal(await page.locator(".catalog-card").count(),1);
     await page.locator(".catalog-card button").first().click();
     await page.locator("#productModal").waitFor({state:"visible"});
     assert.equal(await page.locator("#productRequestForm").evaluate(f=>f.checkValidity()),false);
     await page.locator("#productModalClose").click();
     await page.locator("#productModal").waitFor({state:"hidden"});
     await page.locator("#clearProductSearch").click();
     assert.equal(await page.locator(".catalog-card").count(),62);
    }
    if(["seller.html","brand.html"].includes(path)){
     await page.locator(".partner-apply-trigger").first().click();
     await page.locator("#partnerModal").waitFor({state:"visible"});
     assert.equal(await page.locator("#partnerRequestForm").evaluate(f=>f.checkValidity()),false);
     await page.locator("#partnerModalClose").click();
     await page.locator("#partnerModal").waitFor({state:"hidden"});
    }
    if(path==="contact.html"){
     await page.locator("#message").fill("테스트");
     assert.equal(await page.locator("#messageCount").innerText(),"3");
     assert.equal(await page.locator("#contactForm").evaluate(f=>f.checkValidity()),false);
    }
    if(path==="admin/index.html"){
     await page.locator('#adminNav button[data-page="products"]').click();
     await page.locator("#productsBody tr").first().waitFor();
     assert.equal(await page.locator("#productsBody tr").count(),62);
     await page.locator(".table-action").first().click();
     await page.locator("#productDetail").waitFor({state:"visible"});
     await page.locator("#closeDetail").click();
     await page.locator("#productDetail").waitFor({state:"hidden"});
    }
    const layout=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,document:document.documentElement.scrollWidth}));
    assert.ok(layout.document<=layout.viewport+2,"horizontal overflow "+JSON.stringify(layout));
    assert.deepEqual(errors,[],"uncaught JS errors");
    assert.deepEqual(problems,[],"local resource errors");
    report.push({path,width,result:"PASS"});
   }catch(error){
    report.push({path,width,result:"FAIL",message:String(error),errors,problems});
    await page.screenshot({path:"qa-results/"+path.replaceAll("/","-")+"-"+width+".png",fullPage:true}).catch(()=>{});
   }finally{await page.close()}
  }
  await context.close();
 }
}finally{await browser.close();await writeFile("qa-results/report.json",JSON.stringify(report,null,2));}
console.table(report);
assert.ok(report.every(x=>x.result==="PASS"),"browser QA failures: "+report.filter(x=>x.result==="FAIL").length);
