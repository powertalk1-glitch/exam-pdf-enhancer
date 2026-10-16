import './style.css';
import * as pdfjs from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {PDFDocument} from 'pdf-lib';
import {enhance} from './enhance.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=worker;
const $=id=>document.getElementById(id);
let doc=null,pageNumber=1,filename='',busy=false,cancelled=false,revision=0,loadRevision=0;
const settings=()=>({mode:$('mode').value,threshold:+$('threshold').value,strength:+$('strength').value,background:+$('background').value,thicken:$('thicken').checked?1:0});
function controls(){
 $('export').disabled=!doc||busy;$('prev').disabled=!doc||busy||pageNumber<=1;$('next').disabled=!doc||busy||pageNumber>=doc.numPages;
 for(const el of document.querySelectorAll('aside input,aside select,#file'))el.disabled=busy;
 $('cancel').hidden=!busy;$('progress').hidden=!busy;
 $('threshold').disabled=busy||$('mode').value!=='bw';$('strength').disabled=busy||$('mode').value!=='gray';
}
async function renderPage(pdf,n,dpi){
 const page=await pdf.getPage(n),viewport=page.getViewport({scale:dpi/72});
 if(viewport.width*viewport.height>40000000)throw Error('頁面尺寸過大，請降低輸出解析度。');
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'white'}).promise;
 const size=page.getViewport({scale:1});page.cleanup();return {canvas,width:size.width,height:size.height};
}
function apply(canvas,s){const ctx=canvas.getContext('2d',{willReadFrequently:true}),image=ctx.getImageData(0,0,canvas.width,canvas.height);image.data.set(enhance(image.data,canvas.width,canvas.height,s));ctx.putImageData(image,0,0);}
async function preview(){
 if(!doc)return;const rev=++revision,pdf=doc,n=pageNumber;controls();$('status').textContent='正在產生預覽…';
 try{const {canvas}=await renderPage(pdf,n,120);if(rev!==revision)return;
 for(const id of ['before','after']){const target=$(id);target.width=canvas.width;target.height=canvas.height;target.getContext('2d').drawImage(canvas,0,0);}
 apply($('after'),settings());document.body.classList.add('loaded');$('page-label').textContent=`${n} / ${pdf.numPages}`;$('status').textContent=`${filename} · 共 ${pdf.numPages} 頁 · 設定套用至全部頁面`;
 }catch(e){if(rev===revision)$('status').textContent=`預覽失敗：${e.message}`;}
}
async function open(file){
 if(!file||busy)return;const load=++loadRevision;++revision;const old=doc;doc=null;controls();document.body.classList.remove('loaded');$('page-label').textContent='尚未選擇';$('status').textContent='正在讀取 PDF…';
 try{if(file.size>100*1024*1024)throw Error('檔案超過 100 MB，請先拆分 PDF。');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,cMapUrl:new URL('cmaps/',document.baseURI).href,cMapPacked:true,standardFontDataUrl:new URL('standard_fonts/',document.baseURI).href,wasmUrl:new URL('wasm/',document.baseURI).href});
 task.onPassword=()=>{task.destroy();if(load===loadRevision)$('status').textContent='無法讀取：請先使用 PDF 閱讀器移除密碼保護。';};
 const next=await task.promise;if(load!==loadRevision){await next.destroy();return;}doc=next;filename=file.name;pageNumber=1;await preview();
 }catch(e){if(load===loadRevision)$('status').textContent=`無法讀取 PDF：${e.message||'檔案可能損壞或有密碼。'}`;}
 finally{if(old)await old.destroy();controls();$('file').value='';}
}
$('file').addEventListener('change',e=>open(e.target.files[0]));
for(const type of ['dragover','dragleave','drop'])$('drop').addEventListener(type,e=>{e.preventDefault();$('drop').classList.toggle('drag',type==='dragover');if(type==='drop')open(e.dataTransfer.files[0]);});
$('prev').onclick=()=>{pageNumber--;preview();};$('next').onclick=()=>{pageNumber++;preview();};
for(const id of ['mode','threshold','strength','background','thicken'])$(id).addEventListener('input',()=>{for(const key of ['threshold','strength','background'])$(key+'-value').value=$(key).value;controls();if(doc&&$('before').width){const c=$('after');c.getContext('2d').drawImage($('before'),0,0);apply(c,settings());}});
$('preset').onchange=()=>{const preset=$('preset').value;$('mode').value=preset==='photo'?'gray':'bw';$('threshold').value=preset==='faint'?230:205;$('strength').value=preset==='photo'?35:50;$('background').value=15;$('thicken').checked=false;$('mode').dispatchEvent(new Event('input'));};
$('cancel').onclick=()=>{cancelled=true;$('cancel').disabled=true;};
$('export').onclick=async()=>{
 if(!doc||busy)return;busy=true;cancelled=false;$('cancel').disabled=false;controls();const s=settings(),dpi=+$('dpi').value,pdf=doc;let url;
 try{const output=await PDFDocument.create();output.setTitle(filename.replace(/\.pdf$/i,'')+' - 黑白增強');
 for(let n=1;n<=pdf.numPages;n++){
 if(cancelled)throw Error('已取消匯出');$('status').textContent=`正在處理第 ${n} / ${pdf.numPages} 頁…`;$('progress').value=(n-1)/pdf.numPages;
 await new Promise(r=>setTimeout(r,0));const {canvas,width,height}=await renderPage(pdf,n,dpi);apply(canvas,s);
 const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw Error('影像產生失敗，請降低解析度。');
 const image=await output.embedPng(await blob.arrayBuffer());output.addPage([width,height]).drawImage(image,{x:0,y:0,width,height});canvas.width=canvas.height=1;
 }
 if(cancelled)throw Error('已取消匯出');const bytes=await output.save();url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
 const a=document.createElement('a');a.href=url;a.download=filename.replace(/\.pdf$/i,'')+'-清晰列印.pdf';a.click();$('progress').value=1;$('status').textContent=`已完成 ${pdf.numPages} 頁，增強 PDF 已下載。`;
 }catch(e){$('status').textContent=`${e.message}（可降低 DPI 或拆分檔案後重試）`;}
 finally{busy=false;controls();if(url)setTimeout(()=>URL.revokeObjectURL(url),60000);}
};controls();
