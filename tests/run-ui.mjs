const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({channel:"msedge",headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on("pageerror",error=>errors.push(String(error)));
 await page.goto("http://127.0.0.1:5174/tests/regression.html");
 await page.waitForFunction(()=>window.testResult);
 const regression=await page.evaluate(()=>window.testResult);
 console.log(JSON.stringify(regression));
 if(!regression.ok) throw new Error(regression.error);
 await page.goto("http://127.0.0.1:5174");
 await page.getByTestId("add-text").click();
 await page.getByTestId("text-content").fill("产品使用说明\n请扫码查看");
 await page.getByTestId("add-qr").click();
 await page.getByRole("button",{name:/Wi-Fi/}).click();
 await page.getByTestId("qr-content").waitFor();
 const value=await page.getByTestId("qr-content").inputValue();
 if(!value.startsWith("WIFI:")) throw new Error("WiFi template failed");
 await page.evaluate(async()=>{
   const moduleUrl=performance.getEntriesByType("resource").find(entry=>new URL(entry.name).pathname==="/src/stores.ts")?.name;
   const stores=await import(moduleUrl || "/src/stores.ts");
   stores.printerMeta.set({model:"D110",id:[256],dpi:203,printDirection:"left",printheadPixels:120,
     paperTypes:[1],densityMin:1,densityMax:3,densityDefault:3});
   stores.detectedConsumable.set({barcode:"02282280",name:"测试原装耗材",width:30,height:15,paperType:1});
 });
 try { await page.getByText(/已匹配 测试原装耗材/).waitFor({timeout:3000}); }
 catch(error) { console.log(await page.locator("body").innerText()); console.log(errors); throw error; }
 const canvasSize=await page.locator("canvas.lower-canvas").evaluate(el=>({width:el.width,height:el.height}));
 if(canvasSize.width!==240 || canvasSize.height!==120) throw new Error("Automatic consumable layout failed: "+JSON.stringify(canvasSize));
 for(const width of [320,390,768,1280]) {
   await page.setViewportSize({width,height:844});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
   if(overflow) throw new Error("Horizontal overflow at "+width);
   await page.getByRole("button",{name:/预览/,exact:false}).last().click();
   await page.getByRole("dialog").waitFor();
   await page.getByRole("button",{name:"Dismiss"}).click();
   await page.getByRole("dialog").waitFor({state:"hidden"});
   await page.locator(".modal-backdrop").waitFor({state:"detached"});
 }
 console.log(JSON.stringify({ui:"PASS",widths:[320,390,768,1280],errors}));
 if(errors.length) throw new Error(errors.join("\n"));
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:"tests/mobile-verified.png",fullPage:true});
} finally {await browser.close();}
