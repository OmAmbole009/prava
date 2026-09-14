import { motion } from 'framer-motion'

const INK = '#ffffff'
const avatars = [
  'linear-gradient(135deg, #f0abfc, #a855f7)',
  'linear-gradient(135deg, #fdba74, #ea580c)',
  'linear-gradient(135deg, #93c5fd, #2563eb)',
]

const steps = [
  { n: '01', label: 'Sign Up', icon: <path d="M16 20v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /> },
  { n: '02', label: 'Add Projects', icon: <><rect x="3" y="4" width="14" height="10" rx="2" /><path d="M7 20h6M10 14v6" /></> },
  { n: '03', label: 'Invite Team', icon: <path d="M17 20v-2a4 4 0 0 0-3-3.87M11 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM15 4.5a3 3 0 0 1 0 5.8" /> },
  { n: '04', label: 'Start Working', icon: <path d="M3 11l8-7 8 7M5 9.5V19h10V9.5" /> },
]

export default function Hero() {
  return (
    <section style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <video style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} src="/hero.mp4" autoPlay muted loop playsInline />
      {/* Overlays — opacity reduced by 70% */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0.05) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.21) 100%)' }} />
      <div style={{ position: 'absolute', top: '-10%', left: '5%', width: '700px', height: '700px', background: 'radial-gradient(ellipse at 30% 30%, rgba(14,116,144,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* Left content */}
      <div style={{ position: 'absolute', left: '6vw', top: '17vh', zIndex: 10, maxWidth: '620px' }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '17px' }}
        >
          <div style={{ display: 'flex', padding: '3px', background: 'rgba(255,255,255,0.14)', borderRadius: '999px' }}>
            {avatars.map((bg, i) => (
              <span key={i} style={{ width: '22px', height: '22px', borderRadius: '999px', background: bg, border: '2px solid rgba(20,20,25,0.6)', marginLeft: i === 0 ? 0 : '-8px' }} />
            ))}
          </div>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: 500, textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}>+10,000 teams already plan with “Orchid”</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.22, ease: 'easeOut' }}
          style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, fontSize: 'clamp(2.2rem, 5.1vw, 4.25rem)', lineHeight: 1.02, letterSpacing: '-0.01em', color: INK, textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}
        >
          Manage <em style={{ fontStyle: 'italic', fontWeight: 500 }}>Your Work</em><br />
          The Simple Way
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          style={{ margin: '17px 0 0', maxWidth: '375px', fontSize: '13px', lineHeight: 1.6, color: 'rgba(255,255,255,0.72)', fontWeight: 500, textShadow: '0 1px 14px rgba(0,0,0,0.5)' }}
        >
          Beautifully simple project management for creative teams. Your workflow is just four steps away from running itself.
        </motion.p>

        {/* Button */}
        <motion.a
          href="#start"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.54, ease: 'easeOut' }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginTop: '27px', padding: '7px 22px 7px 7px', borderRadius: '14px', background: '#1c1c22', border: '1px solid rgba(255,255,255,0.16)', textDecoration: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
        >
          <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" /></svg>
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff' }}>Start Your Project</span>
        </motion.a>
      </div>

      {/* Steps row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
        style={{ position: 'absolute', left: '6vw', bottom: '16vh', zIndex: 10, display: 'flex', gap: '12px' }}
      >
        {steps.map((step) => (
          <div key={step.n} style={{ width: '78px' }}>
            <div style={{ height: '72px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{step.icon}</svg>
              <span style={{ fontSize: '11px', fontWeight: 600, color: INK }}>{step.label}</span>
            </div>
            <div style={{ marginTop: '9px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{step.n}</span>
              <div style={{ marginTop: '5px', width: '19px', height: '2px', borderRadius: '2px', background: 'rgba(255,255,255,0.4)' }} />
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  )
}
