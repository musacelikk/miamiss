import { LegalPage } from "@/components/site/legal-page"

export const metadata = { title: "KVKK Aydınlatma Metni" }

export default function KvkkPage() {
  return (
    <LegalPage eyebrow="Yasal" title="KVKK Aydınlatma Metni">
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, Mia
        Miss ("Şirket") olarak veri sorumlusu sıfatıyla kişisel verilerinizi
        aşağıda açıklanan kapsamda işlemekteyiz.
      </p>
      <h2>İşlenen Kişisel Veriler</h2>
      <p>
        Üyelik ve sipariş süreçlerinde ad-soyad, e-posta, telefon, teslimat
        adresi ve sipariş bilgileriniz; site kullanımı sırasında çerezler
        aracılığıyla elde edilen kullanım verileri işlenmektedir.
      </p>
      <h2>İşleme Amaçları</h2>
      <p>
        Verileriniz; siparişlerin oluşturulması ve teslimi, üyelik işlemlerinin
        yürütülmesi, müşteri hizmetleri desteği sağlanması, yasal
        yükümlülüklerin yerine getirilmesi ve açık rızanız bulunması hâlinde
        kampanya bilgilendirmeleri amacıyla işlenir.
      </p>
      <h2>Aktarım</h2>
      <p>
        Kişisel verileriniz; kargo firmaları, ödeme kuruluşları ve yasal olarak
        yetkili kamu kurumları ile yalnızca hizmetin gerektirdiği ölçüde
        paylaşılır. Verileriniz yurt dışına aktarılmaz.
      </p>
      <h2>Haklarınız</h2>
      <p>
        KVKK'nın 11. maddesi kapsamında; verilerinize erişme, düzeltilmesini
        veya silinmesini talep etme, işlemeye itiraz etme haklarına sahipsiniz.
        Taleplerinizi iletişim sayfamızdaki e-posta adresi üzerinden
        iletebilirsiniz.
      </p>
    </LegalPage>
  )
}
