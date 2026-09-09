import assert from 'node:assert/strict';
import { build } from 'esbuild';

globalThis.window = { addEventListener() {}, removeEventListener() {} };
await build({entryPoints:['src/ui/AttackPanel.ts'],bundle:true,platform:'node',format:'esm',outfile:'.test-build/AttackPanel.mjs'});
const { AttackPanel } = await import('../.test-build/AttackPanel.mjs');
const state=window.__DOMINION_GAME_STATE__;
const panel=Object.create(AttackPanel.prototype);
state.yourFactionId=101;
state.fronts=new Map([
  [11,{frontId:11,isCombatActive:true,attackerFaction:101,sourceCellIndex:10,targetCellIndex:20}],
  [12,{frontId:12,isCombatActive:true,attackerFaction:101,sourceCellIndex:30,targetCellIndex:40}],
]);
state.selectionContext={action:'LAUNCH_OFFENSIVE',sourceCell:50,targetCell:60};
assert.equal(panel.activeFront(),undefined,'new target must not be swallowed by an existing offensive');
state.selectionContext={action:'LAUNCH_OFFENSIVE',sourceCell:30,targetCell:40};
assert.equal(panel.activeFront().frontId,12,'selected local front controls reinforcement/halt');
state.selectionContext={action:'DEFEND',sourceCell:70,targetCell:null};
assert.equal(panel.activeFront(),undefined,'own defense selection must not open unrelated attack');
state.selectionContext=null;state.activeFrontId=12;
assert.equal(panel.activeFront().frontId,12);

await build({entryPoints:['src/render/WorldInputController.ts'],bundle:true,packages:'external',platform:'node',format:'esm',outfile:'.test-build/WorldInputController.mjs'});
const { WorldInputController }=await import('../.test-build/WorldInputController.mjs');
const events=new Map();
const canvas={style:{},setPointerCapture(){},addEventListener(name,fn){events.set(name,fn)},removeEventListener(name){events.delete(name)},getBoundingClientRect(){return {left:0,top:0}}};
const container={x:0,y:0,scale:{x:1,set(v){this.x=v}},toLocal(p){return p}};
const input=new WorldInputController(container,canvas);
let clicks=0;input.onFlatPick=()=>clicks++;input.setup();
const send=(type,pointerId=1,button=0)=>events.get(type)?.({type,pointerId,button,clientX:10,clientY:10});
send('pointerdown');send('pointerup');assert.equal(clicks,1);
send('pointerdown');send('pointercancel');assert.equal(clicks,1,'cancel is not a land selection');
send('pointerup',99);assert.equal(clicks,1,'untracked up is not a click');
send('pointerdown',1,2);send('pointerup',1,2);assert.equal(clicks,1,'right button is not a command');
send('pointerdown',1);send('pointerdown',2);send('pointerup',2);send('pointerup',1);
assert.equal(clicks,1,'two-finger gesture must not produce a stray tap');
input.destroy();assert.equal(events.size,0);
console.log('PASS: exact-front selection, concurrent offensive UI, cancelled/untracked/right-button input, two-finger gesture');
