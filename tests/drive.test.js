import test from 'node:test';
import assert from 'node:assert/strict';
import {folderId,clientId,modelsFromFiles,mergeModel,authorize,disconnect,listModels,fileBlob} from '../drive.js';
import {stlTriangles} from '../viewer.js';
test('Valida pasta e Client ID sem aceitar outros hosts ou SQL na pesquisa',()=>{
 assert.equal(folderId('https://drive.google.com/drive/u/0/folders/abcdefghijk?usp=sharing'),'abcdefghijk');
 for(const x of ['https://evil.com/folders/abcdefghijk',"abc' or true",'https://drive.google.com/file/d/abcdefghijk/view'])assert.throws(()=>folderId(x));
 assert.equal(clientId('12345-example.apps.googleusercontent.com'),'12345-example.apps.googleusercontent.com');assert.throws(()=>clientId('secret-value'));
});
test('Liga imagem ao modelo apenas na mesma subpasta e conserva dados do negócio',()=>{
 const models=modelsFromFiles([{id:'a',name:'Peça.STL',folder:'f',category:'Chaveiros'},{id:'b',name:'peça.png',folder:'f'},{id:'c',name:'peça.jpg',folder:'other'},{id:'d',name:'Kit.3mf',folder:'f'}]);
 assert.equal(models.length,2);assert.equal(models[0].imageId,'b');assert.equal(models[1].format,'3MF');
 const p=mergeModel({id:'existing',name:'Nome comercial',hours:2,grams:30,photo:'existing-photo',_version:5},models[0],'root');
 assert.equal(p.id,'existing');assert.equal(p.name,'Nome comercial');assert.equal(p.hours,2);assert.equal(p.grams,30);assert.equal(p.photo,'existing-photo');assert.equal(p._version,5);assert.equal(p.driveMissing,false);
});
test('Lê STL binário e ASCII, rejeita ficheiros vazios ou com valores inválidos',()=>{
 const binary=new ArrayBuffer(134),v=new DataView(binary);v.setUint32(80,1,true);[0,0,0,1,0,0,0,1,0].forEach((n,i)=>v.setFloat32(96+i*4,n,true));assert.equal(stlTriangles(binary).length,1);
 assert.equal(stlTriangles(new TextEncoder().encode('solid x\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid x').buffer).length,1);
 assert.throws(()=>stlTriangles(new ArrayBuffer(0)));v.setFloat32(96,NaN,true);assert.throws(()=>stlTriangles(binary));
});
test('Drive percorre páginas e subpastas sem perder ficheiros e renova após 401',async()=>{
 const originalFetch=globalThis.fetch,originalGoogle=globalThis.google;const calls=[];
 try{
 globalThis.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true,initTokenClient:options=>({requestAccessToken:()=>options.callback({access_token:'test-token',expires_in:3600})})}}};
 await authorize('123-test.apps.googleusercontent.com');
 globalThis.fetch=async(url,options)=>{calls.push({url,options});assert.equal(options.headers.Authorization,'Bearer test-token');const u=new URL(url);let data;
 if(u.pathname.endsWith('/rootfolder123'))data={name:'RG3D',mimeType:'application/vnd.google-apps.folder'};
 else if(u.searchParams.get('q').includes('rootfolder123'))data=u.searchParams.get('pageToken')?{files:[{id:'photo123',name:'Modelo.jpg'}]}:{nextPageToken:'next',files:[{id:'model123',name:'Modelo.stl',size:'50'},{id:'subfolder123',name:'Kids',mimeType:'application/vnd.google-apps.folder'}]};
 else data={files:[{id:'model456',name:'Outro.3mf',size:'60'}]};
 return new Response(JSON.stringify(data),{status:200});};
 const result=await listModels('rootfolder123');assert.equal(result.models.length,2);assert.equal(result.models[0].imageId,'photo123');assert.equal(result.models[1].category,'Kids');assert.equal(calls.length,4);
 globalThis.fetch=async()=>new Response('',{status:401});await assert.rejects(fileBlob('model123'),/expirou/);await assert.rejects(fileBlob('model123'),/Ligar Google Drive/);
 }finally{disconnect();globalThis.fetch=originalFetch;globalThis.google=originalGoogle;}
});
