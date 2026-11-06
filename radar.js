const sources=[['Etsy','https://www.etsy.com/pt/search?q='],['Amazon Espanha','https://www.amazon.es/s?k='],['Google Shopping','https://www.google.com/search?tbm=shop&q='],['Google Trends','https://trends.google.com/trends/explore?geo=PT&q=']];
const ideas=['suporte de telemóvel','organizador de cabos','suporte de comando','organizador de secretária','suporte de auscultadores','gancho para ferramentas'];
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export function radarView(){
 return `<div class="hero"><div><div class="eyebrow">RG3D · Radar de Produtos</div><h2>Mais vendidos e oportunidades</h2><p>Pesquisa manual no mercado português. Os resultados das plataformas são externos: não representam vendas confirmadas.</p></div></div>
 <section class="panel"><h2>Pesquisar produtos</h2><p>Escolhe um termo e abre as fontes para verificar preços, avaliações, procura e concorrência. Nenhuma pesquisa é executada automaticamente.</p>
 <div class="formgrid"><label class="full">Produto ou categoria<input id="radar-term" placeholder="Ex.: organizador de cabos" maxlength="100"></label></div>
 <div class="actions" style="margin:16px 0"><button class="primary" data-action="radar-search">Pesquisar produtos</button></div><div id="radar-results"></div></section>
 <section class="panel"><h2>Ideias para começar</h2><div class="actions">${ideas.map(t=>`<button data-action="radar-idea" data-id="${safe(t)}">${safe(t)}</button>`).join('')}</div><p class="small">Sugestões de categorias para investigar, não um ranking de vendas.</p></section>`;
}
export function radarResults(term){
 const q=term.trim().slice(0,100);if(!q)return '<p>Escreve um produto para pesquisar.</p>';
 return `<h3>Fontes para: ${safe(q)}</h3><div class="actions">${sources.map(([name,url])=>`<a class="primary" href="${url+encodeURIComponent(q)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px;border-radius:8px;text-decoration:none">${safe(name)} ↗</a>`).join('')}</div><p class="small">Compare anúncios e preços em euros, confirme disponibilidade em Portugal e verifique licenças de modelos 3D. Avaliações e popularidade não são prova de unidades vendidas.</p><p>Para estimar o lucro, registe a peça em Produtos e utilize Novo orçamento, com gramas e horas reais do slicer.</p>`;
}
