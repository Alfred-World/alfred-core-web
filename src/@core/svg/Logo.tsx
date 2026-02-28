// React Imports
import type { SVGAttributes } from 'react'

const Logo = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg width="1.5em" height="1.5em" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#00f2fe', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#4facfe', stopOpacity: 1 }} />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path d="M50 0 L90 25 L90 75 L50 100 L10 75 L10 25 Z" fill="none" stroke="#2c3e50" strokeWidth="2" opacity="0.3" />
      <path d="M50 10 L85 35 L50 60 L15 35 Z" fill="url(#mainGrad)" filter="url(#glow)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M50 90 L85 65 L50 40 L15 65 Z" fill="#1a2a6c" opacity="0.8" />
      <circle cx="50" cy="50" r="8" fill="#fff" filter="url(#glow)" />
    </svg>
  )
}

export default Logo
