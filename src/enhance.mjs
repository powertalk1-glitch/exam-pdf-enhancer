export function enhance(input,width,height,settings={}) {
 const {mode='bw',threshold=205,strength=50,background=15,thicken=0}=settings;
 const out=new Uint8ClampedArray(input.length);
 const white=255-background;
 for(let i=0;i<input.length;i+=4){
  const a=input[i+3]/255;
  let g=(input[i]*0.299+input[i+1]*0.587+input[i+2]*0.114)*a+255*(1-a);
  g=g>=white?255:g;
  g=mode==='bw'?(g<threshold?0:255):Math.max(0,255-(255-g)*(1+strength/35));
  out[i]=out[i+1]=out[i+2]=g;out[i+3]=255;
 }
 if(thicken){
  const copy=out.slice();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   let v=copy[(y*width+x)*4];
   for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]]){
    const xx=x+dx,yy=y+dy;
    if(xx>=0&&yy>=0&&xx<width&&yy<height)v=Math.min(v,copy[(yy*width+xx)*4]);
   }
   const i=(y*width+x)*4;out[i]=out[i+1]=out[i+2]=v;
  }
 }
 return out;
}
