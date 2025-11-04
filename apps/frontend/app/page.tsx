'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Video, Users, Zap, Shield, ArrowLeft } from 'lucide-react'
import Logo from '@/components/Logo'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const getFeatureIcon = (IconComponent: any) => <IconComponent className="w-8 h-8" />

  const features = [
    {
      icon: getFeatureIcon(Video),
      title: 'Real-time Sign Translation',
      description: 'Advanced AI models translate sign language to text in real-time'
    },
    {
      icon: getFeatureIcon(Users),
      title: 'Seamless Video Conferencing',
      description: 'Crystal clear video calls with SFU technology'
    },
    {
      icon: getFeatureIcon(Zap),
      title: 'On-device Processing',
      description: 'Privacy-first approach with local inference'
    },
    {
      icon: getFeatureIcon(Shield),
      title: 'Accessibility First',
      description: 'Built for the deaf and hard-of-hearing community'
    }
  ]

  const handleCreateMeeting = () => {
    if (user) {
      router.push('/create')
    } else {
      router.push('/login?redirect=/create')
    }
  }

  const handleJoinMeeting = () => {
    if (user) {
      router.push('/join')
    } else {
      router.push('/login?redirect=/join')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 via-purple-900 to-purple-950 relative overflow-hidden particles-bg">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs */}
        <motion.div 
          className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-pink-500/30 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute top-40 right-20 w-64 h-64 bg-gradient-to-br from-purple-500/30 via-cyan-500/20 to-blue-500/30 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            y: [0, -50, 0],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div 
          className="absolute bottom-32 left-1/4 w-80 h-80 bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-purple-500/30 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 90, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-20 right-1/3 w-72 h-72 bg-gradient-to-br from-pink-500/30 via-purple-500/20 to-cyan-500/30 rounded-full blur-3xl"
          animate={{
            scale: [1.1, 1, 1.1],
            x: [0, -30, 0],
            rotate: [0, -45, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        
        {/* Ribbon Effect Background */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-full h-1"
              style={{
                top: `${12.5 * i}%`,
                background: `linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4), rgba(168, 85, 247, 0.4), transparent)`,
                filter: 'blur(2px)'
              }}
              animate={{
                x: ['-200%', '200%'],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        
        {/* Diagonal Ribbon Strips */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`strip-${i}`}
              className="absolute w-full"
              style={{
                top: `${16.67 * i}%`,
                height: '200%',
                background: `linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.15) 25%, transparent 50%, rgba(168, 85, 247, 0.15) 75%, transparent 100%)`,
                transform: 'rotate(45deg)',
                transformOrigin: 'center'
              }}
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 8 + Math.random() * 4,
                repeat: Infinity,
                delay: i * 1.5,
                ease: "linear"
              }}
            />
          ))}
        </div>
        
        {/* Floating particles with trails */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            initial={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0
            }}
            animate={{
              x: [0, Math.random() * 200 - 100],
              y: [0, Math.random() * 200 - 100],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0]
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
            style={{
              boxShadow: '0 0 10px rgba(255,255,255,0.5)'
            }}
          />
        ))}
        
        {/* Scanning line effect */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)',
            height: '2px'
          }}
          animate={{
            y: ['-100%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between glass-enhanced px-6 py-4 rounded-2xl border border-white/10 shadow-2xl"
        >
          <Logo size="lg" />
          
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/about')}
              className="text-white font-semibold hover:text-blue-400 transition-colors bg-black/20 px-4 py-2 rounded-lg border border-white/20 backdrop-blur-sm"
            >
              About
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/contact')}
              className="text-white font-semibold hover:text-blue-400 transition-colors bg-black/20 px-4 py-2 rounded-lg border border-white/20 backdrop-blur-sm"
            >
              Contact
            </motion.button>
            {user ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/profile')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Profile
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/login')}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/signup')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Sign Up
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.h1 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold mb-6 font-orbitron tracking-tight text-white"
            >
              SignSync
            <br />
            Meet
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-xl md:text-2xl text-white font-bold mb-8 px-6 py-4 bg-gradient-to-r from-blue-600/30 to-purple-600/30 backdrop-blur-lg rounded-xl inline-block border-2 border-white/40 shadow-2xl"
          >
            Revolutionary video conferencing with real-time sign language translation
          </motion.p>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="text-lg text-white font-semibold mb-12 px-6 py-3 bg-gradient-to-r from-purple-600/40 to-pink-600/40 backdrop-blur-lg rounded-lg inline-block border-2 border-white/30 shadow-xl"
          >
            Futuristic AI Video Conferencing for Bidirectional Sign ↔ Speech Translation
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleCreateMeeting}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-2xl transition-all duration-300 relative overflow-hidden group gradient-border"
              >
                <motion.span
                  className="relative z-10"
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  Start Meeting
                </motion.span>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-30 transition-opacity duration-300"
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{ backgroundSize: '200% 100%' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(59, 130, 246, 0.5)',
                      '0 0 40px rgba(168, 85, 247, 0.5), 0 0 60px rgba(236, 72, 153, 0.3)',
                      '0 0 20px rgba(59, 130, 246, 0.5)'
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleJoinMeeting}
                variant="outline"
                size="lg"
                className="border-2 border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg font-semibold rounded-xl backdrop-blur-sm transition-all duration-300 hover:border-white/50"
              >
                Join Meeting
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.h2 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold mb-6 text-white cyber-text px-6 py-3 glass-enhanced rounded-2xl inline-block border-2 border-white/30 shadow-2xl font-orbitron tracking-tight"
          >
            Revolutionary Features
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-100 max-w-3xl mx-auto px-4 py-2 bg-black/40 rounded-lg backdrop-blur-sm border border-white/20"
          >
            Experience the future of accessible video conferencing
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30, rotateY: -15 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ 
                scale: 1.05, 
                y: -5,
                rotateY: 5,
                transition: { duration: 0.3 }
              }}
              className="glass-enhanced hover:shadow-2xl transition-all duration-300 p-6 relative overflow-hidden group"
            >
              {/* Hover Effect Background */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              <motion.div 
                className="text-blue-400 mb-4 relative z-10"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-black/40 backdrop-blur-sm p-3 rounded-full border border-blue-500/30">
                {feature.icon}
                </div>
              </motion.div>
              <h3 className="text-xl font-bold mb-3 text-white relative z-10 drop-shadow-lg">
                {feature.title}
              </h3>
              <p className="text-gray-100 relative z-10 leading-relaxed">
                {feature.description}
              </p>
              
              {/* Animated Border */}
              <div className="absolute inset-0 rounded-lg border border-transparent bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 container mx-auto px-4 py-8 border-t border-gray-700">
        <div className="text-center text-gray-400">
          <p>&copy; 2024 SignSync Meet. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
