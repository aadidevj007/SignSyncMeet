'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, User, Camera, Save, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    avatar: '',
    allowLowConfidenceSaves: false
  })
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      setProfileData({
        name: user.displayName || '',
        email: user.email || '',
        avatar: user.photoURL || '',
        allowLowConfidenceSaves: (typeof window !== 'undefined' && localStorage.getItem('allowLowConfidenceSaves') === 'true') || false
      })
    }
  }, [user, loading, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB')
        return
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        setProfileData(prev => ({
          ...prev,
          avatar: event.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      // Update Firebase user profile
      const { updateProfile } = await import('firebase/auth')
      
      if (profileData.name && profileData.name !== user.displayName) {
        await updateProfile(user, { displayName: profileData.name })
      }
      
      // Persist consent locally
      if (typeof window !== 'undefined') {
        localStorage.setItem('allowLowConfidenceSaves', String(profileData.allowLowConfidenceSaves))
      }
      
      toast.success('Profile updated successfully!')
      setIsEditing(false)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
      router.push('/')
    } catch (error) {
      toast.error('Failed to sign out')
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Header */}
      <div className="relative z-10 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Profile Settings</h1>
            <p className="text-gray-300">Manage your account information</p>
          </div>

          <div className="card glass p-8">
            {/* Avatar Section */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden mx-auto mb-4">
                  {profileData.avatar ? (
                    <img
                      src={profileData.avatar}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-gray-400">Click the camera icon to upload a new avatar</p>
            </div>

            {/* Profile Form */}
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={profileData.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="input-field"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  disabled={true}
                  className="input-field bg-gray-700 cursor-not-allowed"
                  placeholder="Email address"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="allowLowConfidenceSaves"
                  name="allowLowConfidenceSaves"
                  type="checkbox"
                  checked={profileData.allowLowConfidenceSaves}
                  onChange={(e) => setProfileData(prev => ({ ...prev, allowLowConfidenceSaves: e.target.checked }))}
                  disabled={!isEditing}
                  className="h-4 w-4"
                />
                <label htmlFor="allowLowConfidenceSaves" className="text-sm text-gray-300">
                  Allow saving low-confidence clips for model improvement
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3"
                >
                  <User className="w-5 h-5 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    loading={saving}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false)
                      // Reset to original values
                      setProfileData({
                        name: user?.displayName || '',
                        email: user?.email || '',
                        avatar: user?.photoURL || ''
                      })
                    }}
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 py-3"
                  >
                    Cancel
                  </Button>
                </>
              )}
              
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white py-3"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Account Info */}
          <div className="card glass p-6 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">User ID:</span>
                <p className="text-white font-mono text-xs break-all">{user?.uid}</p>
              </div>
              <div>
                <span className="text-gray-400">Provider:</span>
                <p className="text-white">{user?.providerData[0]?.providerId || 'Email'}</p>
              </div>
              <div>
                <span className="text-gray-400">Email Verified:</span>
                <p className="text-white">{user?.emailVerified ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="text-gray-400">Created:</span>
                <p className="text-white">
                  {user?.metadata?.creationTime ? 
                    new Date(user.metadata.creationTime).toLocaleDateString() : 
                    'Unknown'
                  }
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}