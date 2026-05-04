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
 
    // Set canvas dimensions (1920x1080px - 16:9 ratio for landscape)
    canvas.width = 1920
    canvas.height = 1080
 
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
function computeMessageFont(
  ctx: CanvasRenderingContext2D,
  message: string,
  maxWidth: number,
  availableHeight: number,
  fontFamily: string,
  startFontSize = 30,
  minFontSize = 22,
): { fontSize: number; lineHeight: number; lineCount: number } {
  let fontSize = startFontSize
  let lineHeight = Math.floor(fontSize * 1.5)
  let lineCount = 0
 
  while (fontSize >= minFontSize) {
    lineHeight = Math.floor(fontSize * 1.5)
    ctx.font = `400 ${fontSize}px ${fontFamily}`
    lineCount = measureTextLines(ctx, message || "", maxWidth)
    if (lineCount * lineHeight <= availableHeight) break
    fontSize -= 2
  }
 
  if (fontSize < minFontSize) {
    fontSize = minFontSize
    lineHeight = Math.floor(fontSize * 1.5)
    ctx.font = `400 ${fontSize}px ${fontFamily}`
    lineCount = measureTextLines(ctx, message || "", maxWidth)
  }
 
  return { fontSize, lineHeight, lineCount }
}
/**
 * Draws recipient name, message, and "Recognized by" footer.
 *
 * Strategy:
 *  - Footer (recognized-by + date) is pinned to canvas bottom with a fixed margin.
 *  - Name is placed a fixed gap below photoBottom.
 *  - Message occupies whatever space remains between name and footer.
 *  - Font size starts at startFontSize and only shrinks if the message won't fit —
 *    never below minFontSize.
 *  - When the message is SHORT, the footer naturally stays close below it
 *    because it's bottom-anchored rather than pushed down by blank space.
 */
function drawTextSection(
  ctx: CanvasRenderingContext2D,
  data: KudosCardData,
  cx: number,
  photoBottom: number,
  canvasHeight: number,
  msgMaxWidth: number,
  poppinsFont: string,
  nameSize = 48,
): void {
  // ── Fixed layout constants ──────────────────────────────────────────────
  const isTeam = (data.images && data.images.length > 1) || data.recipientType === "team"
  const NAME_TOP_GAP = isTeam ? 45 : 70   // team: pull up (but give a bit of breathing room), individual: push down
  const NAME_MSG_GAP = 5  // px between name baseline and first message line
  const MSG_FOOTER_GAP = 16  // minimum px between last message line and footer
  const FOOTER_LINE_H = 20 // px bet25ween "Recognized by" and date lines
  const hasDoubleRow = data.images && data.images.length > 6
  const FOOTER_BOTTOM = hasDoubleRow ? 20 : 40   // less bottom margin when 2 rows of photos
  const FOOTER_SIZE = 20   // px, footer font size — never changes
  const nameY = photoBottom + NAME_TOP_GAP
 
  const msgTop = nameY + nameSize + NAME_MSG_GAP
  // When space is very tight (2-row team photo), shrink limits automatically
  const availableForEverything = canvasHeight - FOOTER_BOTTOM - FOOTER_LINE_H - msgTop
  const tightLayout = availableForEverything < 200
  const MAX_MSG_SIZE = tightLayout ? 24 : 30
  const MIN_MSG_SIZE = tightLayout ? 24 : 28
 
  // ── Vertical anchors ────────────────────────────────────────────────────
  // Footer is bottom-anchored regardless of message length.
  const dateY = canvasHeight - FOOTER_BOTTOM
  const recognizedY = dateY - FOOTER_LINE_H
 
 
 
  // Space the message can occupy before it would collide with the footer gap.
  const maxMsgHeight = recognizedY - MSG_FOOTER_GAP - msgTop
 
  // ── Fit message font into available height ──────────────────────────────
  let fontSize = MAX_MSG_SIZE
  let lineHeight = Math.floor(fontSize * 1.55)
  let lineCount = 1
 
  for (let fs = MAX_MSG_SIZE; fs >= MIN_MSG_SIZE; fs -= 2) {
    const lh = Math.floor(fs * 1.55)
    ctx.font = `400 ${fs}px ${poppinsFont}`
    const lc = measureTextLines(ctx, data.message || "", msgMaxWidth)
    if (lc * lh <= maxMsgHeight) {
      fontSize = fs
      lineHeight = lh
      lineCount = lc
      break
    }
    // keep going — at MIN_MSG_SIZE we just accept whatever fits
    if (fs === MIN_MSG_SIZE) {
      fontSize = MIN_MSG_SIZE
      lineHeight = Math.floor(MIN_MSG_SIZE * 1.55)
      lineCount = lc
    }
  }
 
  const msgHeight = lineCount * lineHeight
 
  // ── For short messages: nudge footer UP to stay visually close ──────────
  // Instead of leaving a big gap between message end and the bottom-anchored
  // footer, we compute where the footer *would* sit if placed just below the
  // message, then pick whichever Y is higher (closer to the message).
  const naturalFooterY = msgTop + msgHeight + MSG_FOOTER_GAP + FOOTER_LINE_H
  const bottomAnchorY = recognizedY   // the canvas-bottom-anchored position
 
  // Use the minimum (higher on canvas) of the two, but never above a safe floor
  // so short messages don't push the footer into the photo area.
  const safeFloorY = nameY + nameSize + 50   // at least this far below name
  const finalRecognizedY = Math.max(
    safeFloorY,
    Math.min(naturalFooterY, bottomAnchorY)
  )
  const clampedRecognizedY = Math.min(finalRecognizedY, canvasHeight - FOOTER_BOTTOM - FOOTER_LINE_H)
 
  const finalDateY = finalRecognizedY + FOOTER_LINE_H
 
  // ── Draw name ───────────────────────────────────────────────────────────
  ctx.fillStyle = "#ffffff"
  ctx.textAlign = "center"
  drawScaledText(ctx, data.recipientName, cx, nameY, msgMaxWidth, nameSize, poppinsFont)
 
  // ── Draw message ────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.85)"
  ctx.font = `400 ${fontSize}px ${poppinsFont}`
  ctx.textAlign = "center"
  wrapText(ctx, data.message || "", cx, msgTop, msgMaxWidth, lineHeight)
 
  // ── Draw footer ─────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.75)"
  ctx.font = `400 ${FOOTER_SIZE}px ${poppinsFont}`
  ctx.textAlign = "center"
  ctx.fillText(`Recognized by: ${data.creatorName}`, cx, clampedRecognizedY)  // was finalRecognizedY
  ctx.fillText(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    cx,
    finalDateY,
  )
}
function measureTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): number {
  const words = text.split(" ")
  let line = ""
  let lineCount = 0
 
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " "
    const width = ctx.measureText(testLine).width
 
    if (width > maxWidth && n > 0) {
      line = words[n] + " "
      lineCount++
    } else {
      line = testLine
    }
  }
 
  return lineCount + 1
}
 
function drawSmartLandscapeBackground(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number,
  isTeam?: boolean
): void {
  // 1. Draw stretched so the side borders are neatly on the edges.
  ctx.drawImage(img, 0, 0, canvasW, canvasH);
 
  // 8% preserves side decor without hitting the text.
  const edgeRatio = 0.08;
  const srcBorderW = Math.floor(img.width * edgeRatio);
  const srcInnerW = img.width - (srcBorderW * 2);
 
  const destBorderW = Math.floor(canvasW * edgeRatio);
  const destInnerW = canvasW - (destBorderW * 2);
 
  // Proportionally scale the heading block together.
  // Scaled at 1.05 (instead of 1.15) to prevent overlap with individual avatar
  // while still looking bold and beautiful in both views.
  const scale = 1.05;
  const headingSrcH = Math.floor(img.height * 0.40);
  const destHeadingW = Math.floor(srcInnerW * scale);
  const destHeadingH = Math.floor(headingSrcH * scale);
  const destHeadingX = Math.floor((canvasW - destHeadingW) / 2);
  const destHeadingY = 0; // Stamp right at the top
 
  // 3. Cover the stretched text underneath with a clean dark patch
  // sampled from lower empty space to prevent ghosting.
  const cleanSrcY = Math.floor(img.height * 0.55);
  const cleanSrcH = Math.floor(img.height * 0.3);
  const coverDestH = Math.floor(destHeadingH + 30); // Cover just below the heading
 
  ctx.drawImage(
    img,
    srcBorderW, cleanSrcY, srcInnerW, cleanSrcH,
    destBorderW, 0, destInnerW, coverDestH
  );
 
  // 4. Stomp perfectly proportioned heading over the patch
  ctx.drawImage(
    img,
    srcBorderW, 0, srcInnerW, headingSrcH,
    destHeadingX, destHeadingY, destHeadingW, destHeadingH
  );
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
 
  // Draw background cleanly without stretching text
  drawSmartLandscapeBackground(ctx, backgroundImg, canvas.width, canvas.height, data.recipientType === "team")
 
  // Set Poppins font (fallback to system fonts)
  const poppinsFont = "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
 
  const trophyImg = new Image()
  trophyImg.crossOrigin = "anonymous"
 
  await new Promise((resolve, reject) => {
    trophyImg.onload = resolve
    trophyImg.onerror = reject
    trophyImg.src = "/images/customer-trophy.png"
  })
 
  // Centre photo in lower empty dark space (below background title graphics)
  const cx = canvas.width / 2          // horizontal centre = 960
  const isTeam = (data.images && data.images.length > 1) || data.recipientType === "team"
  const photoY = 420
  let photoBottom: number
 
  if (isTeam) {
    // Circular avatars – no rectangular frame needed
    const consumed = await drawCircularTeamAvatars(ctx, data, cx, photoY, 1700, "#4ade80")
    photoBottom = photoY + consumed
  } else {
    const radius = 160
    const centerY = 580
 
    // Green outer ring
    ctx.beginPath()
    ctx.arc(cx, centerY, radius + 10, 0, Math.PI * 2)
    ctx.fillStyle = "#4ade80"
    ctx.fill()
 
    // Inner background
    ctx.beginPath()
    ctx.arc(cx, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = "#f3f4f6"
    ctx.fill()
 
    // Clip for image
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, centerY, radius, 0, Math.PI * 2)
    ctx.clip()
 
    const file = data.image || (data.images && data.images[0]) || null
 
    if (file) {
      const img = new Image()
      img.crossOrigin = "anonymous"
 
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
 
      const size = radius * 2
      ctx.drawImage(img, cx - radius, centerY - radius, size, size)
    } else {
      ctx.fillStyle = "#9ca3af"
      ctx.font = "60px Poppins"
      ctx.textAlign = "center"
      ctx.fillText("👤", cx, centerY + 20)
    }
 
    ctx.restore()
 
    // IMPORTANT
    // IMPORTANT — add extra padding so name doesn't overlap the circle
    photoBottom = centerY + radius + 20
  }
 
  // Trophy – small, tucked into bottom-left corner so it doesn't block the text
  const trophyWidth = isTeam ? 325 : 325
  const trophyHeight = isTeam ? 280 : 280
 
  const rightOffset = isTeam ? 350 : 350 // right side
  const trophyY = isTeam ? 160 : 128    // near heading
  const trophyX = canvas.width - trophyWidth - rightOffset
 
  ctx.save()
 
  // Move origin to center of image
  ctx.translate(
    trophyX + trophyWidth / 2,
    trophyY + trophyHeight / 2
  )
 
  // Rotate (in radians)
  ctx.rotate(0.2)   // 👉 tilt right
 
  // Draw image centered
  ctx.drawImage(
    trophyImg,
    -trophyWidth / 2,
    -trophyHeight / 2,
    trophyWidth,
    trophyHeight
  )
 
  ctx.restore()  // Recipient name, message and footer – all centred
 
  drawTextSection(ctx, data, cx, photoBottom, canvas.height, 1000, poppinsFont, 48)
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
    ctx.fillText(data.template.name, canvas.width / 2, 300)
 
    // Add "Recognition Award" subtitle
    ctx.fillStyle = subtitleColor
    ctx.font = "32px Arial, sans-serif"
    ctx.fillText("Recognition Award", canvas.width / 2, 350)
 
    // Add recipient name
    ctx.fillStyle = textColor
    drawScaledText(ctx, data.recipientName, canvas.width / 2, 500, canvas.width - 160, 56, "Arial, sans-serif")
 
    // Add designation
    ctx.fillStyle = subtitleColor
    ctx.font = "36px Arial, sans-serif"
    ctx.fillText(data.designation, canvas.width / 2, 550)
 
    // Add message (with text wrapping)
    ctx.fillStyle = textColor
    ctx.font = "italic 32px Arial, sans-serif"
    wrapText(ctx, data.message, canvas.width / 2, 650, canvas.width - 160, 40)
 
    // Add creator info at bottom
    ctx.fillStyle = "#d1d5db"
    ctx.font = "28px Arial, sans-serif"
    ctx.fillText(`Recognized by: ${data.creatorName}`, canvas.width / 2, 900)
    ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, 950)
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
    const iconY = 150
 
    ctx.fillStyle = gradientColors.start
    ctx.beginPath()
    ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, 2 * Math.PI)
    ctx.fill()
 
    // Add template name
    ctx.fillStyle = "#1f2937"
    ctx.font = "bold 48px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(data.template.name, canvas.width / 2, 320)
 
    // Add "Recognition Award" subtitle
    ctx.fillStyle = "#6b7280"
    ctx.font = "32px Arial, sans-serif"
    ctx.fillText("Recognition Award", canvas.width / 2, 380)
 
    // Add recipient name
    ctx.fillStyle = "#1f2937"
    drawScaledText(ctx, data.recipientName, canvas.width / 2, 500, cardWidth - 40, 56, "Arial, sans-serif")
 
    // Add designation
    ctx.fillStyle = "#6b7280"
    ctx.font = "36px Arial, sans-serif"
    ctx.fillText(data.designation, canvas.width / 2, 560)
 
    // Add message (with text wrapping)
    ctx.fillStyle = "#374151"
    ctx.font = "italic 32px Arial, sans-serif"
    wrapText(ctx, data.message, canvas.width / 2, 650, cardWidth - 160, 40)
 
    // Add creator info at bottom
    ctx.fillStyle = "#9ca3af"
    ctx.font = "28px Arial, sans-serif"
    ctx.fillText(`Recognized by: ${data.creatorName}`, canvas.width / 2, 900)
    ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, 950)
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
 
    drawSmartLandscapeBackground(ctx, backgroundImg, canvas.width, canvas.height, data.recipientType === "team")
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
    trophyImg.src = "/images/customer-trophy.png"
  })
 
  const cx = canvas.width / 2
  const isTeam = (data.images && data.images.length > 1) || data.recipientType === "team"
  const photoY = 420
  let photoBottom: number
 
  if (isTeam) {
    const consumed = await drawCircularTeamAvatars(ctx, data, cx, photoY, 1700, "#4ade80")
    photoBottom = photoY + consumed
  } else {
    const radius = 160
    const centerY = 580
 
    // Green outer ring
    ctx.beginPath()
    ctx.arc(cx, centerY, radius + 10, 0, Math.PI * 2)
    ctx.fillStyle = "#4ade80"
    ctx.fill()
 
    // Inner background
    ctx.beginPath()
    ctx.arc(cx, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = "#f3f4f6"
    ctx.fill()
 
    // Clip for image
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, centerY, radius, 0, Math.PI * 2)
    ctx.clip()
 
    const file = data.image || (data.images && data.images[0]) || null
 
    if (file) {
      const img = new Image()
      img.crossOrigin = "anonymous"
 
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
 
      const size = radius * 2
      ctx.drawImage(img, cx - radius, centerY - radius, size, size)
    } else {
      ctx.fillStyle = "#9ca3af"
      ctx.font = "60px Poppins"
      ctx.textAlign = "center"
      ctx.fillText("👤", cx, centerY + 20)
    }
 
    ctx.restore()
 
    // IMPORTANT
    // IMPORTANT — add extra padding so name doesn't overlap the circle
    photoBottom = centerY + radius + 20
  }
 
  // Trophy – small, tucked into bottom-left corner so it doesn't block the text
  const trophyWidth = isTeam ? 310 : 310
  const trophyHeight = isTeam ? 265 : 280
 
  const rightOffset = isTeam ? 450 : 420 // team vs individual (your custom 420)
  const trophyY = isTeam ? 120 : 170     // team vs individual (your custom 170)
  const trophyX = canvas.width - trophyWidth - rightOffset
 
  ctx.save()
 
  // Move origin to center of image
  ctx.translate(
    trophyX + trophyWidth / 2,
    trophyY + trophyHeight / 2
  )
 
  // Rotate (in radians)
  ctx.rotate(0.2)   // 👉 tilt right
 
  // Draw image centered
  ctx.drawImage(
    trophyImg,
    -trophyWidth / 2,
    -trophyHeight / 2,
    trophyWidth,
    trophyHeight
  )
 
  ctx.restore()  // Recipient name, message and footer – all centred
 
  drawTextSection(ctx, data, cx, photoBottom, canvas.height, 1000, poppinsFont, 48)
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
 
    drawSmartLandscapeBackground(ctx, backgroundImg, canvas.width, canvas.height, data.recipientType === "team")
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
    trophyImg.src = "/images/customer-trophy.png"
  })
 
  const cx = canvas.width / 2
  const isTeam = (data.images && data.images.length > 1) || data.recipientType === "team"
  const photoY = 420
  let photoBottom: number
  if (isTeam) {
    const consumed = await drawCircularTeamAvatars(ctx, data, cx, photoY, 1700, "#4ade80")
    photoBottom = photoY + consumed
  } else {
    const radius = 160
    const centerY = 580
 
    // Green outer ring
    ctx.beginPath()
    ctx.arc(cx, centerY, radius + 10, 0, Math.PI * 2)
    ctx.fillStyle = "#4ade80"
    ctx.fill()
 
    // Inner background
    ctx.beginPath()
    ctx.arc(cx, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = "#f3f4f6"
    ctx.fill()
 
    // Clip for image
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, centerY, radius, 0, Math.PI * 2)
    ctx.clip()
 
    const file = data.image || (data.images && data.images[0]) || null
 
    if (file) {
      const img = new Image()
      img.crossOrigin = "anonymous"
 
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
 
      const size = radius * 2
      ctx.drawImage(img, cx - radius, centerY - radius, size, size)
    } else {
      ctx.fillStyle = "#9ca3af"
      ctx.font = "60px Poppins"
      ctx.textAlign = "center"
      ctx.fillText("👤", cx, centerY + 20)
    }
 
    ctx.restore()
 
    // IMPORTANT
    // IMPORTANT — add extra padding so name doesn't overlap the circle
    photoBottom = centerY + radius + 20
  }
 
  // Trophy – small, tucked into bottom-left corner so it doesn't block the text
  const trophyWidth = isTeam ? 310 : 310
  const trophyHeight = isTeam ? 270 : 270
 
  const rightOffset = isTeam ? 450 : 430 // team vs individual (your custom 430)
  const trophyY = isTeam ? 120 : 180     // team vs individual (your custom 180)
  const trophyX = canvas.width - trophyWidth - rightOffset
 
  ctx.save()
 
  // Move origin to center of image
  ctx.translate(
    trophyX + trophyWidth / 2,
    trophyY + trophyHeight / 2
  )
 
  // Rotate (in radians)
  ctx.rotate(0.2)   // 👉 tilt right
 
  // Draw image centered
  ctx.drawImage(
    trophyImg,
    -trophyWidth / 2,
    -trophyHeight / 2,
    trophyWidth,
    trophyHeight
  )
 
  ctx.restore()  // Recipient name, message and footer – all centred
 
  drawTextSection(ctx, data, cx, photoBottom, canvas.height, 1000, poppinsFont, 48)
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
 
    drawSmartLandscapeBackground(ctx, backgroundImg, canvas.width, canvas.height, data.recipientType === "team")
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
    trophyImg.src = "/images/customer-trophy.png"
  })
 
  const cx = canvas.width / 2
  const isTeam = (data.images && data.images.length > 1) || data.recipientType === "team"
  const photoY = 420
  let photoBottom: number
  if (isTeam) {
    const consumed = await drawCircularTeamAvatars(ctx, data, cx, photoY, 1700, "#4ade80")
    photoBottom = photoY + consumed
  } else {
    const radius = 160
    const centerY = 580
 
    // Green outer ring
    ctx.beginPath()
    ctx.arc(cx, centerY, radius + 10, 0, Math.PI * 2)
    ctx.fillStyle = "#4ade80"
    ctx.fill()
 
    // Inner background
    ctx.beginPath()
    ctx.arc(cx, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = "#f3f4f6"
    ctx.fill()
 
    // Clip for image
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, centerY, radius, 0, Math.PI * 2)
    ctx.clip()
 
    const file = data.image || (data.images && data.images[0]) || null
 
    if (file) {
      const img = new Image()
      img.crossOrigin = "anonymous"
 
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
 
      const size = radius * 2
      ctx.drawImage(img, cx - radius, centerY - radius, size, size)
    } else {
      ctx.fillStyle = "#9ca3af"
      ctx.font = "60px Poppins"
      ctx.textAlign = "center"
      ctx.fillText("👤", cx, centerY + 20)
    }
 
    ctx.restore()
 
    // IMPORTANT
    // IMPORTANT — add extra padding so name doesn't overlap the circle
    photoBottom = centerY + radius + 20
  }
 
  // Trophy – small, tucked into bottom-left corner so it doesn't block the text
  const trophyWidth = isTeam ? 330 : 330
  const trophyHeight = isTeam ? 296 : 296
 
  const rightOffset = isTeam ? 450 : 395 // team vs individual (your custom 388)
  const trophyY = isTeam ? 120 : 150     // team vs individual (your custom 150)
  const trophyX = canvas.width - trophyWidth - rightOffset
 
  ctx.save()
 
  // Move origin to center of image
  ctx.translate(
    trophyX + trophyWidth / 2,
    trophyY + trophyHeight / 2
  )
 
  // Rotate (in radians)
  ctx.rotate(0.2)   // 👉 tilt right
 
  // Draw image centered
  ctx.drawImage(
    trophyImg,
    -trophyWidth / 2,
    -trophyHeight / 2,
    trophyWidth,
    trophyHeight
  )
 
  ctx.restore()  // Recipient name, message and footer – all centred
 
  drawTextSection(ctx, data, cx, photoBottom, canvas.height, 1000, poppinsFont, 48)
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
 
    drawSmartLandscapeBackground(ctx, backgroundImg, canvas.width, canvas.height, data.recipientType === "team")
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
    trophyImg.src = "/images/customer-trophy.png"
  })
 
  const cx = canvas.width / 2
  const isTeam = (data.images && data.images.length > 1) || data.recipientType === "team"
  const photoY = 420
  let photoBottom: number
 
  if (isTeam) {
    const consumed = await drawCircularTeamAvatars(ctx, data, cx, photoY, 1700, "#4ade80")
    photoBottom = photoY + consumed
  } else {
    const radius = 160
    const centerY = 580
 
    // Green outer ring
    ctx.beginPath()
    ctx.arc(cx, centerY, radius + 10, 0, Math.PI * 2)
    ctx.fillStyle = "#4ade80"
    ctx.fill()
 
    // Inner background
    ctx.beginPath()
    ctx.arc(cx, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = "#f3f4f6"
    ctx.fill()
 
    // Clip for image
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, centerY, radius, 0, Math.PI * 2)
    ctx.clip()
 
    const file = data.image || (data.images && data.images[0]) || null
 
    if (file) {
      const img = new Image()
      img.crossOrigin = "anonymous"
 
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
 
      const size = radius * 2
      ctx.drawImage(img, cx - radius, centerY - radius, size, size)
    } else {
      ctx.fillStyle = "#9ca3af"
      ctx.font = "60px Poppins"
      ctx.textAlign = "center"
      ctx.fillText("👤", cx, centerY + 20)
    }
 
    ctx.restore()
 
    // IMPORTANT
    // IMPORTANT — add extra padding so name doesn't overlap the circle
    photoBottom = centerY + radius + 20
  }
 
  // Trophy – small, tucked into bottom-left corner so it doesn't block the text
  const trophyWidth = isTeam ? 325 : 325
  const trophyHeight = isTeam ? 300 : 300
 
  const rightOffset = isTeam ? 400 : 400 // team vs individual (your custom 400)
  const trophyY = isTeam ? 120 : 150     // team vs individual (your custom 150)
  const trophyX = canvas.width - trophyWidth - rightOffset
 
  ctx.save()
 
  // Move origin to center of image
  ctx.translate(
    trophyX + trophyWidth / 2,
    trophyY + trophyHeight / 2
  )
 
  // Rotate (in radians)
  ctx.rotate(0.2)   // 👉 tilt right
 
  // Draw image centered
  ctx.drawImage(
    trophyImg,
    -trophyWidth / 2,
    -trophyHeight / 2,
    trophyWidth,
    trophyHeight
  )
 
  ctx.restore()  // Recipient name, message and footer – all centred
 
  drawTextSection(ctx, data, cx, photoBottom, canvas.height, 1000, poppinsFont, 48)
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
): number {   // ✅ return type
 
  const words = text.split(" ")
  let line = ""
  let currentY = y
  let lineCount = 0   // ✅ track lines
 
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " "
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width
 
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY)
      line = words[n] + " "
      currentY += lineHeight
      lineCount++   // ✅ increment
    } else {
      line = testLine
    }
  }
 
  ctx.fillText(line, x, currentY)
  lineCount++   // ✅ last line
 
  return lineCount   // ✅ VERY IMPORTANT
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
 
 
 
async function drawCircularTeamAvatars(
  ctx: CanvasRenderingContext2D,
  data: KudosCardData,
  centerX: number,
  startY: number,
  maxWidth: number,
  borderColor: string = "#4ade80"
): Promise<number> {
  const images = data.images || []
  if (images.length === 0) {
    // Default placeholder when no team images are uploaded yet
    const placeholderRadius = 160;
    const cy = startY + placeholderRadius;
 
    // Green outer ring
    ctx.beginPath();
    ctx.arc(centerX, cy, placeholderRadius + 10, 0, Math.PI * 2);
    ctx.fillStyle = "#4ade80";
    ctx.fill();
 
    // Inner background
    ctx.beginPath();
    ctx.arc(centerX, cy, placeholderRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#f3f4f6";
    ctx.fill();
 
    // Emoji placeholder
    ctx.fillStyle = "#9ca3af";
    ctx.font = "60px Poppins";
    ctx.textAlign = "center";
    ctx.fillText("👥", centerX, cy + 20);
 
    return placeholderRadius * 2 + 40; // return consumed height
  }
 
  const count = Math.min(images.length, 12)
  const slice = images.slice(0, count)
 
  // Layout constants
  const MAX_PER_ROW = Math.min(count, 6)          // ≤6 per row so circles stay large
  const rows = Math.ceil(count / MAX_PER_ROW)
  // Dynamic sizing: larger circles for smaller teams
  let maxDiam = 150;
  let gap = 20;
 
  if (count === 1) { maxDiam = 320; gap = 0; }
  else if (count === 2) { maxDiam = 320; gap = 80; }
  else if (count === 3) { maxDiam = 260; gap = 60; }
  else if (count === 4) { maxDiam = 220; gap = 50; }
  else if (count === 5) { maxDiam = 200; gap = 40; }
  else if (count === 6) { maxDiam = 180; gap = 30; }
  else { maxDiam = 150; gap = 20; } // 7+ people means 2 rows
 
  const avatarDiameter = Math.min(
    maxDiam,
    Math.floor((maxWidth - (MAX_PER_ROW - 1) * gap) / MAX_PER_ROW)
  )
  const radius = avatarDiameter / 2
  const borderThick = rows > 1 ? 5 : Math.max(7, Math.floor(radius * 0.08)) // scale border slightly too
  const rowStride = avatarDiameter + gap + 40      // vertical step per row, adding extra padding for shadows
 
  // Pre-load all images
  const loaded: (HTMLImageElement | null)[] = []
  for (const file of slice) {
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
      loaded.push(img)
    } catch {
      loaded.push(null)
    }
  }
 
  for (let row = 0; row < rows; row++) {
    const rowStart = row * MAX_PER_ROW
    const rowEnd = Math.min(rowStart + MAX_PER_ROW, count)
    const rowCount = rowEnd - rowStart
    const rowTotalW = rowCount * avatarDiameter + (rowCount - 1) * gap
    const rowLeft = centerX - rowTotalW / 2
    const cy = startY + row * rowStride + radius
 
    for (let i = 0; i < rowCount; i++) {
      const cx = rowLeft + i * (avatarDiameter + gap) + radius
 
      // Outer glow ring
      ctx.save()
      ctx.shadowColor = borderColor
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(cx, cy, radius + borderThick, 0, 2 * Math.PI)
      ctx.fillStyle = borderColor
      ctx.fill()
      ctx.restore()
 
      // White separator ring
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, radius + 3, 0, 2 * Math.PI)
      ctx.fillStyle = "#ffffff"
      ctx.fill()
      ctx.restore()
 
      // Circular clip for photo
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
      ctx.clip()
 
      const img = loaded[rowStart + i]
      if (img) {
        const ia = img.width / img.height
        let dw: number, dh: number, dx: number, dy: number
        if (ia > 1) {
          dh = avatarDiameter; dw = dh * ia; dx = cx - dw / 2; dy = cy - radius
        } else {
          dw = avatarDiameter; dh = dw / ia; dx = cx - radius; dy = cy - dh / 2
        }
        ctx.drawImage(img, dx, dy, dw, dh)
      } else {
        ctx.fillStyle = "#374151"
        ctx.fillRect(cx - radius, cy - radius, avatarDiameter, avatarDiameter)
        ctx.fillStyle = "#9ca3af"
        ctx.font = `${Math.floor(radius * 0.9)}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText("👤", cx, cy)
      }
      ctx.restore()
    }
  }
 
  // Accurately return physical space consumed, avoiding adding an extra rowStride
  // after the last row which was pushing text off the bottom of the card!
  // We incorporate the outer border thickness and shadow bleed to ensure text is pushed down nicely.
  return (rows - 1) * rowStride + avatarDiameter + borderThick + (rows > 1 ? 50 : 20);
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
  ctx.font = `600 ${fontSize}px ${fontFamily}`
 
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