interface KudosCardData {
  template: {
    id: string
    name: string
    color: string
    gradient: string
    icon: string
  }
  recipientName: string
  designation: string
  message: string
  creatorName: string
  image?: File | null
  images?: File[] | null
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
    backgroundImg.src = "/images/customer-centric-champion.png"
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
  ctx.fillStyle = "#ffffff"
  ctx.font = `700 56px ${poppinsFont}`
  ctx.textAlign = "center"
  ctx.fillText(data.recipientName.toUpperCase(), canvas.width / 2, 960)

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
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)

  // Parse gradient colors from template
  const gradientColors = getGradientColors(data.template.gradient)
  gradient.addColorStop(0, gradientColors.start)
  gradient.addColorStop(1, gradientColors.end)

  ctx.fillStyle = gradient
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
  ctx.font = "bold 56px Arial, sans-serif"
  ctx.fillText(data.recipientName, canvas.width / 2, 600)

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
      backgroundImg.src = "/images/agility-champion.png"
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

  const trophyWidth = 990
  const trophyHeight = 1300
  ctx.drawImage(trophyImg, 0, 20, trophyWidth, trophyHeight)

  // Draw employee photo or team grid
  if (data.images && data.images.length > 1) {
    await drawTeamPhotos(ctx, data, 500, 450, 400, 400, 20)
  } else {
    // Single image fallback (either data.image or data.images[0])
    // Ensure we handle the case where data.image might be null but data.images has 1 file
    const file = data.image || (data.images && data.images[0]) || null;
    // Create a temp data object with just the single file for the helper
    await drawEmployeePhoto(ctx, { ...data, image: file }, 500, 450, 400, 400, 20)
  }

  // Draw content
  ctx.fillStyle = "#ffffff"
  ctx.font = `700 56px ${poppinsFont}`
  ctx.textAlign = "center"
  ctx.fillText(data.recipientName.toUpperCase(), canvas.width / 2, 960)

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
      backgroundImg.src = "/images/continuous-improvement-champion.png"
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

  ctx.drawImage(trophyImg, 0, 20, 990, 1300)
  
  if (data.images && data.images.length > 1) {
      await drawTeamPhotos(ctx, data, 500, 450, 400, 400, 20)
  } else {
      const file = data.image || (data.images && data.images[0]) || null;
      await drawEmployeePhoto(ctx, { ...data, image: file }, 500, 450, 400, 400, 20)
  }

  ctx.fillStyle = "#ffffff"
  ctx.font = `700 56px ${poppinsFont}`
  ctx.textAlign = "center"
  ctx.fillText(data.recipientName.toUpperCase(), canvas.width / 2, 960)

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
      backgroundImg.src = "/images/collaboration-champion.png"
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

  ctx.drawImage(trophyImg, 0, 20, 990, 1300)
  
  if (data.images && data.images.length > 1) {
      await drawTeamPhotos(ctx, data, 500, 450, 400, 400, 20)
  } else {
      const file = data.image || (data.images && data.images[0]) || null;
      await drawEmployeePhoto(ctx, { ...data, image: file }, 500, 450, 400, 400, 20)
  }

  ctx.fillStyle = "#ffffff"
  ctx.font = `700 56px ${poppinsFont}`
  ctx.textAlign = "center"
  ctx.fillText(data.recipientName.toUpperCase(), canvas.width / 2, 960)

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
      backgroundImg.src = "/images/accountability-champion.png"
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

  ctx.drawImage(trophyImg, 0, 20, 990, 1300)
  await drawEmployeePhoto(ctx, data, 500, 450, 400, 400, 20)

  ctx.fillStyle = "#ffffff"
  ctx.font = `700 56px ${poppinsFont}`
  ctx.textAlign = "center"
  ctx.fillText(data.recipientName.toUpperCase(), canvas.width / 2, 960)

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

    const count = Math.min(data.images.length, 4); // Handle up to 4 for now (2x2)
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

    /*
      Layouts:
      2: Split Vertical (Left | Right)
      3: One Big Left, Two Small Stacked Right
      4: 2x2 Grid
    */

    const gap = 4; // Gap between images
    
    if (loadedImages.length === 2) {
        const w = (width - gap) / 2;
        await drawImageCover(ctx, loadedImages[0], x, y, w, height);
        await drawImageCover(ctx, loadedImages[1], x + w + gap, y, w, height);
    } else if (loadedImages.length === 3) {
        const wLeft = (width - gap) * 0.6; // Left image slightly larger
        const wRight = width - wLeft - gap;
        const hRight = (height - gap) / 2;
        
        await drawImageCover(ctx, loadedImages[0], x, y, wLeft, height);
        await drawImageCover(ctx, loadedImages[1], x + wLeft + gap, y, wRight, hRight);
        await drawImageCover(ctx, loadedImages[2], x + wLeft + gap, y + hRight + gap, wRight, hRight);
    } else { 
        // 4 or more -> 2x2 Grid
        const w = (width - gap) / 2;
        const h = (height - gap) / 2;
        
        await drawImageCover(ctx, loadedImages[0], x, y, w, h);
        await drawImageCover(ctx, loadedImages[1], x + w + gap, y, w, h);
        await drawImageCover(ctx, loadedImages[2], x, y + h + gap, w, h);
        await drawImageCover(ctx, loadedImages[3], x + w + gap, y + h + gap, w, h);
    }

    ctx.restore(); // Restore context to remove clipping
}

async function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
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
    ctx.restore();
}
