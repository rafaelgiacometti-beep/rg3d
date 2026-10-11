import test from 'node:test';
import assert from 'node:assert/strict';
import {compressPhoto,validPhoto} from '../photo.js';
test('Só aceita JPEG interno limitado, rejeita URLs e conteúdo ativo',()=>{
 assert.ok(validPhoto('data:image/jpeg;base64,YWJj'));
 for(const value of [undefined,'https://example.com/x.jpg','javascript:alert(1)','data:image/svg+xml;base64,YWJj','data:image/jpeg;base64,'+'A'.repeat(180000)])assert.equal(validPhoto(value),false);
});
test('Recusa ficheiros que não são imagem e imagens acima de 20 MB',async()=>{
 await assert.rejects(compressPhoto({type:'text/plain',size:5}),/ficheiro de imagem/);
 await assert.rejects(compressPhoto({type:'image/jpeg',size:21*1024*1024}),/20 MB/);
});
test('Reduz dimensões mantendo proporção, remove transparência e liberta URL',async()=>{
 const old={Image:globalThis.Image,document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 const calls=[];let canvas;
 try{
  URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=url=>calls.push(['revoke',url]);
  globalThis.Image=class{naturalWidth=2400;naturalHeight=1200;set src(value){queueMicrotask(()=>this.onload());}};
  globalThis.document={createElement:()=>canvas={getContext:()=>({set fillStyle(v){calls.push(['background',v]);},fillRect(){},drawImage(){}}),toDataURL:(type,quality)=>{calls.push(['encode',type,quality]);return 'data:image/jpeg;base64,YWJj';}}};
  assert.equal(await compressPhoto({type:'image/png',size:2000}),'data:image/jpeg;base64,YWJj');
  assert.equal(canvas.width,640);assert.equal(canvas.height,320);assert.deepEqual(calls[0],['background','#ffffff']);assert.deepEqual(calls.at(-1),['revoke','blob:test']);
 }finally{globalThis.Image=old.Image;globalThis.document=old.document;URL.createObjectURL=old.create;URL.revokeObjectURL=old.revoke;}
});
