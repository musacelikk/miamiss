import { LegalPage } from "@/components/site/legal-page"

export const metadata = { title: "İade & Değişim" }

export default function ReturnsPage() {
  return (
    <LegalPage eyebrow="Yardım" title="İade & Değişim">
      <h2>İade Koşulları</h2>
      <p>
        Ürünlerinizi teslim aldıktan sonra <strong>14 gün</strong> içinde iade
        edebilirsiniz. İade edilecek ürünün kullanılmamış, hasarsız ve orijinal
        ambalajında olması gerekir.
      </p>
      <h2>İade Süreci</h2>
      <p>
        1. İletişim sayfamızdan veya e-posta ile sipariş numaranızla birlikte
        iade talebinizi iletin.
        <br />
        2. Size ileteceğimiz kargo koduyla ürünü ücretsiz gönderin.
        <br />
        3. Ürün tarafımıza ulaşıp kontrol edildikten sonra 14 gün içinde ücret
        iadeniz yapılır.
      </p>
      <h2>Hasarlı Ürün</h2>
      <p>
        Doğal taş ürünlerimiz özel korumalı paketlerle gönderilir. Buna rağmen
        kargo sırasında hasar oluşursa, teslimat sırasında tutanak tutturup 48
        saat içinde bize ulaşın — ücretsiz olarak yenisini gönderelim.
      </p>
      <h2>Değişim</h2>
      <p>
        Doğal taş ürünlerde her parçanın deseni kendine özgüdür; görseldeki
        ürünle birebir aynı desen garanti edilmez. Bu doğal farklılıklar
        değişim sebebi sayılmaz, ancak dilerseniz 14 gün içinde koşulsuz iade
        hakkınızı kullanabilirsiniz.
      </p>
      <h2>Hediye Kartları</h2>
      <p>
        Hediye kartları iade edilemez ve nakde çevrilemez; satın alma tarihinden
        itibaren 1 yıl geçerlidir.
      </p>
    </LegalPage>
  )
}
