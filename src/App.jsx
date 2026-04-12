import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

/* ═══════ PARSERS ═══════ */
function parseLAS(buf){
  const dv=new DataView(buf);
  if(String.fromCharCode(dv.getUint8(0),dv.getUint8(1),dv.getUint8(2),dv.getUint8(3))!=="LASF")throw new Error("Invalid LAS");
  const vMaj=dv.getUint8(24),vMin=dv.getUint8(25),off=dv.getUint32(96,true),fmt=dv.getUint8(104),rec=dv.getUint16(105,true);
  let n=dv.getUint32(107,true);if(vMaj===1&&vMin>=4&&n===0)n=Number(dv.getBigUint64(247,true));
  const xS=dv.getFloat64(131,true),yS=dv.getFloat64(139,true),zS=dv.getFloat64(147,true);
  const xO=dv.getFloat64(155,true),yO=dv.getFloat64(163,true),zO=dv.getFloat64(171,true);
  const hasRGB=[2,3,5,7,8,10].includes(fmt);let rgbOff=20;if(fmt===3||fmt===5)rgbOff=28;if(fmt>=7)rgbOff=30;
  const MAX=5e6,step=n>MAX?Math.ceil(n/MAX):1,cap=Math.ceil(n/step);
  const x=new Float32Array(cap),y=new Float32Array(cap),z=new Float32Array(cap);
  const r=new Uint8Array(cap),g=new Uint8Array(cap),b=new Uint8Array(cap);
  const inten=new Uint16Array(cap),cls=new Uint8Array(cap);let idx=0;
  for(let i=0;i<n&&idx<cap;i+=step){const o=off+i*rec;if(o+20>buf.byteLength)break;
    x[idx]=dv.getInt32(o,true)*xS+xO;y[idx]=dv.getInt32(o+4,true)*yS+yO;z[idx]=dv.getInt32(o+8,true)*zS+zO;
    inten[idx]=dv.getUint16(o+12,true);cls[idx]=dv.getUint8(o+15);
    if(hasRGB&&o+rgbOff+6<=buf.byteLength){r[idx]=dv.getUint16(o+rgbOff,true)>>8;g[idx]=dv.getUint16(o+rgbOff+2,true)>>8;b[idx]=dv.getUint16(o+rgbOff+4,true)>>8;}
    idx++;}
  return{nOrig:n,n:idx,ver:`${vMaj}.${vMin}`,format:"LAS",hasRGB,x:x.subarray(0,idx),y:y.subarray(0,idx),z:z.subarray(0,idx),
    r:r.subarray(0,idx),g:g.subarray(0,idx),b:b.subarray(0,idx),intensity:inten.subarray(0,idx),classification:cls.subarray(0,idx)};
}
function parsePLY(buf){
  const hdr=new TextDecoder().decode(buf.slice(0,4096));const lines=hdr.split("\n");let n=0;const props=[];let isBin=false,isLE=true;
  for(const l of lines){const t=l.trim();if(t.startsWith("element vertex"))n=parseInt(t.split(" ")[2]);
    if(t.startsWith("property")){const p=t.split(" ");props.push({type:p[1],name:p[2]});}
    if(t.includes("binary_little")){isBin=true;isLE=true;}if(t.includes("binary_big")){isBin=true;}if(t==="end_header")break;}
  const hdrEnd=hdr.indexOf("end_header")+"end_header\n".length;
  const MAX=5e6,step=n>MAX?Math.ceil(n/MAX):1,cap=Math.ceil(n/step);
  const x=new Float32Array(cap),y=new Float32Array(cap),z=new Float32Array(cap);
  const r=new Uint8Array(cap),g=new Uint8Array(cap),b=new Uint8Array(cap);
  const inten=new Uint16Array(cap),cls=new Uint8Array(cap);const hasRGB=props.some(p=>p.name==="red");
  if(isBin){const ps={float:4,double:8,uchar:1,uint8:1,short:2,ushort:2,int:4,uint:4};const rl=props.reduce((s,p)=>s+(ps[p.type]||4),0);
    const dv=new DataView(buf,hdrEnd);let idx=0;
    for(let i=0;i<n&&idx<cap;i+=step){let o=i*rl,pi=0;for(const p of props){const sz=ps[p.type]||4;
      if(p.name==="x")x[idx]=p.type==="double"?dv.getFloat64(o+pi,isLE):dv.getFloat32(o+pi,isLE);
      else if(p.name==="y")y[idx]=p.type==="double"?dv.getFloat64(o+pi,isLE):dv.getFloat32(o+pi,isLE);
      else if(p.name==="z")z[idx]=p.type==="double"?dv.getFloat64(o+pi,isLE):dv.getFloat32(o+pi,isLE);
      else if(p.name==="red")r[idx]=(p.type==="uchar"||p.type==="uint8")?dv.getUint8(o+pi):dv.getUint16(o+pi,isLE)>>8;
      else if(p.name==="green")g[idx]=(p.type==="uchar"||p.type==="uint8")?dv.getUint8(o+pi):dv.getUint16(o+pi,isLE)>>8;
      else if(p.name==="blue")b[idx]=(p.type==="uchar"||p.type==="uint8")?dv.getUint8(o+pi):dv.getUint16(o+pi,isLE)>>8;
      pi+=sz;}idx++;}
    return{nOrig:n,n:idx,ver:"PLY",format:"PLY",hasRGB,x:x.subarray(0,idx),y:y.subarray(0,idx),z:z.subarray(0,idx),
      r:r.subarray(0,idx),g:g.subarray(0,idx),b:b.subarray(0,idx),intensity:inten.subarray(0,idx),classification:cls.subarray(0,idx)};}
  const dl=new TextDecoder().decode(buf).split("\n");const hi=dl.findIndex(l=>l.trim()==="end_header");
  const xI=props.findIndex(p=>p.name==="x"),yI=props.findIndex(p=>p.name==="y"),zI=props.findIndex(p=>p.name==="z");
  const rI=props.findIndex(p=>p.name==="red"),gI=props.findIndex(p=>p.name==="green"),bI=props.findIndex(p=>p.name==="blue");
  let idx=0;for(let i=0;i<n&&idx<cap;i+=step){const v=dl[hi+1+i]?.trim().split(/\s+/);if(!v||v.length<3)continue;
    x[idx]=+v[xI];y[idx]=+v[yI];z[idx]=+v[zI];if(rI>=0){r[idx]=+v[rI];g[idx]=+v[gI];b[idx]=+v[bI];}idx++;}
  return{nOrig:n,n:idx,ver:"PLY",format:"PLY",hasRGB:rI>=0,x:x.subarray(0,idx),y:y.subarray(0,idx),z:z.subarray(0,idx),
    r:r.subarray(0,idx),g:g.subarray(0,idx),b:b.subarray(0,idx),intensity:inten.subarray(0,idx),classification:cls.subarray(0,idx)};
}
function parseFile(buf,name){const e=name.toLowerCase().split(".").pop();if(e==="laz")throw new Error("LAZ → LAS dönüştürün\n(CloudCompare / R writeLAS)");if(e==="ply")return parsePLY(buf);return parseLAS(buf);}

/* ═══════ CORE ═══════ */
function getBounds(p){let x0=1/0,x1=-1/0,y0=1/0,y1=-1/0,z0=1/0,z1=-1/0;for(let i=0;i<p.x.length;i++){
  if(p.x[i]<x0)x0=p.x[i];if(p.x[i]>x1)x1=p.x[i];if(p.y[i]<y0)y0=p.y[i];if(p.y[i]>y1)y1=p.y[i];if(p.z[i]<z0)z0=p.z[i];if(p.z[i]>z1)z1=p.z[i];}return{x0,x1,y0,y1,z0,z1};}

function normalize(pts,cs=2){const b=getBounds(pts),cols=Math.ceil((b.x1-b.x0)/cs)+1,rows=Math.ceil((b.y1-b.y0)/cs)+1;
  const g=new Float32Array(rows*cols).fill(1/0);
  for(let i=0;i<pts.x.length;i++){const c=Math.floor((pts.x[i]-b.x0)/cs),r=Math.floor((pts.y[i]-b.y0)/cs);if(pts.z[i]<g[r*cols+c])g[r*cols+c]=pts.z[i];}
  for(let p=0;p<3;p++)for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){if(g[r*cols+c]<1/0)continue;let s=0,n=0;
    for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&g[nr*cols+nc]<1/0){s+=g[nr*cols+nc];n++;}}if(n)g[r*cols+c]=s/n;}
  const z=new Float32Array(pts.x.length);for(let i=0;i<pts.x.length;i++){const c=Math.floor((pts.x[i]-b.x0)/cs),r=Math.floor((pts.y[i]-b.y0)/cs),v=g[r*cols+c];z[i]=v<1/0?pts.z[i]-v:pts.z[i]-b.z0;}return z;}

function clip(pts,zN,cx,cy,rad,shape){const idx=[];for(let i=0;i<pts.x.length;i++){const dx=pts.x[i]-cx,dy=pts.y[i]-cy;
  if(shape==="circle"?dx*dx+dy*dy<=rad*rad:Math.abs(dx)<=rad&&Math.abs(dy)<=rad)idx.push(i);}
  const o={x:new Float32Array(idx.length),y:new Float32Array(idx.length),z:new Float32Array(idx.length),r:new Uint8Array(idx.length),g:new Uint8Array(idx.length),b:new Uint8Array(idx.length),
    intensity:new Uint16Array(idx.length),classification:new Uint8Array(idx.length),hasRGB:pts.hasRGB};const zO=new Float32Array(idx.length);
  idx.forEach((j,i)=>{o.x[i]=pts.x[j];o.y[i]=pts.y[j];o.z[i]=pts.z[j];o.r[i]=pts.r[j];o.g[i]=pts.g[j];o.b[i]=pts.b[j];o.intensity[i]=pts.intensity[j];o.classification[i]=pts.classification[j];zO[i]=zN[j];});
  return{pts:o,zN:zO};}

function segment(pts,zN,cell=.5,minH=2,sr=3){if(!pts.x.length)return{labels:new Int32Array(0),count:0};
  const b=getBounds(pts),cols=Math.ceil((b.x1-b.x0)/cell)+1,rows=Math.ceil((b.y1-b.y0)/cell)+1;
  const chm=new Float32Array(rows*cols).fill(-1);
  for(let i=0;i<pts.x.length;i++){const c=Math.floor((pts.x[i]-b.x0)/cell),r=Math.floor((pts.y[i]-b.y0)/cell);if(zN[i]>chm[r*cols+c])chm[r*cols+c]=zN[i];}
  const sm=new Float32Array(rows*cols);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){let s=0,n=0;
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&chm[nr*cols+nc]>=0){s+=chm[nr*cols+nc];n++;}}sm[r*cols+c]=n?s/n:-1;}
  const sc=Math.ceil(sr/cell),seeds=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const h=sm[r*cols+c];if(h<minH)continue;let mx=true;
    for(let dr=-sc;dr<=sc&&mx;dr++)for(let dc=-sc;dc<=sc&&mx;dc++){if(!dr&&!dc)continue;const nr=r+dr,nc=c+dc;if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&sm[nr*cols+nc]>h)mx=false;}if(mx)seeds.push({r,c,h});}
  if(!seeds.length)return{labels:new Int32Array(pts.x.length),count:0};
  const cl=new Int32Array(rows*cols);seeds.forEach((s,i)=>{cl[s.r*cols+s.c]=i+1;});
  const ord=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(sm[r*cols+c]>=minH)ord.push({r,c,h:sm[r*cols+c]});ord.sort((a,b)=>b.h-a.h);
  for(let p=0;p<8;p++){let ch=false;for(const{r,c}of ord){const k=r*cols+c;if(cl[k])continue;let best=0,bh=-1;
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const nr=r+dr,nc=c+dc;if(nr>=0&&nr<rows&&nc>=0&&nc<cols){const nk=nr*cols+nc;if(cl[nk]&&sm[nk]>bh){bh=sm[nk];best=cl[nk];}}}
    if(best){cl[k]=best;ch=true;}}if(!ch)break;}
  const labels=new Int32Array(pts.x.length);for(let i=0;i<pts.x.length;i++){if(zN[i]<minH)continue;const c=Math.floor((pts.x[i]-b.x0)/cell),r=Math.floor((pts.y[i]-b.y0)/cell);labels[i]=cl[r*cols+c];}
  const u=new Set(labels);u.delete(0);const rm=new Map();let seq=1;for(const v of u)rm.set(v,seq++);for(let i=0;i<labels.length;i++)labels[i]=rm.get(labels[i])||0;
  return{labels,count:seq-1};}

function calcMetrics(pts,zN,labels,cnt){if(!cnt)return[];const trees=[];
  for(let t=1;t<=Math.min(cnt,5000);t++){let x0=1/0,x1=-1/0,y0=1/0,y1=-1/0,hM=0,c=0;
    for(let i=0;i<pts.x.length;i++){if(labels[i]!==t)continue;c++;if(pts.x[i]<x0)x0=pts.x[i];if(pts.x[i]>x1)x1=pts.x[i];if(pts.y[i]<y0)y0=pts.y[i];if(pts.y[i]>y1)y1=pts.y[i];if(zN[i]>hM)hM=zN[i];}
    if(c<5)continue;trees.push({id:t,cnt:c,h:hM,cd:((x1-x0)+(y1-y0))/2,cpa:Math.PI/4*(x1-x0)*(y1-y0),cx:(x0+x1)/2,cy:(y0+y1)/2,dbhManual:"",hManual:"",cdManual:""});}
  trees.sort((a,b)=>b.cnt-a.cnt);return trees;}

function calcArea(pts,zN,metrics){if(!pts||!zN||pts.x.length<10)return null;
  const h=[];for(let i=0;i<zN.length;i++)if(zN[i]>0.5)h.push(zN[i]);if(h.length<5)return null;h.sort((a,b)=>a-b);
  const n=h.length,p=v=>h[Math.min(n-1,Math.floor(n*v/100))],mean=h.reduce((s,v)=>s+v,0)/n;
  const vari=h.reduce((s,v)=>s+(v-mean)**2,0)/(n-1),sd=Math.sqrt(vari),cv=mean>0?sd/mean*100:0;
  const m4=h.reduce((s,v)=>s+(v-mean)**4,0)/n,kurt=vari>0?m4/vari**2-3:0;
  const dr=t=>{let a=0;for(let i=0;i<zN.length;i++)if(zN[i]>t)a++;return zN.length>0?a/zN.length:0;};
  const b=getBounds(pts),area=(b.x1-b.x0)*(b.y1-b.y0);
  return{n_pts:pts.x.length,n_veg:n,area,h5:p(5),h25:p(25),h50:p(50),h75:p(75),h95:p(95),h99:p(99),
    h_mean:mean,h_max:Math.max(...h),h_sd:sd,cv_h:cv,kurtosis:kurt,iqr:p(75)-p(25),variance:vari,
    d1:dr(p(10)),d3:dr(p(30)),d5:dr(p(50)),d7:dr(p(70)),d9:dr(p(90)),cc13:dr(1.3),
    itc_n:metrics?metrics.length:0,itc_max:metrics?Math.max(...metrics.map(m=>m.h)):0,
    itc_min:metrics?Math.min(...metrics.map(m=>m.h)):0,itc_mean:metrics?(metrics.reduce((s,m)=>s+m.h,0)/metrics.length):0,
    density:metrics&&area>0?(metrics.length/area*10000):0};}

function extractTransect(pts,zN,p1,p2,w=2){const dx=p2.x-p1.x,dy=p2.y-p1.y,len=Math.sqrt(dx*dx+dy*dy);if(len<.1)return[];
  const nx=-dy/len,ny=dx/len,res=[];for(let i=0;i<pts.x.length;i++){const px=pts.x[i]-p1.x,py=pts.y[i]-p1.y;
    const along=(px*dx+py*dy)/len,perp=Math.abs(px*nx+py*ny);if(along>=0&&along<=len&&perp<=w/2)res.push({dist:along,zN:zN[i]});}
  res.sort((a,b)=>a.dist-b.dist);return res;}

const SPECIES=[{id:"ps",name:"Sarıçam (P. sylvestris)",fn:(h,cd)=>(2.1*h**.85+3.5+5.8*cd)/2},{id:"pn",name:"Karaçam (P. nigra)",fn:(h,cd)=>(2.3*h**.82+4+5.5*cd)/2},
  {id:"pb",name:"Kızılçam (P. brutia)",fn:(h,cd)=>(1.9*h**.88+2.8+6.2*cd)/2},{id:"ab",name:"Göknar (A. bornm.)",fn:(h,cd)=>(1.5*h**.92+2+7*cd)/2},
  {id:"fo",name:"Kayın (F. orientalis)",fn:(h,cd)=>(2.5*h**.8+1.5+6.5*cd)/2},{id:"qc",name:"Meşe (Q. cerris)",fn:(h,cd)=>(2.8*h**.78+2+5*cd)/2},
  {id:"pp",name:"Fıstıkçamı (P. pinea)",fn:(h,cd)=>(2*h**.86+5+4.5*cd)/2}];
const COL=["#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#911eb4","#42d4f4","#f032e6","#bfef45","#fabed4","#469990","#dcbeff","#9A6324","#800000","#aaffc3","#808000"];
function hCol(t){return[t<.5?0:(t-.5)*2,t<.5?t*2:(1-t)*2,t<.5?(.5-t)*2:0];}
function niceStep(r){const raw=r/6,mag=10**Math.floor(Math.log10(raw)),n=raw/mag;return(n<1.5?1:n<3.5?2:n<7.5?5:10)*mag;}

/* ═══════ APP ═══════ */
export default function App(){
  const[data,setData]=useState(null);const[zN,setZN]=useState(null);const[bnd,setBnd]=useState(null);const[msg,setMsg]=useState("");const[lang,setLang]=useState("TR");
  const[cc,setCC]=useState(null);const[cr,setCR]=useState(15);const[cs,setCS]=useState("circle");
  const[clp,setClp]=useState(null);const[clpZ,setClpZ]=useState(null);const[clpB,setClpB]=useState(null);
  const[segs,setSegs]=useState(null);const[met,setMet]=useState(null);const[areaMet,setAreaMet]=useState(null);
  const[sel,setSel]=useState(null);const[sp,setSp]=useState("ps");
  const[cMode,setCMode]=useState("height");const[view,setView]=useState("2d");
  const[ptSz,setPtSz]=useState(1.5);const[ptPct,setPtPct]=useState(100);
  const[sCell,setSCell]=useState(0.5);const[sMinH,setSMinH]=useState(2);const[sSR,setSSR]=useState(3);
  const[tab,setTab]=useState("tools");const[theme,setTheme]=useState("dark");
  const[pan,setPan]=useState({x:0,y:0});const[zoom,setZoom]=useState(1);
  const[tMode,setTMode]=useState(false);const[tP1,setTP1]=useState(null);const[tP2,setTP2]=useState(null);const[tData,setTData]=useState(null);
  const topR=useRef(null),sideR=useRef(null),transR=useRef(null),threeR=useRef(null),cleanR=useRef(null);
  const dragR=useRef({on:false,moved:false,sx:0,sy:0,px:0,py:0});
  const aP=clp||data,aZ=clpZ||zN,aB=clp?clpB:bnd;

  const dk=theme==="dark"?"#080b10":"#f5f5f5",pn=theme==="dark"?"#0f1319":"#fff",bd=theme==="dark"?"#1a2030":"#d4d4d4";
  const ac="#22d3ee",gn="#34d399",og="#f59e0b",tx=theme==="dark"?"#c9d1d9":"#1a1a1a",txD=theme==="dark"?"#4a5568":"#9ca3af",txM=theme==="dark"?"#7b8594":"#6b7280";
  const B=(on)=>({padding:"4px 10px",background:on?ac+"1a":pn,color:on?ac:txM,border:`1px solid ${on?ac+"55":bd}`,borderRadius:4,cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:on?600:400});
  const I={padding:"3px 6px",background:dk,color:tx,border:`1px solid ${bd}`,borderRadius:3,fontSize:10,fontFamily:"inherit",width:48};

  const handleFile=useCallback(async(e)=>{const f=e.target.files[0];if(!f)return;setMsg("Loading...");
    setCC(null);setClp(null);setClpZ(null);setClpB(null);setSegs(null);setMet(null);setAreaMet(null);setSel(null);setView("2d");setZN(null);setPan({x:0,y:0});setZoom(1);setTP1(null);setTP2(null);setTData(null);
    try{const buf=await f.arrayBuffer();const pts=parseFile(buf,f.name);setData(pts);setBnd(getBounds(pts));
      setMsg("Normalizing...");await new Promise(r=>setTimeout(r,20));setZN(normalize(pts));setMsg("");setTab("tools");
    }catch(err){setMsg("⚠ "+err.message);}},[]);

  const doClip=useCallback(()=>{if(!data||!cc||!zN)return;const{pts:cp,zN:cz}=clip(data,zN,cc.x,cc.y,cr,cs);
    if(!cp.x.length){setMsg("No points!");return;}setClp(cp);setClpZ(cz);setClpB(getBounds(cp));setSegs(null);setMet(null);setAreaMet(null);setPan({x:0,y:0});setZoom(1);},[data,zN,cc,cr,cs]);

  const doSeg=useCallback(()=>{if(!aP||!aZ)return;setMsg("Segmenting...");
    setTimeout(()=>{const s=segment(aP,aZ,sCell,sMinH,sSR);setSegs(s);setCMode("segment");
      const m=calcMetrics(aP,aZ,s.labels,s.count);setMet(m);setAreaMet(calcArea(aP,aZ,m));setMsg("");setTab("metrics")},30);},[aP,aZ,sCell,sMinH,sSR]);

  const applySp=useCallback(()=>{if(!met)return;const s=SPECIES.find(x=>x.id===sp);
    setMet(prev=>prev.map(m=>({...m,dbhModel:s?s.fn(m.h,m.cd):null,species:s?.name})));},[met,sp]);

  const exportCSV=useCallback(()=>{if(!met)return;
    let csv="\uFEFFID,H_auto,CD_auto,CPA,DBH_model,H_manual,CD_manual,DBH_manual,Species,Points\n";
    csv+=met.map(m=>`${m.id},${m.h.toFixed(2)},${m.cd.toFixed(2)},${m.cpa.toFixed(2)},${m.dbhModel?.toFixed(1)||""},${m.hManual||""},${m.cdManual||""},${m.dbhManual||""},${m.species||""},${m.cnt}`).join("\n");
    if(areaMet){csv+="\n\nAREA_METRICS\n"+Object.entries(areaMet).map(([k,v])=>`${k},${typeof v==="number"?v.toFixed(3):v}`).join("\n");}
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="fora_metrics.csv";document.body.appendChild(a);a.click();document.body.removeChild(a);},[met,areaMet]);

  const updateMet=useCallback((id,f,v)=>{setMet(prev=>prev.map(m=>m.id===id?{...m,[f]:v}:m));},[]);
  const doReset=()=>{setClp(null);setClpZ(null);setClpB(null);setSegs(null);setMet(null);setAreaMet(null);setCC(null);setSel(null);setCMode("height");setPan({x:0,y:0});setZoom(1);setTP1(null);setTP2(null);setTData(null);};

  /* ═══ DRAW 2D ═══ */
  const draw2D=useCallback(()=>{if(!aP||!aB)return;
    const drawC=(canvas,isTop)=>{if(!canvas)return;const ctx=canvas.getContext("2d");
      const W=canvas.width=canvas.offsetWidth*2,H=canvas.height=canvas.offsetHeight*2;ctx.fillStyle=dk;ctx.fillRect(0,0,W,H);
      const xA=aP.x,yA=isTop?aP.y:aP.z,xMn=aB.x0,xMx=aB.x1,yMn=isTop?aB.y0:aB.z0,yMx=isTop?aB.y1:aB.z1;
      const rX=xMx-xMn||1,rY=yMx-yMn||1,bsc=Math.min((W-50)/rX,(H-50)/rY),sc=bsc*zoom;
      const oX=W/2-((xMn+xMx)/2-xMn)*sc+(isTop?pan.x*2:0),oY=H/2+((yMn+yMx)/2-yMn)*sc-(isTop?pan.y*2:0);
      ctx.strokeStyle=theme==="dark"?"#151a22":"#e5e5e5";ctx.lineWidth=1;const gs=niceStep(rX/zoom);ctx.font="14px monospace";ctx.fillStyle=txD;
      for(let v=Math.floor(xMn/gs)*gs;v<=xMx;v+=gs){const px=oX+(v-xMn)*sc;if(px>0&&px<W){ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,H);ctx.stroke();ctx.fillText(v.toFixed(0),px+2,H-4);}}
      for(let v=Math.floor(yMn/gs)*gs;v<=yMx;v+=gs){const py=oY-(v-yMn)*sc;if(py>0&&py<H){ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(W,py);ctx.stroke();ctx.fillText(v.toFixed(0),4,py-4);}}
      const sbM=niceStep(rX/zoom),sbPx=sbM*sc;ctx.fillStyle=ac;ctx.fillRect(W-sbPx-20,H-16,sbPx,3);ctx.fillText(`${sbM} m`,W-sbPx-18,H-20);
      if(!isTop){[1.3,5,10,15,20,25,30].forEach(hv=>{if(hv>rY)return;const py=oY-hv*sc;if(py<0||py>H)return;ctx.strokeStyle=hv===1.3?"#f5920066":"#22d3ee22";ctx.lineWidth=hv===1.3?2:1;ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(W,py);ctx.stroke();ctx.fillStyle=hv===1.3?"#f59200":"#22d3ee66";ctx.font="12px monospace";ctx.fillText(`${hv}m`,W-40,py-3);});}
      const mx=Math.floor(5e5*(ptPct/100)),st=aP.x.length>mx?Math.ceil(aP.x.length/mx):1;
      for(let i=0;i<aP.x.length;i+=st){const px=oX+(xA[i]-xMn)*sc,py=oY-(yA[i]-yMn)*sc;if(px<-5||px>W+5||py<-5||py>H+5)continue;
        if(sel!==null&&segs&&segs.labels[i]!==sel&&segs.labels[i]>0){ctx.fillStyle=theme==="dark"?"#151a22":"#e8e8e8";ctx.fillRect(px,py,ptSz*.7,ptSz*.7);continue;}
        if(cMode==="rgb"&&aP.hasRGB)ctx.fillStyle=`rgb(${aP.r[i]},${aP.g[i]},${aP.b[i]})`;
        else if(cMode==="segment"&&segs){const l=segs.labels[i];ctx.fillStyle=l<=0?(theme==="dark"?"#151a22":"#ddd"):COL[(l-1)%COL.length];}
        else if(cMode==="normalized"&&aZ){const mH=aB.z1-aB.z0;const t=mH>0?Math.min(1,aZ[i]/mH):0;const[r,g,b]=hCol(t);ctx.fillStyle=`rgb(${r*255|0},${g*255|0},${b*255|0})`;}
        else if(cMode==="intensity"){const v=Math.min(255,aP.intensity[i]);ctx.fillStyle=`rgb(${v},${v},${v})`;}
        else{const t=aB.z1===aB.z0?.5:(aP.z[i]-aB.z0)/(aB.z1-aB.z0);const[r,g,b]=hCol(t);ctx.fillStyle=`rgb(${r*255|0},${g*255|0},${b*255|0})`;}
        ctx.fillRect(px,py,ptSz,ptSz);}
      if(!clp&&cc&&isTop){const cx=oX+(cc.x-xMn)*sc,cy=oY-(cc.y-yMn)*sc,r=cr*sc;ctx.shadowColor="#00ffff";ctx.shadowBlur=12;ctx.strokeStyle="#00ffff";ctx.lineWidth=3;ctx.setLineDash([8,4]);ctx.beginPath();
        if(cs==="circle")ctx.arc(cx,cy,r,0,Math.PI*2);else ctx.rect(cx-r,cy-r,r*2,r*2);ctx.stroke();ctx.setLineDash([]);ctx.shadowBlur=0;ctx.fillStyle="#00ffff";ctx.beginPath();ctx.arc(cx,cy,6,0,Math.PI*2);ctx.fill();ctx.font="bold 14px monospace";ctx.fillText(`r=${cr}m`,cx+10,cy-10);}
      if(tP1&&isTop){const ax=oX+(tP1.x-xMn)*sc,ay=oY-(tP1.y-yMn)*sc;ctx.fillStyle="#ff6384";ctx.beginPath();ctx.arc(ax,ay,6,0,Math.PI*2);ctx.fill();
        if(tP2){const bx=oX+(tP2.x-xMn)*sc,by=oY-(tP2.y-yMn)*sc;ctx.strokeStyle="#ff6384";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.fillStyle="#ff6384";ctx.beginPath();ctx.arc(bx,by,6,0,Math.PI*2);ctx.fill();
          const d=Math.sqrt((tP2.x-tP1.x)**2+(tP2.y-tP1.y)**2);ctx.font="bold 12px monospace";ctx.fillText(`${d.toFixed(1)}m`,(ax+bx)/2+8,(ay+by)/2-8);}}
      canvas._tr={oX,oY,sc,xMn,yMn,W,H};};
    drawC(topR.current,true);drawC(sideR.current,false);
    if(tData&&transR.current){const c=transR.current;const ctx=c.getContext("2d");const W=c.width=c.offsetWidth*2,H=c.height=c.offsetHeight*2;ctx.fillStyle=dk;ctx.fillRect(0,0,W,H);
      if(tData.length){const mD=Math.max(...tData.map(p=>p.dist)),mZ=Math.max(...tData.map(p=>p.zN)),sx=(W-40)/mD,sz=(H-30)/Math.max(mZ,1);
        for(let h=0;h<=mZ;h+=5){const y=H-15-h*sz;ctx.strokeStyle="#22d3ee22";ctx.beginPath();ctx.moveTo(20,y);ctx.lineTo(W,y);ctx.stroke();ctx.fillStyle=txD;ctx.font="10px monospace";ctx.fillText(`${h}m`,0,y-2);}
        for(const p of tData){const px=20+p.dist*sx,py=H-15-p.zN*sz;const t=mZ>0?p.zN/mZ:0;const[r,g,b]=hCol(t);ctx.fillStyle=`rgb(${r*255|0},${g*255|0},${b*255|0})`;ctx.fillRect(px,py,2,2);}
        ctx.fillStyle=ac;ctx.font="12px monospace";ctx.fillText(`${mD.toFixed(1)}m | Max: ${mZ.toFixed(1)}m`,25,16);}}
  },[aP,aB,aZ,cc,cr,cs,cMode,segs,ptSz,ptPct,clp,sel,pan,zoom,theme,dk,txD,tP1,tP2,tData]);
  useEffect(()=>{if(view==="2d")draw2D();},[draw2D,view]);

  /* ═══ 3D ═══ */
  useEffect(()=>{if(view!=="3d"||!aP||!aB)return;const el=threeR.current;if(!el)return;if(cleanR.current){cleanR.current();cleanR.current=null;}
    const W=el.offsetWidth,H=el.offsetHeight;if(!W||!H)return;const scene=new THREE.Scene();scene.background=new THREE.Color(theme==="dark"?0x080b10:0xf0f0f0);
    const cam=new THREE.PerspectiveCamera(55,W/H,.1,1e4);const ren=new THREE.WebGLRenderer({antialias:true});ren.setSize(W,H);el.appendChild(ren.domElement);
    const cx=(aB.x0+aB.x1)/2,cy=(aB.y0+aB.y1)/2,cz=(aB.z0+aB.z1)/2,range=Math.max(aB.x1-aB.x0,aB.y1-aB.y0,aB.z1-aB.z0)||10;
    const mP=Math.floor(8e5*(ptPct/100)),st=aP.x.length>mP?Math.ceil(aP.x.length/mP):1,cnt=Math.ceil(aP.x.length/st);
    const pos=new Float32Array(cnt*3),col=new Float32Array(cnt*3);let j=0;
    for(let i=0;i<aP.x.length&&j<cnt;i+=st){pos[j*3]=aP.x[i]-cx;pos[j*3+1]=aP.z[i]-cz;pos[j*3+2]=-(aP.y[i]-cy);
      if(cMode==="rgb"&&aP.hasRGB){col[j*3]=aP.r[i]/255;col[j*3+1]=aP.g[i]/255;col[j*3+2]=aP.b[i]/255;}
      else if(cMode==="segment"&&segs){const l=segs.labels[i];if(l<=0){col[j*3]=.06;col[j*3+1]=.07;col[j*3+2]=.09;}else{const h=COL[(l-1)%COL.length];col[j*3]=parseInt(h.slice(1,3),16)/255;col[j*3+1]=parseInt(h.slice(3,5),16)/255;col[j*3+2]=parseInt(h.slice(5,7),16)/255;}}
      else if(cMode==="normalized"&&aZ){const t=Math.min(1,aZ[i]/30);const[r,g,b]=hCol(t);col[j*3]=r;col[j*3+1]=g;col[j*3+2]=b;}
      else if(cMode==="intensity"){const v=Math.min(1,aP.intensity[i]/255);col[j*3]=v;col[j*3+1]=v;col[j*3+2]=v;}
      else{const t=aB.z1===aB.z0?.5:(aP.z[i]-aB.z0)/(aB.z1-aB.z0);const[r,g,b]=hCol(t);col[j*3]=r;col[j*3+1]=g;col[j*3+2]=b;}j++;}
    const geom=new THREE.BufferGeometry();geom.setAttribute("position",new THREE.BufferAttribute(pos,3));geom.setAttribute("color",new THREE.BufferAttribute(col,3));
    const mat=new THREE.PointsMaterial({size:ptSz*.8,vertexColors:true,sizeAttenuation:true});scene.add(new THREE.Points(geom,mat));
    const gs=Math.ceil(range/10)*10;const grid=new THREE.GridHelper(gs,Math.ceil(gs/5),theme==="dark"?0x1a2030:0xcccccc,theme==="dark"?0x111822:0xdddddd);grid.position.y=-(aB.z1-aB.z0)/2;scene.add(grid);
    let theta=Math.PI/4,phi=Math.PI/3.2,dist=range*1.1,drag=false,px_=0,py_=0;
    const upC=()=>{cam.position.set(dist*Math.sin(phi)*Math.cos(theta),dist*Math.cos(phi),dist*Math.sin(phi)*Math.sin(theta));cam.lookAt(0,0,0);};upC();
    const dE=ren.domElement;const oD=e=>{drag=true;px_=e.clientX;py_=e.clientY;};
    const oM=e=>{if(!drag)return;theta+=(e.clientX-px_)*.005;phi=Math.max(.1,Math.min(Math.PI-.1,phi-(e.clientY-py_)*.005));px_=e.clientX;py_=e.clientY;upC();};
    const oU=()=>{drag=false;};const oW=e=>{dist*=e.deltaY>0?1.08:.92;dist=Math.max(range*.05,Math.min(range*6,dist));upC();e.preventDefault();};
    dE.addEventListener("mousedown",oD);dE.addEventListener("mousemove",oM);dE.addEventListener("mouseup",oU);dE.addEventListener("mouseleave",oU);dE.addEventListener("wheel",oW,{passive:false});
    let aId;const an=()=>{aId=requestAnimationFrame(an);ren.render(scene,cam);};an();
    cleanR.current=()=>{cancelAnimationFrame(aId);dE.removeEventListener("mousedown",oD);dE.removeEventListener("mousemove",oM);dE.removeEventListener("mouseup",oU);dE.removeEventListener("mouseleave",oU);dE.removeEventListener("wheel",oW);geom.dispose();mat.dispose();ren.dispose();if(el.contains(dE))el.removeChild(dE);};
    return()=>{if(cleanR.current){cleanR.current();cleanR.current=null;}};
  },[view,aP,aB,aZ,cMode,segs,ptSz,ptPct,theme]);

  /* ═══ MOUSE — tıklama ve sürükleme AYRI ═══ */
  const handleMouse=useCallback((e,act)=>{
    const c=topR.current;if(!c||!c._tr)return;
    const rect=c.getBoundingClientRect();const px=(e.clientX-rect.left)*2,py=(e.clientY-rect.top)*2;
    const{oX,oY,sc,xMn,yMn}=c._tr;const wx=(px-oX)/sc+xMn,wy=(oY-py)/sc+yMn;
    if(act==="down"){dragR.current={on:true,moved:false,sx:e.clientX,sy:e.clientY,px:pan.x,py:pan.y};}
    else if(act==="move"){if(!dragR.current.on)return;const dx=Math.abs(e.clientX-dragR.current.sx),dy=Math.abs(e.clientY-dragR.current.sy);
      if(dx>4||dy>4)dragR.current.moved=true;if(dragR.current.moved)setPan({x:dragR.current.px+(e.clientX-dragR.current.sx),y:dragR.current.py+(e.clientY-dragR.current.sy)});}
    else if(act==="up"){const wasDrag=dragR.current.moved;dragR.current.on=false;dragR.current.moved=false;
      if(!wasDrag){if(tMode){if(!tP1)setTP1({x:wx,y:wy});else{setTP2({x:wx,y:wy});if(aP&&aZ)setTData(extractTransect(aP,aZ,tP1,{x:wx,y:wy},2));setTMode(false);}}
        else if(!clp&&zN)setCC({x:wx,y:wy});}}
    else if(act==="wheel"){e.preventDefault();setZoom(z=>Math.max(.1,Math.min(50,z*(e.deltaY>0?.9:1.1))));}
  },[clp,zN,tMode,tP1,aP,aZ,pan]);

  /* ═══ STATS — R² = cor²  ═══ */
  const calcStats=useCallback((pairs)=>{if(!pairs||pairs.length<3)return null;
    const n=pairs.length,diffs=pairs.map(p=>p.a-p.b),mD=diffs.reduce((s,v)=>s+v,0)/n;
    const rmse=Math.sqrt(diffs.reduce((s,v)=>s+v*v,0)/n);
    // R² = korelasyon karesi (her zaman 0-1 arası)
    const mA=pairs.reduce((s,p)=>s+p.a,0)/n,mB=pairs.reduce((s,p)=>s+p.b,0)/n;
    let sAB=0,sAA=0,sBB=0;pairs.forEach(p=>{sAB+=(p.a-mA)*(p.b-mB);sAA+=(p.a-mA)**2;sBB+=(p.b-mB)**2;});
    const r2=sAA>0&&sBB>0?(sAB/(Math.sqrt(sAA)*Math.sqrt(sBB)))**2:0;
    const se=Math.sqrt(diffs.reduce((s,v)=>s+(v-mD)**2,0)/(n*(n-1)));const t=se>0?mD/se:0;
    const pv=Math.min(1,2*Math.exp(-.717*Math.abs(t)-.416*t*t));
    return{n,rmse:rmse.toFixed(2),bias:mD.toFixed(2),r2:r2.toFixed(3),t:t.toFixed(2),p:pv<.001?"<0.001":pv.toFixed(3)};},[]);

  /* ═══ LANDING ═══ */
  if(!data)return(
    <div style={{fontFamily:"'Geist Mono',monospace",background:dk,color:tx,height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <div style={{fontSize:22,fontWeight:800,color:ac,letterSpacing:4}}>◆ FORA</div>
      <div style={{fontSize:11,color:txD,letterSpacing:1}}>FORest Analysis Platform</div>
      <div style={{color:txD,fontSize:10,textAlign:"center",maxWidth:360,lineHeight:1.8}}>{lang==="TR"?"UAV-LiDAR ve ALS nokta bulutu işleme aracı":"UAV-LiDAR & ALS point cloud processing tool"}</div>
      <label style={{padding:"12px 36px",background:ac+"15",color:ac,border:`1px solid ${ac}44`,borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}}>
        {lang==="TR"?"LAS / PLY Yükle":"Load LAS / PLY"}<input type="file" accept=".las,.ply" onChange={handleFile} style={{display:"none"}}/>
      </label>
      {msg&&<div style={{color:msg.startsWith("⚠")?og:ac,fontSize:11,maxWidth:400,textAlign:"center",whiteSpace:"pre-line"}}>{msg}</div>}
      <div style={{color:txD,fontSize:9}}>LAS 1.2–1.4 | PLY (ASCII/Binary)</div>
      <div style={{display:"flex",gap:8}}><button style={B(lang==="TR")} onClick={()=>setLang("TR")}>TR</button><button style={B(lang==="EN")} onClick={()=>setLang("EN")}>EN</button></div>
    </div>);

  /* ═══ MAIN ═══ */
  return(
    <div style={{fontFamily:"'Geist Mono',monospace",background:dk,color:tx,height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* HEADER */}
      <div style={{padding:"4px 10px",background:pn,borderBottom:`1px solid ${bd}`,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",fontSize:10}}>
        <span style={{color:ac,fontWeight:800,fontSize:11,letterSpacing:3}}>◆ FORA</span>
        <span style={{fontSize:9,color:txD,background:ac+"11",padding:"1px 5px",borderRadius:3}}>{data.format} {data.ver}</span>
        <span style={{fontSize:9,color:txD,background:ac+"11",padding:"1px 5px",borderRadius:3}}>{(aP.x.length/1e3).toFixed(0)}K</span>
        {segs&&<span style={{fontSize:9,color:gn,background:gn+"11",padding:"1px 5px",borderRadius:3}}>{segs.count}</span>}
        {msg&&<span style={{color:og}}>{msg}</span>}
        <div style={{flex:1}}/>
        {/* 2D/3D TOGGLE — HEADER'DA */}
        <div style={{display:"flex",border:`1px solid ${bd}`,borderRadius:4,overflow:"hidden"}}>
          <button style={{...B(view==="2d"),borderRadius:0,border:"none",padding:"3px 12px"}} onClick={()=>setView("2d")}>2D</button>
          <button style={{...B(view==="3d"),borderRadius:0,border:"none",padding:"3px 12px",borderLeft:`1px solid ${bd}`}} onClick={()=>setView("3d")}>3D</button>
        </div>
        <select style={I} value={cMode} onChange={e=>setCMode(e.target.value)}>
          <option value="height">{lang==="TR"?"Yükseklik":"Height"}</option><option value="normalized">Normalize</option>
          {aP.hasRGB&&<option value="rgb">RGB</option>}<option value="intensity">{lang==="TR"?"Yoğunluk":"Intensity"}</option>
          {segs&&<option value="segment">Segment</option>}
        </select>
        <button style={B(theme==="light")} onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}>{theme==="dark"?"☀":"🌙"}</button>
        <button style={B(lang==="EN")} onClick={()=>setLang(l=>l==="TR"?"EN":"TR")}>{lang}</button>
        {clp&&<button style={B(false)} onClick={doReset}>↩</button>}
        <label style={{...B(false),cursor:"pointer"}}>{lang==="TR"?"Yeni":"New"}<input type="file" accept=".las,.ply" onChange={handleFile} style={{display:"none"}}/></label>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* CANVAS */}
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{flex:1,display:"flex",position:"relative"}}>
            {view==="2d"?(<>
              <div style={{flex:2,position:"relative"}}>
                <canvas ref={topR} style={{width:"100%",height:"100%",cursor:tMode?"crosshair":"grab",display:"block"}}
                  onMouseDown={e=>handleMouse(e,"down")} onMouseMove={e=>handleMouse(e,"move")}
                  onMouseUp={e=>handleMouse(e,"up")} onMouseLeave={e=>{dragR.current.on=false;dragR.current.moved=false;}}
                  onWheel={e=>handleMouse(e,"wheel")}/>
                <div style={{position:"absolute",bottom:6,left:6,fontSize:9,color:txD,background:dk+"cc",padding:"2px 6px",borderRadius:3}}>
                  {tMode?(lang==="TR"?"Transect: 2 nokta tıkla":"Click 2 points"):!clp&&zN?(lang==="TR"?"Tıkla→merkez | Sürükle→kaydır":"Click→center | Drag→pan"):(lang==="TR"?"Sürükle→kaydır":"Drag→pan")}
                </div>
              </div>
              <div style={{flex:1,borderLeft:`1px solid ${bd}`,display:"flex",flexDirection:"column"}}>
                <canvas ref={sideR} style={{width:"100%",flex:tData?0.6:1,display:"block"}}/>
                {tData&&tData.length>0&&<canvas ref={transR} style={{width:"100%",flex:0.4,display:"block",borderTop:`1px solid ${bd}`}}/>}
              </div>
            </>):(<div ref={threeR} style={{flex:1}}/>)}
          </div>
        </div>

        {/* PANEL */}
        <div style={{width:300,background:pn,borderLeft:`1px solid ${bd}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{display:"flex",borderBottom:`1px solid ${bd}`,flexWrap:"wrap"}}>
            {[["tools",lang==="TR"?"Araçlar":"Tools"],["clip",lang==="TR"?"Kes":"Clip"],["seg","Seg"],["metrics",lang==="TR"?"Metrik":"Metrics"],
              ["area",lang==="TR"?"Alan":"Area"],["stats",lang==="TR"?"İstat":"Stats"],["species",lang==="TR"?"Tür":"Sp"],["transect","T"]].map(([k,v])=>(
              <button key={k} style={{...B(tab===k),borderRadius:0,border:"none",borderRight:`1px solid ${bd}`,flex:1,minWidth:30,padding:"4px 1px"}} onClick={()=>setTab(k)}>{v}</button>))}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:8,display:"flex",flexDirection:"column",gap:10}}>

            {tab==="tools"&&(<><Sec t={lang==="TR"?"Görüntü":"Display"}>
              <Row l={lang==="TR"?"Boyut":"Size"}><input type="range" min={.5} max={5} step={.25} value={ptSz} onChange={e=>setPtSz(+e.target.value)} style={{flex:1}}/><span style={{fontSize:9,color:txM,width:20}}>{ptSz}</span></Row>
              <Row l={lang==="TR"?"Örnekleme":"Sample"}><input type="range" min={10} max={100} step={5} value={ptPct} onChange={e=>setPtPct(+e.target.value)} style={{flex:1}}/><span style={{fontSize:9,color:txM,width:28}}>{ptPct}%</span></Row>
            </Sec><Sec t={lang==="TR"?"Bilgi":"Info"}>
              <div style={{fontSize:9,color:txM,lineHeight:1.8}}>
                {[[lang==="TR"?"Orijinal":"Original",`${(data.nOrig/1e6).toFixed(2)}M`],[lang==="TR"?"Yüklü":"Loaded",`${(aP.x.length/1e3).toFixed(0)}K`],
                  ["X",`${aB.x0.toFixed(1)}→${aB.x1.toFixed(1)}`],["Y",`${aB.y0.toFixed(1)}→${aB.y1.toFixed(1)}`],["Z",`${aB.z0.toFixed(1)}→${aB.z1.toFixed(1)}`],
                  [lang==="TR"?"Alan":"Area",`${((aB.x1-aB.x0)*(aB.y1-aB.y0)).toFixed(0)} m²`]].map(([k,v])=>
                  <div key={k} style={{display:"flex",justifyContent:"space-between"}}><span>{k}</span><span style={{color:tx}}>{v}</span></div>)}
              </div></Sec></>)}

            {tab==="clip"&&view==="3d"&&<Sec t="Clip"><div style={{fontSize:10,color:og,padding:8,background:og+"11",borderRadius:4}}>⚠ {lang==="TR"?"2D'ye geçin":"Switch to 2D"}</div></Sec>}
            {tab==="clip"&&view==="2d"&&!clp&&(<Sec t={lang==="TR"?"Kesme":"Clip"}>
              <div style={{display:"flex",gap:4,marginBottom:6}}><button style={B(cs==="circle")} onClick={()=>setCS("circle")}>⊚</button><button style={B(cs==="rect")} onClick={()=>setCS("rect")}>◻</button></div>
              <Row l="R (m)"><input type="number" value={cr} onChange={e=>setCR(+e.target.value)} style={I} min={1} max={500}/><input type="range" value={cr} onChange={e=>setCR(+e.target.value)} min={1} max={200} style={{flex:1}}/></Row>
              {cc&&<div style={{fontSize:9,color:txM}}>({cc.x.toFixed(1)}, {cc.y.toFixed(1)})</div>}
              <button style={{...B(!!cc),width:"100%",marginTop:4,opacity:cc?1:.35}} onClick={doClip} disabled={!cc}>✂ {lang==="TR"?"Kes":"Cut"}</button>
            </Sec>)}
            {tab==="clip"&&clp&&<Sec t="Clip"><div style={{color:gn,fontSize:10}}>✓ {clp.x.length.toLocaleString()}</div></Sec>}

            {tab==="seg"&&view==="3d"&&<Sec t="Seg"><div style={{fontSize:10,color:og,padding:8,background:og+"11",borderRadius:4}}>⚠ 2D</div></Sec>}
            {tab==="seg"&&view==="2d"&&(<Sec t={lang==="TR"?"Segmentasyon":"Segmentation"}>
              <Row l={lang==="TR"?"Hücre":"Cell"}><input type="number" value={sCell} onChange={e=>setSCell(+e.target.value)} style={I} min={.1} max={5} step={.1}/></Row>
              <Row l="Min H"><input type="number" value={sMinH} onChange={e=>setSMinH(+e.target.value)} style={I} min={.5} max={15} step={.5}/></Row>
              <Row l="Search R"><input type="number" value={sSR} onChange={e=>setSSR(+e.target.value)} style={I} min={.5} max={20} step={.5}/></Row>
              <button style={{...B(true),width:"100%",marginTop:4}} onClick={doSeg}>▶ {lang==="TR"?"Çalıştır":"Run"}</button>
              {segs&&<div style={{color:gn,fontSize:10,marginTop:4}}>{segs.count} {lang==="TR"?"ağaç":"trees"}</div>}
            </Sec>)}

            {tab==="metrics"&&(<Sec t={lang==="TR"?"Metrikler":"Metrics"}>
              {!met?<div style={{fontSize:10,color:txD}}>{lang==="TR"?"Segmentasyon yapın":"Run segmentation"}</div>:(
                <div style={{overflowX:"auto"}}><button style={{...B(true),marginBottom:6,fontSize:9}} onClick={exportCSV}>📥 CSV</button>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:8}}>
                    <thead><tr>{["#","H","CD","DBH₁","DBH₂","H₂","CD₂","N"].map(h=><th key={h} style={{textAlign:"left",padding:"2px",borderBottom:`1px solid ${bd}`,color:txD,fontWeight:500}}>{h}</th>)}</tr></thead>
                    <tbody>{met.slice(0,200).map((m,i)=>(
                      <tr key={m.id} style={{background:sel===m.id?ac+"15":i%2===0?"transparent":bd+"22",cursor:"pointer"}} onClick={()=>{setSel(sel===m.id?null:m.id);setCMode("segment");}}>
                        <td style={{padding:"2px",color:COL[(m.id-1)%COL.length],fontWeight:700}}>{m.id}</td>
                        <td style={{padding:"2px"}}>{m.h.toFixed(1)}</td><td style={{padding:"2px"}}>{m.cd.toFixed(1)}</td>
                        <td style={{padding:"2px",color:gn}}>{m.dbhModel?.toFixed(1)||"–"}</td>
                        <td style={{padding:"1px"}}><input value={m.dbhManual} onChange={e=>updateMet(m.id,"dbhManual",e.target.value)} style={{...I,width:28,padding:"1px 2px"}}/></td>
                        <td style={{padding:"1px"}}><input value={m.hManual} onChange={e=>updateMet(m.id,"hManual",e.target.value)} style={{...I,width:28,padding:"1px 2px"}}/></td>
                        <td style={{padding:"1px"}}><input value={m.cdManual} onChange={e=>updateMet(m.id,"cdManual",e.target.value)} style={{...I,width:28,padding:"1px 2px"}}/></td>
                        <td style={{padding:"2px"}}>{m.cnt}</td>
                      </tr>))}</tbody></table>
                  <div style={{fontSize:8,color:txD,marginTop:4}}>DBH₁=Model | DBH₂/H₂/CD₂=Manuel</div></div>)}
            </Sec>)}

            {tab==="area"&&(<Sec t={lang==="TR"?"Alan Bazlı":"Area-Based"}>
              {!areaMet?<div style={{fontSize:10,color:txD}}>{lang==="TR"?"Segmentasyon yapın":"Run segmentation"}</div>:(
                <div style={{fontSize:9,color:txM,lineHeight:2}}>
                  <div style={{fontSize:10,fontWeight:600,color:ac,marginBottom:4}}>{lang==="TR"?"Persentiller":"Percentiles"}</div>
                  {[["H5",areaMet.h5],["H25",areaMet.h25],["H50",areaMet.h50],["H75",areaMet.h75],["H95",areaMet.h95],["H99",areaMet.h99]].map(([k,v])=>
                    <div key={k} style={{display:"flex",justifyContent:"space-between"}}><span>{k}</span><span style={{color:tx}}>{v.toFixed(2)} m</span></div>)}
                  <div style={{fontSize:10,fontWeight:600,color:ac,marginTop:8,marginBottom:4}}>{lang==="TR"?"İstatistik":"Statistics"}</div>
                  {[["Mean",areaMet.h_mean,"m"],["Max",areaMet.h_max,"m"],["SD",areaMet.h_sd,"m"],["CV",areaMet.cv_h,"%"],["Kurtosis",areaMet.kurtosis,""],["IQR",areaMet.iqr,"m"]].map(([k,v,u])=>
                    <div key={k} style={{display:"flex",justifyContent:"space-between"}}><span>{k}</span><span style={{color:tx}}>{v.toFixed(2)} {u}</span></div>)}
                  <div style={{fontSize:10,fontWeight:600,color:ac,marginTop:8,marginBottom:4}}>{lang==="TR"?"Yoğunluk":"Density"}</div>
                  {[["D1",areaMet.d1],["D3",areaMet.d3],["D5",areaMet.d5],["D7",areaMet.d7],["D9",areaMet.d9],["CC₁.₃",areaMet.cc13]].map(([k,v])=>
                    <div key={k} style={{display:"flex",justifyContent:"space-between"}}><span>{k}</span><span style={{color:tx}}>{(v*100).toFixed(1)}%</span></div>)}
                  <div style={{fontSize:10,fontWeight:600,color:ac,marginTop:8,marginBottom:4}}>ITC</div>
                  {[[lang==="TR"?"Ağaç":"Trees",areaMet.itc_n],["Max",areaMet.itc_max.toFixed(1)+" m"],["Min",areaMet.itc_min.toFixed(1)+" m"],["Mean",areaMet.itc_mean.toFixed(1)+" m"],
                    [lang==="TR"?"Yoğunluk":"Density",areaMet.density.toFixed(0)+" N/ha"]].map(([k,v])=>
                    <div key={k} style={{display:"flex",justifyContent:"space-between"}}><span>{k}</span><span style={{color:tx}}>{v}</span></div>)}
                </div>)}
            </Sec>)}

            {tab==="stats"&&(<Sec t={lang==="TR"?"İstatistik":"Statistics"}>
              {!met?<div style={{fontSize:10,color:txD}}>{lang==="TR"?"Segmentasyon yapın":"Run segmentation"}</div>:(()=>{
                const wH=met.filter(m=>m.hManual&&m.hManual!==""&&!isNaN(+m.hManual));
                const wC=met.filter(m=>m.cdManual&&m.cdManual!==""&&!isNaN(+m.cdManual));
                const wD=met.filter(m=>m.dbhManual&&m.dbhManual!==""&&!isNaN(+m.dbhManual)&&m.dbhModel);
                const SB=({label,s})=>!s?<div style={{fontSize:9,color:txD,marginBottom:6}}>{label}: min 3</div>:(
                  <div style={{marginBottom:8,padding:6,background:dk,borderRadius:4}}><div style={{fontSize:10,fontWeight:600,color:ac,marginBottom:4}}>{label} (n={s.n})</div>
                    <div style={{fontSize:9,color:txM,lineHeight:1.8}}>{[["RMSE",s.rmse],["Bias",s.bias],["R²",s.r2],["t",s.t],["p",s.p]].map(([k,v])=>
                      <div key={k} style={{display:"flex",justifyContent:"space-between"}}><span>{k}</span><span style={{color:k==="p"?(v==="<0.001"?"#ef4444":+v<.05?og:gn):tx}}>{v}</span></div>)}</div></div>);
                return(<><div style={{fontSize:9,color:txD,marginBottom:8}}>{lang==="TR"?"Metrik tablosuna değer girin":"Enter values in metrics table"}</div>
                  <SB label="H" s={calcStats(wH.map(m=>({a:+m.hManual,b:m.h})))}/><SB label="CD" s={calcStats(wC.map(m=>({a:+m.cdManual,b:m.cd})))}/><SB label="DBH" s={calcStats(wD.map(m=>({a:+m.dbhManual,b:m.dbhModel})))}/></>);
              })()}</Sec>)}

            {tab==="species"&&(<Sec t={lang==="TR"?"Tür":"Species"}>
              <select style={{...I,width:"100%",marginBottom:6}} value={sp} onChange={e=>setSp(e.target.value)}>{SPECIES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <button style={{...B(true),width:"100%"}} onClick={applySp} disabled={!met}>{lang==="TR"?"Uygula":"Apply"}</button>
            </Sec>)}

            {tab==="transect"&&(<Sec t="Transect">
              <div style={{fontSize:9,color:txD,marginBottom:6}}>{lang==="TR"?"2D'de 2 nokta tıkla":"Click 2 points on 2D"}</div>
              <button style={{...B(!tMode),width:"100%",marginBottom:4}} onClick={()=>{setTMode(true);setTP1(null);setTP2(null);setTData(null);}}>✏ {lang==="TR"?"Çiz":"Draw"}</button>
              {tP1&&!tP2&&<div style={{fontSize:9,color:og}}>P1 ✓</div>}
              {tData&&<div style={{fontSize:9,color:gn}}>{tData.length} pts</div>}
              <button style={{...B(false),width:"100%",marginTop:4}} onClick={()=>{setTP1(null);setTP2(null);setTData(null);}}>🗑</button>
            </Sec>)}
          </div>
        </div>
      </div>
    </div>);
}
function Sec({t,children}){return(<div><div style={{fontSize:10,fontWeight:700,color:"#22d3ee",marginBottom:5,letterSpacing:.3,textTransform:"uppercase"}}>{t}</div>{children}</div>);}
function Row({l,children}){return(<div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}><span style={{fontSize:9,color:"#7b8594",minWidth:65}}>{l}</span>{children}</div>);}
