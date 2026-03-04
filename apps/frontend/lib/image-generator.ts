export interface KudosCardData {
  template: {
    id: string
    name: string
    color: string
    gradient: string
    icon: string
    backgroundImageBlob?: string | null  // NEW: Base64-encoded background image
    logoBlob?: string | null              // NEW: Company logo (optional)
  }
  recipientName: string
  designation: string
  message: string
  creatorName: string
  image?: File | null
  images?: File[] | null
  recipientType?: "individual" | "team"
}

export async function generateKudosCardToCanvas(canvas: HTMLCanvasElement, data: KudosCardData): Promise<void> {
  try {
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Could not get canvas context")
    }

    // Set canvas dimensions (1080x1350px - 4:5 ratio for social sharing)
    canvas.width = 1080
    canvas.height = 1350

    switch (data.template.id) {
      case "customer-centricity":
        await generateCustomerCentricChampion(ctx, canvas, data)
        break
      case "agility":
        await generateAgilityChampion(ctx, canvas, data)
        break
      case "continuous-improvement":
        await generateContinuousImprovementChampion(ctx, canvas, data)
        break
      case "collaboration":
        await generateCollaborationChampion(ctx, canvas, data)
        break
      case "accountability":
        await generateAccountabilityChampion(ctx, canvas, data)
        break
      default:
        // Fallback to generic template
        await generateGenericTemplate(ctx, canvas, data)
    }
  } catch (error) {
    console.error("Error generating kudos card to canvas:", error)
    throw new Error("Failed to generate kudos card to canvas")
  }
}

export async function generateKudosCard(data: KudosCardData): Promise<void> {
  try {
    // Create canvas for image generation
    const canvas = document.createElement("canvas")

    // Use the new canvas generation function
    await generateKudosCardToCanvas(canvas, data)

    // Convert canvas to blob and download
    canvas.toBlob(
      (blob) => {
        if (blob) {
          downloadImage(blob, `kudos-card-${data.recipientName.replace(/\s+/g, "-").toLowerCase()}.png`)
        }
      },
      "image/png",
      1.0,
    )
  } catch (error) {
    console.error("Error generating kudos card:", error)
    throw new Error("Failed to generate kudos card")
  }
}

async function generateCustomerCentricChampion(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: KudosCardData,
): Promise<void> {
  // Load and draw background image
  const backgroundImg = new Image()
  backgroundImg.crossOrigin = "anonymous"

  await new Promise((resolve, reject) => {
    backgroundImg.onload = resolve
    backgroundImg.onerror = reject
    // Use plural version for team
    if (data.recipientType === "team") {
      backgroundImg.src = "/images/customer-centric-champions.png"
    } else {
      backgroundImg.src = "/images/customer-centric-champion.png"
    }
  })

  // Draw background to fill entire canvas
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height)

  // Set Poppins font (fallback to system fonts)
  const poppinsFont = "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

  const trophyImg = new Image()
  trophyImg.crossOrigin = "anonymous"

  await new Promise((resolve, reject) => {
    trophyImg.onload = resolve
    trophyImg.onerror = reject
    trophyImg.src = "/images/customer-trophy.png"
  })

  // Draw employee photo placeholder/frame (positioned on right side)
  const photoX = 500
  const photoY = 450
  const photoWidth = 400
  const photoHeight = 400
  const cornerRadius = 20

  // White frame
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.roundRect(photoX - 10, photoY - 10, photoWidth + 20, photoHeight + 20, cornerRadius + 5)
  ctx.fill()

  // Photo area
  ctx.fillStyle = "#f3f4f6"
  ctx.beginPath()
  ctx.roundRect(photoX, photoY, photoWidth, photoHeight, cornerRadius)
  ctx.fill()

  // Draw employee photo or team grid
  if (data.images && data.images.length > 1) {
      // For customer centricity, the photo placement is same
      await drawTeamPhotos(ctx, data, photoX, photoY, photoWidth, photoHeight, cornerRadius)
  } else if (data.image || (data.images && data.images.length === 1)) {
    const file = data.image || (data.images && data.images[0]) || null;
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = URL.createObjectURL(data.image!)
      })

      ctx.save()
      ctx.beginPath()
      ctx.roundRect(photoX, photoY, photoWidth, photoHeight, cornerRadius)
      ctx.clip()

      // Calculate aspect ratio and draw image to fit
      const imgAspect = img.width / img.height
      const frameAspect = photoWidth / photoHeight

      let drawWidth, drawHeight, drawX, drawY

      if (imgAspect > frameAspect) {
        drawHeight = photoHeight
        drawWidth = drawHeight * imgAspect
        drawX = photoX - (drawWidth - photoWidth) / 2
        drawY = photoY
      } else {
        drawWidth = photoWidth
        drawHeight = drawWidth / imgAspect
        drawX = photoX
        drawY = photoY - (drawHeight - photoHeight) / 2
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
      ctx.restore()
    } catch (error) {
      console.error("Error loading user image:", error)
      // Draw placeholder icon if image fails to load
      ctx.fillStyle = "#9ca3af"
      ctx.font = `400 48px ${poppinsFont}`
      ctx.textAlign = "center"
      ctx.fillText("👤", photoX + photoWidth / 2, photoY + photoHeight / 2 + 15)
    }
  } else {
    // Draw placeholder icon
    ctx.fillStyle = "#9ca3af"
    ctx.font = `400 48px ${poppinsFont}`
    ctx.textAlign = "center"
    ctx.fillText("👤", photoX + photoWidth / 2, photoY + photoHeight / 2 + 15)
  }

  const trophyWidth = 990
  const trophyHeight = 1300
  const trophyX = 0 // Left side positioning
  const trophyY = 20

  ctx.drawImage(trophyImg, trophyX, trophyY, trophyWidth, trophyHeight)

  // Draw recipient name
  drawScaledText(ctx, data.recipientName.toUpperCase(), canvas.width / 2, 960, 1000, 56, poppinsFont)

  // Draw recognition message
  ctx.fillStyle = "#ffffff"
  ctx.font = `400 32px ${poppinsFont}`
  ctx.textAlign = "center"

  // Wrap text for the message
  const maxWidth = 800
  const lineHeight = 45
  wrapText(ctx, data.message, canvas.width / 2, 1040, maxWidth, lineHeight)

  // Draw footer
  ctx.fillStyle = "#ffffff"
  ctx.font = `400 24px ${poppinsFont}`
  ctx.textAlign = "center"
  ctx.fillText(`Recognized by: ${data.creatorName}`, canvas.width / 2, 1220)
  ctx.fillText(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    canvas.width / 2,
    1260,
  )
}

async function generateGenericTemplate(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: KudosCardData,
): Promise<void> {
  // Check if custom background image is provided
  if (data.template.backgroundImageBlob) {
    // Draw custom background image
    const bgImg = new Image()
    bgImg.crossOrigin = "anonymous"

    await new Promise((resolve, reject) => {
      bgImg.onload = resolve
      bgImg.onerror = reject
      bgImg.src = data.template.backgroundImageBlob as string
    })

    // Draw background to fill entire canvas
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height)

    // Add semi-transparent dark overlay for text readability (bottom 50%)
    const overlayHeight = (canvas.height * 50) / 100
    const gradient = ctx.createLinearGradient(0, canvas.height - overlayHeight, 0, canvas.height)
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)")
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.9)") // 90% opacity overlay
    ctx.fillStyle = gradient
    ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight)

    // Use white text on dark overlay
    const textColor = "#ffffff"
    const subtitleColor = "#e5e7eb"

    // Add template name
    ctx.fillStyle = textColor
    ctx.font = "bold 48px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(data.template.name, canvas.width / 2, 400)

    // Add "Recognition Award" subtitle
    ctx.fillStyle = subtitleColor
    ctx.font = "32px Arial, sans-serif"
    ctx.fillText("Recognition Award", canvas.width / 2, 450)

    // Add recipient name
    ctx.fillStyle = textColor
    drawScaledText(ctx, data.recipientName, canvas.width / 2, 600, canvas.width - 160, 56, "Arial, sans-serif")

    // Add designation
    ctx.fillStyle = subtitleColor
    ctx.font = "36px Arial, sans-serif"
    ctx.fillText(data.designation, canvas.width / 2, 650)

    // Add message (with text wrapping)
    ctx.fillStyle = textColor
    ctx.font = "italic 32px Arial, sans-serif"
    wrapText(ctx, data.message, canvas.width / 2, 750, canvas.width - 160, 40)

    // Add creator info at bottom
    ctx.fillStyle = "#d1d5db"
    ctx.font = "28px Arial, sans-serif"
    ctx.fillText(`Recognized by: ${data.creatorName}`, canvas.width / 2, 1150)
    ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, 1200)
  } else {
    // Original gradient background for templates without custom images
    const gradientBg = ctx.createLinearGradient(0, 0, 0, canvas.height)
    const gradientColors = getGradientColors(data.template.gradient)
    gradientBg.addColorStop(0, gradientColors.start)
    gradientBg.addColorStop(1, gradientColors.end)

    ctx.fillStyle = gradientBg
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add white card background
    const cardPadding = 80
    const cardX = cardPadding
    const cardY = cardPadding
    const cardWidth = canvas.width - cardPadding * 2
    const cardHeight = canvas.height - cardPadding * 2

    ctx.fillStyle = "white"
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)"
    ctx.shadowBlur = 20
    ctx.shadowOffsetY = 10
    ctx.fillRect(cardX, cardY, cardWidth, cardHeight)
    ctx.shadowColor = "transparent"

    // Add template icon/circle
    const iconSize = 120
    const iconX = canvas.width / 2 - iconSize / 2
    const iconY = 200

    ctx.fillStyle = gradientColors.start
    ctx.beginPath()
    ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, 2 * Math.PI)
    ctx.fill()

    // Add template name
    ctx.fillStyle = "#1f2937"
    ctx.font = "bold 48px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(data.template.name, canvas.width / 2, 400)

    // Add "Recognition Award" subtitle
    ctx.fillStyle = "#6b7280"
    ctx.font = "32px Arial, sans-serif"
    ctx.fillText("Recognition Award", canvas.width / 2, 450)

    // Add recipient name
    ctx.fillStyle = "#1f2937"
    drawScaledText(ctx, data.recipientName, canvas.width / 2, 600, cardWidth - 40, 56, "Arial, sans-serif")

    // Add designation
    ctx.fillStyle = "#6b7280"
    ctx.font = "36px Arial, sans-serif"
    ctx.fillText(data.designation, canvas.width / 2, 650)

    // Add message (with text wrapping)
    ctx.fillStyle = "#374151"
    ctx.font = "italic 32px Arial, sans-serif"
    wrapText(ctx, data.message, canvas.width / 2, 750, cardWidth - 160, 40)

    // Add creator info at bottom
    ctx.fillStyle = "#9ca3af"
    ctx.font = "28px Arial, sans-serif"
    ctx.fillText(`Recognized by: ${data.creatorName}`, canvas.width / 2, 1150)
    ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, 1200)
  }

  // Draw company logo at top-center if provided
  if (data.template.logoBlob) {
    const logoImg = new Image()
    logoImg.crossOrigin = "anonymous"

    await new Promise((resolve, reject) => {
      logoImg.onload = resolve
      logoImg.onerror = reject
      logoImg.src = data.template.logoBlob as string
    })

    // Logo size: 80x80px, centered horizontally, 30px from top
    const logoSize = 80
    const logoX = canvas.width / 2 - logoSize / 2
    const logoY = 30

    // Draw circular frame for logo
    ctx.save()
    ctx.beginPath()
    ctx.arc(canvas.width / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = "#ffffff"
    ctx.fill()
    ctx.restore()

    // Draw logo image clipped to circle
    ctx.save()
    ctx.beginPath()
    ctx.arc(canvas.width / 2, logoY + logoSize / 2, logoSize / 2 - 3, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
    ctx.restore()
  }
}

async function generateAgilityChampion(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: KudosCardData,
): Promise<void> {
  try {
    const backgroundImg = new Image()
    backgroundImg.crossOrigin = "anonymous"

    await new Promise((resolve, reject) => {
      backgroundImg.onload = resolve
      backgroundImg.onerror = reject
      if (data.recipientType === "team") {
        backgroundImg.src = "/images/agility-champions.png"
      } else {
        backgroundImg.src = "/images/agility-champion.png"
      }
    })

    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height)
  } catch (error) {
    // Fallback to gradient background if image not found
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, "#8b5cf6")
    gradient.addColorStop(1, "#7c3aed")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const poppinsFont = "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

  // Draw trophy
  const trophyImg = new Image()
  trophyImg.crossOrigin = "anonymous"
  await new Promise((resolve, reject) => {
    trophyImg.onload = resolve
    trophyImg.onerror = reject
    trophyImg.src = "/images/agility-trophy.png"
  })

  // Draw employee photo or team grid (Draw BEFORE trophy for correct layering)
  if (data.images && data.images.length > 1) {
    await drawTeamPhotos(ctx, data, 500, 450, 400, 400, 20)
  } else {
    // Single image fallback (either data.image or data.images[0])
    const file = data.image || (data.images && data.images[0]) || null;
    await drawEmployeePhoto(ctx, { ...data, image: file }, 500, 450, 400, 400, 20)
  }

  const trophyWidth = 990
  const trophyHeight = 1300
  ctx.drawImage(trophyImg, 0, 20, trophyWidth, trophyHeight)

  // Draw content
  ctx.fillStyle = "#ffffff"
  drawScaledText(ctx, data.recipientName.toUpperCase(), canvas.width / 2, 960, 1000, 56, poppinsFont)

  ctx.fillStyle = "#ffffff"
  ctx.font = `400 32px ${poppinsFont}`
  wrapText(ctx, data.message, canvas.width / 2, 1040, 800, 45)

  ctx.fillStyle = "#ffffff"
  ctx.font = `400 24px ${poppinsFont}`
  ctx.fillText(`Recognized by: ${data.creatorName}`, canvas.width / 2, 1220)
  ctx.fillText(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    canvas.width / 2,
    1260,
  )
}

async function generateContinuousImprovementChampion(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: KudosCardData,
): Promise<void> {
  try {
    const backgroundImg = new Image()
    backgroundImg.crossOrigin = "anonymous"

    await new Promise((resolve, reject) => {
      backgroundImg.onload = resolve
      backgroundImg.onerror = reject
      if (data.recipientType === "team") {
        backgroundImg.src = "/images/continuous-improvement-champions.png"
      } else {
        backgroundImg.src = "/images/continuous-improvement-champion.png"
      }
    })

    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height)
  } catch (error) {
    // Fallback to gradient background if image not found
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, "#10b981")
    gradient.addColorStop(1, "#059669")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const poppinsFont = "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

  const trophyImg = new Image()
  trophyImg.crossOrigin = "anonymous"
  await new Promise((resolve, reject) => {
    trophyImg.onload = resolve
    trophyImg.onerror = reject
    trophyImg.src = "/images/continuous-trophy.png"
  })

  // Draw BEFORE trophy
  if (data.images && data.images.length > 1) {
      await drawTeamPhotos(ctx, data, 500, 450, 400, 400, 20)
  } else {
      const file = data.image || (data.images && data.images[0]) || null;
      await drawEmployeePhoto(ctx, { ...data, image: file }, 500, 450, 400, 400, 20)
  }

  ctx.drawImage(trophyImg, 0, 20, 990, 1300)

  ctx.fillStyle = "#ffffff"
  drawScaledText(ctx, data.recipientName.toUpperCase(), canvas.width / 2, 960, 1000, 56, poppinsFont)

  ctx.fillStyle = "#ffffff"
  ctx.font = `400 32px ${poppinsFont}`
  wrapText(ctx, data.message, canvas.width / 2, 1040, 800, 45)

  ctx.fillStyle = "#ffffff"
  ctx.font = `400 24px ${poppinsFont}`
  ctx.fillText(`Recognized by: ${data.creatorName}`, canvas.width / 2, 1220)
  ctx.fillText(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    canvas.width / 2,
    1260,
  )
}

async function generateCollaborationChampion(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: KudosCardData,
): Promise<void> {
  try {
    const backgroundImg = new Image()
    backgroundImg.crossOrigin = "anonymous"

    await new Promise((resolve, reject) => {
      backgroundImg.onload = resolve
      backgroundImg.onerror = reject
      if (data.recipientType === "team") {
        backgroundImg.src = "/images/collaboration-champions.png"
      } else {
        backgroundImg.src = "/images/collaboration-champion.png"
      }
    })

    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height)
  } catch (error) {
    // Fallback to gradient background if image not found
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, "#f97316")
    gradient.addColorStop(1, "#ea580c")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const poppinsFont = "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

  const trophyImg = new Image()
  trophyImg.crossOrigin = "anonymous"
  await new Promise((resolve, reject) => {
    trophyImg.onload = resolve
    trophyImg.onerror = reject
    trophyImg.src = "/images/collaboration-trophy.png"
  })

  // Draw BEFORE trophy
  if (data.images && data.images.length > 1) {
      await drawTeamPhotos(ctx, data, 500, 450, 400, 400, 20)
  } else {
      const file = data.image || (data.images && data.images[0]) || null;
      await drawEmployeePhoto(ctx, { ...data, image: file }, 500, 450, 400, 400, 20)
  }

  ctx.drawImage(trophyImg, 0, 20, 990, 1300)

  ctx.fillStyle = "#ffffff"
  drawScaledText(ctx, data.recipientName.toUpperCase(), canvas.width / 2, 960, 1000, 56, poppinsFont)

  ctx.fillStyle = "#ffffff"
  ctx.font = `400 32px ${poppinsFont}`
  wrapText(ctx, data.message, canvas.width / 2, 1040, 800, 45)

  ctx.fillStyle = "#ffffff"
  ctx.font = `400 24px ${poppinsFont}`
  ctx.fillText(`Recognized by: ${data.creatorName}`, canvas.width / 2, 1220)
  ctx.fillText(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    canvas.width / 2,
    1260,
  )
}

async function generateAccountabilityChampion(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: KudosCardData,
): Promise<void> {
  try {
    const backgroundImg = new Image()
    backgroundImg.crossOrigin = "anonymous"

    await new Promise((resolve, reject) => {
      backgroundImg.onload = resolve
      backgroundImg.onerror = reject
      if (data.recipientType === "team") {
        backgroundImg.src = "/images/accountability-champions.png"
      } else {
        backgroundImg.src = "/images/accountability-champion.png"
      }
    })

    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height)
  } catch (error) {
    // Fallback to gradient background if image not found
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, "#ef4444")
    gradient.addColorStop(1, "#dc2626")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const poppinsFont = "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

  const trophyImg = new Image()
  trophyImg.crossOrigin = "anonymous"
  await new Promise((resolve, reject) => {
    trophyImg.onload = resolve
    trophyImg.onerror = reject
    trophyImg.src = "/images/accountability-trophy.png"
  })

  // Draw BEFORE trophy - Adding missing team logic for Accountability
  if (data.images && data.images.length > 1) {
       await drawTeamPhotos(ctx, data, 500, 450, 400, 400, 20)
  } else {
       const file = data.image || (data.images && data.images[0]) || null;
       await drawEmployeePhoto(ctx, { ...data, image: file }, 500, 450, 400, 400, 20)
  }

  ctx.drawImage(trophyImg, 0, 20, 990, 1300)

  ctx.fillStyle = "#ffffff"
  drawScaledText(ctx, data.recipientName.toUpperCase(), canvas.width / 2, 960, 1000, 56, poppinsFont)

  ctx.fillStyle = "#ffffff"
  ctx.font = `400 32px ${poppinsFont}`
  wrapText(ctx, data.message, canvas.width / 2, 1040, 800, 45)

  ctx.fillStyle = "#ffffff"
  ctx.font = `400 24px ${poppinsFont}`
  ctx.fillText(`Recognized by: ${data.creatorName}`, canvas.width / 2, 1220)
  ctx.fillText(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    canvas.width / 2,
    1260,
  )
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, points: number): void {
  const angle = Math.PI / points
  ctx.beginPath()
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.5
    const currX = x + Math.cos(i * angle - Math.PI / 2) * r
    const currY = y + Math.sin(i * angle - Math.PI / 2) * r
    if (i === 0) {
      ctx.moveTo(currX, currY)
    } else {
      ctx.lineTo(currX, currY)
    }
  }
  ctx.closePath()
  ctx.fill()
}

function getGradientColors(gradientClass: string): { start: string; end: string } {
  const gradientMap: Record<string, { start: string; end: string }> = {
    "from-blue-400 to-blue-600": { start: "#60a5fa", end: "#2563eb" },
    "from-green-400 to-green-600": { start: "#4ade80", end: "#16a34a" },
    "from-purple-400 to-purple-600": { start: "#a78bfa", end: "#9333ea" },
    "from-orange-400 to-orange-600": { start: "#fb923c", end: "#ea580c" },
    "from-red-400 to-red-600": { start: "#f87171", end: "#dc2626" },
  }

  return gradientMap[gradientClass] || { start: "#4ade80", end: "#16a34a" }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ")
  let line = ""
  let currentY = y

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " "
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY)
      line = words[n] + " "
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, currentY)
}

export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function drawEmployeePhoto(
  ctx: CanvasRenderingContext2D,
  data: KudosCardData,
  photoX: number,
  photoY: number,
  photoWidth: number,
  photoHeight: number,
  cornerRadius: number,
): Promise<void> {
  // White frame
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.roundRect(photoX - 10, photoY - 10, photoWidth + 20, photoHeight + 20, cornerRadius + 5)
  ctx.fill()

  // Photo area
  ctx.fillStyle = "#f3f4f6"
  ctx.beginPath()
  ctx.roundRect(photoX, photoY, photoWidth, photoHeight, cornerRadius)
  ctx.fill()

  if (data.image) {
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = URL.createObjectURL(data.image!)
      })

      ctx.save()
      ctx.beginPath()
      ctx.roundRect(photoX, photoY, photoWidth, photoHeight, cornerRadius)
      ctx.clip()

      const imgAspect = img.width / img.height
      const frameAspect = photoWidth / photoHeight

      let drawWidth, drawHeight, drawX, drawY

      if (imgAspect > frameAspect) {
        drawHeight = photoHeight
        drawWidth = drawHeight * imgAspect
        drawX = photoX - (drawWidth - photoWidth) / 2
        drawY = photoY
      } else {
        drawWidth = photoWidth
        drawHeight = drawWidth / imgAspect
        drawX = photoX
        drawY = photoY - (drawHeight - photoHeight) / 2
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
      ctx.restore()
    } catch (error) {
      console.error("Error loading user image:", error)
      ctx.fillStyle = "#9ca3af"
      ctx.font = "400 48px Poppins, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("👤", photoX + photoWidth / 2, photoY + photoHeight / 2 + 15)
    }
  } else {
    ctx.fillStyle = "#9ca3af"
    ctx.font = "400 48px Poppins, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("👤", photoX + photoWidth / 2, photoY + photoHeight / 2 + 15)
  }
}

/**
 * Computes cell positions for a smart mosaic layout based on image count.
 *
 * Layouts (gap = 4px between cells):
 *   1  → full frame
 *   2  → 50 | 50
 *   3  → 60 left | 40 right (2 stacked)
 *   4  → 2 rows × 2 cols
 *   5  → row of 2  +  row of 3
 *   6  → 2 rows × 3 cols
 *   7  → row of 3  +  row of 4
 *   8  → 2 rows × 4 cols
 *   9  → 3 rows × 3 cols
 *  10  → 3+4+3 rows
 *  11  → 4+4+3 rows
 *  12  → 3 rows × 4 cols
 *  13  → 4+5+4 rows
 *  14  → 5+4+5 rows
 *  15  → 3 rows × 5 cols
 * 16+  → auto square grid (ceil(√n) cols)
 */
function computePhotoCells(
  count: number,
  x: number, y: number,
  width: number, height: number,
  gap: number
): Array<{ x: number; y: number; w: number; h: number }> {
  type Cell = { x: number; y: number; w: number; h: number };
  const cells: Cell[] = [];

  const rowOf = (n: number, rowX: number, rowY: number, rowW: number, rowH: number) => {
    const cellW = (rowW - (n - 1) * gap) / n;
    for (let i = 0; i < n; i++) {
      cells.push({ x: rowX + i * (cellW + gap), y: rowY, w: cellW, h: rowH });
    }
  };

  if (count === 1) {
    cells.push({ x, y, w: width, h: height });

  } else if (count === 2) {
    rowOf(2, x, y, width, height);

  } else if (count === 3) {
    const wLeft = (width - gap) * 0.6;
    const wRight = width - wLeft - gap;
    const hRight = (height - gap) / 2;
    cells.push({ x, y, w: wLeft, h: height });
    cells.push({ x: x + wLeft + gap, y, w: wRight, h: hRight });
    cells.push({ x: x + wLeft + gap, y: y + hRight + gap, w: wRight, h: hRight });

  } else if (count === 4) {
    const h = (height - gap) / 2;
    rowOf(2, x, y, width, h);
    rowOf(2, x, y + h + gap, width, h);

  } else if (count === 5) {
    // 2 on top, 3 on bottom
    const h = (height - gap) / 2;
    rowOf(2, x, y, width, h);
    rowOf(3, x, y + h + gap, width, h);

  } else if (count === 6) {
    // 3 on top, 3 on bottom
    const h = (height - gap) / 2;
    rowOf(3, x, y, width, h);
    rowOf(3, x, y + h + gap, width, h);

  } else if (count === 7) {
    // 3 on top, 4 on bottom
    const h = (height - gap) / 2;
    rowOf(3, x, y, width, h);
    rowOf(4, x, y + h + gap, width, h);

  } else if (count === 8) {
    // 4 on top, 4 on bottom
    const h = (height - gap) / 2;
    rowOf(4, x, y, width, h);
    rowOf(4, x, y + h + gap, width, h);

  } else if (count === 9) {
    // 3×3 grid
    const h = (height - 2 * gap) / 3;
    rowOf(3, x, y, width, h);
    rowOf(3, x, y + h + gap, width, h);
    rowOf(3, x, y + 2 * (h + gap), width, h);

  } else if (count === 10) {
    // 3 + 4 + 3
    const h = (height - 2 * gap) / 3;
    rowOf(3, x, y, width, h);
    rowOf(4, x, y + h + gap, width, h);
    rowOf(3, x, y + 2 * (h + gap), width, h);

  } else if (count === 11) {
    // 4 + 4 + 3
    const h = (height - 2 * gap) / 3;
    rowOf(4, x, y, width, h);
    rowOf(4, x, y + h + gap, width, h);
    rowOf(3, x, y + 2 * (h + gap), width, h);

  } else if (count === 12) {
    // 3 rows × 4 cols
    const h = (height - 2 * gap) / 3;
    rowOf(4, x, y, width, h);
    rowOf(4, x, y + h + gap, width, h);
    rowOf(4, x, y + 2 * (h + gap), width, h);

  } else if (count === 13) {
    // 4 + 5 + 4
    const h = (height - 2 * gap) / 3;
    rowOf(4, x, y, width, h);
    rowOf(5, x, y + h + gap, width, h);
    rowOf(4, x, y + 2 * (h + gap), width, h);

  } else if (count === 14) {
    // 5 + 4 + 5
    const h = (height - 2 * gap) / 3;
    rowOf(5, x, y, width, h);
    rowOf(4, x, y + h + gap, width, h);
    rowOf(5, x, y + 2 * (h + gap), width, h);

  } else if (count === 15) {
    // 3 rows × 5 cols
    const h = (height - 2 * gap) / 3;
    rowOf(5, x, y, width, h);
    rowOf(5, x, y + h + gap, width, h);
    rowOf(5, x, y + 2 * (h + gap), width, h);

  } else {
    // 16+ → auto square grid
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = (width - (cols - 1) * gap) / cols;
    const cellH = (height - (rows - 1) * gap) / rows;
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      cells.push({ x: x + col * (cellW + gap), y: y + row * (cellH + gap), w: cellW, h: cellH });
    }
  }

  return cells;
}

async function drawTeamPhotos(
  ctx: CanvasRenderingContext2D,
  data: KudosCardData,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number
): Promise<void> {
    if (!data.images || data.images.length === 0) return;

    ctx.save(); // Save state before clipping

    // White frame
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.roundRect(x - 10, y - 10, width + 20, height + 20, cornerRadius + 5)
    ctx.fill()

    // Photo area background
    ctx.fillStyle = "#f3f4f6"
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, cornerRadius)
    ctx.fill()
    ctx.clip() // Clip everything to the main rounded rect

    const count = Math.min(data.images.length, 15); // Support up to 15 team photos
    const imagesToDraw = data.images.slice(0, count);
    const loadedImages: HTMLImageElement[] = [];

    // Load all images
    for (const file of imagesToDraw) {
        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });
            loadedImages.push(img);
        } catch (e) {
            console.error("Failed to load one of team images", e);
        }
    }

    if (loadedImages.length === 0) {
        ctx.restore();
        return;
    }

    const gap = 4;
    const cells = computePhotoCells(loadedImages.length, x, y, width, height, gap);

    for (let i = 0; i < loadedImages.length; i++) {
        const cell = cells[i];
        await drawImageCover(ctx, loadedImages[i], cell.x, cell.y, cell.w, cell.h);
    }

    ctx.restore(); // Restore context to remove clipping
}

export async function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const imgAspect = img.width / img.height;
    const areaAspect = w / h;

    let drawWidth, drawHeight, drawX, drawY;

    if (imgAspect > areaAspect) {
        drawHeight = h;
        drawWidth = drawHeight * imgAspect;
        drawX = x - (drawWidth - w) / 2;
        drawY = y;
    } else {
        drawWidth = w;
        drawHeight = drawWidth / imgAspect;
        drawX = x;
        drawY = y - (drawHeight - h) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
}

function drawScaledText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  initialFontSize: number,
  fontFamily: string
) {
  ctx.textAlign = "center"
  // ctx.fillStyle is assumed to be set before calling this function
  
  let fontSize = initialFontSize
  ctx.font = `700 ${fontSize}px ${fontFamily}`
  
  // Measure width
  let width = ctx.measureText(text).width
  
  // Scale down if too wide, but don't go below 24px
  while (width > maxWidth && fontSize > 24) {
      fontSize -= 2
      ctx.font = `700 ${fontSize}px ${fontFamily}`
      width = ctx.measureText(text).width
  }
  
  ctx.fillText(text, centerX, y)
}

