import {chromium} from '@playwright/test';
import {PDFDocument,rgb,StandardFonts} from 'pdf-lib';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);
for(const size of [[595,842],[842,595]]){const p=pdf.addPage(size);p.drawRectangle({x:0,y:0,width:size[0],height:size[1],color:rgb(.96,.96,.96)});p.drawText('FAINT EXAM 123 + 456 = ?', {x:50,y:size[1]-90,size:22,font,color:rgb(.7,.7,.7)});}
const fixture=Buffer.from(await pdf.save());
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');
await page.locator('#file').setInputFiles({name:'faint-exam.pdf',mimeType:'application/pdf',buffer:fixture});
await page.locator('#status').filter({hasText:'共 2 頁'}).waitFor();
await page.waitForFunction(()=>document.querySelector('#after').width>100);
const values=await page.evaluate(()=>{const c=document.querySelector('#after'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let black=0,nonbinary=0;for(let i=0;i<d.length;i+=4){if(d[i]===0)black++;if(d[i]!==0&&d[i]!==255)nonbinary++;}return {black,nonbinary};});
assert(values.black>100);assert.equal(values.nonbinary,0);
await page.locator('#next').click();await page.locator('#page-label').filter({hasText:'2 / 2'}).waitFor();
await page.locator('#mode').selectOption('gray');await page.locator('#mode').selectOption('bw');
const downloadEvent=page.waitForEvent('download');await page.locator('#export').click();const dl=await downloadEvent;
const output=await fs.readFile(await dl.path());const result=await PDFDocument.load(output);assert.equal(result.getPageCount(),2);assert(Math.abs(result.getPage(1).getWidth()-842)<1);
await page.screenshot({path:'test-results/desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.locator('#file').setInputFiles({name:'bad.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a PDF')});await page.locator('#status').filter({hasText:'無法讀取'}).waitFor();
assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,pages:2,blackPixels:values.black,nonBinaryPixels:values.nonbinary,downloadBytes:output.length,consoleErrors:errors}));
}finally{await browser.close();}
