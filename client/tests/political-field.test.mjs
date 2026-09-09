import assert from 'node:assert/strict';
import { PoliticalFieldCore } from '../.test-build/PoliticalFieldCore.mjs';

function makeField(width, height, owners, water = [], capitals = []) {
  const scale = 4, maskWidth = width * 4, maskHeight = height * 4;
  const mask = new Uint8Array(maskWidth * maskHeight).fill(255);
  for (const [wx, wy] of water) {
      for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 4; dx++) {
              mask[(wy * 4 + dy) * maskWidth + wx * 4 + dx] = 0;
          }
      }
  }
  const field = new PoliticalFieldCore({ simulationWidth: width, simulationHeight: height, scale, landMask: mask, landMaskWidth: maskWidth, landMaskHeight: maskHeight });
  field.fullBuild(Uint8Array.from(owners), capitals);
  return field;
}

function transitions(row) { let n = 0; for (let i = 1; i < row.length; i++) if (row[i] !== row[i - 1]) n++; return n; }
function components(field, owner) {
  const seen = new Uint8Array(field.owners.length); let count = 0;
  for (let i = 0; i < field.owners.length; i++) if (!seen[i] && field.owners[i] === owner) {
    count++; const q = [i]; seen[i] = 1;
    while (q.length) { const p = q.pop(), x = p % field.width, y = Math.floor(p / field.width);
      for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) if (nx>=0&&ny>=0&&nx<field.width&&ny<field.height) { const ni=ny*field.width+nx; if(!seen[ni]&&field.owners[ni]===owner){seen[ni]=1;q.push(ni);} }
    }
  }
  return count;
}

const results = [];
function test(name, fn) { fn(); results.push(name); console.log(`PASS ${name}`); }

test('1. exact 4x4 raw mapping', () => {
  const f = makeField(3, 2, [0,1,2, 2,1,0]);
  for (let cy=0;cy<2;cy++) for(let cx=0;cx<3;cx++) for(let dy=0;dy<4;dy++) for(let dx=0;dx<4;dx++) assert.equal(f.rawOwners[(cy*4+dy)*f.width+cx*4+dx],[0,1,2,2,1,0][cy*3+cx]);
});

test('2. faction-neutral straight border preserves neutral', () => {
  const f = makeField(6, 3, [0,0,0,1,1,1, 0,0,0,1,1,1, 0,0,0,1,1,1]);
  assert.equal(transitions(Array.from(f.owners.slice(f.width * 2, f.width * 3))), 1);
});

test('3. A/B boundary has no neutral seam', () => {
  const f = makeField(6, 3, [1,1,1,2,2,2, 1,1,1,2,2,2, 1,1,1,2,2,2]);
  assert.equal(transitions(Array.from(f.owners.slice(f.width * 2, f.width * 3))), 1); assert.ok(!f.owners.includes(0));
});

test('4. max smoothing displacement <= 2 visual pixels', () => {
  const f = makeField(5,5,[1,1,2,2,2, 1,1,1,2,2, 1,1,1,1,2, 1,1,1,1,1, 1,1,1,1,1]);
  let changed=0; 
  let maxDisplacement = 0;
  for (let y=0; y<f.height; y++) {
      for (let x=0; x<f.width; x++) {
          const i = y*f.width + x;
          if(f.owners[i] !== f.rawOwners[i]) {
              changed++;
              // find distance to raw boundary
              let minDist = 999;
              const rawOwner = f.rawOwners[i];
              for (let dy=-10; dy<=10; dy++) {
                  for (let dx=-10; dx<=10; dx++) {
                      const ny = y+dy, nx = x+dx;
                      if (ny>=0&&nx>=0&&ny<f.height&&nx<f.width) {
                          if (f.rawOwners[ny*f.width+nx] !== rawOwner) {
                              minDist = Math.min(minDist, Math.max(Math.abs(dx), Math.abs(dy)));
                          }
                      }
                  }
              }
              maxDisplacement = Math.max(maxDisplacement, minDist);
          }
      }
  }
  assert.ok(changed > 0);
  assert.ok(maxDisplacement <= 2);
});

test('5. T-junction retains exactly original label set', () => {
  const f = makeField(4,4,[1,1,2,2, 1,1,2,2, 0,0,2,2, 0,0,2,2]);
  assert.deepEqual([...new Set(f.owners)].sort(), [0,1,2]);
});

test('6. A/B boundary never gets faction C', () => {
    // Faction C is at the other side, it shouldn't intrude
    const f = makeField(6,3,[1,1,2,2,3,3, 1,1,2,2,3,3, 1,1,2,2,3,3]);
    for (let y = 0; y < f.height; y++) {
        for (let x = 0; x < f.width; x++) {
            if (x < 2 * 4 + 2) assert.ok(f.owners[y * f.width + x] !== 3);
        }
    }
});

test('7. narrow bridge component count preserved', () => {
  const owners=[0,0,0,0,0,0,0, 0,1,1,0,1,1,0, 0,1,1,1,1,1,0, 0,1,1,0,1,1,0, 0,0,0,0,0,0,0];
  const f=makeField(7,5,owners); assert.equal(components(f,1),1);
});

test('8. island component preserved', () => {
  const f=makeField(5,5,[0,0,0,0,0, 0,0,1,0,0, 0,1,1,1,0, 0,0,1,0,0, 0,0,0,0,0]); assert.ok(f.owners.includes(1)); assert.equal(components(f,1),1);
});

test('9. neutral component topology preserved', () => {
    const f = makeField(5,5,[1,1,1,1,1, 1,1,0,1,1, 1,0,0,0,1, 1,1,0,1,1, 1,1,1,1,1]);
    assert.equal(components(f,0),1);
});

test('10. water ownership = 0', () => {
  const f=makeField(4,3,new Array(12).fill(1),[[3,0],[3,1],[3,2]]); assert.equal(f.metrics.ownedVisualWaterPixels,0); for(let y=0;y<f.height;y++) for(let dx=0;dx<4;dx++) assert.equal(f.owners[y*f.width+3*4+dx],0);
});

test('11. capital protected 4x4', () => {
    const f = makeField(4,3,[1,1,1,2,2,2, 1,1,1,2,2,2, 1,1,1,2,2,2], [], [1*4 + 1]);
    // The cell (1,1) is a capital, so its visual block x:4..7, y:4..7 must be identical to rawOwners
    for(let y=4;y<8;y++) for(let x=4;x<8;x++) {
        assert.equal(f.owners[y * f.width + x], f.rawOwners[y * f.width + x]);
    }
});

test('12. dirty/full same chunk diff = 0', () => {
  const owners=new Uint8Array(48*32); for(let i=0;i<owners.length;i++) owners[i]=(i%48)<24?1:2;
  const a=makeField(48,32,owners), changed=owners.slice(); changed[10*48+10]=1; a.updateDirty(changed,[10*48+10]);
  const b=makeField(48,32,changed); assert.deepEqual(a.rawOwners,b.rawOwners); assert.deepEqual(a.owners,b.owners); assert.deepEqual(a.borders,b.borders);
});

test('13. dirty/full across x=15/16 chunk boundary diff = 0', () => {
  const owners=new Uint8Array(48*32); for(let i=0;i<owners.length;i++) owners[i]=(i%48)<24?1:2;
  const a=makeField(48,32,owners), changed=owners.slice(); changed[10*48+15]=1; a.updateDirty(changed,[10*48+15]);
  const b=makeField(48,32,changed); assert.deepEqual(a.rawOwners,b.rawOwners); assert.deepEqual(a.owners,b.owners); assert.deepEqual(a.borders,b.borders);
});

test('14. dirty/full at four-chunk corner diff = 0', () => {
  const owners=new Uint8Array(48*32); for(let i=0;i<owners.length;i++) owners[i]=(i%48)<24?1:2;
  const a=makeField(48,32,owners), changed=owners.slice(); changed[15*48+15]=1; a.updateDirty(changed,[15*48+15]);
  const b=makeField(48,32,changed); assert.deepEqual(a.rawOwners,b.rawOwners); assert.deepEqual(a.owners,b.owners); assert.deepEqual(a.borders,b.borders);
});

test('15. iteration-order independence', () => {
  const owners=[1,1,2,2, 1,1,2,2, 3,3,2,2, 3,3,2,2];
  const a=makeField(4,4,owners), b=makeField(4,4,owners); assert.deepEqual(a.owners,b.owners); assert.deepEqual(a.borders,b.borders);
});

console.log(`RESULT ${results.length}/15 tests passed`);
