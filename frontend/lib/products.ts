export type Product = {
  id: string
  slug: string
  name: string
  description: string
  shortDescription?: string
  price: number
  currency: string
  image: string
  category: string
  tags?: string[]
}

export const products: Product[] = [
  {
    id: "rattan-depolama-sepeti",
    slug: "rattan-depolama-sepeti",
    name: "Rattan Depolama Sepeti",
    description:
      "El dokuması rattan yapısıyla hem işlevsel hem dekoratif. Salon, banyo veya giriş köşelerinizde battaniye, oyuncak ya da aksesuar depolamak için ideal. Doğal tonu her tarz dekorla uyum sağlar.",
    shortDescription: "El dokuması rattan, doğal ton. Her mekâna uyumlu depolama çözümü.",
    price: 895,
    currency: "TRY",
    image: "/images/urun-1.jpg",
    category: "Depolama & Organizasyon",
    tags: ["Rattan", "Doğal materyal", "El yapımı"],
  },
  {
    id: "dogal-ahsap-sehpa",
    slug: "dogal-ahsap-sehpa",
    name: "Doğal Ahşap Yan Sehpa",
    description:
      "Masif ahşabın sıcaklığı ve yumuşak formuyla oturma alanlarına organik bir detay katar. Koltuk yanına, yatak başına ya da köşe dekoru olarak kullanılabilir. Minimalin ötesinde, zamansız bir parça.",
    shortDescription: "Masif ahşap, organik form. Oturma ve yatak odaları için zamansız detay.",
    price: 1290,
    currency: "TRY",
    image: "/images/urun-2.png",
    category: "Mobilya & Sehpalar",
    tags: ["Ahşap", "Doğal", "Organik form"],
  },
  {
    id: "dekoratif-vazo-krem",
    slug: "dekoratif-vazo-krem",
    name: "Seramik Vazo - Krem & Sage",
    description:
      "Matt krem yüzeyi ve narin sage yeşil damarlarıyla hazırlanmış bu seramik vazo; sehpa, konsol veya raf köşelerine zarif bir imza atar. Kuru çiçek veya pampas otu ile tamamlandığında mekânda güçlü bir odak noktası oluşturur.",
    shortDescription: "Matt seramik, krem & sage rengi. Sehpa ve konsol köşeleri için şık detay.",
    price: 749,
    currency: "TRY",
    image: "/images/urun-3.png",
    category: "Vazolar & Saksılar",
    tags: ["Seramik", "Krem", "Sage yeşil"],
  },
]

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug)
}
