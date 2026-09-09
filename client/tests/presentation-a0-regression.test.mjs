import assert from 'node:assert/strict';

const W = 64, H = 40;
const FALL = 3.0;
const field = new Uint8Array(W * H);
const at = (x, y) => field[Math.max(0, Math.min(H - 1, y)) * W + ((x % W) + W) % W];

function winner(px, py) {
  const cx = Math.floor(px), cy = Math.floor(py);
  const localX = (px - cx) - 0.5, localY = (py - cy) - 0.5;
  const center = at(cx, cy);
  const A = center;
  let B = -1, third = false, scoreA = 0, scoreB = 0;
  for (let oy=-1; oy<=1; oy++) for (let ox=-1; ox<=1; ox++) {
    const o = at(cx+ox, cy+oy);
    if (o !== A) {
      if (B < 0) B = o;
      else if (o !== B) third = true;
    }
    const dx = ox-localX, dy = oy-localY;
    const w = Math.exp(-FALL*(dx*dx+dy*dy));
    if (o === A) scoreA += w;
    else if (B >= 0 && o === B) scoreB += w;
  }
  if (third || B < 0) return center;
  return scoreB > scoreA ? B : A;
}

function clear(){ field.fill(0); }
function rect(x0,y0,x1,y1,o){ for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)field[y*W+x]=o; }
function test(name, fn){ clear(); fn(); console.log('PASS',name); }

test('1 all neutral',()=> assert.equal(winner(20.5,20.5),0));
test('2 all A',()=>{rect(0,0,W,H,1);assert.equal(winner(20.5,20.5),1)});
test('3 one-cell A survives center',()=>{field[20*W+20]=1;assert.equal(winner(20.5,20.5),1)});
test('4 2x2 survives',()=>{rect(20,20,22,22,1);assert.equal(winner(20.5,20.5),1)});
test('5 A/B straight A side',()=>{rect(0,0,32,H,1);rect(32,0,W,H,2);assert.equal(winner(31.2,20.5),1)});
test('6 A/B straight B side',()=>{rect(0,0,32,H,1);rect(32,0,W,H,2);assert.equal(winner(32.8,20.5),2)});
test('7 A/neutral edge',()=>{rect(0,0,32,H,1);assert.equal(winner(31.2,20.5),1)});
test('8 T junction center fallback',()=>{rect(10,10,20,20,1);rect(20,10,30,15,2);rect(20,15,30,20,3);const c=at(20,15);assert.equal(winner(20.5,15.5),c)});
test('9 thin bridge center survives',()=>{rect(5,19,55,21,1);assert.equal(winner(30.5,19.5),1)});
test('10 antimeridian wrap',()=>{rect(0,10,2,20,1);rect(W-2,10,W,20,1);assert.equal(winner(0.2,15.5),1);assert.equal(winner(W-0.2,15.5),1)});

console.log('RESULT 10/10 presentation A0 regression tests passed');
