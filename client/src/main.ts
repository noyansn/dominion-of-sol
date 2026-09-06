import * as PIXI from 'pixi.js';
import './render/PoliticalTextureUpload';
import './ui/dominion.css';
import { gameClient } from './game/GameClient';
import { PlayerHUD } from './ui/PlayerHUD';
import { AttackPanel } from './ui/AttackPanel';
import { DebugHUD } from './ui/DebugHUD';
import { bootTelemetry } from './game/BootTelemetry';
import { gameState } from './game/GameState';
import { installDominionBenchmark } from './ui/Benchmark';
import { CommandUI } from './ui/CommandUI';
import { NationCreator } from './ui/NationCreator';
import { CountryDossier } from './ui/CountryDossier';
import { CivilizationSelector } from './ui/CivilizationSelector';
import { getMapRenderDPR, installRenderProfileApi, registerRenderProfileApplier } from './ui/RenderProfile';
import { reactionWheel } from './ui/ReactionWheel';
import { sovereignArmory } from './ui/SovereignArmory';
import { playerProfileModal } from './ui/PlayerProfileModal';
import { nationsDrawer } from './ui/NationsDrawer';

// Development safety: ensure no service workers cache stale bundles on localhost
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
            reg.unregister().then((unreg) => {
                if (unreg) console.log('[DEV] Unregistered stale service worker for development safety:', reg.scope);
            });
        }
    }).catch(() => {});
}

function bootStep(message: string) {
    console.log(`[BOOT] ${message}`);
}

function reportViewport(label: string, app: PIXI.Application) {
    const canvas = app.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const screen = app.renderer?.screen;
    const metrics = {
        label,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        canvasCss: { width: canvas.clientWidth, height: canvas.clientHeight, rectWidth: rect.width, rectHeight: rect.height },
        canvasBacking: { width: canvas.width, height: canvas.height },
        rendererScreen: { width: screen?.width ?? 0, height: screen?.height ?? 0 },
        resolution: app.renderer?.resolution ?? 0,
        devicePixelRatio: window.devicePixelRatio || 1,
    };
    (window as any).__DEV_VIEWPORT_METRICS__ = metrics;
    console.log(`[VIEWPORT] ${label} viewport=${metrics.viewport.width}x${metrics.viewport.height} canvasCSS=${metrics.canvasCss.width}x${metrics.canvasCss.height} canvasBacking=${metrics.canvasBacking.width}x${metrics.canvasBacking.height} rendererScreen=${metrics.rendererScreen.width}x${metrics.rendererScreen.height} resolution=${metrics.resolution} DPR=${metrics.devicePixelRatio}`);
}

window.addEventListener('error', (e) => {
    bootStep(`RUNTIME ERROR: ${e.message}`);
    bootTelemetry.startupException = true;
    bootTelemetry.startupExceptionDetails = `Error: ${e.message}`;
});

window.addEventListener('unhandledrejection', (e) => {
    bootStep(`UNHANDLED PROMISE: ${e.reason}`);
    bootTelemetry.startupException = true;
    bootTelemetry.startupExceptionDetails = `UnhandledPromise: ${e.reason}`;
});

async function bootstrap() {
    bootTelemetry.mainEntered = true;
    try {
        const container = document.getElementById('app-container');
        if (!container) {
            bootStep('DOM CONTAINER NOT FOUND');
            return;
        }
        bootStep('BOOT 2 — DOM CONTAINER FOUND');
        
        if (!PIXI) {
            bootStep('PIXI MODULE NOT AVAILABLE');
            return;
        }
        bootStep('BOOT 3 — PIXI MODULE AVAILABLE');

        const app = new PIXI.Application();
        bootStep('BOOT 4 — PIXI APPLICATION CREATED');

        bootStep('BOOT 5 — APP.INIT STARTING');
        const renderResolution = getMapRenderDPR();
        
        await app.init({ 
            resizeTo: window,
            background: '#040b14', // Very dark map background
            preference: 'webgl',
            resolution: renderResolution,
            autoDensity: true,
            antialias: true
        });

        // Pixi may retain its default resolution when autoDensity is enabled.
        // Keep the backing store tied to the actual browser DPR so a DPR=1
        // viewport does not silently render a 1.25x framebuffer.
        if (Math.abs(app.renderer.resolution - renderResolution) > 0.01) {
            app.renderer.resolution = renderResolution;
            app.renderer.resize(window.innerWidth, window.innerHeight);
        }

        reportViewport('INIT', app);

        console.log(`[BOOT] DPR: ${window.devicePixelRatio}`);
        console.log(`[BOOT] Resolution: ${app.renderer.resolution}`);
        console.log(`[BOOT] Screen size: ${app.screen.width} x ${app.screen.height}`);
        console.log(`[BOOT] Canvas CSS: ${app.canvas.style.width} x ${app.canvas.style.height}`);
        console.log(`[BOOT] Canvas Backing: ${app.canvas.width} x ${app.canvas.height}`);
        bootTelemetry.pixiInitDone = true;
        bootStep('BOOT 6 — APP.INIT COMPLETE');
        
        console.log(`[BOOT] Renderer: ${app.renderer?.type}, size: ${app.canvas.width}x${app.canvas.height}`);
        console.log(`[BOOT] renderer backend = WebGL (type: ${app.renderer?.type})`);

        container.appendChild(app.canvas);
        bootStep('BOOT 7 — CANVAS APPENDED');

        Object.assign(app.canvas.style, {
            position: 'fixed',
            left: '0px',
            top: '0px',
            width: '100%',
            height: '100%',
            display: 'block',
            visibility: 'visible',
            opacity: '1',
            zIndex: '5',
            pointerEvents: 'auto'
        });

        const renderState = (window as any).__DEV_RENDER_STATE__ = {
            staticWorldReady: false,
            dynamicWorldReady: false,
            snapshotReceived: false,
            renderedFrames: 0,
            firstPopulatedFrame: false,
            firstPopulatedFrameAt: 0,
        };
        let activeRenderer: any = null;
        const resizeHandler = () => {
            // Pixi's resize plugin covers ordinary resizes, while this explicit
            // pass keeps the camera and screen-space overlays in lockstep with
            // the actual application viewport.
            const nextResolution = getMapRenderDPR();
            if (Math.abs(app.renderer.resolution - nextResolution) > 0.01) {
                app.renderer.resolution = nextResolution;
            }
            app.renderer.resize(window.innerWidth, window.innerHeight);
            if (activeRenderer) {
                activeRenderer.fitWorldToScreen();
                activeRenderer.globe?.resize(window.innerWidth, window.innerHeight);
                activeRenderer.updateScreenSpaceOverlays();
            }
            reportViewport('RESIZE', app);
        };
        window.addEventListener('resize', resizeHandler);
        installRenderProfileApi();
        registerRenderProfileApplier(() => resizeHandler());

        // --- FAST PATH: INITIALIZE UI AND CONNECT IMMEDIATELY ---
        let civSelector: any = null;
        try {
            bootStep("BOOT 8 — INITIALIZING UI (FAST PATH)");
            new PlayerHUD();
            new AttackPanel();
            new NationCreator();
            civSelector = new CivilizationSelector();
            (window as any).__DOMINION_CIVILIZATION_SELECTOR__ = civSelector;
            (window as any).__DOMINION_CIV_SELECTOR__ = civSelector;
            const countryDossier = new CountryDossier();
            (window as any).__DOMINION_COUNTRY_DOSSIER__ = countryDossier;
            const debugHUD = new DebugHUD();
            app.ticker.add(() => {
                debugHUD.updateFrame();
                if (activeRenderer) {
                    const targetCell = gameState.selectedTargetCell;
                    const sourceCell = gameState.selectedSourceCell;
                    const spotlightId = gameState.spotlightFactionId;
                    let refCell = targetCell ?? sourceCell;
                    if (refCell === null && spotlightId) {
                        refCell = gameState.factions.get(spotlightId)?.capitalCell ?? null;
                    }
                    if (refCell !== null) {
                        const wx = refCell % 1024;
                        const wy = Math.floor(refCell / 1024);
                        const scr = activeRenderer.worldToScreen(wx, wy);
                        if (scr) countryDossier.updatePosition(scr.x, scr.y);
                    }
                }
            });
            bootTelemetry.hudCreated = true;

            bootStep("BOOT 9 — CONNECTING GAME CLIENT (FAST PATH)");
            bootTelemetry.connectCallReached = true;
            gameClient.connect();
            bootStep("BOOT 9.5 — GAME CLIENT CONNECT INITIATED");
        } catch (uiNetErr: any) {
            bootTelemetry.startupException = true;
            bootTelemetry.startupExceptionDetails = `UI/Net Exception: ${uiNetErr.message}`;
            console.error('[BOOT] UI / Network init error:', uiNetErr);
        }

        // --- RENDERER AND VISUAL ASSET LADDER ---
        try {
            bootStep("BOOT 10 — DOMINION MODULE IMPORT START");
            const domModule = await import('./render/DominionRenderer');
            bootTelemetry.rendererImportDone = true;
            bootStep("BOOT 11 — DOMINION MODULE IMPORTED");
            
            bootStep("BOOT 12 — DOMINION CONSTRUCT START");
            const dominion = new domModule.DominionRenderer(app);
            activeRenderer = dominion;
            // DEV-only inspection handle used by the acceptance forensics and
            // benchmark harness. It is not part of the gameplay API.
            (window as any).__DOMINION_RENDERER__ = dominion;
            (window as any).dominionRenderer = dominion;
            (window as any).__DOMINION_GAME_STATE__ = gameState;
            (window as any).gameState = gameState;
            bootTelemetry.rendererCreated = true;
            bootStep("BOOT 13 — DOMINION CONSTRUCTED");

            bootTelemetry.rendererInitStarted = true;
            await dominion.initStaticWorld();
            renderState.staticWorldReady = true;
            bootStep("PROD 1 — GEOGRAPHY OK");

            // Attach dynamic layers one by one
            await dominion.initDynamicLayers(bootStep);
            bootTelemetry.rendererInitDone = true;
            renderState.dynamicWorldReady = true;
            new CommandUI();
            reportViewport('RENDERER_READY', app);
            civSelector?.selectPreset(civSelector.getSelectedIndex(), true);

            // Print stage parentage checks just in case
            const wc = dominion.worldContainer;
            console.log(`[BOOT] worldContainer.parent === app.stage: ${wc.parent === app.stage}`);
            console.log(`[BOOT] worldContainer vis:${wc.visible} rend:${wc.renderable} alpha:${wc.alpha}`);

            app.render();
            bootStep("PROD 9 — DOMINION FULL RENDER CALLED");

            app.ticker.add(() => {
                renderState.renderedFrames++;
                renderState.snapshotReceived = gameState.isInitialized;
                if (!renderState.firstPopulatedFrame &&
                    renderState.staticWorldReady &&
                    renderState.dynamicWorldReady &&
                    gameState.isInitialized) {
                    renderState.firstPopulatedFrame = true;
                    renderState.firstPopulatedFrameAt = performance.now();
                    reportViewport('FIRST_POPULATED_FRAME', app);
                    console.log(`[RENDER_READY] staticWorld=true dynamicWorld=true snapshot=true renderedFrames=${renderState.renderedFrames}`);
                }
            });
            installDominionBenchmark();
            (window as any).__DOMINION_REACTION_WHEEL__ = reactionWheel;
            (window as any).__SOVEREIGN_ARMORY__ = sovereignArmory;
            (window as any).__PLAYER_PROFILE_MODAL__ = playerProfileModal;
            
        } catch (domError: any) {
            bootTelemetry.startupException = true;
            bootTelemetry.startupExceptionDetails = `Dominion Error: ${domError.message}`;
            bootStep("[BOOT FAIL] DOMINION FAILED\n" + domError.stack);
            throw domError;
        }

    } catch (err: any) {
        bootTelemetry.startupException = true;
        bootTelemetry.startupExceptionDetails = `Bootstrap Error: ${err.message}`;
        bootStep(`[BOOT FAIL] BOOT FAILED\n${err.stack}`);
    }
}

bootstrap().catch(console.error);
