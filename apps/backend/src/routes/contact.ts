import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import nodemailer from 'nodemailer'

const router = Router()

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'aadidevj4@gmail.com',
    pass: process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD,
  },
})

// Contact form submission
router.post('/contact', asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body

  if (!name || !email || !message) {
    return res.status(400).json({ 
      success: false, 
      error: 'Name, email, and message are required' 
    })
  }

  try {
    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER || 'aadidevj4@gmail.com',
      to: 'aadidevj4@gmail.com',
      subject: subject || `Contact Form: ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Sent from SignSync Meet contact form</small></p>
      `,
      replyTo: email,
    }

    await transporter.sendMail(mailOptions)

    res.json({ 
      success: true, 
      message: 'Message sent successfully' 
    })
  } catch (error: any) {
    console.error('Error sending email:', error)
    
    // If email fails, still return success (to avoid exposing email config issues)
    // In production, you might want to log this and handle it differently
    res.json({ 
      success: true, 
      message: 'Message received. We will get back to you soon.' 
    })
  }
}))

export default router

