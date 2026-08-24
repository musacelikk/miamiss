# PayTR (Direct API, 3D Secure) + Geliver Kargo Entegrasyonu — Tasarım

Tarih: 2026-08-24
Durum: Onaylandı (kullanıcı tasarım kararlarını geliştiriciye bıraktı)

## Amaç

Miamisu Home e-ticaret sitesine:

1. **PayTR Direct API** ile kredi kartı ödemesi (her zaman 3D Secure) — Trendyol
   tarzı akış: müşteri kartını checkout'ta girer, öder, sipariş onaylanır.
   Havale/EFT ve kapıda ödeme mevcut haliyle korunur.
2. **Geliver** kargo entegrasyonu — ödeme onaylanınca gönderi otomatik oluşur,
   admin panelden de yönetilir (teklif seçme, oluşturma, iptal, etiket).
   Teslimat durumu webhook ile siparişe yansır.

Anahtarlar `.env` üzerinden verilir (repo'ya girmez, `backend/.gitignore`
zaten `.env`'i dışlıyor). Anahtar yokken site bugünkü gibi çalışır: kart
seçeneği görünmez, Geliver panelinde "yapılandırılmamış" uyarısı çıkar.

## Mevcut Durum (özet)

- Backend: NestJS + TypeORM + PostgreSQL. `orders` modülü sipariş oluşturma,
  durum/ödeme durumu yönetimi, iptal ve stok mantığını içeriyor.
- `PaymentMethod.CARD` şu an `orders.service.ts` içinde bloklanmış
  ("çok yakında"). `setPaymentStatus(PAID)` siparişi CONFIRMED yapıyor,
  hediye kartlarını aktive edip mail atıyor — bu mantık aynen yeniden
  kullanılacak.
- Kargo: admin `trackingNo`/`cargoCompany`'yi elle giriyor
  (`admin-orders.controller.ts`); SHIPPED'e geçince kargo maili gidiyor.
- Frontend: Next.js. Checkout `app/(site)/odeme/page.tsx` (havale + COD
  radyo seçenekleri), admin sipariş yönetimi `app/admin/siparisler/page.tsx`,
  mağaza ayarları `app/admin/ayarlar/page.tsx`.

## Bölüm 1 — PayTR Direct API (3D Secure)

### Yeni modül: `backend/src/payments/`

- **`paytr.service.ts`** — PayTR ile tüm iletişim:
  - `paytr_token` üretimi: HMAC-SHA256(base64) —
    `merchant_id + user_ip + merchant_oid + email + payment_amount +
    payment_type + installment_count + currency + test_mode + non_3d`
    + `merchant_salt`, anahtar `merchant_key`.
  - Direct API çağrısı: `https://secure.paytr.com/odeme` adresine form-POST
    (kart sahibi, kart no, SKT ay/yıl, CVV + token ve sipariş alanları).
    Dönen 3D HTML'i çağırana verir.
  - Callback hash doğrulama:
    `merchant_oid + merchant_salt + status + total_amount` HMAC-SHA256.
  - Yapılandırma: `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`,
    `PAYTR_MERCHANT_SALT`, `PAYTR_TEST_MODE` (0/1). Üçü de doluysa
    `enabled=true`.
- **`payments.controller.ts`**:
  - `GET /payments/config` (public) → `{ cardEnabled: boolean }`.
  - `POST /payments/paytr/start` (public, throttle'lı) — girdi:
    `{ orderId, cardHolder, cardNumber, expiryMonth, expiryYear, cvv }`.
    Sipariş bulunur (PENDING + CARD + ödenmemiş olmalı), tutar **DB'deki
    `grandTotal`'dan** alınır (istemciden asla tutar alınmaz), PayTR'ye
    iletilir, dönen 3D HTML `{ html }` olarak döner. Kart verisi loglanmaz,
    saklanmaz; sadece PayTR'ye geçer.
  - `POST /payments/paytr/callback` (public, PayTR sunucularından gelir) —
    hash doğrulanır; `status=success` ise `ordersService.setPaymentStatus
    (order.id, PAID)`, değilse `FAILED` işaretlenir. Her durumda düz metin
    `OK` döner. İdempotent: zaten PAID olan sipariş için tekrar işlem
    yapılmaz, yine `OK` döner.

### Sipariş entity değişiklikleri (migration)

- `paytrMerchantOid: varchar nullable unique` — PayTR `merchant_oid`
  alfanümerik zorunlu olduğundan (orderNo'daki `-` geçersiz) sipariş
  başına üretilir (`MIA` + hex, tiresiz) ve callback eşleştirmesi bunun
  üzerinden yapılır.

### Akış (Trendyol tarzı)

1. Müşteri checkout'ta "Kredi Kartı" seçer, kart formunu doldurur,
   "Ödemeyi Tamamla"ya basar.
2. Frontend önce mevcut `POST /orders` ile siparişi (PENDING, CARD)
   oluşturur, ardından `POST /payments/paytr/start` çağırır.
3. Dönen 3D HTML sayfada render edilir → banka doğrulaması.
4. Başarılı: PayTR `ok_url` → `/siparis-basarili?orderNo=...&email=...`;
   sunucu-sunucu callback siparişi PAID/CONFIRMED yapar (mail + hediye
   kartı aktivasyonu mevcut mantıkla).
5. Başarısız: `fail_url` → `/odeme?payment=failed` (kullanıcıya hata
   mesajı); sipariş PENDING kalır, müşteri tekrar deneyebilir veya
   mevcut akışla iptal edilebilir.

- `ok_url`/`fail_url`/callback URL'leri `PUBLIC_API_URL` ve
  `PUBLIC_SITE_URL` env'lerinden kurulur.
- `orders.service.ts`'teki CARD bloğu kaldırılır; yerine "PayTR
  yapılandırılmamışken CARD reddedilir" kontrolü gelir.
- `user_basket` parametresi sipariş kalemlerinden üretilir (PayTR paneli
  görünümü için).

### Frontend — `app/(site)/odeme/page.tsx`

- `GET /payments/config` ile `cardEnabled` alınır; doluysa üçüncü ödeme
  seçeneği "Kredi Kartı" görünür (mevcut radyo stiliyle).
- Kart formu: kart üzerindeki isim, kart no (boşluklu maskeleme), SKT,
  CVV. Form yalnızca istemci belleğinde tutulur.
- Ödeme başlatılınca dönen 3D HTML tam sayfa render edilir
  (document.write yerine yeni bir sayfa/iframe konteyneri).
- `payment=failed` parametresiyle dönüşte hata bildirimi gösterilir.

## Bölüm 2 — Geliver Kargo

### Yeni modül: `backend/src/shipping/`

- **`geliver.service.ts`** — Geliver REST istemcisi
  (`https://api.geliver.io/api/v1`, `Authorization: Bearer
  GELIVER_API_TOKEN`):
  - Gönderi oluşturma (alıcı = siparişin kargo adresi, gönderici =
    ayarlardaki mağaza adresi, paket = varsayılan desi).
  - Teklif listeleme ve teklif kabulü (taşıyıcı seçimi), etiket
    (barcode/PDF) URL'i alma, gönderi iptali, takip sorgusu.
  - `GELIVER_API_TOKEN` boşsa `enabled=false`; tüm işlemler nazikçe
    "yapılandırılmamış" hatası döner, otomatik akış sessizce atlanır.
- **`shipping.controller.ts`**:
  - Admin (JWT + ADMIN guard, mevcut kalıp):
    - `GET /admin/orders/:id/shipping/offers` — adrese göre teklifler.
    - `POST /admin/orders/:id/shipping` — `{ offerId? }`; teklif verilmezse
      varsayılan/en ucuz. Başarıda `trackingNo`, `cargoCompany`,
      `geliverShipmentId`, `labelUrl` siparişe yazılır ve durum SHIPPED
      yapılır (mevcut kargo maili tetiklenir).
    - `DELETE /admin/orders/:id/shipping` — gönderi iptali; kargo alanları
      temizlenir, durum PREPARING'e döner.
  - `POST /shipping/geliver/webhook` (public) — `GELIVER_WEBHOOK_SECRET`
    ile doğrulanır (header/token karşılaştırma). Durum eşlemesi:
    taşımada → SHIPPED (değilse), teslim edildi → DELIVERED. Ara durumlar
    `statusHistory`'ye işlenir. Eşleşmeyen gönderi sessizce yok sayılır.

### Otomatik gönderi oluşturma

- Tetik: `setPaymentStatus(PAID)` sonrası (kart + havale onayı) ve COD
  siparişi CONFIRMED yapıldığında.
- Asenkron çalışır (`void` + hata yutma/loglama): kargo hatası siparişi
  ve ödemeyi asla etkilemez. Başarısızsa admin panelden elle oluşturulur.
- Otomatik modda taşıyıcı: en ucuz teklif. (İleride ayarlardan tercih
  edilebilir yapılabilir — şimdilik YAGNI.)
- Sipariş zaten gönderiye sahipse (geliverShipmentId dolu) tekrar
  oluşturulmaz.

### Sipariş entity değişiklikleri (migration)

- `geliverShipmentId: varchar nullable`
- `labelUrl: varchar nullable` (kargo etiketi PDF/barcode linki)

### Ayarlar (`StoreSettings`'e ek alanlar)

- `senderName`, `senderPhone`, `senderEmail`, `senderCity`,
  `senderDistrict`, `senderAddress`, `senderZip` — gönderici adresi.
- `defaultDesi: number` — otomatik gönderi paketi için varsayılan desi.
- Admin **Ayarlar** sayfasına "Kargo / Gönderici" bölümü eklenir.
- Checkout'taki müşteri kargo ücreti mevcut sabit sistemde kalır
  (mağaza ücreti + ücretsiz kargo eşiği); Geliver maliyeti operasyonel.

### Frontend — Admin

- `app/admin/siparisler/page.tsx` sipariş detayına "Kargo" paneli:
  - Geliver yapılandırılmışsa: teklif listesi (taşıyıcı + fiyat), "Gönderi
    Oluştur", oluşmuşsa takip no + taşıyıcı + "Etiketi İndir" + "İptal".
  - Yapılandırılmamışsa: bilgi notu + mevcut elle takip no girişi aynen
    çalışır.
- `app/admin/ayarlar/page.tsx`: gönderici adresi + varsayılan desi formu.

## Bölüm 3 — Yapılandırma, Güvenlik, Test

### Env (`backend/.env.example` oluşturulur)

```
# PayTR (Direct API)
PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=
PAYTR_TEST_MODE=1

# Geliver
GELIVER_API_TOKEN=
GELIVER_WEBHOOK_SECRET=

# Genel URL'ler (callback/ok/fail icin)
PUBLIC_API_URL=http://localhost:4000
PUBLIC_SITE_URL=http://localhost:3000
```

- Gerçek `.env` gitignore'da; anahtarları kullanıcı doldurur.
- Kart verisi hiçbir katmanda loglanmaz/saklanmaz; `start` ucunda request
  logging devre dışı bırakılır (gerekirse interceptor'dan hariç tutulur).
- Callback/webhook uçları hash/secret doğrulamadan hiçbir yazma yapmaz.
- Ödeme başlatma ucu throttle'lanır (mevcut `@nestjs/throttler`).

### Test stratejisi (TDD)

- `PaytrService`: token üretimi (PayTR dokümanındaki örnek değerlerle),
  callback hash doğrulama (geçerli/geçersiz), enabled/disabled davranışı.
- `PaymentsController`: callback idempotensi, hatalı hash reddi, yanlış
  durumdaki sipariş için start reddi. HTTP çağrıları mock.
- `GeliverService`: istek gövdesi kurulumu, hata durumunda sipariş
  etkilenmemesi, disabled davranışı. HTTP mock.
- Webhook: durum eşlemesi ve bilinmeyen gönderinin yok sayılması.
- Uçtan uca: PayTR `test_mode=1` + test kartları ile manuel doğrulama
  (canlı anahtarlar geldiğinde).

## Kapsam Dışı (YAGNI)

- Taksit seçenekleri/oran tablosu (tek çekim ile başlanır,
  `installment_count=0`).
- PayTR üzerinden otomatik iade (iade süreci mevcut manuel akışta kalır).
- Checkout'ta canlı kargo fiyatı, ürün bazlı desi/ağırlık.
- Kayıtlı kart / tekrarlayan ödeme.
