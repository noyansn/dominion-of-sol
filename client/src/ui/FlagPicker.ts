const FLAGS=[
  ['flag_sol','SOL','#3b82f6'],['flag_vanguard','VGD','#ef4444'],['flag_verdant','VRD','#10b981'],['flag_solaris','SUN','#f59e0b'],
  ['flag_aether','AET','#8b5cf6'],['flag_pact','PCT','#ec4899'],['flag_nordic','NRD','#06b6d4'],['flag_obsidian','OBS','#84cc16']
] as const;

export class FlagPicker{
  async choose():Promise<string>{
    const root=document.getElementById('flag-picker');const grid=document.getElementById('flag-grid');
    if(!root||!grid)return 'flag_sol';
    const existing=localStorage.getItem('dominion.flag');
    return new Promise(resolve=>{
      grid.replaceChildren();
      for(const [id,label,color] of FLAGS){const button=document.createElement('button');button.className='flag-choice';button.dataset.selected=String(existing===id);button.innerHTML=`<span class="flag-swatch" style="--flag:${color}">${label}</span><span>${label}</span>`;
        button.onclick=()=>{localStorage.setItem('dominion.flag',id);root.style.display='none';this.updateBadge(id,label,color);resolve(id)};grid.appendChild(button)}
      root.style.display='grid';
    });
  }
  private updateBadge(id:string,label:string,color:string){const badge=document.getElementById('player-flag-badge');if(badge){badge.textContent=label;badge.style.borderColor=color;badge.style.color=color;badge.dataset.flag=id}}
}
