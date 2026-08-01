import { LegalPage } from "@/components/site/legal-page"

export const metadata = { title: "Üyelik Sözleşmesi" }

/*
 * Taslak metin — kesinlesmis sozlesme metni hazir olunca bu sayfadaki
 * icerik guncellenecek.
 */
export default function MembershipAgreementPage() {
  return (
    <LegalPage eyebrow="Yasal" title="Üyelik Sözleşmesi">
      <h2>1. Taraflar ve Konu</h2>
      <p>
        İşbu sözleşme, miamisuhome.com internet sitesine üye olan kullanıcı
        ("Üye") ile Miamisu Home ("Şirket") arasında, üyelik ve sitenin
        kullanımına ilişkin koşulların belirlenmesi amacıyla kurulmuştur. Üyelik
        formunun doldurulup onaylanmasıyla yürürlüğe girer.
      </p>
      <h2>2. Üyelik</h2>
      <p>
        Üyelik ücretsizdir. Üye, kayıt sırasında verdiği bilgilerin doğru
        olduğunu, hesap bilgilerini üçüncü kişilerle paylaşmayacağını ve hesabı
        üzerinden gerçekleştirilen işlemlerden sorumlu olduğunu kabul eder.
      </p>
      <h2>3. Kişisel Veriler</h2>
      <p>
        Üyeye ait kişisel veriler, KVKK Aydınlatma Metni'nde açıklanan kapsam ve
        amaçlarla işlenir. Üye, dilediği zaman hesabındaki iletişim
        tercihlerini değiştirebilir ve verilerine ilişkin haklarını
        kullanabilir.
      </p>
      <h2>4. Kullanım Koşulları</h2>
      <p>
        Üye; siteyi hukuka aykırı amaçlarla kullanamaz, sitenin işleyişine
        müdahale edemez, üçüncü kişilerin haklarını ihlal eden içerik (yorum,
        mesaj vb.) paylaşamaz. Şirket, bu koşullara aykırılık hâlinde üyeliği
        askıya alma veya sonlandırma hakkını saklı tutar.
      </p>
      <h2>5. Sözleşmenin Sona Ermesi</h2>
      <p>
        Üye, dilediği zaman destek kanalları üzerinden üyeliğinin
        sonlandırılmasını talep edebilir. Şirket, gerekli görmesi hâlinde
        üyeliği önceden bildirmek suretiyle sonlandırabilir.
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
