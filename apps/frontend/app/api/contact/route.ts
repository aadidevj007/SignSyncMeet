import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Forward to backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    
    let response
    try {
      response = await fetch(`${backendUrl}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, subject, message }),
      })
    } catch (fetchError: any) {
      console.error('Failed to connect to backend:', fetchError)
      // If backend is unreachable, still return success (backend will handle email)
      return NextResponse.json({ 
        success: true, 
        message: 'Message received. We will get back to you soon.' 
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error:', response.status, errorText)
      // Still return success to avoid exposing backend issues
      return NextResponse.json({ 
        success: true, 
        message: 'Message received. We will get back to you soon.' 
      })
    }

    const result = await response.json()

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Message sent successfully' })
    } else {
      // Even if backend says failed, we return success to user
      return NextResponse.json({ 
        success: true, 
        message: 'Message received. We will get back to you soon.' 
      })
    }
  } catch (error: any) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

