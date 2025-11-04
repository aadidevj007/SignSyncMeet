'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { 
  Video, 
  Users, 
  Clock, 
  Lock, 
  Settings, 
  ArrowLeft, 
  Copy, 
  Check,
  Eye,
  EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from '@/components/Logo'

export default function CreateMeetingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    meetingName: '',
    enableLobby: true,
    enableSignToText: true,
    enableSpeechToText: true,
    password: '',
    enablePassword: false,
    allowScreenShare: true,
    allowChat: true,
    allowRecordings: false
  })
  const [creating, setCreating] = useState(false)
  const [meetingId, setMeetingId] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/create')
      return
    }
  }, [user, loading, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    })
  }

  const generateMeetingId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.meetingName.trim()) {
      toast.error('Please enter a meeting name')
      return
    }

    if (formData.enablePassword && !formData.password.trim()) {
      toast.error('Please enter a password')
      return
    }

    setCreating(true)
    try {
      // Generate meeting ID and link
      const id = generateMeetingId()
      const link = `${window.location.origin}/meet/${id}`
      
      setMeetingId(id)
      setMeetingLink(link)
      
      // Here you would typically save the meeting to your backend
      // For now, we'll just show success
      toast.success('Meeting created successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create meeting')
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    )
  }

  if (meetingId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/20" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-2xl"
        >
          <div className="card glass text-center">
            <div className="mb-8">
              <Logo size="lg" />
              <h1 className="text-3xl font-bold text-white mt-4 mb-2">
                Meeting Created!
              </h1>
              <p className="text-gray-300">
                Your meeting is ready. Share the details below with participants.
              </p>
            </div>

            <div className="space-y-6">
              {/* Meeting ID */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Meeting ID
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={meetingId}
                    readOnly
                    className="input-field flex-1 text-center font-mono text-lg"
                  />
                  <Button
                    onClick={() => copyToClipboard(meetingId)}
                    variant="outline"
                    size="sm"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Meeting Link */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Meeting Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={meetingLink}
                    readOnly
                    className="input-field flex-1 text-sm"
                  />
                  <Button
                    onClick={() => copyToClipboard(meetingLink)}
                    variant="outline"
                    size="sm"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  onClick={() => router.push(`/meet/${meetingId}`)}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 text-lg font-semibold"
                >
                  <Video className="w-5 h-5 mr-2" />
                  Join Meeting
                </Button>
                <Button
                  onClick={() => {
                    setMeetingId('')
                    setMeetingLink('')
                  }}
                  variant="outline"
                  className="flex-1 border-gray-600 hover:bg-gray-700 text-white py-3 text-lg font-semibold"
                >
                  Create Another
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
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
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </button>

        {/* Create Meeting Card */}
        <div className="card glass">
          <div className="text-center mb-8">
            <Logo size="lg" />
            <h1 className="text-3xl font-bold text-white mt-4 mb-2">
              Create New Meeting
            </h1>
            <p className="text-gray-300">
              Set up your video conference with AI-powered sign language translation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Meeting Name */}
            <div>
              <label htmlFor="meetingName" className="block text-sm font-medium text-gray-300 mb-2">
                Meeting Name *
              </label>
              <input
                id="meetingName"
                name="meetingName"
                type="text"
                value={formData.meetingName}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter meeting name"
                required
              />
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Features
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="enableLobby"
                      checked={formData.enableLobby}
                      onChange={handleChange}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-gray-300">Enable Lobby (Host approval required)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="enableSignToText"
                      checked={formData.enableSignToText}
                      onChange={handleChange}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-300">Sign Language Translation</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="enableSpeechToText"
                      checked={formData.enableSpeechToText}
                      onChange={handleChange}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-300">Speech to Text</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowScreenShare"
                      checked={formData.allowScreenShare}
                      onChange={handleChange}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-300">Allow Screen Sharing</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowChat"
                      checked={formData.allowChat}
                      onChange={handleChange}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-300">Allow Chat</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowRecordings"
                      checked={formData.allowRecordings}
                      onChange={handleChange}
                      className="rounded border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-300">Allow Recordings</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Security
                </h3>
                <div className="space-y-4">
                  {/* Password */}
                  <div>
                    <label className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        name="enablePassword"
                        checked={formData.enablePassword}
                        onChange={handleChange}
                        className="rounded border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-300 flex items-center">
                        <Lock className="w-4 h-4 mr-1" />
                        Require Password
                      </span>
                    </label>
                    {formData.enablePassword && (
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
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
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              loading={creating}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 text-lg font-semibold"
            >
              <Video className="w-5 h-5 mr-2" />
              Create Meeting
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
