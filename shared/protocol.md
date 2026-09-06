# PROJECT DOMINION: PROTOKOL VE VERİ SÖZLEŞMESİ SPECIFICATION v1.0.0

> Current gameplay contract: Population Strategy. The Rust protocol remains
> version `1.0.0`, but the active payloads use 1024×512 world cells, 101
> factions (1 custom human + 100 AI), exact point operations, ports, and
> alliances. Older Army/recovery examples in this historical document are
> superseded by `docs/gameplay_population_model.md`.

Bu doküman, Project Dominion sunucu (Rust) ve istemci (PixiJS) katmanları arasındaki WebSocket ağ paketlerinin veri formatını, tiplerini ve versiyonlama kurallarını tanımlar.

---

## 1. PROTOKOL SÜRÜMLENDİRME STRATEJİSİ

* **Mevcut Sürüm:** `1.0.0`
* Tüm paketlerde `v` (version) alanı bulunabilir veya el sıkışma (`PlayerJoin`) sırasında protokol sürümü doğrulanır.
* Uyumsuz protokol sürümleri sunucu tarafından `4001 Protocol Mismatch` kodu ile kapatılır.
* Sprint 1'de geliştirme ve hata ayıklama kolaylığı için paketler **JSON** formatında iletilir. Sprint 2 veya Alfa aşamasında darboğaz görülürse `MessagePack` veya ikili (binary) formata geçilebilir.

---

## 2. SUNUCUYA GİDEN PAKETLER (CLIENT -> SERVER)

### 2.1. PlayerJoin (`player_join`)
İstemcinin odaya katılma isteği.
```json
{
  "type": "player_join",
  "protocolVersion": "1.0.0",
  "playerName": "Commander_Alpha",
  "nationName": "Dominion of Sol",
  "factionColor": "#3B82F6",
  "flagId": "flag_sol",
  "flagDescriptor": { "layout": "horizontalBicolor", "primaryColor": "#3B82F6", "secondaryColor": "#07131C", "accentColor": "#A7F3D0", "emblem": "sun" },
  "startingCellIndex": 143456,
  "doctrineOffense": 0.015,
  "doctrineDefense": -0.005,
  "doctrineExpansion": -0.005,
  "doctrineMaritime": -0.005,
  "clientTime": 1754054000000
}
```

### 2.2. PlayerLeave (`player_leave`)
İstemcinin odadan ayrılma bildirimi.
```json
{
  "type": "player_leave",
  "playerId": 42,
  "clientTime": 1754054005000
}
```

### 2.3. CameraRegion (`camera_region`)
İstemcinin görünür ekran alanını sunucuya bildirmesi (Spatial Interest Management).
```json
{
  "type": "camera_region",
  "minX": 10,
  "minY": 10,
  "maxX": 64,
  "maxY": 64,
  "zoomLevel": 1.0
}
```

### 2.4. AttackCommand (`attack_command`)
Oyuncunun bir bölgeden diğerine taarruz emri vermesi.
```json
{
  "type": "attack_command",
  "sequence": 184,
  "sourceCellIndex": 6168,
  "targetCellIndex": 7960,
  "requestedTargetCellIndex": 7960,
  "attackType": "LAND_OFFENSIVE",
  "frontId": null,
  "commitPercent": 0.5,
  "clientTime": 1754054000000
}
```

---

## 3. İSTEMCİYE GİDEN PAKETLER (SERVER -> CLIENT)

### 3.1. WorldSnapshot (`world_snapshot`)
Odaya katılımda gönderilen haritanın tamamını içeren durum paketi.
```json
{
  "type": "world_snapshot",
  "tick": 1200,
  "width": 1024,
  "height": 512,
  "yourFactionId": 1,
  "factions": "101 authoritative faction descriptors",
  "fronts": "exact active operations and actual local forces",
  "strategicSites": "ports, straits, and canals",
  "ports": "completed and in-progress port states",
  "alliances": "authoritative alliance memberships",
  "totalCells": 524288,
  "cells": [
    { "index": 0, "ownerId": 0, "terrain": 0, "flags": 0 },
    { "index": 1, "ownerId": 1, "terrain": 1, "flags": 0 }
  ]
}
```

### 3.2. CellDeltaBatch (`cell_delta_batch`)
Her tick'te (50ms / 20 Hz) sadece değişen hücreleri içeren toplu güncelleme.
```json
{
  "type": "cell_delta_batch",
  "tick": 1201,
  "sequence": 450,
  "deltas": [
    { "index": 6168, "ownerId": 1, "flags": 1 },
    { "index": 6169, "ownerId": 1, "flags": 0 }
  ]
}
```

### 3.3. ServerMetrics (`server_metrics`)
İstemci debug arayüzü ve telemetry için sunucu sağlık verisi.
```json
{
  "type": "server_metrics",
  "tick": 1201,
  "tickTimeMs": 1.45,
  "activePlayers": 14,
  "botCount": 86,
  "deltasCount": 42,
  "ramUsageMb": 38.5
}
```

---

## 4. HÜCRE İNDEKSİ HESAPLAMA FORMÜLÜ

Harita $1024 \times 512$ sabit boyutundadır ($524.288$ hücre).
* $(x, y) \to \text{Index}$: $\text{Index} = y \times 1024 + x$
* $\text{Index} \to (x, y)$: $x = \text{Index} \pmod{1024}$, $y = \lfloor \text{Index} / 1024 \rfloor$
