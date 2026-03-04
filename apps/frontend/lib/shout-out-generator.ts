export interface ShoutOutCardData {
    style: {
      id: string;
      name: string;
      color: string;
      gradient: string;
    };
    category: "announcement" | "milestone" | "welcome";
    title: string;
    message: string;
    audience: string; // "Engineering Team"
    creatorName: string;
    image?: File | null;
}

export async function generateShoutOutToCanvas(canvas: HTMLCanvasElement, data: ShoutOutCardData): Promise<void> {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dimensions: Banner style (16:9 or similar wide format) - let's do 1200x630 (OG Image size)
    canvas.width = 1200;
    canvas.height = 630;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    const colors = getGradientColors(data.style.gradient);
    gradient.addColorStop(0, colors.start);
    gradient.addColorStop(1, colors.end);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Overlay Pattern (Subtle circles)
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 300 + 50, 0, Math.PI * 2);
        ctx.fill();
    }

    // Main Content Box
    const margin = 50;
    const contentW = canvas.width - (margin * 2);
    const contentH = canvas.height - (margin * 2);
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;
    
    // Rounded Rect
    ctx.beginPath();
    ctx.roundRect(margin, margin, contentW, contentH, 30);
    ctx.fill();
    ctx.shadowColor = "transparent";

    const fontBase = "Poppins, Arial, sans-serif";

    // Category Badge
    ctx.fillStyle = colors.start;
    ctx.font = `bold 24px ${fontBase}`;
    const categoryText = data.category.toUpperCase();
    const catMetrics = ctx.measureText(categoryText);
    const badgeW = catMetrics.width + 40;
    const badgeH = 40;
    const badgeX = canvas.width / 2 - badgeW / 2;
    const badgeY = margin + 50;

    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 20);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(categoryText, canvas.width / 2, badgeY + 28);

    // Title
    ctx.fillStyle = "#111827";
    ctx.font = `bold 64px ${fontBase}`;
    // Wrap title if needed, but usually short
    ctx.fillText(data.title, canvas.width / 2, badgeY + 100);

    // Message
    ctx.fillStyle = "#374151";
    ctx.font = `400 32px ${fontBase}`;
    wrapTextCentered(ctx, data.message, canvas.width / 2, badgeY + 180, contentW - 100, 48);

    // Audience / Footer
    ctx.fillStyle = "#6b7280";
    ctx.font = `bold 24px ${fontBase}`;
    const bottomY = margin + contentH - 40;
    ctx.fillText(`📢 FOR: ${data.audience.toUpperCase()}`, canvas.width / 2, bottomY - 30);
    
    ctx.font = `400 18px ${fontBase}`;
    ctx.fillText(`Posted by ${data.creatorName} • ${new Date().toLocaleDateString()}`, canvas.width / 2, bottomY);
    
    // Optional Image (Logo or Icon)
    if (data.image) {
        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = URL.createObjectURL(data.image!);
            });

            // Draw circular image at top left of card? Or blended?
            // Let's put it top left corner of the white card
            const imgSize = 100;
            const imgX = margin + 30;
            const imgY = margin + 30;
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(imgX + imgSize/2, imgY + imgSize/2, imgSize/2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
            ctx.restore();

        } catch (e) {
            console.error("Failed to load ShoutOut image");
        }
    }
}

function getGradientColors(gradientClass: string) {
    // simplified lookup
    if (gradientClass.includes("blue")) return { start: "#3b82f6", end: "#1d4ed8" };
    if (gradientClass.includes("orange")) return { start: "#f97316", end: "#c2410c" };
    if (gradientClass.includes("green")) return { start: "#22c55e", end: "#15803d" };
    if (gradientClass.includes("purple")) return { start: "#a855f7", end: "#7e22ce" };
    if (gradientClass.includes("red")) return { start: "#ef4444", end: "#b91c1c" };
    if (gradientClass.includes("teal")) return { start: "#14b8a6", end: "#0f766e" };
    return { start: "#ec4899", end: "#be185d" }; // Pink default
}

function wrapTextCentered(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + " ";
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
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
