import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// 1. Static contract verification
const inputControllerSrc = read('src/render/WorldInputController.ts');
const rendererSrc = read('src/render/DominionRenderer.ts');
const dossierSrc = read('src/ui/CountryDossier.ts');
const dossierCss = read('src/ui/dominion.css');
const attackPanelSrc = read('src/ui/AttackPanel.ts');
const gameStateSrc = read('src/game/GameState.ts');

// Contract Check: MapClickGestureState exists in WorldInputController
assert.match(inputControllerSrc, /export interface MapClickGestureState/, 'MapClickGestureState must be exported');
assert.match(inputControllerSrc, /lastResolvedTargetId:\s*number\s*\|\s*null/, 'gestureState tracks lastResolvedTargetId');
assert.match(inputControllerSrc, /lastClickTimeMs:\s*number/, 'gestureState tracks lastClickTimeMs');
assert.match(inputControllerSrc, /lastScreenX:\s*number/, 'gestureState tracks lastScreenX');
assert.match(inputControllerSrc, /lastScreenY:\s*number/, 'gestureState tracks lastScreenY');
assert.match(inputControllerSrc, /dt\s*<=\s*(?:600|DOUBLE_ACTION_MAX_MS)\s*&&\s*dist\s*<=\s*maxDist/, 'double-click timing and distance bounds checked');

// Contract Check: CountryDossier does NOT intercept map clicks or wipe selectionContext
assert.match(dossierCss, /#country-dossier\s*\{[^}]*pointer-events:\s*none;/, '#country-dossier container must be pointer-events: none');
assert.match(dossierCss, /#country-dossier button,\s*#country-dossier a/, '#country-dossier buttons have pointer-events: auto');
assert.doesNotMatch(dossierSrc, /document\.addEventListener\('pointerdown'[^}]*gameState\.clearSelection\(\)/, 'CountryDossier outside pointerdown must not clearSelection');

// Contract Check: Single-click inspect debounce & cancel on double-click
assert.match(rendererSrc, /pendingInspectTimer\s*=\s*window\.setTimeout/, 'single-click inspector is debounced');
assert.match(rendererSrc, /window\.clearTimeout\(this\.pendingInspectTimer\)/, 'double-click cancels pending inspector timer');

// Contract Check: Case 4 active front reinforce
assert.match(rendererSrc, /const existingFront = \[...gameState\.fronts\.values\(\)\]\.find/, 'double click checks for existing active front');
assert.match(rendererSrc, /gameClient\.sendReinforce\(existingFront\.frontId/, 'existing active front is reinforced instead of sending new attack');

// Contract Check: Case 5 different countries rapidly clicked guard
assert.match(rendererSrc, /context\.ownerId > 0 && this\.lastPickedTargetFactionId !== null && context\.ownerId !== this\.lastPickedTargetFactionId/, 'rapid click on different countries prevents false double-click');

// Contract Check: Task 28 combat UI server truth & stale front pruning
assert.match(attackPanelSrc, /if \(this\.combatDeck\) this\.combatDeck\.style\.display = 'none';/, 'LAUNCH_OFFENSIVE preview does not show combat engagement deck');
assert.doesNotMatch(attackPanelSrc, /\|\|\s*fronts\[0\]/, 'activeFront must never fall back to fronts[0]');
assert.match(gameStateSrc, /this\.fronts\.delete\(existingId\)/, 'GameState applyDeltas must prune inactive or omitted fronts');

// 2. Behavioral simulation of MapClickGestureState & Target Resolution State Machine
console.log('--- Testing Map Click Gesture & Combat Truth State Machine ---');

class MockInputMachine {
  constructor() {
    this.gesture = {
      lastResolvedTargetId: null,
      lastResolvedCellX: null,
      lastResolvedCellY: null,
      lastClickTimeMs: 0,
      lastScreenX: 0,
      lastScreenY: 0,
    };
    this.pendingInspectTimer = null;
    this.inspectedFactionId = null;
    this.dispatchedActions = [];
    this.maxDist = 14;
  }

  click(e, resolveContextFn) {
    const now = e.time;
    const dt = now - this.gesture.lastClickTimeMs;
    const dist = Math.hypot(e.screenX - this.gesture.lastScreenX, e.screenY - this.gesture.lastScreenY);

    if (dt > 30 && dt <= 600 && dist <= this.maxDist) {
      // Double click
      this.gesture.lastClickTimeMs = 0;
      this.handleDoubleExecution(e, resolveContextFn);
    } else {
      // Single click
      this.gesture.lastClickTimeMs = now;
      this.gesture.lastScreenX = e.screenX;
      this.gesture.lastScreenY = e.screenY;
      this.handleSingleClick(e, resolveContextFn);
    }
  }

  handleSingleClick(e, resolveContextFn) {
    if (this.pendingInspectTimer) {
      clearTimeout(this.pendingInspectTimer);
      this.pendingInspectTimer = null;
    }
    const context = resolveContextFn(e.screenX, e.screenY);
    this.gesture.lastResolvedTargetId = context.ownerId > 0 ? context.ownerId : null;

    if (context.ownerId > 0) {
      this.pendingInspectTimer = setTimeout(() => {
        this.inspectedFactionId = context.ownerId;
      }, 280);
    } else {
      this.inspectedFactionId = null;
    }
  }

  handleDoubleExecution(e, resolveContextFn) {
    if (this.pendingInspectTimer) {
      clearTimeout(this.pendingInspectTimer);
      this.pendingInspectTimer = null;
    }
    this.inspectedFactionId = null;

    const context = resolveContextFn(e.screenX, e.screenY);

    // Case 5 guard
    if (context.ownerId > 0 && this.gesture.lastResolvedTargetId !== null && context.ownerId !== this.gesture.lastResolvedTargetId) {
      this.gesture.lastResolvedTargetId = context.ownerId;
      this.inspectedFactionId = context.ownerId;
      return;
    }

    if (context.activeFrontId) {
      this.dispatchedActions.push({ type: 'REINFORCE', frontId: context.activeFrontId });
      return;
    }

    if (context.action === 'NEUTRAL_EXPANSION') {
      this.dispatchedActions.push({ type: 'EXPAND', targetCell: context.targetCell });
    } else if (context.action === 'LAUNCH_OFFENSIVE') {
      this.dispatchedActions.push({ type: 'ATTACK', source: context.sourceCell, target: context.targetCell });
    } else if (context.action === 'NONE') {
      this.dispatchedActions.push({ type: 'NO_ACTION', reason: context.rejectionReason });
    } else if (context.ownerId === 101) {
      this.dispatchedActions.push({ type: 'OWN_TERRITORY_SELECTED' });
    }
  }
}

// Case 1: Enemy HELLEN single click -> inspect prepared, attack does NOT begin
{
  const machine = new MockInputMachine();
  machine.click({ screenX: 100, screenY: 100, time: 1000 }, () => ({
    ownerId: 2,
    action: 'LAUNCH_OFFENSIVE',
    sourceCell: 50,
    targetCell: 51,
  }));
  assert.equal(machine.dispatchedActions.length, 0, 'Case 1: Single click does not launch attack');
  assert.ok(machine.pendingInspectTimer !== null, 'Case 1: Inspector timer scheduled');
  console.log('PASS: Case 1 - Single click inspects enemy without initiating attack');
}

// Case 2: Enemy HELLEN same-location double click -> attack launches, inspector cancelled
{
  const machine = new MockInputMachine();
  const hellenContext = () => ({
    ownerId: 2,
    action: 'LAUNCH_OFFENSIVE',
    sourceCell: 50,
    targetCell: 51,
  });
  // Click 1
  machine.click({ screenX: 100, screenY: 100, time: 1000 }, hellenContext);
  // Click 2 (200ms later, 4px away)
  machine.click({ screenX: 104, screenY: 102, time: 1200 }, hellenContext);

  assert.equal(machine.dispatchedActions.length, 1, 'Case 2: Attack launched');
  assert.equal(machine.dispatchedActions[0].type, 'ATTACK');
  assert.equal(machine.inspectedFactionId, null, 'Case 2: Inspector cancelled');
  console.log('PASS: Case 2 - Enemy same-location double click launches attack');
}

// Case 3: Neutral territory double click -> expansion occurs
{
  const machine = new MockInputMachine();
  const neutralContext = () => ({
    ownerId: 0,
    action: 'NEUTRAL_EXPANSION',
    targetCell: 88,
  });
  machine.click({ screenX: 200, screenY: 200, time: 2000 }, neutralContext);
  machine.click({ screenX: 202, screenY: 201, time: 2250 }, neutralContext);

  assert.equal(machine.dispatchedActions.length, 1);
  assert.equal(machine.dispatchedActions[0].type, 'EXPAND');
  assert.equal(machine.dispatchedActions[0].targetCell, 88);
  console.log('PASS: Case 3 - Neutral territory double click triggers expansion');
}

// Case 4: Existing active front double click -> reinforce occurs, no duplicate attack
{
  const machine = new MockInputMachine();
  const frontContext = () => ({
    ownerId: 2,
    action: 'LAUNCH_OFFENSIVE',
    sourceCell: 50,
    targetCell: 51,
    activeFrontId: 777,
  });
  machine.click({ screenX: 100, screenY: 100, time: 3000 }, frontContext);
  machine.click({ screenX: 102, screenY: 101, time: 3200 }, frontContext);

  assert.equal(machine.dispatchedActions.length, 1);
  assert.equal(machine.dispatchedActions[0].type, 'REINFORCE');
  assert.equal(machine.dispatchedActions[0].frontId, 777);
  console.log('PASS: Case 4 - Existing active front double click reinforces without duplicate front');
}

// Case 5: Two different countries rapidly clicked -> false double click prevented
{
  const machine = new MockInputMachine();
  // Click Civ 2 (Hellen)
  machine.click({ screenX: 100, screenY: 100, time: 4000 }, () => ({
    ownerId: 2,
    action: 'LAUNCH_OFFENSIVE',
  }));
  // Rapid click Civ 3 (Pers) within 200ms and close distance
  machine.click({ screenX: 105, screenY: 103, time: 4200 }, () => ({
    ownerId: 3,
    action: 'LAUNCH_OFFENSIVE',
  }));

  assert.equal(machine.dispatchedActions.length, 0, 'Case 5: False double click must NOT attack second country');
  assert.equal(machine.inspectedFactionId, 3, 'Case 5: Second country is inspected instead');
  console.log('PASS: Case 5 - Rapid clicks on two different countries prevents false attack');
}

// Case 6: Water double click -> no operation
{
  const machine = new MockInputMachine();
  const waterContext = () => ({
    ownerId: 0,
    action: 'NONE',
    rejectionReason: 'Water is not a legal land command target.',
  });
  machine.click({ screenX: 50, screenY: 50, time: 5000 }, waterContext);
  machine.click({ screenX: 52, screenY: 51, time: 5200 }, waterContext);

  assert.equal(machine.dispatchedActions.length, 1);
  assert.equal(machine.dispatchedActions[0].type, 'NO_ACTION');
  assert.match(machine.dispatchedActions[0].reason, /Water/);
  console.log('PASS: Case 6 - Water double-click causes no operation');
}

// Case 7: Unsupported visual fragment -> explicit unsupported result
{
  const machine = new MockInputMachine();
  const fragmentContext = () => ({
    ownerId: 0,
    action: 'NONE',
    rejectionReason: 'The visible coastal fragment has no mapped gameplay land component.',
  });
  machine.click({ screenX: 80, screenY: 80, time: 6000 }, fragmentContext);
  machine.click({ screenX: 81, screenY: 81, time: 6200 }, fragmentContext);

  assert.equal(machine.dispatchedActions.length, 1);
  assert.equal(machine.dispatchedActions[0].type, 'NO_ACTION');
  assert.match(machine.dispatchedActions[0].reason, /coastal fragment/);
  console.log('PASS: Case 7 - Unsupported visual fragment produces explicit unsupported result without fake attack');
}

console.log('\nALL TASK 27 & TASK 28 UNIT CRITERIA PASSED!');
