// DEV/FIXTURE ONLY. Rust is Dominion's sole production gameplay authority.
// Never add permanent gameplay, economy, bot, combat, terrain or diplomacy here.
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');
const WIDTH=1024, HEIGHT=512, TOTAL=WIDTH*HEIGHT, PORT=8765;
const terrain=new Uint8Array(fs.readFileSync(path.join(__dirname,'assets','world_grid.bin')));
if(terrain.length!==TOTAL) throw new Error(`world_grid.bin size ${terrain.length}, expected ${TOTAL}`);
const owners=new Uint8Array(TOTAL), flags=new Uint8Array(TOTAL);
const territoryCells=Array.from({length:102},()=>[]), dirty=new Set();
let tick=0, sequence=0;
const palette=[0x4f8dcc,0xc45f5f,0x58a878,0xd09a52,0x8a72c7,0x4fa7a7,0xb86f9c,0x7899c7,0xc47b4f,0x6b9f57,0x9b6fc1,0x4d8f88,0xc96d6d,0x7f8fc8,0xb59355,0x5d9e73,0xa86f86,0x668daf,0xc18455,0x728f5c];
function neighbors(i){const x=i%WIDTH,y=Math.floor(i/WIDTH),r=[];if(x>0)r.push(i-1);if(x+1<WIDTH)r.push(i+1);if(y>0)r.push(i-WIDTH);if(y+1<HEIGHT)r.push(i+WIDTH);return r;}
function claim(i,id){if(terrain[i]===2||owners[i]!==0)return false;owners[i]=id;territoryCells[id].push(i);dirty.add(i);return true;}
function selectSeeds(){const c=[];for(let y=16;y<HEIGHT-16;y+=12)for(let x=16;x<WIDTH-16;x+=16){const i=y*WIDTH+x;if(terrain[i]===0)c.push(i);}const s=[];for(let p=0;p<c.length&&s.length<101;p++){const i=c[(p*97)%c.length],x=i%WIDTH,y=Math.floor(i/WIDTH);if(s.every(v=>Math.hypot(x-v%WIDTH,y-Math.floor(v/WIDTH))>=22))s.push(i);}if(s.length<101)throw new Error(`Only ${s.length} valid seeds`);return s;}
const seeds=selectSeeds(), factions=[];
for(let id=1;id<=101;id++){const capital=seeds[id-1],q=[capital];let h=0;while(h<q.length&&territoryCells[id].length<20){const cur=q[h++];if(!claim(cur,id))continue;for(const n of neighbors(cur))if(terrain[n]===0&&owners[n]===0)q.push(n);}const colorInt=palette[(id-1)%palette.length];factions.push({factionId:id,displayName:id===1?'Dominion of Sol':`Nation ${String(id).padStart(3,'0')}`,factionColor:`#${colorInt.toString(16).padStart(6,'0')}`,colorInt,flagId:`flag_${id}`,capitalCell:capital,population:90000,populationCapacity:90000,populationGrowthPerSecond:18,deployedPopulation:0,totalLivingPopulation:90000,controlledAreaKm2:0,effectiveControlledAreaKm2:0,portsCount:0,doctrineDefense:.34,doctrineExpansion:.33,doctrineMaritime:.33,territoryCount:territoryCells[id].length,isHuman:id===1,isEliminated:false});}
dirty.clear();
const wss=new WebSocketServer({port:PORT,host:'127.0.0.1'});
console.log('============================================================');console.log('DOMINION OF SOL — NODE AUTHORITATIVE FALLBACK');console.log(`World: ${WIDTH}x${HEIGHT} | Factions: ${factions.length}`);console.log(`Listening on ws://127.0.0.1:${PORT}`);console.log('============================================================');
function snapshot(){const cells=new Array(TOTAL);for(let i=0;i<TOTAL;i++)cells[i]={index:i,ownerId:owners[i],terrain:terrain[i],flags:flags[i]};return{type:'world_snapshot',tick,sequence,width:WIDTH,height:HEIGHT,totalCells:TOTAL,yourFactionId:1,factions,fronts:[],strategicSites:[],ports:[],alliances:[],cells};}
wss.on('connection',ws=>{console.log('[NET] Client connected');ws.on('message',raw=>{let m;try{m=JSON.parse(raw.toString());}catch{return;}if(m.type==='player_join'){ws.send(JSON.stringify(snapshot()));console.log(`[NET] Snapshot dispatched: ${TOTAL} cells, ${factions.length} factions`);}});ws.on('close',()=>console.log('[NET] Client disconnected'));});
function expandBot(id){const cells=territoryCells[id];if(!cells.length)return;for(let a=0;a<12;a++){const src=cells[(tick*17+id*31+a*7)%cells.length],opts=neighbors(src).filter(i=>terrain[i]===0&&owners[i]===0);if(opts.length){claim(opts[(tick+id+a)%opts.length],id);return;}}}
setInterval(()=>{tick++;for(let id=2+(tick%5);id<=101;id+=5)expandBot(id);if(tick%20===0)for(const f of factions){f.territoryCount=territoryCells[f.factionId].length;f.population=Math.min(f.populationCapacity,f.population+f.populationGrowthPerSecond);f.totalLivingPopulation=f.population+f.deployedPopulation;}if(dirty.size){sequence++;const deltas=Array.from(dirty,index=>({index,ownerId:owners[index],flags:flags[index]})),payload=JSON.stringify({type:'cell_delta_batch',tick,sequence,deltas,fronts:[],matchState:{phase:'RUNNING',winnerFactionId:null}});for(const c of wss.clients)if(c.readyState===1)c.send(payload);dirty.clear();}if(tick%10===0){const metrics=JSON.stringify({type:'server_metrics',tick,tickTimeMs:0,activePlayers:wss.clients.size,botCount:100,deltasCount:0,activeFronts:0,ramUsageMb:Math.round(process.memoryUsage().rss/1048576)});for(const c of wss.clients)if(c.readyState===1)c.send(metrics);}},50);
process.on('SIGINT',()=>wss.close(()=>process.exit(0)));
