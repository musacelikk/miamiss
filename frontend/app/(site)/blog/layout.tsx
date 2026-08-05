import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Blog & Haberler",
  description:
    "Doğal taş bakımı, dekorasyon fikirleri ve Miamisu Home'dan haberler. Traverten ve mermer ürünlerinizden en iyi şekilde yararlanmanız için rehberler.",
  alternates: { canonical: "/blog" },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
