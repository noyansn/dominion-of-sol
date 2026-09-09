import { gameState } from './GameState';
import { ServerMessage } from './Types';
import { accountService } from '../meta/AccountService';
import { entitlementService } from '../meta/EntitlementService';
import { reactionMapRenderer } from '../ui/ReactionMapRenderer';
import { uiStateManager, AppSurface } from '../ui/UIStateManager';

export interface NetTelemetry {
  wsState: 'NOT_STARTED' | 'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR';
  connectAttempts: number;
  openCount: number;
  joinSent: boolean;
  joinPayloadType: string;
  rxFrameCount: number;
  lastRxType: string;
  lastRxBytes: number;
  jsonParseErrors: number;
  unknownMessageTypes: number;
  snapshotReceived: boolean;
  snapshotFactions: number;
  snapshotOwnedCells: number;
  gameStateFactions: number;
  hudFactions: number;
  ownershipRevisionGaps: number;
  snapshotResyncRequests: number;
  lastError?: string;
}

export const netTelemetry: NetTelemetry = {
  wsState: 'NOT_STARTED',
  connectAttempts: 0,
  openCount: 0,
  joinSent: false,
  joinPayloadType: 'NONE',
  rxFrameCount: 0,
  lastRxType: 'NONE',
  lastRxBytes: 0,
  jsonParseErrors: 0,
  unknownMessageTypes: 0,
  snapshotReceived: false,
  snapshotFactions: 0,
  snapshotOwnedCells: 0,
  gameStateFactions: 0,
  hudFactions: 0,
  ownershipRevisionGaps: 0,
  snapshotResyncRequests: 0,
};

declare const __DOMINION_CLIENT_COMMIT__: string;
declare const __DOMINION_BUILD_TIMESTAMP__: string;
declare const __DOMINION_PROTOCOL_VERSION__: string;

export const CLIENT_COMMIT = typeof __DOMINION_CLIENT_COMMIT__ !== 'undefined' ? __DOMINION_CLIENT_COMMIT__ : '068ea1da256bd897b7d6b8bd42371326526f3c79';
export const CLIENT_BUILD_TIMESTAMP = typeof __DOMINION_BUILD_TIMESTAMP__ !== 'undefined' ? __DOMINION_BUILD_TIMESTAMP__ : '2026-09-06T16:56:00Z';
export const CLIENT_PROTOCOL_VERSION = typeof __DOMINION_PROTOCOL_VERSION__ !== 'undefined' ? __DOMINION_PROTOCOL_VERSION__ : '1.0.0';

export const CLIENT_BUILD_ID = CLIENT_COMMIT;
(window as any).__CLIENT_BUILD_ID__ = CLIENT_BUILD_ID;
(window as any).__DOMINION_CLIENT_COMMIT__ = CLIENT_COMMIT;
(window as any).__DOMINION_BUILD_TIMESTAMP__ = CLIENT_BUILD_TIMESTAMP;
(window as any).__DOMINION_PROTOCOL_VERSION__ = CLIENT_PROTOCOL_VERSION;
(window as any).__DEV_NET_TELEMETRY__ = netTelemetry;
(window as any).__DOMINION_EXPANSION_PROGRESS__ = (window as any).__DOMINION_EXPANSION_PROGRESS__ || [];

console.log('==================================================');
console.log('CLIENT BUILD');
console.log(`commit=${CLIENT_COMMIT}`);
console.log(`built=${CLIENT_BUILD_TIMESTAMP}`);
console.log(`protocol=${CLIENT_PROTOCOL_VERSION}`);
console.log('==================================================');

declare global {
  interface Window {
    __DOMINION_GAME_CLIENT__?: GameClient;
    __GAME_CLIENT_INSTANCE_COUNT__?: number;
    __DOMINION_BUILD_INFO__?: any;
  }
}

export class GameClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 5000;
  private isExplicitlyClosed = false;
  private isConnecting = false;
  private pingInterval: number | null = null;
  public currentMatchId: string | null = null;
  public currentMatchPhase: string = 'WAITING';
  private reconnectTimer: number | undefined;
  private awaitingOwnershipResync = false;

  constructor(url: string = `ws://${window.location.hostname || '127.0.0.1'}:8765`) {
    window.__GAME_CLIENT_INSTANCE_COUNT__ = (window.__GAME_CLIENT_INSTANCE_COUNT__ || 0) + 1;
    this.url = url;
    window.__DOMINION_GAME_CLIENT__ = this;
    if (new URLSearchParams(window.location.search).get('acceptance') === 'resync') {
      window.setTimeout(() => this.runAcceptanceRevisionGapTest(), 4500);
    }
  }

  private runAcceptanceRevisionGapTest(attempt = 0): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !gameState.isInitialized) {
      if (attempt < 30) window.setTimeout(() => this.runAcceptanceRevisionGapTest(attempt + 1), 500);
      return;
    }
    const revisionN = gameState.ownershipRevision;
    const telemetryBefore = netTelemetry.snapshotResyncRequests;
    console.log(`[ACCEPTANCE RESYNC] receive revision N=${revisionN}; suppress revision N+1=${revisionN + 1}; receive revision N+2=${revisionN + 2}`);
    this.handleMessage({
      type: 'cell_delta_batch',
      tick: gameState.tick,
      sequence: gameState.sequence,
      ownershipRevision: revisionN + 2,
      deltas: [],
      fronts: [],
      matchState: gameState.matchState,
      pendingAlliances: [],
    } as any);

    window.setTimeout(async () => {
      const diagnostic = await this.queryDevDiagnostic();
      const clientHash = gameState.ownerGridHash();
      const serverHash = diagnostic.ownerGridHash || diagnostic.owner_grid_hash || 'missing';
      console.log(
        `[ACCEPTANCE RESYNC RESULT] gap detected=${netTelemetry.ownershipRevisionGaps > 0} ` +
        `resync request count=${netTelemetry.snapshotResyncRequests - telemetryBefore} ` +
        `snapshot revision=${gameState.ownershipRevision} server hash=${serverHash} ` +
        `client hash=${clientHash} match=${serverHash === clientHash} diagnosticKeys=${Object.keys(diagnostic).join(',')}`,
      );
    }, 1200);
  }

  public sendPlayerReady(matchId?: string): void {
    const mId = matchId || this.currentMatchId || (window as any).__DOMINION_MATCH_ID__;
    this.send({
      type: 'player_ready',
      matchId: mId || undefined,
    });
    console.log('[LIFECYCLE] player_ready sent for match', mId);
  }

  public isPreMatch(): boolean {
    return this.currentMatchPhase === 'PRE_MATCH' || this.currentMatchPhase === 'PreMatch' || (window as any).__DOMINION_MATCH_PHASE__ === 'PreMatch' || (window as any).__DOMINION_MATCH_PHASE__ === 'PRE_MATCH';
  }

  public queryDevDiagnostic(): Promise<any> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve({ error: 'disconnected' });
        return;
      }
      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'dev_diagnostic') {
            this.ws?.removeEventListener('message', handler);
            resolve(data);
          }
        } catch {}
      };
      this.ws.addEventListener('message', handler);
      this.send({ type: 'dev_diagnostic' });
    });
  }

  public sendPlayerJoin(action?: 'NEW_MATCH' | 'RESUME_MATCH'): void {
    if ((window as any).__DOMINION_BUILD_MATCH__ === false && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.error('[DEV ERROR] Cannot start/resume match: Localhost Client commit does not match Server commit! Restart dev environment.');
      return;
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
      return;
    }
    const account = accountService.getAccount();
    const loadout = entitlementService.getLoadout();
    const nationName = account.displayName || localStorage.getItem('dominion.nation') || 'Dominion of Sol';
    const explicitAction = action || (window as any).__DOMINION_REQUEST_FRESH_MATCH__ || (window.location.search.includes('fresh=1') ? 'NEW_MATCH' : undefined);
    const lifecycleAction = explicitAction || (this.currentMatchId ? 'RESUME_MATCH' : 'NEW_MATCH');

    const joinPayload = {
      type: 'player_join',
      protocolVersion: '1.0.0',
      playerName: nationName,
      token: account.sessionToken || 'token_player_1',
      flagId: localStorage.getItem('dominion.flag') || 'flag_sol',
      civilizationId: localStorage.getItem('dominion.nationPreset') || 'noyan',
      nationName,
      playerTag: account.playerTag,
      equippedBladeSkin: loadout.activeBladeSkin,
      factionColor: localStorage.getItem('dominion.color') || '#3B82F6',
      lifecycleAction,
      matchId: this.currentMatchId || undefined,
      flagDescriptor: (() => {
        const raw = localStorage.getItem('dominion.flagDescriptor');
        if (!raw) return undefined;
        try { return JSON.parse(raw); } catch { return undefined; }
      })(),
      startingCellIndex: (() => {
        const isCustom = localStorage.getItem('dominion.nationPreset') === 'custom';
        if (!isCustom) return undefined;
        const raw = localStorage.getItem('dominion.startCell');
        return raw !== null && Number.isInteger(Number(raw)) ? Number(raw) : undefined;
      })(),
      doctrineOffense: Number(localStorage.getItem('dominion.doctrine.offense') || 0),
      doctrineDefense: Number(localStorage.getItem('dominion.doctrine.defense') || 0),
      doctrineExpansion: Number(localStorage.getItem('dominion.doctrine.expansion') || 0),
      doctrineMaritime: Number(localStorage.getItem('dominion.doctrine.maritime') || 0),
      startPaused: typeof window !== 'undefined' && (
        window.location.search.includes('paused=1') ||
        window.location.search.includes('freeze=1') ||
        (window as any).__DOMINION_START_PAUSED__ === true
      ),
    };

    netTelemetry.joinSent = true;
    netTelemetry.joinPayloadType = joinPayload.type;
    this.send(joinPayload);
    console.log('[NET] Sent player_join for', nationName, 'lifecycleAction:', lifecycleAction, 'matchId:', this.currentMatchId);
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.isExplicitlyClosed = false;
    netTelemetry.connectAttempts++;
    netTelemetry.wsState = 'CONNECTING';
    gameState.setConnectionStatus(false, 'Connecting to Server...');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[NET] Connected to Dominion Server at', this.url);
        netTelemetry.openCount++;
        netTelemetry.wsState = 'OPEN';
        this.reconnectAttempts = 0;
        gameState.setConnectionStatus(true, 'Connected');

        this.sendPlayerJoin();

        // Server-authoritative session synchronization
        const account = accountService.getAccount();
        if (account.accountId && account.sessionToken) {
          this.send({
            type: 'auth_session_resume',
            accountId: account.accountId,
            sessionToken: account.sessionToken,
          });
        } else {
          this.send({
            type: 'auth_guest_bootstrap',
            nameHint: account.displayName || 'NOYAN',
          });
        }
      };

      this.ws.onmessage = async (event) => {
        netTelemetry.rxFrameCount++;
        let rawText: string;

        if (typeof event.data === 'string') {
          rawText = event.data;
        } else if (event.data instanceof Blob) {
          rawText = await event.data.text();
        } else if (event.data instanceof ArrayBuffer) {
          rawText = new TextDecoder().decode(event.data);
        } else {
          rawText = String(event.data);
        }

        netTelemetry.lastRxBytes = rawText.length;

        try {
          const msg = JSON.parse(rawText) as ServerMessage;
          netTelemetry.lastRxType = msg.type || 'UNKNOWN';
          this.handleMessage(msg);
        } catch (err: any) {
          netTelemetry.jsonParseErrors++;
          netTelemetry.lastError = `JSON parse error: ${err.message}`;
          console.error('[NET] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        netTelemetry.wsState = 'CLOSED';
        if (!this.isExplicitlyClosed) {
          gameState.setConnectionStatus(false, 'Disconnected');
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        netTelemetry.wsState = 'ERROR';
        netTelemetry.lastError = 'WebSocket connection error';
        console.error('[NET] WebSocket error:', err);
        gameState.setConnectionStatus(false, 'Connection Error');
      };
    } catch (e: any) {
      netTelemetry.wsState = 'ERROR';
      netTelemetry.lastError = String(e.message || e);
      console.error('[NET] Connection attempt failed:', e);
      this.scheduleReconnect();
    }
  }

  private handleMessage(msg: ServerMessage) {
    try {
      if ((msg as any).type === 'server_welcome') {
        const welcome = msg as any;
        const serverCommit = welcome.serverCommit || welcome.buildId || 'unknown';
        const serverPid = welcome.serverPid || 0;
        const proto = welcome.protocolVersion || '1.0.0';

        (window as any).__SERVER_BUILD_FINGERPRINT__ = welcome;
        (window as any).__DOMINION_BUILD_INFO__ = {
          clientCommit: CLIENT_COMMIT,
          serverCommit: serverCommit,
          serverPid: serverPid,
          protocolVersion: proto,
          buildTimestamp: welcome.buildTimestamp,
        };

        console.log('==================================================');
        console.log(`CLIENT COMMIT = ${CLIENT_COMMIT}`);
        console.log(`SERVER COMMIT = ${serverCommit}`);
        console.log(`PROTOCOL = ${proto}`);
        console.log(`SERVER PID = ${serverPid}`);
        console.log('==================================================');

        const isMatch = serverCommit === CLIENT_COMMIT;
        (window as any).__DOMINION_BUILD_MATCH__ = isMatch;

        // Render development diagnostic pill in browser
        if (typeof document !== 'undefined') {
          let badge = document.getElementById('dominion-dev-badge');
          if (!badge) {
            badge = document.createElement('div');
            badge.id = 'dominion-dev-badge';
            badge.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:99999;background:rgba(7,17,28,0.88);border:1px solid rgba(255,255,255,0.18);border-radius:4px;padding:3px 8px;font-family:monospace;font-size:11px;color:#cbd5e1;pointer-events:none;display:flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(0,0,0,0.4);';
            document.body.appendChild(badge);
          }
          const dotColor = isMatch ? '#22c55e' : '#ef4444';
          badge.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${dotColor};box-shadow:0 0 6px ${dotColor};"></span><span>DEV ${CLIENT_COMMIT.slice(0, 7)} · SERVER ${serverCommit.slice(0, 7)}</span>`;

          // If mismatch in local development, display prominent warning overlay
          if (!isMatch && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            console.error(`[BUILD MISMATCH ERROR] Client commit (${CLIENT_COMMIT.slice(0, 7)}) differs from Server commit (${serverCommit.slice(0, 7)})!`);
            let modal = document.getElementById('dominion-build-mismatch-modal');
            if (!modal) {
              modal = document.createElement('div');
              modal.id = 'dominion-build-mismatch-modal';
              modal.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
              modal.innerHTML = `
                <div style="background:#0f172a;border:2px solid #ef4444;border-radius:12px;padding:28px;max-width:540px;text-align:center;color:#f8fafc;font-family:sans-serif;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);">
                  <div style="font-size:26px;font-weight:bold;margin-bottom:12px;color:#ef4444;">⚠️ BUILD MISMATCH</div>
                  <div style="font-size:14px;line-height:1.6;color:#cbd5e1;margin-bottom:24px;">
                    Localhost client and server revisions do not match:<br><br>
                    <div style="background:#1e293b;padding:12px;border-radius:6px;font-family:monospace;text-align:left;font-size:12px;margin-bottom:12px;">
                      <div><strong style="color:#38bdf8;">CLIENT COMMIT:</strong> ${CLIENT_COMMIT}</div>
                      <div><strong style="color:#f87171;">SERVER COMMIT:</strong> ${serverCommit}</div>
                      <div><strong style="color:#94a3b8;">SERVER PID:</strong> ${serverPid}</div>
                    </div>
                    Restart the development environment using <code>./start_dev.ps1</code> to synchronize binaries.
                  </div>
                  <button onclick="location.reload()" style="background:#dc2626;color:white;border:none;padding:10px 24px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:13px;">RELOAD CLIENT</button>
                </div>
              `;
              document.body.appendChild(modal);
            }
          }
        }
      } else if (msg.type === 'world_snapshot') {
        this.awaitingOwnershipResync = false;
        netTelemetry.snapshotReceived = true;
        netTelemetry.snapshotFactions = msg.factions?.length || 0;
        
        let ownedCount = 0;
        if (msg.cells) {
          for (let i = 0; i < msg.cells.length; i++) {
            const c = msg.cells[i];
            const owner = c.ownerId !== undefined ? c.ownerId : (c as any).owner_id;
            if (owner > 0) ownedCount++;
          }
        }
        netTelemetry.snapshotOwnedCells = ownedCount;

        gameState.applySnapshot(msg);
        const snapMs = msg.matchState ?? (msg as any).match_state;
        if (snapMs) {
          const mId = snapMs.match_id ?? snapMs.matchId;
          if (mId) {
            this.currentMatchId = mId;
            (window as any).__DOMINION_MATCH_ID__ = mId;
          }
          const ph = snapMs.phase;
          if (ph) {
            this.currentMatchPhase = ph;
            (window as any).__DOMINION_MATCH_PHASE__ = ph;
          }
        }
        // A snapshot is only sent after the authoritative join/resume path.
        // Reassert the gameplay surface here so reconnects cannot leave the
        // command HUD visible while input remains gated as HOME_STATE.
        const civSelector = (window as any).__DOMINION_CIVILIZATION_SELECTOR__;
        if (civSelector?.setProductMode) {
          civSelector.setProductMode('MATCH_ACTIVE');
        } else {
          uiStateManager.setState('IN_GAME_STATE');
        }
        netTelemetry.gameStateFactions = gameState.factions.size;
        netTelemetry.hudFactions = gameState.factions.size;
        (window as any).__DOMINION_OWNERSHIP_SYNC__ = {
          status: 'MATCHED',
          ownershipRevision: gameState.ownershipRevision,
          receivedAt: performance.now(),
        };
      } else if (msg.type === 'cell_delta_batch') {
        const ownershipRevision = msg.ownershipRevision ?? msg.sequence;
        const currentRevision = gameState.ownershipRevision;
        if (this.awaitingOwnershipResync) {
          return;
        }
        if (ownershipRevision < currentRevision) {
          // A queued delta from before a recovery snapshot is stale.
          return;
        }
        if (ownershipRevision > currentRevision + 1) {
          netTelemetry.ownershipRevisionGaps++;
          this.requestOwnershipResync(currentRevision, ownershipRevision);
          return;
        }
        const deltaMs = msg.matchState ?? (msg as any).match_state;
        if (deltaMs) {
          const mId = deltaMs.match_id ?? deltaMs.matchId;
          if (mId) {
            this.currentMatchId = mId;
            (window as any).__DOMINION_MATCH_ID__ = mId;
          }
          const ph = deltaMs.phase;
          if (ph) {
            this.currentMatchPhase = ph;
            (window as any).__DOMINION_MATCH_PHASE__ = ph;
          }
        }
        gameState.applyDeltas(msg.deltas, msg.tick, msg.sequence, msg.fronts, msg.matchState, msg.pendingAlliances, ownershipRevision);
        const playerId = gameState.yourFactionId;
        const playerCells = msg.deltas
          .filter((delta: any) => (delta.ownerId ?? delta.owner_id) === playerId)
          .map((delta: any) => delta.index);
        if (playerCells.length > 0) {
          const connectedCells = playerCells.filter((index: number) => {
            const x = index % gameState.width;
            const y = Math.floor(index / gameState.width);
            return (x > 0 && gameState.cellOwners[index - 1] === playerId)
              || (x + 1 < gameState.width && gameState.cellOwners[index + 1] === playerId)
              || (y > 0 && gameState.cellOwners[index - gameState.width] === playerId)
              || (y + 1 < gameState.height && gameState.cellOwners[index + gameState.width] === playerId);
          });
          const progress = (window as any).__DOMINION_EXPANSION_PROGRESS__ as any[];
          progress.push({
            receivedAt: performance.now(),
            authoritative: true,
            ownershipRevision,
            tick: msg.tick,
            cells: playerCells,
            connectedCells: connectedCells.length,
          });
          if (progress.length > 512) progress.splice(0, progress.length - 512);
        }
      } else if (msg.type === 'server_metrics') {
        gameState.applyMetrics(msg);
      } else if (msg.type === 'faction_update') {
        for (const faction of msg.factions) {
          gameState.factions.set(faction.factionId, faction);
        }
        if (msg.ports) gameState.ports = msg.ports.map((port: any) => ({
          ...port,
          cellIndex: port.cellIndex ?? port.cell_index,
          ownerId: port.ownerId ?? port.owner_id,
          complete: port.complete ?? false,
          remainingSeconds: port.remainingSeconds ?? port.remaining_seconds ?? 0,
        }));
        if (msg.alliances) gameState.alliances = msg.alliances;
        gameState.applyAllianceProposals(msg.pendingAlliances);
        netTelemetry.gameStateFactions = gameState.factions.size;
        netTelemetry.hudFactions = gameState.factions.size;
        gameState.notify('FACTIONS_CHANGED');
      } else if (msg.type === 'first_contact') {
        const fA = gameState.factions.get(msg.factionA)?.displayName || `Faction ${msg.factionA}`;
        const fB = gameState.factions.get(msg.factionB)?.displayName || `Faction ${msg.factionB}`;
        console.log(`[EVENT] First Contact between ${fA} and ${fB}!`);
      } else if (msg.type === 'expand_result') {
        (window as any).__DOMINION_LAST_EXPAND_RESULT__ = msg;
        const pendingIntent = (window as any).__DOMINION_PENDING_PRESENTATION_OPERATION__;
        if (pendingIntent
          && pendingIntent.mode === (gameState.operationMode || 'FOCUS')
          && pendingIntent.targetCell === msg.requestedTarget) {
          pendingIntent.resolvedAnchor = msg.resolvedAnchor ?? null;
          pendingIntent.confirmedAt = performance.now();
        }
        const size = msg.actualSize || 0;
        const areaKm2 = Math.round(size * 1550);
        const isSuccess = Boolean(msg.accepted && size > 0);
        const reasonText = msg.reason === 'accepted' ? 'Insufficient territory gain' : (msg.reason ? msg.reason.replaceAll('_', ' ') : 'No territory gained');
        (window as any).__DOMINION_COMMAND_UI__?.showToast(
          isSuccess ? `NEUTRAL EXPANSION SECURED · ${gameState.operationMode} · +${areaKm2.toLocaleString()} km²` : `EXPANSION HELD · ${reasonText}`,
          isSuccess ? 'good' : 'warn',
        );
      } else if (msg.type === 'attack_result') {
        (window as any).__DOMINION_LAST_ATTACK_RESULT__ = msg;
        gameState.applyAttackResult(msg);
        const labels: Record<string, string> = {
          accepted: 'Operation authorized',
          cancelled: 'Offensive halted',
          no_shared_front: 'No shared front',
          insufficient_population: 'Insufficient Population',
          allied_target: 'Alliance prevents an ordinary attack',
          invalid_target: 'Target must be enemy land',
          invalid_source: 'No valid local frontier at that point',
          attacker_eliminated: 'Your faction is defeated',
          defender_eliminated: 'Target faction is defeated',
          match_finished: 'Match has finished',
          no_active_match: 'No active match',
          front_not_active: 'Front is not active',
          front_not_found: 'Front not found',
          not_front_attacker: 'Only the attacker may halt this offensive',
        };
        const label = labels[msg.reason] ?? msg.reason.replaceAll('_', ' ');
        (window as any).__DOMINION_COMMAND_UI__?.showToast(
          msg.accepted
            ? `${label}${msg.deployedPopulation ? ` · ${Math.round(msg.deployedPopulation).toLocaleString()} deployed` : ''}`
            : `Order declined · ${label}`,
          msg.accepted ? 'good' : 'warn',
        );
      } else if (msg.type === 'port_result') {
        gameState.applyPortResult(msg);
        (window as any).__DOMINION_COMMAND_UI__?.showToast(
          msg.accepted ? `Port construction started · ${Math.round(msg.populationCost).toLocaleString()} Population` : `Port order declined · ${msg.reason.replaceAll('_', ' ')}`,
          msg.accepted ? 'good' : 'warn',
        );
      } else if (msg.type === 'alliance_result') {
        gameState.applyAllianceResult(msg);
        (window as any).__DOMINION_COMMAND_UI__?.showToast(
          msg.pending ? 'Alliance offer sent · awaiting response' : msg.accepted ? 'Alliance recognized' : `Alliance declined · ${msg.reason.replaceAll('_', ' ')}`,
          msg.accepted ? 'good' : 'warn',
        );
      } else if (msg.type === 'reinforce_result') {
        gameState.applyReinforceResult(msg);
        (window as any).__DOMINION_COMMAND_UI__?.showToast(
          msg.accepted ? `Reinforcement deployed · ${Math.round(msg.deployedPopulation).toLocaleString()} Population` : `Reinforcement declined · ${msg.reason.replaceAll('_', ' ')}`,
          msg.accepted ? 'good' : 'warn',
        );
      } else if (msg.type === 'atlas_notification') {
        if (uiStateManager.getAppSurface() === AppSurface.MATCH) {
          const notif = msg as any;
          const tone = (notif.eventType?.includes('CAPTURED') || notif.eventType?.includes('COLLAPSED')) ? 'warn' : 'good';
          (window as any).__DOMINION_COMMAND_UI__?.showToast(notif.message || notif.eventType, tone, 'MATCH');
        }
      } else if (msg.type === 'auth_snapshot') {
        const snap = msg as any;
        accountService.applyServerSnapshot({
          accountId: snap.accountId,
          sessionToken: snap.sessionToken,
          playerTag: snap.playerTag,
          displayName: snap.displayName,
          accountType: snap.accountType,
          walletBalance: snap.walletBalance,
          entitlements: snap.entitlements || [],
          equippedBladeSkin: snap.equippedBladeSkin || 'blade_standard',
          reactionWheel: snap.reactionWheel || [],
          isDevMode: Boolean(snap.isDevMode),
        });
      } else if (msg.type === 'auth_conflict') {
        const conf = msg as any;
        accountService.handleAuthConflict(conf.existingAccountId, conf.message);
      } else if (msg.type === 'commerce_result') {
        console.log('[NET] Authoritative commerce result:', msg);
      } else if (msg.type === 'meta_error') {
        console.warn('[NET] Server meta error:', (msg as any).code, (msg as any).message);
      } else if (msg.type === 'reaction_broadcast') {
        // Strict presentation boundary: reactions are MATCH-scoped only
        if (uiStateManager.getAppSurface() !== AppSurface.MATCH) {
          return;
        }
        // Strict mute privacy: drop at network boundary before DOM, coordinates, or audio
        if (reactionMapRenderer.isMuted(msg.playerFactionId, msg.playerTag, msg.playerName)) {
          return;
        }
        const renderer = (window as any).__DOMINION_RENDERER__;
        let sx = window.innerWidth / 2;
        let sy = window.innerHeight / 2 - 40;
        if (msg.cellIndex !== undefined && msg.cellIndex !== null && renderer) {
          const wx = msg.cellIndex % gameState.width;
          const wy = Math.floor(msg.cellIndex / gameState.width);
          const scr = renderer.worldToScreen(wx, wy);
          if (scr) { sx = scr.x; sy = scr.y; }
        }
        reactionMapRenderer.spawnReaction({
          reactionId: msg.reactionId,
          senderName: msg.playerName,
          senderTag: msg.playerTag,
          factionId: msg.playerFactionId,
          screenX: sx,
          screenY: sy,
        });
      } else {
        netTelemetry.unknownMessageTypes++;
      }
    } catch (e: any) {
      netTelemetry.lastError = `Message handling error: ${e.message}`;
      console.error(`[NET] Failed handling message type ${(msg as any)?.type}:`, e);
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitlyClosed || this.reconnectTimer !== undefined) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    gameState.setConnectionStatus(false, `Reconnecting in ${Math.round(delay / 1000)}s...`);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      if (!this.isExplicitlyClosed) this.connect();
    }, delay);
  }

  private requestOwnershipResync(lastRevision: number, receivedRevision: number): void {
    if (this.awaitingOwnershipResync) return;
    this.awaitingOwnershipResync = true;
    netTelemetry.snapshotResyncRequests++;
    (window as any).__DOMINION_OWNERSHIP_SYNC__ = {
      status: 'RESYNC_REQUESTED',
      lastRevision,
      receivedRevision,
      requestedAt: performance.now(),
    };
    console.warn(`[NET OWNERSHIP] revision gap ${lastRevision} -> ${receivedRevision}; requesting authoritative snapshot`);
    this.send({ type: 'request_snapshot' });
  }

  public send(msg: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  public sendAttack(sourceCellIndex: number, targetCellIndex: number, commitPercent: number = 0.5, requestedTargetCellIndex: number = targetCellIndex): boolean {
    return this.send({
      type: 'attack_command',
      sourceCellIndex,
      targetCellIndex,
      requestedTargetCellIndex,
      attackType: 'LAND_OFFENSIVE',
      frontId: null,
      commitPercent,
    });
  }

  public sendCancelAttack(frontId: number): boolean {
    return this.send({ type: 'cancel_attack', frontId });
  }

  public sendReinforce(frontId: number, commitPercent: number = 0.25): boolean {
    return this.send({ type: 'reinforce_front', frontId, commitPercent });
  }

  public sendExpand(targetCellIndex: number, mode?: string, commitPercent?: number): boolean {
    const selectedMode = mode || gameState.operationMode || 'FOCUS';
    if (typeof window !== 'undefined' && (selectedMode === 'FOCUS' || selectedMode === 'FRONTIER')) {
      const context = gameState.selectionContext;
      (window as any).__DOMINION_PENDING_PRESENTATION_OPERATION__ = {
        mode: selectedMode,
        sourceCell: context?.sourceCell ?? gameState.selectedSourceCell ?? null,
        targetCell: context?.targetCell ?? targetCellIndex,
        resolvedAnchor: null,
        sentAt: performance.now(),
      };
    }
    return this.send({
      type: 'expand_command',
      targetCellIndex,
      mode: selectedMode,
      commitPercent: commitPercent || (gameState.populationCommitPercent / 100),
    });
  }

  public sendDefenseFocus(cellIndex: number, population: number): boolean {
    return this.send({ type: 'defense_focus', cellIndex, population });
  }

  public sendReleaseDefenseFocus(cellIndex: number): boolean {
    return this.send({ type: 'release_defense_focus', cellIndex });
  }

  public sendBuildPort(cellIndex: number): boolean {
    return this.send({ type: 'build_port', cellIndex });
  }

  public sendAmphibiousAttack(portCellIndex: number, targetCellIndex: number, commitPercent: number): boolean {
    return this.send({ type: 'amphibious_attack', portCellIndex, targetCellIndex, commitPercent });
  }

  public sendAllianceOffer(factionId: number): boolean {
    return this.send({ type: 'offer_alliance', factionId });
  }

  public sendAllianceResponse(proposalId: number, accept: boolean): boolean {
    return this.send({ type: 'alliance_response', proposalId, accept });
  }

  public sendReaction(reactionId: string, cellIndex?: number | null, frontId?: number | null): boolean {
    return this.send({
      type: 'send_reaction',
      reactionId,
      cellIndex: cellIndex ?? gameState.selectedTargetCell ?? gameState.selectedSourceCell ?? (gameState.playerFaction?.capitalCell ?? null),
      frontId: frontId ?? gameState.activeFrontId ?? null,
    });
  }

  public sendDevSetPaused(paused: boolean): boolean {
    return this.send({
      type: 'dev_set_paused',
      paused,
    });
  }

  public requestDevCleanMatch(civId?: string, seed?: number, paused?: boolean): void {
    console.log('[NET] Requesting dev clean match...', civId, seed, paused);
    this.send({
      type: 'dev_clean_match',
      civilizationId: civId || 'roma',
      seed: seed ?? 42,
      paused: paused ?? false,
    });
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer !== undefined) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const gameClient: GameClient = (typeof window !== 'undefined' && window.__DOMINION_GAME_CLIENT__) || new GameClient();
if (typeof window !== 'undefined') {
  (window as any).requestDevCleanMatch = (civId?: string, seed?: number, paused?: boolean) => gameClient.requestDevCleanMatch(civId, seed, paused);
  (window as any).__DOMINION_DEV__ = {
    setPaused: (paused: boolean) => gameClient.sendDevSetPaused(paused),
    cleanMatch: (civId?: string, seed?: number, paused?: boolean) => gameClient.requestDevCleanMatch(civId, seed, paused),
  };
}
