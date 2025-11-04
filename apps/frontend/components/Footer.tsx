import React from 'react'
import { Github, Linkedin, Mail, Twitter } from 'lucide-react'

const teamMembers = [
  {
    name: 'Alex Johnson',
    regNumber: 'CS2021001',
    department: 'Computer Science',
    photo: '/avatars/alex.jpg',
    linkedin: 'https://linkedin.com/in/alexjohnson',
    github: 'https://github.com/alexjohnson'
  },
  {
    name: 'Sarah Chen',
    regNumber: 'CS2021002',
    department: 'Computer Science',
    photo: '/avatars/sarah.jpg',
    linkedin: 'https://linkedin.com/in/sarahchen',
    github: 'https://github.com/sarahchen'
  },
  {
    name: 'Michael Rodriguez',
    regNumber: 'CS2021003',
    department: 'Computer Science',
    photo: '/avatars/michael.jpg',
    linkedin: 'https://linkedin.com/in/michaelrodriguez',
    github: 'https://github.com/michaelrodriguez'
  },
  {
    name: 'Emily Watson',
    regNumber: 'CS2021004',
    department: 'Computer Science',
    photo: '/avatars/emily.jpg',
    linkedin: 'https://linkedin.com/in/emilywatson',
    github: 'https://github.com/emilywatson'
  }
]

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Team Section */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-center mb-8 gradient-text">
            Created by
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-700 transition-colors"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h4 className="text-lg font-semibold text-white mb-1">
                  {member.name}
                </h4>
                <p className="text-sm text-gray-400 mb-1">
                  {member.regNumber}
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  {member.department}
                </p>
                <div className="flex justify-center space-x-3">
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-primary-400 transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-primary-400 transition-colors"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">
            Contact Us
          </h3>
          <div className="flex justify-center space-x-6">
            <a
              href="mailto:contact@signsync.meet"
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span>contact@signsync.meet</span>
            </a>
            <a
              href="https://twitter.com/signsync"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <Twitter className="w-5 h-5" />
              <span>@signsync</span>
            </a>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8">
                <svg
                  viewBox="0 0 32 32"
                  className="w-full h-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="url(#gradient1)"
                    stroke="url(#gradient2)"
                    strokeWidth="2"
                  />
                  <path
                    d="M10 14 L14 10 L18 14 L22 10 L26 14 L26 22 C26 26 22 28 18 28 C14 28 10 26 10 22 L10 14 Z"
                    fill="white"
                    opacity="0.9"
                  />
                </svg>
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
              </div>
              <span className="text-xl font-bold gradient-text">
                SignSync Meet
              </span>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-gray-400 text-sm mb-2">
                © 2024 SignSync Meet. All rights reserved.
              </p>
              <p className="text-gray-500 text-xs">
                Built with ❤️ for the deaf and hard-of-hearing community
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
