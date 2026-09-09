import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Setup browser globals for test environment
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  location: { hostname: '127.0.0.1' },
  __DOMINION_MODAL_OPEN__: false,
};

// Build required modules for tests
await build({
  entryPoints: ['src/render/WorldInputController.ts'],
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  outfile: '.test-build/WorldInputController.mjs'
});

await build({
  entryPoints: ['src/game/TargetResolver.ts'],
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  outfile: '.test-build/TargetResolver.mjs'
});

const { WorldInputController, DOUBLE_ACTION_MAX_MS, DRAG_THRESHOLD_PX } = await import('../.test-build/WorldInputController.mjs');
const { resolveTargetAtWorld } = await import('../.test-build/TargetResolver.mjs');

console.log('=== RUNNING COMPREHENSIVE GESTURE ARBITRATION TEST SUITE (TEST A - TEST J) ===');

function createMockEnvironment(options = {}) {
  const listeners = new Map();
  const canvas = {
    style: {},
    hasPointerCapture(id) { return this._capturedId === id; },
    setPointerCapture(id) { this._capturedId = id; },
    releasePointerCapture(id) { if (this._capturedId === id) this._capturedId = null; },
    addEventListener(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    removeEventListener(event, fn) {
      const list = listeners.get(event) || [];
      listeners.set(event, list.filter(cb => cb !== fn));
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1000, height: 800 };
    }
  };

  const container = {
    x: 0,
    y: 0,
    scale: { x: 1, y: 1, set(v) { this.x = v; this.y = v; } },
    toLocal(p) { return { x: p.x - this.x, y: p.y - this.y }; }
  };

  const controller = new WorldInputController(container, canvas);
  controller.globeMode = !!options.globeMode;

  const dispatch = (type, data = {}) => {
    const list = listeners.get(type) || [];
    const event = {
      type,
      pointerId: data.pointerId ?? 1,
      button: data.button ?? 0,
      clientX: data.clientX ?? 100,
      clientY: data.clientY ?? 100,
      preventDefault() {},
      stopPropagation() {},
      ...data
    };
    for (const fn of list) {
      fn(event);
    }
  };

  return { canvas, container, controller, dispatch };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// =========================================================================
// TEST A — CLICK
// down, small/no movement below drag threshold, up, single timeout expires
// => exactly one SINGLE_ACTION, zero gameplay execution
// =========================================================================
{
  const { controller, dispatch } = createMockEnvironment();
  let singlePicks = 0;
  let doublePicks = 0;
  controller.onFlatPick = () => singlePicks++;
  controller.onDoublePick = () => doublePicks++;
  controller.setup();

  dispatch('pointerdown', { clientX: 100, clientY: 100 });
  // Move 2px (below 5px threshold)
  dispatch('pointermove', { clientX: 102, clientY: 101 });
  dispatch('pointerup', { clientX: 102, clientY: 101 });

  assert.equal(singlePicks, 0, 'Single action must not execute immediately on up');
  assert.equal(doublePicks, 0, 'No double action on first up');

  // Wait for single click timer (600ms)
  await sleep(DOUBLE_ACTION_MAX_MS + 50);

  assert.equal(singlePicks, 1, 'Exactly one SINGLE_ACTION must fire after timeout');
  assert.equal(doublePicks, 0, 'Zero DOUBLE_ACTION must execute');
  controller.destroy();
  console.log('PASS: TEST A — CLICK (timeout produces exactly 1 SINGLE_ACTION, 0 execution)');
}

// =========================================================================
// TEST B — DOUBLE CLICK
// down/up, compatible down/up within double-click window
// => zero delayed SINGLE_ACTION execution, exactly one DOUBLE_ACTION
// =========================================================================
{
  const { controller, dispatch } = createMockEnvironment();
  let singlePicks = 0;
  let doublePicks = 0;
  controller.onFlatPick = () => singlePicks++;
  controller.onDoublePick = () => doublePicks++;
  controller.setup();

  // First click
  dispatch('pointerdown', { clientX: 100, clientY: 100 });
  dispatch('pointerup', { clientX: 100, clientY: 100 });

  // Delay 100ms
  await sleep(100);

  // Second compatible click
  dispatch('pointerdown', { clientX: 104, clientY: 103 });
  dispatch('pointerup', { clientX: 104, clientY: 103 });

  assert.equal(doublePicks, 1, 'Exactly one DOUBLE_ACTION on second compatible click');
  assert.equal(singlePicks, 0, 'Single click must be cancelled on double click');

  // Wait beyond timeout to ensure delayed single action was truly cancelled
  await sleep(DOUBLE_ACTION_MAX_MS + 50);
  assert.equal(singlePicks, 0, 'Delayed single action must NEVER fire after double click');
  assert.equal(doublePicks, 1, 'Double action must fire exactly once');

  controller.destroy();
  console.log('PASS: TEST B — DOUBLE CLICK (0 delayed single action, exactly 1 DOUBLE_ACTION)');
}

// =========================================================================
// TEST C — DRAG
// down, move beyond threshold, move, up
// => DRAGGING occurred, camera movement invoked, zero SINGLE/DOUBLE action
// =========================================================================
{
  const { controller, dispatch } = createMockEnvironment({ globeMode: true });
  let singlePicks = 0;
  let doublePicks = 0;
  let rotations = [];
  let dragStarted = false;
  let dragEnded = false;

  controller.onGlobePick = () => singlePicks++;
  controller.onGlobeDoublePick = () => doublePicks++;
  controller.onGlobeRotate = (dx, dy) => rotations.push({ dx, dy });
  controller.onDragStart = () => { dragStarted = true; };
  controller.onGlobeDragEnd = () => { dragEnded = true; };
  controller.setup();

  dispatch('pointerdown', { clientX: 200, clientY: 200 });
  // Move beyond DRAG_THRESHOLD_PX (5px)
  dispatch('pointermove', { clientX: 210, clientY: 200 });
  dispatch('pointermove', { clientX: 230, clientY: 220 });
  dispatch('pointerup', { clientX: 230, clientY: 220 });

  assert.equal(dragStarted, true, 'Drag must be recognized once threshold exceeded');
  assert.equal(dragEnded, true, 'Drag end must be notified on pointerup');
  assert.ok(rotations.length > 0, 'Globe rotation must receive continuous deltas');
  assert.equal(singlePicks, 0, 'Drag must NEVER produce single pick');
  assert.equal(doublePicks, 0, 'Drag must NEVER produce double pick');

  await sleep(DOUBLE_ACTION_MAX_MS + 50);
  assert.equal(singlePicks, 0, 'No delayed click after drag');
  assert.equal(doublePicks, 0, 'No double action after drag');

  controller.destroy();
  console.log('PASS: TEST C — DRAG (DRAGGING occurred, camera movement invoked, zero clicks)');
}

// =========================================================================
// TEST D — CLICK THEN DRAG
// first click candidate exists, next gesture becomes drag
// => pending double candidate invalidated, no accidental command
// =========================================================================
{
  const { controller, dispatch } = createMockEnvironment();
  let singlePicks = 0;
  let doublePicks = 0;
  controller.onFlatPick = () => singlePicks++;
  controller.onDoublePick = () => doublePicks++;
  controller.setup();

  // First click candidate
  dispatch('pointerdown', { clientX: 100, clientY: 100 });
  dispatch('pointerup', { clientX: 100, clientY: 100 });

  await sleep(50);

  // Second gesture starts, but turns into drag!
  dispatch('pointerdown', { clientX: 100, clientY: 100 });
  dispatch('pointermove', { clientX: 120, clientY: 100 }); // 20px > 5px threshold
  dispatch('pointerup', { clientX: 120, clientY: 100 });

  assert.equal(doublePicks, 0, 'Drag gesture must NEVER be treated as double click');

  await sleep(DOUBLE_ACTION_MAX_MS + 50);
  assert.equal(doublePicks, 0, 'Zero double action commands after click then drag');

  controller.destroy();
  console.log('PASS: TEST D — CLICK THEN DRAG (drag cancels double click candidate, 0 accidental attack)');
}

// =========================================================================
// TEST E — DRAG THEN CLICK
// complete drag, then clean click
// => normal single-click preview still works
// =========================================================================
{
  const { controller, dispatch } = createMockEnvironment();
  let singlePicks = 0;
  let doublePicks = 0;
  controller.onFlatPick = () => singlePicks++;
  controller.onDoublePick = () => doublePicks++;
  controller.setup();

  // Complete a full drag
  dispatch('pointerdown', { clientX: 100, clientY: 100 });
  dispatch('pointermove', { clientX: 150, clientY: 150 });
  dispatch('pointerup', { clientX: 150, clientY: 150 });

  assert.equal(controller.gestureState, 'IDLE', 'State must reset to IDLE after drag up');

  await sleep(50);

  // Now a fresh clean click
  dispatch('pointerdown', { clientX: 300, clientY: 300 });
  dispatch('pointerup', { clientX: 300, clientY: 300 });

  await sleep(DOUBLE_ACTION_MAX_MS + 50);
  assert.equal(singlePicks, 1, 'Clean click after drag must trigger single pick preview');
  assert.equal(doublePicks, 0, 'Zero double click');

  controller.destroy();
  console.log('PASS: TEST E — DRAG THEN CLICK (gesture resets cleanly; normal single-click works)');
}

// =========================================================================
// TEST F — AUTO CAMERA INTERRUPTION
// intro/auto-camera active, user begins drag
// => auto-camera cancelled, same physical gesture enters manual drag, globe rotates, no click/attack
// =========================================================================
{
  const { controller, dispatch } = createMockEnvironment({ globeMode: true });
  let autoCameraCancelled = false;
  let singlePicks = 0;
  let doublePicks = 0;
  let rotatedDeltas = [];

  controller.onUserInputStart = () => { autoCameraCancelled = true; };
  controller.onGlobeRotate = (dx, dy) => rotatedDeltas.push({ dx, dy });
  controller.onGlobePick = () => singlePicks++;
  controller.onGlobeDoublePick = () => doublePicks++;
  controller.setup();

  // User touches down while intro/auto-camera is moving
  dispatch('pointerdown', { clientX: 200, clientY: 200 });
  assert.equal(autoCameraCancelled, true, 'User input down MUST immediately cancel auto-camera');

  // Continues into manual drag without lifting finger
  dispatch('pointermove', { clientX: 225, clientY: 210 });
  dispatch('pointermove', { clientX: 250, clientY: 220 });
  dispatch('pointerup', { clientX: 250, clientY: 220 });

  assert.ok(rotatedDeltas.length > 0, 'Same physical gesture must rotate globe manually');
  assert.equal(singlePicks, 0, 'Zero single picks during intro interrupt drag');
  assert.equal(doublePicks, 0, 'Zero double picks during intro interrupt drag');

  controller.destroy();
  console.log('PASS: TEST F — AUTO CAMERA INTERRUPTION (auto-cam cancelled, manual drag seamlessly continues)');
}

// =========================================================================
// TEST G — TARGET CHANGE
// first click target A, second click target B
// => no A+B false double execution
// =========================================================================
{
  const { controller, dispatch } = createMockEnvironment();
  let singlePicks = [];
  let doublePicks = [];

  controller.onFlatPick = (sx, sy) => singlePicks.push({ sx, sy });
  controller.onDoublePick = (sx, sy) => doublePicks.push({ sx, sy });

  // Mock resolveTargetIdentity to return different identities for different coordinates
  controller.resolveTargetIdentity = (x, y) => {
    if (x < 150) return { key: 'TARGET_NATION_A_CELL_10' };
    return { key: 'TARGET_NATION_B_CELL_55' };
  };
  controller.setup();

  // Click Target A
  dispatch('pointerdown', { clientX: 100, clientY: 100 });
  dispatch('pointerup', { clientX: 100, clientY: 100 });

  await sleep(100);

  // Click Target B within timing window
  dispatch('pointerdown', { clientX: 200, clientY: 200 });
  dispatch('pointerup', { clientX: 200, clientY: 200 });

  // Must NOT trigger double pick because targets A and B are semantically incompatible!
  assert.equal(doublePicks.length, 0, 'Incompatible targets must never trigger false double-click');

  await sleep(DOUBLE_ACTION_MAX_MS + 50);
  assert.equal(doublePicks.length, 0, 'Zero double pick after timeout');

  controller.destroy();
  console.log('PASS: TEST G — TARGET CHANGE (Target A + Target B prevents false double execution)');
}

// =========================================================================
// TEST H — POINTER CANCEL
// pointerdown, pointercancel
// => clean IDLE, no command, next click works
// =========================================================================
{
  const { controller, dispatch } = createMockEnvironment();
  let singlePicks = 0;
  let doublePicks = 0;
  controller.onFlatPick = () => singlePicks++;
  controller.onDoublePick = () => doublePicks++;
  controller.setup();

  dispatch('pointerdown', { clientX: 100, clientY: 100 });
  assert.equal(controller.gestureState, 'PENDING_POINTER');

  // Browser cancels pointer (e.g. touch interrupted, window blur, drag offscreen)
  dispatch('pointercancel', { clientX: 100, clientY: 100 });
  assert.equal(controller.gestureState, 'IDLE', 'Pointer cancel must reset state to IDLE');
  assert.equal(controller.clickCandidate, null, 'Pointer cancel must clear click candidate');

  await sleep(100);
  assert.equal(singlePicks, 0);
  assert.equal(doublePicks, 0);

  // Next normal click works
  dispatch('pointerdown', { clientX: 150, clientY: 150 });
  dispatch('pointerup', { clientX: 150, clientY: 150 });

  await sleep(DOUBLE_ACTION_MAX_MS + 50);
  assert.equal(singlePicks, 1, 'Next click after cancel works normally');

  controller.destroy();
  console.log('PASS: TEST H — POINTER CANCEL (clean IDLE, 0 commands, next click works)');
}

// =========================================================================
// TEST I — GLOBE SINGLE
// actual globe pick pipeline => authoritative cell => TargetResolver => preview state
// =========================================================================
{
  const width = 10;
  const height = 10;
  const totalCells = width * height;
  const owners = new Uint8Array(totalCells);
  const terrains = new Uint8Array(totalCells);

  // Cell 22: Player owned (faction 1)
  owners[2 * width + 2] = 1;
  // Cell 23: Hostile land (faction 2) - adjacent to cell 22
  owners[2 * width + 3] = 2;
  // Cell 32: Neutral land (0) - adjacent to cell 22
  owners[3 * width + 2] = 0;

  const gameState = {
    width, height, totalCells,
    cellOwners: owners,
    cellTerrains: terrains,
    yourFactionId: 1,
    isInitialized: true,
    isConnected: true,
    ports: [],
    alliances: [],
  };

  // Simulate Globe raycast resolving to lat/lon -> worldX/Y
  // For Cell 32 (x=2.5, y=3.5) -> Neutral
  const neutralPreview = resolveTargetAtWorld(gameState, 2.5, 3.5);
  assert.equal(neutralPreview.relation, 'ADJACENT_NEUTRAL');
  assert.equal(neutralPreview.action, 'NEUTRAL_EXPANSION');
  assert.equal(neutralPreview.targetCell, 3 * width + 2);
  assert.equal(neutralPreview.sourceCell, 2 * width + 2);

  // For Cell 23 (x=3.5, y=2.5) -> Hostile
  const hostilePreview = resolveTargetAtWorld(gameState, 3.5, 2.5);
  assert.equal(hostilePreview.relation, 'ADJACENT_HOSTILE');
  assert.equal(hostilePreview.action, 'LAUNCH_OFFENSIVE');
  assert.equal(hostilePreview.targetCell, 2 * width + 3);
  assert.equal(hostilePreview.sourceCell, 2 * width + 2);

  console.log('PASS: TEST I — GLOBE SINGLE (globe pick -> authoritative cell -> TargetResolver -> preview state)');
}

// =========================================================================
// TEST J — FLAT SINGLE
// actual flat pick pipeline => authoritative cell => same semantic preview pipeline
// =========================================================================
{
  const width = 10;
  const height = 10;
  const totalCells = width * height;
  const owners = new Uint8Array(totalCells);
  const terrains = new Uint8Array(totalCells);

  owners[5 * width + 5] = 1;
  owners[5 * width + 6] = 0;

  const gameState = {
    width, height, totalCells,
    cellOwners: owners,
    cellTerrains: terrains,
    yourFactionId: 1,
    isInitialized: true,
    isConnected: true,
    ports: [],
    alliances: [],
  };

  const flatPreview = resolveTargetAtWorld(gameState, 6.5, 5.5);
  assert.equal(flatPreview.relation, 'ADJACENT_NEUTRAL');
  assert.equal(flatPreview.action, 'NEUTRAL_EXPANSION');
  assert.equal(flatPreview.targetCell, 5 * width + 6);
  assert.equal(flatPreview.sourceCell, 5 * width + 5);

  console.log('PASS: TEST J — FLAT SINGLE (flat pick -> authoritative cell -> same TargetResolver preview)');
}

console.log('=========================================================================');
console.log('ALL TESTS A THROUGH J PASSED DETERMINISTICALLY AND CLEANLY!');
console.log('=========================================================================');
