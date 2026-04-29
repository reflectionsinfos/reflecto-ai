import { KudosCardData, drawImageCover } from "./image-generator";

export async function generateSpotAward(
  canvas: HTMLCanvasElement,
  data: KudosCardData
): Promise<void> {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  // High-dpi scaling
  const dpr = window.devicePixelRatio || 1
  // We assume canvas width/height are already set to high res (2049x1639)
  const width = canvas.width
  const height = canvas.height

  // 1. Background (Dark Gradient + Golden Glow)
  const bgGradient = ctx.createLinearGradient(0, 0, width, height)
  bgGradient.addColorStop(0, "#0F172A") // Slate 900
  bgGradient.addColorStop(0.4, "#020617") // Slate 950
  bgGradient.addColorStop(1, "#1e1b4b") // Dark Indigo
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  // Golden Glow (Right side)
  const glow = ctx.createRadialGradient(width * 0.75, height * 0.5, 100, width * 0.75, height * 0.5, height * 0.8)
  glow.addColorStop(0, "rgba(245, 158, 11, 0.15)") // Amber 500 low opacity
  glow.addColorStop(1, "rgba(245, 158, 11, 0)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  // Stars effect
  for(let i=0; i<50; i++) {
     const sx = Math.random() * width;
     const sy = Math.random() * height;
     const size = Math.random() * 3;
     ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
     ctx.beginPath();
     ctx.arc(sx, sy, size, 0, Math.PI * 2);
     ctx.fill();
  }

  // 2. Headings
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)"
  ctx.shadowBlur = 20
  ctx.shadowOffsetX = 4
  ctx.shadowOffsetY = 4
  
  // "SPOT AWARD"
  ctx.font = "900 110px 'Inter', sans-serif"
  const gradientTitle = ctx.createLinearGradient(80, 0, 800, 0)
  gradientTitle.addColorStop(0, "#FEF3C7") // Amber 100
  gradientTitle.addColorStop(0.3, "#F59E0B") // Amber 500
  gradientTitle.addColorStop(0.6, "#B45309") // Amber 700
  gradientTitle.addColorStop(1, "#FEF3C7") // Amber 100
  ctx.fillStyle = gradientTitle
  ctx.fillText("SPOT AWARD", 80, 160)
  
  // Gold underline
  ctx.fillStyle = "#F59E0B"
  ctx.fillRect(80, 180, 750, 8)

  // "CONGRATULATIONS"
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.font = "300 50px 'Inter', sans-serif"
  ctx.fillStyle = "#E2E8F0" // Slate 200
  ctx.fillText("C O N G R A T U L A T I O N S", 84, 250)

  // 3. Render Photos (Grid Layout)
  // Calculate grid area
  const gridX = 100
  const gridY = 400
  const gridW = 600
  const gridH = 600
  
  await drawSpotAwardPhotos(ctx, data, gridX, gridY, gridW, gridH)

  // 4. Recipient Name & Details (Below photos or to right depending on layout)
  // Based on figma, photos are mid-left, text is bottom
  
  const textStartY = 1100
  const maxWidth = width - 160

  // Recipient Name
  ctx.fillStyle = "#FFFFFF"
  ctx.font = "bold 60px 'Inter', sans-serif"
  ctx.fillText(data.recipientName, 100, textStartY)

  // Helper text: "gets Spot Award in recognition of the exceptional"
  ctx.font = "40px 'Inter', sans-serif"
  ctx.fillStyle = "#CBD5E1" // Slate 300
  const nameWidth = ctx.measureText(data.recipientName).width
  ctx.fillText(" gets Spot Award in recognition of the exceptional", 100 + nameWidth + 10, textStartY)

  // Award Category (Green highlight style from Figma or Gold matching theme?)
  // Figma showing Green for "Customer Centricity"
  const categoryText = data.template.name
  ctx.font = "bold 40px 'Inter', sans-serif"
  
  // Move to next line for category + message
  let currentY = textStartY + 80
  
  // Draw Category
  ctx.fillStyle = "#4ADE80" // Green 400
  ctx.fillText(categoryText, 100, currentY)
  
  const catWidth = ctx.measureText(categoryText).width
  ctx.fillStyle = "#CBD5E1"
  ctx.font = "40px 'Inter', sans-serif"
  ctx.fillText(" she/he demonstrated...", 100 + catWidth + 10, currentY) // Placeholder suffix

  // 5. Message Body
  currentY += 80
  
  // We need a robust text wrapping/scaling function
  // Replace basic text with the user's message
  // Using a simpler approach: Recipient Name + "received" + Category
  
  // Actually, we should just render the detailed message provided by user
  // Text Area: Start X=100, Y=currentY, Width=width-200
  
  const messageStyle = {
      font: "40px 'Inter', sans-serif",
      fillStyle: "#F1F5F9",
      lineHeight: 60
  }
  
  // Custom wrap text function for long message
  wrapTextSimple(ctx, data.message, 100, currentY, width - 200, 60)
  
  // 6. Draw Trophy (Right side) 
  // Since we don't have the image, we'll draw a simplified trophy icon or skip
  // In a real scenario, we'd load `trophy.png`
  
  // Drawing a simple trophy shape outline as placeholder
  const tx = 1400, ty = 400, tw = 400, th = 500
  
  // Cup
  const gradTrophy = ctx.createLinearGradient(tx, ty, tx+tw, ty+th)
  gradTrophy.addColorStop(0, "#FCD34D")
  gradTrophy.addColorStop(0.5, "#B45309")
  gradTrophy.addColorStop(1, "#FCD34D")
  
  ctx.strokeStyle = gradTrophy
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(tx + tw/2, ty + th/3, tw/2, 0, Math.PI, false)
  ctx.moveTo(tx, ty + th/3)
  ctx.lineTo(tx + tw, ty + th/3)
  ctx.lineTo(tx + tw/2, ty + th)
  ctx.stroke()
  
  // Base
  ctx.fillStyle = gradTrophy
  ctx.fillRect(tx + tw/3, ty + th - 20, tw/3, 40)
  
  ctx.font = "bold 40px 'Inter', sans-serif"
  ctx.fillStyle = "#B45309"
  ctx.fillText("TROPHY", tx + tw/2 - 80, ty + th/2)
}

// Helper to draw grid of photos (1 to 8)
async function drawSpotAwardPhotos(
    ctx: CanvasRenderingContext2D,
    data: KudosCardData,
    x: number, 
    y: number, 
    w: number, 
    h: number
) {
    if (!data.images || data.images.length === 0) return

    const count = data.images.length
    const padding = 20
    
    let cols = 1
    let rows = 1
    
    if (count === 1) { cols = 1; rows = 1 }
    else if (count <= 4) { cols = 2; rows = 2 }
    else if (count <= 9) { cols = 3; rows = 3 }
    
    const cellW = (w - (padding * (cols - 1))) / cols
    const cellH = cellW // Square cells for circular photos
    
    for (let i = 0; i < count; i++) {
        const file = data.images[i]
        const row = Math.floor(i / cols)
        const col = i % cols
        
        const px = x + (col * (cellW + padding))
        const py = y + (row * (cellH + padding))
        
        // Load image
        const img = await loadImage(file)
        
        // Draw Circle Mask
        ctx.save()
        ctx.beginPath()
        ctx.arc(px + cellW/2, py + cellH/2, cellW/2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        
        // Draw Image Cover
        drawImageCover(ctx, img, px, py, cellW, cellH)
        
        // Draw Border
        ctx.restore()
        ctx.beginPath()
        ctx.arc(px + cellW/2, py + cellH/2, cellW/2, 0, Math.PI * 2)
        ctx.strokeStyle = "#F59E0B" // Gold border
        ctx.lineWidth = 8
        ctx.stroke()
        ctx.closePath()
    }
}

// Helper to load file to Image
const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.src = URL.createObjectURL(file)
    })
}

// Simple text wrapper
function wrapTextSimple(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
}
