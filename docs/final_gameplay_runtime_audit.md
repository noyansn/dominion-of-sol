# DOMINION OF SOL — FINAL GAMEPLAY RUNTIME AUDIT

## Scope

This audit records the Population Strategy implementation while preserving
the accepted renderer, network lifecycle, topology, world grid, terrain
datasets, and LOD architecture.

## Runtime model

- Match composition is one custom human faction plus 100 AI factions.
- Opening ownership is sparse and compact, with neutral land available for
  direct-point expansion.
- The only player-facing resource is the uncommitted Population pool.
- Active operations and defense foci carry real deployed people.
- Ordinary attacks are exact source/target point operations and are not
  restricted to one active offensive per faction.
- Ports, amphibious operations, and alliances use the same server state path
  as human commands and bot commands.
- The client shows actual Population, area, local forces, casualties, ports,
  and alliance state without forecasts or fabricated combat values.

## Frozen systems

`server/src/main.rs` keeps the established websocket lifecycle. The following
assets and systems were not regenerated or redesigned:

- Rust protocol transport and snapshot/delta lifecycle
- world topology and `world_grid.bin`
- canonical geography, DEM, bathymetry, and terrain LOD data
- renderer architecture, tile resolution, and bounded cache
- political ownership semantics and accepted visual palette

## Acceptance evidence

The active Population test module covers:

- deployment reducing the free pool while preserving total living population
- multiple distinct operations from one faction
- real Defense Focus reservation and release
- bounded growth near capacity
- latitude-corrected area and sparse 101-faction startup
- permanent port cost and timed completion
- alliance blocking of ordinary attacks
- exact selected expansion anchor
- real amphibious front identity

The final command-line build and test status is recorded in the completion
response for the pass. Normal-browser visual QA is separate from this
runtime audit and must not be inferred from source or unit-test results.

## Known boundary

The browser-control host may be unavailable for live visual capture in this
environment. If so, that limitation is reported explicitly rather than being
called a visual PASS.
