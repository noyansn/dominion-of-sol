# PROJECT DOMINION — HISTORICAL SPRINT PLAN

> Army-token and recovery notes in this historical plan are superseded by the
> Population Strategy contracts in `population_strategy_migration.md` and
> `gameplay_population_model.md`.

## 1. Kritik Düzeltmeler ve Mimari Kararlar (Core Design Pillars)

1. **Gerçekçi Sunucu Performans Hedefleri (50 ms Tick Bütçesi):**
   - Ortalama Tick: `< 5 ms`
   - P95 Tick: `< 10 ms`
   - P99 Tick: `< 20 ms`
   - Worst-case: `< 40 ms`
   - *(Anlamsız <1ms zorlaması kaldırıldı; işlem bütçesi doğrudan akıcı gameplay ve combat hesaplamasına ayrıldı).*

2. **Event-Driven Incremental İkmal (BFS) Mimarisi:**
   - **Her tick tam BFS yapılmayacak.**
   - İkmal durumu hücreler ve bölgeler üzerinde önbellekte tutulur.
   - BFS yalnızca **durum değiştiğinde** (hücre el değiştirdiğinde, ikmal koridoru kesildiğinde, başkent düştüğünde veya yeni bağlantı kurulduğunda) ilgili faction'ın dirty bölgesinde incremental olarak tetiklenir.

3. **8 Faction ile Başlangıç → 24 Faction'a Kademeli Ölçeklenme:**
   - Önce **1 İnsan Oyuncu + 7 Bot = 8 Faction** ile tüm gameplay loop (taarruz, cephe, ikmal, görsel token'lar) çalışır ve test edilir.
   - Çekirdek loop doğrulandıktan sonra 8 → 16 → 24 Faction'a ölçeklenir.

4. **Pragmatik ve Sağlam Bot AI:**
   - Botların görevi satranç büyükustası olmak değil, yaşayan ve mücadele eden bir harita hissi vermektir.
   - Karar akışı: `1. Güç biriktir` → `2. Sınırları tara` → `3. Güç oranına bak` → `4. İkmalsiz hedefe bonus ver` → `5. Hedef seç` → `6. Controlled / Standard / All-Out seç` → `7. Saldır`.

5. **Yerel Cephe Gücü (Local Front Power):**
   - Haritadaki Army Presence Token'lar (`530`, `840`, `1.2K`) ülkenin toplam güç havuzunu **değil**, o cephede aktif kullanılan **yerel savaş gücünü** temsil eder.
   - Oyuncunun toplam güç havuzu (`12.4K Power`) HUD'da ayrı gösterilir. Oyuncu gücünü cepheler arasında yönlendirdiğini hisseder.

6. **Cephe Odaklı Army Token Konumlandırması:**
   - Token'lar ülke geometrik merkezine değil; **aktif cephe ağırlık merkezine**, ikincil olarak **stratejik savunma noktasına / başkente** yerleştirilir. Sadece hiç cephe yoksa ülke merkezine oturur.

7. **Görsel Temizlik & Filtreleme (Visual Clarity):**
   - **Saldırı Okları:** Oyuncunun saldırıları ve oyuncuya gelen büyük saldırılar her zaman görünür. Botlar arası küçük çatışmalarda ok çizilmez; yalnızca yüksek güç eşiğini aşan veya kameraya yakın büyük operasyonlarda görünür.
   - **İkmal Damarları:** Yalnızca oyuncunun kendi ikmali, seçili hedef ülkenin ikmali ve **kesilmiş/kritik hatlar** vurgulu gösterilir. Diğerleri haritayı boğmamak için gizlenir veya çok düşük opasiteye çekilir.

8. **Görsel Geliştirme Sırası:**
   - Önce savaş mekaniği, renkler, sınırlar, cephe, token ve ikmal çalışacak.
   - Topoğrafik harita detayları ve atlas tabanı sağlam çalışan bir mekanik üzerine oturtulacak.

---

## 2. 15 Maddelik Demo Kabul Kriterleri (Acceptance Gates)

1. [ ] **Ülke Ayrımı:** Haritada ülkeler ve sınırları net olarak ayırt edilebilmeli.
2. [ ] **Oyuncu Kimliği:** Oyuncu kendi ülkesini (Mavi) ve ★ Başkentini anında tek bakışta tanıyabilmeli.
3. [ ] **Bayraklar:** Her ülkenin minimalist geometrik Faction Bayrağı görünmeli.
4. [ ] **Yerel Cephe Gücü:** Ordu sayıları cephe odaklı Army Token üzerinde kompakt (`530`, `1.2K`) ve okunaklı olmalı.
5. [ ] **Yaşayan Botlar:** Botlar gerçek zamanlı olarak sınırlarını genişletmeli, birbirleriyle ve oyuncuyla savaşmalı.
6. [ ] **Hedef Seçimi:** Oyuncu kendi sınırına ve komşu düşman toprağına tıklayarak hedef belirleyebilmeli.
7. [ ] **3 Taarruz Modu:** Mini context panelinden veya 1/2/3 tuşlarıyla `CONTROLLED`, `STANDARD`, `ALL-OUT` seçilebilmeli.
8. [ ] **Saldırı Oku:** Taarruz başladığında cepheden hedefe doğru zarif, yarı saydam ve akan bir saldırı oku görünmeli.
9. [ ] **Sayısal Çarpışma:** Savaş sırasında iki tarafın cephe gücü sayıları (`730 -> 680`, `510 -> 420`) akıcı şekilde düşmeli.
10. [ ] **Dinamik Cephe:** İki düşman arasındaki sınır çizgisi çatışma şiddetine göre hafif pulse vererek karşı tarafa doğru ilerlemeli.
11. [ ] **Toprak Fethi:** Fethedilen topraklar anlık patlama yerine renk geçişiyle el değiştirmeli.
12. [ ] **Başkent Odak:** Başkentler altın yıldız/halka ile haritada kolayca bulunabilmeli (Space ile merkeze dönülebilmeli).
13. [ ] **İkmal Damarları:** Başkentten cepheye uzanan ince ikmal koridoru okunabilmeli.
14. [ ] **İkmal Kesilme Anı:** Koridoru kesilen bölgede `⛓ SUPPLY LOST` ikonu çıkmalı, bölge solmalı ve savaş gücü kademeli zayıflamalı.
15. [ ] **3–5 Dakika Kesintisiz Oynanış:** Hiçbir çökme olmadan, stratejik kararlar vererek oynanabilen vertical slice.

---

## 3. 18 Adımlı Güvenli Uygulama Sırası (Execution Roadmap)

```text
FAZ 1: ÇEKİRDEK BAĞLANTI & 8 FACTION BAŞLANGICI [PASSED]
  Adım 1: Server (ws://127.0.0.1:8080) ↔ PixiJS Client (http://localhost:5173) canlı bağlantısı [PASSED]
  Adım 2: 8 Faction (1 İnsan + 7 Bot) başlangıç harita ve başkent dağılımı [PASSED]
  Adım 2.5: 360x180 World Grid & Full Viewport Overhaul [PASSED]

MILESTONE: FIRST BEAUTIFUL WAR (TEK CEPHE, MÜKEMMEL SAVAŞ VE KOMUTA ATLASI)
  - Simulation Grid ≠ Visual Map Resolution Ayrımı (Piksel ızgara normal görünümden kaldırılır)
  - İstemcide Yüksek Çözünürlüklü Smooth Coastline & Anti-Aliased Sınır Render Motoru
  - Direct Border Contact: Dominion of Sol (Mavi) vs Vanguard Coalition (Kırmızı)
  - Authoritative Local Front Power (Yerel Cephe Gücü: 730 vs 510)
  - Cephe Odaklı Army Presence Tokens ([SOL] 730 vs 510 [VAN])
  - Dinamik Cephe Hattı Basıncı & Akan Saldırı Oku (Flowing Attack Arrow)
  - Sayısal Çatışma Animasyonu (730 -> 691 -> 648) & Smooth Renk Geçişli Toprak Fethi
  - Modern Command Atlas Görsel Dili (%80 Glassmorphism azaltması, sade ★ başkent, mat derin atlas)

FAZ 3: BOT AI, İKMAL SİSTEMİ & CEPHELER ARASI ÖLÇEKLENME
  Adım 10: Filtrelenmiş akıcı saldırı okları (Çoklu cepheler)
  Adım 11: 7 Bot için otonom taarruz AI motoru
  Adım 12: Başkent garnizon rezervi ve ikmal damarları
  Adım 13: Event-Driven Incremental BFS İkmal Sistemi
  Adım 14: İkmal kesilme uyarısı (⛓ SUPPLY LOST), desatürasyon ve zayıflama (0-3s, 3-8s, 8+s)

FAZ 4: 16-24 FACTION ÖLÇEKLENME & FINAL ATLAS POLISH
  Adım 15: 8 Faction'dan 16 ve 24 Faction'a ölçeklenme
  Adım 16: 24 Faction için minimalist geometrik bayrak atlası
  Adım 17: Topoğrafik ve stratejik derinlik
  Adım 18: LOD sistemi ve final production polish
```
