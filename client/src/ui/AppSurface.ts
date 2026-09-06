/**
 * DOMINION OF SOL — AUTHORITATIVE PRODUCT SURFACES & EVENT SCOPE
 * 
 * Strict lifecycle separation across three primary product surfaces:
 * - HOME: Atlas globe, terrain/ocean/atmosphere, civ selector, nation branding, armory.
 *         STRICTLY ZERO political factions, zero sovereign seeds, zero capitals, zero match toasts.
 * - WAR_ROOM: Realm and world browser, match queue, multiplayer lobby.
 *             Preview only; no active match ownership instantiated.
 * - MATCH: Authoritative active gameplay match. 101 sovereign seed territories, capitals,
 *          fronts, operations, command blade, combat HUD, match event toasts.
 */

export enum AppSurface {
  HOME = 'HOME',
  WAR_ROOM = 'WAR_ROOM',
  MATCH = 'MATCH',
}

export type EventScope = 'META' | 'MATCH';
