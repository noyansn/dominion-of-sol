// Local QA only. Drives a separate, explicitly launched normal Chrome profile.
// Never installs browser software or writes fabricated game state.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const WebSocket = require('ws');
const mode = process.argv[2] ?? 'inspect';
const view = process.argv[3] ?? 'WORLD';
const port = Number(process.argv[4] ?? 9231);
const output = new URL('../benchmarks/p0-recovery-20260831/', import.meta.url);
await mkdir(output, { recursive: true });
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find(t => t.type === 'page' && t.url.startsWith('http://127.0.0.1:5200/'));
if (!page) throw Error('Dominion QA page missing');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
let id = 0;
const pending = new Map();
ws.on('message', raw => {
  const m = JSON.parse(raw);
  if (!pending.has(m.id)) return;
  const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer);
  if (m.error) p.reject(Error(JSON.stringify(m.error))); else p.resolve(m.result);
});
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(Error(`CDP timeout: ${method}`)); }, 25000);
    pending.set(requestId, { resolve, reject, timer });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready() {
  for (let i = 0; i < 60; i++) {
    if (await evaluate('Boolean(window.__DOMINION_GAME_STATE__?.isInitialized && window.__DOMINION_GAME_STATE__.isConnected && window.__DOMINION_GAME_STATE__.factions.size===101 && window.__DOMINION_BENCHMARK__ && window.__DOMINION_RENDERER__?.inputController?.onFlatPick && window.__DEV_RENDER_STATE__?.firstPopulatedFrame)')) return;
    await delay(500);
  }
  throw Error('Connected 101-faction snapshot not ready');
}
async function screenshot(name) {
  await evaluate('document.getElementById("dominion-benchmark-panel").hidden=true');
  const shot = await command('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL(name + '.png', output), Buffer.from(shot.data, 'base64'));
}
async function candidates() {
  return evaluate(`(async()=>{
    const {resolveTargetAtWorld}=await import('/src/game/TargetResolver.ts');
    const s=window.__DOMINION_GAME_STATE__,n=s.totalCells,w=s.width;
    const adj=i=>[i>=w?i-w:-1,i%w+1<w?i+1:-1,i+w<n?i+w:-1,i%w>0?i-1:-1].filter(i=>i>=0);
    const neutral=[],hostile=[],ownBorder=[],ownCoast=[];
    function point(cell){const x=cell%w,y=Math.floor(cell/w);for(let py=0;py<4;py++)for(let px=0;px<4;px++){
      const wx=x+(px+.5)/4,wy=y+(py+.5)/4,c=resolveTargetAtWorld(s,wx,wy);
      if(c.canonicalLand&&c.resolvedCell===cell)return {cell,x:wx,y:wy,action:c.action,relation:c.relation,source:c.sourceCell};}return null;}
    const seen=new Uint8Array(n),queue=new Int32Array(n),parent=new Int32Array(n);parent.fill(-1);let head=0,tail=0;
    for(let i=0;i<n;i++)if(s.cellOwners[i]===s.yourFactionId&&s.cellTerrains[i]===0){
      queue[tail++]=i;seen[i]=1;
      if(adj(i).some(j=>s.cellOwners[j]!==s.yourFactionId&&s.cellTerrains[j]===0)&&ownBorder.length<10){const p=point(i);if(p)ownBorder.push(p);}
      if(adj(i).some(j=>s.cellTerrains[j]===2)&&ownCoast.length<10){const p=point(i);if(p)ownCoast.push(p);}
      for(const j of adj(i))if(s.cellTerrains[j]===0&&s.cellOwners[j]!==s.yourFactionId){
        const list=s.cellOwners[j]===0?neutral:hostile;
        if(list.length<10&&!list.some(p=>p.cell===j)){const p=point(j);if(p)list.push(p);}
      }
    }
    let enemy=-1;
    while(head<tail&&enemy<0){const i=queue[head++];for(const j of adj(i)){
      if(seen[j]||s.cellTerrains[j]!==0)continue;seen[j]=1;parent[j]=i;
      if(s.cellOwners[j]>0&&s.cellOwners[j]!==s.yourFactionId){enemy=j;break;}queue[tail++]=j;
    }}
    const path=[];for(let p=enemy;p>=0&&s.cellOwners[p]!==s.yourFactionId;p=parent[p])path.push(p);
    return {neutral,hostile,ownBorder,ownCoast,nearestEnemy:enemy,pathLength:path.length,
      contactStart:path.length>1?point(path[1]):null,
      nextExpansion:path.length>1?point(path[path.length-1]):null,population:s.factions.get(s.yourFactionId)?.population};
  })()`);
}
async function clickPoint(point) {
  const screen = await evaluate(`(()=>{const r=window.__DOMINION_RENDERER__,x=${point.x},y=${point.y};
    r.worldContainer.scale.set(16);r.worldContainer.position.set(innerWidth/2-x*16,innerHeight/2-y*16);r.updateScreenSpaceOverlays();
    return {x:innerWidth/2,y:innerHeight/2}})()`);
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: screen.x, y: screen.y, button: 'left', clickCount: 1 });
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: screen.x, y: screen.y, button: 'left', clickCount: 1 });
  return evaluate('window.__DOMINION_GAME_STATE__.selectionContext');
}
try {
  await command('Page.bringToFront');
  if (mode === 'runtime-state') {
    console.log(JSON.stringify(await evaluate(`(()=>({
      href:location.href,
      readyState:document.readyState,
      boot:window.__DEV_NET_TELEMETRY__,
      game:window.__DOMINION_GAME_STATE__ ? {
        initialized:window.__DOMINION_GAME_STATE__.isInitialized,
        connected:window.__DOMINION_GAME_STATE__.isConnected,
        factions:window.__DOMINION_GAME_STATE__.factions?.size,
        visualMask:window.__DOMINION_GAME_STATE__.visualMaskReady,
      } : null,
      renderer:window.__DOMINION_RENDERER__ ? {created:true,firstFrame:window.__DEV_RENDER_STATE__?.firstPopulatedFrame} : null,
      errors:[...document.querySelectorAll('body *')].filter(e=>/error|failed|exception/i.test(e.textContent||'')).slice(0,5).map(e=>e.textContent?.slice(0,200))
    }))()`),null,2));
    process.exit(0);
  }
  await ready();
  if (mode === 'input-debug') {
    console.log(JSON.stringify(await evaluate(`(()=>{const x=innerWidth/2,y=innerHeight/2;return {
      elements:document.elementsFromPoint(x,y).map(e=>({tag:e.tagName,id:e.id,classes:e.className,pointer:getComputedStyle(e).pointerEvents,rect:e.getBoundingClientRect().toJSON()})),
      canvas:[...document.querySelectorAll('canvas')].map(e=>({rect:e.getBoundingClientRect().toJSON(),pointer:getComputedStyle(e).pointerEvents})),
      controller:!!window.__DOMINION_RENDERER__?.inputController,boot:window.__DEV_NET_TELEMETRY__}})()`),null,2));
  } else if (mode === 'inspect') {
    console.log(JSON.stringify(await evaluate(`(()=>{const s=window.__DOMINION_GAME_STATE__,r=window.__DOMINION_RENDERER__;
      return {player:s.factions.get(s.yourFactionId),nations:s.factions.size,fronts:[...s.fronts.values()].filter(f=>f.isCombatActive),
      camera:[r.worldContainer.x,r.worldContainer.y,r.worldContainer.scale.x],viewport:[innerWidth,innerHeight,devicePixelRatio],
      colorUploadPixels:r.politicalColorTexture.source.uploadedPixels,colorTexture:[r.politicalColorTexture.source.width,r.politicalColorTexture.source.height],
      borders:{rebuilt:r.political.rebuiltChunks,pending:r.political.pendingChunkCount}}})()`), null, 2));
  } else if (mode === 'candidates') {
    console.log(JSON.stringify(await candidates(), null, 2));
  } else if (mode === 'prepare-strong-contact') {
    const choice=await evaluate(`(()=>{const s=window.__DOMINION_GAME_STATE__,w=s.width,n=s.totalCells;
      const factions=[...s.factions.values()].filter(f=>f.factionId!==101&&!f.isEliminated).sort((a,b)=>b.population-a.population);
      const adj=i=>[i>=w?i-w:-1,i%w+1<w?i+1:-1,i+w<n?i+w:-1,i%w>0?i-1:-1].filter(i=>i>=0);
      for(const f of factions)for(let i=0;i<n;i++)if(s.cellOwners[i]===f.factionId&&s.cellTerrains[i]===0){
        for(const j of adj(i))if(s.cellOwners[j]===0&&s.cellTerrains[j]===0){
          if([[j,j+1,j+w,j+w+1],[j,j-1,j+w,j+w-1],[j,j+1,j-w,j-w+1],[j,j-1,j-w,j-w-1]].some(a=>a.every(k=>k>=0&&k<n&&s.cellTerrains[k]===0&&s.cellOwners[k]===0)))return {cell:j,enemy:f.factionId,population:f.population};
        }
      }return null})()`);
    if(!choice)throw Error('No safe strong-enemy contact start');
    await evaluate(`localStorage.setItem('dominion.startCell',${JSON.stringify(String(choice.cell))});true`);
    await command('Page.reload');await delay(1000);await ready();
    console.log(JSON.stringify({choice,state:await candidates()},null,2));
  } else if (mode === 'prepare-contact') {
    const c=await candidates();
    if(!c.contactStart)throw Error('No neutral contact start');
    const cell=c.contactStart.cell;
    const safe=await evaluate(`(()=>{const s=window.__DOMINION_GAME_STATE__,i=${cell},w=s.width;
      return [[i,i+1,i+w,i+w+1],[i,i-1,i+w,i+w-1],[i,i+1,i-w,i-w+1],[i,i-1,i-w,i-w-1]].some(a=>a.every(j=>j>=0&&j<s.totalCells&&s.cellTerrains[j]===0&&s.cellOwners[j]===0))})()`);
    if(!safe)throw Error('Contact start lacks a guaranteed neutral 2x2 core; refusing relocation');
    // This profile belongs exclusively to this QA run. Use the existing
    // custom-nation start preference and normal reload/join path.
    await evaluate(`localStorage.setItem('dominion.startCell',${JSON.stringify(String(cell))});true`);
    await command('Page.reload');
    await delay(1000); await ready();
    console.log(JSON.stringify({requestedStart:cell,state:await candidates()},null,2));
  } else if (mode === 'prepare-neutral-start') {
    // QA-only: choose a genuinely sparse, all-neutral land core before the
    // server starts its next fresh match.  This lets the click acceptance
    // route exercise a player frontier against neutral territory instead of
    // relying on whichever preset happens to be under the current player.
    const choice=await evaluate(`(()=>{const s=window.__DOMINION_GAME_STATE__,w=s.width,n=s.totalCells;
      const landNeutral=i=>i>=0&&i<n&&s.cellTerrains[i]===0&&s.cellOwners[i]===0;
      for(let y=3;y<s.height-3;y+=3)for(let x=3;x<w-3;x+=3){
        const c=y*w+x; let clear=true;
        for(let dy=-2;dy<=2&&clear;dy++)for(let dx=-2;dx<=2;dx++)if(!landNeutral(c+dy*w+dx)){clear=false;break;}
        if(clear)return {cell:c,x,y};
      } return null})()`);
    if(!choice)throw Error('No sparse neutral land core found');
    await evaluate(`localStorage.setItem('dominion.startCell',${JSON.stringify(String(choice.cell))});true`);
    console.log(JSON.stringify({requestedStart:choice.cell, note:'Restart the QA server for this fresh-match start preference to apply.'},null,2));
  } else if (mode === 'pick-neutral' || mode === 'pick-hostile') {
    const list=(await candidates())[mode==='pick-neutral'?'neutral':'hostile'];
    const results=[];
    for(const point of list)results.push({point,result:await clickPoint(point)});
    await writeFile(new URL(mode+'.json',output),JSON.stringify(results,null,2));
    console.log(JSON.stringify({tested:results.length,success:results.filter(r=>r.result?.action===(mode==='pick-neutral'?'NEUTRAL_EXPANSION':'LAUNCH_OFFENSIVE')).length,results},null,2));
  } else if (mode === 'expand-once') {
    const point=(await candidates()).neutral[0];
    if(!point) throw Error('No adjacent neutral visual-land target');
    const selection=await clickPoint(point);
    if(selection?.action!=='NEUTRAL_EXPANSION') throw Error(`Neutral click did not resolve expansion: ${selection?.action}`);
    const before=await evaluate('window.__DOMINION_GAME_STATE__.factions.get(101).population');
    const clicked=await evaluate(`(()=>{const b=document.getElementById('btn-expand-frontier');if(!b||b.disabled)return false;b.click();return true})()`);
    if(!clicked) throw Error('Expansion control was unavailable after a valid neutral target click');
    let owned=false;
    for(let i=0;i<40;i++){await delay(200);owned=await evaluate(`window.__DOMINION_GAME_STATE__.cellOwners[${point.cell}]===101`);if(owned)break;}
    const after=await evaluate('window.__DOMINION_GAME_STATE__.factions.get(101).population');
    console.log(JSON.stringify({target:point.cell, selection, controlAccepted:clicked, ownershipProgressed:owned, beforePopulation:before, afterPopulation:after},null,2));
  } else if (mode === 'expand-route') {
    const results=[];
    for(let i=0;i<15;i++){
      const c=await candidates();
      if(c.hostile.length || !c.nextExpansion || c.population<15000)break;
      const selection=await clickPoint(c.nextExpansion);
      if(selection?.action!=='NEUTRAL_EXPANSION'){results.push({selection,stopped:'No legal visual expansion'});break;}
      const sent=await evaluate(`(()=>{const b=document.getElementById('btn-expand-frontier');if(!b||b.disabled)return false;b.click();return true})()`);
      if(!sent)throw Error('Expansion UI disabled');
      let owned=false;
      for(let j=0;j<20;j++){await delay(200);owned=await evaluate('window.__DOMINION_GAME_STATE__.cellOwners['+c.nextExpansion.cell+']===101');if(owned)break;}
      results.push({target:c.nextExpansion.cell,beforePopulation:c.population,owned});
      console.log('Expansion',i+1,results.at(-1));
      if(!owned)break;
    }
    await writeFile(new URL('expansion-route.json',output),JSON.stringify(results,null,2));
    console.log(JSON.stringify(await candidates(),null,2));
  } else if (mode === 'start-war') {
    const count = view === 'MULTI_WAR' ? 3 : 1;
    const log=[];
    for(let i=0;i<count;i++) {
      const points=(await candidates()).hostile;
      const existing=await evaluate('[...window.__DOMINION_GAME_STATE__.fronts.values()].filter(f=>f.isCombatActive&&f.attackerFaction===101).map(f=>f.targetCellIndex)');
      // Nearby orders deliberately reinforce the same local operation. For
      // the multi-front acceptance path choose a target beyond that exact
      // bounded merge radius, preserving genuinely independent geography.
      const point=points.toReversed().find(p=>!existing.some(cell=>{
        const dx=Math.abs((p.cell%1024)-(cell%1024));
        const dy=Math.abs(Math.floor(p.cell/1024)-Math.floor(cell/1024));
        return dx+dy<=3;
      }));
      if(!point)throw Error('No independent legal hostile point');
      const selection=await clickPoint(point);
      const sent=await evaluate(`(()=>{const slider=document.getElementById('attack-commitment');slider.value='5';slider.dispatchEvent(new Event('input'));
        const b=document.getElementById('btn-launch-attack');if(!b||b.disabled||getComputedStyle(b).display==='none')return false;b.click();return true})()`);
      if(!sent)throw Error('Selected target launch UI unavailable');
      await delay(500);
      const outcome=await evaluate('window.__DOMINION_GAME_STATE__.lastAttackResult');
      const front=await evaluate('[...window.__DOMINION_GAME_STATE__.fronts.values()].find(f=>f.isCombatActive&&f.attackerFaction===101&&f.frontId==='+Number(outcome?.frontId ?? -1)+')');
      if(!front)throw Error('No real server front for selected target: '+JSON.stringify(await evaluate('({result:window.__DOMINION_GAME_STATE__.lastAttackResult,fronts:[...window.__DOMINION_GAME_STATE__.fronts.values()].filter(f=>f.attackerFaction===101),selection:window.__DOMINION_GAME_STATE__.selectionContext})')));
      if(view==='MULTI_WAR'&&log.some(entry=>entry.outcome.frontId===outcome.frontId))throw Error('Nearby front merge unexpectedly selected for independent multi-front QA');
      log.push({selection,outcome,front});
    }
    await writeFile(new URL(view.toLowerCase()+'-orders.json',output),JSON.stringify(log,null,2));
    await screenshot(view.toLowerCase()+'-live');
    console.log(JSON.stringify(log,null,2));
  } else if (mode === 'benchmark') {
    const mobile = /^(390x844|844x390)$/.test(process.argv[5] ?? '') ? process.argv[5].split('x').map(Number) : null;
    if (mobile) {
      await command('Emulation.setDeviceMetricsOverride', { width: mobile[0], height: mobile[1], deviceScaleFactor: 2, mobile: false });
      await evaluate(`window.__DOMINION_RENDER_PROFILE__.setMode('MOBILE_PROXY')`);
    } else {
      await command('Emulation.setDeviceMetricsOverride', {width:1536,height:776,deviceScaleFactor:1.25,mobile:false});
      await evaluate(`window.__DOMINION_RENDER_PROFILE__.setMode('DESKTOP')`);
    }
    console.log('Preparing', view, mobile ?? 'desktop');
    await evaluate(`(()=>{const r=window.__DOMINION_RENDERER__;r.setGlobeMode(false);
      document.getElementById('dominion-benchmark-panel').hidden=true;
      const views={REGIONAL:[554,126,8],CLOSE:[600,142,24]};const v=views[${JSON.stringify(view)}];
      if (${JSON.stringify(view)}==='WORLD')r.fitWorldToScreen();
      else if(v){r.worldContainer.scale.set(v[2]);r.worldContainer.position.set(innerWidth/2-v[0]*v[2],innerHeight/2-v[1]*v[2]);r.updateScreenSpaceOverlays();}
      else if(/WAR/.test(${JSON.stringify(view)})) {
        const s=window.__DOMINION_GAME_STATE__,fronts=[...s.fronts.values()].filter(f=>f.isCombatActive&&f.attackerFaction===101);
        if(!fronts.length)throw Error('No player combat to frame');
        const x=fronts.reduce((sum,f)=>sum+f.targetCellIndex%s.width+.5,0)/fronts.length;
        const y=fronts.reduce((sum,f)=>sum+Math.floor(f.targetCellIndex/s.width)+.5,0)/fronts.length;
        r.worldContainer.scale.set(12);r.worldContainer.position.set(innerWidth/2-x*12,innerHeight/2-y*12);r.updateScreenSpaceOverlays();
      }
    })()`);
    await evaluate(`(async()=>{window.__p0Lod=(await import('/src/render/TerrainLodManager.ts')).terrainLodManager;return true})()`);
    let stable = 0;
    for (let i = 0; i < 60 && stable < 3; i++) {
      const state = await evaluate(`(()=>{const d=window.__p0Lod.getDebugSnapshot();return {ready:d.coverageReady,transition:d.tiles.some(t=>t.transitioning),pending:window.__DOMINION_RENDERER__.political.pendingChunkCount}})()`);
      stable = state.ready && !state.transition && state.pending === 0 ? stable + 1 : 0;
      await delay(250);
    }
    if (stable < 3) throw Error('Terrain/borders did not settle');
    const captureState=()=>evaluate('[...window.__DOMINION_GAME_STATE__.fronts.values()].filter(f=>f.attackerFaction===101).map(f=>({id:f.frontId,active:f.isCombatActive,captured:f.capturedCells,casualties:f.casualties,source:f.sourceCellIndex,target:f.targetCellIndex}))');
    const before=await captureState();
    const result = await evaluate(`window.__DOMINION_BENCHMARK__.start(10000)`);
    result.authoritativeOperations={before,after:await captureState()};
    const name = (mobile ? mobile.join('x') + '-' : '') + view.toLowerCase();
    await writeFile(new URL(name + '.json', output), JSON.stringify(result, null, 2));
    await screenshot(name);
    console.log(JSON.stringify(result, null, 2));
    if (!result.sampleValid) process.exitCode = 2;
    if (/WAR/.test(view) && result.activeCombatCoverage < 0.99) { console.error('FAIL: no sustained real combat'); process.exitCode = 2; }
    if(view==='MULTI_WAR'&&result.multiFrontFrames<result.frames*.99){console.error('FAIL: multiple fronts not sustained');process.exitCode=2;}
  }
} finally { ws.close(); }
