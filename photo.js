// Photos stay in the existing protected product payload; no public storage bucket.
export const validPhoto=value=>typeof value==='string'&&value.length<=180000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
export async function compressPhoto(file){
 if(!file.type.startsWith('image/'))throw Error('Seleciona um ficheiro de imagem.');
 if(file.size>20*1024*1024)throw Error('A foto é demasiado grande. Usa uma imagem até 20 MB.');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Não foi possível abrir a foto. Experimenta uma imagem JPG, PNG ou WebP.'));image.src=url;});
  if(!image.naturalWidth||!image.naturalHeight)throw Error('A imagem não tem dimensões válidas.');
  const scale=Math.min(1,640/image.naturalWidth,640/image.naturalHeight),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível preparar a foto neste navegador.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.8,.65,.5,.35]){const photo=canvas.toDataURL('image/jpeg',quality);if(validPhoto(photo))return photo;}
  throw Error('A foto tem demasiado detalhe. Experimenta outra imagem ou recorta-a.');
 }finally{URL.revokeObjectURL(url);}
}
