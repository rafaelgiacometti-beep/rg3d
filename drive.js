const API='https://www.googleapis.com/drive/v3';
const SCOPE='https://www.googleapis.com/auth/drive.readonly';
let accessToken='',expires=0,sdkPromise;
export function folderId(value){
 const text=String(value||'').trim();let id=text;
 if(text.startsWith('https://')){const u=new URL(text);if(u.hostname!=='drive.google.com')throw Error('Usa o link de uma pasta do Google Drive.');id=u.pathname.match(/\/folders\/([\w-]+)/)?.[1];}
 if(!id||!/^[-\w]{10,200}$/.test(id))throw Error('Indica o link ou o ID da pasta do Drive.');return id;
}
export function clientId(value){const id=String(value||'').trim();if(!/^[\w-]+\.apps\.googleusercontent\.com$/.test(id))throw Error('Indica o Client ID OAuth público do Google.');return id;}
export const connected=()=>!!accessToken&&Date.now()<expires;
export function disconnect(){accessToken='';expires=0;}
export function prepareGoogle(){
 if(globalThis.google?.accounts?.oauth2)return Promise.resolve();
 if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=()=>resolve();s.onerror=()=>{s.remove();sdkPromise=null;reject(Error('Não foi possível carregar a ligação Google. Verifica a internet.'));};document.head.append(s);});return sdkPromise;
}
export function authorize(id){
 clientId(id);if(!globalThis.google?.accounts?.oauth2)throw Error('A ligação Google ainda está a carregar. Tenta novamente.');
 return new Promise((resolve,reject)=>{const client=google.accounts.oauth2.initTokenClient({client_id:id,scope:SCOPE,include_granted_scopes:false,callback:r=>{if(r.error)return reject(Error(r.error_description||r.error));if(!google.accounts.oauth2.hasGrantedAllScopes(r,SCOPE))return reject(Error('É necessário autorizar a leitura para abrir a biblioteca.'));accessToken=r.access_token;expires=Date.now()+Number(r.expires_in)*1000-30000;resolve();},error_callback:()=>reject(Error('A ligação Google foi cancelada ou a janela foi bloqueada.'))});client.requestAccessToken({prompt:'select_account'});});
}
async function request(path){
 if(!connected())throw Error('Clica em Ligar Google Drive para autorizar ou renovar o acesso.');
 const r=await fetch(API+path,{headers:{Authorization:'Bearer '+accessToken},cache:'no-store'});
 if(r.status===401){disconnect();throw Error('A ligação Google expirou. Liga novamente.');}
 if(!r.ok){let message;try{message=(await r.json()).error?.message;}catch{}throw Error(message||'Não foi possível ler o Drive. Verifica o acesso à pasta.');}return r;
}
export async function fileBlob(id,maxBytes=50*1024*1024){
 if(!/^[\w-]+$/.test(id))throw Error('Ficheiro inválido.');
 const r=await request('/files/'+id+'?alt=media&supportsAllDrives=true');
 const length=Number(r.headers.get('content-length'));if(length>maxBytes){await r.body?.cancel();throw Error('Ficheiro demasiado grande para esta prévia. Abre-o no Drive.');}
 const reader=r.body?.getReader();if(!reader){const b=await r.blob();if(b.size>maxBytes)throw Error('Ficheiro demasiado grande.');return b;}
 let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)throw Error('Ficheiro demasiado grande para esta prévia. Abre-o no Drive.');chunks.push(value);}}catch(e){await reader.cancel();throw e;}return new Blob(chunks,{type:r.headers.get('content-type')||'application/octet-stream'});
}
export function modelsFromFiles(files){
 const images=new Map();for(const f of files)if(/\.(png|jpe?g|webp)$/i.test(f.name))images.set(f.folder+'\0'+f.name.replace(/\.[^.]+$/,'').toLowerCase(),f.id);
 return files.filter(f=>/\.(stl|3mf)$/i.test(f.name)).map(f=>({...f,format:f.name.split('.').pop().toUpperCase(),title:f.name.replace(/\.[^.]+$/,''),imageId:images.get(f.folder+'\0'+f.name.replace(/\.[^.]+$/,'').toLowerCase())||''}));
}
export async function listModels(root){
 root=folderId(root);const folder=await (await request('/files/'+root+'?fields=id,name,mimeType&supportsAllDrives=true')).json();
 if(folder.mimeType!=='application/vnd.google-apps.folder')throw Error('O link deve apontar para uma pasta.');
 const queue=[{id:root,category:''}],seen=new Set(),files=[];
 while(queue.length){const f=queue.shift();if(seen.has(f.id))continue;seen.add(f.id);if(seen.size>100)throw Error('A biblioteca excede 100 pastas. Seleciona uma pasta menor.');let next='';
 do{const query=new URLSearchParams({q:`'${f.id}' in parents and trashed = false`,fields:'nextPageToken,incompleteSearch,files(id,name,mimeType,size,modifiedTime)',pageSize:'1000',supportsAllDrives:'true',includeItemsFromAllDrives:'true',...(next?{pageToken:next}:{})});
 const data=await(await request('/files?'+query)).json();if(data.incompleteSearch)throw Error('A pesquisa do Drive ficou incompleta. Tenta novamente.');
 for(const item of data.files||[]){if(item.mimeType==='application/vnd.google-apps.folder')queue.push({id:item.id,category:[f.category,item.name].filter(Boolean).join(' / ')});else files.push({...item,folder:f.id,category:f.category});}
 if(files.length>5000)throw Error('A biblioteca excede 5000 ficheiros. Seleciona uma pasta menor.');next=data.nextPageToken||'';
 }while(next);
 }
 return {folderName:folder.name,models:modelsFromFiles(files)};
}
export function mergeModel(existing,model,root){return {...(existing||{grams:0,hours:0,laborMinutes:0,extras:0,packaging:0}),name:existing?.name||model.title,driveId:model.id,driveRoot:root,driveName:model.name,driveFormat:model.format,driveCategory:model.category,driveImageId:model.imageId,driveSize:Number(model.size)||0,driveModified:model.modifiedTime||'',driveMissing:false};}
