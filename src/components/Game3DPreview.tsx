import React, { useEffect, useRef } from 'react'

interface Game3DPreviewProps {
  type:
    | 'farm'
    | 'bottle'
    | 'tetris'
    | 'spider'
    | 'mahjong'
    | 'freecell'
    | 'paciencia'
    | 'piramide'
    | 'velha'
    | 'xadrez'
    | 'damas'
    | 'pinball'
    | 'aeronave'
    | 'runner'
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
      } else if (type === 'spider') {
        // Draw 3D Isometric Spider Solitaire Cards Fan & Sequence
        ctx.save()
        ctx.translate(cx, cy)

        // Green felt base oval
        ctx.fillStyle = '#1B5E20'
        ctx.beginPath()
        ctx.ellipse(0, 30, 80, 26, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#2E7D32'
        ctx.lineWidth = 2
        ctx.stroke()

        // 3 layered cards fanning out in 3D perspective
        const cardOffsets = [
          {
            x: -35,
            y: -25,
            rot: -0.25 + Math.sin(angle) * 0.05,
            label: 'K',
            suit: '♠',
            color: '#212121',
          },
          {
            x: 0,
            y: -30 + Math.sin(angle * 2) * 4,
            rot: Math.sin(angle) * 0.03,
            label: 'Q',
            suit: '♥',
            color: '#D32F2F',
          },
          {
            x: 35,
            y: -25,
            rot: 0.25 + Math.cos(angle) * 0.05,
            label: 'J',
            suit: '♠',
            color: '#212121',
          },
        ]

        cardOffsets.forEach((c) => {
          ctx.save()
          ctx.translate(c.x, c.y)
          ctx.rotate(c.rot)

          // Card shadow
          ctx.fillStyle = 'rgba(0,0,0,0.35)'
          ctx.beginPath()
          ctx.roundRect(-22, -30 + 10, 44, 62, 6)
          ctx.fill()

          // Card body
          ctx.fillStyle = '#FFFFFF'
          ctx.strokeStyle = '#BDBDBD'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.roundRect(-22, -30, 44, 62, 6)
          ctx.fill()
          ctx.stroke()

          // Card text
          ctx.fillStyle = c.color
          ctx.font = 'bold 12px sans-serif'
          ctx.textAlign = 'left'
          ctx.fillText(c.label, -16, -16)
          ctx.fillText(c.suit, -16, -4)

          // Center large suit
          ctx.font = '20px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(c.suit, 0, 14)

          ctx.restore()
        })

        // Little spider badge in bottom right corner
        ctx.fillStyle = '#FFB74D'
        ctx.beginPath()
        ctx.arc(45, 20, 12, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#3E2723'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('🕷️', 45, 24)

        ctx.restore()
      } else if (type === 'mahjong') {
        // Draw 3D Stacked Vita Mahjong Porcelain Tiles with Jade backing
        ctx.save()
        ctx.translate(cx, cy + 5)

        // Green velvet mat base
        ctx.fillStyle = '#1E3F24'
        ctx.beginPath()
        ctx.ellipse(0, 32, 75, 24, 0, 0, Math.PI * 2)
        ctx.fill()

        // 3D Isometric Tile drawing function
        const drawMahjongTile = (
          tx: number,
          ty: number,
          layer: number,
          symbol: string,
          color: string,
          sub: string,
        ) => {
          const lX = layer * -3
          const lY = layer * -5
          const x = tx + lX
          const y = ty + lY

          // 3D Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
          ctx.beginPath()
          ctx.roundRect(x - 18 + 5, y - 24 + 7, 36, 48, 6)
          ctx.fill()

          // Green Jade back/sides
          ctx.fillStyle = '#1B5E20'
          ctx.beginPath()
          ctx.roundRect(x - 18 + 3, y - 24 + 4, 36, 48, 6)
          ctx.fill()

          // Bone / Porcelain side
          ctx.fillStyle = '#C7BAA7'
          ctx.beginPath()
          ctx.roundRect(x - 18 + 1.5, y - 24 + 2, 36, 48, 6)
          ctx.fill()

          // Front Ivory Face
          ctx.fillStyle = '#FFFDF9'
          ctx.strokeStyle = '#D7CCC8'
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.roundRect(x - 18, y - 24, 36, 48, 6)
          ctx.fill()
          ctx.stroke()

          // Symbol
          ctx.fillStyle = color
          ctx.textAlign = 'center'
          ctx.font = 'bold 15px sans-serif'
          ctx.fillText(symbol, x, y + 2)

          // Sublabel
          ctx.font = 'bold 8px sans-serif'
          ctx.fillText(sub, x, y + 14)
        }

        // Animated bob
        const bob = Math.sin(angle * 2) * 3

        // Layer 0: Two bottom tiles
        drawMahjongTile(-26, 0, 0, '🎋', '#2E7D32', 'BAMBU')
        drawMahjongTile(26, 0, 0, '🔵', '#0288D1', 'PONTO')

        // Layer 1: Stacked top tile (floating slightly with hover)
        drawMahjongTile(0, -10 + bob, 1, '🌸', '#E91E63', 'FLOR')

        // Sparkle icon
        ctx.fillStyle = '#FFD54F'
        ctx.font = '12px sans-serif'
        ctx.fillText('✨', 35 + Math.sin(angle) * 3, -25)

        ctx.restore()
      } else if (type === 'aeronave') {
        // Draw 3D Styled Space Airship with lasers and orbiting asteroid
        ctx.save()
        ctx.translate(cx, cy)

        // Space/twilight background circle
        ctx.fillStyle = '#1A237E'
        ctx.beginPath()
        ctx.arc(0, 0, 48, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#3949AB'
        ctx.lineWidth = 2
        ctx.stroke()

        // Orbiting rock asteroid
        const astX = Math.cos(angle * 1.5) * 34
        const astY = Math.sin(angle * 1.5) * 22
        ctx.fillStyle = '#8D6E63'
        ctx.beginPath()
        ctx.arc(astX, astY, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FFA000'
        ctx.fillRect(astX - 3, astY - 3, 3, 3)

        // Lasers firing
        ctx.fillStyle = '#FFEB3B'
        ctx.fillRect(-8, -32 + Math.sin(angle * 6) * 6, 2, 10)
        ctx.fillRect(6, -32 + Math.sin(angle * 6) * 6, 2, 10)

        // Airship
        const shipBob = Math.sin(angle * 3) * 3
        ctx.translate(0, 8 + shipBob)

        // Engine fire
        ctx.fillStyle = '#FF9800'
        ctx.beginPath()
        ctx.moveTo(-5, 12)
        ctx.lineTo(5, 12)
        ctx.lineTo(0, 22)
        ctx.closePath()
        ctx.fill()

        // Ship wings
        ctx.fillStyle = '#8BC34A'
        ctx.beginPath()
        ctx.moveTo(0, -14)
        ctx.lineTo(-20, 10)
        ctx.lineTo(0, 4)
        ctx.lineTo(20, 10)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = '#558B2F'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Cockpit
        ctx.fillStyle = '#FFF9F0'
        ctx.beginPath()
        ctx.ellipse(0, -2, 6, 12, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#4DD0E1'
        ctx.beginPath()
        ctx.arc(0, -4, 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      } else if (type === 'runner') {
        // Draw 3D Endless Runner Scene with rolling hill, obstacles & golden soja
        ctx.save()
        ctx.translate(cx, cy)

        // Rolling hill circle clipping
        ctx.save()
        ctx.beginPath()
        ctx.arc(0, 0, 48, 0, Math.PI * 2)
        ctx.clip()

        // Sky
        ctx.fillStyle = '#FFE082'
        ctx.fillRect(-50, -50, 100, 100)

        // Hills
        ctx.fillStyle = '#8BC34A'
        ctx.beginPath()
        ctx.arc(0, 60, 68, 0, Math.PI * 2)
        ctx.fill()

        // Roadway
        ctx.fillStyle = '#795548'
        ctx.beginPath()
        ctx.arc(0, 64, 56, 0, Math.PI * 2)
        ctx.fill()

        // Rolling crate obstacle
        const crateX = 22 - ((angle * 45) % 80)
        ctx.fillStyle = '#A1887F'
        ctx.fillRect(crateX, 4, 12, 12)
        ctx.strokeStyle = '#4E342E'
        ctx.lineWidth = 1
        ctx.strokeRect(crateX, 4, 12, 12)

        // Golden Soja floating
        const sojaBob = Math.sin(angle * 4) * 4
        ctx.font = '16px sans-serif'
        ctx.fillText('🌱', 10, -4 + sojaBob)

        // Runner character
        const jumpY = Math.abs(Math.sin(angle * 3.5)) * 14
        ctx.fillStyle = '#3E2723'
        ctx.fillRect(-18, 10 - jumpY, 3, 7)
        ctx.fillRect(-12, 10 - jumpY, 3, 7)
        ctx.fillStyle = '#8BC34A'
        ctx.fillRect(-19, -2 - jumpY, 12, 12)
        ctx.fillStyle = '#FFB74D'
        ctx.beginPath()
        ctx.arc(-13, -7 - jumpY, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillText('🌾', -13, -12 - jumpY)

        ctx.restore()

        // Outer border
        ctx.strokeStyle = '#8BC34A'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(0, 0, 48, 0, Math.PI * 2)
        ctx.stroke()

        ctx.restore()
      } else if (type === 'freecell') {
        // Draw 3D FreeCell representation: 4 open cells, cascaded cards and foundation Aces
        ctx.save()
        ctx.translate(cx, cy)

        // Green velvet table mat
        ctx.fillStyle = '#1B5E20'
        ctx.beginPath()
        ctx.ellipse(0, 30, 80, 26, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#2E7D32'
        ctx.lineWidth = 2
        ctx.stroke()

        // 4 Free cells on top left
        for (let i = 0; i < 4; i++) {
          const cxPos = -65 + i * 16
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
          ctx.strokeRect(cxPos, -55, 13, 18)
        }
        // 4 Foundations on top right
        for (let i = 0; i < 4; i++) {
          const fxPos = 12 + i * 16
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'
          ctx.strokeRect(fxPos, -55, 13, 18)
        }

        // Floating Ace of Hearts and King of Spades
        const bob = Math.sin(angle * 2) * 4

        // Card 1: Ace of Hearts
        ctx.save()
        ctx.translate(-20, -10 + bob)
        ctx.rotate(-0.15)
        ctx.fillStyle = '#FFFFFF'
        ctx.strokeStyle = '#D32F2F'
        ctx.lineWidth = 1.5
        ctx.roundRect(-16, -24, 32, 48, 4)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#D32F2F'
        ctx.font = 'bold 10px sans-serif'
        ctx.fillText('A ♥', -12, -12)
        ctx.font = '18px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('♥', 0, 8)
        ctx.restore()

        // Card 2: King of Spades
        ctx.save()
        ctx.translate(20, -15 - bob)
        ctx.rotate(0.15)
        ctx.fillStyle = '#FFFFFF'
        ctx.strokeStyle = '#212121'
        ctx.lineWidth = 1.5
        ctx.roundRect(-16, -24, 32, 48, 4)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#212121'
        ctx.font = 'bold 10px sans-serif'
        ctx.fillText('K ♠', -12, -12)
        ctx.font = '18px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('♠', 0, 8)
        ctx.restore()

        // FreeCell badge
        ctx.fillStyle = '#00897B'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('FREECELL 4x', 0, 48)

        ctx.restore()
      } else if (type === 'paciencia') {
        // Draw 3D Klondike: Stock deck + fanned tableau
        ctx.save()
        ctx.translate(cx, cy)

        // Felt
        ctx.fillStyle = '#1B5E20'
        ctx.beginPath()
        ctx.ellipse(0, 32, 82, 28, 0, 0, Math.PI * 2)
        ctx.fill()

        // Blue Stock Deck
        const deckBob = Math.sin(angle * 1.5) * 3
        ctx.fillStyle = '#1565C0'
        ctx.strokeStyle = '#90CAF9'
        ctx.lineWidth = 1.5
        ctx.roundRect(-55, -35 + deckBob, 26, 38, 4)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('🂠', -42, -12 + deckBob)

        // Cascading cards
        const klondikeCards = [
          { val: '10', suit: '♠', col: '#212121', dy: -25 },
          { val: '9', suit: '♥', col: '#D32F2F', dy: -10 },
          { val: '8', suit: '♣', col: '#2E7D32', dy: 5 },
        ]

        klondikeCards.forEach((c) => {
          ctx.fillStyle = '#FFFFFF'
          ctx.strokeStyle = '#BDBDBD'
          ctx.lineWidth = 1.2
          ctx.roundRect(5, c.dy, 32, 40, 4)
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = c.col
          ctx.font = 'bold 9px sans-serif'
          ctx.textAlign = 'left'
          ctx.fillText(`${c.val}${c.suit}`, 9, c.dy + 12)
        })

        // Foundation Sparkle
        ctx.fillStyle = '#FFD54F'
        ctx.font = '14px sans-serif'
        ctx.fillText('✨', 35, -40)

        ctx.restore()
      } else if (type === 'piramide') {
        // Draw 3D Pyramid shape of cards summing to 13
        ctx.save()
        ctx.translate(cx, cy - 10)

        // 3 levels of mini cards forming triangle
        const drawMiniPyrCard = (px: number, py: number, label: string, color: string) => {
          ctx.fillStyle = '#FFFFFF'
          ctx.strokeStyle = '#D7CCC8'
          ctx.lineWidth = 1
          ctx.roundRect(px - 10, py - 14, 20, 28, 3)
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = color
          ctx.font = 'bold 9px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(label, px, py + 3)
        }

        const bob = Math.sin(angle * 2.5) * 3

        // Row 0
        drawMiniPyrCard(0, -28 + bob, 'K', '#D32F2F')

        // Row 1
        drawMiniPyrCard(-14, 2, 'Q', '#212121')
        drawMiniPyrCard(14, 2, 'A', '#D32F2F')

        // Row 2
        drawMiniPyrCard(-28, 32, '7', '#2E7D32')
        drawMiniPyrCard(0, 32, '6', '#D32F2F')
        drawMiniPyrCard(28, 32, '10', '#E65100')

        // Sum 13 badge
        ctx.fillStyle = '#FFB300'
        ctx.beginPath()
        ctx.arc(0, 56, 12, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#3E2723'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('13', 0, 60)

        ctx.restore()
      } else if (type === 'velha') {
        // 3D Tic-Tac-Toe preview with animated glowing X and O
        ctx.save()
        ctx.translate(cx, cy)
        const bob = Math.sin(angle * 2) * 4

        // Grid background
        ctx.strokeStyle = '#8BC34A'
        ctx.lineWidth = 4
        ctx.lineCap = 'round'

        // Vertical lines
        ctx.beginPath()
        ctx.moveTo(-25, -45)
        ctx.lineTo(-25, 45)
        ctx.moveTo(25, -45)
        ctx.lineTo(25, 45)
        // Horizontal lines
        ctx.moveTo(-45, -20)
        ctx.lineTo(45, -20)
        ctx.moveTo(-45, 20)
        ctx.lineTo(45, 20)
        ctx.stroke()

        // Big animated X
        ctx.strokeStyle = '#2563EB'
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.moveTo(-35, -30 + bob)
        ctx.lineTo(-15, -10 + bob)
        ctx.moveTo(-15, -30 + bob)
        ctx.lineTo(-35, -10 + bob)
        ctx.stroke()

        // Big animated O
        ctx.strokeStyle = '#E11D48'
        ctx.beginPath()
        ctx.arc(0, 0, 14 + Math.sin(angle * 3) * 2, 0, Math.PI * 2)
        ctx.stroke()

        // Another X
        ctx.strokeStyle = '#2563EB'
        ctx.beginPath()
        ctx.moveTo(15, 10 - bob)
        ctx.lineTo(35, 30 - bob)
        ctx.moveTo(35, 10 - bob)
        ctx.lineTo(15, 30 - bob)
        ctx.stroke()

        ctx.restore()
      } else if (type === 'xadrez') {
        // 3D Isometric Chess Board with King and Knight
        ctx.save()
        ctx.translate(cx, cy)

        // Board base
        ctx.fillStyle = '#5D4037'
        ctx.beginPath()
        ctx.ellipse(0, 32, 70, 24, 0, 0, Math.PI * 2)
        ctx.fill()

        // Mini checkerboard
        for (let r = -2; r <= 1; r++) {
          for (let c = -2; c <= 1; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? '#EEEED2' : '#769656'
            const px = (c - r) * 16
            const py = (c + r) * 9
            ctx.beginPath()
            ctx.moveTo(px, py - 9)
            ctx.lineTo(px + 16, py)
            ctx.lineTo(px, py + 9)
            ctx.lineTo(px - 16, py)
            ctx.closePath()
            ctx.fill()
          }
        }

        // Animated White King & Black Knight
        const bob = Math.sin(angle * 2.5) * 4
        ctx.font = '36px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // White King
        ctx.fillStyle = '#FFFFFF'
        ctx.shadowColor = 'rgba(0,0,0,0.5)'
        ctx.shadowBlur = 6
        ctx.fillText('♔', -16, -14 + bob)

        // Black Knight
        ctx.fillStyle = '#18181B'
        ctx.shadowColor = 'rgba(255,255,255,0.4)'
        ctx.shadowBlur = 4
        ctx.fillText('♞', 18, -10 - bob)
        ctx.shadowBlur = 0

        ctx.restore()
      } else if (type === 'damas') {
        // 3D Checkers Board with Crowned King
        ctx.save()
        ctx.translate(cx, cy)

        // Board background
        ctx.fillStyle = '#3E2723'
        ctx.beginPath()
        ctx.ellipse(0, 34, 72, 24, 0, 0, Math.PI * 2)
        ctx.fill()

        // Checkers tokens in 3D
        const bob = Math.sin(angle * 2) * 3

        // Red Crowned Piece
        ctx.fillStyle = '#991B1B'
        ctx.beginPath()
        ctx.ellipse(-20, -6 + bob, 22, 12, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#DC2626'
        ctx.beginPath()
        ctx.ellipse(-20, -12 + bob, 22, 12, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#FEF08A'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = '#FEF08A'
        ctx.font = '16px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('👑', -20, -12 + bob)

        // White Piece
        ctx.fillStyle = '#D6D3D1'
        ctx.beginPath()
        ctx.ellipse(22, 4 - bob, 22, 12, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FAFAF9'
        ctx.beginPath()
        ctx.ellipse(22, -2 - bob, 22, 12, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#A8A29E'
        ctx.stroke()

        ctx.restore()
      } else if (type === 'pinball') {
        // 2D/3D Pinball Arcade machine with flashing bumpers and silver ball
        ctx.save()
        ctx.translate(cx, cy)

        // Pinball table contour
        ctx.fillStyle = '#0D2311'
        ctx.strokeStyle = '#FFD54F'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(-50, -65, 100, 130, [25, 25, 8, 8])
        ctx.fill()
        ctx.stroke()

        // Bumpers
        const pulse = Math.sin(angle * 4) * 2
        const drawMiniBumper = (bx: number, by: number, col: string) => {
          ctx.beginPath()
          ctx.arc(bx, by, 11 + pulse, 0, Math.PI * 2)
          ctx.fillStyle = col
          ctx.fill()
          ctx.strokeStyle = '#FFFFFF'
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
        drawMiniBumper(-20, -25, '#FFB300')
        drawMiniBumper(20, -25, '#4CAF50')
        drawMiniBumper(0, 0, '#E91E63')

        // Flippers at bottom
        ctx.strokeStyle = '#FF9800'
        ctx.lineWidth = 5
        ctx.lineCap = 'round'
        const fAngle = Math.sin(angle * 3) * 0.4
        ctx.beginPath()
        ctx.moveTo(-28, 42)
        ctx.lineTo(-28 + Math.cos(fAngle + 0.3) * 24, 42 + Math.sin(fAngle + 0.3) * 10)
        ctx.stroke()

        ctx.strokeStyle = '#4CAF50'
        ctx.beginPath()
        ctx.moveTo(28, 42)
        ctx.lineTo(28 - Math.cos(-fAngle + 0.3) * 24, 42 + Math.sin(-fAngle + 0.3) * 10)
        ctx.stroke()

        // Shiny silver pinball
        const ballY = -35 + Math.sin(angle * 3.5) * 28
        ctx.fillStyle = '#FFFFFF'
        ctx.shadowColor = '#FFD54F'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(Math.cos(angle * 2) * 18, ballY, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

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
