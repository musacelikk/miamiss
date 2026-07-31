import { LegalPage } from "@/components/site/legal-page"

export const metadata = { title: "Mesafeli Satış Sözleşmesi" }

export default function DistanceSalesPage() {
  return (
    <LegalPage eyebrow="Yasal" title="Mesafeli Satış Sözleşmesi">
      <h2>1. Taraflar</h2>
      <p>
        İşbu sözleşme, Miamisu Home ("Satıcı") ile sipariş veren müşteri ("Alıcı")
        arasında, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli
        Sözleşmeler Yönetmeliği hükümleri uyarınca elektronik ortamda
        kurulmuştur.
      </p>
      <h2>2. Konu</h2>
      <p>
        Sözleşmenin konusu, Alıcı'nın internet sitesi üzerinden elektronik
        ortamda siparişini verdiği ürünlerin satışı ve teslimi ile ilgili
        tarafların hak ve yükümlülüklerinin belirlenmesidir.
      </p>
      <h2>3. Teslimat</h2>
      <p>
        Ürünler, ödemenin onaylanmasını takiben 1-3 iş günü içinde kargoya
        verilir. Teslimat süresi kargo firmasına ve teslimat adresine göre
        değişiklik gösterebilir. Doğal taş ürünler darbeye dayanıklı özel
        paketleme ile gönderilir.
      </p>
      <h2>4. Cayma Hakkı</h2>
      <p>
        Alıcı, ürünü teslim aldığı tarihten itibaren 14 gün içinde herhangi bir
        gerekçe göstermeksizin cayma hakkını kullanabilir. Cayma hakkının
        kullanılması için ürünün kullanılmamış ve orijinal ambalajında olması
        gerekmektedir. Kişiye özel üretilen ürünlerde cayma hakkı bulunmaz.
      </p>
      <h2>5. Ödeme</h2>
      <p>
        Ödemeler Havale/EFT veya kapıda ödeme yöntemiyle yapılabilir.
        Havale/EFT ödemelerinde sipariş, ödemenin Satıcı hesabına geçmesiyle
        onaylanır. Ödemesi 3 iş günü içinde yapılmayan siparişler iptal edilir.
      </p>
      <h2>6. Uyuşmazlık</h2>
      <p>
        İşbu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığı'nca ilan
        edilen değere kadar Tüketici Hakem Heyetleri, bu değeri aşan
        uyuşmazlıklarda Tüketici Mahkemeleri yetkilidir.
      </p>
    </LegalPage>
  )
}
