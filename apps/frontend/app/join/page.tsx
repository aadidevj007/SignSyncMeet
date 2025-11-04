'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { Video, Users, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from '@/components/Logo'

export default function JoinMeetingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    meetingId: '',
    password: '',
    displayName: ''
  })
  const [joining, setJoining] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/join')
      return
    }
  }, [user, loading, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.meetingId.trim()) {
      toast.error('Please enter a meeting ID')
      return
    }

    if (!formData.displayName.trim()) {
      toast.error('Please enter your display name')
      return
    }

    setJoining(true)
    try {
      // Here you would typically validate the meeting ID and password with your backend
      // For now, we'll just redirect to the meeting
      router.push(`/meet/${formData.meetingId}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to join meeting')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/20" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </button>

        {/* Join Meeting Card */}
        <div className="card glass">
          <div className="text-center mb-8">
            <Logo size="lg" />
            <h1 className="text-3xl font-bold text-white mt-4 mb-2">
              Join Meeting
            </h1>
            <p className="text-gray-300">
              Enter the meeting details to join
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Meeting ID */}
            <div>
              <label htmlFor="meetingId" className="block text-sm font-medium text-gray-300 mb-2">
                Meeting ID *
              </label>
              <input
                id="meetingId"
                name="meetingId"
                type="text"
                value={formData.meetingId}
                onChange={handleChange}
                className="input-field text-center font-mono text-lg"
                placeholder="Enter meeting ID"
                required
              />
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
                Your Name *
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your display name"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Meeting Password (if required)
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pr-10"
                  placeholder="Enter meeting password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              loading={joining}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 text-lg font-semibold"
            >
              <Video className="w-5 h-5 mr-2" />
              Join Meeting
            </Button>
          </form>

          {/* Quick Join Options */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-center text-gray-400 mb-4">
              Or join with a meeting link
            </p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Paste meeting link here"
                className="input-field text-sm"
                onChange={(e) => {
                  const link = e.target.value
                  const match = link.match(/\/meet\/([A-Z0-9]+)/)
                  if (match) {
                    setFormData({
                      ...formData,
                      meetingId: match[1]
                    })
                  }
                }}
              />
              <Button
                onClick={() => {
                  const link = (document.querySelector('input[placeholder="Paste meeting link here"]') as HTMLInputElement)?.value
                  const match = link?.match(/\/meet\/([A-Z0-9]+)/)
                  if (match) {
                    setFormData({
                      ...formData,
                      meetingId: match[1]
                    })
                    toast.success('Meeting ID extracted from link!')
                  } else {
                    toast.error('Invalid meeting link format')
                  }
                }}
                variant="outline"
                className="w-full border-gray-600 hover:bg-gray-700 text-white"
              >
                Extract Meeting ID
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
