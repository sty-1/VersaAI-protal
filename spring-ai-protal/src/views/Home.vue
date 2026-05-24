<template>
  <div class="home">
    <section class="hero" ref="heroRef">
      <canvas
        ref="rippleCanvas"
        class="ripple-canvas"
        aria-hidden="true"
      ></canvas>
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="title-line">Nexus AI Hub</span>
        </h1>
        <p class="hero-subtitle">One Platform, Infinite Intelligence — explore the frontier of AI</p>
      </div>
      <div class="hero-decoration">
        <div class="orb orb-1" aria-hidden="true"></div>
        <div class="orb orb-2" aria-hidden="true"></div>
        <div class="orb orb-3" aria-hidden="true"></div>
      </div>
    </section>

    <div class="container" ref="containerRef">
      <canvas
        ref="gridCanvas"
        class="grid-canvas"
        aria-hidden="true"
      ></canvas>
      <div class="cards-grid">
        <router-link
          v-for="(app, index) in aiApps"
          :key="app.id"
          :to="app.route"
          class="card"
          :style="{ animationDelay: `${index * 0.1}s` }"
          :aria-label="`Open ${app.title}`"
        >
          <div class="card-glow" aria-hidden="true"></div>
          <div class="card-content">
            <div class="icon-wrapper" :class="app.iconClass">
              <component :is="app.icon" class="icon" aria-hidden="true" />
            </div>
            <h2 class="card-title">{{ app.title }}</h2>
            <p class="card-description">{{ app.description }}</p>
            <span class="card-cta">
              Get Started
              <svg class="arrow" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
              </svg>
            </span>
          </div>
        </router-link>
      </div>
    </div>

    <div class="handwritten-teaser">
      <div class="teaser-inner">
        <!-- paper texture overlay -->
        <div class="paper-texture" aria-hidden="true"></div>

        <!-- decorative sketch marks -->
        <svg class="sketch-doodles sketch-doodles-left" viewBox="0 0 60 60" aria-hidden="true" :key="'dl-' + cycleKey">
          <path d="M10,8 C14,2 18,6 16,12 C14,18 8,16 10,8Z" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4"/>
          <path d="M42,48 L48,42 M48,48 L42,42" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
        </svg>
        <svg class="sketch-doodles sketch-doodles-right" viewBox="0 0 60 60" aria-hidden="true" :key="'dr-' + cycleKey">
          <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1" opacity="0.35"/>
          <circle cx="22" cy="8" r="1.5" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.25"/>
          <path d="M40,50 C36,44 44,42 46,48 C48,54 38,54 40,50Z" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/>
        </svg>

        <p class="teaser-text" :class="{ 'is-link': !showFirst }" :key="'text-' + cycleKey">
          <template v-if="showFirst">
            <span class="char-wrapper">想</span>
            <span class="char-wrapper">要</span>
            <span class="char-wrapper">了</span>
            <span class="char-wrapper">解</span>
            <span class="char-wrapper">更</span>
            <span class="char-wrapper">多</span>
            <span class="char-wrapper">么</span>
            <span class="char-wrapper char-emoji">🤔</span>
          </template>
          <template v-else>
            <span class="char-wrapper">我</span>
            <span class="char-wrapper">的</span>
            <span class="char-wrapper">G</span>
            <span class="char-wrapper">i</span>
            <span class="char-wrapper">t</span>
            <span class="char-wrapper">H</span>
            <span class="char-wrapper">u</span>
            <span class="char-wrapper">b</span>
            <span class="char-wrapper char-break" aria-hidden="true"></span>
            <a
              href="https://github.com/sty-1"
              target="_blank"
              rel="noopener"
              class="teaser-link"
            >sty-1</a>
            <span class="char-wrapper char-emoji">✨</span>
          </template>
        </p>

        <!-- hand-drawn squiggly underline -->
        <svg
          class="teaser-underline"
          viewBox="0 0 320 14"
          preserveAspectRatio="none"
          aria-hidden="true"
          :key="'ul-' + cycleKey"
        >
          <path
            class="underline-sketch underline-sketch--main"
            d="M2,7 C16,1 30,10 44,6 C60,1 76,11 90,5 C106,1 122,9 136,5 C152,1 168,10 182,6 C198,1 214,9 230,5 C246,1 262,10 278,6 C294,2 310,8 318,7"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            class="underline-sketch underline-sketch--ghost"
            d="M3,8 C17,3 31,11 45,7 C61,3 77,12 91,6 C107,2 123,10 137,6 C153,2 169,11 183,7 C199,3 215,10 231,6 C247,2 263,11 279,7 C295,3 311,9 317,8"
            fill="none"
            stroke="currentColor"
            stroke-width="0.8"
            stroke-linecap="round"
          />
        </svg>

        <!-- annotation-style arrow pointing to link -->
        <svg
          v-if="!showFirst"
          class="sketch-arrow"
          viewBox="0 0 40 24"
          aria-hidden="true"
          :key="'arr-' + cycleKey"
        >
          <path
            d="M36,6 C28,4 24,2 20,6 C17,9 12,11 8,16 C5,19 3,20 2,20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path d="M8,14 L3,20 L9,20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  ChatBubbleLeftRightIcon,
  HeartIcon,
  UserGroupIcon,
  DocumentTextIcon
} from '@heroicons/vue/24/outline'

const showFirst = ref(true)
const cycleKey = ref(0)
let timer = null

function cycle() {
  timer = setTimeout(() => {
    showFirst.value = false
    cycleKey.value++
    timer = setTimeout(() => {
      showFirst.value = true
      cycleKey.value++
      cycle()
    }, 4000)
  }, 2500)
}

onMounted(() => cycle())
onUnmounted(() => { if (timer) clearTimeout(timer) })

// ── Ripple Canvas Background ──────────────────────────
const heroRef = ref(null)
const rippleCanvas = ref(null)
let ctx = null
let animId = null
let ripples = []
let mouseX = -100
let mouseY = -100
let canvasWidth = 0
let canvasHeight = 0
let autoSpawnTimer = null
const MAX_RIPPLES = 18
const AUTO_INTERVAL = 1400

function resizeCanvas() {
  if (!rippleCanvas.value || !heroRef.value) return
  const rect = heroRef.value.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvasWidth = rect.width
  canvasHeight = rect.height
  rippleCanvas.value.width = canvasWidth * dpr
  rippleCanvas.value.height = canvasHeight * dpr
  rippleCanvas.value.style.width = canvasWidth + 'px'
  rippleCanvas.value.style.height = canvasHeight + 'px'
  ctx = rippleCanvas.value.getContext('2d')
  ctx.scale(dpr, dpr)
}

function createRipple(x, y, fromMouse) {
  const maxR = fromMouse ? 80 + Math.random() * 80 : 120 + Math.random() * 160
  return {
    x,
    y,
    radius: 0,
    maxRadius: maxR,
    opacity: fromMouse ? 0.22 : 0.10 + Math.random() * 0.08,
    speed: 0.4 + Math.random() * 0.7,
    color: Math.random() < 0.5 ? 'primary' : 'secondary',
    lineWidth: fromMouse ? 1.6 : 0.8 + Math.random() * 1.0,
  }
}

function spawnAutoRipple() {
  if (ripples.length >= MAX_RIPPLES) return
  const x = canvasWidth * 0.1 + Math.random() * canvasWidth * 0.8
  const y = canvasHeight * 0.1 + Math.random() * canvasHeight * 0.8
  ripples.push(createRipple(x, y, false))
}

function onMouseMove(e) {
  const rect = heroRef.value?.getBoundingClientRect()
  if (!rect) return
  mouseX = e.clientX - rect.left
  mouseY = e.clientY - rect.top
  // throttle: only spawn ripple every ~250ms on mouse move
  if (!onMouseMove._lastSpawn || Date.now() - onMouseMove._lastSpawn > 250) {
    ripples.push(createRipple(mouseX, mouseY, true))
    onMouseMove._lastSpawn = Date.now()
  }
}

function getCSSColor(varName) {
  const el = document.documentElement
  const style = getComputedStyle(el).getPropertyValue(varName).trim()
  return style || (varName.includes('primary') ? '#007CF0' : '#00DFD8')
}

function draw() {
  if (!ctx) return
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  const primaryColor = getCSSColor('--color-primary')
  const secondaryColor = getCSSColor('--color-secondary')
  const isDark = document.documentElement.classList.contains('dark')

  // subtle ambient center glow (like watercolor wash)
  const cx = canvasWidth / 2
  const cy = canvasHeight / 2
  const washGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(canvasWidth, canvasHeight) * 0.5)
  washGrad.addColorStop(0, isDark ? 'rgba(0,124,240,0.03)' : 'rgba(0,124,240,0.015)')
  washGrad.addColorStop(0.5, isDark ? 'rgba(0,223,216,0.015)' : 'rgba(0,223,216,0.008)')
  washGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = washGrad
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // draw and update ripples
  ripples = ripples.filter((r) => {
    r.radius += r.speed
    const progress = r.radius / r.maxRadius
    const fade = progress < 0.15
      ? progress / 0.15
      : progress > 0.7
        ? 1 - (progress - 0.7) / 0.3
        : 1
    const alpha = r.opacity * fade
    if (alpha <= 0.002) return false

    const color = r.color === 'primary' ? primaryColor : secondaryColor
    ctx.beginPath()
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = r.lineWidth * fade
    ctx.globalAlpha = alpha
    ctx.stroke()
    ctx.globalAlpha = 1

    // inner ghost ring
    if (r.radius > 12 && progress < 0.5) {
      const innerAlpha = alpha * 0.35
      const innerRadius = r.radius * 0.55
      ctx.beginPath()
      ctx.arc(r.x, r.y, innerRadius, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = r.lineWidth * 0.5 * fade
      ctx.globalAlpha = innerAlpha
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    return true
  })

  // mouse proximity subtle glow
  if (mouseX > 0 && mouseY > 0 && mouseX < canvasWidth && mouseY < canvasHeight) {
    const glowGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 60)
    glowGrad.addColorStop(0, isDark ? 'rgba(0,124,240,0.04)' : 'rgba(0,124,240,0.025)')
    glowGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(mouseX, mouseY, 60, 0, Math.PI * 2)
    ctx.fill()
  }

  animId = requestAnimationFrame(draw)
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

onMounted(() => {
  if (reducedMotion) return
  resizeCanvas()
  animId = requestAnimationFrame(draw)
  autoSpawnTimer = setInterval(spawnAutoRipple, AUTO_INTERVAL)
  window.addEventListener('resize', resizeCanvas)
  heroRef.value?.addEventListener('mousemove', onMouseMove, { passive: true })
  for (let i = 0; i < 5; i++) {
    setTimeout(() => spawnAutoRipple(), i * 300)
  }
})

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
  if (autoSpawnTimer) clearInterval(autoSpawnTimer)
  window.removeEventListener('resize', resizeCanvas)
  heroRef.value?.removeEventListener('mousemove', onMouseMove)
})

// ── Grid Distortion Background ─────────────────────────
const containerRef = ref(null)
const gridCanvas = ref(null)
let gctx = null
let gAnimId = null
let gMouseX = -200
let gMouseY = -200
let gWidth = 0
let gHeight = 0
const GRID_SPACING = 48
const DISTORT_RADIUS = 130

function resizeGrid() {
  if (!gridCanvas.value || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  gWidth = rect.width
  gHeight = rect.height
  gridCanvas.value.width = gWidth * dpr
  gridCanvas.value.height = gHeight * dpr
  gridCanvas.value.style.width = gWidth + 'px'
  gridCanvas.value.style.height = gHeight + 'px'
  gctx = gridCanvas.value.getContext('2d')
  gctx.scale(dpr, dpr)
}

function onGridMouseMove(e) {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return
  gMouseX = e.clientX - rect.left
  gMouseY = e.clientY - rect.top
}

function onGridMouseLeave() {
  gMouseX = -200
  gMouseY = -200
}

// smoothly decay mouse position toward (-200, -200) for spring-like settle
let settleX = -200
let settleY = -200

function distortX(x, y) {
  const dx = x - settleX
  const dy = y - settleY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > DISTORT_RADIUS) return 0
  const strength = (1 - dist / DISTORT_RADIUS)
  const smooth = strength * strength * (3 - 2 * strength) // smoothstep
  return dx * smooth * 0.22
}

function distortY(x, y) {
  const dx = x - settleX
  const dy = y - settleY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > DISTORT_RADIUS) return 0
  const strength = (1 - dist / DISTORT_RADIUS)
  const smooth = strength * strength * (3 - 2 * strength)
  return dy * smooth * 0.22
}

function drawGrid() {
  if (!gctx) return
  gctx.clearRect(0, 0, gWidth, gHeight)

  // spring settle toward target mouse
  settleX += (gMouseX - settleX) * 0.12
  settleY += (gMouseY - settleY) * 0.12

  const isDark = document.documentElement.classList.contains('dark')
  const lineColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.045)'
  const dotColor = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)'

  gctx.strokeStyle = lineColor
  gctx.lineWidth = 0.7

  // vertical lines
  for (let x = GRID_SPACING; x < gWidth; x += GRID_SPACING) {
    gctx.beginPath()
    let started = false
    for (let y = 0; y <= gHeight; y += 8) {
      const dx = distortX(x, y)
      const px = x + dx
      const py = y + distortY(x, y)
      if (!started) { gctx.moveTo(px, py); started = true }
      else gctx.lineTo(px, py)
    }
    gctx.stroke()
  }

  // horizontal lines
  for (let y = GRID_SPACING; y < gHeight; y += GRID_SPACING) {
    gctx.beginPath()
    let started = false
    for (let x = 0; x <= gWidth; x += 8) {
      const dx = distortX(x, y)
      const dy = distortY(x, y)
      const px = x + dx
      const py = y + dy
      if (!started) { gctx.moveTo(px, py); started = true }
      else gctx.lineTo(px, py)
    }
    gctx.stroke()
  }

  // intersection dots (hand-drawn graph paper feel)
  for (let x = GRID_SPACING; x < gWidth; x += GRID_SPACING) {
    for (let y = GRID_SPACING; y < gHeight; y += GRID_SPACING) {
      const dx = distortX(x, y)
      const dy = distortY(x, y)
      const px = x + dx
      const py = y + dy
      // skip dots far off screen
      if (px < -10 || px > gWidth + 10 || py < -10 || py > gHeight + 10) continue
      gctx.fillStyle = dotColor
      gctx.beginPath()
      gctx.arc(px, py, 1.2, 0, Math.PI * 2)
      gctx.fill()
    }
  }

  gAnimId = requestAnimationFrame(drawGrid)
}

onMounted(() => {
  if (reducedMotion) return
  resizeGrid()
  gAnimId = requestAnimationFrame(drawGrid)
  window.addEventListener('resize', resizeGrid)
  containerRef.value?.addEventListener('mousemove', onGridMouseMove, { passive: true })
  containerRef.value?.addEventListener('mouseleave', onGridMouseLeave)
})

onUnmounted(() => {
  if (gAnimId) cancelAnimationFrame(gAnimId)
  window.removeEventListener('resize', resizeGrid)
  containerRef.value?.removeEventListener('mousemove', onGridMouseMove)
  containerRef.value?.removeEventListener('mouseleave', onGridMouseLeave)
})

const aiApps = [
  {
    id: 1,
    title: 'AI Chat',
    description: 'Multimodal conversational agent with vision, audio, and video capabilities',
    route: '/ai-chat',
    icon: ChatBubbleLeftRightIcon,
    iconClass: 'icon-blue'
  },
  {
    id: 2,
    title: 'Persuasion Lab',
    description: 'Master the art of dialogue — navigate complex emotional scenarios with finesse',
    route: '/game',
    icon: HeartIcon,
    iconClass: 'icon-red'
  },
  {
    id: 3,
    title: 'Concierge AI',
    description: 'Always-on intelligent assistant, ready to resolve any inquiry instantly',
    route: '/customer-service',
    icon: UserGroupIcon,
    iconClass: 'icon-green'
  },
  {
    id: 4,
    title: 'ChatPDF',
    description: 'Build your knowledge base — converse with any document as if it were alive',
    route: '/chat-pdf',
    icon: DocumentTextIcon,
    iconClass: 'icon-purple'
  }
]
</script>

<style scoped lang="scss">
.home {
  min-height: calc(100vh - var(--navbar-height));
  background: var(--surface-page);
  transition: background var(--transition-base);
}

/* ── Hero Section ──────────────────────────────────────── */
.hero {
  position: relative;
  padding: var(--space-16) var(--space-8) var(--space-12);
  text-align: center;
  overflow: hidden;

  .ripple-canvas {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.7;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    max-width: 700px;
    margin: 0 auto;
  }

  .hero-title {
    margin-bottom: var(--space-6);

    .title-line {
      display: block;
      font-size: var(--font-5xl);
      font-weight: var(--font-bold);
      background: var(--gradient-brand-text);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
      animation: heroFadeUp 0.8s ease-out;
    }
  }

  .hero-subtitle {
    font-size: var(--font-xl);
    color: var(--text-secondary);
    animation: heroFadeUp 0.8s ease-out 0.15s both;
  }

  .hero-decoration {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;

    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
    }

    .orb-1 {
      width: 400px;
      height: 400px;
      background: var(--color-primary);
      top: -100px;
      right: -100px;
      animation: orbFloat 8s ease-in-out infinite;
    }

    .orb-2 {
      width: 300px;
      height: 300px;
      background: var(--color-secondary);
      bottom: -80px;
      left: -80px;
      animation: orbFloat 10s ease-in-out infinite reverse;
    }

    .orb-3 {
      width: 200px;
      height: 200px;
      background: var(--color-accent);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: orbFloat 12s ease-in-out infinite 2s;
    }
  }
}

/* ── Container ─────────────────────────────────────────── */
.container {
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-8) var(--space-16);

  .grid-canvas {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    border-radius: inherit;
  }

  .cards-grid {
    position: relative;
    z-index: 1;
  }
}

/* ── Cards Grid ────────────────────────────────────────── */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: var(--space-8);
  padding: var(--space-4);

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* ── Card ──────────────────────────────────────────────── */
.card {
  position: relative;
  background: var(--card-bg);
  backdrop-filter: blur(var(--card-blur));
  -webkit-backdrop-filter: blur(var(--card-blur));
  border-radius: var(--card-radius);
  padding: var(--card-padding);
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
  transition: all var(--transition-base);
  overflow: hidden;
  animation: cardEnter 0.6s ease-out both;

  .card-glow {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity var(--transition-base);
    background: radial-gradient(
      600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
      rgba(0, 124, 240, 0.06),
      transparent 40%
    );
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-6px);
    box-shadow: var(--card-shadow-hover);
    border-color: rgba(0, 124, 240, 0.2);

    .card-glow {
      opacity: 1;
    }

    .card-cta {
      opacity: 1;
      transform: translateX(0);

      .arrow {
        transform: translateX(2px);
      }
    }

    .icon-wrapper {
      transform: scale(1.08);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 3px;
  }

  .card-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-4);
  }

  .icon-wrapper {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-xl);
    transition: transform var(--transition-base);

    .icon {
      width: 32px;
      height: 32px;
    }

    &.icon-blue {
      background: var(--color-primary-light);
      .icon { color: var(--color-primary); }
    }

    &.icon-red {
      background: var(--color-error-light);
      .icon {
        color: var(--color-error);
        animation: heartPulse 1.8s ease-in-out infinite;
      }
    }

    &.icon-green {
      background: hsl(140, 70%, 92%);
      .icon { color: var(--color-success); }
    }

    &.icon-purple {
      background: var(--color-accent-light);
      .icon { color: var(--color-accent); }
    }
  }

  .card-title {
    font-size: var(--font-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
  }

  .card-description {
    font-size: var(--font-sm);
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .card-cta {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--font-sm);
    font-weight: var(--font-medium);
    color: var(--color-primary);
    opacity: 0;
    transform: translateX(-4px);
    transition: all var(--transition-base);

    .arrow {
      width: 16px;
      height: 16px;
      transition: transform var(--transition-base);
    }
  }
}

/* ── Dark mode card overrides ──────────────────────────── */
.dark .card {
  .icon-wrapper {
    &.icon-blue { background: rgba(0, 124, 240, 0.15); }
    &.icon-red { background: rgba(255, 77, 79, 0.15); }
    &.icon-green { background: rgba(82, 196, 26, 0.15); }
    &.icon-purple { background: rgba(147, 51, 234, 0.15); }
  }
}

/* ── Animations ────────────────────────────────────────── */
@keyframes heroFadeUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(32px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

@keyframes heartPulse {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.15); }
  30% { transform: scale(1); }
  45% { transform: scale(1.1); }
  60% { transform: scale(1); }
}

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 768px) {
  .hero {
    padding: var(--space-10) var(--space-4) var(--space-8);

    .hero-title .title-line {
      font-size: var(--font-3xl);
    }

    .hero-subtitle {
      font-size: var(--font-base);
    }
  }

  .container {
    padding: 0 var(--space-4) var(--space-10);
  }

  .card {
    padding: var(--space-6);

    .icon-wrapper {
      width: 56px;
      height: 56px;

      .icon {
        width: 28px;
        height: 28px;
      }
    }
  }

  .handwritten-teaser {
    padding: var(--space-8) var(--space-4) var(--space-14);

    .teaser-text {
      font-size: var(--font-xl);
    }

    .teaser-link {
      font-size: var(--font-xl);
    }

    .teaser-underline {
      width: 260px;
      height: 12px;
    }

    .teaser-inner {
      padding: var(--space-6) var(--space-6);
    }

    .sketch-doodles-left {
      left: -6px;
      top: -4px;
      width: 40px;
      height: 40px;
    }

    .sketch-doodles-right {
      right: -4px;
      bottom: -4px;
      width: 40px;
      height: 40px;
    }

    .sketch-arrow {
      right: -18px;
      bottom: 24px;
      width: 26px;
      height: 16px;
    }
  }
}

/* ── Hand-drawn Teaser ────────────────────────────────── */
.handwritten-teaser {
  position: relative;
  display: flex;
  justify-content: center;
  padding: var(--space-12) var(--space-8) var(--space-20);
  margin-top: var(--space-8);
  user-select: none;
}

.teaser-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-8) var(--space-10);
  z-index: 1;
}

/* ── Paper texture background ─────────────────────────── */
.paper-texture {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  pointer-events: none;
  z-index: -1;
  // layered grain simulation
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.008) 2px,
      rgba(0, 0, 0, 0.008) 4px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 3px,
      rgba(0, 0, 0, 0.005) 3px,
      rgba(0, 0, 0, 0.005) 6px
    );
  // rough torn-paper edges
  border: 1.5px dashed rgba(0, 0, 0, 0.06);
  border-radius: 8px 3px 8px 5px;
  transform: rotate(-0.2deg);
}

.dark .paper-texture {
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.015) 2px,
      rgba(255, 255, 255, 0.015) 4px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 3px,
      rgba(255, 255, 255, 0.008) 3px,
      rgba(255, 255, 255, 0.008) 6px
    );
  border-color: rgba(255, 255, 255, 0.06);
}

/* ── Decorative sketch doodles ────────────────────────── */
.sketch-doodles {
  position: absolute;
  pointer-events: none;
  color: var(--text-muted);
  opacity: 0;
  animation: doodleAppear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.sketch-doodles-left {
  top: -8px;
  left: -12px;
  width: 55px;
  height: 55px;
  animation-delay: 0.15s;
}

.sketch-doodles-right {
  bottom: -6px;
  right: -10px;
  width: 55px;
  height: 55px;
  animation-delay: 0.25s;
}

@keyframes doodleAppear {
  from {
    opacity: 0;
    transform: scale(0.5) rotate(-15deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

/* ── Text with per-character irregularity ─────────────── */
.teaser-text {
  font-family: 'Ma Shan Zheng', 'ZCOOL KuaiLe', cursive, sans-serif;
  font-size: var(--font-3xl);
  color: var(--text-primary);
  text-align: center;
  line-height: 1.8;
  animation: textPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  gap: 0.08em;
  max-width: 500px;

  &.is-link {
    gap: 0.04em;
  }
}

.char-wrapper {
  display: inline-block;
  animation: charSettle 0.5s ease-out both;
  // organic per-character rotation via staggered delays
  &:nth-child(1) { animation-delay: 0.02s; --rot: -2deg; --lift: 3px; }
  &:nth-child(2) { animation-delay: 0.07s; --rot: 1.5deg; --lift: -2px; }
  &:nth-child(3) { animation-delay: 0.12s; --rot: -1deg; --lift: 4px; }
  &:nth-child(4) { animation-delay: 0.17s; --rot: 2deg; --lift: -3px; }
  &:nth-child(5) { animation-delay: 0.22s; --rot: -1.5deg; --lift: 2px; }
  &:nth-child(6) { animation-delay: 0.27s; --rot: 2.5deg; --lift: -4px; }
  &:nth-child(7) { animation-delay: 0.32s; --rot: -2deg; --lift: 1px; }
  &:nth-child(8) { animation-delay: 0.37s; --rot: 1deg; --lift: -1px; }
  &:nth-child(9) { animation-delay: 0.42s; --rot: -0.5deg; --lift: 3px; }
  &:nth-child(10) { animation-delay: 0.47s; --rot: 2deg; --lift: -2px; }
}

.char-break {
  width: 100%;
  height: 0;
}

.char-emoji {
  animation-delay: 0.45s !important;
  --rot: -3deg !important;
  --lift: 5px !important;
  font-size: 0.8em;
}

@keyframes charSettle {
  from {
    opacity: 0;
    transform: translateY(var(--lift, 4px)) rotate(var(--rot, -3deg)) scale(0.6);
  }
  60% {
    opacity: 1;
    transform: translateY(-1px) rotate(calc(var(--rot, 0deg) * -0.3)) scale(1.05);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(var(--rot, 0deg)) scale(1);
  }
}

/* ── Link styling ─────────────────────────────────────── */
.teaser-link {
  display: inline-block;
  font-family: 'Ma Shan Zheng', 'ZCOOL KuaiLe', cursive, sans-serif;
  font-size: var(--font-3xl);
  color: var(--color-primary);
  text-decoration: none;
  background: linear-gradient(to right, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: charSettle 0.5s ease-out 0.28s both;
  --rot: -1.5deg;
  --lift: 2px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 2px;
    height: 2px;
    background: linear-gradient(to right, var(--color-primary), var(--color-accent));
    border-radius: 1px;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--transition-base);
  }

  &:hover::after {
    transform: scaleX(1);
  }
}

/* ── Hand-sketched underline ──────────────────────────── */
.teaser-underline {
  width: 340px;
  height: 16px;
  color: var(--color-primary);
  opacity: 0.45;
  animation: underlineWiggle 2.8s ease-in-out infinite;
  margin-top: -6px;
}

.underline-sketch {
  stroke-dasharray: 340;
  stroke-dashoffset: 340;
  animation: handDrawUnderline 0.9s cubic-bezier(0.34, 0.4, 0.12, 1) 0.35s forwards;

  &--ghost {
    opacity: 0.3;
    animation-delay: 0.42s;
  }
}

/* ── Annotation arrow ─────────────────────────────────── */
.sketch-arrow {
  position: absolute;
  right: -28px;
  bottom: 30px;
  width: 36px;
  height: 22px;
  color: var(--text-muted);
  opacity: 0;
  animation: doodleAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s forwards;
}

/* ── Keyframes ────────────────────────────────────────── */
@keyframes textPopIn {
  from {
    opacity: 0;
    filter: blur(4px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}

@keyframes handDrawUnderline {
  0% {
    stroke-dashoffset: 340;
  }
  60% {
    stroke-dashoffset: 40;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes underlineWiggle {
  0%, 100% {
    transform: translateY(0) rotate(-0.3deg) scaleX(1);
  }
  25% {
    transform: translateY(-2.5px) rotate(0.5deg) scaleX(0.96);
  }
  50% {
    transform: translateY(1px) rotate(-0.6deg) scaleX(1.03);
  }
  75% {
    transform: translateY(2px) rotate(0.3deg) scaleX(0.97);
  }
}

/* ── Reduced motion ───────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .char-wrapper,
  .teaser-text,
  .teaser-underline,
  .sketch-doodles,
  .sketch-arrow {
    animation: none !important;
  }

  .underline-sketch {
    stroke-dashoffset: 0;
  }
}
</style>
