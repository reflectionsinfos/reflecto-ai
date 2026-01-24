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
  X,
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
import { useAuth, User } from "@/hooks/use-auth" // Use new hook
import { cardStorage, type StoredCard } from "@/lib/card-storage"

import { RecipientSelector } from "@/components/recipient-selector"
import type { GraphUser } from "@/lib/graph-service"

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

const individualMessages = {
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

const teamMessages = {
  "customer-centricity": [
    "The team puts customers first, turning moments into wins. Your collective care and empathy make you our Customer Centric Champions!",
    "Every step the team takes puts customers at heart. Your empathy and hustle turn needs to smiles-our Customer Centric Champions!",
    "The team's focus shines daily-listening deeply, solving swiftly, delivering delight. You're our Customer Centric Champions!",
    "The team anticipates needs and delivers joy. Your heart and hustle help customers thrive-our Customer Centric Champions!",
    "With patience and action, the team turns feedback into impact. Customers feel seen and supported-our Customer Centric Champions!",
  ],
  agility: [
    "The team pivots with purpose and turns challenges into opportunities. Your agility drives our success forward!",
    "Quick thinking, faster action-the team adapts seamlessly. Your flexibility keeps our organization moving at lightning speed!",
    "Change energizes the team! Your ability to shift gears and innovate makes you our Agility Champions!",
    "The team dances with uncertainty and makes it look easy. Your responsive mindset inspires us all to stay nimble!",
    "From roadblocks to breakthroughs, the team navigates change with grace. Your agile spirit transforms obstacles into stepping stones!",
  ],
  "continuous-improvement": [
    "The team never settles for 'good enough'. Your growth mindset elevates everything you touch!",
    "Every day the team levels up and lifts others. Your commitment to improvement makes our entire organization stronger!",
    "The team turns feedback into fuel. Your dedication to growth inspires continuous excellence around you!",
    "Small steps, big impact-the team consistently refines and enhances. Your improvement journey creates waves of positive change!",
    "The team questions the status quo. Your relentless pursuit of excellence drives our collective success!",
  ],
  collaboration: [
    "The team brings people together and makes magic happen. Your collaborative spirit turns individual talents into team triumphs!",
    "The team shares generously and builds bridges. Your teamwork creates connections that strengthen our entire organization!",
    "The team makes everyone better through partnership. Your collaborative approach transforms good ideas into great results!",
    "The team unites diverse perspectives. Your ability to foster teamwork creates extraordinary outcomes for all!",
    "The team builds trust. Your collaborative leadership makes our organization unstoppable together!",
  ],
  accountability: [
    "The team owns its commitments. Your accountability sets the standard for excellence and trust!",
    "The team takes responsibility and makes things happen. Your reliable leadership inspires confidence in everyone!",
    "The team stands behind its work. Your accountability creates a culture of trust and high performance!",
    "The team delivers on promises. Your responsible approach builds the foundation for our collective success!",
    "The team shows up consistently. Your accountability drives results and earns respect from all around you!",
  ],
}

export default function DashboardPage() {
  const { toast } = useToast()
  const { user } = useAuth() // Get user from hook

  const [selectedTemplate, setSelectedTemplate] = useState(templates[0])
  
  const [formData, setFormData] = useState({
    recipientType: "individual" as "individual" | "team",
    // recipients stores the Graph User objects
    recipients: [] as GraphUser[],
    // recipientName is what's displayed on the card (computed or manual override if we allowed it)
    recipientName: "",
    message: "",
    creatorName: "",
    // images array for team or individual
    images: [] as File[],
    // legacy field for simple checks, syncs with images[0]
    image: null as File | null,
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [showFullScreenPreview, setShowFullScreenPreview] = useState(false) 
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<(typeof templates)[0] | null>(null)

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [generatedCardData, setGeneratedCardData] = useState<any>(null)
  
  // Sync creator name when user loads
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({ ...prev, creatorName: user.email || user.name || "" }))
    }
  }, [user])

  const generateLivePreview = async () => {
    setIsPreviewLoading(true)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = 1080
      canvas.height = 1350
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const previewData = {
        template: { ...selectedTemplate, icon: selectedTemplate.name },
        recipientName: formData.recipientName || "Recipient Name",
        designation: "",
        message: formData.message || "Your appreciation message will appear here...",
        creatorName: formData.creatorName || (user?.name || "Your Name"),
        image: formData.image,
        images: formData.images,
        recipientType: formData.recipientType,
        recipientEmails: []
      }

      await generateKudosCardToCanvas(canvas, previewData)

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          setPreviewImageUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
        }
      }, "image/png")
    } catch (e) {
      console.error("Preview generation failed", e)
    } finally {
      setIsPreviewLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => generateLivePreview(), 800)
    return () => clearTimeout(timer)
  }, [
    formData.recipientName, 
    formData.message, 
    formData.creatorName, 
    formData.image, 
    formData.images, 
    formData.recipientType, 
    selectedTemplate 
  ])


  // Sync recipientName based on recipients list
  useEffect(() => {
    if (formData.recipients.length === 0) {
        setFormData(prev => ({ ...prev, recipientName: "" }));
        return;
    }

    if (formData.recipientType === "individual") {
        setFormData(prev => ({ ...prev, recipientName: formData.recipients[0].displayName }));
    } else {
        // Team Logic
        const getFirstName = (name: string) => name.split(' ')[0].split('@')[0];
        
        const names = formData.recipients.map(u => getFirstName(u.displayName));
        // Always show all names (scaler will handle fitting)
        setFormData(prev => ({ ...prev, recipientName: names.join(", ") }));
    }
  }, [formData.recipients, formData.recipientType]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleRecipientTypeChange = (type: "individual" | "team") => {
      setFormData(prev => ({ 
          ...prev, 
          recipientType: type,
          recipients: [], // Reset recipients when switching type for clarity
          images: [],
          image: null 
      }));
      setErrors({});
  }

  const handleRecipientsChange = (recipients: GraphUser[]) => {
      setFormData(prev => ({ ...prev, recipients }));
      if (errors.recipientName) {
           setErrors(prev => ({ ...prev, recipientName: "" }));
      }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (formData.recipientType === "individual" && files.length > 1) {
        setErrors(prev => ({ ...prev, image: "Individual cards can only have one image." }));
        return;
    }

    // Convert to array
    const fileList = Array.from(files);
    
    // Check sizes
    const oversized = fileList.some(f => f.size > 5 * 1024 * 1024);
    if (oversized) {
        setErrors(prev => ({ ...prev, image: "All images must be less than 5MB" }));
        return;
    }

    // Check types
    const invalidType = fileList.some(f => !f.type.startsWith("image/"));
    if (invalidType) {
        setErrors(prev => ({ ...prev, image: "Please select valid image files" }));
        return;
    }

    // Update form
    setFormData(prev => ({
        ...prev,
        images: fileList,
        image: fileList[0] // Set first as legacy image for compatibility
    }));
    setErrors(prev => ({ ...prev, image: "" }));
  }

  const handleRemoveImage = (index: number) => {
    setFormData(prev => {
        const newImages = [...prev.images];
        newImages.splice(index, 1);
        return {
            ...prev,
            images: newImages,
            image: newImages.length > 0 ? newImages[0] : null
        };
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.recipients.length === 0) {
      newErrors.recipientName = "Please select at least one recipient";
    }
    
    if (formData.recipientType === "individual" && formData.recipients.length > 1) {
         newErrors.recipientName = "Individual mode allows only one recipient";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Kudos message is required"
    } else if (formData.message.length > 160) {
      newErrors.message = "Message must be 160 characters or less"
    }

    if (!formData.creatorName.trim()) {
      newErrors.creatorName = "Your name is required"
    }
    
    // Image validation (Optional, but if supplied must be correct count)
    if (formData.recipientType === "individual" && formData.images.length > 1) {
        newErrors.image = "Individual cards can only have one image";
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleGenerateCard = async () => {
    if (!validateForm()) {
        toast({
            title: "Missing Fields",
            description: "Please fill in all required fields to generate the card.",
            variant: "destructive",
            duration: 3000,
        })
        // Scroll to top to show errors
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
    }

    setIsGenerating(true)
    try {
      const cardDataPayload = {
        template: {
            ...selectedTemplate,
            icon: selectedTemplate.name
        },
        recipientName: formData.recipientName,
        designation:  "", // Optional or can be filled if we had data
        message: formData.message,
        creatorName: formData.creatorName,
        image: formData.image,
        images: formData.images, // Pass array
        recipientType: formData.recipientType,
        recipientEmails: formData.recipients.map(r => r.mail || r.userPrincipalName) // Pass emails
      }

      // Generate the card (client side visual)
      await generateKudosCard(cardDataPayload)

      // ID generation handled by backend save

      // Generate thumbnail for storage
      const canvas = document.createElement("canvas")
      canvas.width = 1080
      canvas.height = 1350
      const ctx = canvas.getContext("2d")

      if (ctx) {
        await generateKudosCardToCanvas(canvas, cardDataPayload)
        
        // Thumbnail generation...
        const thumbnailCanvas = document.createElement("canvas")
        const thumbnailWidth = 300
        const thumbnailHeight = (canvas.height / canvas.width) * thumbnailWidth
        thumbnailCanvas.width = thumbnailWidth
        thumbnailCanvas.height = thumbnailHeight
        
        const thumbnailCtx = thumbnailCanvas.getContext("2d")
        if (thumbnailCtx) {
          thumbnailCtx.drawImage(canvas, 0, 0, thumbnailWidth, thumbnailHeight)
          
          const thumbnailBase64 = await new Promise<string>((resolve) => {
            thumbnailCanvas.toBlob((blob) => {
              resolve(blob ? URL.createObjectURL(blob) : "") 
            }, "image/jpeg", 0.7)
          });
           
          // Re-implementing FileReader for Base64 (Robust)
          const realThumbnailBase64 = await new Promise<string>((resolve) => {
             thumbnailCanvas.toBlob(blob => {
                 if(blob) {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                 } else {
                     resolve("");
                 }
             }, "image/jpeg", 0.7);
          });
          
          const storedCard: StoredCard & { recipientType?: string, recipientEmails?: string[] } = {
            id: "", 
            recipientName: formData.recipientName,
            creatorName: formData.creatorName,
            creatorEmail: user?.email || "",
            template: selectedTemplate.name,
            templateId: selectedTemplate.id,
            message: formData.message,
            createdAt: new Date().toISOString(),
            thumbnailUrl: realThumbnailBase64,
            cardData: cardDataPayload,
            recipientType: formData.recipientType,
            recipientEmails: cardDataPayload.recipientEmails
          }
          
          await cardStorage.saveCard(storedCard)
        }
      }

      await logToGoogleSheets({
        creatorName: formData.creatorName,
        recipientName: formData.recipientName,
        template: selectedTemplate.name,
        message: formData.message,
        timestamp: new Date().toISOString(),
      })

      setGeneratedCardData(cardDataPayload)
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
      recipients: [],
      recipientName: "",
      message: "",
      image: null,
      images: []
    }))
    setErrors({})
  }

  // Pre-message logic updated
  const handlePreGeneratedMessage = (message: string) => {
    handleInputChange("message", message)
  }

  const messageLength = formData.message.length
  // Validator boolean for UI
  const isFormValid = formData.recipients.length > 0 && formData.message && formData.creatorName

  // Select message set based on type
  const currentMessages = (formData.recipientType === 'team' ? teamMessages : individualMessages)[selectedTemplate.id as keyof typeof individualMessages] || []

  // ... Template Switch logic ...
  const hasFormData = () => {
    return formData.recipients.length > 0 || formData.message.trim() !== "" || formData.images.length > 0
  }

  const handleTemplateSelection = (template: (typeof templates)[0]) => {
     if (template.id === selectedTemplate.id) return 
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
      setFormData((prev) => ({
        ...prev,
        recipients: [],
        recipientName: "",
        message: "",
        image: null,
        images: []
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
  
  // Full screen preview trigger
  const handlePreviewGenerated = () => {
      setShowFullScreenPreview(true)
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
                  <RecipientSelector 
                      type={formData.recipientType}
                      onTypeChange={handleRecipientTypeChange}
                      selectedRecipients={formData.recipients}
                      onRecipientsChange={handleRecipientsChange}
                      error={errors.recipientName}
                  />

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
                      {formData.recipientType === 'individual' ? "Upload Image (Optional)" : "Upload Images (Optional, up to 4)"}
                    </Label>
                    <label
                      htmlFor="image"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-input hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-3 pb-3">
                        <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                        <p className="text-sm text-foreground">Click to upload</p>
                        <p className="text-xs text-muted-foreground">{formData.recipientType === 'individual' ? "PNG, JPG up to 5MB" : "Select multiple images"}</p>
                      </div>
                      <input 
                          id="image" 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          multiple={formData.recipientType === 'team'}
                          onChange={handleImageUpload} 
                      />
                    </label>
                    {formData.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.images.map((f, i) => (
                                <div key={i} className="flex items-center gap-1 bg-accent/10 px-2 py-1 rounded-full border border-accent/20">
                                    <span className="text-xs text-accent font-medium max-w-[150px] truncate" title={f.name}>
                                        {f.name}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveImage(i)}
                                        className="text-accent hover:text-destructive transition-colors"
                                        type="button"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
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
                      className={`h-10 bg-input border-border text-foreground ${errors.creatorName ? "border-destructive" : "focus:ring-accent focus:border-accent"}`}
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
                      disabled={!previewImageUrl}
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10 font-medium px-4 py-2 disabled:opacity-50 bg-transparent"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Full Screen
                    </Button>
                <Button
                      onClick={handleGenerateCard}
                      disabled={isGenerating}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-2 disabled:opacity-50 shadow-md"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isGenerating ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl border border-border p-6 aspect-[4/5] flex flex-col justify-between shadow-inner px-0 py-0 overflow-hidden relative">
                   {/* Live Sidebar Preview */}
                   {isPreviewLoading && (
                       <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                       </div>
                   )}
                   
                   {previewImageUrl ? (
                       <img src={previewImageUrl} alt="Preview" className="w-full h-full object-contain rounded-xl" />
                   ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl p-6 text-center">
                           <Award className="w-12 h-12 mb-2 text-muted-foreground/50" />
                           <p>Generating preview...</p>
                       </div>
                   )}
                </div>

              </CardContent>
            </Card>
          </div>
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6 m-4 border border-border">
              <div className="flex items-center justify-center mb-4 text-green-500">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-bold text-center text-foreground mb-2">Card Generated!</h3>
              <p className="text-center text-muted-foreground mb-6">
                Your kudos card has been successfully created and saved.
              </p>

              <div className="space-y-3">
                <Button onClick={handleRedownload} className="w-full" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Again
                </Button>
                <Button onClick={handleCreateAnother} className="w-full bg-primary hover:bg-primary/90">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Another
                </Button>
                <Button onClick={handleViewMyCards} variant="ghost" className="w-full">
                  View My Cards
                </Button>
                <Button onClick={handleCreateAnother} variant="ghost" className="w-full text-muted-foreground">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Template Switch Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6 m-4 border border-border">
              <div className="flex items-center justify-center mb-4 text-yellow-500">
                <AlertTriangle className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-center text-foreground mb-2">Switch Template?</h3>
              <p className="text-center text-muted-foreground mb-6">
                Switching templates will clear your current message and image. Are you sure you want to continue?
              </p>

              <div className="flex gap-3">
                <Button onClick={handleCancelTemplateSwitch} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleConfirmTemplateSwitch} className="flex-1 bg-primary text-primary-foreground">
                  Yes, Switch
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal (Full Screen) */}
        {showFullScreenPreview && previewImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowFullScreenPreview(false)}>
            <div className="relative max-h-[90vh] max-w-[90vw] overflow-auto" onClick={e => e.stopPropagation()}>
                <img src={previewImageUrl} alt="Card Preview" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
                <Button 
                    className="absolute top-2 right-2 rounded-full p-2 h-auto" 
                    variant="destructive"
                    onClick={() => setShowFullScreenPreview(false)}
                >
                     <p className="sr-only">Close</p>

                     <span className="text-white font-bold">X</span>
                </Button>
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
