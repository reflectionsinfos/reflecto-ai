import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Point, Area } from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Loader2 } from 'lucide-react'

// Helper to create the cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  canvas.width = safeArea
  canvas.height = safeArea

  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate(getRadianAngle(rotation))
  ctx.translate(-safeArea / 2, -safeArea / 2)

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  )

  const data = ctx.getImageData(0, 0, safeArea, safeArea)

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  )

  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file)
    }, 'image/jpeg', 0.95)
  })
}

interface ImageCropperDialogProps {
  isOpen: boolean
  imageSrc: string | null
  onClose: () => void
  onCropComplete: (croppedBlob: Blob) => void
}

export function ImageCropperDialog({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}: ImageCropperDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropChange = useCallback((crop: Point) => setCrop(crop), [])
  const onZoomChange = useCallback((value: number[]) => setZoom(value[0]), [])

  const handleCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const processCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    setIsProcessing(true)
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      if (croppedBlob) {
        onCropComplete(croppedBlob)
      }
    } catch (e) {
      console.error('Error extracting cropped image:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  // Reset state when opening a new image
  React.useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setIsProcessing(false)
    }
  }, [isOpen, imageSrc])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Adjust Image</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[350px] sm:h-[450px] bg-slate-900 rounded-md overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={onCropChange}
              onCropComplete={handleCropComplete}
              onZoomChange={(zoom) => setZoom(zoom)}
              showGrid={false}
              cropShape="rect"
            />
          )}
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <p className="text-sm font-medium">Zoom</p>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={onZoomChange}
            disabled={isProcessing}
          />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={processCrop} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing
              </>
            ) : (
              'Save Crop'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
