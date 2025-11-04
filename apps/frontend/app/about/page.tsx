'use client'

import { motion } from 'framer-motion'
import Logo from '@/components/Logo'
import Header from '@/components/Header'
import { ArrowLeft, Users, Globe, Shield, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AboutPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 via-purple-900 to-purple-950 relative overflow-hidden particles-bg">
      <div className="absolute inset-0 bg-black/10" />
      
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
      
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-12 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Logo and Title */}
          <div className="mb-12">
            <Logo size="xl" />
            <h1 className="text-4xl md:text-6xl font-bold text-white mt-6 mb-4 font-orbitron cyber-text tracking-tight">
              About SignSync Meet
            </h1>
            <p className="text-xl text-white font-semibold max-w-2xl mx-auto px-6 py-3 bg-gradient-to-r from-blue-600/30 to-purple-600/30 backdrop-blur-lg rounded-xl inline-block border-2 border-white/40 shadow-2xl">
              Revolutionary video conferencing with real-time sign language translation
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="card glass p-6 text-center"
            >
              <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Inclusive Communication</h3>
              <p className="text-gray-300">
                Break down language barriers with AI-powered sign language translation
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="card glass p-6 text-center"
            >
              <Globe className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Global Accessibility</h3>
              <p className="text-gray-300">
                Connect people worldwide with seamless video conferencing
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="card glass p-6 text-center"
            >
              <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Secure & Private</h3>
              <p className="text-gray-300">
                Enterprise-grade security with end-to-end encryption
              </p>
            </motion.div>
          </div>

          {/* Mission Statement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="card glass p-8 mb-16"
          >
            <Zap className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              To create a world where communication knows no boundaries. SignSync Meet empowers 
              deaf and hard-of-hearing individuals to participate fully in digital conversations 
              through cutting-edge AI technology that translates sign language in real-time.
            </p>
          </motion.div>

          {/* Technology */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-8">Powered by Advanced AI</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="card glass p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Real-time Translation</h3>
                <p className="text-gray-300">
                  Our AI models process sign language gestures and convert them to speech 
                  instantly, enabling seamless communication.
                </p>
              </div>
              <div className="card glass p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Bidirectional Support</h3>
                <p className="text-gray-300">
                  Convert speech to sign language and sign language to speech, creating 
                  a truly inclusive meeting experience.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
