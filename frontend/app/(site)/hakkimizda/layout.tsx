import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Hakkımızda & İletişim",
  description:
    "Miamisu Home'un hikâyesi: Anadolu'nun doğal taş ocaklarından seçilen traverten ve mermeri usta ellerle evinize taşıyoruz. Bize ulaşın.",
  alternates: { canonical: "/hakkimizda" },
}

export default function HakkimizdaLayout({ children }: { children: React.ReactNode }) {
  return children
}
