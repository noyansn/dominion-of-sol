# PROJECT DOMINION (MONOREPO)
## Project Status: Population Strategy runtime implemented; visual QA remains browser-dependent

**Aktif Depo (Repository Root):** `C:/Users/noyan/Downloads/game`

---

## 1. SPRINT 1 GÖREV STATÜLERİ (TASK STATUS)

* `[x] Task 0.3A`: Sentetik bot ve 4 yük senaryosu altyapısı uygulandı (`benchmarks/benchmark.node.js` & `server/src/bin/benchmark.rs`).
* `[-] Task 0.3B`: Node.js ön simülasyon matrisi (5 Hz, 10 Hz, 20 Hz) tamamlandı. Rust toolchain erişimi sağlandıktan sonra release benchmark ve uçtan uca WebSocket testleri çalıştırılacaktır.
* `[-] Task 0.3C`: Ön ağ ve tick raporu üretildi. Gerçek Rust CPU ve RAM ölçümleri, gerçek uçtan uca ağ trafiği ve PixiJS render performansı tamamlanmadan görev [x] olarak işaretlenmeyecektir.

---

## 2. PREREQUISITES & REPOSITORY STRUCTURE

### Prerequisites
* **Node.js:** v18+ ve npm v10+ (İstemci ve Node.js ön simülasyon testi için)
* **Rust Toolchain:** 1.75+ (`rustc` ve `cargo` --release sunucu derlemesi için)

### Repository Structure
```text
game/
├── server/                     # Rust Headless Simülasyon Sunucusu (20 Hz Tokio Tick)
│   ├── src/
│   │   ├── main.rs             # WebSocket dinleyici ve 20 Hz tick döngüsü
│   │   ├── simulation.rs       # 1024x512 Population/territory simulator
│   │   ├── bot.rs              # 100 AI using the same Population economy
│   │   ├── protocol.rs         # Serde JSON paket tipleri
│   │   └── bin/benchmark.rs    # Rust otomatik benchmark koşucusu
│   └── Cargo.toml
├── client/                     # PixiJS v8 WebGL Render İstemcisi (TypeScript + Vite)
│   ├── src/
│   │   ├── main.ts             # Uygulama ve WebSocket istemcisi
│   │   ├── renderer.ts         # PixiJS 256x256 hücre çizimi, Pan & Zoom
│   │   └── debug.ts            # FPS, Tick time, RAM ve Telemetri paneli
│   ├── index.html
│   ├── tsconfig.json
│   └── package.json
├── shared/                     # Ortak Veri Sözleşmesi
│   ├── protocol.md             # Protokol dokümantasyonu (v1.0.0)
│   └── schemas/
│       └── protocol.json       # JSON Schema paket tanımları
├── benchmarks/                 # Benchmark Raporları ve Scriptler
│   ├── benchmark.node.js       # Node.js Ön Benchmark Runner (100 bot / 4 senaryo)
│   ├── benchmark_results.json  # Ham JSON benchmark verisi
│   └── sprint1_benchmark_report.md # Üretilen Markdown Benchmark Raporu
├── docs/                       # GDD/TDD v2.1 Dokümanı
│   └── project_dominion_gdd_tdd.md
└── README.md
```

---

## 3. QUICK START / HIZLI ÇALIŞTIRMA KOMUTLARI

### İstemciyi Çalıştırma (Web Client)
```bash
cd client
cmd /c npm install
cmd /c npm run dev
# Browser: http://localhost:5173
```

### Sunucuyu Çalıştırma (Rust Server)
```bash
cd server
cargo run --release --bin server
# Sunucu: ws://127.0.0.1:8080
```

### Node.js Ön Benchmark Suite (Pre-Simulation Runner)
```bash
cd c:/Users/noyan/Downloads/game
cmd /c node benchmarks/benchmark.node.js
# Çıktı: benchmarks/sprint1_benchmark_report.md
```

### Rust Release Benchmark Suite (Native End-to-End Validation)
```bash
cd server
cargo run --release --bin benchmark
```

---

## 4. DOKÜMANTASYON VE MİMARİ KAYNAKLAR

* **Population Strategy migration:** [`docs/population_strategy_migration.md`](./docs/population_strategy_migration.md)
* **Gameplay Population model:** [`docs/gameplay_population_model.md`](./docs/gameplay_population_model.md)
* **Final runtime audit:** [`docs/final_gameplay_runtime_audit.md`](./docs/final_gameplay_runtime_audit.md)
* **GDD/TDD v2.1 (historical baseline):** [`docs/project_dominion_gdd_tdd.md`](./docs/project_dominion_gdd_tdd.md)
* **Protokol Sözleşmesi (v1.0.0):** [`shared/protocol.md`](./shared/protocol.md)
* **JSON Şemaları:** [`shared/schemas/protocol.json`](./shared/schemas/protocol.json)
* **Ön Benchmark Raporu:** [`benchmarks/sprint1_benchmark_report.md`](./benchmarks/sprint1_benchmark_report.md)

---

## 5. KAPSAM DIŞI SİSTEMLER (SPRINT 1'DE YAPILMAYACAKLAR)

Kubernetes, PostgreSQL/Redis, Battle Pass, Giriş/Auth sistemi, Doktrinler, Diplomasi, Tam İkmal Grafiği, Canlı Atlas Shader'ları.

---
*Project Dominion Sprint 1 Dokümantasyonu.*
