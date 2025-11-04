'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Menu, X, User, LogOut } from 'lucide-react'
import Logo from '@/components/Logo'

export default function Header() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleProfile = () => {
    router.push('/profile')
    setIsMenuOpen(false)
  }

  const handleCreateMeeting = () => {
    router.push('/create')
    setIsMenuOpen(false)
  }

  const handleJoinMeeting = () => {
    router.push('/join')
    setIsMenuOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => router.push('/about')}
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                About
              </button>
              <button
                onClick={() => router.push('/contact')}
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Contact
              </button>
            </div>
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={handleCreateMeeting}
                      size="sm"
                      className="bg-primary-600 hover:bg-primary-700"
                    >
                      Create Meeting
                    </Button>
                    <Button
                      onClick={handleJoinMeeting}
                      variant="outline"
                      size="sm"
                    >
                      Join Meeting
                    </Button>
                  </div>
                  
                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                        {user?.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="text-gray-300">{user?.displayName || user?.email || 'User'}</span>
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-50">
                        <button
                          onClick={handleProfile}
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 w-full text-left"
                        >
                          <User className="w-4 h-4 mr-2" />
                          Profile
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 w-full text-left"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => router.push('/login')}
                    variant="ghost"
                    size="sm"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => router.push('/signup')}
                    size="sm"
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800 rounded-lg mt-2">
              <button
                onClick={() => {
                  router.push('/')
                  setIsMenuOpen(false)
                }}
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
              >
                Home
              </button>
              <button
                onClick={() => {
                  router.push('/about')
                  setIsMenuOpen(false)
                }}
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
              >
                About
              </button>
              <button
                onClick={() => {
                  router.push('/contact')
                  setIsMenuOpen(false)
                }}
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
              >
                Contact
              </button>
              
              {user ? (
                <>
                  <button
                    onClick={handleCreateMeeting}
                    className="bg-primary-600 hover:bg-primary-700 text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                  >
                    Create Meeting
                  </button>
                  <button
                    onClick={handleJoinMeeting}
                    className="border border-gray-600 text-gray-300 hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                  >
                    Join Meeting
                  </button>
                  <button
                    onClick={handleProfile}
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      router.push('/login')
                      setIsMenuOpen(false)
                    }}
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      router.push('/signup')
                      setIsMenuOpen(false)
                    }}
                    className="bg-primary-600 hover:bg-primary-700 text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
