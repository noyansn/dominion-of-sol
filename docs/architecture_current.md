# DOMINION OF SOL — ARCHITECTURE CLASSIFICATION

> Population Strategy supersession: runtime gameplay uses the Population
> ledger documented in `population_strategy_migration.md`. Any older Army-era
> wording in historical audit documents is not an active contract.

## ACTIVE PRODUCTION
These modules form the canonical, active rendering pipeline and simulation interface.
No active module may import a `LEGACY_REFERENCE` or `DEAD` module.

- `DominionRenderer.ts` (SINGLE ENTRY POINT)
- `WorldLandMeshResource.ts`
- `GeographyRenderer.ts`
- `OwnershipRenderer.ts`
- `PoliticalBorderRenderer.ts`
- `PoliticalFieldCore.ts`
- `PoliticalSurfaceCache.ts`
- `CapitalRenderer.ts`
- `LabelRenderer.ts`
- `SelectionRenderer.ts`
- `WarRenderer.ts`
- `WorldInputController.ts`
- `WorldSpace.ts`
- `PoliticalSpace.ts`

## ACTIVE DEBUG
These modules are active but strictly for development HUDs or diagnostics.
- `StrategicSiteRenderer.ts` (Hidden in production UI by default)
- `VisualLandMask.ts`
- `DebugHUD.ts`

## LEGACY REFERENCE
These modules are obsolete and quarantined. They exist solely for historical topology or rendering reference.
- `PoliticalGeometryCache.ts` (Replaced by tile-local grid logic)
- `TerritoryRenderer.ts` (Replaced by `OwnershipRenderer`)
- `StrategicTerrainRenderer.ts` (Disabled in R0, awaits R3 ETOPO/ESA pipeline)

## DEAD
These modules were planned or partially built but do not exist in the active source tree.
- `AtlasVectorTerrain`
- `WorldRenderer`
- `FrontlineRenderer`
