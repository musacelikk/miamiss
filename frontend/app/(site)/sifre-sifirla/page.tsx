import { redirect } from "next/navigation"

/** Eski bag lantili akisin adresi — yeni kodlu akisa yonlendirir. */
export default function LegacyResetRedirect() {
  redirect("/sifremi-unuttum")
}
