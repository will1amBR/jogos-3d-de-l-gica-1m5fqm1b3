import React, { useEffect, useRef } from 'react'

interface Game3DPreviewProps {
  type: 'farm' | 'bottle' | 'tetris'
  isHovered: boolean
}

export const Game3DPreview: React.FC<Game3DPreviewProps> = ({ type, isHovered }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let angle = 0

    const render = () => {
      angle += isHovered ? 0.05 : 0.015
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2

      if (type === 'farm') {
        // Draw 3D Isometric Farm Plot with waving crops and barn
        ctx.save()
        ctx.translate(cx, cy + 10)

        // Isometric soil base
        const isoW = 75
        const isoH = 38
        ctx.fillStyle = '#795548'
        ctx.beginPath()
        ctx.moveTo(0, -isoH)
        ctx.lineTo(isoW, 0)
        ctx.lineTo(0, isoH)
        ctx.lineTo(-isoW, 0)
        ctx.closePath()
        ctx.fill()

        // Green grass top
        ctx.fillStyle = '#8BC34A'
        ctx.beginPath()
        ctx.moveTo(0, -isoH)
        ctx.lineTo(isoW - 4, -2)
        ctx.lineTo(0, isoH - 4)
        ctx.lineTo(-isoW + 4, -2)
        ctx.closePath()
        ctx.fill()

        // Soil ridges
        ctx.strokeStyle = '#689F38'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(-30, -5)
        ctx.lineTo(30, 15)
        ctx.moveTo(-15, -18)
        ctx.lineTo(45, 2)
        ctx.stroke()

        // Animated rotating 3D corn/sprout in center
        const rotY = Math.sin(angle) * 12
        ctx.fillStyle = '#FBC02D'
        ctx.beginPath()
        ctx.arc(rotY, -25 + Math.cos(angle * 2) * 3, 14, 0, Math.PI * 2)
        ctx.fill()

        // Corn leaves
        ctx.fillStyle = '#4CAF50'
        ctx.beginPath()
        ctx.ellipse(rotY - 10, -20, 8, 4, -0.4 + Math.sin(angle) * 0.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(rotY + 10, -20, 8, 4, 0.4 + Math.cos(angle) * 0.2, 0, Math.PI * 2)
        ctx.fill()

        // Mini pumpkin
        ctx.fillStyle = '#FB8C00'
        ctx.beginPath()
        ctx.ellipse(-25, 2, 10, 8, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#2E7D32'
        ctx.fillRect(-26, -9, 3, 4)

        // Sparkle
        ctx.fillStyle = '#FFF9C4'
        ctx.fillRect(rotY + 6, -32, 4, 4)

        ctx.restore()
      } else if (type === 'bottle') {
        // Draw 3D Bottle filling station with conveyor and liquid level
        ctx.save()
        ctx.translate(cx, cy)

        // Conveyor belt in perspective
        ctx.fillStyle = '#37474F'
        ctx.beginPath()
        ctx.moveTo(-70, 30)
        ctx.lineTo(70, 25)
        ctx.lineTo(85, 45)
        ctx.lineTo(-55, 50)
        ctx.closePath()
        ctx.fill()

        // Rollers animation
        const offset = (angle * 20) % 20
        ctx.strokeStyle = '#78909C'
        ctx.lineWidth = 2
        for (let x = -50 + offset; x < 65; x += 20) {
          ctx.beginPath()
          ctx.moveTo(x, 28)
          ctx.lineTo(x + 12, 47)
          ctx.stroke()
        }

        // 3D Glass bottle
        const bottleBob = Math.sin(angle * 2) * 4
        const bx = 0
        const by = -15 + bottleBob

        // Glass bottle body
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.strokeStyle = '#0288D1'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.roundRect(bx - 18, by - 10, 36, 45, [4, 4, 10, 10])
        ctx.stroke()
        ctx.fill()

        // Neck
        ctx.beginPath()
        ctx.rect(bx - 7, by - 30, 14, 20)
        ctx.stroke()
        ctx.fill()

        // Liquid inside animated (magic cyan/purple)
        const fillH = 20 + Math.sin(angle * 3) * 10
        ctx.fillStyle = '#00BCD4'
        ctx.beginPath()
        ctx.roundRect(bx - 16, by + 35 - fillH, 32, fillH, [2, 2, 8, 8])
        ctx.fill()

        // Cap (bright orange/red)
        ctx.fillStyle = '#FF5722'
        ctx.beginPath()
        ctx.roundRect(bx - 8, by - 34, 16, 6, 2)
        ctx.fill()

        // Liquid bubbles
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(bx - 5, by + 28 - fillH * 0.4, 2.5, 0, Math.PI * 2)
        ctx.arc(bx + 6, by + 32 - fillH * 0.7, 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      } else if (type === 'tetris') {
        // Draw 3D Isometric Tetris Arena with rotating colorful polycubes
        ctx.save()
        ctx.translate(cx, cy - 5)

        // 3D grid cage
        ctx.strokeStyle = 'rgba(94, 53, 177, 0.3)'
        ctx.lineWidth = 1.5
        ctx.strokeRect(-50, -45, 100, 90)

        // Orbiting angle
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)

        const drawVoxel = (vx: number, vy: number, vz: number, color: string) => {
          // Simple 3D projection
          const px = (vx * cosA - vz * sinA) * 16
          const py = vy * 14 + (vx * sinA + vz * cosA) * 7
          const s = 14

          // Top face
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.moveTo(px, py - s)
          ctx.lineTo(px + s, py - s / 2)
          ctx.lineTo(px, py)
          ctx.lineTo(px - s, py - s / 2)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = '#212121'
          ctx.lineWidth = 0.8
          ctx.stroke()

          // Left face
          ctx.fillStyle = shadeColor(color, -25)
          ctx.beginPath()
          ctx.moveTo(px - s, py - s / 2)
          ctx.lineTo(px, py)
          ctx.lineTo(px, py + s)
          ctx.lineTo(px - s, py + s / 2)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Right face
          ctx.fillStyle = shadeColor(color, -40)
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(px + s, py - s / 2)
          ctx.lineTo(px + s, py + s / 2)
          ctx.lineTo(px, py + s)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }

        // T-piece in center
        drawVoxel(0, 1, 0, '#9C27B0')
        drawVoxel(-1, 1, 0, '#9C27B0')
        drawVoxel(1, 1, 0, '#9C27B0')
        drawVoxel(0, 0, 0, '#9C27B0')

        // L-piece nearby
        drawVoxel(-1, -1, 1, '#FF9800')
        drawVoxel(-1, -2, 1, '#FF9800')
        drawVoxel(0, -1, 1, '#FF9800')

        // Blue line cube
        drawVoxel(1, 2, -1, '#03A9F4')
        drawVoxel(0, 2, -1, '#03A9F4')

        ctx.restore()
      }

      animId = requestAnimationFrame(render)
    }

    render()

    return () => cancelAnimationFrame(animId)
  }, [type, isHovered])

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={180}
      className="w-full h-44 object-contain rounded-2xl bg-gradient-to-b from-[#FFFDF9] to-[#F5ECE1] border border-amber-200/50 shadow-inner"
    />
  )
}

function shadeColor(color: string, percent: number) {
  let num = parseInt(color.replace('#', ''), 16)
  let amt = Math.round(2.55 * percent)
  let R = (num >> 16) + amt
  let B = ((num >> 8) & 0x00ff) + amt
  let G = (num & 0x0000ff) + amt
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
      (G < 255 ? (G < 1 ? 0 : G) : 255)
    )
      .toString(16)
      .slice(1)
  )
}
