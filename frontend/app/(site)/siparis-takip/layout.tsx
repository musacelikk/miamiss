import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sipariş Takibi",
  description:
    "Sipariş numaranız ve e-posta adresinizle Miamisu Home siparişinizin durumunu anında takip edin.",
  alternates: { canonical: "/siparis-takip" },
}

export default function SiparisTakipLayout({ children }: { children: React.ReactNode }) {
  return children
}
