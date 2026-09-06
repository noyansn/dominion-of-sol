/**
 * DOMINION OF SOL — ONLINE MATCHMAKING HUB & CONTEST SCHEDULER
 * Client state contracts, 2x2 World queues, and recurring 10-minute Contest sync.
 *
 * HONESTY CONTRACT:
 * Backend Multi-Room Matchmaking is currently PARTIAL.
 * The authoritative server runs a single game room at ws://127.0.0.1:8765.
 * This client hub manages queue state, local contest timers, and provides
 * production-ready protocol contracts.
 */

export interface MatchWorldSummary {
  id: string;
  name: string;
  status: 'FORMING' | 'COUNTDOWN' | 'ACTIVE';
  queuedPlayers: number;
  maxPlayers: number;
  estimatedWaitSec: number;
  latencyMs: number;
  region: string;
}

export interface ContestSchedule {
  nextTimestampMs: number;
  secondsRemaining: number;
  isRegistered: boolean;
  participantCount: number;
}

export type QueueState =
  | { mode: 'NONE' }
  | { mode: 'WORLD'; worldId: string; joinedAt: number; initialQueued: number }
  | { mode: 'CONTEST'; registeredAt: number };

export class MatchmakingHub {
  public static readonly BACKEND_STATUS = 'PARTIAL / PROTOCOL READY';

  private worlds: MatchWorldSummary[] = [
    {
      id: 'world_1',
      name: 'WORLD I · ATLANTICUS',
      status: 'FORMING',
      queuedPlayers: 64,
      maxPlayers: 101,
      estimatedWaitSec: 35,
      latencyMs: 24,
      region: 'Frankfurt · EU West',
    },
    {
      id: 'world_2',
      name: 'WORLD II · EURASIA',
      status: 'FORMING',
      queuedPlayers: 81,
      maxPlayers: 101,
      estimatedWaitSec: 18,
      latencyMs: 38,
      region: 'Warsaw · EU Central',
    },
    {
      id: 'world_3',
      name: 'WORLD III · PACIFICA',
      status: 'FORMING',
      queuedPlayers: 42,
      maxPlayers: 101,
      estimatedWaitSec: 55,
      latencyMs: 82,
      region: 'Tokyo · Asia East',
    },
    {
      id: 'world_4',
      name: 'WORLD IV · SOLARIS',
      status: 'FORMING',
      queuedPlayers: 93,
      maxPlayers: 101,
      estimatedWaitSec: 10,
      latencyMs: 65,
      region: 'Virginia · US East',
    },
  ];

  private queueState: QueueState = { mode: 'NONE' };
  private contestRegistered = false;
  private listeners: Array<() => void> = [];
  private timerId: any = null;

  constructor() {
    this.startClock();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify(): void {
    for (const cb of this.listeners) cb();
  }

  public getWorlds(): readonly MatchWorldSummary[] {
    return this.worlds;
  }

  public getQueueState(): QueueState {
    return this.queueState;
  }

  /**
   * 10-Minute Recurring World Contest Clock:
   * Fixed at HH:00, HH:10, HH:20, HH:30, HH:40, HH:50
   */
  public getContestSchedule(): ContestSchedule {
    const now = Date.now();
    const periodMs = 10 * 60 * 1000; // 10 minutes
    const nextTimestampMs = Math.ceil(now / periodMs) * periodMs;
    const secondsRemaining = Math.max(0, Math.floor((nextTimestampMs - now) / 1000));

    return {
      nextTimestampMs,
      secondsRemaining,
      isRegistered: this.contestRegistered,
      participantCount: this.contestRegistered ? 88 : 87,
    };
  }

  public joinWorldQueue(worldId: string): void {
    const world = this.worlds.find(w => w.id === worldId);
    if (!world) return;

    // Leaving contest registration if joining world queue
    this.contestRegistered = false;

    this.queueState = {
      mode: 'WORLD',
      worldId,
      joinedAt: Date.now(),
      initialQueued: world.queuedPlayers,
    };

    this.notify();
  }

  public registerForContest(): void {
    // Leaving world queue if registering for contest
    this.queueState = { mode: 'CONTEST', registeredAt: Date.now() };
    this.contestRegistered = true;
    this.notify();
  }

  public leaveQueue(): void {
    this.queueState = { mode: 'NONE' };
    this.contestRegistered = false;
    this.notify();
  }

  private startClock(): void {
    this.timerId = setInterval(() => {
      // Simulate subtle living heartbeat of queues
      if (this.queueState.mode === 'WORLD') {
        const targetWorld = this.worlds.find(w => w.id === (this.queueState as any).worldId);
        if (targetWorld && targetWorld.queuedPlayers < targetWorld.maxPlayers) {
          // Bounded increment
          if (Math.random() < 0.4) {
            targetWorld.queuedPlayers = Math.min(targetWorld.maxPlayers, targetWorld.queuedPlayers + 1);
          }
        }
      }

      // Check contest countdown
      const contest = this.getContestSchedule();
      if (contest.secondsRemaining === 0 && this.contestRegistered) {
        // Contest start triggered
        console.log('[MATCHMAKING] World Contest countdown reached T=0! Launching match.');
        this.leaveQueue();
        (window as any).__DOMINION_PRODUCT_SHELL__?.launchMatch('WORLD CONTEST · SYNCHRONIZED MATCH');
      }

      this.notify();
    }, 1000);
  }

  public destroy(): void {
    if (this.timerId) clearInterval(this.timerId);
    this.listeners = [];
  }
}

export const matchmakingHub = new MatchmakingHub();
