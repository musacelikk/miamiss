import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Koleksiyon — Doğal Taş Ev Aksesuarları",
  description:
    "Traverten ve mermerden el işçiliğiyle üretilen mumluk, vazo, tepsi ve dekoratif ürünlerin tamamı. Kategoriye göre filtreleyin, evinize en uygun parçayı bulun.",
  alternates: { canonical: "/urunler" },
}

export default function UrunlerLayout({ children }: { children: React.ReactNode }) {
  return children
}
