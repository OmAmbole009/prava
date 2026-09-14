import { motion } from 'framer-motion'

const INK = '#ffffff'
const navLinks = ["Home", "Features", "Pricing", "Support", "Login"]

export default function Navbar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 40px' }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="28" height="28" rx="9" stroke={INK} strokeWidth="1.5" />
          <g fill="none" stroke={INK} strokeWidth="1.3">
            <ellipse cx="16" cy="11.2" rx="2.3" ry="3.3" />
            <ellipse cx="16" cy="20.8" rx="2.3" ry="3.3" />
            <ellipse cx="11.2" cy="16" rx="3.3" ry="2.3" />
            <ellipse cx="20.8" cy="16" rx="3.3" ry="2.3" />
          </g>
          <circle cx="16" cy="16" r="1.7" fill={INK} />
        </svg>
        <span style={{ fontSize: '21px', fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>Orchid</span>
      </div>

      {/* Center links with dots */}
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '18px' }}>
        {navLinks.map((link, i) => (
          <div key={link} style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {i > 0 && <span style={{ width: '4px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.4)' }} />}
            <a
              href={`#${link.toLowerCase()}`}
              style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.78)', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'color 0.2s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = INK }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.78)' }}
            >
              {link}
            </a>
          </div>
        ))}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.82)' }}>
          EN
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </span>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </div>
    </motion.div>
  )
}
