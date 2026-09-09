import * as PIXI from 'pixi.js';
import { gameState } from '../game/GameState';
import { gameClient, netTelemetry } from '../game/GameClient';
import { bootTelemetry } from '../game/BootTelemetry';
import { GeographyRenderer } from './GeographyRenderer';
import { PoliticalPresentationRenderer } from './PoliticalPresentationRenderer';
import { PoliticalSmoothPresentationRenderer } from './PoliticalSmoothPresentationRenderer';
import { PoliticalTransitionManager } from './PoliticalTransitionManager';
import { PoliticalColorTexture } from './PoliticalColorTexture';
import { PoliticalOwnerIdTexture } from './PoliticalOwnerIdTexture';
import { PoliticalPaletteTexture } from './PoliticalPaletteTexture';
import { ENABLE_POLITICAL_PRESENTATION_SMOOTHING, ENABLE_POLITICAL_TRANSITIONS } from './FeatureFlags';
import { PoliticalBorderRenderer } from './PoliticalBorderRenderer';
import { CapitalRenderer } from './CapitalRenderer';
import { LabelRenderer } from './LabelRenderer';
import { SelectionRenderer } from './SelectionRenderer';
import { WarRenderer } from './WarRenderer';

import { PoliticalSurfaceCache } from './PoliticalSurfaceCache';
import { WorldInputController, wheelTelemetry } from './WorldInputController';
import { StrategicSiteRenderer } from './StrategicSiteRenderer';
import { POLITICAL_SCALE, POLITICAL_WIDTH, politicalToWorld, worldToPolitical } from './PoliticalSpace';
import { WORLD_WIDTH, WORLD_HEIGHT, cellToWorld } from './WorldSpace';
import worldVisualMaskUrl from '../assets/world_visual_mask.bin?url';
import { worldLandMeshResource } from './WorldLandMeshResource';
import worldLandMeshUrl from '../assets/world_land_mesh.bin?url';
import { worldReliefTexture } from './WorldReliefTexture';
import worldReliefUrl from '../assets/world_relief.rgba?url';
import { worldBathymetryTexture } from './WorldBathymetryTexture';
import worldBathymetryUrl from '../assets/world_bathymetry.rgba?url';
import { terrainLodManager } from './TerrainLodManager';
import { GlobeRenderer } from './GlobeRenderer';
import { resolveTargetAtWorld } from '../game/TargetResolver';
import type { TargetResolution } from '../game/TargetResolver';
import { installPickingInspector, recordPickingReport } from './PickingInspector';
import { measureFrameSystem, recordPoliticalDirtyPixels } from '../ui/FramePerf';
import { uiStateManager, AppSurface } from '../ui/UIStateManager';

declare global {
  interface Window {
    __DOMINION_RENDERER__?: DominionRenderer;
    __DOMINION_RENDERER_INSTANCE_COUNT__?: number;
  }
}

export class DominionRenderer {
  private pendingPoliticalCells = new Set<number>();
  public app: PIXI.Application;
  public worldContainer: PIXI.Container;
  public overlayContainer: PIXI.Container;
  public politicalFillContainer: PIXI.Container;
  
  public geography: GeographyRenderer;

  public ownershipFallback: PoliticalPresentationRenderer;
  public ownershipPresentation: PoliticalSmoothPresentationRenderer;
  public ownershipTransition: PoliticalTransitionManager;
  public ownership: PoliticalPresentationRenderer | PoliticalSmoothPresentationRenderer;
  
  public activeMode: 'A0' | 'A1' = ENABLE_POLITICAL_PRESENTATION_SMOOTHING ? 'A1' : 'A0';
  
  public politicalColorTexture: PoliticalColorTexture;
  public politicalOwnerIdTexture: PoliticalOwnerIdTexture;
  public politicalPaletteTexture: PoliticalPaletteTexture;
  public surface: PoliticalSurfaceCache;
  public political: PoliticalBorderRenderer;
  public capitals: CapitalRenderer;
  public labels: LabelRenderer;
  public selection: SelectionRenderer;
  public war: WarRenderer;
  public strategicSites: StrategicSiteRenderer;
  public globe: GlobeRenderer;
  public isGlobeMode = false;
  public mapMode: 'POLITICAL' | 'TERRAIN' = 'POLITICAL';

  private inputController: WorldInputController;
  private unsubState?: () => void;
  private isPresentationInitialized = false;
  private isTransitionInitialized = false;
  private pendingInspectTimer?: number;
  private lastPickedTargetFactionId: number | null = null;
  public diagnosticMode: 'OFF' | 'OWNER_ZERO' | 'MESH_COVERAGE' = 'OFF';
  public a1InitFailed: boolean = false;
  private onKeyDown?: (e: KeyboardEvent) => void;
  private diagnosticText: PIXI.Text;
  private coastDiagnostic = new PIXI.Graphics();
  private coastDiagnosticEnabled = false;

  public fitScale = 1.0;
  public renderedFrameCount = 0;
  public firstPopulatedFrameAt = 0;

  constructor(app: PIXI.Application) {
    window.__DOMINION_RENDERER_INSTANCE_COUNT__ = (window.__DOMINION_RENDERER_INSTANCE_COUNT__ || 0) + 1;
    window.__DOMINION_RENDERER__ = this;
    (window as any).__DOMINION_RESOLVE_TARGET__ = resolveTargetAtWorld;

    this.app = app;
    this.worldContainer = new PIXI.Container();
    this.overlayContainer = new PIXI.Container();
    this.politicalFillContainer = new PIXI.Container();
    this.worldContainer.eventMode = 'none';
    this.overlayContainer.eventMode = 'none';
    this.politicalFillContainer.eventMode = 'none';
    
    this.diagnosticText = new PIXI.Text({
        text: 'POLITICAL: INIT',
        style: {
            fontFamily: 'monospace',
            fontSize: 10,
            fill: 0x00ffcc,
            stroke: { color: 0x000000, width: 3 },
            lineHeight: 14
        }
    });
    this.diagnosticText.position.set(10, window.innerHeight - 155);
    // Detailed diagnostics are opt-in. Normal gameplay must keep the map
    // unobstructed, including in Vite development sessions.
    this.diagnosticText.visible = false;
    
    this.worldContainer.sortableChildren = false;

    this.geography = new GeographyRenderer();

    this.ownershipFallback = new PoliticalPresentationRenderer();
    this.ownershipPresentation = new PoliticalSmoothPresentationRenderer();
    this.ownershipTransition = new PoliticalTransitionManager();
    
    if (ENABLE_POLITICAL_PRESENTATION_SMOOTHING) {
        this.ownership = this.ownershipPresentation;
    } else {
        this.ownership = this.ownershipFallback;
    }
    
    this.politicalColorTexture = new PoliticalColorTexture();
    this.politicalOwnerIdTexture = new PoliticalOwnerIdTexture();
    this.politicalPaletteTexture = new PoliticalPaletteTexture();
    
    this.surface = new PoliticalSurfaceCache();
    this.political = new PoliticalBorderRenderer(this.surface);
    this.capitals = new CapitalRenderer(this.surface);
    this.war = new WarRenderer(this.surface);
    this.strategicSites = new StrategicSiteRenderer();
    this.selection = new SelectionRenderer(this.surface);
    this.labels = new LabelRenderer(this.surface);
    this.globe = new GlobeRenderer(this.politicalOwnerIdTexture, this.politicalPaletteTexture, this.politicalColorTexture);

    this.inputController = new WorldInputController(this.worldContainer, this.app.canvas as any);
    this.coastDiagnostic.visible = false;
  }

  public async initStaticWorld() {
    this.worldContainer.addChild(this.geography.container);
    this.worldContainer.addChild(terrainLodManager.debugContainer);
    
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.globe.container);
    this.app.stage.addChild(this.globe.flatCoastlineDiagnostic);
    this.app.stage.addChild(this.overlayContainer);
    this.overlayContainer.addChild(this.coastDiagnostic);
    if ((import.meta as any).env?.DEV) {
      (window as any).__DOMINION_COAST_DIAGNOSTICS__ = {
        read: () => this.surface.getCoastDiagnostics?.(),
        toggle: () => {
          this.coastDiagnosticEnabled = !this.coastDiagnosticEnabled;
          this.coastDiagnostic.visible = this.coastDiagnosticEnabled;
          return this.coastDiagnosticEnabled;
        },
      };
    }
    
    if ((import.meta as any).env?.DEV) {
        this.app.stage.addChild(this.diagnosticText);
    }
    
    await gameState.loadVisualMask(worldVisualMaskUrl);
    console.log("[BOOT] visual mask loaded");
    
    const meshRes = await fetch(worldLandMeshUrl);
    const meshBuffer = await meshRes.arrayBuffer();
    worldLandMeshResource.init(meshBuffer);
    console.log("[BOOT] world mesh load success");
    
    await worldReliefTexture.load(worldReliefUrl);
    console.log("[BOOT] world relief load success");

    await worldBathymetryTexture.load(worldBathymetryUrl);
    console.log("[BOOT] world bathymetry load success");
    
    this.geography.init();
    console.log("[BOOT] geography init success");
    
    this.fitWorldToScreen();
    const renderState = (window as any).__DEV_RENDER_STATE__;
    if (renderState) renderState.staticWorldReady = true;
  }

  public async initDynamicLayers(bootStep: (msg: string) => void) {
    try {
        console.log("[BOOT] political surface init begin");
        this.surface.init();
        this.surface.fullSync();
        this.globe.init();
        // The network may deliver the snapshot before this renderer subscribes
        // during a fast boot. Populate all presentation textures from the
        // already-authoritative GameState as a readiness backstop.
        if (gameState.isInitialized && gameState.factions.size > 0) {
            this.politicalColorTexture.update(
                this.surface.ownerBuffer,
                gameState.factions,
                this.surface.surfaceRevision,
            );
            this.politicalOwnerIdTexture.update(
                this.surface.ownerBuffer,
                this.surface.surfaceRevision,
            );
            this.politicalPaletteTexture.update(gameState.factions);
        }
        (window as any).__DEV_SURFACE_CACHE__ = this.surface;
        console.log("[BOOT] political surface init success");
        
        this.politicalFillContainer.addChild(this.ownershipFallback.container);
        this.politicalFillContainer.addChild(this.ownershipPresentation.container);
        this.worldContainer.addChild(this.politicalFillContainer);
        
        this.ownershipFallback.container.visible = !ENABLE_POLITICAL_PRESENTATION_SMOOTHING;
        this.ownershipPresentation.container.visible = ENABLE_POLITICAL_PRESENTATION_SMOOTHING;
        
        const visibleCount = (this.ownershipFallback.container.visible ? 1 : 0) + (this.ownershipPresentation.container.visible ? 1 : 0);
        if (visibleCount !== 1) {
            throw new Error(`visiblePoliticalRendererCount is ${visibleCount}, expected 1`);
        }
        
        await this.ownershipFallback.init(this.surface, this.politicalOwnerIdTexture, this.politicalPaletteTexture);
        
        try {
            await this.ownershipPresentation.init(
                this.surface,
                this.politicalColorTexture,
                this.politicalOwnerIdTexture,
                this.politicalPaletteTexture,
            );
            this.isPresentationInitialized = true;
        } catch (e: any) {
            console.error(`[PoliticalRenderer] A1 INIT FAILED: ${e.message}`);
            this.a1InitFailed = true;
            this.isPresentationInitialized = false;
        }
        this.isTransitionInitialized = false;

        if (ENABLE_POLITICAL_TRANSITIONS) {
            this.ownershipTransition.init(this.politicalPaletteTexture, {
                getAuthoritativeOwnershipRevision: () => gameState.ownershipRevision,
                getOwnerBufferRevision: () => this.surface.surfaceRevision,
                getSurfaceMaskRevision: () => this.surface.surfaceRevision,
                getBasePoliticalTextureRevision: () => this.politicalColorTexture.sourceRevision,
            });
            this.ownershipTransition.onTransitionComplete = (cells: number[]) => {
                for (const c of cells) {
                    this.pendingPoliticalCells.add(c);
                }
            };
            this.politicalFillContainer.addChild(this.ownershipTransition.container);
            // Keep the already-authorized wipe above the full political fill;
            // this is presentation ordering only and does not alter ownership.
            this.politicalFillContainer.sortableChildren = true;
            this.ownershipTransition.container.zIndex = 100;
            this.politicalFillContainer.sortChildren();
            this.isTransitionInitialized = true;
        }

        console.log("[BOOT] ownership init success");
        bootStep("PROD 2 — OWNERSHIP ATTACHED");
    } catch (e: any) { bootStep("[BOOT FAIL] OWNERSHIP:\n" + e.stack); throw e; }

    try {
        this.worldContainer.addChild(this.political.container);
        this.political.init();
        bootStep("PROD 3 — POLITICAL BORDERS ATTACHED");
    } catch (e: any) { bootStep("PROD FAILED — POLITICAL BORDERS:\n" + e.message); throw e; }

    try {
        this.overlayContainer.addChild(this.capitals.container);
        this.capitals.init();
        bootStep("PROD 4 — CAPITALS ATTACHED");
    } catch (e: any) { bootStep("PROD FAILED — CAPITALS:\n" + e.message); throw e; }

    try {
        this.war.init();
        bootStep("PROD 5 — WAR SYSTEM ATTACHED");
    } catch (e: any) { bootStep("PROD FAILED — WAR SYSTEM:\n" + e.message); throw e; }

    try {
        this.worldContainer.addChild(this.strategicSites.container);
        this.strategicSites.init();
        this.strategicSites.container.visible = true;
        bootStep("PROD 5.5 — STRATEGIC SITES ATTACHED");
    } catch (e: any) { bootStep("PROD FAILED — STRATEGIC SITES:\n" + e.message); throw e; }

    try {
        this.overlayContainer.addChild(this.selection.container);
        this.selection.setSurface(this.surface);
        this.selection.init();
        bootStep("PROD 6 — SELECTION ATTACHED");
    } catch (e: any) { bootStep("PROD FAILED — SELECTION:\n" + e.message); throw e; }

    // Keep the opt-in F8 tile forensics above all world-space render layers so
    // tile IDs and outlines remain legible when the political surface is on.
    // It is hidden by default and does not affect normal composition.
    this.worldContainer.addChild(terrainLodManager.debugContainer);

    try {
        this.overlayContainer.addChild(this.labels.container);
        // War annotations use world coordinates, but render above the label
        // overlay so a compact real battle marker is not buried by a faction
        // name. The transform is mirrored in updateScreenSpaceOverlays().
        this.overlayContainer.addChild(this.war.container);
        this.labels.init();
        bootStep("PROD 7 — LABELS ATTACHED");
    } catch (e: any) { bootStep("PROD FAILED — LABELS:\n" + e.message); throw e; }

    const initialIsMatch = uiStateManager.getAppSurface() === AppSurface.MATCH;
    this.politicalFillContainer.visible = initialIsMatch;
    this.political.container.visible = initialIsMatch;
    this.capitals.container.visible = initialIsMatch;
    this.labels.container.visible = initialIsMatch;
    this.war.container.visible = initialIsMatch;
    this.strategicSites.container.visible = initialIsMatch;
    this.selection.container.visible = initialIsMatch;

    try {
        this.inputController.setup();
        this.inputController.onUserInputStart = () => {
            this.cancelCameraMotion();
        };
        installPickingInspector();
        bootStep("PROD 7 — INPUT CONTROLLER SETUP");
        // Default Home View to Full Globe Mode with clean planetary presentation
        this.setGlobeMode(true);
        this.globe.setMorph(1.0);
        this.globe.container.alpha = 1.0;
        this.globe.setPoliticalStrength(initialIsMatch ? 1.0 : 0.0);
        this.globe.homelandLayer.visible = !initialIsMatch;
    } catch (e: any) { bootStep("PROD FAILED — TICKER:\n" + e.message); throw e; }

    console.log("[BOOT] DominionRenderer init success");

    try {
        this.unsubState = gameState.subscribe((event, data) => {
            this.geography.updateLOD('MEDIUM');
            
            if (event === 'WORLD_SNAPSHOT') {
                if (ENABLE_POLITICAL_TRANSITIONS) {
                    this.ownershipTransition.clear();
                }
                this.pendingPoliticalCells.clear();
                this.surface.fullSync();
                this.politicalColorTexture.update(this.surface.ownerBuffer, gameState.factions, this.surface.surfaceRevision);
                this.politicalOwnerIdTexture.update(this.surface.ownerBuffer, this.surface.surfaceRevision);
                this.politicalPaletteTexture.update(gameState.factions);
                this.political.markDirty();
            } else if (event === 'CELL_DELTAS') {
                const transitionCells = ENABLE_POLITICAL_TRANSITIONS && gameState.dirtyCells.length > 0
                    ? this.ownershipTransition.handleDeltas(gameState.ownershipChanges, gameState.ownershipRevision)
                    : new Set<number>();
                for (const delta of gameState.dirtyCells) {
                    // Keep the visual surface on its last authoritative
                    // presentation until the already-authorized transition
                    // has wiped through the cell. GameState remains current;
                    // this only defers the presentation texture update.
                    if (!transitionCells.has(delta.index)) {
                        this.pendingPoliticalCells.add(delta.index);
                    }
                }
            } else if (event === 'FACTIONS_CHANGED') {
                this.politicalPaletteTexture.update(gameState.factions);
            } else if (event === 'VISUAL_MASK_READY') {
                this.surface.fullSync();
                this.politicalColorTexture.update(this.surface.ownerBuffer, gameState.factions, this.surface.surfaceRevision);
                this.politicalOwnerIdTexture.update(this.surface.ownerBuffer, this.surface.surfaceRevision);
                this.politicalPaletteTexture.update(gameState.factions);
                this.political.markDirty();
            }
            
            const isMatch = uiStateManager.getAppSurface() === AppSurface.MATCH;
            if (isMatch) {
                this.capitals.onGameStateUpdate(event);
                this.war.onGameStateUpdate(event);
                this.strategicSites.onGameStateUpdate(event);
                this.selection.onGameStateUpdate(event);
                this.labels.onGameStateUpdate(event);
                
                if (event === 'SELECTION_CHANGED') {
                    this.politicalColorTexture.updateSpotlight(this.surface.ownerBuffer, gameState.factions);
                    this.politicalPaletteTexture.update(gameState.factions);
                }

                if (event === 'WORLD_SNAPSHOT' || event === 'FACTIONS_CHANGED' || event === 'CELL_DELTAS' || event === 'VISUAL_MASK_READY') {
                    this.updatePoliticalRenderers();
                }
                
                if (event === 'WORLD_SNAPSHOT' || event === 'FACTIONS_CHANGED' || event === 'PORT_RESULT') {
                    this.updateScreenSpaceOverlays();
                }
                if (event === 'WORLD_SNAPSHOT' && uiStateManager.getAppSurface() === AppSurface.MATCH && !this.introPlayedForMatchId) {
                    this.handleMatchEntryCamera();
                }
            }
        });
        uiStateManager.subscribeSurface((surface) => {
            if (surface === AppSurface.HOME || surface === AppSurface.WAR_ROOM) {
                this.clearMatchPresentation();
                this.globe.homelandLayer.visible = (surface === AppSurface.HOME);
            } else if (surface === AppSurface.MATCH) {
                this.clearHomelandHalo();
                this.globe.homelandLayer.visible = false;
                this.syncMatchLayers();
                this.handleMatchEntryCamera();
            }
        });
        bootStep("PROD 8 — GAMESTATE SUBSCRIBED");
        const renderState = (window as any).__DEV_RENDER_STATE__;
        if (renderState) renderState.dynamicWorldReady = true;
    } catch (e: any) { bootStep("PROD FAILED — GAMESTATE:\n" + e.message); throw e; }

    this.inputController.onTransformChange = () => {
        // The atlas owns the normal strategy zoom range. Once the player has
        // deliberately zoomed farther out than the full-world framing, move
        // to the bounded planet presentation instead of leaving a tiny map
        // rectangle in an empty viewport.
        if (!this.isGlobeMode && this.fitScale > 0 &&
            this.worldContainer.scale.x < this.fitScale * 0.92) {
            this.setGlobeMode(true);
            return;
        }
        this.updateScreenSpaceOverlays();
    };
    this.inputController.onGlobeRotate = (dx, dy) => {
        this.globe.rotate(dx, dy);
        this.updateScreenSpaceOverlays();
    };
    this.inputController.onGlobeDragEnd = () => {
        this.globe.notifyDragEnd();
    };
    this.globe.onRotationChange = () => {
        this.updateScreenSpaceOverlays();
    };
    this.inputController.resolveTargetIdentity = (screenX: number, screenY: number) => {
        let worldX = 0, worldY = 0;
        if (this.isGlobeMode) {
            const world = this.globe.screenToWorld(screenX, screenY);
            if (!world) return null;
            worldX = world.x;
            worldY = world.y;
        } else {
            const rect = (this.app.canvas as HTMLCanvasElement).getBoundingClientRect();
            const local = this.worldContainer.toLocal(new PIXI.Point(screenX - rect.left, screenY - rect.top));
            worldX = local.x;
            worldY = local.y;
        }
        const context = resolveTargetAtWorld(gameState, worldX, worldY, screenX, screenY);
        const targetCell = context.targetCell ?? context.resolvedCell;
        return {
            key: targetCell !== null ? `${context.action}_${targetCell}` : null,
            actionable: context.action !== 'NONE',
        };
    };
    this.inputController.onGlobePick = (screenX: number, screenY: number) => {
        if ((window as any).__DOMINION_UI_STATE__ && (window as any).__DOMINION_UI_STATE__ !== 'IN_GAME_STATE') {
            return;
        }
        const world = this.globe.screenToWorld(screenX, screenY);
        if (!world) return;
        const context = resolveTargetAtWorld(gameState, world.x, world.y, screenX, screenY);
        recordPickingReport(context);
        gameState.selectContext(context);
        gameState.spotlightFactionId = context.ownerId > 0 ? context.ownerId : null;
        this.politicalPaletteTexture.update(gameState.factions);
        this.updateCoastDiagnostic(context);

        if (this.pendingInspectTimer !== undefined) {
            window.clearTimeout(this.pendingInspectTimer);
            this.pendingInspectTimer = undefined;
        }
        this.lastPickedTargetFactionId = context.ownerId > 0 ? context.ownerId : null;
        this.inputController.legacyGestureState.lastResolvedTargetId = this.lastPickedTargetFactionId;
        if (context.resolvedCell !== null) {
            this.inputController.legacyGestureState.lastResolvedCellX = context.resolvedCell % gameState.width;
            this.inputController.legacyGestureState.lastResolvedCellY = Math.floor(context.resolvedCell / gameState.width);
        }

        if (context.ownerId > 0) {
            this.pendingInspectTimer = window.setTimeout(() => {
                this.pendingInspectTimer = undefined;
                (window as any).__DOMINION_COUNTRY_DOSSIER__?.inspectFaction(context.ownerId, screenX, screenY);
            }, 280);
        } else {
            (window as any).__DOMINION_COUNTRY_DOSSIER__?.clearInspection();
        }
        if (context.action === 'NONE') {
            (window as any).__DOMINION_COMMAND_UI__?.showToast(context.rejectionReason ?? 'No legal command at this location', 'warn');
        }
    };
    this.inputController.onFlatPick = (screenX, screenY, worldX, worldY) => {
        if ((window as any).__DOMINION_UI_STATE__ && (window as any).__DOMINION_UI_STATE__ !== 'IN_GAME_STATE') {
            return;
        }
        const context = resolveTargetAtWorld(gameState, worldX, worldY, screenX, screenY);
        recordPickingReport(context);
        gameState.selectContext(context);
        gameState.spotlightFactionId = context.ownerId > 0 ? context.ownerId : null;
        this.politicalPaletteTexture.update(gameState.factions);
        this.updateCoastDiagnostic(context);

        if (this.pendingInspectTimer !== undefined) {
            window.clearTimeout(this.pendingInspectTimer);
            this.pendingInspectTimer = undefined;
        }
        this.lastPickedTargetFactionId = context.ownerId > 0 ? context.ownerId : null;
        this.inputController.legacyGestureState.lastResolvedTargetId = this.lastPickedTargetFactionId;
        if (context.resolvedCell !== null) {
            this.inputController.legacyGestureState.lastResolvedCellX = context.resolvedCell % gameState.width;
            this.inputController.legacyGestureState.lastResolvedCellY = Math.floor(context.resolvedCell / gameState.width);
        }

        if (context.ownerId > 0) {
            this.pendingInspectTimer = window.setTimeout(() => {
                this.pendingInspectTimer = undefined;
                (window as any).__DOMINION_COUNTRY_DOSSIER__?.inspectFaction(context.ownerId, screenX, screenY);
            }, 280);
        } else {
            (window as any).__DOMINION_COUNTRY_DOSSIER__?.clearInspection();
        }
        if (context.action === 'NONE') {
            (window as any).__DOMINION_COMMAND_UI__?.showToast(context.rejectionReason ?? 'No legal command at this location', 'warn');
        }
    };

    const executePickedContext = (context: TargetResolution, screenX: number, screenY: number) => {
        this.spawnCommandRing(screenX, screenY);

        // Case 4: If an active combat front exists at or involving this specific target/intent cell, reinforce it locally
        const existingFront = [...gameState.fronts.values()].find(front =>
            front.isCombatActive &&
            (front.factionA === gameState.yourFactionId || front.factionB === gameState.yourFactionId) &&
            (
                (context.targetCell !== null && (front.targetCellIndex === context.targetCell || front.intentTargetCellIndex === context.targetCell)) ||
                (context.clickedCell !== null && (front.targetCellIndex === context.clickedCell || front.intentTargetCellIndex === context.clickedCell))
            )
        );

        if (existingFront) {
            const ok = gameClient.sendReinforce(existingFront.frontId, gameState.populationCommitPercent / 100);
            if (ok) (window as any).__DOMINION_COMMAND_UI__?.showToast('Front reinforced', 'good');
            return;
        }

        if (context.action === 'NEUTRAL_EXPANSION' && context.targetCell !== null) {
            const ok = gameClient.sendExpand(context.targetCell, gameState.operationMode, gameState.populationCommitPercent / 100);
            if (ok) (window as any).__DOMINION_COMMAND_UI__?.showToast(`Neutral expansion ordered · ${gameState.operationMode}`, 'good');
        } else if (context.action === 'AMPHIBIOUS_COLONIZATION' && context.sourceCell !== null && context.targetCell !== null) {
            const ok = gameClient.sendAmphibiousAttack(
                context.sourceCell,
                context.targetCell,
                gameState.populationCommitPercent / 100,
            );
            if (ok) (window as any).__DOMINION_COMMAND_UI__?.showToast('Overseas landing authorized from completed port', 'good');
        } else if (context.action === 'LAUNCH_OFFENSIVE' && context.sourceCell !== null && context.targetCell !== null) {
            const intent = context.clickedCell ?? context.targetCell;
            const ok = gameClient.sendAttack(context.sourceCell, context.targetCell, gameState.populationCommitPercent / 100, intent);
            if (ok) {
                gameState.spotlightFactionId = null;
                this.politicalPaletteTexture.update(gameState.factions);
            }
        } else if (context.action === 'DEFEND' && context.sourceCell !== null) {
            const player = gameState.factions.get(gameState.yourFactionId);
            const pop = ((player?.population || 0) * (gameState.populationCommitPercent / 100)).toFixed(0);
            gameClient.sendDefenseFocus(context.sourceCell, Number(pop));
            (window as any).__DOMINION_COMMAND_UI__?.showToast('Defense reinforced', 'good');
        } else if (context.action === 'BUILD_PORT' && context.sourceCell !== null) {
            gameClient.sendBuildPort(context.sourceCell);
            (window as any).__DOMINION_COMMAND_UI__?.showToast('Port construction ordered', 'good');
        } else if (context.ownerId === gameState.yourFactionId) {
            // Own interior clicked -> no hostile action
            (window as any).__DOMINION_COMMAND_UI__?.showToast('Own territory selected', 'info');
        } else {
            (window as any).__DOMINION_COMMAND_UI__?.showToast(context.rejectionReason ?? 'No legal command at this location', 'warn');
        }
    };

    this.inputController.onDoublePick = (screenX, screenY, worldX, worldY) => {
        if (uiStateManager.getAppSurface() !== AppSurface.MATCH) return;
        if (this.pendingInspectTimer !== undefined) {
            window.clearTimeout(this.pendingInspectTimer);
            this.pendingInspectTimer = undefined;
        }
        (window as any).__DOMINION_COUNTRY_DOSSIER__?.clearInspection();

        const context = resolveTargetAtWorld(gameState, worldX, worldY, screenX, screenY);

        // Case 5: Guard against false double-click when two distinct countries were clicked rapidly
        if (context.ownerId > 0 && this.lastPickedTargetFactionId !== null && context.ownerId !== this.lastPickedTargetFactionId) {
            this.lastPickedTargetFactionId = context.ownerId;
            gameState.selectContext(context, true);
            gameState.spotlightFactionId = context.ownerId;
            this.politicalPaletteTexture.update(gameState.factions);
            this.updateCoastDiagnostic(context);
            (window as any).__DOMINION_COUNTRY_DOSSIER__?.inspectFaction(context.ownerId, screenX, screenY);
            return;
        }

        // On active double-click attack / action, explicitly suppress spotlight so whole-country glow NEVER dominates
        gameState.spotlightFactionId = null;
        this.politicalPaletteTexture.update(gameState.factions);

        gameState.selectContext(context, false);
        executePickedContext(context, screenX, screenY);
    };

    this.inputController.onGlobeDoublePick = (screenX, screenY) => {
        if (uiStateManager.getAppSurface() !== AppSurface.MATCH) return;
        if (this.pendingInspectTimer !== undefined) {
            window.clearTimeout(this.pendingInspectTimer);
            this.pendingInspectTimer = undefined;
        }
        (window as any).__DOMINION_COUNTRY_DOSSIER__?.clearInspection();

        const world = this.globe.screenToWorld(screenX, screenY);
        if (!world) return;
        const context = resolveTargetAtWorld(gameState, world.x, world.y, screenX, screenY);

        // Case 5: Guard against false double-click when two distinct countries were clicked rapidly
        if (context.ownerId > 0 && this.lastPickedTargetFactionId !== null && context.ownerId !== this.lastPickedTargetFactionId) {
            this.lastPickedTargetFactionId = context.ownerId;
            gameState.selectContext(context);
            gameState.spotlightFactionId = context.ownerId;
            this.politicalPaletteTexture.update(gameState.factions);
            this.updateCoastDiagnostic(context);
            (window as any).__DOMINION_COUNTRY_DOSSIER__?.inspectFaction(context.ownerId, screenX, screenY);
            return;
        }

        // On active double-click attack / action, explicitly suppress spotlight so whole-country glow NEVER dominates
        gameState.spotlightFactionId = null;
        this.politicalPaletteTexture.update(gameState.factions);

        gameState.selectContext(context, false);
        executePickedContext(context, screenX, screenY);
    };

    this.inputController.onFlatHover = (screenX, screenY, worldX, worldY) => {
        if (uiStateManager.getAppSurface() !== AppSurface.MATCH) return;
        if (!(window as any).__DOMINION_PICKING_INSPECTOR__?.enabled) return;
        const context = resolveTargetAtWorld(gameState, worldX, worldY, screenX, screenY);
        recordPickingReport(context);
        this.updateCoastDiagnostic(context);
    };
    this.inputController.onGlobeZoom = (factor) => {
        this.globe.zoom(factor);
        this.updateScreenSpaceOverlays();

        // When zooming in on 3D globe past threshold, seamlessly transition into Flat Map
        if (this.isGlobeMode && factor > 1.0 && this.globe.getUserZoom() >= 1.55) {
            this.setGlobeMode(false);
            this.globe.setUserZoom(1.0);
        }
    };

    this.onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F4') {
            e.preventDefault();
            this.activeMode = this.activeMode === 'A0' ? 'A1' : 'A0';
            this.updatePoliticalRenderers();
            this.updateDiagnosticHUD();
        } else if (e.key === 'F3') {
            e.preventDefault();
            this.diagnosticText.visible = !this.diagnosticText.visible;
            this.updateDiagnosticHUD();
        } else if (e.key === 'F6') {
            e.preventDefault();
            if (this.activeMode !== 'A1' || !this.isPresentationInitialized) return;
            this.diagnosticMode = this.diagnosticMode === 'OWNER_ZERO' ? 'OFF' : 'OWNER_ZERO';
            this.ownershipPresentation.setDiagnosticMode(this.diagnosticMode === 'OWNER_ZERO' ? 1 : 0);
            this.updateDiagnosticHUD();
        } else if (e.key === 'F7') {
            e.preventDefault();
            if (this.activeMode !== 'A1' || !this.isPresentationInitialized) return;
            this.diagnosticMode = this.diagnosticMode === 'MESH_COVERAGE' ? 'OFF' : 'MESH_COVERAGE';
            this.ownershipPresentation.setDiagnosticMode(this.diagnosticMode === 'MESH_COVERAGE' ? 2 : 0);
            this.updateDiagnosticHUD();
        } else if (e.key === 'F8') {
            e.preventDefault();
            const isDebug = terrainLodManager.toggleDebugMode();
            console.log(`[TerrainLodManager] F8 TILE DEBUG MODE = ${isDebug ? 'ON' : 'OFF'}`);
            if (isDebug) {
                console.log('[SCENE_FORENSICS]', JSON.stringify({
                    stage: this.app.stage.children.map((child: any) => ({
                        label: String(child.label ?? ''),
                        type: child.constructor?.name ?? 'DisplayObject',
                        visible: Boolean(child.visible),
                        alpha: Number(child.alpha ?? 1),
                        blendMode: String(child.blendMode ?? 'inherit'),
                        zIndex: Number(child.zIndex ?? 0),
                        childCount: Number(child.children?.length ?? 0),
                    })),
                    world: this.geography.getDebugSnapshot(),
                    domAtRectangle: document.elementsFromPoint(108, 88).map((el: Element) => ({
                        tag: el.tagName,
                        id: (el as HTMLElement).id,
                        className: String((el as HTMLElement).className ?? ''),
                    })),
                }));
            }
            this.updateDiagnosticHUD();
        } else if (e.key === 'F9') {
            e.preventDefault();
            const isForced = terrainLodManager.toggleForceGlobal();
            console.log(`[TerrainLodManager] F9 FORCE GLOBAL = ${isForced ? 'ON' : 'OFF'}`);
            this.updateScreenSpaceOverlays();
        } else if (e.key.toLowerCase() === 'g') {
            e.preventDefault();
            this.toggleGlobe();
        } else if (e.key === 'F10') {
            e.preventDefault();
            this.globe.setCoastlineDebug(!this.globe.getState().debugCoastline);
            this.updateScreenSpaceOverlays();
        } else if (e.key === 'F11') {
            e.preventDefault();
            const enabled = (window as any).__DOMINION_PICKING_INSPECTOR__?.toggle?.();
            console.log(`[PICKING] inspector = ${enabled ? 'ON' : 'OFF'}`);
        } else if (e.key === 'F12') {
            e.preventDefault();
            const enabled = (window as any).__DOMINION_COAST_DIAGNOSTICS__?.toggle?.();
            console.log(`[COAST] diagnostic = ${enabled ? 'ON' : 'OFF'}`);
        }
    };
    if (this.onKeyDown) window.removeEventListener('keydown', this.onKeyDown);
    window.addEventListener('keydown', this.onKeyDown);

    this.app.ticker.add((ticker) => {
        this.renderedFrameCount++;
        const isMatch = uiStateManager.getAppSurface() === AppSurface.MATCH;
        if (this.labels.container.visible !== isMatch) this.labels.container.visible = isMatch;
        if (this.selection.container.visible !== isMatch) this.selection.container.visible = isMatch;
        if (this.war.container.visible !== isMatch) this.war.container.visible = isMatch;
        if (this.strategicSites.container.visible !== isMatch) this.strategicSites.container.visible = isMatch;
        if (this.capitals.container.visible !== isMatch) this.capitals.container.visible = isMatch;
        if (this.politicalFillContainer.visible !== isMatch) this.politicalFillContainer.visible = isMatch;
        if (this.political.container.visible !== isMatch) this.political.container.visible = isMatch;
        this.globe.setPoliticalStrength(isMatch ? (this.mapMode === 'POLITICAL' ? 1.0 : 0.32) : 0.0);

        if (isMatch) {
            measureFrameSystem('politicalDirty', () => this.flushPoliticalDeltas());
            measureFrameSystem('politicalColorFlush', () => this.politicalColorTexture.flushPending());
            measureFrameSystem('politicalOwnerFlush', () => this.politicalOwnerIdTexture.flushPending());
            measureFrameSystem('borders', () => this.political.updateIfNeeded());
            measureFrameSystem('war', () => this.war.animate(ticker.deltaTime));
            measureFrameSystem('capitals', () => this.capitals.animate(ticker.deltaTime));
            if (ENABLE_POLITICAL_TRANSITIONS) {
                measureFrameSystem('ownershipTransitions', () => this.ownershipTransition.update(ticker.deltaMS / 1000.0));
            }
            // The transition field is the only political contour shown while
            // an authorized reveal is active. Keeping the old categorical
            // border pass underneath exposes square tile seams and makes the
            // animated territory appear larger than the settled silhouette.
            const transitionActiveAfterUpdate = ENABLE_POLITICAL_TRANSITIONS
                && this.ownershipTransition.metrics.activeTransitionCount > 0;
            this.political.container.visible = !transitionActiveAfterUpdate;
        }
        measureFrameSystem('terrain', () => this.geography.tick(ticker.deltaMS / 1000.0));
        this.globe.renderTick();

        wheelTelemetry.nextFrameScale = this.worldContainer.scale.x;

        const renderState = (window as any).__DEV_RENDER_STATE__;
        if (renderState) {
            renderState.renderedFrames = this.renderedFrameCount;
            renderState.snapshotReceived = gameState.isInitialized;
            if (!renderState.firstPopulatedFrame && gameState.isInitialized && this.isPresentationInitialized) {
                renderState.firstPopulatedFrame = true;
                renderState.firstPopulatedFrameAt = performance.now();
                this.firstPopulatedFrameAt = renderState.firstPopulatedFrameAt;
            }
        }
    });
  }

  private flushPoliticalDeltas(): void {
    if (!this.pendingPoliticalCells.size) return;
    const cells = Array.from(this.pendingPoliticalCells);
    this.pendingPoliticalCells.clear();
    // GameState is authoritative immediately, but the surface cache is the
    // presentation base. Active transition cells stay on their old visual
    // owner even when a neighbouring dirty-rect expands across them.
    const blocked = ENABLE_POLITICAL_TRANSITIONS
      ? new Set(cells.filter(cell => this.ownershipTransition.isCellActive(cell)))
      : new Set<number>();
    this.surface.syncDirtyCells(cells, blocked);
    const committedCells = cells.filter(cell => !blocked.has(cell));
    if (committedCells.length === 0) return;
    recordPoliticalDirtyPixels(this.surface.field.metrics.pixelsProcessed);
    this.political.markDirty(this.surface.lastDirtyRects);
    for (const rect of this.surface.lastDirtyRects) {
      this.politicalColorTexture.updateRect(this.surface.ownerBuffer, gameState.factions, this.surface.surfaceRevision, rect);
      this.politicalOwnerIdTexture.updateRect(this.surface.ownerBuffer, this.surface.surfaceRevision, rect);
    }
  }

  public updateDiagnosticHUD() {
    let sourceStr = terrainLodManager.forceGlobal ? 'FORCED GLOBAL' : 
                    terrainLodManager.currentLevel === 'DETAIL' ? 'NATIVE DETAIL' :
                    terrainLodManager.currentLevel === 'REGIONAL' ? 'REGIONAL' : 'GLOBAL';

    const keysPreview = terrainLodManager.visibleTileKeys.slice(0, 3).join(', ') + 
        (terrainLodManager.visibleTileKeys.length > 3 ? ` (+${terrainLodManager.visibleTileKeys.length - 3} more)` : '');
    const memEst = (terrainLodManager.residentTextureBytes / (1024 * 1024)).toFixed(1);

    const dpr = window.devicePixelRatio || 1;
    const res = this.app.renderer?.resolution || 1;
    const pxLabel = res > 1 ? 'FRAMEBUFFER PX' : 'CSS PX';

    const displayedFactionsInHUD = document.getElementById('hud-faction-count')?.textContent?.trim() || `${gameState.factions.size} Nations`;
    const gameStateFactionsCount = gameState.factions.size;
    const gsInstances = (window as any).__GAME_STATE_INSTANCE_COUNT__ || 1;
    const gcInstances = (window as any).__GAME_CLIENT_INSTANCE_COUNT__ || 1;

    this.diagnosticText.text = 
        `BOOT: MAIN=${bootTelemetry.mainEntered ? 'Y' : 'N'} | PIXI=${bootTelemetry.pixiInitDone ? 'Y' : 'N'} | R_IMP=${bootTelemetry.rendererImportDone ? 'Y' : 'N'} | R_NEW=${bootTelemetry.rendererCreated ? 'Y' : 'N'} | R_INIT=${bootTelemetry.rendererInitDone ? 'Y' : 'N'} | HUD=${bootTelemetry.hudCreated ? 'Y' : 'N'} | CONN=${bootTelemetry.connectCallReached ? 'Y' : 'N'} (EXC=${bootTelemetry.startupException ? 'YES' : 'NO'})\n` +
        `TERRAIN SOURCE: ${sourceStr}\n` +
        `CAMERA SCALE = ${terrainLodManager.cameraScale.toFixed(2)} | FIT SCALE = ${terrainLodManager.worldFitScale.toFixed(2)} | NORMALIZED ZOOM = ${terrainLodManager.normalizedZoom.toFixed(2)}x\n` +
        `WHEEL: CALLS=${wheelTelemetry.wheelHandlerCalls} | DELTA_Y=${wheelTelemetry.lastDeltaY} | MODE=${wheelTelemetry.lastDeltaMode} | DIR=${wheelTelemetry.direction} | FACTOR=${wheelTelemetry.factor.toFixed(2)} | BEFORE=${wheelTelemetry.scaleBefore.toFixed(2)} | REQ=${wheelTelemetry.requestedScale.toFixed(2)} | APPLIED=${wheelTelemetry.appliedScale.toFixed(2)} | NEXT=${wheelTelemetry.nextFrameScale.toFixed(2)} (CLAMP [${wheelTelemetry.clampMin}-${wheelTelemetry.clampMax}]: ${wheelTelemetry.isClamped ? 'YES' : 'NO'})\n` +
        `NET: WS=${netTelemetry.wsState} (ATTEMPTS=${netTelemetry.connectAttempts}, OPEN=${netTelemetry.openCount}) | JOIN=${netTelemetry.joinSent ? 'YES' : 'NO'} | RX FRAMES=${netTelemetry.rxFrameCount} (${netTelemetry.lastRxType}, ${netTelemetry.lastRxBytes}B)\n` +
        `SNAP: RCVD=${netTelemetry.snapshotReceived ? 'YES' : 'NO'} | SNAP FACTIONS=${netTelemetry.snapshotFactions} | GAMESTATE FACTIONS=${gameStateFactionsCount} | HUD=${displayedFactionsInHUD} (GS_INST=${gsInstances}, GC_INST=${gcInstances})\n` +
        `GLOBAL TEXELS/${pxLabel} = ${terrainLodManager.globalDensity.toFixed(2)} | REGIONAL = ${terrainLodManager.regionalDensity.toFixed(2)} | NATIVE = ${terrainLodManager.nativeDensity.toFixed(2)}\n` +
        `VISIBLE TILES = ${terrainLodManager.visibleTileCount} | RESIDENT TILES = ${terrainLodManager.residentTileCount} | CACHE = ${terrainLodManager.cachedTextureCount} (${memEst} MiB decoded RGBA) | F8: ${terrainLodManager.debugMode ? 'ON' : 'OFF'} | F9: ${terrainLodManager.forceGlobal ? 'ON' : 'OFF'}\n` +
        `ACTIVE TILE IDs = [${keysPreview}]\n` +
        `VIEWPORT=${window.innerWidth}x${window.innerHeight} | CANVAS=${this.app.canvas.clientWidth}x${this.app.canvas.clientHeight} CSS / ${this.app.canvas.width}x${this.app.canvas.height} BACKING | SCREEN=${this.app.renderer.screen.width}x${this.app.renderer.screen.height} | RES=${res} | DPR=${dpr}`;
  }

  private updateCoastDiagnostic(context: TargetResolution): void {
      if (!this.coastDiagnosticEnabled || this.isGlobeMode) return;
      this.coastDiagnostic.clear();
      if (!context.canonicalLand || context.resolvedCell === null) return;
      const scale = this.worldContainer.scale.x;
      const project = (x: number, y: number) => this.worldContainer.toGlobal(new PIXI.Point(x, y));
      const drawCell = (cell: number, color: number, width: number, alpha = 1) => {
          const x = cell % gameState.width;
          const y = Math.floor(cell / gameState.width);
          const p = project(x, y);
          this.coastDiagnostic.rect(p.x, p.y, scale, scale).stroke({ color, width, alpha });
      };
      const visualX = Math.floor(context.worldX * POLITICAL_SCALE) / POLITICAL_SCALE;
      const visualY = Math.floor(context.worldY * POLITICAL_SCALE) / POLITICAL_SCALE;
      const vp = project(visualX, visualY);
      this.coastDiagnostic.rect(vp.x, vp.y, scale / POLITICAL_SCALE, scale / POLITICAL_SCALE).stroke({ color: 0x22c55e, width: 2, alpha: 0.95 });
      drawCell(context.rawCell, 0xfacc15, 2, 0.95);
      if (context.resolvedCell !== context.rawCell && context.resolvedCell !== null) drawCell(context.resolvedCell, 0x38bdf8, 2, 0.95);
      const resolved = project(context.resolvedCell % gameState.width + 0.5, Math.floor(context.resolvedCell / gameState.width) + 0.5);
      this.coastDiagnostic.moveTo(vp.x + scale / POLITICAL_SCALE / 2, vp.y + scale / POLITICAL_SCALE / 2).lineTo(resolved.x, resolved.y).stroke({ color: 0xf97316, width: 1, alpha: 0.9 });
  }

  public updatePoliticalRenderers() {
      const isPresentationInitialized = this.ownershipPresentation.mesh !== undefined;
      const surfaceRev = this.surface.surfaceRevision;
      const colorRev = this.politicalColorTexture.sourceRevision;
      const ownerRev = this.politicalOwnerIdTexture.sourceRevision;

      const transitionActive = ENABLE_POLITICAL_TRANSITIONS && this.ownershipTransition.metrics.activeTransitionCount > 0;
      // During an active presentation transition the owner/color textures are
      // intentionally one revision behind for the authorized dirty cells.
      // That lag is the base/presentation invariant, not a renderer failure.
      // Keep the continuous transition overlay visible while the deferred base
      // region catches up; otherwise it remains hidden until a later unrelated
      // delta makes the revisions equal, producing an old->nearly-final pop.
      const presentationRevisionHealthy = ownerRev === surfaceRev || transitionActive;
      const presentationHealthy =
          this.activeMode === 'A1' &&
          isPresentationInitialized &&
          !this.a1InitFailed &&
          surfaceRev > 0 &&
          presentationRevisionHealthy;
      if (!this.politicalColorTexture.hasData || (!transitionActive && colorRev !== surfaceRev)) {
          this.politicalColorTexture.update(
              this.surface.ownerBuffer,
              gameState.factions,
              surfaceRev,
          );
      }

      this.ownershipPresentation.container.visible = presentationHealthy;
      this.ownershipFallback.container.visible = !presentationHealthy;
      this.geography.setBaseLandVisible(!presentationHealthy || this.mapMode === 'TERRAIN');
      this.ownershipPresentation.container.alpha = this.mapMode === 'POLITICAL' ? 1.0 : 0.32;
      this.ownershipFallback.container.alpha = this.mapMode === 'POLITICAL' ? 1.0 : 0.32;
      this.political.container.alpha = this.mapMode === 'POLITICAL' ? 1.0 : 0.84;
      this.globe.setPoliticalStrength(this.mapMode === 'POLITICAL' ? 1.0 : 0.32);
      
      if (ENABLE_POLITICAL_TRANSITIONS && this.isTransitionInitialized) {
          this.ownershipTransition.container.visible = presentationHealthy;
      }
  }

  public updateScreenSpaceOverlays() {
      const isMatch = uiStateManager.getAppSurface() === AppSurface.MATCH;
      if (!isMatch) {
          this.capitals.clear();
          this.labels.clear();
          this.selection.clear();
          this.selection.container.visible = false;
          this.war.clear();
          this.war.container.visible = false;
          this.strategicSites.container.visible = false;
          this.globe.flatCoastlineDiagnostic.visible = false;
          if (this.isGlobeMode) {
              this.updateDiagnosticHUD();
              return;
          }
          const currentScale = this.worldContainer.scale.x;
          const invScale = 1.0 / (currentScale || 1.0);
          const minX = Math.max(0, -this.worldContainer.x * invScale);
          const minY = Math.max(0, -this.worldContainer.y * invScale);
          const maxX = Math.min(WORLD_WIDTH, (-this.worldContainer.x + window.innerWidth) * invScale);
          const maxY = Math.min(WORLD_HEIGHT, (-this.worldContainer.y + window.innerHeight) * invScale);
          this.geography.updateViewport({ minX, minY, maxX, maxY }, currentScale, this.fitScale);
          this.updateDiagnosticHUD();
          return;
      }
      if (this.isGlobeMode) {
          const globeProjector = (x: number, y: number) => this.globe.projectWorld(x, y);
          this.capitals.updateScreenSpace((x: number, y: number) => globeProjector(x, y) ?? new PIXI.Point(-10000, -10000), 1, 'MEDIUM');
          const globeState = this.globe.getState();
          this.labels.updateGlobe((x, y) => this.globe.projectWorld(x, y), new PIXI.Point(globeState.center.x, globeState.center.y), globeState.radius);
          this.selection.updateScreenSpace(globeProjector, 1, 'MEDIUM');
          this.selection.container.visible = true;
          this.war.container.visible = false;
          this.strategicSites.container.visible = false;
          this.globe.flatCoastlineDiagnostic.visible = false;
          this.updateDiagnosticHUD();
          return;
      }
      const projector = (x: number, y: number) => this.worldContainer.toGlobal(new PIXI.Point(x, y));
      const currentScale = this.worldContainer.scale.x;
      
      const zoomRatio = currentScale / this.fitScale;
      let lod: 'FAR'|'MEDIUM'|'CLOSE' = 'FAR';
      
      if (zoomRatio >= 2.75) lod = 'CLOSE';
      else if (zoomRatio >= 1.35) lod = 'MEDIUM';
      else lod = 'FAR';

      this.capitals.updateScreenSpace(projector, currentScale, lod);
      this.labels.updateScreenSpace(projector, currentScale, lod);
      
      const invScale = 1.0 / (currentScale || 1.0);
      const minX = Math.max(0, -this.worldContainer.x * invScale);
      const minY = Math.max(0, -this.worldContainer.y * invScale);
      const maxX = Math.min(WORLD_WIDTH, (-this.worldContainer.x + window.innerWidth) * invScale);
      const maxY = Math.min(WORLD_HEIGHT, (-this.worldContainer.y + window.innerHeight) * invScale);

      this.geography.updateViewport({ minX, minY, maxX, maxY }, currentScale, this.fitScale);

      this.political.updateViewport({ minX, minY, maxX, maxY });
      this.political.updateStrokeWidth(currentScale, lod);
      // Globe mode intentionally hides operational annotations. Restore the
      // war layer whenever the flat map is active, including globe -> flat
      // transitions and diagnostic-driven mode changes.
      this.war.container.visible = true;
      this.war.container.position.set(this.worldContainer.x, this.worldContainer.y);
      this.war.container.scale.set(currentScale);
      this.war.updateLOD(lod, currentScale);
      this.strategicSites.container.visible = true;
      this.strategicSites.updateLOD(lod, currentScale);
      this.selection.updateScreenSpace(projector, currentScale, lod);
      this.globe.setFlatCamera(this.worldContainer.x, this.worldContainer.y, currentScale);
      this.globe.flatCoastlineDiagnostic.visible = this.globe.getState().debugCoastline;

      this.updateDiagnosticHUD();
  }

  public fitWorldToScreen() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    // Keep only a restrained cartographic safety margin. The map itself is
    // the hero at world fit; the HUD is an overlay and does not need a 10%
    // framing inset around the equirectangular projection.
    const margin = 0.985;
    
    const WORLD_WIDTH = 1024;
    const WORLD_HEIGHT = 512;

    const scaleX = viewportWidth / WORLD_WIDTH;
    const scaleY = viewportHeight / WORLD_HEIGHT;
    const isPortraitMobile = viewportHeight > viewportWidth * 1.15 && viewportWidth <= 900;
    // A full equirectangular world is intentionally letterboxed on desktop.
    // On a narrow portrait device that otherwise collapses into a small strip;
    // use a restrained strategic crop so the map remains the primary surface
    // while keeping the projection's 2:1 aspect ratio intact.
    this.fitScale = isPortraitMobile
      ? Math.min(0.86, Math.max(0.82, scaleX * 2.1))
      : Math.min(scaleX, scaleY) * margin;

    if (Number.isFinite(this.fitScale) && Number.isFinite(viewportWidth) && Number.isFinite(viewportHeight) && this.fitScale > 0) {
      this.worldContainer.scale.set(this.fitScale);
      this.worldContainer.x = (viewportWidth - WORLD_WIDTH * this.fitScale) / 2;
      this.worldContainer.y = (viewportHeight - WORLD_HEIGHT * this.fitScale) / 2;
      wheelTelemetry.scaleBefore = this.fitScale;
      wheelTelemetry.requestedScale = this.fitScale;
      wheelTelemetry.appliedScale = this.fitScale;
      wheelTelemetry.appliedSameCall = this.fitScale;
      wheelTelemetry.nextFrameScale = this.fitScale;
    }
  }

  public resizeToViewport() {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.fitWorldToScreen();
    this.updateScreenSpaceOverlays();
  }

  public spawnCommandRing(screenX: number, screenY: number): void {
    const ring = new PIXI.Graphics();
    ring.circle(0, 0, 8).stroke({ color: 0x38bdf8, width: 2.5, alpha: 1.0 });
    ring.position.set(screenX, screenY);
    this.app.stage.addChild(ring);
    const startTime = performance.now();
    const duration = 480;
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1.0, elapsed / duration);
      const r = 8 + t * 45;
      ring.clear();
      ring.circle(0, 0, r).stroke({ color: 0x38bdf8, width: Math.max(0.5, 2.5 * (1.0 - t)), alpha: (1.0 - t) * 0.95 });
      if (t < 1.0) {
        requestAnimationFrame(tick);
      } else {
        this.app.stage.removeChild(ring);
        ring.destroy();
      }
    };
    requestAnimationFrame(tick);
  }

  public centerOnPlayerCapital() {
    if (this.isGlobeMode) {
      this.globe.setRotation(0, 0.08);
      this.updateScreenSpaceOverlays();
    } else {
      this.fitWorldToScreen();
    }
  }

  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } | null {
    if (this.isGlobeMode) {
      const pt = this.globe.projectWorld(worldX, worldY);
      return pt ? { x: pt.x, y: pt.y } : null;
    }
    const scale = this.worldContainer.scale.x;
    return {
      x: worldX * scale + this.worldContainer.x,
      y: worldY * scale + this.worldContainer.y,
    };
  }

  private homelandHalo: PIXI.Graphics | null = null;
  private cameraPanAnimationId: number | null = null;
  private introPlayedForMatchId: string | null = null;
  private introTimer: number | null = null;

  public cancelCameraMotion(): void {
    this.inputController.cancelZoomMotion();
    if (this.cameraPanAnimationId !== null) {
      cancelAnimationFrame(this.cameraPanAnimationId);
      this.cameraPanAnimationId = null;
    }
    this.globe.cancelCameraMotion();
    if (this.introTimer !== null) {
      window.clearTimeout(this.introTimer);
      this.introTimer = null;
    }
    if (uiStateManager.getAppSurface() === AppSurface.MATCH && gameClient.isPreMatch()) {
      gameClient.sendPlayerReady();
    }
  }

  public handleMatchEntryCamera(): void {
    if (uiStateManager.getAppSurface() !== AppSurface.MATCH) {
      if (this.introTimer !== null) {
        window.clearTimeout(this.introTimer);
        this.introTimer = null;
      }
      return;
    }
    const currentMatchId = (window as any).__DOMINION_MATCH_ID__ || (gameState.isInitialized ? 'active_match' : 'fresh_match');
    if (this.introPlayedForMatchId === currentMatchId) return;
    this.introPlayedForMatchId = currentMatchId;

    // 1. Initial match entry presentation must start in GLOBE mode
    this.setGlobeMode(true);

    // 2. Camera begins from a broad Earth view (userZoom = 0.85)
    this.globe.setUserZoom(0.85);

    // 3. Find authoritative player capital cell or nucleus centroid
    let targetCell: number | null = null;
    const player = gameState.factions.get(gameState.yourFactionId);
    if (player?.capitalCell !== undefined && player.capitalCell !== null && player.capitalCell >= 0) {
      targetCell = player.capitalCell;
    } else {
      const idx = gameState.cellOwners.indexOf(gameState.yourFactionId);
      if (idx >= 0) targetCell = idx;
    }

    if (targetCell !== null && targetCell >= 0) {
      const cx = targetCell % WORLD_WIDTH;
      const cy = Math.floor(targetCell / WORLD_WIDTH);
      const lonDeg = (cx / WORLD_WIDTH) * 360 - 180;
      const latDeg = 90 - (cy / WORLD_HEIGHT) * 180;

      // 4. Smooth shortest-path yaw rotation, pitch alignment, and zoom to 1.45 over 2200ms
      this.globe.rotateToLocation(lonDeg, latDeg, 2200, 1.45);
      if (this.introTimer !== null) {
        window.clearTimeout(this.introTimer);
        this.introTimer = null;
      }
      this.introTimer = window.setTimeout(() => {
        this.introTimer = null;
        if (uiStateManager.getAppSurface() === AppSurface.MATCH && gameClient.isPreMatch()) {
          gameClient.sendPlayerReady();
        }
      }, 2300);
    } else {
      // If no cell, ready immediately if on match surface
      if (uiStateManager.getAppSurface() === AppSurface.MATCH && gameClient.isPreMatch()) {
        gameClient.sendPlayerReady();
      }
    }
  }

  public focusOnCivilizationHomeland(targetWorldX: number, targetWorldY: number, durationMs = 500) {
    if (this.cameraPanAnimationId !== null) {
      cancelAnimationFrame(this.cameraPanAnimationId);
      this.cameraPanAnimationId = null;
    }

    if (!this.homelandHalo) {
      this.homelandHalo = new PIXI.Graphics();
      this.overlayContainer.addChild(this.homelandHalo);
    }

    this.homelandHalo.clear();
    this.homelandHalo.visible = true;

    if (this.isGlobeMode) {
      const targetLon = (targetWorldX / 1024) * Math.PI * 2 - Math.PI;
      const targetLat = Math.PI * 0.5 - (targetWorldY / 512) * Math.PI;
      
      const [startLon, startLat] = this.globe.getRotation();
      const startTime = performance.now();
      const animateGlobe = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1.0, elapsed / durationMs);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        
        let dLon = targetLon - startLon;
        while (dLon > Math.PI) dLon -= Math.PI * 2;
        while (dLon < -Math.PI) dLon += Math.PI * 2;
        
        const curLon = startLon + dLon * ease;
        const curLat = startLat + (targetLat - startLat) * ease;
        this.globe.setRotation(curLon, curLat);
        this.updateScreenSpaceOverlays();

        if (t < 1.0) {
          this.cameraPanAnimationId = requestAnimationFrame(animateGlobe);
        } else {
          this.cameraPanAnimationId = null;
        }
      };
      this.cameraPanAnimationId = requestAnimationFrame(animateGlobe);
    } else {
      const currentScale = this.worldContainer.scale.x;
      const startX = this.worldContainer.x;
      const startY = this.worldContainer.y;
      
      const centerScreenX = window.innerWidth * 0.5;
      const centerScreenY = window.innerHeight * 0.44;
      
      const targetScale = Math.max(this.fitScale * 1.15, Math.min(this.fitScale * 1.55, 1.40));
      const targetX = centerScreenX - targetWorldX * targetScale;
      const targetY = centerScreenY - targetWorldY * targetScale;

      const startTime = performance.now();
      const animateFlat = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1.0, elapsed / durationMs);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        const curScale = currentScale + (targetScale - currentScale) * ease;
        this.worldContainer.scale.set(curScale);
        this.worldContainer.x = startX + (targetX - startX) * ease;
        this.worldContainer.y = startY + (targetY - startY) * ease;
        this.updateScreenSpaceOverlays();

        if (t < 1.0) {
          this.cameraPanAnimationId = requestAnimationFrame(animateFlat);
        } else {
          this.cameraPanAnimationId = null;
        }
      };
      this.cameraPanAnimationId = requestAnimationFrame(animateFlat);
    }
  }

  public clearHomelandHalo(): void {
    if (this.homelandHalo) {
      this.homelandHalo.clear();
      this.homelandHalo.visible = false;
    }
    this.globe.setHomelandAnchor(null);
    if (this.cameraPanAnimationId !== null) {
      cancelAnimationFrame(this.cameraPanAnimationId);
      this.cameraPanAnimationId = null;
    }
  }

  public toggleGlobe(): void {
    this.setGlobeMode(!this.isGlobeMode);
  }

  public setMapMode(mode: 'POLITICAL' | 'TERRAIN'): void {
    if (this.mapMode === mode) return;
    this.mapMode = mode;
    this.updatePoliticalRenderers();
    document.dispatchEvent(new CustomEvent('dominion:map-mode-changed', { detail: { mode } }));
  }

  public setGlobeMode(enabled: boolean): void {
    if (this.isGlobeMode === enabled) return;
    this.isGlobeMode = enabled;
    this.inputController.setGlobeMode(enabled);

    if (this.cameraPanAnimationId !== null) {
      cancelAnimationFrame(this.cameraPanAnimationId);
      this.cameraPanAnimationId = null;
    }

    if (enabled) {
      // --- GLOBE MODE: Isolate and show 3D globe, completely hide 2D flat container ---
      this.worldContainer.visible = false;
      this.worldContainer.alpha = 0.0;

      const currentScale = this.worldContainer.scale.x;
      const centerScreenX = window.innerWidth * 0.5;
      const centerScreenY = window.innerHeight * 0.5;
      const focalWorldX = (centerScreenX - this.worldContainer.x) / currentScale;
      const focalWorldY = (centerScreenY - this.worldContainer.y) / currentScale;
      const focalLon = (focalWorldX / 1024) * Math.PI * 2 - Math.PI;
      const focalLat = Math.PI * 0.5 - (focalWorldY / 512) * Math.PI;
      this.globe.setFlatReference(focalWorldX, focalWorldY, currentScale);
      this.globe.setRotation(focalLon, focalLat);

      this.globe.setActive(true);
      this.globe.container.visible = true;
      this.globe.container.alpha = 1.0;
      this.globe.setMorph(1.0);
      this.globe.resize(window.innerWidth, window.innerHeight);
      this.globe.flatCoastlineDiagnostic.visible = false;
    } else {
      // --- FLAT MODE: Completely hide 3D globe and celestial shell, isolate 2D flat container ---
      this.globe.setMorph(0.0);
      this.globe.setActive(false);
      this.globe.container.visible = false;
      this.globe.container.alpha = 0.0;

      const currentScale = Math.max(this.fitScale * 1.85, this.worldContainer.scale.x);
      const centerScreenX = window.innerWidth * 0.5;
      const centerScreenY = window.innerHeight * 0.5;
      const state = this.globe.getState();
      const focalWorldX = ((state.yaw + Math.PI) / (Math.PI * 2)) * 1024;
      const focalWorldY = (0.5 - state.pitch / Math.PI) * 512;
      this.worldContainer.scale.set(currentScale);
      this.worldContainer.x = centerScreenX - focalWorldX * currentScale;
      this.worldContainer.y = centerScreenY - focalWorldY * currentScale;

      this.worldContainer.visible = true;
      this.worldContainer.alpha = 1.0;
      this.globe.flatCoastlineDiagnostic.visible = this.globe.getState().debugCoastline;
    }
    this.updateScreenSpaceOverlays();
    document.dispatchEvent(new CustomEvent('dominion:mode-changed', { detail: { mode: enabled ? 'globe' : 'flat' } }));
  }

  public focusOnCoordinates(lonDeg: number, latDeg: number): void {
    if (this.isGlobeMode) {
      this.globe.rotateToLocation(lonDeg, latDeg, 700);
    } else {
      const worldX = ((lonDeg + 180) / 360) * WORLD_WIDTH;
      const worldY = ((90 - latDeg) / 180) * WORLD_HEIGHT;
      this.focusOnWorldPoint(worldX, worldY);
    }
  }

  public focusOnCell(cellIndex: number): void {
    const pt = cellToWorld(cellIndex);
    if (this.isGlobeMode) {
      const lonDeg = (pt.x / WORLD_WIDTH) * 360 - 180;
      const latDeg = 90 - (pt.y / WORLD_HEIGHT) * 180;
      this.globe.rotateToLocation(lonDeg, latDeg, 700);
    } else {
      this.focusOnWorldPoint(pt.x, pt.y);
    }
  }

  public focusOnWorldPoint(worldX: number, worldY: number): void {
    const screenCenterX = window.innerWidth * 0.5;
    const screenCenterY = window.innerHeight * 0.5;
    const scale = Math.max(this.worldContainer.scale.x, 2.0);
    this.worldContainer.scale.set(scale);
    this.worldContainer.x = screenCenterX - worldX * scale;
    this.worldContainer.y = screenCenterY - worldY * scale;
    this.inputController.onTransformChange?.();
  }

  public clearMatchPresentation(): void {
    this.capitals.clear();
    this.labels.clear();
    this.war.clear();
    this.selection.clear();
    this.ownershipTransition.clear();
    this.pendingPoliticalCells.clear();
    this.inputController.reset();
    this.introPlayedForMatchId = null;
    if (this.introTimer !== null) {
      window.clearTimeout(this.introTimer);
      this.introTimer = null;
    }
    this.strategicSites.container.visible = false;
    this.politicalFillContainer.visible = false;
    this.political.container.visible = false;
    this.globe.setPoliticalStrength(0.0);
    this.geography.setBaseLandVisible(true);
    this.updateDiagnosticHUD();
  }

  public syncMatchLayers(): void {
    this.surface.fullSync();
    if (gameState.isInitialized && gameState.factions.size > 0) {
      this.politicalColorTexture.update(
        this.surface.ownerBuffer,
        gameState.factions,
        this.surface.surfaceRevision,
      );
      this.politicalOwnerIdTexture.update(
        this.surface.ownerBuffer,
        this.surface.surfaceRevision,
      );
      this.politicalPaletteTexture.update(gameState.factions);
      this.political.markDirty();
    }
    this.capitals.syncState();
    this.labels.syncState();
    this.updatePoliticalRenderers();
    this.updateScreenSpaceOverlays();
  }

  public destroy() {
    if (this.unsubState) this.unsubState();
    if (this.onKeyDown) {
        window.removeEventListener('keydown', this.onKeyDown);
        this.onKeyDown = undefined;
    }
    this.inputController.destroy();
    this.app.destroy(true, { children: true });
  }
}
