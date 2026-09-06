import * as PIXI from 'pixi.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './WorldSpace';
import worldReliefUrl from '../assets/world_relief.rgba?url';

export class StrategicTerrainRenderer {
  public container=new PIXI.Container();
  private sprite!:PIXI.Sprite;

  public async init(){
    const width=2048,height=1024;
    const response=await fetch(worldReliefUrl);
    if(!response.ok)throw new Error(`Relief atlas request failed: ${response.status}`);
    const pixels=new Uint8Array(await response.arrayBuffer());
    if(pixels.length!==width*height*4)throw new Error(`Invalid relief atlas: ${pixels.length}`);
    const source=new PIXI.BufferImageSource({resource:pixels,width,height,format:'rgba8unorm',alphaMode:'no-premultiply-alpha'});
    source.style.scaleMode='linear';
    this.sprite=new PIXI.Sprite(new PIXI.Texture({source}));
    this.sprite.width=WORLD_WIDTH;this.sprite.height=WORLD_HEIGHT;this.sprite.alpha=0.98;
    this.container.addChild(this.sprite);
  }

  public updateLOD(lod:'FAR'|'MEDIUM'|'CLOSE'){
    this.sprite.alpha=lod==='FAR'?0.90:0.98;
  }
}
