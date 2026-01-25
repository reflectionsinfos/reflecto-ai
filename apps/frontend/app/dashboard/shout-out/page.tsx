"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Megaphone, Layout, Download, CheckCircle, Image as ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { RecipientSelector } from "@/components/recipient-selector"
import type { GraphUser } from "@/lib/graph-service"
import { generateShoutOutToCanvas, ShoutOutCardData } from "@/lib/shout-out-generator"
import { apiClient } from "@/lib/api-client"
import { AiMessageAssistant } from "@/components/ai-message-assistant"

const CATEGORIES = [
    { id: "announcement", name: "Announcement", color: "bg-blue-500", gradient: "from-blue-500 to-blue-700" },
    { id: "employees", name: "Employees", color: "bg-teal-500", gradient: "from-teal-500 to-teal-700" },
    { id: "milestone", name: "Project Milestone", color: "bg-green-500", gradient: "from-green-500 to-green-700" },
    { id: "welcome", name: "Welcome / Onboarding", color: "bg-purple-500", gradient: "from-purple-500 to-purple-700" },
    { id: "event", name: "Event Invite", color: "bg-orange-500", gradient: "from-orange-500 to-orange-700" },
]

export default function ShoutOutPage() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [formData, setFormData] = useState({
        title: "",
        message: "",
        audienceType: "individual" as "individual" | "team",
        audienceName: "",
        category: "announcement",
        image: null as File | null,
        recipients: [] as GraphUser[]
    });
    
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Sync recipients to audienceName
    useEffect(() => {
        if (formData.recipients.length > 0) {
             // For team/individual, we use the selected names
             const names = formData.recipients.map(u => u.displayName).join(", ");
             setFormData(prev => ({ ...prev, audienceName: names }));
        } else {
             // Clear if empty? Or keep manual edit?
             // Since RecipientSelector controls this now, clearing is safer.
             setFormData(prev => ({ ...prev, audienceName: "" }));
        }
    }, [formData.recipients]);

    // Live Preview Effect
    useEffect(() => {
        const timer = setTimeout(() => generatePreview(), 500);
        return () => clearTimeout(timer);
    }, [formData, user]);

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, image: e.target.files![0] }));
        }
    }

    const generatePreview = async () => {
        const canvas = document.createElement("canvas");
        const style = CATEGORIES.find(c => c.id === formData.category) || CATEGORIES[0];
        
        const data: ShoutOutCardData = {
            style: { ...style, id: style.id },
            category: formData.category as any,
            title: formData.title || "Headline Here",
            message: formData.message || "Your main message will appear here.",
            audience: formData.recipients.length > 0 ? formData.audienceName : (formData.audienceName || "Organization"), 
            creatorName: user?.name || "Your Name",
            image: formData.image
        };

        await generateShoutOutToCanvas(canvas, data);
        
        canvas.toBlob(blob => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                setPreviewUrl(prev => {
                    if (prev) URL.revokeObjectURL(prev);
                    return url;
                });
            }
        });
    }

    const handleSave = async () => {
        if (!formData.title || !formData.message || !formData.audienceName) {
            toast({ title: "Missing Fields", description: "Please fill in all details.", variant: "destructive" });
            return;
        }

        setIsGenerating(true);
        try {
            // Generate final blob
            const canvas = document.createElement("canvas");
            const style = CATEGORIES.find(c => c.id === formData.category) || CATEGORIES[0];
            const data: ShoutOutCardData = {
                style: { ...style, id: style.id },
                category: formData.category as any,
                title: formData.title,
                message: formData.message,
                audience: formData.audienceName,
                creatorName: user?.name || "",
                image: formData.image
            };
            await generateShoutOutToCanvas(canvas, data);
            
            // Convert to Base64
            const base64 = canvas.toDataURL("image/jpeg", 0.8);

            // Save to Backend
            const payload = {
                type: "SHOUT_OUT",
                recipients: formData.recipients.map(r => r.displayName), // Store explicit names
                imageBlob: base64, 
                metadata: {
                    title: formData.title,
                    message: formData.message,
                    audience: formData.audienceName,
                    category: formData.category,
                    audienceType: formData.audienceType
                },
                privacyLevel: "PUBLIC"
            };

            await apiClient.post("/recognition", payload);
            
            setShowSuccess(true);
            toast({ title: "Published!", description: "Shout Out has been posted." });

        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to publish.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                   <h1 className="text-3xl font-bold">New Shout Out</h1>
                   <p className="text-muted-foreground">Make an announcement to the organization</p>
                </div>
                {/* <Button variant="outline">View All</Button> */}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Form */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <Label>Category</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {CATEGORIES.map(cat => (
                                        <div 
                                            key={cat.id}
                                            onClick={() => handleInputChange("category", cat.id)}
                                            className={`cursor-pointer border rounded-lg p-3 flex items-center gap-2 transition-all ${formData.category === cat.id ? "ring-2 ring-primary border-primary bg-accent/10" : "hover:bg-muted"}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                                            <span className="text-sm font-medium">{cat.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label>Headline</Label>
                                <Input 
                                    placeholder="e.g. Q3 Goals Smashed!" 
                                    value={formData.title}
                                    onChange={e => handleInputChange("title", e.target.value)}
                                    maxLength={40}
                                />
                            </div>

                            <RecipientSelector 
                                type={formData.audienceType}
                                onTypeChange={(val) => handleInputChange("audienceType", val)}
                                selectedRecipients={formData.recipients}
                                onRecipientsChange={(val) => handleInputChange("recipients", val)}
                            />

                            <div>
                            <div className="flex items-center justify-between">
                                <Label>Message Body</Label>
                                <AiMessageAssistant 
                                    context="Shout Out"
                                    recipientName={formData.audienceName}
                                    category={CATEGORIES.find(c => c.id === formData.category)?.name}
                                    currentValue={formData.message}
                                    onMessageGenerated={(msg) => handleInputChange("message", msg)}
                                />
                            </div>
                                <Textarea 
                                    placeholder="Write your announcement details here..."
                                    className="resize-none h-32"
                                    value={formData.message}
                                    onChange={e => handleInputChange("message", e.target.value)}
                                    maxLength={200}
                                />
                                <p className="text-xs text-muted-foreground text-right">{formData.message.length}/200</p>
                            </div>

                             <div>
                                <Label>Icon / Logo (Optional)</Label>
                                <Input type="file" onChange={handleImageUpload} accept="image/*" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview */}
                <div className="lg:sticky lg:top-8 h-fit">
                    <Card className="bg-muted/30 border-dashed">
                        <CardContent className="p-6">
                            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <Layout className="w-4 h-4"/> Live Preview
                            </h3>
                            
                            <div className="aspect-[16/9] w-full bg-background rounded-lg shadow-sm flex items-center justify-center overflow-hidden border border-border">
                                {previewUrl ? (
                                    <img src={previewUrl} className="w-full h-full object-contain" alt="Preview"/>
                                ) : (
                                    <p className="text-muted-foreground text-sm">Generating...</p>
                                )}
                            </div>

                            <div className="mt-6 flex gap-3">
                                <Button className="w-full" onClick={handleSave} disabled={isGenerating}>
                                    {isGenerating ? "Publishing..." : "Publish Shout Out"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
             {/* Success Modal */}
             {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6 m-4 border border-border text-center">
                        <div className="flex justify-center text-green-500 mb-4">
                            <CheckCircle className="w-12 h-12" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Shout Out Published!</h3>
                        <p className="text-muted-foreground mb-6">
                            Your announcement is now live on the dashboard.
                        </p>
                        <div className="flex gap-2 justify-center">
                            <Button variant="outline" onClick={() => {
                                setShowSuccess(false);
                                setFormData({ ...formData, title: "", message: "" });
                            }}>Create Another</Button>
                            <Button onClick={() => window.location.href = "/dashboard"}>Go to Feed</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
