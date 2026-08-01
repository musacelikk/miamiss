import { LegalPage } from "@/components/site/legal-page"

export const metadata = { title: "Ön Bilgilendirme Formu" }

/*
 * Taslak metin — kesinlesmis sozlesme metni hazir olunca bu sayfadaki
 * icerik guncellenecek. Yapi ve baglantilar ayni kalabilir.
 */
export default function PreInformationPage() {
  return (
    <LegalPage eyebrow="Yasal" title="Ön Bilgilendirme Formu">
      <p>
        İşbu Ön Bilgilendirme Formu, 6502 sayılı Tüketicinin Korunması Hakkında
        Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, sipariş öncesinde
        tüketicinin bilgilendirilmesi amacıyla hazırlanmıştır.
      </p>
      <h2>1. Satıcı Bilgileri</h2>
      <p>
        Unvan: Miamisu Home
        <br />
        İnternet adresi: miamisuhome.com
        <br />
        İletişim: İletişim sayfamızda yer alan e-posta ve telefon kanalları
        üzerinden bize ulaşabilirsiniz.
      </p>
      <h2>2. Ürün ve Bedel Bilgisi</h2>
      <p>
        Sözleşme konusu ürünlerin temel nitelikleri, adedi, vergiler dahil satış
        bedeli, kargo ücreti ve varsa indirimler ödeme sayfasındaki sipariş
        özetinde gösterilir. Sipariş onayıyla birlikte bu bilgiler e-posta ile
        de iletilir.
      </p>
      <h2>3. Ödeme ve Teslimat</h2>
      <p>
        Ödeme, Havale/EFT veya kapıda ödeme yöntemiyle yapılabilir. Ürünler,
        ödemenin onaylanmasını takiben 1-3 iş günü içinde kargoya verilir.
        Teslimat, sipariş sırasında bildirilen adrese yapılır.
      </p>
      <h2>4. Cayma Hakkı</h2>
      <p>
        Tüketici, ürünü teslim aldığı tarihten itibaren 14 gün içinde herhangi
        bir gerekçe göstermeksizin cayma hakkına sahiptir. Cayma hakkının
        kullanımı ve iade süreci hakkında ayrıntılı bilgi İade &amp; Değişim
        sayfamızda yer alır.
      </p>
      <h2>5. Şikâyet ve İtiraz</h2>
      <p>
        Siparişe ilişkin şikâyetlerinizi destek sayfamız üzerinden
        iletebilirsiniz. Ayrıca Ticaret Bakanlığı'nca belirlenen parasal
        sınırlar dahilinde Tüketici Hakem Heyetlerine ve Tüketici Mahkemelerine
        başvuru hakkınız saklıdır.
      </p>
      <p>
        <em>
          Bu metin taslak niteliğindedir; nihai sözleşme metni yayınlandığında
          güncellenecektir.
        </em>
      </p>
    </LegalPage>
  )
}
