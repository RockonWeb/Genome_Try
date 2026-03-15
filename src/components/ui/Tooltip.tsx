'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: ReactNode
  className?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const positionClasses = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'left-1/2 top-full mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
} as const

const arrowClasses = {
  top: '-bottom-1 left-1/2 -translate-x-1/2 rotate-45 border-b border-r',
  bottom: '-top-1 left-1/2 -translate-x-1/2 rotate-45 border-l border-t',
  left: '-right-1 top-1/2 -translate-y-1/2 rotate-45 border-r border-t',
  right: '-left-1 top-1/2 -translate-y-1/2 rotate-45 border-b border-l',
} as const

export const Tooltip = ({
  content,
  children,
  className,
  position = 'top',
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'pointer-events-none absolute z-[60] rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-2xl shadow-slate-950/30',
              positionClasses[position],
              className,
            )}
          >
            {content}
            <span
              className={cn(
                'absolute h-2 w-2 bg-slate-950',
                arrowClasses[position],
              )}
            />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  )
}
