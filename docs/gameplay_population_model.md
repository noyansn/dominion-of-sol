# Dominion of Sol — Gameplay Population Model

## Population ledger

For every living faction:

```text
total_living_population = population_pool + deployed_population
```

`population_pool` is the value shown as `population` in the protocol and HUD.
It is the currently uncommitted pool. Deployed people are tracked separately
in active operations and defense foci, but are not a second player-facing
resource.

Deployment subtracts from the pool immediately. Combat casualties reduce the
deployed ledger permanently. Survivors return to the pool when an operation
ends or is halted. The server validates this ledger after simulation changes.

## Capacity and growth

Capacity is derived from latitude-corrected spherical cell area:

```text
capacity = base_capacity + effective_controlled_area_km2 × capacity_per_km2
growth_rate = base_growth + effective_controlled_area_km2 × growth_per_km2
```

Newly acquired land contributes through a bounded 20-second effective-area
consolidation. Growth uses total living population pressure, so moving people
into a front does not create additional population.

## Legal orders

- Expansion requires a neutral land cell directly adjacent to the faction and
  uses that exact selected point as the operation anchor.
- Ordinary attacks require an owned source cell, an enemy land target, and
  direct cardinal adjacency. Each accepted order creates a distinct operation
  with exact source and target cells.
- Multiple operations from one faction are legal when each order is valid and
  each deployment is funded by the real Population pool.
- Defense Focus takes real Population from the pool and may be placed only on
  an owned frontier point. Releasing it returns the surviving deployed people.
- A defender first uses available local Focus people. If that local ledger is
  empty, a bounded emergency response is drawn from the defender's free pool.
  The same people are not counted twice across fronts.

## Ports and amphibious operations

A port requires an owned strategic port site, coastal adjacency, and a
permanent Population cost. Construction is time-based. Only completed ports
provide the maritime growth bonus and authorize amphibious operations.
Amphibious operations retain real source port and coastal target cells and are
reported as `AMPHIBIOUS` fronts. A coastal embarkation without a completed
port is legal only as a small raid; a completed port permits the larger
Population commitment and receives the bounded maritime benefit. The target
must be an exact coastal land cell and travel attrition uses the great-circle
distance between source and destination.

## Alliances and victory

Alliance membership is server-authoritative and blocks ordinary attacks
between allied members. AI offers use a deterministic decision; human offers
are pending proposals that can be accepted or rejected. If all surviving
factions form one connected alliance coalition, that coalition can resolve the
match together. Any fixed reward pool is split by authoritative controlled
km² share.

## Public information contract

Enemy total Population is public. The client does not show hidden defense
ranges, predicted force levels, or recommended commitment colors. Local
engaged forces, casualties, and operation state are shown only from actual
front data received from the server.
