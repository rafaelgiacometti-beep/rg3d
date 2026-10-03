import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,balanceFor,paidFor,csv} from '../core.js';
const sample={quantity:10,grams:100,kgPrice:20,hours:2,watts:200,kwhPrice:0.25,machineHour:0.5,laborMinutes:30,laborHour:10,extras:1,packaging:0.5,waste:10,margin:30,discount:0,vat:23};
test('Custo, margem, quantidade e IVA de uma encomenda realista',()=>{const r=calculate(sample);assert.equal(r.material,2.2);assert.equal(r.energy,.1);assert.equal(r.machine,1);assert.equal(r.labor,5);assert.equal(r.cost,9.8);assert.equal(r.unit,14);assert.equal(r.subtotal,140);assert.equal(r.tax,32.2);assert.equal(r.total,172.2);assert.equal(r.totalCost,98);assert.equal(r.profit,42);assert.equal(r.hours,20);});
test('Desconto reduz margem, não reduz custo',()=>{const r=calculate({...sample,discount:50});assert.equal(r.totalCost,98);assert.equal(r.subtotal,70);assert.equal(r.profit,-28);});
test('Pagamentos parciais e saldo',()=>{const o={id:'a',result:{total:100}};const ps=[{orderId:'a',amount:30},{orderId:'a',amount:20},{orderId:'b',amount:90}];assert.equal(paidFor(o,ps),50);assert.equal(balanceFor(o,ps),50);});
test('Rejeita quantidade fracionária, margem de 100% e valores inválidos',()=>{for(const delta of [{quantity:0},{quantity:1.5},{margin:100},{grams:-1},{vat:101},{hours:NaN}])assert.throws(()=>calculate({...sample,...delta}));});
test('CSV mantém aspas, ponto e vírgula e evita fórmulas',()=>{const s=csv([['=1+1','Peça; "A"']]);assert.ok(s.includes("'=1+1"));assert.ok(s.includes('Peça; ""A""'));});
