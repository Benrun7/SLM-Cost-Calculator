import type { GeometryImport } from '../domain/types'

type Point = [number, number, number]
export type Triangle = [Point, Point, Point]

type Bounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export type StlMeshPreview = {
  sourceName: string
  triangles: Triangle[]
  bounds: Bounds
}

export type StlParseResult = {
  geometry: GeometryImport
  mesh: StlMeshPreview
}

const signedTetraVolume = (a: Point, b: Point, c: Point) =>
  (a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0])) /
  6

const createBounds = (): Bounds => ({
  minX: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY,
  minZ: Number.POSITIVE_INFINITY,
  maxZ: Number.NEGATIVE_INFINITY,
})

const updateBounds = (bounds: Bounds, point: Point) => {
  bounds.minX = Math.min(bounds.minX, point[0])
  bounds.maxX = Math.max(bounds.maxX, point[0])
  bounds.minY = Math.min(bounds.minY, point[1])
  bounds.maxY = Math.max(bounds.maxY, point[1])
  bounds.minZ = Math.min(bounds.minZ, point[2])
  bounds.maxZ = Math.max(bounds.maxZ, point[2])
}

const buildImport = (sourceName: string, volumeMm3: number, bounds: Bounds): GeometryImport => {
  const buildHeightMm = Math.max(0, bounds.maxZ - bounds.minZ)

  return {
    sourceName,
    sourceType: 'stl',
    partsVolumeMm3: Math.abs(volumeMm3),
    meanSectionMm2: buildHeightMm > 0 ? Math.abs(volumeMm3) / buildHeightMm : undefined,
    buildHeightMm: buildHeightMm > 0 ? buildHeightMm : undefined,
  }
}

const parseBinaryStl = (buffer: ArrayBuffer, sourceName: string): StlParseResult => {
  const view = new DataView(buffer)
  const triangleCount = view.getUint32(80, true)
  const expectedLength = 84 + triangleCount * 50
  const bounds = createBounds()
  const triangles: Triangle[] = []
  let volumeMm3 = 0

  if (expectedLength > buffer.byteLength) {
    throw new Error('Размер бинарного STL не совпадает с количеством треугольников.')
  }

  for (let index = 0; index < triangleCount; index += 1) {
    const offset = 84 + index * 50 + 12
    const a: Point = [
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true),
    ]
    const b: Point = [
      view.getFloat32(offset + 12, true),
      view.getFloat32(offset + 16, true),
      view.getFloat32(offset + 20, true),
    ]
    const c: Point = [
      view.getFloat32(offset + 24, true),
      view.getFloat32(offset + 28, true),
      view.getFloat32(offset + 32, true),
    ]

    updateBounds(bounds, a)
    updateBounds(bounds, b)
    updateBounds(bounds, c)
    triangles.push([a, b, c])
    volumeMm3 += signedTetraVolume(a, b, c)
  }

  return {
    geometry: buildImport(sourceName, volumeMm3, bounds),
    mesh: { sourceName, triangles, bounds },
  }
}

const parseAsciiStl = (text: string, sourceName: string): StlParseResult => {
  const vertexRegex =
    /vertex\s+([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/gi
  const vertices = [...text.matchAll(vertexRegex)].map<Point>((match) => [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ])
  const bounds = createBounds()
  const triangles: Triangle[] = []
  let volumeMm3 = 0

  if (vertices.length < 3) {
    throw new Error('В ASCII STL не найдены вершины.')
  }

  for (let index = 0; index + 2 < vertices.length; index += 3) {
    const a = vertices[index]
    const b = vertices[index + 1]
    const c = vertices[index + 2]

    updateBounds(bounds, a)
    updateBounds(bounds, b)
    updateBounds(bounds, c)
    triangles.push([a, b, c])
    volumeMm3 += signedTetraVolume(a, b, c)
  }

  return {
    geometry: buildImport(sourceName, volumeMm3, bounds),
    mesh: { sourceName, triangles, bounds },
  }
}

export const parseStlMeshFile = async (file: File): Promise<StlParseResult> => {
  const buffer = await file.arrayBuffer()
  const headerText = new TextDecoder().decode(buffer.slice(0, 256)).trimStart()

  if (headerText.startsWith('solid')) {
    try {
      return parseAsciiStl(await file.text(), file.name)
    } catch {
      return parseBinaryStl(buffer, file.name)
    }
  }

  return parseBinaryStl(buffer, file.name)
}
