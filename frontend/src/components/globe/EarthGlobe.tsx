/**
 * EarthGlobe — Three.js + three-globe 3D Digital Twin Earth
 * Imperative setup in useEffect; updates via separate layer effect.
 */
import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import ThreeGlobe from 'three-globe'
import type { GlobeLayer, GlobePoint, FireHotspot } from '@/types'

// ─── Color palettes ──────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#eab308',
  LOW: '#22c55e',
}

function floodColor(prob: number): string {
  if (prob >= 0.6) return '#1e40af'
  if (prob >= 0.4) return '#2563eb'
  if (prob >= 0.2) return '#60a5fa'
  return '#93c5fd'
}

function fireColor(severity: number): string {
  if (severity >= 0.75) return '#ef4444'
  if (severity >= 0.5) return '#f97316'
  if (severity >= 0.25) return '#fbbf24'
  return '#fef08a'
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface EarthGlobeProps {
  activeLayer: GlobeLayer
  globePoints: GlobePoint[]
  fireHotspots: FireHotspot[]
  autoRotate: boolean
  showAtmosphere: boolean
  onCityClick?: (cityId: string, cityName: string) => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EarthGlobe({
  activeLayer,
  globePoints,
  fireHotspots,
  autoRotate,
  showAtmosphere,
  onCityClick,
}: EarthGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<ThreeGlobe | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rafRef = useRef<number>(0)
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())

  // ── Initial Three.js setup ──────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const W = container.clientWidth
    const H = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000)
    camera.position.set(0, 0, 280)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    scene.add(new THREE.AmbientLight(0x9999aa, 0.5))
    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(300, 200, 300)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0x334466, 0.4)
    fill.position.set(-200, -100, -200)
    scene.add(fill)

    // Starfield
    const starGeo = new THREE.BufferGeometry()
    const stars = new Float32Array(6000)
    for (let i = 0; i < 6000; i++) {
      stars[i] = (Math.random() - 0.5) * 2000
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true })
    scene.add(new THREE.Points(starGeo, starMat))

    // Globe
    const globe = new ThreeGlobe({ waitForGlobeReady: true, animateIn: false })
      .globeImageUrl('/earth-night.jpg')
      .bumpImageUrl('/earth-topology.png')
      .showAtmosphere(showAtmosphere)
      .atmosphereColor('#3a8fc7')
      .atmosphereAltitude(0.18)
      .pointsMerge(false)
      .pointAltitude(0.015)
      .pointRadius(0.3)

    globeRef.current = globe
    scene.add(globe)

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.rotateSpeed = 0.5
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 0.6
    controls.minDistance = 150
    controls.maxDistance = 600
    controls.enablePan = false
    controlsRef.current = controls

    // Animation loop
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, []) // only once — other effects handle dynamic updates

  // ── Auto-rotate toggle ──────────────────────────────────────────────────
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
    }
  }, [autoRotate])

  // ── Atmosphere toggle ───────────────────────────────────────────────────
  useEffect(() => {
    globeRef.current?.showAtmosphere(showAtmosphere)
  }, [showAtmosphere])

  // ── Layer data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return

    if (activeLayer === 'fire') {
      // Fire hotspot points
      const pts = fireHotspots.map((h) => ({
        lat: h.latitude,
        lng: h.longitude,
        size: Math.min(0.8, 0.2 + h.severity_score * 0.6),
        color: fireColor(h.severity_score),
        label: h.country_name,
      }))
      globe
        .pointsData(pts)
        .pointLat('lat')
        .pointLng('lng')
        .pointRadius((d: object) => (d as { size: number }).size)
        .pointColor('color')
        .pointAltitude(0.01)
        .atmosphereColor('#f97316')
    } else if (activeLayer === 'flood') {
      const pts = globePoints.map((p) => ({
        ...p,
        color: p.riskScore !== undefined ? floodColor(p.riskScore) : '#60a5fa',
        size: p.riskScore !== undefined ? Math.max(0.2, p.riskScore * 0.7) : 0.3,
      }))
      globe
        .pointsData(pts)
        .pointLat('lat')
        .pointLng('lng')
        .pointRadius((d: object) => (d as { size: number }).size)
        .pointColor('color')
        .pointAltitude(0.015)
        .atmosphereColor('#3b82f6')
    } else {
      // Risk / default layer
      const pts = globePoints.map((p) => ({
        ...p,
        color: p.riskLevel ? RISK_COLORS[p.riskLevel] : '#22c55e',
        size: p.riskScore !== undefined ? Math.max(0.2, p.riskScore * 0.8) : p.size,
      }))
      globe
        .pointsData(pts)
        .pointLat('lat')
        .pointLng('lng')
        .pointRadius((d: object) => (d as { size: number }).size)
        .pointColor('color')
        .pointAltitude(0.015)
        .atmosphereColor('#3a8fc7')
    }
  }, [activeLayer, globePoints, fireHotspots])

  // ── Click detection ─────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseRef.current.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }, [])

  const handleClick = useCallback(() => {
    const camera = cameraRef.current
    const globe = globeRef.current
    if (!camera || !globe || !onCityClick) return

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouseRef.current, camera)

    const hits = raycaster.intersectObjects(globe.children, true)
    if (hits.length === 0) return

    // Find the point data closest to the click
    const intersect = hits[0]
    // Walk up to find the ThreeGlobe managed object with __data
    let obj: THREE.Object3D | null = intersect.object
    while (obj && !(obj as { __data?: Record<string, unknown> }).__data) {
      obj = obj.parent
    }
    if (!obj) return
    const data = (obj as { __data?: Record<string, unknown> }).__data
    if (data && typeof data.cityId === 'string') {
      onCityClick(data.cityId, (data.cityName as string) ?? '')
    }
  }, [onCityClick])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{ cursor: 'grab' }}
    />
  )
}
