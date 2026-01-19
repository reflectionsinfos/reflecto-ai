"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  Download,
  Award,
  Users,
  Zap,
  TrendingUp,
  Handshake,
  Target,
  AlertTriangle,
  CheckCircle,
  Sparkles,
} from "lucide-react"
import { generateKudosCard, generateKudosCardToCanvas } from "@/lib/image-generator"
import { logToGoogleSheets } from "@/lib/google-sheets"
import { useToast } from "@/hooks/use-toast"
import { getCurrentUser, type User } from "@/lib/auth"
import { cardStorage, type StoredCard } from "@/lib/card-storage"

const templates = [
  {
    id: "customer-centricity",
    name: "Customer Centricity",
    description: "Putting customers at the heart of everything we do",
    color: "bg-blue-500",
    gradient: "from-blue-500 to-blue-600",
    icon: Users,
  },
  {
    id: "agility",
    name: "Agility",
    description: "Adapting quickly to change and new opportunities",
    color: "bg-purple-500",
    gradient: "from-purple-500 to-purple-600",
    icon: Zap,
  },
  {
    id: "continuous-improvement",
    name: "Continuous Improvement",
    description: "Always striving to be better than yesterday",
    color: "bg-emerald-500",
    gradient: "from-emerald-500 to-emerald-600",
    icon: TrendingUp,
  },
  {
    id: "collaboration",
    name: "Collaboration",
    description: "Working together to achieve extraordinary results",
    color: "bg-orange-500",
    gradient: "from-orange-500 to-orange-600",
    icon: Handshake,
  },
  {
    id: "accountability",
    name: "Accountability",
    description: "Taking ownership and delivering on our commitments",
    color: "bg-red-500",
    gradient: "from-red-500 to-red-600",
    icon: Target,
  },
]

const preGeneratedMessages = {
  "customer-centricity": [
    "You put customers first in every choice, turning moments into wins. Your care and empathy make you our Customer Centric Champion!",
    "Every step you take puts customers at heart. Your empathy, clarity and hustle turn needs to smiles-our Customer Centric Champion!",
    "Your customer-first focus shines daily-listening deeply solving swiftly, delivering delight. You're our Customer Centric Champion!",
    "You anticipate needs, remove friction, and deliver joy. Your heart and hustle help customers thrive-our Customer Centric Champion!",
    "With patience, clarity and action, you turn feedback into impact. Customers feel seen and supported-our Customer Centric Champion!",
  ],
  agility: [
    "You pivot with purpose, embrace change with courage, and turn challenges into opportunities. Your agility drives our success forward!",
    "Quick thinking, faster action-you adapt seamlessly to new demands. Your flexibility keeps our team moving at lightning speed!",
    "Change doesn't slow you down, it energizes you! Your ability to shift gears and innovate makes you our Agility Champion!",
    "You dance with uncertainty and make it look easy. Your responsive mindset and swift execution inspire us all to stay nimble!",
    "From roadblocks to breakthroughs, you navigate change with grace. Your agile spirit transforms obstacles into stepping stones!",
  ],
  "continuous-improvement": [
    "You never settle for 'good enough'-always seeking better ways. Your growth mindset elevates everything you touch!",
    "Every day you level up, learn more, and lift others. Your commitment to improvement makes our entire team stronger!",
    "You turn feedback into fuel and mistakes into mastery. Your dedication to growth inspires continuous excellence around you!",
    "Small steps, big impact-you consistently refine and enhance. Your improvement journey creates waves of positive change!",
    "You question the status quo and build better solutions. Your relentless pursuit of excellence drives our collective success!",
  ],
  collaboration: [
    "You bring people together and make magic happen. Your collaborative spirit turns individual talents into team triumphs!",
    "You listen deeply, share generously, and build bridges. Your teamwork creates connections that strengthen our entire organization!",
    "You make everyone around you better through partnership. Your collaborative approach transforms good ideas into great results!",
    "You unite diverse perspectives into powerful solutions. Your ability to foster teamwork creates extraordinary outcomes for all!",
    "You share knowledge, celebrate others, and build trust. Your collaborative leadership makes our team unstoppable together!",
  ],
  accountability: [
    "You own your commitments and deliver with integrity. Your accountability sets the standard for excellence and trust!",
    "You take responsibility, follow through, and make things happen. Your reliable leadership inspires confidence in everyone!",
    "You stand behind your work and support your team. Your accountability creates a culture of trust and high performance!",
    "You deliver on promises and own the outcomes. Your responsible approach builds the foundation for our collective success!",
    "You step up, speak up, and show up consistently. Your accountability drives results and earns respect from all around you!",
  ],
}

export default function DashboardPage() {
  const { toast } = useToast()
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0])
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    recipientName: "",
    message: "",
    creatorName: "", // Will be populated dynamically
    image: null as File | null,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<(typeof templates)[0] | null>(null)

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [generatedCardData, setGeneratedCardData] = useState<any>(null)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setLoggedInUser(user)
      setFormData((prev) => ({ ...prev, creatorName: user.name }))
    }
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: "Image size must be less than 5MB" }))
        return
      }
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, image: "Please select a valid image file" }))
        return
      }
      setFormData((prev) => ({ ...prev, image: file }))
      setErrors((prev) => ({ ...prev, image: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.recipientName.trim()) {
      newErrors.recipientName = "Recipient name is required"
    }
    if (!formData.message.trim()) {
      newErrors.message = "Kudos message is required"
    } else if (formData.message.length > 130) {
      newErrors.message = "Message must be 130 characters or less"
    }
    if (!formData.creatorName.trim()) {
      newErrors.creatorName = "Your name is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleGenerateCard = async () => {
    if (!validateForm()) return

    setIsGenerating(true)
    try {
      // Generate the card
      await generateKudosCard({
        template: selectedTemplate,
        recipientName: formData.recipientName,
        message: formData.message,
        creatorName: formData.creatorName,
        image: formData.image,
      })

      const cardId = cardStorage.generateCardId()
      const cardData = {
        template: selectedTemplate,
        recipientName: formData.recipientName,
        message: formData.message,
        creatorName: formData.creatorName,
        image: formData.image,
      }

      // Generate thumbnail for storage
      const canvas = document.createElement("canvas")
      canvas.width = 1080
      canvas.height = 1350
      const ctx = canvas.getContext("2d")

      if (ctx) {
        await generateKudosCardToCanvas(canvas, cardData)
        const thumbnailBase64 = await cardStorage.cardToBase64(canvas)

        const storedCard: StoredCard = {
          id: cardId,
          recipientName: formData.recipientName,
          creatorName: formData.creatorName,
          creatorEmail: loggedInUser?.email || "",
          template: selectedTemplate.name,
          templateId: selectedTemplate.id,
          message: formData.message,
          createdAt: new Date().toISOString(),
          thumbnailUrl: thumbnailBase64,
          cardData: cardData,
          imageBlob: thumbnailBase64,
        }

        cardStorage.saveCard(storedCard)
      }

      // Log to Google Sheets
      await logToGoogleSheets({
        creatorName: formData.creatorName,
        recipientName: formData.recipientName,
        template: selectedTemplate.name,
        message: formData.message,
        timestamp: new Date().toISOString(),
      })

      setGeneratedCardData(cardData)
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Error generating card:", error)
      toast({
        title: "Error",
        description: "Failed to generate card. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRedownload = async () => {
    if (!generatedCardData) return

    setIsGenerating(true)
    try {
      await generateKudosCard(generatedCardData)

      if (loggedInUser) {
        // Find the card ID for logging
        const cards = cardStorage.getAllCards()
        const card = cards.find(
          (c) => c.recipientName === generatedCardData.recipientName && c.creatorEmail === loggedInUser.email,
        )
        if (card) {
          cardStorage.logDownload(card.id, loggedInUser)
        }
      }

      toast({
        title: "Downloaded!",
        description: "Your kudos card has been downloaded again.",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download card. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateAnother = () => {
    setShowSuccessModal(false)
    setGeneratedCardData(null)
    setFormData((prev) => ({
      ...prev,
      recipientName: "",
      message: "",
      image: null,
    }))
    setErrors({})
  }

  const handlePreviewGenerated = async () => {
    if (!validateForm()) return

    setIsGenerating(true)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = 1080
      canvas.height = 1350
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        throw new Error("Could not get canvas context")
      }

      await generateKudosCardToCanvas(canvas, {
        template: selectedTemplate,
        recipientName: formData.recipientName,
        message: formData.message,
        creatorName: formData.creatorName,
        image: formData.image,
      })

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          setPreviewImageUrl(url)
          setShowPreview(true)
        }
      }, "image/png")
    } catch (error) {
      console.error("Error generating preview:", error)
      alert("Failed to generate preview. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreGeneratedMessage = (message: string) => {
    handleInputChange("message", message)
  }

  const messageLength = formData.message.length
  const isFormValid = formData.recipientName && formData.message && formData.creatorName

  const currentMessages = preGeneratedMessages[selectedTemplate.id as keyof typeof preGeneratedMessages] || []

  const hasFormData = () => {
    return formData.recipientName.trim() !== "" || formData.message.trim() !== "" || formData.image !== null
  }

  const handleTemplateSelection = (template: (typeof templates)[0]) => {
    if (template.id === selectedTemplate.id) return // Same template, no action needed

    if (hasFormData()) {
      setPendingTemplate(template)
      setShowConfirmDialog(true)
    } else {
      setSelectedTemplate(template)
    }
  }

  const handleConfirmTemplateSwitch = () => {
    if (pendingTemplate) {
      setSelectedTemplate(pendingTemplate)
      // Clear form data when switching templates
      setFormData((prev) => ({
        ...prev,
        recipientName: "",
        message: "",
        image: null,
      }))
      setErrors({})
    }
    setShowConfirmDialog(false)
    setPendingTemplate(null)
  }

  const handleCancelTemplateSwitch = () => {
    setShowConfirmDialog(false)
    setPendingTemplate(null)
  }

  const handleViewMyCards = () => {
    setShowSuccessModal(false)
    window.location.href = "/dashboard/my-cards"
  }

  return (
    <>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-3">Create Recognition Card</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Show appreciation to your colleagues with a personalized kudos card
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Choose Template</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {templates.map((template) => {
              const IconComponent = template.icon
              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-md hover:shadow-lg ${
                    selectedTemplate.id === template.id ? "ring-2 ring-primary shadow-lg" : ""
                  }`}
                  onClick={() => handleTemplateSelection(template)}
                >
                  <CardContent className="p-4 text-center">
                    <div
                      className={`w-12 h-12 ${template.color} rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm`}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-card-foreground mb-1 text-sm">{template.name}</h4>
                    <p className="text-xs text-muted-foreground leading-tight">{template.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <Card className="shadow-lg border-border">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Card Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recipientName" className="text-sm font-semibold text-foreground mb-2 block">
                      Recipient Name *
                    </Label>
                    <Input
                      id="recipientName"
                      placeholder="Enter recipient's name"
                      value={formData.recipientName}
                      onChange={(e) => handleInputChange("recipientName", e.target.value)}
                      className={`h-10 bg-input border-border ${errors.recipientName ? "border-destructive" : "focus:ring-accent focus:border-accent"}`}
                    />
                    {errors.recipientName && <p className="text-xs text-destructive mt-1">{errors.recipientName}</p>}
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-sm font-semibold text-foreground mb-2 block">
                      Kudos Message *
                    </Label>

                    <div className="mb-3">
                      <Select onValueChange={handlePreGeneratedMessage}>
                        <SelectTrigger className="w-full bg-input border-border">
                          <SelectValue placeholder="Choose a pre-generated message or write your own" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentMessages.map((message, index) => (
                            <SelectItem key={index} value={message} className="text-sm">
                              {message.length > 60 ? `${message.substring(0, 60)}...` : message}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Textarea
                      id="message"
                      placeholder="Write your appreciation message..."
                      value={formData.message}
                      onChange={(e) => handleInputChange("message", e.target.value)}
                      className={`min-h-[100px] bg-input border-border resize-none ${errors.message ? "border-destructive" : "focus:ring-accent focus:border-accent"}`}
                      maxLength={130}
                    />
                    <div className="flex justify-between items-center mt-1">
                      {errors.message ? (
                        <p className="text-xs text-destructive">{errors.message}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Share what makes them special</p>
                      )}
                      <p className={`text-xs ${messageLength > 110 ? "text-destructive" : "text-muted-foreground"}`}>
                        {messageLength}/130
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="image" className="text-sm font-semibold text-foreground mb-2 block">
                      Upload Image (Optional)
                    </Label>
                    <label
                      htmlFor="image"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-input hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-3 pb-3">
                        <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                        <p className="text-sm text-foreground">Click to upload</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                      </div>
                      <input id="image" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    {formData.image && (
                      <p className="text-sm text-accent mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-accent rounded-full"></span>
                        {formData.image.name}
                      </p>
                    )}
                    {errors.image && <p className="text-xs text-destructive mt-1">{errors.image}</p>}
                  </div>

                  <div>
                    <Label htmlFor="creatorName" className="text-sm font-semibold text-foreground mb-2 block">
                      Your Name *
                    </Label>
                    <Input
                      id="creatorName"
                      placeholder="Enter your name"
                      value={formData.creatorName}
                      onChange={(e) => handleInputChange("creatorName", e.target.value)}
                      className={`h-10 bg-muted border-border text-muted-foreground ${errors.creatorName ? "border-destructive" : "focus:ring-accent focus:border-accent"}`}
                      readOnly
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This field is automatically populated from your login. Will be dynamic once SSO is implemented.
                    </p>
                    {errors.creatorName && <p className="text-xs text-destructive mt-1">{errors.creatorName}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-24 lg:h-fit">
            <Card className="shadow-lg border-border">
              <CardContent className="p-6 py-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Kudos Card
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePreviewGenerated}
                      disabled={!isFormValid || isGenerating}
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10 font-medium px-4 py-2 disabled:opacity-50 bg-transparent"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      {isGenerating ? "Generating..." : "Preview"}
                    </Button>
                    <Button
                      onClick={handleGenerateCard}
                      disabled={!isFormValid || isGenerating}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-2 disabled:opacity-50 shadow-md"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isGenerating ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl border border-border p-6 aspect-[4/5] flex flex-col justify-between shadow-inner px-0 py-0">
                  {selectedTemplate.id === "customer-centricity" ? (
                    <div
                      className="relative w-full h-full rounded-xl overflow-hidden"
                      style={{
                        backgroundImage: "url('/images/customer-centric-champion.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      <div className="absolute top-1 z-20">
                        <img
                          src="/images/customer-trophy.png"
                          alt="Customer Trophy"
                          className="object-contain drop-shadow-lg"
                        />
                      </div>

                      <div className="absolute top-59 right-18 z-10">
                        <div className="w-52 h-52 bg-white rounded-2xl p-1 shadow-lg">
                          {formData.image ? (
                            <img
                              src={URL.createObjectURL(formData.image) || "/placeholder.svg"}
                              alt="Employee"
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-xl flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="absolute bottom-42 left-1/2 transform -translate-x-1/2 text-center">
                        <h3 className="text-white text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {formData.recipientName || "RECIPIENT NAME"}
                        </h3>
                      </div>

                      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-center px-4 w-full">
                        <p
                          className="text-white text-sm leading-relaxed px-9 leading-3"
                          style={{ fontFamily: "Poppins, sans-serif" }}
                        >
                          {formData.message ||
                            "A round of applause for the remarkable efforts that make our team stronger every day!A round of applause for the remarkable efforts "}
                        </p>
                      </div>

                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                        <p className="text-white text-xs" style={{ fontFamily: "Poppins, sans-serif" }}>
                          Recognized by: {formData.creatorName || "Your Name"}
                        </p>
                        <p className="text-white text-xs px-0 py-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ) : selectedTemplate.id === "agility" ? (
                    <div
                      className="relative w-full h-full rounded-xl overflow-hidden"
                      style={{
                        backgroundImage: "url('/images/agility-champion.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      <div className="absolute top-2 z-20">
                        <img
                          src="/images/agility-trophy.png"
                          alt="Agility Trophy"
                          className="object-contain drop-shadow-lg"
                        />
                      </div>

                      <div className="absolute top-59 right-18 z-10">
                        <div className="w-52 h-52 bg-white rounded-2xl p-1 shadow-lg">
                          {formData.image ? (
                            <img
                              src={URL.createObjectURL(formData.image) || "/placeholder.svg"}
                              alt="Employee"
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-xl flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="absolute bottom-42 left-1/2 transform -translate-x-1/2 text-center">
                        <h3 className="text-white text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {formData.recipientName || "RECIPIENT NAME"}
                        </h3>
                      </div>

                      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-center px-4 w-full">
                        <p
                          className="text-white text-sm leading-relaxed px-9 leading-3"
                          style={{ fontFamily: "Poppins, sans-serif" }}
                        >
                          {formData.message || "Your agility and quick thinking drive our success forward!"}
                        </p>
                      </div>

                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                        <p className="text-white text-xs" style={{ fontFamily: "Poppins, sans-serif" }}>
                          Recognized by: {formData.creatorName || "Your Name"}
                        </p>
                        <p className="text-white text-xs px-0 py-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ) : selectedTemplate.id === "continuous-improvement" ? (
                    <div
                      className="relative w-full h-full rounded-xl overflow-hidden"
                      style={{
                        backgroundImage: "url('/images/continuous-improvement-champion.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      <div className="absolute top-1 z-20">
                        <img
                          src="/images/continuous-trophy.png"
                          alt="Continuous Trophy"
                          className="object-contain drop-shadow-lg"
                        />
                      </div>

                      <div className="absolute top-59 right-18 z-10">
                        <div className="w-52 h-52 bg-white rounded-2xl p-1 shadow-lg">
                          {formData.image ? (
                            <img
                              src={URL.createObjectURL(formData.image) || "/placeholder.svg"}
                              alt="Employee"
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-xl flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="absolute bottom-42 left-1/2 transform -translate-x-1/2 text-center">
                        <h3 className="text-white text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {formData.recipientName || "RECIPIENT NAME"}
                        </h3>
                      </div>

                      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-center px-4 w-full">
                        <p
                          className="text-white text-sm leading-relaxed px-9 leading-3"
                          style={{ fontFamily: "Poppins, sans-serif" }}
                        >
                          {formData.message || "Your commitment to improvement elevates everything you touch!"}
                        </p>
                      </div>

                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                        <p className="text-white text-xs" style={{ fontFamily: "Poppins, sans-serif" }}>
                          Recognized by: {formData.creatorName || "Your Name"}
                        </p>
                        <p className="text-white text-xs px-0 py-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ) : selectedTemplate.id === "collaboration" ? (
                    <div
                      className="relative w-full h-full rounded-xl overflow-hidden"
                      style={{
                        backgroundImage: "url('/images/collaboration-champion.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      <div className="absolute top-1 z-20">
                        <img
                          src="/images/collaboration-trophy.png"
                          alt="Collaboration Trophy"
                          className="object-contain drop-shadow-lg"
                        />
                      </div>

                      <div className="absolute top-59 right-18 z-10">
                        <div className="w-52 h-52 bg-white rounded-2xl p-1 shadow-lg">
                          {formData.image ? (
                            <img
                              src={URL.createObjectURL(formData.image) || "/placeholder.svg"}
                              alt="Employee"
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-xl flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="absolute bottom-42 left-1/2 transform -translate-x-1/2 text-center">
                        <h3 className="text-white text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {formData.recipientName || "RECIPIENT NAME"}
                        </h3>
                      </div>

                      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-center px-4 w-full">
                        <p
                          className="text-white text-sm leading-relaxed px-9 leading-3"
                          style={{ fontFamily: "Poppins, sans-serif" }}
                        >
                          {formData.message || "Your collaborative spirit transforms good ideas into great results!"}
                        </p>
                      </div>

                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                        <p className="text-white text-xs" style={{ fontFamily: "Poppins, sans-serif" }}>
                          Recognized by: {formData.creatorName || "Your Name"}
                        </p>
                        <p className="text-white text-xs px-0 py-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ) : selectedTemplate.id === "accountability" ? (
                    <div
                      className="relative w-full h-full rounded-xl overflow-hidden"
                      style={{
                        backgroundImage: "url('/images/accountability-champion.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      <div className="absolute top-1 z-20">
                        <img
                          src="/images/accountability-trophy.png"
                          alt="Accountability Trophy"
                          className="object-contain drop-shadow-lg"
                        />
                      </div>

                      <div className="absolute top-59 right-18 z-10">
                        <div className="w-52 h-52 bg-white rounded-2xl p-1 shadow-lg">
                          {formData.image ? (
                            <img
                              src={URL.createObjectURL(formData.image) || "/placeholder.svg"}
                              alt="Employee"
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-xl flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="absolute bottom-42 left-1/2 transform -translate-x-1/2 text-center">
                        <h3 className="text-white text-2xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {formData.recipientName || "RECIPIENT NAME"}
                        </h3>
                      </div>

                      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-center px-4 w-full">
                        <p
                          className="text-white text-sm leading-relaxed px-9 leading-3"
                          style={{ fontFamily: "Poppins, sans-serif" }}
                        >
                          {formData.message || "Your accountability sets the standard for excellence and trust!"}
                        </p>
                      </div>

                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                        <p className="text-white text-xs" style={{ fontFamily: "Poppins, sans-serif" }}>
                          Recognized by: {formData.creatorName || "Your Name"}
                        </p>
                        <p className="text-white text-xs px-0 py-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      {(() => {
                        const IconComponent = selectedTemplate.icon
                        return (
                          <div
                            className={`w-16 h-16 ${selectedTemplate.color} rounded-xl flex items-center justify-center mx-auto mb-4`}
                          >
                            <IconComponent className="w-8 h-8 text-white" />
                          </div>
                        )
                      })()}
                      <h4 className="text-xl font-bold text-foreground mb-2">{selectedTemplate.name}</h4>
                      <p className="text-xs text-muted-foreground font-medium mb-6 tracking-wider uppercase">
                        Recognition Award
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showConfirmDialog && pendingTemplate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Switch Template?</h3>
                    <p className="text-sm text-muted-foreground">You have unsaved changes</p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You've entered card details for{" "}
                    <span className="font-medium text-foreground">{selectedTemplate.name}</span>. Switching to{" "}
                    <span className="font-medium text-foreground">{pendingTemplate.name}</span> will clear your current
                    entries.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleCancelTemplateSwitch}
                    variant="outline"
                    className="flex-1 border-border hover:bg-muted bg-transparent"
                  >
                    Keep Current
                  </Button>
                  <Button
                    onClick={handleConfirmTemplateSwitch}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Switch Template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPreview && previewImageUrl && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Generated Image Preview</h3>
                <Button
                  onClick={() => {
                    setShowPreview(false)
                    if (previewImageUrl) {
                      URL.revokeObjectURL(previewImageUrl)
                      setPreviewImageUrl(null)
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>
              <div className="flex justify-center">
                <img
                  src={previewImageUrl || "/placeholder.svg"}
                  alt="Generated Kudos Card Preview"
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden relative">
              {/* Party Popper Animation */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-4 left-4 animate-bounce delay-100">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div className="absolute top-8 right-8 animate-bounce delay-300">
                  <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                </div>
                <div className="absolute top-16 left-1/2 animate-bounce delay-500">
                  <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
                </div>
                <div className="absolute bottom-20 right-12 animate-bounce delay-700">
                  <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                </div>
                <div className="absolute bottom-16 left-8 animate-bounce delay-200">
                  <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                </div>
              </div>

              <div className="p-8 text-center relative z-10">
                {/* Success Icon */}
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <CheckCircle className="w-12 h-12 text-primary animate-bounce" />
                </div>

                {/* Success Message */}
                <h2 className="text-3xl font-bold text-foreground mb-2 animate-fade-in">🎉 Your card is ready!</h2>
                <p className="text-muted-foreground mb-8 animate-fade-in delay-200">
                  Your kudos card for{" "}
                  <span className="font-semibold text-foreground">{generatedCardData?.recipientName}</span> has been
                  successfully created and downloaded.
                </p>

                {/* Action Buttons */}
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Button
                      onClick={handleRedownload}
                      disabled={isGenerating}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-md px-8"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isGenerating ? "Downloading..." : "Download Again"}
                    </Button>
                  </div>

                  {/* Reserved space for future features 
                  <div className="h-12 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground/60">Additional sharing options coming soon</p>
                  </div>
                  */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex gap-3">
                      <Button
                        onClick={handleViewMyCards}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                      >
                        View My Cards
                      </Button>
                      <Button
                        onClick={() => {
                          setFormData({
                            recipientName: "",
                            message: "",
                            creatorName: loggedInUser?.name || "Arun Sasi",
                            image: null,
                          })
                          setShowSuccessModal(false)
                        }}
                        variant="outline"
                        className="flex-1 border-border hover:bg-muted"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-card/80 backdrop-blur-sm border-t border-border mt-12 py-6 w-full">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} Reflections.</p>
        </div>
      </footer>
    </>
  )
}
