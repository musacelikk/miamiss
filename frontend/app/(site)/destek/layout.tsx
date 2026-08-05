import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Destek & Sıkça Sorulan Sorular",
  description:
    "Siparişleriniz, kargo, iade ve ürünlerimizle ilgili tüm sorularınız için destek merkezi. Talep oluşturun, en kısa sürede yanıtlayalım.",
  alternates: { canonical: "/destek" },
}

export default function DestekLayout({ children }: { children: React.ReactNode }) {
  return children
}
