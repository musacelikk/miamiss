import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ProductSection } from "@/components/product-section"
import { ScienceSection } from "@/components/science-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <ProductSection />
      <ScienceSection />
      <TestimonialsSection />
      <Footer />
    </main>
  )
}
