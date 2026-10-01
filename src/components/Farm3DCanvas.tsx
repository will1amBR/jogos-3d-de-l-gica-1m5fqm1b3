import React, { useEffect, useRef } from 'react'
import type { CropType } from '@/types/game'
import { CROPS } from '@/types/game'

export interface PlotData {
  id: number
  crop: CropType | null
  plantedAt: number | null
  growDuration: number
}

interface Farm3DCanvasProps {
  plots: PlotData[]
  unlockedCount: number
  selectedSeed: CropType
  dailyMultiplier: number
  onPlotClick: (plotIndex: number) => void
}

export const Farm3DCanvas: React.FC<Farm3DCanvasProps> = ({
  plots,
  unlockedCount,
  selectedSeed,
  dailyMultiplier,
  onPlotClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoveredPlotRef = useRef<number | null>(null)
  const plotsRef = useRef(plots)
  plotsRef.current = plots
  const unlockedRef = useRef(unlockedCount)
  unlockedRef.current = unlockedCount

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let stallAngle = 0

    // Isometric projection helper
    // 6 columns x 4 rows max (up to 24 plots)
    const cols = 6
    const originX = canvas.width / 2
    const originY = 160
    const tileW = 56
    const tileH = 28

    const toIso = (col: number, row: number) => {
      return {
        x: originX + (col - row) * (tileW / 2),
        y: originY + (col + row) * (tileH / 2),
      }
    }

    const render = () => {
      stallAngle += 0.02
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background pastoral hill tone
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, '#E8F5E9')
      gradient.addColorStop(1, '#C8E6C9')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw subtle decorative terrain borders
      ctx.fillStyle = '#A5D6A7'
      ctx.beginPath()
      ctx.ellipse(originX, originY + 120, 360, 190, 0, 0, Math.PI * 2)
      ctx.fill()

      const now = Date.now()

      // 1. Draw 3D Market Stall in the top right corner
      ctx.save()
      const stallX = canvas.width - 120
      const stallY = 110
      ctx.translate(stallX, stallY)

      // Stall wooden base
      ctx.fillStyle = '#8D6E63'
      ctx.fillRect(-45, 0, 90, 45)
      ctx.fillStyle = '#6D4C41'
      ctx.fillRect(-42, 5, 84, 35)

      // Stall Awning stripes (red & white/gold)
      ctx.beginPath()
      ctx.moveTo(-52, -22)
      ctx.lineTo(52, -22)
      ctx.lineTo(45, 0)
      ctx.lineTo(-45, 0)
      ctx.closePath()
      ctx.fillStyle = '#FFB74D'
      ctx.fill()

      // Mini rotating preview of current crop on top of the stall
      const rotStall = Math.sin(stallAngle) * 8
      ctx.fillStyle = '#F57C00'
      ctx.beginPath()
      ctx.arc(rotStall, -35, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#388E3C'
      ctx.fillRect(rotStall - 2, -49, 4, 6)

      // Stall price multiplier tag
      ctx.fillStyle = '#2E7D32'
      ctx.font = 'bold 11px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`MERCADO: ${dailyMultiplier.toFixed(2)}x`, 0, 60)
      ctx.restore()

      // 2. Render all 24 potential plots
      for (let i = 0; i < 24; i++) {
        const row = Math.floor(i / cols)
        const col = i % cols
        const isUnlocked = i < unlockedRef.current
        const plot = plotsRef.current[i]
        const isHovered = hoveredPlotRef.current === i

        const pt = toIso(col, row)
        const x = pt.x
        const y = pt.y

        // Draw isometric tile polygon
        ctx.beginPath()
        ctx.moveTo(x, y - tileH / 2)
        ctx.lineTo(x + tileW / 2, y)
        ctx.lineTo(x, y + tileH / 2)
        ctx.lineTo(x - tileW / 2, y)
        ctx.closePath()

        if (!isUnlocked) {
          // Locked plot - stone/grass with lock icon hint
          ctx.fillStyle = '#D7CCC8'
          ctx.fill()
          ctx.strokeStyle = '#BCAAA4'
          ctx.lineWidth = 1.5
          ctx.stroke()

          // Draw small lock
          ctx.fillStyle = '#8D6E63'
          ctx.fillRect(x - 4, y - 2, 8, 8)
          ctx.beginPath()
          ctx.arc(x, y - 3, 4, Math.PI, 0)
          ctx.strokeStyle = '#6D4C41'
          ctx.lineWidth = 2
          ctx.stroke()
          continue
        }

        // Unlocked plot - rich brown fertile earth
        ctx.fillStyle = isHovered ? '#8D6E63' : '#6D4C41'
        ctx.fill()
        ctx.strokeStyle = isHovered ? '#FFD54F' : '#4E342E'
        ctx.lineWidth = isHovered ? 2.5 : 1.5
        ctx.stroke()

        // Plot depth extrusion 3D
        ctx.fillStyle = '#3E2723'
        ctx.beginPath()
        ctx.moveTo(x - tileW / 2, y)
        ctx.lineTo(x, y + tileH / 2)
        ctx.lineTo(x + tileW / 2, y)
        ctx.lineTo(x + tileW / 2, y + 6)
        ctx.lineTo(x, y + tileH / 2 + 6)
        ctx.lineTo(x - tileW / 2, y + 6)
        ctx.closePath()
        ctx.fill()

        // Planted state
        if (plot && plot.crop && plot.plantedAt) {
          const cropCfg = CROPS[plot.crop]
          const elapsed = (now - plot.plantedAt) / 1000
          const progress = Math.min(1, elapsed / (plot.growDuration || cropCfg.growTimeSeconds))

          if (progress < 0.4) {
            // Stage 1: Sprout
            ctx.fillStyle = '#8BC34A'
            ctx.beginPath()
            ctx.arc(x, y - 6, 4, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#4CAF50'
            ctx.fillRect(x - 1, y - 3, 2, 6)
          } else if (progress < 1) {
            // Stage 2: Half-grown
            const h = 12 * progress
            ctx.fillStyle = '#4CAF50'
            ctx.fillRect(x - 2, y - h, 4, h)
            ctx.fillStyle = cropCfg.color
            ctx.beginPath()
            ctx.arc(x, y - h - 3, 6, 0, Math.PI * 2)
            ctx.fill()
          } else {
            // Stage 3: Ready to harvest! (Glows & bobs)
            const bob = Math.sin(now / 150 + i) * 3
            ctx.fillStyle = cropCfg.color
            ctx.beginPath()
            ctx.arc(x, y - 14 + bob, 10, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = '#FFF59D'
            ctx.lineWidth = 2
            ctx.stroke()

            // Stem
            ctx.fillStyle = '#2E7D32'
            ctx.fillRect(x - 2, y - 4 + bob, 4, 8)

            // Sparkling "Pronto!" indicator
            ctx.fillStyle = '#FFFFFF'
            ctx.font = 'bold 9px Nunito, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('COLHER!', x, y - 24 + bob)
          }

          // Small growth progress bar
          if (progress < 1) {
            ctx.fillStyle = '#212121'
            ctx.fillRect(x - 14, y + 8, 28, 4)
            ctx.fillStyle = '#8BC34A'
            ctx.fillRect(x - 13, y + 9, 26 * progress, 2)
          }
        }
      }

      animId = requestAnimationFrame(render)
    }

    render()

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top

      // Scale coords
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const mx = clientX * scaleX
      const my = clientY * scaleY

      // Find hovered plot
      let found: number | null = null
      for (let i = 0; i < 24; i++) {
        const row = Math.floor(i / cols)
        const col = i % cols
        const pt = toIso(col, row)

        const dx = Math.abs(mx - pt.x)
        const dy = Math.abs(my - pt.y)

        // Point inside diamond equation: (dx / (w/2)) + (dy / (h/2)) <= 1
        if (dx / (tileW / 2) + dy / (tileH / 2) <= 1) {
          found = i
          break
        }
      }

      hoveredPlotRef.current = found
    }

    const handleClick = () => {
      if (hoveredPlotRef.current !== null) {
        onPlotClick(hoveredPlotRef.current)
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [onPlotClick, dailyMultiplier])

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border-2 border-[#3E2723]/10 shadow-lg bg-[#E8F5E9]">
      <canvas
        ref={canvasRef}
        width={900}
        height={480}
        className="w-full h-[360px] sm:h-[480px] cursor-pointer touch-none block"
      />
    </div>
  )
}
