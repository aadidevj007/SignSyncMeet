import React from 'react'
import { motion } from 'framer-motion'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20'
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <motion.div 
        className={`${sizes[size]} relative`}
        animate={{
          scale: [1, 1.05, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl" fill="none">
          <circle cx="50" cy="50" r="48" fill="url(#glow)" opacity="0.4">
            <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite" />
          </circle>
          
          <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="url(#bg)" stroke="url(#stroke)" strokeWidth="2" />
          
          <g transform="translate(50, 50)">
            <path d="M-15, -20 C-15, -30, -5, -30, 5, -25 C15, -20, 15, -10, 5, -5" fill="none" stroke="url(#text)" strokeWidth="4" strokeLinecap="round" />
            <path d="M5, -5 L5, 5" fill="none" stroke="url(#text)" strokeWidth="4" strokeLinecap="round" />
            <path d="M5, 5 C5, 15, -5, 15, -15, 10 C-25, 5, -25, -5, -15, 0" fill="none" stroke="url(#text)" strokeWidth="4" strokeLinecap="round" />
            <line x1="18" y1="-30" x2="25" y2="-25" stroke="url(#accent)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <line x1="18" y1="-25" x2="25" y2="-20" stroke="url(#accent)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <line x1="18" y1="-20" x2="25" y2="-15" stroke="url(#accent)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          </g>
          
          <circle cx="25" cy="25" r="2.5" fill="url(#accent)">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="75" cy="25" r="2.5" fill="url(#accent)">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.3s" repeatCount="indefinite" />
          </circle>
          <circle cx="25" cy="75" r="2.5" fill="url(#accent)">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="75" cy="75" r="2.5" fill="url(#accent)">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.1s" repeatCount="indefinite" />
          </circle>
          
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="stroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="text" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#c7d2fe" />
              <stop offset="100%" stopColor="#a5b4fc" />
            </linearGradient>
            <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
      
      <span className={`${textSizes[size]} font-bold font-orbitron bg-gradient-to-r from-cyan-400 via-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight`}>
        SignSync
      </span>
    </div>
  )
}