import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { StlMeshPreview } from '../parsers/stl'

type LayoutPreviewProps = {
  mesh: StlMeshPreview | null
}

type PreviewMode = 'model' | 'heightmap'

type AreaSlice = {
  heightMm: number
  areaMm2: number
}

type PreviewGeometry = {
  geometry: THREE.BufferGeometry
  width: number
  depth: number
  height: number
  maxDimension: number
  areaProfile: AreaSlice[]
  minAreaMm2: number
  maxAreaMm2: number
}

const formatDimension = (value: number) => Math.round(value).toLocaleString('ru-RU')

const formatArea = (value: number) =>
  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value / 100)} см²`

const heightColor = (ratio: number) => {
  const color = new THREE.Color()
  color.setHSL(0.58 - ratio * 0.52, 0.82, 0.58)
  return color
}

const pointKey = (x: number, y: number) => `${Math.round(x * 10)},${Math.round(y * 10)}`

const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

const polygonArea = (points: string[]) => {
  let area = 0

  points.forEach((point, index) => {
    const nextPoint = points[(index + 1) % points.length]
    const [x1, y1] = point.split(',').map(Number)
    const [x2, y2] = nextPoint.split(',').map(Number)
    area += x1 * y2 - x2 * y1
  })

  return Math.abs(area) / 200
}

const sliceTriangle = (triangle: StlMeshPreview['triangles'][number], heightMm: number) => {
  const intersections: string[] = []

  for (let index = 0; index < 3; index += 1) {
    const start = triangle[index]
    const end = triangle[(index + 1) % 3]
    const startZ = start[2]
    const endZ = end[2]
    const crosses =
      (startZ <= heightMm && endZ > heightMm) || (endZ <= heightMm && startZ > heightMm)

    if (!crosses) {
      continue
    }

    const ratio = (heightMm - startZ) / (endZ - startZ)
    const x = start[0] + (end[0] - start[0]) * ratio
    const y = start[1] + (end[1] - start[1]) * ratio
    intersections.push(pointKey(x, y))
  }

  return intersections.length === 2 && intersections[0] !== intersections[1]
    ? ([intersections[0], intersections[1]] as const)
    : undefined
}

const calculateSliceArea = (mesh: StlMeshPreview, heightMm: number) => {
  const neighbors = new Map<string, string[]>()

  mesh.triangles.forEach((triangle) => {
    const segment = sliceTriangle(triangle, heightMm)

    if (!segment) {
      return
    }

    const [a, b] = segment
    neighbors.set(a, [...(neighbors.get(a) ?? []), b])
    neighbors.set(b, [...(neighbors.get(b) ?? []), a])
  })

  const visitedEdges = new Set<string>()
  let area = 0

  neighbors.forEach((_, start) => {
    const loop = [start]
    let previous = ''
    let current = start

    for (let guard = 0; guard < neighbors.size + 4; guard += 1) {
      const next = (neighbors.get(current) ?? []).find(
        (candidate) => candidate !== previous && !visitedEdges.has(edgeKey(current, candidate)),
      )

      if (!next) {
        break
      }

      visitedEdges.add(edgeKey(current, next))
      previous = current
      current = next

      if (current === start) {
        if (loop.length >= 3) {
          area += polygonArea(loop)
        }
        break
      }

      loop.push(current)
    }
  })

  return area
}

const calculateAreaProfile = (mesh: StlMeshPreview, height: number) => {
  const sliceCount = 72
  const slices = Array.from({ length: sliceCount }, (_, index) => {
    const ratio = (index + 0.5) / sliceCount
    const heightMm = mesh.bounds.minZ + ratio * height

    return {
      heightMm,
      areaMm2: calculateSliceArea(mesh, heightMm),
    }
  })
  const positiveAreas = slices.map((slice) => slice.areaMm2).filter((area) => area > 0)

  return {
    slices,
    minArea: positiveAreas.length > 0 ? Math.min(...positiveAreas) : 0,
    maxArea: positiveAreas.length > 0 ? Math.max(...positiveAreas) : 0,
  }
}

const createPreviewGeometry = (mesh: StlMeshPreview | null): PreviewGeometry | null => {
  if (!mesh || mesh.triangles.length === 0) {
    return null
  }

  const width = mesh.bounds.maxX - mesh.bounds.minX
  const depth = mesh.bounds.maxY - mesh.bounds.minY
  const height = mesh.bounds.maxZ - mesh.bounds.minZ
  const areaProfile = calculateAreaProfile(mesh, height)
  const centerX = (mesh.bounds.minX + mesh.bounds.maxX) / 2
  const centerY = (mesh.bounds.minY + mesh.bounds.maxY) / 2
  const centerZ = (mesh.bounds.minZ + mesh.bounds.maxZ) / 2
  const zSpan = Math.max(height, 1)
  const positions = new Float32Array(mesh.triangles.length * 9)
  const colors = new Float32Array(mesh.triangles.length * 9)
  let offset = 0

  mesh.triangles.forEach((triangle) => {
    triangle.forEach(([x, y, z]) => {
      const color = heightColor((z - mesh.bounds.minZ) / zSpan)
      positions[offset] = x - centerX
      positions[offset + 1] = z - centerZ
      positions[offset + 2] = y - centerY
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
      offset += 3
    })
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return {
    geometry,
    width,
    depth,
    height,
    maxDimension: Math.max(width, depth, height, 1),
    areaProfile: areaProfile.slices,
    minAreaMm2: areaProfile.minArea,
    maxAreaMm2: areaProfile.maxArea,
  }
}

const LayoutPreview = ({ mesh }: LayoutPreviewProps) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [mode, setMode] = useState<PreviewMode>('model')
  const preview = useMemo(() => createPreviewGeometry(mesh), [mesh])
  const areaRange = preview ? Math.max(preview.maxAreaMm2 - preview.minAreaMm2, 1) : 1
  const areaLine = preview
    ? preview.areaProfile
        .map((slice, index) => {
          const x = (index / Math.max(preview.areaProfile.length - 1, 1)) * 100
          const ratio =
            slice.areaMm2 > 0 ? (slice.areaMm2 - preview.minAreaMm2) / areaRange : 0
          const y = 92 - ratio * 76

          return `${x},${y}`
        })
        .join(' ')
    : ''
  const areaFill = areaLine ? `0,96 ${areaLine} 100,96` : ''

  useEffect(
    () => () => {
      preview?.geometry.dispose()
    },
    [preview],
  )

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !preview || mode !== 'model') {
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#edf6ff')

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.append(renderer.domElement)

    const material = new THREE.MeshStandardMaterial({
      color: '#4fb2dc',
      metalness: 0.18,
      roughness: 0.56,
      side: THREE.DoubleSide,
    })
    const model = new THREE.Mesh(preview.geometry, material)
    scene.add(model)

    const grid = new THREE.GridHelper(preview.maxDimension * 1.15, 10, '#9bb4d6', '#d5e3f5')
    grid.position.y = -preview.height / 2
    scene.add(grid)

    const ambientLight = new THREE.HemisphereLight('#ffffff', '#94a3b8', 1.7)
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.2)
    keyLight.position.set(preview.maxDimension, preview.maxDimension * 1.5, preview.maxDimension)
    scene.add(ambientLight, keyLight)

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, preview.maxDimension * 8)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = true
    camera.position.set(
      preview.maxDimension * 0.85,
      preview.maxDimension * 0.58,
      preview.maxDimension * 0.95,
    )
    camera.lookAt(0, 0, 0)
    controls.update()

    const resize = () => {
      const rect = mount.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height, false)

      camera.aspect = rect.width / Math.max(rect.height, 1)
      camera.updateProjectionMatrix()
    }

    let animationFrame = 0
    const render = () => {
      controls.update()
      renderer.render(scene, camera)
      animationFrame = window.requestAnimationFrame(render)
    }

    resize()
    render()
    const observer = new ResizeObserver(resize)
    observer.observe(mount)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      observer.disconnect()
      controls.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [mode, preview])

  return (
    <div className="layout-preview" aria-label="Предпросмотр STL">
      <div className="preview-toolbar">
        <button
          className={mode === 'model' ? 'active' : ''}
          type="button"
          onClick={() => setMode('model')}
        >
          3D
        </button>
        <button
          className={mode === 'heightmap' ? 'active' : ''}
          type="button"
          onClick={() => setMode('heightmap')}
        >
          Карта площадей
        </button>
      </div>
      {mode === 'model' ? (
        <div className="preview-viewport" ref={mountRef}>
          {!preview ? <span>STL-превью появится здесь</span> : null}
        </div>
      ) : (
        <div className="area-map">
          {preview ? (
            <>
              <div className="area-map-head">
                <span>Площадь среза по высоте</span>
                <small>низ → верх</small>
              </div>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="areaFill" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="55%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <polygon points={areaFill} />
                <polyline points={areaLine} />
              </svg>
              <div className="area-map-axis">
                <span>низ</span>
                <span>верх</span>
              </div>
            </>
          ) : (
            <span>Карта площадей появится после загрузки STL</span>
          )}
        </div>
      )}
      {mesh && preview && mode === 'model' ? (
        <div className="preview-meta">
          {formatDimension(mesh.triangles.length)} треуг. · {formatDimension(preview.width)} ×{' '}
          {formatDimension(preview.depth)} × {formatDimension(preview.height)} мм
        </div>
      ) : null}
      {mode === 'heightmap' && preview ? (
        <div className="height-legend area-legend" aria-label="Легенда карты площадей">
          <span>{formatArea(preview.minAreaMm2)}</span>
          <i />
          <span>{formatArea(preview.maxAreaMm2)}</span>
        </div>
      ) : null}
    </div>
  )
}

export default LayoutPreview
