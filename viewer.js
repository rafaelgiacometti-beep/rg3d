// Lightweight STL viewer, with triangle sampling for responsive interaction.
export function stlTriangles(buffer){
 const view=new DataView(buffer);const count=buffer.byteLength>=84?view.getUint32(80,true):0;const points=[];
 if(count>0&&84+count*50===buffer.byteLength){const step=Math.max(1,Math.ceil(count/12000));for(let i=0;i<count;i+=step){let offset=84+i*50+12;const tri=[];for(let j=0;j<9;j++,offset+=4)tri.push(view.getFloat32(offset,true));points.push(tri);}}
 else{const text=new TextDecoder().decode(buffer);if(!/^\s*solid\b/i.test(text))throw Error('O STL não tem um formato reconhecido.');const matches=text.matchAll(/\bvertex\s+([+-]?[\d.eE]+)\s+([+-]?[\d.eE]+)\s+([+-]?[\d.eE]+)/g);let tri=[],total=0;for(const m of matches){tri.push(Number(m[1]),Number(m[2]),Number(m[3]));if(tri.length===9){if(total++%Math.max(1,Math.ceil(text.length/2000000))===0&&points.length<12000)points.push(tri);tri=[];}}}
 if(!points.length||points.some(t=>t.some(v=>!Number.isFinite(v))))throw Error('O STL está vazio ou contém coordenadas inválidas.');return points;
}
export function showMesh(canvas,triangles){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const t of triangles)for(let i=0;i<9;i++){const k=i%3;min[k]=Math.min(min[k],t[i]);max[k]=Math.max(max[k],t[i]);}
 const center=min.map((x,i)=>(x+max[i])/2),span=Math.max(...min.map((x,i)=>max[i]-x),.001);const normalized=triangles.map(t=>t.map((v,i)=>(v-center[i%3])/span));let yaw=.65,pitch=-.5,zoom=1,drag=null;
 function paint(){const ctx=canvas.getContext('2d');if(!ctx)return;const w=canvas.width,h=canvas.height;ctx.fillStyle='#10181b';ctx.fillRect(0,0,w,h);const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch),scale=Math.min(w,h)*.72*zoom;
 const faces=normalized.map(t=>{const vertices=[];for(let i=0;i<9;i+=3){const x=t[i]*cy+t[i+2]*sy,z=-t[i]*sy+t[i+2]*cy,y=t[i+1]*cp-z*sp,depth=t[i+1]*sp+z*cp;vertices.push([w/2+x*scale,h/2-y*scale,depth]);}return {vertices,z:vertices.reduce((s,v)=>s+v[2],0)/3};}).sort((a,b)=>a.z-b.z);
 for(const {vertices:v,z} of faces){const light=Math.round(100+Math.max(-.8,Math.min(.8,z))*65);ctx.beginPath();ctx.moveTo(v[0][0],v[0][1]);ctx.lineTo(v[1][0],v[1][1]);ctx.lineTo(v[2][0],v[2][1]);ctx.closePath();ctx.fillStyle=`rgb(0,${light+70},${light+80})`;ctx.fill();}}
 canvas.onpointerdown=e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!drag)return;yaw+=(e.clientX-drag[0])*.01;pitch+=(e.clientY-drag[1])*.01;drag=[e.clientX,e.clientY];paint();};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;canvas.onwheel=e=>{e.preventDefault();zoom=Math.max(.3,Math.min(3,zoom*(e.deltaY>0?.9:1.1)));paint();};paint();
 return {zoom:factor=>{zoom=Math.max(.3,Math.min(3,zoom*factor));paint();},reset:()=>{yaw=.65;pitch=-.5;zoom=1;paint();}};
}
let zipPromise;
async function loadZip(){if(globalThis.JSZip)return globalThis.JSZip;if(!zipPromise)zipPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./vendor/jszip.min.js';s.onload=()=>resolve(globalThis.JSZip);s.onerror=()=>{zipPromise=null;s.remove();reject(Error('Não foi possível carregar a prévia 3MF.'));};document.head.append(s);});return zipPromise;}
export async function thumbnail3mf(blob){
 const JSZip=await loadZip(),zip=await JSZip.loadAsync(await blob.arrayBuffer());const entries=Object.values(zip.files);const file=entries.find(f=>/^Metadata\/thumbnail\.(png|jpe?g)$/i.test(f.name))||entries.find(f=>/thumbnail.*\.(png|jpe?g)$/i.test(f.name));
 if(!file)return null;if(file._data?.uncompressedSize>10*1024*1024)throw Error('A miniatura do 3MF é demasiado grande.');
 const bytes=await file.async('uint8array');if(bytes.length>10*1024*1024)throw Error('A miniatura do 3MF é demasiado grande.');return new Blob([bytes],{type:/\.png$/i.test(file.name)?'image/png':'image/jpeg'});
}
