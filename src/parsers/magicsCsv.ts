import type { GeometryImport } from '../domain/types'

type ImportField =
  | 'partsVolumeMm3'
  | 'supportVolumeMm3'
  | 'meanSectionMm2'
  | 'estimatedLayerTimeSec'
  | 'buildHeightMm'
  | 'layerHeightMm'

type SliceField = 'heightMm' | 'totalSectionMm2' | 'partSectionMm2' | 'supportSectionMm2'

const aliases: Record<ImportField, string[]> = {
  partsVolumeMm3: [
    'partsvolumemm3',
    'partvolumemm3',
    'volumemm3',
    'volume',
    'объемдеталей',
    'объёмдеталей',
    'объем',
    'объём',
  ],
  supportVolumeMm3: [
    'supportvolumemm3',
    'supportsvolumemm3',
    'supportvolume',
    'объемподдержек',
    'объёмподдержек',
    'поддержкиобъем',
    'поддержкиобъём',
  ],
  meanSectionMm2: [
    'meansectionmm2',
    'averagesectionmm2',
    'avgsectionmm2',
    'среднеесечение',
    'сечениесреднее',
  ],
  estimatedLayerTimeSec: [
    'estimatedlayertimesec',
    'layertimesec',
    'layerseconds',
    'времяслоя',
    'времяслоясек',
  ],
  buildHeightMm: ['buildheightmm', 'heightmm', 'zheight', 'высотазапуска', 'высота'],
  layerHeightMm: ['layerheightmm', 'layerheight', 'толщинаслоя', 'высотаслоя'],
}

const sliceAliases: Record<SliceField, string[]> = {
  heightMm: ['heightmm', 'zheight', 'высотамм', 'высота'],
  totalSectionMm2: [
    'totalslicesurfacemm2',
    'totalsectionmm2',
    'sumsectionmm2',
    'сумарнаяобластьсрезамм²',
    'суммарнаяобластьсрезамм²',
    'общаяплощадьсрезамм²',
  ],
  partSectionMm2: ['partmm2', 'partsmm2', 'детальмм²', 'деталимм²'],
  supportSectionMm2: [
    'supportmm2',
    'supportsmm2',
    'безобъемныеподдержкимм²',
    'безобъёмныеподдержкимм²',
    'объемныеподдержкимм²',
    'объёмныеподдержкимм²',
    'поддержкимм²',
  ],
}

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replaceAll(/\s|_|-|\(|\)|\[|\]|\.|,/g, '')

const detectDelimiter = (line: string) => {
  const candidates = [';', ',', '\t']
  return candidates.reduce((best, delimiter) => {
    const count = line.split(delimiter).length
    return count > line.split(best).length ? delimiter : best
  }, ';')
}

const parseNumber = (value: string) => {
  const parsed = Number(value.trim().replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

const resolveField = (header: string): ImportField | undefined => {
  const found = Object.entries(aliases).find(([, names]) => names.includes(normalize(header)))
  return found?.[0] as ImportField | undefined
}

const resolveSliceField = (header: string): SliceField | undefined => {
  const normalized = normalize(header)
  const found = Object.entries(sliceAliases).find(([, names]) => names.includes(normalized))
  return found?.[0] as SliceField | undefined
}

const averagePositiveStep = (values: number[]) => {
  const steps = values
    .slice(1)
    .map((value, index) => value - values[index])
    .filter((value) => Number.isFinite(value) && value > 0)

  if (steps.length === 0) {
    return undefined
  }

  return steps.reduce((sum, value) => sum + value, 0) / steps.length
}

const parseSliceDistribution = (
  rows: string[],
  delimiter: string,
  sourceName: string,
): GeometryImport | undefined => {
  const headers = rows[0].split(delimiter).map(resolveSliceField)
  const heightIndex = headers.findIndex((field) => field === 'heightMm')
  const totalIndex = headers.findIndex((field) => field === 'totalSectionMm2')
  const partIndex = headers.findIndex((field) => field === 'partSectionMm2')
  const supportIndexes = headers
    .map((field, index) => (field === 'supportSectionMm2' ? index : -1))
    .filter((index) => index >= 0)

  if (heightIndex < 0 || (totalIndex < 0 && partIndex < 0 && supportIndexes.length === 0)) {
    return undefined
  }

  const slices = rows.slice(1).flatMap((row) => {
    const values = row.split(delimiter)
    const height = parseNumber(values[heightIndex] ?? '')
    const partSection = partIndex >= 0 ? (parseNumber(values[partIndex] ?? '') ?? 0) : 0
    const supportSection = supportIndexes.reduce(
      (sum, index) => sum + (parseNumber(values[index] ?? '') ?? 0),
      0,
    )
    const totalSection =
      totalIndex >= 0
        ? (parseNumber(values[totalIndex] ?? '') ?? partSection + supportSection)
        : partSection + supportSection

    return height !== undefined && totalSection >= 0
      ? [{ height, partSection, supportSection, totalSection }]
      : []
  })

  if (slices.length < 2) {
    return undefined
  }

  const layerHeightMm = averagePositiveStep(slices.map((slice) => slice.height))

  if (!layerHeightMm) {
    return undefined
  }

  const partAreaSum = slices.reduce((sum, slice) => sum + slice.partSection, 0)
  const supportAreaSum = slices.reduce((sum, slice) => sum + slice.supportSection, 0)
  const totalAreaSum = slices.reduce((sum, slice) => sum + slice.totalSection, 0)

  return {
    sourceName,
    sourceType: 'magics-csv',
    partsVolumeMm3: partAreaSum * layerHeightMm,
    supportVolumeMm3: supportAreaSum * layerHeightMm,
    meanSectionMm2: totalAreaSum / slices.length,
    buildHeightMm: Math.max(...slices.map((slice) => slice.height)),
    layerHeightMm,
  }
}

export const parseMagicsCsv = (text: string, sourceName: string): GeometryImport => {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (rows.length < 2) {
    throw new Error('CSV должен содержать заголовок и хотя бы одну строку данных.')
  }

  const delimiter = detectDelimiter(rows[0])
  const sliceImport = parseSliceDistribution(rows, delimiter, sourceName)

  if (sliceImport) {
    return sliceImport
  }

  const headers = rows[0].split(delimiter).map(resolveField)
  const values = rows[1].split(delimiter)
  const imported: GeometryImport = {
    sourceName,
    sourceType: 'magics-csv',
  }

  headers.forEach((field, index) => {
    if (!field) {
      return
    }

    const parsed = parseNumber(values[index] ?? '')
    if (parsed !== undefined) {
      imported[field] = parsed
    }
  })

  if (
    !imported.partsVolumeMm3 &&
    !imported.supportVolumeMm3 &&
    !imported.meanSectionMm2 &&
    !imported.estimatedLayerTimeSec
  ) {
    throw new Error('Не удалось распознать расчётные колонки Magics CSV.')
  }

  return imported
}
