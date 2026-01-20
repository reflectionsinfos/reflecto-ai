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
import { useAuth } from "@/hooks/use-auth"
import { useEffect } from "react"

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
  // Integrate Azure Auth Hook
  const { login: azureLogin, isAuthenticated, user: azureUser, isLoading: isAuthLoading, error: authError } = useAuth()

  useEffect(() => {
    // If authenticated via Azure, redirect
    if (isAuthenticated && azureUser) {
       toast({
        title: "Welcome back!",
        description: `Signed in as ${azureUser.name}`,
        duration: 3000,
      })
      router.push("/dashboard")
    }
    if (authError) {
        toast({
            title: "Authentication Error",
            description: authError.message,
            variant: "destructive"
        })
    }
  }, [isAuthenticated, azureUser, router, authError, toast])

  const handleAzureLogin = async () => {
    await azureLogin()
  }

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
            {/* Azure AD Login Section */}
            <div className="space-y-4">
              <Button
                type="button"
                onClick={handleAzureLogin}
                className="w-full h-11 bg-[#2F2F2F] hover:bg-[#3F3F3F] text-white font-semibold shadow-md flex items-center justify-center gap-2 border border-gray-600"
                disabled={isAuthLoading}
              >
                {/* Microsoft Logo SVG */}
                <svg className="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                {isAuthLoading ? "Connecting..." : "Sign in with Microsoft"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with demo</span>
                </div>
              </div>

              {/* Legacy/Demo Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                 {/* ... Keep existing form fields for dev fallback ... */}
                 <div>
                    <Label htmlFor="email" className="text-sm font-semibold text-foreground mb-2 block">Email</Label>
                    <Input 
                        id="email" 
                        type="email" 
                        value={formData.email} 
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="h-11 bg-input border-border"
                        placeholder="demo@example.com"
                    />
                 </div>
                 <div>
                    <Label htmlFor="password" className="text-sm font-semibold text-foreground mb-2 block">Password</Label>
                    <Input 
                        id="password" 
                        type="password" 
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className="h-11 bg-input border-border"
                        placeholder="password123"
                    />
                 </div>
                 <Button type="submit" disabled={isLoading} className="w-full h-11 bg-primary">
                    {isLoading ? "Signing In..." : "Sign In (Demo)"}
                 </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">SSO integration coming soon</p>
      </div>
    </div>
  )
}
