import test from 'node:test';
import assert from 'node:assert/strict';
import {initLibrary,libraryView,libraryAction,clearLibrary} from '../library.js';
import {authorize} from '../drive.js';
import {thumbnail3mf} from '../viewer.js';
test('Biblioteca sincroniza sem duplicar, preserva custos e assinala ficheiro removido',async()=>{
 const originalFetch=globalThis.fetch,originalGoogle=globalThis.google;let absent=false;const records={products:[],settings:[{id:'settings',driveFolderId:'rootfolder123',driveClientId:'123-test.apps.googleusercontent.com'}]};
 const db={state:()=>({demo:false}),list:k=>records[k]||[],load:async()=>{},save:async(k,row)=>{const all=records[k]||(records[k]=[]),i=all.findIndex(x=>x.id===row.id);if(i>=0)all[i]={...row};else all.push({...row});return row.id;}};
 initLibrary({db,settings:()=>records.settings[0],isAdmin:()=>true,btn:()=>'',photoView:()=>'<span>Sem foto</span>',toast:()=>{},render:()=>{}});
 try{
 globalThis.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true,initTokenClient:options=>({requestAccessToken:()=>options.callback({access_token:'test-token',expires_in:3600})})}}};await authorize('123-test.apps.googleusercontent.com');
 globalThis.fetch=async url=>new Response(JSON.stringify(url.includes('/files/rootfolder123?')?{name:'Modelos',mimeType:'application/vnd.google-apps.folder'}:{files:absent?[]:[{id:'file1234567',name:'Peça <especial>.stl',size:'100'}]}),{status:200});
 await libraryAction('drivesync');assert.equal(records.products.length,1);assert.match(records.products[0].id,/^[a-f0-9-]{36}$/);records.products[0].grams=42;
 await libraryAction('drivesync');assert.equal(records.products.length,1);assert.equal(records.products[0].grams,42);assert.match(libraryView(),/Peça &lt;especial&gt;/);
 absent=true;await libraryAction('drivesync');assert.equal(records.products.length,1);assert.equal(records.products[0].driveMissing,true);assert.equal(records.products[0].grams,42);
 }finally{clearLibrary();globalThis.fetch=originalFetch;globalThis.google=originalGoogle;}
});
test('3MF extrai miniatura quando existe e informa ausência quando não existe',async()=>{
 const old=globalThis.JSZip;try{await import('../vendor/jszip.min.js');const JSZip=globalThis.JSZip;
 const zip=new JSZip();zip.file('Metadata/thumbnail.png',new Uint8Array([1,2,3]));const blob=new Blob([await zip.generateAsync({type:'uint8array'})]);const thumb=await thumbnail3mf(blob);assert.equal(thumb.type,'image/png');assert.equal(thumb.size,3);
 const empty=new JSZip();empty.file('3D/3dmodel.model','<model/>');assert.equal(await thumbnail3mf(new Blob([await empty.generateAsync({type:'uint8array'})])),null);
 }finally{globalThis.JSZip=old;}
});
