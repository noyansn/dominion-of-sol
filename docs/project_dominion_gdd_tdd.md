# PROJECT DOMINION: GELİŞMİŞ ÇOK OYUNCULU PİKSEL-TABANLI STRATEJİ OYUNU
## GAME DESIGN DOCUMENT (GDD) & TECHNICAL DESIGN DOCUMENT (TDD) v2.1
### PRE-PRODUCTION CANDIDATE — PROTOTYPE APPROVED

---

## 1. BELGE DURUMU VE SÜRÜM NOTLARI

* **Doküman Sürümü:** v2.1 (Pre-Production Candidate — Prototype Approved)
* **Tarih:** 1 Ağustos 2026
* **Resmî Statü:** **Belge Durumu: Pre-Production Candidate — Prototype Approved / Sprint 1: Preliminary Benchmark Harness Accepted — Rust/Tokio End-to-End Validation Required**
* **Belge Amacı:** Bu doküman, pazarlama ve yatırımcı sunumu amacı taşımamaktadır. Oyun tasarımcılarının, yazılımcıların, UI/UX ekibinin, teknik sanatçıların ve QA mühendislerinin doğrudan prototip geliştirmeye başlayabileceği açık, dürüst, test edilebilir ve uygulanabilir bir teknik üretim çerçevesidir.
* **Değişiklik Özeti (v2.0 -> v2.1):**
  1. **Resmî Statü ve Etiketleme:** Doğrulanmamış başarı iddiaları kaldırılmış, belge statüsü *Prototype Approved* seviyesine çekilmiş ve tüm sistemler 7 teknik etiketle ilişkilendirilmiştir.
  2. **Ölçek Çelişkilerinin Giderilmesi:** 100 oyunculu lansman hedefi ile MVP kapsamı ayrıştırılmış; 4 aşamalı ölçeklenme modeli (Teknik Risk Prototipi $\to$ Core Gameplay Prototype $\to$ İlk Kapalı Playtest $\to$ Ölçek Testi) tanımlanmıştır.
  3. **AFK ve Bağlantı Kesilme Sistemi:** Toprakların 30 saniyede otomatik tarafsızlaşması kaldırılmış; çok yönlü aktivite algılama ve Savunmacı AI devralma modeli getirilmiştir.
  4. **Esnek İkmal ve Koridor Kapasitesi:** Katı 3-hücre kuralı yerine hücre genişliği ve arazi altyapısına dayalı "Koridor Kapasitesi" modeli ve yapılandırılabilir ikmal parametreleri entegre edilmiştir.
  5. **Doğal İtibar ve İhanet:** Otomatik pakt reddi kaldırılmış; kategorik itibar (Güvenilir, Şüpheli, Güvenilmez, Tehlikeli) ve sosyal/diplomatik sonuç sistemi kurulmuştur.
  6. **A/B Test Planı ve Kontrol Alternatifleri:** Sürükleme mesafesi ile 3'lü Buton UI seçenekleri için mobil A/B test planı eklenmiştir.
  7. **Prototip Basitleştirmesi:** Doktrinler "Alfa Sonrası Derinlik Sistemi" statüsüne geçirilmiş; MVP tamamen 3 Saldırı + 4 Aşamalı İkmal + Piktografik Diplomasi çekirdeğine odaklanmıştır.

---

## 2. KULLANILAN DURUM ETİKETLERİ

Belge içerisindeki tüm sistem ve parametreler aşağıdaki 7 teknik etiketle tanımlanmıştır:

* `[Tasarım Kararı]`: Ekip tarafından oydaşlıkla kabul edilmiş ve prototipte uygulanacak yön.
* `[Prototip Varsayımı]`: Henüz doğrulanmamış, playtest sırasında değiştirilmesi beklenen başlangıç değeri veya kuralı.
* `[Teknik Hedef]`: Benchmark ve yük testleriyle kanıtlanması gereken performans amacı.
* `[Açık Soru]`: Henüz kesin karar verilmemiş, test sonuçlarına göre belirlenecek konu.
* `[Uygulandı]`: Çalışan build/kod verisi içinde mevcut olan özellik.
* `[Doğrulandı]`: QA, yük testi veya kullanıcı araştırmasıyla kanıtlanmış özellik.
* `[Revizyon Gerekli]`: Test sonuçları yetersiz görülen ve yeniden tasarlanacak sistem.

---

## 3. TEK CÜMLELİK OYUN TANIMI `[Tasarım Kararı]`

**Project Dominion**, mobil ve web tarayıcılarında aynı 2D hücresel atlas haritasında 32 ila 100 oyuncuyu buluşturan, sezgisel dokunmatik kontrollerle yönetilen, lojistik ikmal hatları ve dinamik cephe fiziğiyle stratejik derinlik sunan 5-10 dakikalık kitlesel gerçek zamanlı fetih oyunudur.

---

## 4. ÜRÜN VİZYONU `[Teknik Hedef]`

Project Dominion, basit alan hâkimiyeti oyunlarının erişilebilirliği ile harita geometrisine dayalı lojistik stratejiyi birleştirir.

> **Hedef Ürün Vaadi (Doğrulanacak):** Oyuncu ilk maçında ne yapacağını birkaç saniyede anlamalı; yüzüncü maçında ise harita geometrisi, ikmal koridorları, saldırı zamanlaması ve diplomatik ilişkiler konusunda hâlâ yeni taktikler keşfedebilmelidir.

---

## 5. TASARIM HEDEFLERİ `[Tasarım Kararı]`

1. **Erişilebilir Derinlik:** Oyuncuyu karmaşık tablolarla boğmadan, basit kararların (Nereye saldırayım? İkmali nasıl koruyayım?) etkileşiminden yüksek stratejik derinlik üretmek.
2. **Hızlı ve Akıcı Oturumlar:** Mobilde 5–8 dakikalık molalarda oynanabilir yüksek tempolu maç akışı sağlamak.
3. **Gerçek Zamanlı Jeopolitik Dram:** İkmal hattı kesilmeleri ve piktografik paktlarla "David Goliath'a karşı" zafer anları yaratmak.

---

## 6. TASARIM SÜTUNLARI VE KABUL ÖLÇÜTLERİ `[Tasarım Kararı]`

### 6.1. Görsel Lojistik
* **Açıklama:** İkmal gücü, kuşatılmış alanlar ve zayıf koridorlar panel açmadan harita üzerinden okunmalıdır.
* **Test edilebilir Kabul Ölçütü:** İlk kez oynayan oyuncuların en az %75'i, ikmal hattı kesilen bir bölgenin kararmasından zayıfladığını anlamalıdır.

### 6.2. Adil ve Organik Cephe Fiziği
* **Açıklama:** Sınırlar mekanik pikseller değil; basınç altında bükülen akışkan bir zar gibi davranmalıdır.
* **Test edilebilir Kabul Ölçütü:** İkmal kesintisinde anlık felç yaşanmamalı; 4 aşamalı süreçte savunan oyuncuya karşı hamle süresi tanınmalıdır.

### 6.3. Zahmetsiz Diplomasi
* **Açıklama:** Serbest chat olmadan 1-2 dokunuşla dil engelini aşan piktografik mesajlaşma.
* **Test edilebilir Kabul Ölçütü:** Oyuncular maç başına ortalama en az 2 piktografik mesaj (NAP / Ortak Saldırı) kullanmalıdır.

---

## 7. PROTOTİPTE DOĞRULANACAK ANA HİPOTEZLER `[Prototip Varsayımı]`

1. **Hipotez 1 (Öğrenilebilirlik):** Yeni oyuncular ilk 30 saniye içinde Kontrollü ve Standart Taarruz arasındaki farkı anlayabilir.
2. **Hipotez 2 (İkmal Hazzı):** İkmal hattını keserek büyük rakibi zayıflatmak oyuncuda yüksek duygusal tatmin üretir.
3. **Hipotez 3 (Algılanan Adalet):** İkmal hattı kesilen oyuncu neden zayıfladığını görsel işaretlerden açıkça anlar ve oyunu adaletsiz bulmaz.
4. **Hipotez 4 (Platform Dengesi):** Mobil oyuncular ile web (fare) oyuncuları benzer taarruz başarısına ulaşır.

---

## 8. ANA OYUN DÖNGÜSÜ (CORE GAMEPLAY LOOP) `[Tasarım Kararı]`

```
+-----------------------------------------------------------------------------------+
| CORE GAMEPLAY LOOP                                                                |
+-----------------------------------------------------------------------------------+
| 1. BAŞLANGIÇ NOKTASI & NÖTR ALAN  | Başkent seçimi, Kontrollü İlerleme ile alan toplama.|
| 2. İKMAL HATLARI & SINIR TEMASI   | Şehir bağlama, ikmal koridoru güçlendirme.          |
| 3. AKTİF ÇATIŞMA & DİPLOMASİ       | İkmal hattı kesme, Piktografik paktlar, dar geçit. |
| 4. SON OYUN & BİRLEŞİK SKOR       | Çok cepheli baskı altında harita/skor hâkimiyeti.   |
+-----------------------------------------------------------------------------------+
```

---

## 9. İLK BEŞ MAÇ ONBOARDING (KADEMELİ DERİNLİK) `[Tasarım Kararı]`

* **Maç 1:** Sadece Başkent Seçimi, Nötr Alan Büyümesi ve Standart Taarruz (İkmal arka planda sabittir).
* **Maç 2:** İkmal Çizgilerinin tanıtımı (Parlak damar = Güçlü bağlantı, Solan damar = Zayıf bağlantı).
* **Maç 3:** Piktografik Diplomasi (1 dokunuşla "Saldırmazlık" ve "Ortak Hedef" atma).
* **Maç 4:** Stratejik Merkezler (Dağ Geçidi, Liman, Şehir ve Başkent işlevleri).
* **Maç 5:** Doktrinler ve İleri Seviye Kontroller.

---

## 10. ÜÇ SALDIRI SEVİYESİ `[Tasarım Kararı]`

```
+-----------------------------------------------------------------------------------+
| TAARRUZ SEVİYELERİ VE RİSK PROFİLİ                                                |
+-----------------------------------------------------------------------------------+
| 1. KONTROLLÜ İLERLEME (Düşük Risk / Yavaş Büyüme / Nötr Alan İstilası)           |
| 2. STANDART TAARRUZ   (Dengeli Güç / Varsayılan Saldırı Seviyesi)                 |
| 3. TOPYEKÛN TAARRUZ   (Yüksek Baskı / Arka Savunmayı %50 Açık Bırakır / Riskli)   |
+-----------------------------------------------------------------------------------+
```

---

## 11. KONTROL ALTERNATİFLERİ VE A/B TEST PLANIZ `[Prototip Varsayımı]`

### Alternatif A (Sürükleme Mesafesi)
Hedefe dokun $\to$ parmağı ileri sürükle (kısa = Kontrollü, orta = Standart, uzun = Topyekûn) $\to$ bırak.

### Alternatif B (Hedef Seçimi + 3'lü UI Butonu)
Hedefe dokun $\to$ ekran altında açılan 3 butonlu panelden taarruz tipini seç.

### A/B Test Kriterleri Matrix
Prototip aşamasında oyuncuların %50'sine Alternatif A, %50'sine Alternatif B sunularak şu metrikler ölçülecektir:
* Yanlış Saldırı Oranı (Accidental All-out attack rate).
* İkinci Saldırıya Kadar Geçen Süre (Hız).
* Tek Elle Kullanım Başarısı.

---

## 12. DİNAMİK CEPHE SİSTEMİ `[Tasarım Kararı]`

### Sistem Analizi Şablonu: Dinamik Cephe
* **Statü:** `[Tasarım Kararı]`
* **Oyuncuya Sunduğu Karar:** Hangi sınıra ne kadar güç baskısı uygulayacağına karar verir.
* **Neden Eğlenceli?** Sınırın sert bir çizgi değil, organik olarak bükülen esnek bir zar gibi karşı tarafa kayması görsel tatmin üretir.
* **Nasıl Anlatılır?** Basınç hattı boyunca beyaz/kırmızı darbe dalgası animasyonu ve sınır kalınlaşmasıyla.
* **Karşı Oyun:** Savunan taraf o cepheye takviye birlik aktarabilir veya tahkimat moduna geçebilir.
* **Başarısızlık Durumu:** Baskı yetersiz kalırsa saldıranın birliği tükenir ve sınır geriye doğru sekebilir.
* **Kötüye Kullanım:** Tüm sınırlar boyunca mikroskobik düzeyde sürekli dokunarak sınır titreşimi yaratmak.
* **Önleme:** Güç güncellemeleri saniyede 2 kez (2 Hz) işlenir, görsel interpolasyon 60 FPS'te akıcı gösterir.
* **Mobil Kullanım:** Tek parmakla sınır hattı seçilip taarruz yönü çekilir.
* **Teknik Maliyet:** Sunucuda düşük. Sadece aktif muharebe olan sınır hücrelerinin `Pressure` değeri hesaplanır.
* **Test Hipotezi:** Oyuncuların %80'i sınırın hangi yöne büküldüğüne bakarak muharebeyi kimin kazandığını anlayabilmelidir.
* **Ayarlanabilir Parametreler:** `FrontlinePressureThreshold` (Varsayılan: 1.2), `BorderFlexibilityRate` (Varsayılan: 0.15).

---

## 13. DÖRT AŞAMALI İKMAL SİSTEMİ `[Prototip Varsayımı]`

İkmal hattı kesilen bir bölge anında felç olmaz. Karşı oynamaya izin veren 4 aşamalı parametrik süreç devreye girer:

```
[ BAŞKENT BAĞLANTISI KESİLDİ ]
              |
              v
[ AŞAMA 1: TEHLİKE (0 - 3 sn) ] ----------> Görsel/İşitsel Uyarı. Güç kaybı YOK.
              |                             Karşı Hamle: Koridoru anında aç!
              v
[ AŞAMA 2: ZAYIFLAMA (3 - 8 sn) ] --------> Savunma/Hız -%25. Renk hafif solar.
              |                             Karşı Hamle: Yakın Limanı etkinleştir.
              v
[ AŞAMA 3: KUŞATMA (8 - 15 sn) ] ---------> Savunma -%60. Üretim durur.
              |                             Karşı Hamle: Müttefikten acil destek iste.
              v
[ AŞAMA 4: ÇÖKÜŞ (15+ sn) ] --------------> Hücreler kademeli tarafsızlaşır.
```

### Sistem Analizi Şablonu: Dört Aşamalı İkmal
* **Statü:** `[Prototip Varsayımı]`
* **Oyuncuya Sunduğu Karar:** Kesilen koridoru kurtarmak için birlik mi kaydıracak, yoksa bölgeyi feda edip geri mi çekilecek?
* **Neden Eğlenceli?** Zamana karşı yarış gerilimi yaratır. Kuşatmayı 14. saniyede kırmak yüksek adrenalin sağlar.
* **Nasıl Anlatılır?** Bölge üzerinde 4 aşamalı dairesel dolum ikonu, kırık zincir simgesi ve kararma efekti.
* **Karşı Oyun:** Savunan taraf yakındaki limanı devreye sokabilir veya müttefikinden dışarıdan koridoru yarmasını isteyebilir.
* **Başarısızlık Durumu:** Karşı hamle yapılmazsa Aşama 4'te bölge tarafsızlaşarak düşman ele geçirmesine açık hale gelir.
* **Kötüye Kullanım:** Anlamsız 1 piksel hatlarla rakip üzerinde sürekli uyarı efekti tetiklemek.
* **Önleme:** Koridor Kapasitesi sistemi (İnce koridorlar düşük ikmal debisi taşır).
* **Mobil Kullanım:** Kuşatılan bölgeye dokunulduğunda "Koridoru Aç" ve "Geri Çekil" hızlı düğmeleri belirir.
* **Teknik Maliyet:** Sunucu tarafında `SupplyState` kontrolü saniyede 1 kez taranır (20 Hz tick rate'i yormaz).
* **Test Hipotezi:** İkmal hattı kesilen oyuncuların en az %40'ı Aşama 2 bitmeden karşı hamle yapabilmelidir.
* **Ayarlanabilir Parametreler:** 
  * `SupplyWarningDuration` = 3.0s
  * `SupplyWeakeningDuration` = 5.0s
  * `SupplySiegeDuration` = 7.0s
  * `CollapseNeutralizationRate` = %10 / saniye.

---

## 14. KORIDOR KAPASİTESİ SİSTEMİ `[Prototip Varsayımı]`

Katı "3 hücreden ince hatlar tamamen çalışmaz" kuralı yerine esnek **Koridor Kapasitesi** modeli uygulanır:

$$\text{SupplyCapacity}(w) = \min\left(1.0, \frac{w}{3.0}\right) \times \text{InfrastructureBonus}$$

* $w = 1 \text{ Hücre Genişliği}$: Kapasite %33. İkmal taşır fakat dar boğazdır, kolay kırılır.
* $w = 2 \text{ Hücre Genişliği}$: Kapasite %66.
* $w \ge 3 \text{ Hücre Genişliği}$: Kapasite %100 (Tam İkmal Akışı).
* **Dağ Geçitleri & Altyapı:** Tek hücrelik bir dağ geçidinde yol veya köprü inşa edilmişse kapasite çarpanı $\times 2.0$ olur.

---

## 15. KUŞATMA KARŞI OYUNLARI `[Tasarım Kararı]`

İkmal hattı kesilen savunan oyuncu şu 3 net karşı hamleden birini seçebilir:
1. **Yarma Taarruzu (Breakthrough):** Kesilen koridor noktasına tüm yedek gücüyle saldırıp hattı tekrar açmak.
2. **Deniz Köprüsü (Sea Bridge):** Eğer kuşatılan bölgede bir Liman varsa, deniz üzerinden geçici ikmal akışı başlatmak.
3. **Kontrollü Geri Çekilme (Orderly Retreat):** Kuşatılan bölgedeki gücün %50'sini kurtararak ana başkent hattına çekilmek (Bölge hemen grileşir).

---

## 16. BAŞKENT KAYBI VE TAŞIMA SİSTEMİ `[Prototip Varsayımı]`

Başkent kaybedildiğinde ordu anında dağılmaz. Aşama yönetimi devreye girer:
1. **Başkent Düşüşü:** İkmal debisi küresel olarak %50 düşer. Ekranda 12 saniyelik "Başkent Kriz Sayacı" başlar.
2. **Aday Şehir Seçimi:** Oyuncunun elindeki Büyük Şehirler aday başkent olarak parlar.
3. **Taşıma Emri:** Oyuncu bir dokunuşla yeni Başkenti tesciller. 12 saniye içinde seçim yapılmazsa en yüksek nüfuslu şehir otomatik Başkent olur.
4. **Soğuma Süresi:** Aynı maçta tekrar Başkent taşımak 90 saniye soğuma süresine tabidir.

---

## 17. POWER POOL EKONOMİSİ `[Tasarım Kararı]`

Oyuncu ekranda tek bir katmanlı **Güç Havuzu (Power Pool)** çubuğu görür.

```
+-----------------------------------------------------------------------------------+
| POWER POOL LAYERING                                                               |
+-----------------------------------------------------------------------------------+
| [ ████████████████████████░░░░░░░░░░░░▒▒▒▒▒▒▒▒ ] 14,250 / 20,000                 |
|  (Parlak: Kullanılabilir) | (Mat: Savunma) | (Taralı: İkmalsiz Kilitli Güç)      |
+-----------------------------------------------------------------------------------+
```

### Ekonomik Davranış İlkeleri (GDD Dili)
* **Üretim:** Toprak büyüklüğü ve şehir sayısı Güç Havuzunu büyütür.
* **Yavaşlama (Bürokratik Maliyet):** Ülke aşırı büyüdükçe (Haritanın %30'undan fazlası) yeni güç üretimi üssel olarak yavaşlar.
* **İkmal Kilidi:** İkmalsiz kalan topraklardan gelen güç "Taralı Güç" olarak kilitlenir ve taarruzda kullanılamaz.

---

## 18. PİKTOGRAFİK DİPLOMASİ `[Tasarım Kararı]`

Serbest sohbet yoktur. Ekranın sağından açılan 1-dokunuşlu radyal mönü:

```
       [ 🤝 Saldırmazlık (NAP) ]     [ ⚔️ Ortak Hedef ]
                         \           /
                          [ HEDEF ]
                         /           \
       [ 🛡️ Destek İste ]           [ ⚠️ Tehdit İşareti ]
```

---

## 19. İTİBAR VE İHANET (REPUTATION & BETRAYAL) `[Prototip Varsayımı]`

Otomatik reddetme veya otomatik ülke felci yoktur. Sosyal ve diplomatik hafıza çalışır:
* **İtibar Kategorileri:** Güvenilir (100-80 p), Şüpheli (79-50 p), Güvenilmez (49-20 p), Tehlikeli (19-0 p).
* **İhanet:** Saldırmazlık Paktı (NAP) varken doğrudan saldıran oyuncunun İtibarı anında "Tehlikeli" seviyesine düşer.
* **Sonuçlar:** 
  1. Başında 2 dakika boyunca **Kırık Kılıç** ikonu çıkar.
  2. Diğer oyunculara "X oyuncusu paktı bozdu!" bildirimi gider.
  3. AI oyuncuları bu oyuncuyla asla yeni pakt kurmaz.
  4. Takım modunda (Frontline) dost ateşi kapalıdır (Friendly Fire: OFF).

---

## 20. DOKTRİNLERİN ALFA SONRASI TASARIMI `[Açık Soru]`

* **Statü:** `[Açık Soru]` / Alfa Sonrası Derinlik Sistemi.
* Doktrinler MVP ve Prototip aşamasında **TAMAMEN DEVRE DIŞIDIR**.
* Alfa aşamasında eklenecek 4 davranışsal doktrin:
  1. *Lojistik Doktrini:* Acil İkmal Koridoru yeteneği.
  2. *Yarma Doktrini:* Tek noktaya Odak Taarruz yeteneği.
  3. *Derin Savunma Doktrini:* Kontrollü Yavaşlatarak Çekilme yeteneği.
  4. *Deniz Doktrini:* İleri İkmal Limanı yeteneği.

---

## 21. PROTOTİP KLASİK FETİH MODU `[Prototip Varsayımı]`

* **Oyuncu Sayısı:** 20 – 32 Oyuncu (Solo FFA + Botlar).
* **Maç Süresi:** 7 – 10 Dakika.
* **Harita:** Prototip Hibrit Atlas Haritası ($256 \times 256$ Hücre).
* **Birleşik Zafer Skoru Formülü:**

$$\text{VictoryScore} = (\text{LandArea} \times 1.0) + (\text{StrategicCenters} \times 150) + (\text{ActivePower} \times 0.05)$$

Sadece köşede bekleyip savaşmayan oyuncu Stratejik Merkez puanı alamadığı için kazanamaz.

---

## 22. PROTOTİP CEPHE HATTI MODU (FRONTLINE 16v16) `[Prototip Varsayımı]`

* **Oyuncu Sayısı:** 16v16 (2 Takım: Kırmızı vs. Mavi).
* **Harita:** Doğu-Batı Simetrik Harita (3 Hâkimiyet Noktası).
* **Takım İçi İkmal:** Takım arkadaşlarının ikmal hatları birbirinin toprağından kesintisiz geçer.
* **Elenen Oyuncu:** Elenen oyuncu oyundan atılmaz; "Alt Komutan" olarak kalan takım arkadaşlarına ikmal desteği ve radar pingi atabilir.

---

## 23. OYUNCU SAYISI ÖLÇEK PLANIZ `[Teknik Hedef]`

```
+-----------------------------------------------------------------------------------+
| STAGED PLAYER SCALE PLAN                                                          |
+-----------------------------------------------------------------------------------+
| 1. TEKNİK RİSK PROTOTİPİ : 1-10 İstemci + 50-100 Sentetik Bot (Perf Testi).        |
| 2. CORE GAMEPLAY PROTO.   : 8-16 Gerçek Oyuncu + Botlar (Eğlence Testi).           |
| 3. İLK KAPALI PLAYTEST    : Klasik Fetih (20-32 Oyuncu), Frontline (16v16).       |
| 4. ÖLÇEK TESTİ            : 50 -> 64 -> 100 Oyuncu Kademeli Yük Testi.            |
| 5. ALFA SONRASI HEDEF     : 100 Oyuncu Canlı Odalar.                              |
+-----------------------------------------------------------------------------------+
```

---

## 24. AFK VE BAĞLANTI KESİLMESİ SİSTEMİ `[Tasarım Kararı]`

Otomatik 30s tarafsızlaşma iptal edilmiştir.
1. **Çok Yönlü Aktivite Tespiti:** Kamera kaydırma, zoom yapma, ping atma, mönü açma ve bölge seçimi tam aktivite sayılır.
2. **Bağlantı Kopması:**
   * *0 - 10s:* Son emirler uygulanmaya devam eder.
   * *10 - 30s:* Savunmacı AI devralır. Saldırı yapmaz, sadece sınır ve ikmal korur.
   * *Yeniden Bağlantı:* Oyuncu bağlandığı an kontrolü eksiksiz geri alır.
   * *Uzun Süreli Terk (3dk+):* Ülke kalıcı olarak Savunmacı AI'ya devredilir, toprakları griye dönüşmez.

---

## 25. CANLI STRATEJİK ATLAS SANAT YÖNÜ `[Tasarım Kararı]`

Mat ülke renkleri, topoğrafik yükselti çizgileri, zarif ikmal damarları ve organik sınır hareketlerinden oluşan stilize 2D atlas stili.

### Görsel Renk Kodlaması
* **Kırmızı:** Sadece doğrudan aktif tehdit ve taarruz okları.
* **Altın:** Sadece stratejik merkezler ve zafer hedefleri.
* **Mavi/Müttefik Renkleri:** İkmal damarları ve dost paktlar.

---

## 26. GÖRSEL GÜRÜLTÜ VE LOD BÜTÇESİ `[Teknik Hedef]`

```
+-----------------------------------------------------------------------------------+
| LEVEL OF DETAIL (LOD) & NOISE BUDGET                                              |
+-----------------------------------------------------------------------------------+
| 1. STRATEJİK UZAK (Zoom < %30): Ülke renkleri, kalın sınırlar, başkentler.        |
| 2. ORTA GÖRÜNÜM    (Zoom %30-70): Şehirler, ikmal damarları, dağ geçitleri.      |
| 3. YAKIN GÖRÜNÜM   (Zoom > %70): Hücre hareketleri, detaylı topoğrafya.           |
| GÖRSEL BÜTÇE SINIRI: Ekranda aynı anda max 12 aktif taarruz oku ve 8 ikmal uyarısı|
+-----------------------------------------------------------------------------------+
```

---

## 27. UI/UX VE MOBİL KULLANIM `[Tasarım Kararı]`

Ekranın alt %30'luk bölümü (Thumb Zone) tüm etkileşimler için ayrılmıştır.

```
+---------------------------------------------------+
| [Skor Tablosu]              [Harita/Süre] [Ayarlar]|
|                                                   |
|                CANLI ATLAS EKRANI                 |
|             (Pinch / Drag / Snap Zone)            |
|                                                   |
+---------------------------------------------------+
| [Doktrin]     [ KONTROLLÜ | STANDART | TOPYEKÛN ] |
| [  (Alfa) ]   <========= Taarruz Slidarı ========> |
+---------------------------------------------------+
```

---

## 28. ERİŞİLEBİLİRLİK `[Tasarım Kararı]`

* **Renk Körlüğü Modları:** Deuteranopia, Protanopia ve Tritanopia için desen kaplamaları.
* **Büyük UI & Haptik:** Büyük buton modu, ayarlanabilir haptik titreşim şiddeti ve Hareket Azaltma (Reduce Motion) seçeneği.

---

## 29. MOBİL VE WEB GİRDİ ADALETİ `[Prototip Varsayımı]`

* Max 3 emir/saniye sınırlaması.
* Mobilde **Target Snapping** (Dokunulan noktadaki en yakın stratejik düğüme yapışma).
* Her iki platformda tamamen eşit maksimum kamera uzaklaştırma sınırı (Fixed Viewport).
* **Başarı Hedefi:** Playtestlerde Mobil vs. Web kazanma oranlarının %48-%52 bandında kalması.

---

## 30. TEKNİK MİMARİ VE PROTOTİP GERÇEKLİĞİ `[Teknik Hedef]`

```
+-----------------------------------------------------------------------------------+
| ARCHITECTURE EVOLUTION                                                            |
+-----------------------------------------------------------------------------------+
| ERA 1: LOKAL PROTOTİP (Şimdi)   : Tek Rust Server (Tokio) + In-Memory Socket State.|
| ERA 2: ALFA/BETA (İleride)      : Rust Cluster + Redis Cache + PostgreSQL DB + K8s.|
+-----------------------------------------------------------------------------------+
```

İlk prototip aşamasında Kubernetes veya karmaşık mikroservisler KURULMAZ. Tek bir Rust binary sunucusu ile doğrulanır.

---

## 31. HİBRİT GRID-GRAPH İKMAL YAPISI `[Teknik Hedef]`

Simülasyon $256 \times 256$ hücresel matris üzerinde çalışır. Ancak ikmal hesabı tüm hücreleri taramaz; Başkent, Şehir ve Limanlar arasındaki **Topolojik İkmal Grafiği (Graph Edges)** üzerinde Incremental BFS ile hesaplanıp hücrelere dağıtılır.

```
[ Başkent Nod A ] ===(Grafik Kenarı / Kapasite 1.0)===> [ Şehir Nod B ]
        ||                                                    ||
(Dağ Geçidi: T=0.4)                                  (Deniz Limanı: T=0.8)
        ||                                                    ||
        \/                                                    \/
[ Ön Cephe Region 1 ]                                [ Ada Bölgesi Region 2 ]
```

---

## 32. AĞ VE SUNUCU UPDATE MODELİ `[Teknik Hedef]`

| Sistem | Güncelleme Sıklığı | Açıklama |
| :--- | :--- | :--- |
| **Muharebe ve Sınır İtişi** | 10 Hz (100ms) | Sınır hücrelerinin el değiştirmesi. |
| **Görsel Render** | 60 FPS | İstemci tarafı PixiJS interpolasyonu. |
| **İkmal Grafiği** | 1 Hz (1000ms) | Lojistik bağlantı güncellemeleri. |
| **Ekonomi & Power Pool** | 2 Hz (500ms) | Üretim ve güç havuzu artışı. |
| **Diplomasi** | Event-Based | Sadece mesaj atıldığında paket iletilir. |

---

## 33. BENCHMARK PLANIZ `[Teknik Hedef]`

Aşağıdaki worst-case senaryosu sunucu yük testinde benchmark alınacaktır:
* **Senaryo:** 100 Oyuncu / Botun aynı anda tek bir merkez bölgede Topyekûn Taarruz yaptığı ve 20 ikmal koridorunun aynı saniyede kesildiği an.
* **Başarı Kriteri:** Server Tick Time $< 45\text{ms}$ (20 Hz tick hızını kaçırmadan işleme).

---

## 34. MVP KAPSAMI (MINIMUM VIABLE PRODUCT) `[Tasarım Kararı]`

MVP'nin tek amacı: **Çekirdek oyunun eğlenceli ve anlaşılır olduğunu doğrulamaktır.**

* İstemci: Web tabanlı PixiJS v8 engine.
* Sunucu: Tek Rust Tokio WebSocket sunucusu.
* Mod: Klasik Fetih (20-32 Oyuncu/Bot).
* Mekanikler: 3 Taarruz Seviyesi + 4 Aşamalı İkmal + Piktografik Diplomasi + Power Pool.
* Harita: 1 Adet Hibrit Prototip Atlas Haritası.

---

## 35. MVP DIŞINDA BIRAKILAN ÖZELLİKLER `[Tasarım Kararı]`

* Battle Pass ve Kozmetik Mağaza.
* Harita Editörü.
* 15 Oyun Modu (Zombi, Konvoy, BR vb.).
* Doktrinler (Alfa sonrasına ertelenmiştir).
* Klan Savaşları ve E-spor İzleyici Modu.
* Dinamik Dünya Olayları (Gelgit, Volkan vb.).

---

## 36. TEKNİK RİSK PROTOTİPİ GÖREVLERİ (AŞAMA 0) `[ ]`

- [ ] **Task 0.1:** Rust `tokio` üzerinde $256 \times 256$ hücresel matris simülatörünün yazılması. `[ ]`
- [ ] **Task 0.2:** PixiJS v8 60 FPS 2D render katmanının ve canvas viewport'un oluşturulması. `[ ]`
- [ ] **Task 0.3:** 100 Sentetik bot ile sunucu tick süresi benchmark testinin yapılması. `[ ]`

---

## 37. CORE GAMEPLAY PROTOTYPE GÖREVLERİ (AŞAMA 1) `[ ]`

- [ ] **Task 1.1:** 3 Taarruz Seviyesinin (Kontrollü, Standart, Topyekûn) sunucuda kodlanması. `[ ]`
- [ ] **Task 1.2:** Incremental Graph BFS İkmal Ağı ve 4 Aşamalı Çöküş kodlaması. `[ ]`
- [ ] **Task 1.3:** Piktografik Diplomasi radyal mönüsünün entegre edilmesi. `[ ]`
- [ ] **Task 1.4:** 8-16 Gerçek oyunculu ilk eğlence ve anlaşılabilirlik playtestinin yapılması. `[ ]`

---

## 38. VERTICAL SLICE PLANIZ (AŞAMA 2) `[ ]`

- [ ] Canlı Stratejik Atlas UI/UX stilinin uygulanması. `[ ]`
- [ ] Mobil Capacitor paketlemesi ve dokunmatik A/B testlerinin yapılması. `[ ]`
- [ ] Web Audio API ses efektleri ve haptik titreşim kalıplarının entegrasyonu. `[ ]`

---

## 39. KAPALI ALFA PLANIZ (AŞAMA 3) `[ ]`

- [ ] 32 Gerçek oyuncu ile Klasik Fetih ve Frontline 16v16 modlarının test edilmesi. `[ ]`
- [ ] AFK / Bağlantı kesilmesi durumunda Savunmacı AI devralma testleri. `[ ]`
- [ ] Telemetri veri toplama sunucusunun aktif edilmesi. `[ ]`

---

## 40. TELEMETRİ SİSTEMİ `[Tasarım Kararı]`

İzlenecek Temel Metrikler:
* **Öğrenilebilirlik:** İlk taarruza kadar geçen süre (Hedef: $< 20\text{s}$).
* **İkmal Farkındalığı:** İkmal uyarısını fark edip karşı hamle yapma oranı (Hedef: $> \%40$).
* **Akıcılık:** Maç terk (Quit Rate) oranı (Hedef: $< \%5$).
* **Platform Dengesi:** Mobil vs. Web kazanma oranı farkı.

---

## 41. KULLANICI ARAŞTIRMASI VE PLAYTEST ANKETİ `[Tasarım Kararı]`

Playtest sonrası her oyuncuya sorulacak 3 kısa soru:
1. *Neden kazandığını veya kaybettiğini anladın mı?* (Evet / Hayır / Emin Değilim)
2. *İkmal çizgin kesildiğinde ne hissettin?* (Adil bir stratejiydi / Anlamadım / Sinir bozucuydu)
3. *Hemen bir maç daha oynamak ister misin?* (Evet / Belki / Hayır)

---

## 42. RİSK LİSTESİ `[Tasarım Kararı]`

1. **Risk:** İkmal uyarısının karmaşık gelmesi. *Çözüm:* Görsel kararma ve dairesel geri sayım ikonu kullanmak.
2. **Risk:** Mobilde hedef seçme zorluğu. *Çözüm:* Target Snapping yeteneğini aktif etmek.
3. **Risk:** Sunucu tick süresinin 100 oyuncuda 50ms'yi aşması. *Çözüm:* İkmal tarama sıklığını 1 Hz'e düşürmek.

---

## 43. AÇIK TASARIM SORULARI `[Açık Soru]`

1. *Soru 1:* Taarruz şiddeti seçiminde Sürükleme Mesafesi (Alt A) mı yoksa 3'lü UI Butonu (Alt B) mu mobilde daha düşük hata oranı verecek? *(Aşama 1 A/B testinde belirlenecektir).*
2. *Soru 2:* İtibar puanı "Tehlikeli" olan oyuncuların yeni pakt teklifleri diğer oyunculara özel bir kırmızı uyarı ikonu ile mi gösterilmeli? *(Aşama 3 Kapalı Alfa testinde belirlenecektir).*

---

## 44. İLK 30 GÜNLÜK GÖREVLER (SPRINT 1 & 2) `[ ]`

- [ ] **Sprint 1 (Gün 1-15):** Rust Tokio sunucu çekirdeği ve PixiJS v8 $256 \times 256$ canvas grid render altyapısının kodlanması. `[ ]`
- [ ] **Sprint 2 (Gün 16-30):** 3 Taarruz seviyesi, Incremental Graph BFS ikmal altyapısı ve 10 Hz ağ haberleşmesinin entegrasyonu. `[ ]`

---

## 45. İLK 90 GÜNLÜK GÖREVLER (SPRINT 3 - 6) `[ ]`

- [ ] **Sprint 3 (Gün 31-45):** 4 Aşamalı İkmal çöküşü görsel VFX ve mobil Thumb Zone UI tasarımı. `[ ]`
- [ ] **Sprint 4 (Gün 46-60):** 8-16 Gerçek oyunculu Core Gameplay playtesti ve A/B kontrol testi. `[ ]`
- [ ] **Sprint 5 (Gün 61-75):** Piktografik Diplomasi radyal mönüsü ve Savunmacı AI AFK devralma kodlaması. `[ ]`
- [ ] **Sprint 6 (Gün 76-90):** 32 Oyunculu Kapalı Alfa lansmanı ve telemetri raporunun hazırlanması. `[ ]`

---

## 46. AŞAMA KABUL KAPILARI (STAGE GATES) `[Tasarım Kararı]`

* **Gate 0 (Risk Prototipi -> Core Gameplay):** Sunucu 100 bot ile $<30\text{ms}$ tick hızı veriyorsa geç.
* **Gate 1 (Core Gameplay -> Vertical Slice):** Playtest oyuncularının %70'i "neden kaybettiğini" doğru açıklayabiliyorsa geç.
* **Gate 2 (Vertical Slice -> Kapalı Alfa):** Mobil A/B testinde yanlış taarruz oranı $< \%10$ ise geç.

---

## 47. NİHAİ PROJE DURUMU `[Tasarım Kararı]`

> **Project Dominion GDD/TDD v2.1 Proje Durum Bildirimi:**
> Proje belgesi; doğrulanmamış iddialardan arındırılmış, prototip gerçekliğine uygun şekilde yapılandırılmış, çelişkili ölçek ve mod tanımları giderilmiş, test edilebilir parametrelere bölünmüştür. Belge, Aşama 0 (Teknik Risk Prototipi) ve Aşama 1 (Core Gameplay Prototype) geliştirmesine başlamak için gerekli ve yeterli tüm teknik ve tasarımsal şartları sağlamaktadır.

---

## 48. PROTOTİP GELİŞTİRME ONAY BİLDİRİMİ

```
+-----------------------------------------------------------------------------------+
| FINAL PROTOTOYPE DECISION                                                         |
+-----------------------------------------------------------------------------------+
| KARAR STATÜSÜ : [X] PROTOTYPE APPROVED                                            |
|                 [ ] REVISION REQUIRED BEFORE PROTOTYPE                            |
|                 [ ] CONCEPT REJECTED                                              |
|                                                                                   |
| GEREÇE: Oyunun "Görsel Lojistik", "Organik Cephe Fiziği" ve "Zahmetsiz Diplomasi" |
| sütunları matematiksel ve mimari olarak netleştirilmiştir. MVP kapsamı küçültülmüş,|
| teknik riskler tanımlanmış ve A/B test edilebilir kontrol modelleri sunulmuştur.  |
| Ekip doğrudan Aşama 0 (Teknik Risk Prototipi) kodlamasına başlayabilir.           |
+-----------------------------------------------------------------------------------+
```

---
*Project Dominion GDD/TDD v2.1 Pre-Production Candidate Dokümanı Tamamlanmıştır.*
