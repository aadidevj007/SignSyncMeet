import type { Metadata } from 'next'
import { Orbitron, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/lib/theme-context'
import { Toaster } from 'react-hot-toast'

const orbitron = Orbitron({ 
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '500', '600', '700', '800', '900']
})

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space',
  weight: ['300', '400', '500', '600', '700']
})

export const metadata: Metadata = {
  title: 'SignSync Meet - AI Video Conferencing',
  description: 'Futuristic AI Video Conferencing for Bidirectional Sign ↔ Speech Translation',
  keywords: ['sign language', 'video conferencing', 'AI', 'accessibility', 'translation'],
  authors: [{ name: 'SignSync Team' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`h-full ${orbitron.variable} ${spaceGrotesk.variable}`}>
      <body className={`font-space h-full bg-gray-900 dark:bg-gray-900 bg-white dark:text-white text-gray-900`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#fff',
                  border: '1px solid #374151',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
