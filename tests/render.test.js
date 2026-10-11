import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../core.js';
import {validPhoto} from '../photo.js';

function renderer(records={}) {
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const definitions=source.replace(/^import .*;\n/gm,'').split("document.addEventListener('click'")[0];
 const context=vm.createContext({...core,validPhoto,document:{querySelector:()=>({})},db:{list:kind=>records[kind]||[],get:(kind,id)=>(records[kind]||[]).find(r=>r.id===id),state:()=>({role:'admin'})}});
 vm.runInContext(definitions+'\nglobalThis.renderQuote=calculator;',context);
 return context.renderQuote;
}
test('Novo orçamento mostra formulário completo sem definições guardadas',()=>{
 const html=renderer()();
 assert.match(html,/id="quoteform"/);
 assert.match(html,/name="validity" value="15"/);
 assert.match(html,/Guardar orçamento/);
 assert.match(html,/id="calcresult"/);
});
test('Kobra X fica selecionada com custos cadastrados, sem alterar orçamento existente',()=>{
 const render=renderer({printers:[{id:'other',name:'Outra',watts:100,price:100,lifeHours:1000,maintenanceHour:0},{id:'kobra',name:'Anycubic Kobra X',watts:180,price:300,lifeHours:5000,maintenanceHour:.05}]});
 const fresh=render();
 assert.match(fresh,/<option value="kobra" selected>/);
 assert.match(fresh,/name="watts" value="180"/);
 assert.match(fresh,/name="machineHour" value="0.11"/);
 const existing=render({printerId:'other',watts:100,machineHour:.3});
 assert.match(existing,/<option value="other" selected>/);
 assert.match(existing,/name="machineHour" value="0.3"/);
});
test('Prazo da empresa é usado no novo orçamento e prazo próprio é preservado ao editar',()=>{
 const render=renderer({settings:[{validity:30}],clients:[{id:'c1',name:'Cliente <teste>'}]});
 assert.match(render(),/name="validity" value="30"/);
 assert.match(render({validity:7}),/name="validity" value="7"/);
 assert.match(render(),/Cliente &lt;teste&gt;/);
});

test('Foto do produto aparece no orçamento e URLs externos não são aceites',()=>{
 const photo='data:image/jpeg;base64,YWJj';
 assert.match(renderer({products:[{id:'p1',name:'Peça <teste>',photo}]})({productId:'p1'}),/src="data:image\/jpeg;base64,YWJj"/);
 assert.match(renderer({products:[{id:'p1',name:'Peça',photo:'javascript:alert(1)'}]})({productId:'p1'}),/Sem foto/);
});
