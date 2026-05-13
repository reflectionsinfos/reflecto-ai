"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Sparkles, RefreshCw, Check, Loader2, Wand2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AiMessageAssistantProps {
  onMessageGenerated: (message: string) => void
  context: "Kudos" | "Shout Out" | "Spot Award"
  recipientName: string
  category?: string
  currentValue?: string
  className?: string
}

export function AiMessageAssistant({
  onMessageGenerated,
  context,
  recipientName,
  category,
  currentValue,
  className
}: AiMessageAssistantProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [generatedMessage, setGeneratedMessage] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [tone, setTone] = useState<"professional" | "casual" | "funny" | "inspiring">("inspiring")

  // Sync draft with current value when opening, if draft is empty
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && !draft && currentValue) {
      setDraft(currentValue)
    }
  }

  const handleGenerate = async () => {
    if (!draft.trim()) {
       // Allow empty draft, AI will generate from context
    }

    setIsGenerating(true)
    try {
      const response = await apiClient.post("/ai/generate-message", {
        type: context,
        recipientName,
        category,
        draft,
        tone
      }) as any

      if (response && response.message) {
        let finalMessage = response.message.trim();
        // Safety trim if backend AI hallucinates extra length, ensuring we stay within 130 char limit
        if ((context === "Kudos" || context === "Spot Award") && finalMessage.length > 250) {
  finalMessage = finalMessage.substring(0, 250);
}

// 🔥 Step 2: Ensure COMPLETE sentence
if (!finalMessage.endsWith(".")) {
  const lastDot = finalMessage.lastIndexOf(".");

  if (lastDot > 80) {
    finalMessage = finalMessage.substring(0, lastDot + 1);
  } else {
    // fallback → intelligently complete sentence
    if (category) {
      finalMessage = finalMessage.replace(/\s+$/, "") + ` ${category.toLowerCase()}.`;
    } else {
      finalMessage = finalMessage.replace(/\s+$/, "") + ".";
    }
  }
}

setGeneratedMessage(finalMessage);
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Generation Failed",
        description: "Could not generate message. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = () => {
    onMessageGenerated(generatedMessage)
    setIsOpen(false)
    setGeneratedMessage("")
    setDraft("")
    toast({
        title: "Message Applied",
        description: "The AI generated message has been inserted.",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 ${className}`}
          type="button" // Prevent form submission
        >
          <Sparkles className="w-4 h-4" />
          AI Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wand2 className="w-6 h-6 text-indigo-500" />
            AI Message Writer
          </DialogTitle>
          <DialogDescription>
            Draft a few words or keywords, and let AI polish it for you.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">

          <div className="grid grid-cols-2 gap-4">
              <div>
                  <Label className="text-xs text-muted-foreground">Recipient</Label>
                  <div className="font-medium text-sm truncate">{recipientName || "Someone"}</div>
              </div>
               <div>
                  <Label className="text-xs text-muted-foreground">Category/Type</Label>
                  <div className="font-medium text-sm truncate">{category || context}</div>
              </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
                <Label htmlFor="draft">Your Draft / Keywords</Label>
                <Select value={tone} onValueChange={(v:any) => setTone(v)}>
                    <SelectTrigger className="h-6 w-[120px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="inspiring">Inspiring</SelectItem>
                        <SelectItem value="funny">Funny</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Textarea
              id="draft"
              placeholder={`e.g. Thanks for helping with the deployment last night. You are a lifesaver.`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-24 resize-none"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between items-center bg-muted/50 p-3 rounded-lg">
             <Button 
                onClick={handleGenerate} 
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Writing...
                </>
              ) : (
                <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {generatedMessage ? "Regenerate" : "Generate Message"}
                </>
              )}
            </Button>
          </DialogFooter>

          {generatedMessage && (
            <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-bottom-2">
              <Label>AI Suggestion</Label>
              <div className="bg-indigo-50 border border-indigo-100 rounded-md p-4 text-sm relative">
                  <p className="italic text-slate-700">{generatedMessage}</p>
              </div>
               <Button onClick={handleApply} className="w-full" variant="default">
                  <Check className="w-4 h-4 mr-2" /> Use This Message
               </Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}

 