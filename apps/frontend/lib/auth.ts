export type UserRole = "admin" | "user"

export interface User {
  name: string
  email: string
  role: UserRole
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null

  const userInfo = localStorage.getItem("userInfo")
  if (!userInfo) return null

  try {
    return JSON.parse(userInfo) as User
  } catch {
    return null
  }
}

export function isAdmin(): boolean {
  const user = getCurrentUser()
  return user?.role === "admin"
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem("isAuthenticated") === "true"
}

export function logout(): void {
  localStorage.removeItem("isAuthenticated")
  localStorage.removeItem("userEmail")
  localStorage.removeItem("userInfo")
}
