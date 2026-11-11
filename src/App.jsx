import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AnimatePresence, MotionConfig, animate, motion, useInView, useMotionValueEvent,
  useScroll, useSpring, useTransform,
} from 'framer-motion'
import {
  DEPART_AT, trip, pace, marquee, route, days, highlights, note, budget,
  checklist, alternatives, credits, img,
} from './data.js'

const TAG_LABEL = { go: 'เดินทาง', eat: 'กิน', fun: 'เที่ยว', opt: 'เลือกได้', chill: 'ชิล' }
const EASE = [0.22, 1, 0.36, 1]
const fmt = (n) => Math.round(n).toLocaleString('th-TH')

function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw == null ? initial : JSON.parse(raw)
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
  }, [key, value])
  return [value, setValue]
}

/* ---------------- Intro loader ---------------- */
function Intro({ onDone }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const c = animate(0, 100, { duration: 1.5, ease: 'easeInOut', onUpdate: setN, onComplete: () => setTimeout(onDone, 250) })
    return () => c.stop()
  }, [onDone])
  return (
    <motion.div className="intro" exit={{ y: '-100%' }} transition={{ duration: 0.9, ease: EASE }}>
      <motion.p className="intro-word" initial={{ opacity: 0, letterSpacing: '0.6em' }} animate={{ opacity: 1, letterSpacing: '0.2em' }} transition={{ duration: 1.2, ease: EASE }}>
        ສະບາຍດີ
      </motion.p>
      <p className="intro-sub">สะบายดี · กำลังพาไปลาว</p>
      <div className="intro-count">{String(Math.round(n)).padStart(3, '0')}</div>
      <div className="intro-bar"><i style={{ transform: `scaleX(${n / 100})` }} /></div>
    </motion.div>
  )
}

/* ---------------- Countdown ---------------- */
function Countdown() {
  const target = new Date(DEPART_AT).getTime()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, target - now)
  const parts = [
    ['วัน', Math.floor(diff / 864e5)],
    ['ชม.', Math.floor(diff / 36e5) % 24],
    ['นาที', Math.floor(diff / 6e4) % 60],
    ['วิ', Math.floor(diff / 1e3) % 60],
  ]
  return (
    <div className="countdown" aria-label="นับถอยหลังถึงวันออกเดินทาง">
      <span className="cd-label">ออกเดินทางใน</span>
      <div className="cd-cells">
        {parts.map(([label, v]) => (
          <div className="cd-cell" key={label}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.b key={v} initial={{ y: '-60%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '60%', opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                {String(v).padStart(2, '0')}
              </motion.b>
            </AnimatePresence>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Hero quick facts ---------------- */
const ICONS = {
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  bed: <><path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="2" /></>,
  route: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h8a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h8" /></>,
  train: <><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14M9 21l-2-4M15 21l2-4" /><circle cx="9" cy="14" r=".6" /><circle cx="15" cy="14" r=".6" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M16 15h2" /><path d="M6 6l9-3 1.5 3" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
}
function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

function SummaryModal({ onClose }) {
  const closeRef = useRef(null)
  const lo = budget.reduce((s, b) => s + b[2], 0)
  const hi = budget.reduce((s, b) => s + b[3], 0)
  const k = (n) => (n / 1000).toFixed(1).replace('.0', '')
  const facts = [
    { icon: 'calendar', b: '3 วัน 2 คืน', s: 'ส. 20 – จ. 22 ก.พ.' },
    { icon: 'bed', b: 'วังเวียง · แพเฟือง', s: 'ที่ละ 1 คืน' },
    { icon: 'route', b: '~340 กม. ขับเอง', s: 'ขอนแก่น ⇄ หนองคาย' },
    { icon: 'train', b: 'รถไฟ + รถเหมา', s: 'เที่ยวในลาว' },
    { icon: 'wallet', b: `${k(lo)}–${k(hi)}k บาท`, s: 'ต่อคนโดยประมาณ' },
  ]
  useEffect(() => {
    const prev = document.activeElement
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const ov = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ov
      prev?.focus?.()
    }
  }, [onClose])
  const item = { hide: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }
  return (
    <motion.div className="modal-back" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <motion.div
        className="modal" role="dialog" aria-modal="true" aria-labelledby="sum-h"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.85, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        <div className="modal-head">
          <div>
            <span className="sec-label">สรุปทริป</span>
            <h2 id="sum-h">ขอนแก่น → ลาว</h2>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="ปิด"><Icon name="close" /></button>
        </div>
        <motion.div initial="hide" animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } } }}>
          <ul className="sum-facts">
            {facts.map((f) => (
              <motion.li key={f.icon} variants={item}>
                <span className="fact-ic"><Icon name={f.icon} /></span>
                <span className="fact-tx"><b>{f.b}</b><small>{f.s}</small></span>
              </motion.li>
            ))}
          </ul>
          <ol className="sum-days">
            {days.map((d, i) => (
              <motion.li key={d.no} variants={item}>
                <div className="sum-day-head">
                  <b>วันที่ {i + 1}</b>
                  <span className={`mood-chip m${i + 1}`}>{d.mood}</span>
                  <small>{d.date}</small>
                </div>
                <div className="sum-chips">{d.brief.map((x) => <span key={x}>{x}</span>)}</div>
                <p className="sum-sleep"><Icon name={i < 2 ? 'moon' : 'route'} />{d.sleep}</p>
              </motion.li>
            ))}
          </ol>
        </motion.div>
        <a className="modal-cta" href="#day-1" onClick={onClose}>ดูแผนเต็ม</a>
      </motion.div>
    </motion.div>
  )
}

function SummaryButton({ ready }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <motion.button
        className="sum-btn" onClick={() => setOpen(true)} aria-haspopup="dialog"
        initial={{ opacity: 0, scale: 0.6 }} animate={ready ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 1.2, type: 'spring', stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
      >
        <span className="sum-ring" aria-hidden="true" />
        <span className="fact-ic"><Icon name="list" /></span>
        <span className="sum-btn-tx"><b>สรุปทริป</b><small>ดูเร็ว ๆ</small></span>
      </motion.button>
      {createPortal(<AnimatePresence>{open && <SummaryModal onClose={close} />}</AnimatePresence>, document.body)}
    </>
  )
}

/* ---------------- Hero ---------------- */
function Hero({ ready }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 1.35])
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-40%'])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const line = (i) => ({
    initial: { y: '110%' },
    animate: ready ? { y: '0%' } : {},
    transition: { duration: 1.1, ease: EASE, delay: 0.15 + i * 0.12 },
  })
  return (
    <header className="hero" ref={ref}>
      <motion.div className="hero-media" style={{ scale, y }}>
        <img src={img('hero')} alt="ภูเขาหินปูนและทะเลหมอกยามเช้าที่วังเวียง มองจากผาน้ำซาย" />
      </motion.div>
      <div className="hero-shade" />
      <motion.div className="hero-inner" style={{ y: textY, opacity: fade }}>
        <motion.p className="kicker" initial={{ opacity: 0 }} animate={ready ? { opacity: 1 } : {}} transition={{ delay: 0.1, duration: 0.8 }}>
          <span className="live-dot" />{trip.kicker}
        </motion.p>
        <h1>
          {trip.lines.map((l, i) => (
            <span className="mask" key={l}><motion.span className={i === 2 ? 'accent' : ''} {...line(i)}>{l}</motion.span></span>
          ))}
        </h1>
        <motion.p className="hero-sub" initial={{ opacity: 0, y: 20 }} animate={ready ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.7, duration: 0.8, ease: EASE }}>
          {trip.sub}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={ready ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.9, duration: 0.8, ease: EASE }}>
          <Countdown />
        </motion.div>
      </motion.div>
      <motion.a href="#story" className="scroll-cue" style={{ opacity: fade }} aria-label="เลื่อนลง">
        <span>เลื่อนลง</span><i />
      </motion.a>
    </header>
  )
}

/* ---------------- Marquee ---------------- */
function Marquee() {
  const row = [...marquee, ...marquee]
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((m, i) => <span key={i}>{m}<i>✦</i></span>)}
      </div>
    </div>
  )
}

/* ---------------- Story + pace ---------------- */
function Story() {
  return (
    <section className="story" id="story">
      <motion.p className="story-text" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-15%' }} transition={{ duration: 1, ease: EASE }}>
        {trip.lede}
      </motion.p>
      <div className="pace">
        {pace.map((d, i) => (
          <motion.div className="pace-item" key={d.day} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.7, ease: EASE }}>
            <small>{d.day}</small>
            <b>{d.mood}</b>
            <div className="pace-meter">
              {Array.from({ length: 5 }).map((_, k) => (
                <motion.i key={k} className={k < d.level ? 'on' : ''} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.12 + k * 0.07, duration: 0.5, ease: EASE }} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Route map ---------------- */
const MAIN_D = 'M230 600 C 248 545, 258 500, 250 450 S 222 380, 220 345 S 196 300, 190 275 C 176 205, 232 125, 210 60'
// ขากลับ: วังเวียง → เมืองเฟือง (นอนแพ) → เวียงจันทน์
const BRANCH_D = 'M210 60 C 175 70, 120 95, 90 135 C 70 185, 140 245, 190 275'
const STOP_AT = [0, 0.32, 0.5, 0.6, 0.97]

function RouteMap() {
  const ref = useRef(null)
  const pathRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const main = useTransform(scrollYProgress, [0.05, 0.75], [0, 1])
  const branch = useTransform(scrollYProgress, [0.78, 0.96], [0, 1])
  const [car, setCar] = useState({ x: 230, y: 600, a: -80 })
  const [m, setM] = useState(0)
  const [b, setB] = useState(0)

  const place = (v) => {
    const p = pathRef.current
    if (!p) return
    const len = p.getTotalLength()
    const pt = p.getPointAtLength(len * v)
    const ahead = p.getPointAtLength(Math.min(len, len * v + 2))
    const behind = p.getPointAtLength(Math.max(0, len * v - 2))
    setCar({ x: pt.x, y: pt.y, a: (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI })
  }
  useMotionValueEvent(main, 'change', (v) => { setM(v); place(v) })
  useMotionValueEvent(branch, 'change', setB)

  const isOn = (i) => (route[i].side ? b > 0.45 : m >= STOP_AT[i] - 0.001 && (i > 0 || m > 0))

  return (
    <section className="routemap" ref={ref} aria-labelledby="route-h">
      <div className="routemap-sticky">
        <div className="routemap-text">
          <span className="sec-label light">เส้นทาง</span>
          <h2 id="route-h">ขึ้นด้วยรถไฟ<br />ล่องลงทางเฟือง</h2>
          <ol className="stops">
            {route.map((r, i) => (
              <li key={r.name} className={isOn(i) ? 'on' : ''}>
                <span className="stop-dot" />
                <div>
                  <b>{r.name}</b>
                  <small>{r.sub} · {r.note}</small>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="routemap-svg">
          <svg viewBox="-20 -10 440 690" preserveAspectRatio="xMidYMid meet" role="img" aria-label="แผนที่เส้นทางจากขอนแก่นถึงวังเวียงและเมืองเฟือง">
            <defs>
              <linearGradient id="routeGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#5fb2ff" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <text x="20" y="40" className="map-country">LAOS</text>
            <text x="20" y="660" className="map-country">THAILAND</text>
            <path d="M-10 335 C 70 300, 130 350, 205 312 S 330 290, 410 322" className="mekong" />
            <text x="300" y="300" className="map-river">แม่น้ำโขง</text>
            <path d={MAIN_D} className="route-ghost" />
            <path d={BRANCH_D} className="route-ghost" />
            <motion.path d={MAIN_D} ref={pathRef} className="route-line" style={{ pathLength: main }} filter="url(#glow)" />
            <motion.path d={BRANCH_D} className="route-branch" style={{ pathLength: branch }} />
            {route.map((r, i) => (
              <g key={r.name} className={`map-stop ${isOn(i) ? 'on' : ''}`}>
                <circle cx={r.x} cy={r.y} r="14" className="pulse" />
                <circle cx={r.x} cy={r.y} r="6" className="core" />
                <text x={r.side ? r.x - 12 : r.x + 16} y={r.y + 5} textAnchor={r.side ? 'end' : 'start'}>{r.name}</text>
              </g>
            ))}
            <g transform={`translate(${car.x} ${car.y}) rotate(${car.a})`} className="car">
              <rect x="-13" y="-7" width="26" height="14" rx="5" />
              <rect x="1" y="-5" width="7" height="10" rx="2" className="glass" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Day chapter ---------------- */
function ChapterIntro({ day }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const clip = useTransform(scrollYProgress, [0, 0.45], ['inset(18% 12% 18% 12% round 40px)', 'inset(0% 0% 0% 0% round 0px)'])
  const scale = useTransform(scrollYProgress, [0, 1], [1.3, 1])
  const numY = useTransform(scrollYProgress, [0, 1], ['40%', '-40%'])
  return (
    <div className="chapter-intro" ref={ref}>
      <motion.div className="chapter-media" style={{ clipPath: clip }}>
        <motion.img src={img(day.cover)} alt="" style={{ scale }} />
        <div className="chapter-shade" />
      </motion.div>
      <div className="chapter-title">
        <motion.span className="chapter-no" style={{ y: numY }}>{day.no}</motion.span>
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-20%' }} transition={{ duration: 0.9, ease: EASE }}>
          <span className={`mood mood-${day.no}`}>{day.mood}</span>
          <h2>{day.title}</h2>
          <p>{day.date} · {day.where}</p>
        </motion.div>
      </div>
    </div>
  )
}

function DayChapter({ day }) {
  const [active, setActive] = useState(0)
  const refs = useRef([])
  const { scrollY } = useScroll()
  // รายการที่อยู่ใกล้เส้น 50% ของจอที่สุด = รายการที่กำลังดู
  const pick = () => {
    const line = window.innerHeight * 0.5
    let best = 0
    refs.current.forEach((el, i) => {
      if (el && el.getBoundingClientRect().top < line) best = i
    })
    setActive(best)
  }
  useMotionValueEvent(scrollY, 'change', pick)
  useEffect(pick, [])
  let key = day.cover
  for (let i = active; i >= 0; i--) if (day.items[i].img) { key = day.items[i].img; break }
  const cur = day.items[active]

  return (
    <section className="chapter" id={`day-${Number(day.no)}`} aria-label={`วันที่ ${Number(day.no)}`}>
      <ChapterIntro day={day} />
      <div className="chapter-body">
        <div className="sticky-media">
          <div className="frame">
            <AnimatePresence initial={false}>
              <motion.img
                key={key} src={img(key)} alt=""
                initial={{ opacity: 0, scale: 1.12, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
              />
            </AnimatePresence>
            <div className="frame-shade" />
            <motion.div className="frame-cap" key={active} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
              <b>{cur.t}</b><span>{cur.h}</span>
            </motion.div>
            <div className="frame-dots">
              {day.items.map((_, i) => <i key={i} className={i === active ? 'on' : i < active ? 'past' : ''} />)}
            </div>
          </div>
        </div>
        <ol className="tl">
          {day.items.map((it, i) => (
            <motion.li
              key={i} data-i={i} ref={(el) => (refs.current[i] = el)}
              className={i === active ? 'on' : ''}
              initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-10%' }} transition={{ duration: 0.7, ease: EASE }}
            >
              <time>{it.t}</time>
              <div className="what">
                <h3>{it.h}{it.tag && <span className={`badge t-${it.tag}`}>{TAG_LABEL[it.tag]}</span>}</h3>
                <p>{it.p}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------------- Highlights (horizontal scroll) ---------------- */
function Highlights() {
  const ref = useRef(null)
  const trackRef = useRef(null)
  const [dist, setDist] = useState(0)
  useLayoutEffect(() => {
    const measure = () => trackRef.current && setDist(Math.max(0, trackRef.current.scrollWidth - window.innerWidth))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 1], [0, -dist])
  return (
    <section className="hl" ref={ref} style={{ height: `calc(100vh + ${dist}px)` }} aria-labelledby="hl-h">
      <div className="hl-sticky">
        <div className="hl-head">
          <span className="sec-label light">ไฮไลต์</span>
          <h2 id="hl-h">ภาพที่จะได้เห็น</h2>
        </div>
        <motion.div className="hl-track" ref={trackRef} style={{ x }}>
          {highlights.map((h, i) => (
            <motion.figure className="hl-card" key={h.img} whileHover={{ y: -10 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
              <img src={img(h.img)} alt={h.h} loading="lazy" />
              <figcaption><small>{String(i + 1).padStart(2, '0')}</small><b>{h.h}</b><span>{h.p}</span></figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ---------------- Budget ---------------- */
function CountUp({ to, duration = 1.6 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, to, { duration, ease: 'easeOut', onUpdate: setV })
    return () => c.stop()
  }, [inView, to, duration])
  return <span ref={ref}>{fmt(v)}</span>
}

function Budget() {
  const lo = budget.reduce((s, b) => s + b[2], 0)
  const hi = budget.reduce((s, b) => s + b[3], 0)
  const max = Math.max(...budget.map((b) => b[3]))
  return (
    <section className="block" aria-labelledby="budget-h">
      <div className="sec-head">
        <span className="sec-label">งบประมาณ</span>
        <h2 id="budget-h">ต่อคนประมาณ</h2>
      </div>
      <div className="budget-big">
        <CountUp to={lo} />–<CountUp to={hi} /><small>บาท</small>
      </div>
      <p className="muted">ไม่รวมของฝาก ·ตัวเลขประมาณการ เช็คราคาจริงก่อนจอง</p>
      <div className="bars">
        {budget.map(([name, memo, a, b], i) => (
          <div className="bar-row" key={name}>
            <div className="bar-label"><b>{name}</b><small>{memo}</small></div>
            <div className="bar-track">
              <motion.i className="bar-lo" initial={{ width: 0 }} whileInView={{ width: `${(a / max) * 100}%` }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 1, ease: EASE }} />
              <motion.i className="bar-hi" initial={{ width: 0 }} whileInView={{ width: `${(b / max) * 100}%` }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 1.2, ease: EASE }} />
            </div>
            <span className="bar-num">{fmt(a)}–{fmt(b)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Checklist ---------------- */
function Checklist() {
  const [state, setState] = useStored('laos-checks-v3', {})
  const toggle = (id) => setState((s) => ({ ...s, [id]: !s[id] }))
  const total = checklist.reduce((s, g) => s + g.items.length, 0)
  const done = checklist.reduce((s, g, gi) => s + g.items.filter((_, ii) => state[`${gi}-${ii}`]).length, 0)
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <section className="block" aria-labelledby="check-h">
      <div className="check-head">
        <div className="sec-head">
          <span className="sec-label">เตรียมตัว</span>
          <h2 id="check-h">เช็คลิสต์ก่อนไป</h2>
        </div>
        <div className="ring" aria-label={`เตรียมแล้ว ${done} จาก ${total}`}>
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={r} className="ring-bg" />
            <motion.circle cx="40" cy="40" r={r} className="ring-fg" strokeDasharray={c} animate={{ strokeDashoffset: c * (1 - done / total) }} transition={{ duration: 0.6, ease: EASE }} />
          </svg>
          <b>{done}<small>/{total}</small></b>
        </div>
      </div>
      <div className="checks">
        {checklist.map((g, gi) => (
          <motion.div className="group card" key={g.group} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: gi * 0.08, duration: 0.6, ease: EASE }}>
            <h3>{g.group}</h3>
            {g.items.map((item, ii) => {
              const id = `${gi}-${ii}`
              return (
                <label key={id}>
                  <input type="checkbox" id={`c-${id}`} checked={!!state[id]} onChange={() => toggle(id)} />
                  <span>{item}</span>
                </label>
              )
            })}
          </motion.div>
        ))}
      </div>
      <p className="muted small">เช็คลิสต์จำไว้ในเบราว์เซอร์ของแต่ละเครื่อง ไม่ได้แชร์กันระหว่างเพื่อน</p>
    </section>
  )
}

/* ---------------- Day nav ---------------- */
function DayNav() {
  const { scrollY } = useScroll()
  const [show, setShow] = useState(false)
  const [cur, setCur] = useState(0)
  useMotionValueEvent(scrollY, 'change', (v) => {
    setShow(v > window.innerHeight * 0.9)
    let c = 0
    days.forEach((d, i) => {
      const el = document.getElementById(`day-${i + 1}`)
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.5) c = i + 1
    })
    setCur(c)
  })
  return (
    <AnimatePresence>
      {show && (
        <motion.nav className="daynav" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }} aria-label="ไปยังวัน">
          {days.map((d, i) => (
            <a key={d.no} href={`#day-${i + 1}`} className={cur === i + 1 ? 'on' : ''}>
              {cur === i + 1 && <motion.span layoutId="daynav-pill" className="pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className="lbl">วัน {i + 1}<small>{d.mood}</small></span>
            </a>
          ))}
        </motion.nav>
      )}
    </AnimatePresence>
  )
}

/* ---------------- App ---------------- */
export default function App() {
  const [intro, setIntro] = useState(true)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  useEffect(() => {
    document.body.style.overflow = intro ? 'hidden' : ''
  }, [intro])

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>{intro && <Intro onDone={() => setIntro(false)} />}</AnimatePresence>
      <motion.div className="progress" style={{ scaleX: progress }} />
      <Hero ready={!intro} />
      <Marquee />
      <Story />
      <RouteMap />
      {days.map((d) => <DayChapter key={d.no} day={d} />)}
      <Highlights />
      <div className="wrap">
        <motion.p className="note" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <b>{note.title}</b> {note.body}
        </motion.p>
        <Budget />
        <Checklist />
        <section className="block" aria-labelledby="alt-h">
          <div className="sec-head">
            <span className="sec-label">ทางเลือก</span>
            <h2 id="alt-h">ปรับแผนได้</h2>
          </div>
          <div className="alt">
            {alternatives.map((a) => (
              <motion.div className="card" key={a.h} whileHover={{ y: -6 }}><h3>{a.h}</h3><p>{a.p}</p></motion.div>
            ))}
          </div>
        </section>
      </div>
      <footer className="foot">
        <p className="foot-big">ໄປກັນເລີຍ!</p>
        <p>ไปกันเลย! · แผนร่างสำหรับแก๊งเพื่อน ราคาและเวลารถไฟเป็นค่าประมาณ</p>
        <details>
          <summary>เครดิตรูปภาพ (Wikimedia Commons)</summary>
          <ul>{credits.map(([k, by, lic]) => <li key={k}>{k}.jpg — {by} · {lic}</li>)}</ul>
        </details>
      </footer>
      <DayNav />
      <div className="sum-btn-wrap"><SummaryButton ready={!intro} /></div>
    </MotionConfig>
  )
}
