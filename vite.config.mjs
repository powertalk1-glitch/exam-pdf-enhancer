import {defineConfig} from 'vite';
import {cpSync,mkdirSync} from 'node:fs';
export default defineConfig({plugins:[{name:'pdf-resources',buildStart(){mkdirSync('public',{recursive:true});for(const name of ['cmaps','standard_fonts','wasm'])cpSync(`node_modules/pdfjs-dist/${name}`,`public/${name}`,{recursive:true});}}]});
