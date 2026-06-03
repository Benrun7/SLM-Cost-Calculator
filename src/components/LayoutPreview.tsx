import { useEffect, useRef } from 'react'
import type { StlMeshPreview, Triangle } from '../parsers/stl'

type LayoutPreviewProps = {
  mesh: StlMeshPreview | null
}

const projectPoint = ([x, y]: [number, number, number]) => ({ x, y: -y })

const triangleDepth = (triangle: Triangle) =>
  (triangle[0][2] + triangle[1][2] + triangle[2][2]) / 3

const LayoutPreview = ({ mesh }: LayoutPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, rect.width, rect.height)

      const gradient = context.createLinearGradient(0, 0, rect.width, rect.height)
      gradient.addColorStop(0, '#f8fbff')
      gradient.addColorStop(0.58, '#eaf3ff')
      gradient.addColorStop(1, '#dbeafe')
      context.fillStyle = gradient
      context.fillRect(0, 0, rect.width, rect.height)

      if (!mesh || mesh.triangles.length === 0) {
        context.fillStyle = '#7d8ca5'
        context.font = '14px system-ui, sans-serif'
        context.textAlign = 'center'
        context.fillText('STL-превью появится здесь', rect.width / 2, rect.height / 2)
        return
      }

      const stride = Math.max(1, Math.ceil(mesh.triangles.length / 3500))
      const triangles = mesh.triangles
        .filter((_, index) => index % stride === 0)
        .sort((left, right) => triangleDepth(left) - triangleDepth(right))
      const projectedPoints = triangles.flatMap((triangle) => triangle.map(projectPoint))
      const minX = Math.min(...projectedPoints.map((point) => point.x))
      const maxX = Math.max(...projectedPoints.map((point) => point.x))
      const minY = Math.min(...projectedPoints.map((point) => point.y))
      const maxY = Math.max(...projectedPoints.map((point) => point.y))
      const scale = Math.min(
        (rect.width * 0.78) / Math.max(1, maxX - minX),
        (rect.height * 0.78) / Math.max(1, maxY - minY),
      )
      const offsetX = rect.width / 2 - ((minX + maxX) * scale) / 2
      const offsetY = rect.height / 2 - ((minY + maxY) * scale) / 2
      const zSpan = Math.max(1, mesh.bounds.maxZ - mesh.bounds.minZ)

      triangles.forEach((triangle) => {
        const points = triangle.map(projectPoint)
        const shade = Math.round(85 + ((triangleDepth(triangle) - mesh.bounds.minZ) / zSpan) * 120)

        context.beginPath()
        points.forEach((point, index) => {
          const x = point.x * scale + offsetX
          const y = point.y * scale + offsetY
          if (index === 0) {
            context.moveTo(x, y)
          } else {
            context.lineTo(x, y)
          }
        })
        context.closePath()
        context.fillStyle = `rgba(${Math.max(74, shade - 35)}, ${Math.min(
          176,
          shade + 8,
        )}, ${Math.min(235, shade + 52)}, 0.82)`
        context.strokeStyle = 'rgba(37, 99, 235, 0.22)'
        context.lineWidth = 0.4
        context.fill()
        context.stroke()
      })

      context.fillStyle = 'rgba(31, 41, 55, 0.72)'
      context.font = '12px system-ui, sans-serif'
      context.textAlign = 'left'
      context.fillText(
        `${mesh.sourceName} · ${mesh.triangles.length} треуг. · ${Math.round(
          mesh.bounds.maxX - mesh.bounds.minX,
        )} x ${Math.round(mesh.bounds.maxY - mesh.bounds.minY)} x ${Math.round(
          mesh.bounds.maxZ - mesh.bounds.minZ,
        )} мм`,
        12,
        rect.height - 14,
      )
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)

    return () => observer.disconnect()
  }, [mesh])

  return <canvas ref={canvasRef} className="layout-preview" aria-label="Предпросмотр STL" />
}

export default LayoutPreview
