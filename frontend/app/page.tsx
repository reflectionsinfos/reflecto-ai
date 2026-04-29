"use client"

import type React from "react"


import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Award } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useEffect } from "react"



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


            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  )
}
