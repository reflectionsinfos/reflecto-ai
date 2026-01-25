"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Trophy, Upload, Info, Bold, RotateCcw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { generateSpotAward } from "@/lib/image-spot-generator"
import { downloadImage } from "@/lib/image-generator"
import { apiClient } from "@/lib/api-client"
import { RecipientSelector } from "@/components/recipient-selector"
import type { GraphUser } from "@/lib/graph-service"

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export default function SpotAwardsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // State
  const [recipientType, setRecipientType] = useState<"individual" | "team">("individual")
  const [recipients, setRecipients] = useState<GraphUser[]>([])
  const [recipientName, setRecipientName] = useState("")

  const [category, setCategory] = useState("Customer Centricity")
  const [message, setMessage] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Sync recipientName based on selection
  useEffect(() => {
    if (recipients.length === 0) {
        setRecipientName("")
        return
    }

    if (recipientType === "individual") {
        setRecipientName(recipients[0].displayName)
    } else {
        // For team, join first names
        const names = recipients.map(u => u.displayName.split(' ')[0])
        setRecipientName(names.join(", "))
    }
  }, [recipients, recipientType])

  // Auth Protection
  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  // Live Preview Generation
  useEffect(() => {
      const generate = async () => {
          if (!canvasRef.current) return
          
          // Basic validation or debounce could go here
          
          await generateSpotAward(canvasRef.current, {
              recipientName: recipientName || "Recipient Name",
              designation: "N/A", 
              message: message || "Write a message to see it appear here...",
              creatorName: user?.name || "Admin",
              images: images,
              recipientType: recipientType,
              template: {
                  id: "spot-award",
                  name: category,
                  color: "#F59E0B",
                  gradient: "",
                  icon: "trophy"
              }
          })
      }

      // Debounce slightly to avoid rapid re-renders on every keystroke
      const timer = setTimeout(generate, 300)
      return () => clearTimeout(timer)
  }, [recipientName, category, message, images, user, recipientType])

  // Categories
  const categories = [
    "Customer Centricity",
    "Leadership Excellence",
    "Innovation Champion",
    "Team Collaboration",
    "Agility & Adaptability",
    "Above & Beyond"
  ]

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      if (images.length + newFiles.length > 8) {
        toast({
            title: "Too many images",
            description: "You can upload a maximum of 8 images.",
            variant: "destructive"
        })
        return
      }
      setImages(prev => [...prev, ...newFiles])
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleDownload = async () => {
    if (images.length === 0) {
        toast({
            title: "No images",
            description: "Please upload at least one profile image.",
            variant: "destructive"
        })
        return
    }
    
    setIsGenerating(true)
    
    if (canvasRef.current) {
        // High quality export
        canvasRef.current.toBlob(async (blob) => {
            if (blob) {
                try {
                    // 1. Save to Database
                    const base64Image = await blobToBase64(blob)
                    
                    await apiClient.post("/recognition", {
                        type: "SPOT_AWARD",
                        recipients: recipients.length > 0 ? recipients.map(r => r.displayName) : [recipientName],
                        metadata: {
                            category,
                            message,
                            recipientType: "individual",
                            templateId: "spot-award",
                            spotAwardData: {
                                recipientName,
                                category,
                                message
                            }
                        },
                        imageBlob: base64Image,
                        privacyLevel: "PUBLIC"
                    })
                    
                    toast({
                        title: "Award Saved",
                        description: "Spot Award saved to database successfully."
                    })

                    // 2. Download File
                    const filename = `spot-award-${recipientName.replace(/\s+/g, '-').toLowerCase() || 'poster'}.png`
                    downloadImage(blob, filename)
                    
                } catch (error) {
                    console.error("Failed to save award:", error)
                    toast({
                        title: "Save Failed",
                        description: "Could not save to database, but download will proceed.",
                        variant: "destructive"
                    })
                    // Still download even if save fails
                    const filename = `spot-award-${recipientName.replace(/\s+/g, '-').toLowerCase() || 'poster'}.png`
                    downloadImage(blob, filename)
                }
            }
            setIsGenerating(false)
        }, 'image/png', 1.0)
    } else {
        setIsGenerating(false)
    }
  }

  if (isLoading || user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trophy className="w-8 h-8 text-amber-500" />
          R&R Poster Creator — Spot Award
        </h1>
        <p className="text-muted-foreground mt-2">
          Create professional award posters with ease
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Controls */}
        <div className="lg:col-span-5 space-y-6">
            
          {/* 1. Upload Profile Images */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">1. Upload Profile Images</Label>
                  <span className="text-xs text-muted-foreground">{images.length}/8 images</span>
              </div>
              <p className="text-sm text-muted-foreground">Upload up to 8 images (max 8 total)</p>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleImageUpload}
                />
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Drag & drop images here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              </div>

              {/* Image Previews */}
              {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-4">
                      {images.map((file, i) => (
                          <div key={i} className="relative group aspect-square bg-muted rounded-md overflow-hidden">
                              <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => removeImage(i)}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                  x
                              </button>
                          </div>
                      ))}
                  </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Recipient Details */}
          <Card>
            <CardContent className="p-6 space-y-4">
                <Label className="text-base font-semibold">2. Recipient Details</Label>
                
                <div className="space-y-2">
                    <Label>Award Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <RecipientSelector 
                    type={recipientType}
                    onTypeChange={(t) => {
                        setRecipientType(t)
                        setRecipients([])
                    }}
                    selectedRecipients={recipients}
                    onRecipientsChange={setRecipients}
                />
            </CardContent>
          </Card>

          {/* 3. Write Appreciation Message */}
          <Card>
            <CardContent className="p-6 space-y-4">
                <Label className="text-base font-semibold">3. Write Appreciation Message</Label>
                
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white border-0">
                        Green Color
                    </Button>
                    <Button variant="outline" size="sm">
                        <Bold className="w-3 h-3 mr-2" /> Bold
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setMessage("")}>
                        <RotateCcw className="w-3 h-3 mr-2" /> Reset
                    </Button>
                </div>

                <Textarea 
                    placeholder="Write your appreciation message here. This will appear at the bottom of the poster..."
                    className="min-h-[150px]"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Text size will automatically scale to fit the poster</li>
                    <li>Default text color is white for visibility</li>
                </ul>
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Preview */}
        <div className="lg:col-span-7 space-y-6">
            <Card className="h-full">
                <CardContent className="p-6 space-y-4">
                    <Label className="text-base font-semibold">4. Preview & Download</Label>
                    
                    {/* Canvas Container */}
                    <div className="aspect-[5/4] bg-neutral-900 rounded-lg overflow-hidden shadow-2xl relative">
                        {/* Placeholder for canvas */}
                        <canvas 
                            ref={canvasRef}
                            className="w-full h-full object-contain"
                            width={2049}
                            height={1639}
                        />
                         {images.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-white/50 pointer-events-none">
                                <p>Preview will update automatically</p>
                            </div>
                        )}
                    </div>

                    <Button 
                        className="w-full py-6 text-lg" 
                        size="lg"
                        disabled={images.length === 0 || isGenerating}
                        onClick={handleDownload}
                    >
                        <Download className="w-5 h-5 mr-2" />
                        {isGenerating ? "Generating..." : "Download PNG"}
                    </Button>

                    <div className="text-xs text-muted-foreground space-y-2">
                        <p>Add at least one profile image to enable download</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Output format: PNG</li>
                            <li>Aspect ratio: 5:4 (2049×1639px)</li>
                            <li>Maximum file size: 2.5 MB</li>
                            <li>Text automatically scales to fit designated area</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
