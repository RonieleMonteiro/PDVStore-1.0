import { redirect } from "next/navigation"
import { cookies } from "next/headers"

/**
 * Página inicial — redireciona para /login se não autenticado,
 * ou para /pdv se já houver token válido.
 */
export default function HomePage() {
  const cookieStore = cookies()
  const token = cookieStore.get("access_token")?.value

  if (!token) {
    redirect("/login")
  }

  redirect("/pdv")
}
