'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { ArrowLeft, Mail, Phone, MapPin, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import Header from '@/components/Header'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Message sent successfully!')
        setFormData({ name: '', email: '', subject: '', message: '' })
      } else {
        toast.error(result.error || 'Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

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
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 font-orbitron cyber-text tracking-tight">
              Contact Us
            </h1>
            <p className="text-xl text-white font-semibold max-w-2xl mx-auto px-6 py-3 bg-gradient-to-r from-purple-600/30 to-pink-600/30 backdrop-blur-lg rounded-xl inline-block border-2 border-white/40 shadow-2xl">
              Get in touch with our team. We'd love to hear from you!
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Get in Touch</h2>
                <p className="text-gray-300 mb-8">
                  Have questions about SignSync Meet? Want to learn more about our 
                  accessibility features? We're here to help!
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-xl border-2 border-blue-400">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Email</h3>
                    <p className="text-gray-100 font-medium">aadidevj4047@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center shadow-xl border-2 border-green-400">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Phone</h3>
                    <p className="text-gray-100 font-medium">+91 7593014047</p>
                  </div>
                </div>

                {/* Project Team Section */}
                <div className="mt-8 pt-8 border-t border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4 cyber-text">Project Team Members</h3>
                  <div className="space-y-4">
                    {/* Team Member 1 */}
                    <div className="flex items-center space-x-3 bg-black/30 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-white">
                        A
                      </div>
                      <div>
                        <p className="text-white font-semibold">Aadidev J</p>
                        <p className="text-xs text-gray-300">Section : S13 | Reg No: 99230041022</p>
                      </div>
                    </div>

                    {/* Team Member 2 */}
                    <div className="flex items-center space-x-3 bg-black/30 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center font-bold text-white">
                        D
                      </div>
                      <div>
                        <p className="text-white font-semibold">S Dhanush</p>
                        <p className="text-xs text-gray-300">Section : S13 | Reg No: 99230041087</p>
                      </div>
                    </div>

                    {/* Team Member 3 */}
                    <div className="flex items-center space-x-3 bg-black/30 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-white">
                        G
                      </div>
                      <div>
                        <p className="text-white font-semibold">S Ganesh Kumar</p>
                        <p className="text-xs text-gray-300">Section : S13 | Reg No: 99230041090</p>
                      </div>
                    </div>

                    {/* Team Member 4 */}
                    <div className="flex items-center space-x-3 bg-black/30 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center font-bold text-white">
                        S
                      </div>
                      <div>
                        <p className="text-white font-semibold">G Sudharsan</p>
                        <p className="text-xs text-gray-300">Section : S13 | Reg No: 99230041105</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="card glass p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Send us a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    value={formData.subject}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="What's this about?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    className="input-field resize-none"
                    placeholder="Tell us how we can help..."
                    required
                  />
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 text-lg font-semibold"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </Button>
              </form>
            </motion.div>
          </div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-16"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card glass p-6">
                <h3 className="text-lg font-semibold text-white mb-2">How does sign language translation work?</h3>
                <p className="text-gray-300">
                  Our AI uses computer vision to detect sign language gestures and converts them to text and speech in real-time.
                </p>
              </div>
              <div className="card glass p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Is SignSync Meet free to use?</h3>
                <p className="text-gray-300">
                  We offer a free tier with basic features. Premium plans include advanced AI capabilities and priority support.
                </p>
              </div>
              <div className="card glass p-6">
                <h3 className="text-lg font-semibold text-white mb-2">What languages are supported?</h3>
                <p className="text-gray-300">
                  We currently support American Sign Language (ASL) with plans to expand to other sign languages worldwide.
                </p>
              </div>
              <div className="card glass p-6">
                <h3 className="text-lg font-semibold text-white mb-2">How secure is the platform?</h3>
                <p className="text-gray-300">
                  All communications are encrypted end-to-end, and we follow enterprise-grade security standards.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
