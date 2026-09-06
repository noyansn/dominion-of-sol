# Dominion of Sol — Population Strategy Migration

This document is the authoritative migration note for the Population Strategy
product pass. It supersedes the pre-migration Army-era audit notes.

## One authoritative player economy

| Superseded model | Authoritative model |
| --- | --- |
| Army, available Army, reserve, recovery | Population is the only player-facing strategic resource |
| Committed Army is a generic reserve | A deployment removes real Population from the free pool immediately |
| Reinforcement regenerates Army | Growth adds people to the uncommitted Population pool and is bounded by living population and capacity |
| Defense is an implicit regional rating | Defense is real Population deployed at a frontier point, with a small real emergency response |
| One offensive per attacker | Any number of distinct operations may run when each has a legal point and sufficient Population |
| Faction-pair attack semantics | An operation stores the exact source and target cell selected by the player |
| Hidden defense forecasts and recommendations | Enemy total Population is public; only actual engaged local forces are exposed after contact |
| Conventional full opening | One human plus 100 AI nations start from compact cores on approximately 20% of claimable land |

## Authoritative boundaries

The Rust simulation remains the source of truth for Population, deployed
people, casualties, ownership, ports, alliances, and operation identity. The
client formats and presents those values; it does not predict or fabricate
them.

Frozen data was not regenerated in this pass:

- `server/assets/world_grid.bin` SHA-256: `EE223110B74F18B661CEF04E41FECA57CDDC9B56204DDFAB23D92C02F6CEEAE5`
- `client/src/assets/world_visual_mask.bin` SHA-256: `D2CC53DE50AA872AC1C556D0104532223DE7EA2A9E4479F856B0195B759C6870`
- `client/src/assets/canonical_geography.json` SHA-256: `CAE0770B86108A3C45880B94F7B57932CD3635A71640F80D844476F528C3D320`

## Migration rule

No gameplay path should introduce an Army alias, a hidden defense score, a
second player resource, or a client-only combat result. Existing historical
documents may mention the old model for audit context, but runtime code and
new product documentation must use Population terminology.
