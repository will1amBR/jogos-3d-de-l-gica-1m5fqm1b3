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
  workersCount: number
  hasBakery: boolean
  onPlotClick: (plotIndex: number) => void
}

export const Farm3DCanvas: React.FC<Farm3DCanvasProps> = ({
  plots,
  unlockedCount,
  selectedSeed,
  dailyMultiplier,
  workersCount,
  hasBakery,
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
    let time = 0

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
      time += 0.03
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background pastoral sky & soft rolling hills gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, '#E3F2FD') // soft morning sky
      gradient.addColorStop(0.35, '#F1F8E9') // horizon glow
      gradient.addColorStop(1, '#C8E6C9') // lush valley
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Decorative fluffy clouds in the sky
      for (let c = 0; c < 3; c++) {
        const cloudX = ((time * 12 + c * 300) % (canvas.width + 120)) - 60
        const cloudY = 30 + c * 25
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.beginPath()
        ctx.arc(cloudX, cloudY, 18, 0, Math.PI * 2)
        ctx.arc(cloudX + 16, cloudY - 6, 22, 0, Math.PI * 2)
        ctx.arc(cloudX + 34, cloudY, 18, 0, Math.PI * 2)
        ctx.fill()
      }

      // Background gentle hills
      ctx.fillStyle = '#C8E6C9'
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.25, 140, 260, 70, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#B9F6CA'
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.75, 130, 280, 80, 0, 0, Math.PI * 2)
      ctx.fill()

      // Main field lawn island with subtle 3D earth rim
      ctx.fillStyle = '#795548' // earth base rim
      ctx.beginPath()
      ctx.ellipse(originX, originY + 126, 372, 202, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#A5D6A7' // grass surface
      ctx.beginPath()
      ctx.ellipse(originX, originY + 120, 370, 200, 0, 0, Math.PI * 2)
      ctx.fill()

      // Cute small flowers scattered on grass
      for (let f = 0; f < 8; f++) {
        const fx = originX + Math.cos(f * 0.8) * (260 + (f % 3) * 30)
        const fy = originY + 120 + Math.sin(f * 0.8) * (130 + (f % 2) * 20)
        ctx.fillStyle = f % 2 === 0 ? '#FFF176' : '#F48FB1'
        ctx.beginPath()
        ctx.arc(fx, fy, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }

      const now = Date.now()

      // 1. Draw Bakery Oven building (top-left if unlocked)
      ctx.save()
      const bakeryX = 120
      const bakeryY = 110
      ctx.translate(bakeryX, bakeryY)

      if (hasBakery) {
        // Stone base
        ctx.fillStyle = '#795548'
        ctx.fillRect(-35, -5, 70, 40)
        // Red brick roof/dome
        ctx.beginPath()
        ctx.arc(0, -5, 34, Math.PI, 0)
        ctx.fillStyle = '#D84315'
        ctx.fill()
        // Chimney
        ctx.fillStyle = '#4E342E'
        ctx.fillRect(16, -42, 10, 24)
        // Smoke puffs
        for (let s = 0; s < 3; s++) {
          const smokeY = -48 - s * 12 - ((time * 15 + s * 10) % 25)
          const smokeX = 21 + Math.sin(time * 2 + s) * 6
          ctx.beginPath()
          ctx.arc(smokeX, smokeY, 4 + s * 2, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
          ctx.fill()
        }
        // Oven mouth glow
        ctx.fillStyle = '#FF6F00'
        ctx.beginPath()
        ctx.arc(0, 18, 12, Math.PI, 0)
        ctx.fill()
        // Bread icon label
        ctx.fillStyle = '#3E2723'
        ctx.font = 'bold 11px Nunito, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('FORNO 🥖', 0, 50)
      } else {
        // Wooden construction outline
        ctx.strokeStyle = '#8D6E63'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.strokeRect(-30, 0, 60, 35)
        ctx.setLineDash([])
        ctx.fillStyle = '#8D6E63'
        ctx.font = 'bold 10px Nunito, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('FORNO (Loja)', 0, 22)
      }
      ctx.restore()

      // 2. Draw 3D Market Stall in the top right corner
      ctx.save()
      const stallX = canvas.width - 120
      const stallY = 110
      ctx.translate(stallX, stallY)

      // Stall wooden base
      ctx.fillStyle = '#8D6E63'
      ctx.fillRect(-45, 0, 90, 45)
      ctx.fillStyle = '#6D4C41'
      ctx.fillRect(-42, 5, 84, 35)

      // Stall Awning stripes (red & gold)
      ctx.beginPath()
      ctx.moveTo(-52, -22)
      ctx.lineTo(52, -22)
      ctx.lineTo(45, 0)
      ctx.lineTo(-45, 0)
      ctx.closePath()
      ctx.fillStyle = '#FFB74D'
      ctx.fill()

      // Rotating preview of current crop
      const rotStall = Math.sin(time) * 8
      ctx.fillStyle = '#F57C00'
      ctx.beginPath()
      ctx.arc(rotStall, -35, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#388E3C'
      ctx.fillRect(rotStall - 2, -49, 4, 6)

      // Stall tag
      ctx.fillStyle = '#2E7D32'
      ctx.font = 'bold 11px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`MERCADO: ${dailyMultiplier.toFixed(2)}x`, 0, 60)
      ctx.restore()

      // 3. Render all 24 potential plots
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
          // Locked plot
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

        // Unlocked plot - rich brown earth
        ctx.fillStyle = isHovered ? '#8D6E63' : '#6D4C41'
        ctx.fill()
        ctx.strokeStyle = isHovered ? '#FFD54F' : '#4E342E'
        ctx.lineWidth = isHovered ? 2.5 : 1.5
        ctx.stroke()

        // Depth extrusion 3D
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
          const cropCfg = CROPS[plot.crop] || CROPS.milho
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
            // Stage 3: Ready to harvest!
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

            // Colher badge
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

      // 4. Render Hired Workers walking between field aisles (Township look)
      if (workersCount > 0) {
        for (let w = 0; w < Math.min(workersCount, 5); w++) {
          const walkPhase = time * 0.8 + (w * Math.PI * 2) / Math.min(workersCount, 5)
          const wx = originX + Math.sin(walkPhase) * (140 + w * 25)
          const wy = originY + 120 + Math.cos(walkPhase) * (65 + w * 15)

          // Shadow
          ctx.beginPath()
          ctx.ellipse(wx, wy + 2, 10, 4, 0, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0,0,0,0.18)'
          ctx.fill()

          // Worker Body (straw hat + blue dungarees)
          ctx.fillStyle = '#1976D2'
          ctx.fillRect(wx - 4, wy - 14, 8, 12)
          // Head
          ctx.beginPath()
          ctx.arc(wx, wy - 18, 5, 0, Math.PI * 2)
          ctx.fillStyle = '#FFCC80'
          ctx.fill()
          // Straw Hat
          ctx.beginPath()
          ctx.ellipse(wx, wy - 22, 11, 4, 0, 0, Math.PI * 2)
          ctx.fillStyle = '#FDD835'
          ctx.fill()
          // Pitchfork / tool
          ctx.strokeStyle = '#5D4037'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(wx + 6, wy - 20)
          ctx.lineTo(wx + 6, wy)
          ctx.stroke()
        }
      }

      animId = requestAnimationFrame(render)
    }

    render()

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top

      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const mx = clientX * scaleX
      const my = clientY * scaleY

      let found: number | null = null
      for (let i = 0; i < 24; i++) {
        const row = Math.floor(i / cols)
        const col = i % cols
        const pt = toIso(col, row)

        const dx = Math.abs(mx - pt.x)
        const dy = Math.abs(my - pt.y)

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
  }, [onPlotClick, dailyMultiplier, workersCount, hasBakery])

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
