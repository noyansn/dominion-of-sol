/**
 * WarRoomManager: Manages the 1-Minute World Cycle and 10-Minute World Contest Takeover.
 * Provides synchronized timing, world lifecycle tracking, and clean queue interactions.
 */

export interface WarWorldInstance {
  id: string;
  name: string;
  cycleIndex: number;
  openTimestamp: number;
  playerCount: number;
  maxPlayers: number;
  latencyMs: number;
  status: 'FORMING' | 'OPEN' | 'STARTING' | 'ACTIVE';
  theaterName: string;
  mapSize: string;
  climate: string;
  terrain: string;
  gameSpeed: string;
  victoryCondition: string;
  thumbnailUrl: string;
}

export class WarRoomManager {
  private selectedWorldId: string | null = null;
  private timerHandle?: number;
  private subscribers = new Set<() => void>();

  public subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  private notify(): void {
    for (const sub of this.subscribers) sub();
  }

  public start(): void {
    if (this.timerHandle) return;
    this.timerHandle = window.setInterval(() => {
      this.notify();
    }, 1000);
  }

  public stop(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = undefined;
    }
  }

  /**
   * Returns current 10-minute contest countdown string and state.
   */
  public getContestState(): {
    secondsUntilContest: number;
    countdownStr: string;
    isContestWindowActive: boolean;
    contestTitle: string;
  } {
    const now = Date.now();
    const cycleMs = 10 * 60 * 1000;
    const elapsedInCycle = now % cycleMs;
    const remainingMs = cycleMs - elapsedInCycle;
    const secondsRemaining = Math.floor(remainingMs / 1000);

    const m = Math.floor(secondsRemaining / 60);
    const s = secondsRemaining % 60;
    const countdownStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    // Contest takeover activates during the 60s pre-launch window and 30s launch window
    const isContestWindowActive = secondsRemaining <= 60 || elapsedInCycle <= 30_000;

    return {
      secondsUntilContest: secondsRemaining,
      countdownStr,
      isContestWindowActive,
      contestTitle: 'WORLD CONTEST · ARENA OF SOL',
    };
  }

  /**
   * Returns seconds until the next 1-minute world spawns.
   */
  public getNextWorldCountdown(): { seconds: number; countdownStr: string } {
    const now = Date.now();
    const elapsedInMinute = now % 60000;
    const remainingSec = Math.max(0, Math.floor((60000 - elapsedInMinute) / 1000));
    const countdownStr = `00:${String(remainingSec).padStart(2, '0')}`;
    return { seconds: remainingSec, countdownStr };
  }

  /**
   * Calculates the 4 active/upcoming regular Worlds scheduled in strict 1-minute cycles.
   */
  public getUpcomingWorlds(): WarWorldInstance[] {
    const now = Date.now();
    const minuteMs = 60 * 1000;
    const currentMinuteEpoch = Math.floor(now / minuteMs);

    const baseWorldNumber = 1588 + (currentMinuteEpoch % 900);

    const theaters = [
      { name: 'MEDITERRANEAN SEA', mapSize: 'Large', climate: 'Mediterranean', terrain: 'Coastline / Highlands / Plains', thumb: '/assets/worlds/theater_mediterranean.jpg' },
      { name: 'DANUBE & RHINE RIVERLANDS', mapSize: 'Medium', climate: 'Temperate Continental', terrain: 'River Valley / Dense Forest / Rolling Hills', thumb: '/assets/worlds/theater_danube_rhine.jpg' },
      { name: 'MESOAMERICAN BASIN', mapSize: 'Large', climate: 'Tropical Rainforest', terrain: 'Rainforest / Stepped Ridges / Cenotes', thumb: '/assets/worlds/theater_mesoamerica.jpg' },
      { name: 'ZAGROS & CASPIAN PLATEAU', mapSize: 'Extra Large', climate: 'Arid Plateau', terrain: 'High Plateau / Mountain Passes / Oasis Basins', thumb: '/assets/worlds/theater_zagros_caspian.jpg' },
    ];

    const worlds: WarWorldInstance[] = [];
    for (let i = 0; i < 4; i++) {
      const worldNum = baseWorldNumber + i;
      const targetTime = (currentMinuteEpoch + i) * minuteMs;
      const diffSec = Math.floor((targetTime - now) / 1000);

      let status: 'FORMING' | 'OPEN' | 'STARTING' = 'FORMING';
      let playerCount = 48 + (worldNum * 19) % 70;
      if (i === 0) {
        status = diffSec < 20 ? 'STARTING' : 'OPEN';
        playerCount = Math.min(194, 150 + (worldNum % 35));
      } else if (i === 1) {
        status = 'OPEN';
        playerCount = Math.min(138, 90 + (worldNum % 35));
      } else {
        status = 'FORMING';
        playerCount = Math.min(65, 30 + (worldNum % 25));
      }

      const th = theaters[i % theaters.length];
      worlds.push({
        id: `world-${worldNum}`,
        name: `WORLD ${worldNum}`,
        cycleIndex: i,
        openTimestamp: targetTime,
        playerCount,
        maxPlayers: 200,
        latencyMs: 18 + (worldNum % 14),
        status,
        theaterName: th.name,
        mapSize: th.mapSize,
        climate: th.climate,
        terrain: th.terrain,
        gameSpeed: 'Normal',
        victoryCondition: 'Domination',
        thumbnailUrl: th.thumb,
      });
    }

    // Do NOT auto-select worlds[0]; user must deliberately click to select.
    return worlds;
  }

  public getSelectedWorldId(): string | null {
    return this.selectedWorldId;
  }

  public selectWorld(worldId: string | null): void {
    this.selectedWorldId = worldId;
    this.notify();
  }

  public resetSelection(): void {
    this.selectedWorldId = null;
  }
}

export const warRoomManager = new WarRoomManager();
warRoomManager.start();
