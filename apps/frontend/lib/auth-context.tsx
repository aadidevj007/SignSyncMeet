'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { 
  getAuth, 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBLFqMz6Uj3kQNTEVXtKpXQm6xe8bGJ4Ts',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'signsync-meet-f2053.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'signsync-meet-f2053',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'signsync-meet-f2053.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '747400022903',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:747400022903:web:49c171ac0e3ea1cbfaef72',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-QLJFQJ8VW2'
}

if (!getApps().length) {
  initializeApp(firebaseConfig)
}

type AuthContextValue = {
  user: User | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({ 
  user: null, 
  token: null, 
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {}
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getAuth()
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const t = await u.getIdToken()
        setToken(t)
      } else {
        setToken(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Auto-logout after inactivity
  useEffect(() => {
    if (!user) return

    let inactivityTimer: NodeJS.Timeout
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes

    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        console.log('User inactive for 30 minutes, signing out...')
        const auth = getAuth()
        firebaseSignOut(auth)
      }, INACTIVITY_TIMEOUT)
    }

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true)
    })

    // Start the timer
    resetTimer()

    // Cleanup
    return () => {
      clearTimeout(inactivityTimer)
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true)
      })
    }
  }, [user])

  const signIn = async (email: string, password: string) => {
    const auth = getAuth()
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string) => {
    const auth = getAuth()
    await createUserWithEmailAndPassword(auth, email, password)
  }

  const signInWithGoogle = async () => {
    const auth = getAuth()
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const signOut = async () => {
    const auth = getAuth()
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      signIn, 
      signUp, 
      signInWithGoogle, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)