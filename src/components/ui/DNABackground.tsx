'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'

const roundCoordinate = (value: number) => Number(value.toFixed(3))

const helixPoints = Array.from({ length: 20 }, (_, index) => {
  const offset = roundCoordinate(Math.sin(index * 0.5) * 100)
  const y = index * 40

  return {
    id: index,
    leftX: 400 + offset,
    rightX: 400 - offset,
    y,
    delay: index * 0.1,
  }
})

export function DNABackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
      <svg
        className="h-full w-full"
        viewBox="0 0 800 600"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.g
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {helixPoints.map((point) => (
            <Fragment key={point.id}>
              <motion.circle
                cx={point.leftX}
                cy={point.y}
                r="4"
                fill="currentColor"
                className="text-primary"
                animate={{ cx: [point.leftX, point.rightX] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  delay: point.delay,
                }}
              />
              <motion.circle
                cx={point.rightX}
                cy={point.y}
                r="4"
                fill="currentColor"
                className="text-secondary"
                animate={{ cx: [point.rightX, point.leftX] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  delay: point.delay,
                }}
              />
              <motion.line
                x1={point.leftX}
                y1={point.y}
                x2={point.rightX}
                y2={point.y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-muted-foreground/30"
                animate={{
                  x1: [point.leftX, point.rightX],
                  x2: [point.rightX, point.leftX],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  delay: point.delay,
                }}
              />
            </Fragment>
          ))}
        </motion.g>
      </svg>
    </div>
  )
}
