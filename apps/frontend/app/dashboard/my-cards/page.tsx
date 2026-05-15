"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  Calendar,
  User,
  Award,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { cardStorage, type StoredCard } from "@/lib/card-storage"
import { Skeleton } from "@/components/ui/skeleton"

interface KudosCard {
  id: string
  recipientName: string
  creatorName: string
  creatorEmail: string
  template: string
  message: string
  createdAt: string
  thumbnailUrl: string
  cardData: any
  imageBlob?: string
}

const CardThumbnail = ({ card, className }: { card: StoredCard, className?: string }) => {
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!card.thumbnailUrl && !card.imageBlob && card.cardData) {
      const generate = async () => {
        try {
          const { generateKudosCardToCanvas } = await import("@/lib/image-generator")
          const canvas = document.createElement("canvas")
          canvas.width = 1080
          canvas.height = 1350
          const ctx = canvas.getContext("2d")
          if (ctx) {
             await generateKudosCardToCanvas(canvas, card.cardData)
             if (!active) return
             canvas.toBlob((blob) => {
               if (blob && active) setGeneratedUrl(URL.createObjectURL(blob))
             }, "image/jpeg", 0.5)
          }
        } catch (e) {
           console.error("Failed to lazily generate thumbnail", e)
        }
      }
      const timer = setTimeout(() => generate(), 100)
      return () => { active = false; clearTimeout(timer) }
    }
  }, [card])

  const src = card.thumbnailUrl || card.imageBlob || generatedUrl || "/placeholder.svg"
  const appliedClass = className || "w-full h-full object-cover object-top"

  return (
    <img
      src={src}
      alt={`${card.recipientName}'s recognition card`}
      className={`${appliedClass} transition-opacity duration-300 ${!card.thumbnailUrl && !card.imageBlob && !generatedUrl ? 'opacity-50 blur-sm' : 'opacity-100'}`}
    />
  )
}

export default function MyCardsPage() {
  const { toast } = useToast()
  const { user: currentUser, isLoading: isAuthLoading } = useAuth()
  const [cards, setCards] = useState<StoredCard[]>([])
  const [filteredCards, setFilteredCards] = useState<StoredCard[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [viewCard, setViewCard] = useState<StoredCard | null>(null)
  const [deleteCard, setDeleteCard] = useState<StoredCard | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [cardsPerPage] = useState(12)

  const userIsAdmin = currentUser?.role === "admin"

  console.log("MyCardsPage Render: ", { currentUser, isAuthLoading, userIsAdmin });

  useEffect(() => {
    if (isAuthLoading) return; // wait for auth to resolve

    if (!currentUser) {
      setIsFetching(false);
      return;
    }

    console.log("MyCardsPage Effect Triggered. Fetching cards...");
    const fetchCards = async () => {
      setIsFetching(true);
      try {
        if (userIsAdmin) {
          console.log("Fetching all cards (Admin)...");
          const allCards = await cardStorage.getAllCards()
          const sortedCards = allCards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setCards(sortedCards)
          setFilteredCards(sortedCards)
        } else {
          if (currentUser?.id) {
            const userCards = await cardStorage.getCardsByUser(currentUser.id)
            const sortedCards = userCards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            setCards(sortedCards)
            setFilteredCards(sortedCards)
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load cards. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsFetching(false);
      }
    }
    fetchCards()
  }, [currentUser, userIsAdmin, isAuthLoading])

  useEffect(() => {
    let filtered = cards

    if (searchTerm) {
      filtered = filtered.filter(
        (card) =>
          card.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          card.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          card.template.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedTemplate !== "all") {
      filtered = filtered.filter((card) => card.template === selectedTemplate)
    }

    if (selectedMonth) {
      filtered = filtered.filter((card) => card.createdAt.startsWith(selectedMonth))
    }

    filtered = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setFilteredCards(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchTerm, selectedTemplate, selectedMonth, cards])

  const handleExportCSV = () => {
    if (filteredCards.length === 0) {
      toast({ title: "No data", description: "There are no cards to export.", variant: "default" })
      return
    }

    const headers = ["Date Generated", "Creator Name", "Creator Email", "Recipient Name", "Template", "Message"]
    
    const escapeCSV = (str: string) => {
      if (str === null || str === undefined) return '""';
      const cleanStr = String(str).replace(/"/g, '""');
      return `"${cleanStr}"`;
    }

    const csvRows = [headers.map(escapeCSV).join(",")]

    for (const card of filteredCards) {
      const row = [
        formatDate(card.createdAt),
        card.creatorName,
        card.creatorEmail,
        card.recipientName,
        card.template,
        card.message
      ]
      csvRows.push(row.map(escapeCSV).join(","))
    }

    const csvData = csvRows.join("\n")
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `cards_export_${selectedMonth || "all"}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownload = async (card: StoredCard) => {
    try {
      // Always prefer regenerating the high-res card dynamically.
      // This ensures they don't accidentally download the low-res thumbnail.
      if (card.cardData) {
        const { generateKudosCard } = await import("@/lib/image-generator")
        await generateKudosCard(card.cardData)
      } else if (card.imageBlob) {
        // Fallback for extremely old legacy cards that didn't save cardData
        const filename = `recognition-card-${card.recipientName.replace(/\s+/g, "-").toLowerCase()}.png`
        const link = document.createElement("a")
        link.href = card.imageBlob
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
         toast({
          title: "Download Unavailable",
          description: "This card is too old and its data could not be recovered.",
          variant: "destructive",
        })
        return;
      }

      if (currentUser) {
        cardStorage.logDownload(card.id, currentUser)
      }

      toast({
        title: "Downloaded!",
        description: `${card.recipientName}'s card has been downloaded.`,
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the card. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const handleView = (card: StoredCard) => {
    setViewCard(card)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteCard || !currentUser) return

    setIsDeleting(true)
    try {
      const success = await cardStorage.deleteCard(deleteCard.id, currentUser)

      if (success) {
        if (userIsAdmin) {
          const allCards = await cardStorage.getAllCards()
          const sortedCards = allCards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setCards(sortedCards)
          setFilteredCards(
            sortedCards.filter((card) => {
              const matchesSearch =
                !searchTerm ||
                card.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                card.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                card.template.toLowerCase().includes(searchTerm.toLowerCase())
              const matchesTemplate = selectedTemplate === "all" || card.template === selectedTemplate
              return matchesSearch && matchesTemplate
            }),
          )
        } else {
          const userCards = await cardStorage.getCardsByUser(currentUser.email)
          const sortedCards = userCards.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          setCards(sortedCards)
          setFilteredCards(
            sortedCards.filter((card) => {
              const matchesSearch =
                !searchTerm ||
                card.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                card.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                card.template.toLowerCase().includes(searchTerm.toLowerCase())
              const matchesTemplate = selectedTemplate === "all" || card.template === selectedTemplate
              return matchesSearch && matchesTemplate
            }),
          )
        }

        toast({
          title: "Card Deleted",
          description: `${deleteCard.recipientName}'s card has been removed.`,
          duration: 3000,
        })
      } else {
        throw new Error("Failed to delete card")
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the card. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsDeleting(false)
      setDeleteCard(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const templates = ["Customer Centricity", "Agility", "Continuous Improvement", "Collaboration", "Accountability"]

  const indexOfLastCard = currentPage * cardsPerPage
  const indexOfFirstCard = indexOfLastCard - cardsPerPage
  const currentCards = filteredCards.slice(indexOfFirstCard, indexOfLastCard)
  const totalPages = Math.ceil(filteredCards.length / cardsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (isAuthLoading || isFetching) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Filters Skeleton */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>

        {/* Stats Skeleton */}
        <div className="mb-6 flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-3 py-4 mb-6 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm">Loading your card history...</span>
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-0">
                <Skeleton className="aspect-[4/5] rounded-t-lg" />
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Cards</h1>
        <p className="text-muted-foreground">
          {userIsAdmin
            ? "Manage all recognition cards across the organization"
            : "View and manage your created recognition cards"}
        </p>
      </div>

      {/* Filters & Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by recipient, creator, or template..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="px-3 py-2 bg-input border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">All Templates</option>
              {templates.map((template) => (
                <option key={template} value={template}>
                  {template}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-input border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:border-primary w-40"
              style={{ colorScheme: "dark" }}
            />
            {selectedMonth && (
              <Button variant="ghost" size="icon" onClick={() => setSelectedMonth("")} className="h-8 w-8 text-muted-foreground">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {userIsAdmin && (
          <Button onClick={handleExportCSV} className="w-full sm:w-auto shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="mb-6 flex gap-4">
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          <span className="text-sm text-muted-foreground">Total Cards: </span>
          <span className="font-semibold text-foreground">{filteredCards.length}</span>
        </div>
        {userIsAdmin && (
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">All Users: </span>
            <span className="font-semibold text-foreground">{new Set(cards.map((c) => c.creatorEmail)).size}</span>
          </div>
        )}
        {filteredCards.length > 0 && (
          <div className="bg-card border border-border rounded-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">
              Showing {indexOfFirstCard + 1}-{Math.min(indexOfLastCard, filteredCards.length)} of {filteredCards.length}
            </span>
          </div>
        )}
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-12">
          <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No cards found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedTemplate !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Start creating recognition cards to see them here"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentCards.map((card) => (
              <Card key={card.id} className="group hover:shadow-lg transition-all duration-200 border-border p-0">
                <CardContent className="p-0">
                  <div className="relative h-48 bg-muted rounded-t-lg overflow-hidden">
                    <CardThumbnail card={card} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleView(card)}
                          className="bg-white/90 hover:bg-white text-black shadow-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(card)}
                          className="bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setDeleteCard(card)}
                          variant="destructive"
                          className="bg-destructive/90 hover:bg-destructive shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground truncate">{card.recipientName}</h3>
                      <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                        {card.template}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{card.message}</p>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>By {card.creatorName}</span>
                      </div>
                      <div className="flex items-center gap-1 pb-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(card.createdAt)}</span>
                      </div>
                      {userIsAdmin && (
                        <div className="text-xs text-muted-foreground border-t border-border pt-1.5">
                          <span>Creator: {card.creatorName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="border-border"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const showPage =
                    page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)

                  if (!showPage) {
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 text-muted-foreground">
                          ...
                        </span>
                      )
                    }
                    return null
                  }

                  return (
                    <Button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className={currentPage === page ? "bg-primary text-primary-foreground" : "border-border"}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>

              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
                className="border-border"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* View Modal */}
      {viewCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">Recognition Card</h2>
              <Button
                onClick={() => setViewCard(null)}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6">
              <div className="flex justify-center mb-6">
                <CardThumbnail 
                  card={viewCard} 
                  className="max-w-full h-auto rounded-lg shadow-lg max-h-[60vh] object-contain" 
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Recipient</h3>
                  <p className="text-muted-foreground">{viewCard.recipientName}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Message</h3>
                  <p className="text-muted-foreground">{viewCard.message}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Template</h3>
                    <Badge variant="secondary">{viewCard.template}</Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Created</h3>
                    <p className="text-muted-foreground text-sm">{formatDate(viewCard.createdAt)}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Created By</h3>
                  <p className="text-muted-foreground">{viewCard.creatorName}</p>
                  {userIsAdmin && <p className="text-xs text-muted-foreground">{viewCard.creatorEmail}</p>}
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-border">
                <Button
                  onClick={() => handleDownload(viewCard)}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => setDeleteCard(viewCard)} variant="destructive" className="flex-1">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Delete Card?</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete the recognition card for{" "}
                <span className="font-medium text-foreground">{deleteCard.recipientName}</span>? This will permanently
                remove the card from the system.
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={() => setDeleteCard(null)}
                  variant="outline"
                  className="flex-1 border-border hover:bg-muted"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button onClick={handleDeleteConfirm} variant="destructive" className="flex-1" disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete Card"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
