"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const DUMMY_USERS = [
  {
    email: "admin@kudoscard.com",
    password: "password123",
    name: "Admin User",
    role: "admin" as const,
  },
  {
    email: "john@kudoscard.com",
    password: "password123",
    name: "John Smith",
    role: "user" as const,
  },
  {
    email: "sarah@kudoscard.com",
    password: "password123",
    name: "Sarah Johnson",
    role: "user" as const,
  },
]

export default function LoginPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const user = DUMMY_USERS.find((u) => u.email === formData.email && u.password === formData.password)

    if (user) {
      const userInfo = {
        name: user.name,
        email: user.email,
        role: user.role, // Added role to user info
      }

      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("userEmail", formData.email)
      localStorage.setItem("userInfo", JSON.stringify(userInfo))

      toast({
        title: "Login Successful!",
        description: `Welcome ${user.role === "admin" ? "Admin" : ""} to Kudos Card platform`,
        duration: 3000,
      })

      router.push("/dashboard")
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Award className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Kudos Card</h1>
          <p className="text-muted-foreground">Employee Recognition Platform</p>
        </div>

        <Card className="shadow-xl border-border">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold text-foreground">Sign In</CardTitle>
            <p className="text-sm text-muted-foreground">Access your recognition dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-semibold text-foreground mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`h-11 bg-input border-border ${errors.email ? "border-destructive" : "focus:ring-primary focus:border-primary"}`}
                  disabled={isLoading}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-foreground mb-2 block">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={`h-11 bg-input border-border pr-10 ${errors.password ? "border-destructive" : "focus:ring-primary focus:border-primary"}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Quick Login - Demo Accounts:</p>
              <div className="space-y-2">
                {DUMMY_USERS.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => {
                      setFormData({ email: user.email, password: user.password })
                      setErrors({})
                    }}
                    className="w-full p-2 text-left bg-background hover:bg-muted/80 border border-border rounded-md transition-colors group"
                    disabled={isLoading}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {user.role === "admin" ? "Admin" : "User"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">SSO integration coming soon</p>
      </div>
    </div>
  )
}
