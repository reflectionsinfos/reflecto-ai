"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Download, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { generateKudosCard } from "@/lib/image-generator"

interface CardData {
  recipientName: string
  message: string
  creatorName: string
  template: {
    id: string
    name: string
    icon: any
    color: string
    description: string
  }
  employeeImage?: string
  createdAt: number
  expiresAt: number
}

export default function SecureDownloadPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const encodedData = searchParams.get("data")
      if (!encodedData) {
        setError("Invalid download link")
        return
      }

      const decodedData = JSON.parse(Buffer.from(encodedData, "base64").toString())

      // Check if link is expired
      if (Date.now() > decodedData.expiresAt) {
        setIsExpired(true)
        return
      }

      setCardData(decodedData)
    } catch (err) {
      console.error("[v0] Error decoding card data:", err)
      setError("Invalid or corrupted download link")
    }
  }, [searchParams])

  const handleDownload = async () => {
    if (!cardData) return

    setIsDownloading(true)
    try {
      await generateKudosCard(cardData)
    } catch (error) {
      console.error("[v0] Download error:", error)
      setError("Failed to download card. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Link</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => (window.location.href = "/")} className="bg-primary hover:bg-primary/90">
            Go to Homepage
          </Button>
        </div>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Link Expired</h1>
          <p className="text-muted-foreground mb-6">
            This download link has expired for security purposes. Please request a new card from your team
            administrator.
          </p>
          <Button onClick={() => (window.location.href = "/")} className="bg-primary hover:bg-primary/90">
            Go to Homepage
          </Button>
        </div>
      </div>
    )
  }

  if (!cardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">Your Recognition Card</h1>
          <p className="text-muted-foreground">Secure download page</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-2">🎉 Your Card is Ready!</h2>
          <p className="text-muted-foreground text-lg">
            Congratulations <span className="font-semibold text-foreground">{cardData.recipientName}</span>! Your
            recognition card from <span className="font-semibold text-foreground">{cardData.creatorName}</span> is ready
            to download.
          </p>
        </div>

        {/* Card Preview */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2">{cardData.template.name}</h3>
              <p className="text-muted-foreground">{cardData.message}</p>
            </div>

            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3"
            >
              <Download className="w-5 h-5 mr-2" />
              {isDownloading ? "Downloading..." : "Download Your Card"}
            </Button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            🔒 This is a secure, time-limited link that expires in 24 hours for your security.
          </p>
        </div>
      </main>
    </div>
  )
}
