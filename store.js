import {CONFIG} from './config.js';
let config={...CONFIG,...JSON.parse(localStorage.getItem('rg3d.connection')||'{}')};
let session=JSON.parse(localStorage.getItem('rg3d.session')||'null');
let demo=false, records=[], role=null, refreshPromise=null;
export const state=()=>({demo,records,role,session,configured:!!(config.supabaseUrl&&config.supabaseKey)});
export function configure(url,key){
 const u=new URL(url);if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co'))throw Error('Usa o URL HTTPS do projeto Supabase.');
 if(!key||key.startsWith('sb_secret_'))throw Error('Usa apenas a chave pública publishable ou anon.');
 if(key.split('.').length===3){try{if(JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='service_role')throw Error('A chave service_role não pode ser usada no navegador.');}catch(e){if(e.message.includes('service_role'))throw e;}}
 config={supabaseUrl:u.origin,supabaseKey:key};localStorage.setItem('rg3d.connection',JSON.stringify(config));logout();
}
async function request(path,{method='GET',body,token,prefer}={}){
 const r=await fetch(config.supabaseUrl+path,{method,headers:{apikey:config.supabaseKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(prefer?{Prefer:prefer}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const txt=await r.text();let data;try{data=txt?JSON.parse(txt):null;}catch{throw Error('Resposta inválida do servidor.');}
 if(!r.ok)throw Error(data?.msg||data?.message||data?.error_description||'Não foi possível contactar o servidor.');return data;
}
function setSession(s){session={...s,expires_at:Math.floor(Date.now()/1000)+s.expires_in};localStorage.setItem('rg3d.session',JSON.stringify(session));}
async function token(){
 if(!session)throw Error('Inicia sessão para continuar.');
 if(session.expires_at<Date.now()/1000+60){if(!refreshPromise)refreshPromise=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}}).then(setSession).finally(()=>refreshPromise=null);await refreshPromise;}
 return session.access_token;
}
export async function login(email,password){demo=false;setSession(await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}));try{await load();}catch(e){if(!role)logout();throw e;}}
export function logout(){if(session)localStorage.removeItem('rg3d.cache.'+session.user.id);session=null;role=null;records=[];demo=false;localStorage.removeItem('rg3d.session');}
export function startDemo(){demo=true;role='admin';records=JSON.parse(localStorage.getItem('rg3d.demo')||'[]');}
export async function load(){
 if(demo)return;
 if(!navigator.onLine){if(!session)throw Error('Sem ligação.');const cache=JSON.parse(localStorage.getItem('rg3d.cache.'+session.user.id)||'null');if(!cache)throw Error('Sem ligação e sem dados guardados neste dispositivo.');records=cache.records;role=cache.role;return;}
 const t=await token();const members=await request('/rest/v1/rg3d_members?user_id=eq.'+session.user.id+'&select=role',{token:t});role=members?.[0]?.role;
 if(!role)throw Error('Esta conta ainda não tem acesso à RG3D. Pede ao administrador para a adicionar.');
 const all=[];let offset=0;
 while(true){const page=await request('/rest/v1/rg3d_records?select=*&order=created_at.asc,id.asc&limit=500&offset='+offset,{token:t});all.push(...page);if(page.length<500)break;offset+=500;}
 records=all;cache();
}
function cache(){localStorage.setItem(demo?'rg3d.demo':'rg3d.cache.'+session.user.id,JSON.stringify(demo?records:{records,role}));}
export const list=kind=>records.filter(r=>r.kind===kind).map(r=>({...r.payload,id:r.id,_version:r.version}));
export const get=(kind,id)=>list(kind).find(r=>r.id===id);
export async function save(kind,data){
 const {id,_version,...payload}=data;
 const existing=id?records.find(r=>r.id===id):null;
 if(existing&&existing.kind!==kind)throw Error('Tipo de registo inválido.');
 if(!demo&&!navigator.onLine)throw Error('Liga-te à internet para guardar. Nenhuma alteração foi enviada.');
 const row={id:id||crypto.randomUUID(),kind,payload,version:existing?(_version??existing.version)+1:1};
 if(demo){if(existing)records=records.map(r=>r.id===row.id?row:r);else records.push(row);cache();return row.id;}
 const t=await token();let out;
 if(existing){out=await request('/rest/v1/rg3d_records?id=eq.'+row.id+'&version=eq.'+(_version??existing.version),{method:'PATCH',body:{payload,version:row.version},token:t,prefer:'return=representation'});if(!out.length){await load();throw Error('Outra pessoa alterou este registo. Fecha e volta a abrir para usar os dados atuais.');}}
 else out=await request('/rest/v1/rg3d_records',{method:'POST',body:row,token:t,prefer:'return=representation'});
 if(existing)records=records.map(r=>r.id===row.id?out[0]:r);else records.push(out[0]);cache();return row.id;
}
export async function remove(kind,id){
 if(!demo&&!navigator.onLine)throw Error('Liga-te à internet para apagar.');
 const existing=records.find(r=>r.id===id&&r.kind===kind);if(!existing)return;
 if(!demo){const out=await request('/rest/v1/rg3d_records?id=eq.'+id+'&version=eq.'+existing.version,{method:'DELETE',token:await token(),prefer:'return=representation'});if(!out.length){await load();throw Error('Registo alterado por outra pessoa. Atualiza a página.');}}
 records=records.filter(r=>r.id!==id);cache();
}
export async function members(){if(demo)return[];return request('/rest/v1/rg3d_members?select=*&order=created_at.asc',{token:await token()});}
export async function addMember(user_id,name,role){if(demo)throw Error('A equipa só está disponível com a ligação ativa.');if(!/^[0-9a-f-]{36}$/i.test(user_id))throw Error('Indica o UUID da conta criada no Supabase.');return request('/rest/v1/rg3d_members',{method:'POST',body:{user_id,name,role},token:await token()});}
export async function removeMember(user_id){if(user_id===session?.user.id)throw Error('Não podes remover a tua própria conta.');return request('/rest/v1/rg3d_members?user_id=eq.'+user_id,{method:'DELETE',token:await token()});}
export async function convertQuote(id){
 if(demo){const q=get('quotes',id);if(!q)throw Error('Orçamento inexistente.');let order=list('orders').find(o=>o.quoteId===id);if(q.status!=='Pendente'&&!order)throw Error('Este orçamento já não está pendente.');if(!order){const {id:qid,_version,status,...data}=q;const oid=await save('orders',{...data,quoteId:qid,status:'Aguarda pagamento',productionNotes:''});order=get('orders',oid);}if(q.status!=='Convertido')await save('quotes',{...q,status:'Convertido'});return order.id;}
 if(!navigator.onLine)throw Error('Liga-te à internet para converter o orçamento.');
 const idCreated=await request('/rest/v1/rpc/rg3d_convert_quote',{method:'POST',body:{quote_id:id},token:await token()});await load();return idCreated;
}

export async function ensureKobra(){
 if(role!=='admin')return;
 const existing=list('printers').find(p=>/kobra\s*x/i.test(p.name||''));
 if(existing){if(Number(existing.price)===0&&existing.notes?.startsWith('Perfil RG3D:'))await save('printers',{...existing,price:309,notes:existing.notes.replace('Preço de compra: 309 €. Ajustar ao consumo medido.','Preço de compra: 309 €. Ajustar ao consumo medido.')});return;}
 try{await save('printers',{id:'3d000000-0000-4000-8000-000000000001',name:'Anycubic Kobra X',watts:150,price:309,lifeHours:5000,maintenanceHour:0.05,notes:'Perfil RG3D: consumo médio de 150 W estimado (não é potência nominal). Vida útil de 5000 h e manutenção de 0,05 €/h são hipóteses de orçamento. Preencher preço de compra e ajustar ao consumo medido.'});}
 catch(e){await load();if(!list('printers').some(p=>/kobra\s*x/i.test(p.name||'')))throw e;}
}
