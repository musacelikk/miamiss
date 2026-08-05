import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Hediye Kartı",
  description:
    "Sevdiklerinize Miamisu Home hediye kartı gönderin. 100 TL'den 10.000 TL'ye kadar istediğiniz tutarda, kişisel notunuzla birlikte e-posta ile ulaştırılır.",
  alternates: { canonical: "/hediye-karti" },
}

export default function HediyeKartiLayout({ children }: { children: React.ReactNode }) {
  return children
}
