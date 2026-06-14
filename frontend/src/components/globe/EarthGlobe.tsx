import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import ThreeGlobe from 'three-globe'
import type { GlobeLayer, GlobePoint, FireHotspot } from '@/types'

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MODERATE: '#ca8a04',
  LOW: '#16a34a',
}

function floodColor(prob: number): string {
  if (prob >= 0.6) return '#1d4ed8'
  if (prob >= 0.4) return '#2563eb'
  if (prob >= 0.2) return '#3b82f6'
  return '#60a5fa'
}

function fireColor(severity: number): string {
  if (severity >= 0.75) return '#dc2626'
  if (severity >= 0.5) return '#ea580c'
  if (severity >= 0.25) return '#f59e0b'
  return '#fcd34d'
}

interface EarthGlobeProps {
  activeLayer: GlobeLayer
  globePoints: GlobePoint[]
  fireHotspots: FireHotspot[]
  autoRotate: boolean
  showAtmosphere: boolean
  onCityClick?: (cityId: string, cityName: string) => void
}

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

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const W = container.clientWidth
    const H = container.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f4f8)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000)
    camera.position.set(0, 0, 300)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Daylight lighting rig
    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.6)
    sun.position.set(400, 200, 300)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.5)
    fill.position.set(-300, -100, -200)
    scene.add(fill)

    // Globe with blue-marble day texture
    const globe = new ThreeGlobe({ waitForGlobeReady: true, animateIn: false })
      .globeImageUrl('/earth-blue-marble.jpg')
      .bumpImageUrl('/earth-topology.png')
      .showAtmosphere(showAtmosphere)
      .atmosphereColor('#7eb8e8')
      .atmosphereAltitude(0.12)
      .pointsMerge(false)
      .pointAltitude(0.015)
      .pointRadius(0.3)

    globeRef.current = globe
    scene.add(globe)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.rotateSpeed = 0.5
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 0.5
    controls.minDistance = 160
    controls.maxDistance = 600
    controls.enablePan = false
    controlsRef.current = controls

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

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
  }, [])

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate
  }, [autoRotate])

  useEffect(() => {
    globeRef.current?.showAtmosphere(showAtmosphere)
  }, [showAtmosphere])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return

    if (activeLayer === 'fire') {
      const pts = fireHotspots.map((h) => ({
        lat: h.latitude,
        lng: h.longitude,
        size: Math.min(0.9, 0.25 + h.severity_score * 0.65),
        color: fireColor(h.severity_score),
        label: h.country_name,
      }))
      globe
        .pointsData(pts)
        .pointLat('lat')
        .pointLng('lng')
        .pointRadius((d: object) => (d as { size: number }).size)
        .pointColor('color')
        .pointAltitude(0.012)
        .atmosphereColor('#f97316')
    } else if (activeLayer === 'flood') {
      const pts = globePoints.map((p) => ({
        ...p,
        color: p.riskScore !== undefined ? floodColor(p.riskScore) : '#3b82f6',
        size: p.riskScore !== undefined ? Math.max(0.25, p.riskScore * 0.75) : 0.3,
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
      const pts = globePoints.map((p) => ({
        ...p,
        color: p.riskLevel ? RISK_COLORS[p.riskLevel] : '#16a34a',
        size: p.riskScore !== undefined ? Math.max(0.25, p.riskScore * 0.85) : p.size,
      }))
      globe
        .pointsData(pts)
        .pointLat('lat')
        .pointLng('lng')
        .pointRadius((d: object) => (d as { size: number }).size)
        .pointColor('color')
        .pointAltitude(0.015)
        .atmosphereColor('#7eb8e8')
    }
  }, [activeLayer, globePoints, fireHotspots])

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

    let obj: THREE.Object3D | null = hits[0].object
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
