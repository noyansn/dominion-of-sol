import fs from 'node:fs';
import path from 'node:path';
import { fromFile } from 'geotiff';

const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'tools','data','NE2_50M_SR','NE2_50M_SR','NE2_50M_SR.tif');
const maskPath=path.join(root,'client','src','assets','world_visual_mask.bin');
const output=path.join(root,'client','src','assets','world_relief.rgba');
const width=2048,height=1024,maskWidth=4096;
if(!fs.existsSync(source))throw new Error(`Missing ${source}; extract the official Natural Earth archive first.`);
const tiff=await fromFile(source);const image=await tiff.getImage();
const raster=await image.readRasters({width,height,interleave:true,resampleMethod:'bilinear'});
const samples=image.getSamplesPerPixel();if(samples<3)throw new Error(`Expected RGB source, got ${samples} samples.`);
const mask=fs.readFileSync(maskPath);const rgba=Buffer.alloc(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,src=i*samples,out=i*4,mx=x*2,my=y*2;
  const alpha=Math.round((mask[my*maskWidth+mx]+mask[my*maskWidth+mx+1]+mask[(my+1)*maskWidth+mx]+mask[(my+1)*maskWidth+mx+1])/4);
  const sr=raster[src],sg=raster[src+1],sb=raster[src+2],luminance=sr*0.24+sg*0.62+sb*0.14;
  rgba[out]=Math.max(0,Math.min(255,Math.round(18+sr*0.30+luminance*0.05)));
  rgba[out+1]=Math.max(0,Math.min(255,Math.round(23+sg*0.32+luminance*0.04)));
  rgba[out+2]=Math.max(0,Math.min(255,Math.round(22+sb*0.25+luminance*0.03)));
  rgba[out+3]=alpha;
}
fs.writeFileSync(output,rgba);
console.log(JSON.stringify({source:image.getWidth()+'x'+image.getHeight(),output:width+'x'+height,bytes:rgba.length}));
