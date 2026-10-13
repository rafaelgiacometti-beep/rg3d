import * as drive from './drive.js';
import {stlTriangles,showMesh,thumbnail3mf} from './viewer.js';
import {compressPhoto} from './photo.js';
import {esc} from './core.js';
let api,activeMesh=null,previewBlob=null,previewId='',previewURL='',generation=0;
export function initLibrary(callbacks){api=callbacks;}
export function clearLibrary(){drive.disconnect();generation++;closePreview();}
export function closePreview(){activeMesh=null;previewBlob=null;previewId='';if(previewURL)URL.revokeObjectURL(previewURL);previewURL='';}
const records=()=>api.db.list('products').filter(p=>p.driveId);
export function libraryView(search=''){
 const s=api.settings(),all=records(),items=all.filter(p=>[p.name,p.driveName,p.driveCategory].join(' ').toLowerCase().includes(search.toLowerCase()));
 if(s.driveClientId)drive.prepareGoogle().catch(()=>{});
 return `<section class="panel"><div class="libraryhead"><div><h2>Biblioteca de modelos</h2><p>Ficheiros no teu Google Drive, ligados aos produtos da RG3D.</p></div><div class="actions">${api.isAdmin()?api.btn('Configurar pasta','driveconfig'):''}${api.btn(drive.connected()?'Trocar conta Google':'Ligar Google Drive','driveconnect')}${api.btn('Sincronizar biblioteca','drivesync','','primary')}${drive.connected()?api.btn('Desligar Google','drivedisconnect'):''}</div></div><p class="help">${s.driveFolderName?'Pasta: '+esc(s.driveFolderName):'Configura uma pasta privada com os teus STL e 3MF.'}${s.driveSyncedAt?' · Última sincronização: '+esc(new Date(s.driveSyncedAt).toLocaleString('pt-PT')):''}</p><p class="help">Para a imagem do produto, coloca uma foto JPG/PNG/WebP com o mesmo nome do modelo na mesma pasta. Subpastas tornam-se categorias. Os ficheiros originais ficam no Drive.</p></section><div class="filter"><input id="search" value="${esc(search)}" placeholder="Pesquisar nome ou categoria…" aria-label="Pesquisar modelos"></div><div class="modelgrid">${items.map(p=>`<article class="modelcard"><div class="modelcover">${api.photoView(p,true)}</div><div class="modelbody"><span class="badge">${esc(p.driveFormat)}</span><h3>${esc(p.name)}</h3><p>${esc(p.driveCategory||'Sem categoria')}</p>${p.driveMissing?'<p class="inlineerror">Não encontrado na última sincronização. O produto foi preservado.</p>':''}<div class="actions">${api.btn('Ver produto','drivepreview',p.id)}${api.btn('Abrir no Drive','driveopen',p.id)}${api.btn('Orçamentar','productquote',p.id,'primary')}</div><p class="help">${p.grams||0} g · ${p.hours||0} h por unidade${!p.grams&&!p.hours?' · Preenche os custos em Produtos.':''}</p></div></article>`).join('')||'<div class="empty">Ainda não há modelos. Configura a pasta, liga o Google Drive e sincroniza.</div>'}</div>`;
}
function configure(){const s=api.settings();api.open('Biblioteca · Google Drive',`<p>A pasta pode continuar privada. Cada utilizador liga a própria conta Google e precisa de acesso à pasta. A autorização Google permite leitura do Drive; o RG3D consulta a pasta escolhida e as suas subpastas, sem alterar os ficheiros.</p><form data-form="drivesettings"><div class="formgrid">${api.field('Link da pasta do Google Drive','driveFolderId',s.driveFolderId||'','text','required')}${api.field('Client ID OAuth público do Google','driveClientId',s.driveClientId||'','text','required placeholder="…apps.googleusercontent.com"')}</div><p class="help">O administrador configura uma vez para toda a equipa. Não coloques palavras-passe nem Client Secret.</p><p><a href="https://github.com/rafaelgiacometti-beep/rg3d/blob/main/GOOGLE-DRIVE.md" target="_blank" rel="noopener">Ver guia de configuração Google</a></p><div class="modalfoot"><button class="primary">Guardar configuração</button></div></form>`);}
export async function saveDriveSettings(x){
 if(!api.isAdmin())throw Error('Apenas o administrador pode configurar a pasta.');const driveFolderId=drive.folderId(x.driveFolderId),driveClientId=drive.clientId(x.driveClientId),previous=api.settings();await api.db.save('settings',{...api.db.list('settings')[0],driveFolderId,driveClientId,...(previous.driveFolderId!==driveFolderId?{driveSyncedAt:'',driveFolderName:''}:{})});clearLibrary();api.close();api.render();drive.prepareGoogle().catch(e=>api.toast(e.message));api.toast('Pasta configurada. Clica em Ligar Google Drive.');
}
async function sync(){
 if(api.db.state().demo)throw Error('Inicia sessão na empresa para sincronizar a biblioteca.');if(!api.isAdmin())throw Error('A sincronização é feita pelo administrador. Podes consultar os modelos e ligar a tua conta para os abrir.');
 const s=api.settings();if(!s.driveFolderId||!s.driveClientId)throw Error('Configura primeiro a pasta e o Client ID Google.');
 api.toast('A ler a pasta e as subpastas…');const {models,folderName}=await drive.listModels(s.driveFolderId);await api.db.load();const existing=api.db.list('products'),seen=new Set();let count=0,photoFailures=0;
 for(const model of models){seen.add(model.id);const p=existing.find(x=>x.driveId===model.id),row=drive.mergeModel(p,model,s.driveFolderId);
 if(model.imageId&&!row.photo){try{const blob=await drive.fileBlob(model.imageId,20*1024*1024);row.photo=await compressPhoto(blob);}catch{photoFailures++;}}
 if(!p){const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rg3d-drive:'+model.id)));const hex=Array.from(hash.slice(0,16),x=>x.toString(16).padStart(2,'0')).join('');row.id=hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20);}
 await api.db.save('products',row);count++;
 }
 for(const p of existing.filter(p=>p.driveRoot===s.driveFolderId&&!seen.has(p.driveId)&&p.driveId&&!p.driveMissing))await api.db.save('products',{...p,driveMissing:true});
 await api.db.save('settings',{...api.db.list('settings')[0],driveFolderName:folderName,driveSyncedAt:new Date().toISOString()});api.render();api.toast(`${count} modelos sincronizados.${photoFailures?' Algumas fotos não puderam ser lidas. Usa Editar produto para adicionar uma foto.':''}`);
}
async function preview(id){
 const p=api.db.get('products',id);if(!p?.driveId)return;closePreview();previewId=id;const current=++generation;
 api.open(esc(p.name),`<div id="modelpreview">${api.photoView(p,true)}<p role="status">A carregar prévia…</p></div><p class="help">STL: arrasta para girar e usa +/− para aproximar. Em modelos grandes, a prévia simplifica a malha. 3MF: mostra a miniatura incluída pelo fatiador, quando disponível.</p><div class="actions">${api.btn('−','meshout')}${api.btn('+','meshin')}${api.btn('Repor vista','meshreset')}${api.btn('Guardar prévia como foto','savepreview',id)}${api.btn('Abrir no Drive','driveopen',id)}${api.btn('Criar orçamento','productquote',id,'primary')}</div>`);
 const target=()=>document.querySelector('#modelpreview');
 try{if(p.driveSize>50*1024*1024)throw Error('O ficheiro excede 50 MB. Abre-o no Drive ou no fatiador.');const blob=await drive.fileBlob(p.driveId);if(generation!==current||previewId!==id||!target())return;
 if(p.driveFormat==='STL'){const triangles=stlTriangles(await blob.arrayBuffer());if(generation!==current||!target())return;target().innerHTML='<canvas class="meshcanvas" width="700" height="520" aria-label="Prévia do modelo STL; arrasta para girar"></canvas>';activeMesh=showMesh(target().querySelector('canvas'),triangles);}
 else{const thumb=await thumbnail3mf(blob);if(generation!==current||!target())return;if(!thumb)throw Error('Este 3MF não inclui miniatura. Adiciona uma foto ao produto ou uma imagem com o mesmo nome na pasta.');previewBlob=thumb;previewURL=URL.createObjectURL(thumb);target().innerHTML=`<img class="modelpreviewimage" src="${previewURL}" alt="Prévia do produto">`;}
 }catch(e){if(generation===current&&target())target().innerHTML=api.photoView(p,true)+`<p class="inlineerror">${esc(e.message)}</p>`;}
}
export async function libraryAction(action,id){
 if(!action.startsWith('drive')&&!['meshin','meshout','meshreset','savepreview'].includes(action))return false;
 if(action==='driveconfig')configure();
 if(action==='driveconnect'){const s=api.settings();if(!s.driveClientId)throw Error('O administrador precisa de configurar o Client ID Google.');await drive.authorize(s.driveClientId);api.render();api.toast('Google ligado. Podes sincronizar ou abrir os modelos.');}
 if(action==='drivedisconnect'){clearLibrary();api.render();}
 if(action==='drivesync')await sync();
 if(action==='drivepreview')await preview(id);
 if(action==='driveopen'){const p=api.db.get('products',id);if(p?.driveId)window.open('https://drive.google.com/file/d/'+encodeURIComponent(p.driveId)+'/view','_blank','noopener');}
 if(action==='meshin')activeMesh?.zoom(1.2);if(action==='meshout')activeMesh?.zoom(1/1.2);if(action==='meshreset')activeMesh?.reset();
 if(action==='savepreview'){const p=api.db.get('products',id);if(previewId!==id||!p)throw Error('Abre novamente o produto.');let blob=previewBlob;if(activeMesh){blob=await new Promise(resolve=>document.querySelector('.meshcanvas').toBlob(resolve,'image/jpeg',.8));}if(!blob)throw Error('Não há uma prévia disponível para guardar.');const photo=await compressPhoto(blob);await api.db.save('products',{...p,photo});api.toast('Prévia guardada como foto do produto.');}
 return true;
}
