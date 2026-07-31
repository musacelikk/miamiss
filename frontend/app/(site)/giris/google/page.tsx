"use client"

import { Suspense, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/providers"

function GoogleCallback() {
  const params = useSearchParams()
  const router = useRouter()
  const { loginWithToken } = useAuth()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true
    const token = params.get("token")
    if (!token) {
      router.replace("/giris")
      return
    }
    loginWithToken(token)
      .then((user) => {
        toast.success(`Hoş geldiniz, ${user.name.split(" ")[0]}!`)
        router.replace(user.role === "ADMIN" ? "/admin" : "/hesabim")
      })
      .catch(() => {
        toast.error("Google ile giriş başarısız oldu")
        router.replace("/giris")
      })
  }, [params, router, loginWithToken])

  return (
    <div className="flex flex-col items-center justify-center py-40">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="mt-4 text-sm text-muted-foreground">Google ile giriş yapılıyor...</p>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <GoogleCallback />
    </Suspense>
  )
}
