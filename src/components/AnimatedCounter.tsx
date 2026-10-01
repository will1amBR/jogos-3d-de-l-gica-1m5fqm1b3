import React, { useEffect, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  prefix?: string
  suffix?: string
  className?: string
  duration?: number
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  className = '',
  duration = 700,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value)

  useEffect(() => {
    let startTimestamp: number | null = null
    const startValue = displayValue
    const diff = value - startValue

    if (diff === 0) return

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startValue + diff * easeOut)
      setDisplayValue(current)

      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setDisplayValue(value)
      }
    }

    const animId = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(animId)
  }, [value, duration])

  return (
    <span className={`tabular-nums font-bold ${className}`}>
      {prefix}
      {displayValue.toLocaleString('pt-BR')}
      {suffix}
    </span>
  )
}
