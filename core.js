export const defaults={company:'RG3D',slogan:'Sua ideia ganha forma.',email:'',phone:'',nif:'',address:'',electricity:0.23,labor:10,margin:35,vat:0,validity:15};
export const statuses=['Aguarda pagamento','Em produção','Pronto','Entregue','Cancelado'];
export const money=n=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(Number(n)||0);
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const round=n=>Math.round((n+Number.EPSILON)*100)/100;
export function calculate(x){
 const fields=['grams','kgPrice','hours','watts','kwhPrice','machineHour','laborMinutes','laborHour','extras','packaging','waste','margin','discount','vat'];
 for(const k of fields)if(!Number.isFinite(Number(x[k]))||Number(x[k])<0)throw Error('Os valores de custo devem ser números positivos ou zero.');
 if(!Number.isInteger(Number(x.quantity))||Number(x.quantity)<1)throw Error('A quantidade deve ser um número inteiro maior que zero.');
 if(Number(x.margin)>=100||Number(x.discount)>100||Number(x.waste)>100||Number(x.vat)>100)throw Error('Verifica as percentagens. A margem deve ser inferior a 100%.');
 const material=x.grams/1000*x.kgPrice*(1+x.waste/100),energy=x.hours*x.watts/1000*x.kwhPrice,machine=x.hours*x.machineHour,labor=x.laborMinutes/60*x.laborHour;
 const cost=material+energy+machine+labor+Number(x.extras)+Number(x.packaging);
 const unit=round(cost/(1-x.margin/100)*(1-x.discount/100)),subtotal=round(unit*x.quantity),tax=round(subtotal*x.vat/100),total=round(subtotal+tax),totalCost=round(cost*x.quantity),profit=round(subtotal-totalCost);
 return {material:round(material),energy:round(energy),machine:round(machine),labor:round(labor),cost:round(cost),unit,subtotal,tax,total,totalCost,profit,hours:round(x.hours*x.quantity),actualMargin:subtotal?round(profit/subtotal*100):0};
}
export function paidFor(order,payments){return round(payments.filter(p=>p.orderId===order.id).reduce((s,p)=>s+Number(p.amount),0));}
export const balanceFor=(order,payments)=>round(Math.max(0,order.result.total-paidFor(order,payments)));
export function csv(rows){return '\ufeff'+rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""').replace(/^[=+\-@\t\r]/,"'$&")+'"').join(';')).join('\r\n');}
export const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Lisbon'});
