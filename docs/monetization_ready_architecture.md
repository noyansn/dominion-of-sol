# Dominion of Sol — Monetization-Ready Foundation

The product is prepared for future monetization through server-validated
identity and cosmetic descriptors, not through pay-to-win simulation changes.

## Safe extension points

- Nation display name, approved faction color, and approved flag identifier
  are sanitized during the player join handshake.
- Doctrine descriptors are bounded and normalized by the server.
- The client can cache identity preferences locally, but the server owns the
  accepted values included in the snapshot.
- Future cosmetic entitlements may change flags, banners, UI skins, map
  themes, or non-gameplay presentation.

## Explicit non-goals

Purchases must not grant Population, capacity, growth, hidden defense,
territory, ports, combat strength, alliance privileges, or a bypass of exact
geographic legality. Any future store or entitlement service must resolve to a
server-validated descriptor before it reaches gameplay state.
