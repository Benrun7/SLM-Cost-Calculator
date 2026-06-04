import { useMemo } from 'react'
import * as THREE from 'three'
import type {
  CalculationResult,
  ChamberPreset,
  GeometryInput,
  LaborInput,
  MaterialInput,
  PrintInput,
} from '../domain/types'
import type { StlMeshPreview } from '../parsers/stl'

type ReportPanelProps = {
  isOpen: boolean
  onClose: () => void
  geometry: GeometryInput
  print: PrintInput
  material: MaterialInput
  labor: LaborInput
  result: CalculationResult
  materialName: string
  chamber: ChamberPreset | undefined
  mesh: StlMeshPreview | null
}

const formatNumber = (value: number, maximumFractionDigits = 2) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(value)

const formatRub = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

const heightColor = (ratio: number) => {
  const color = new THREE.Color()
  color.setHSL(0.58 - ratio * 0.52, 0.82, 0.58)
  return color
}

const renderIsometricSnapshot = (mesh: StlMeshPreview) => {
  const width = 920
  const height = 560
  const meshWidth = mesh.bounds.maxX - mesh.bounds.minX
  const meshDepth = mesh.bounds.maxY - mesh.bounds.minY
  const meshHeight = mesh.bounds.maxZ - mesh.bounds.minZ
  const maxDimension = Math.max(meshWidth, meshDepth, meshHeight, 1)
  const centerX = (mesh.bounds.minX + mesh.bounds.maxX) / 2
  const centerY = (mesh.bounds.minY + mesh.bounds.maxY) / 2
  const centerZ = (mesh.bounds.minZ + mesh.bounds.maxZ) / 2
  const zSpan = Math.max(meshHeight, 1)
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

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#edf6ff')

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(1)
  renderer.setSize(width, height, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.18,
    roughness: 0.56,
    side: THREE.DoubleSide,
  })
  const model = new THREE.Mesh(geometry, material)
  scene.add(model)

  const grid = new THREE.GridHelper(maxDimension * 1.2, 10, '#9bb4d6', '#d5e3f5')
  grid.position.y = -meshHeight / 2
  scene.add(grid)
  scene.add(new THREE.HemisphereLight('#ffffff', '#94a3b8', 1.7))

  const keyLight = new THREE.DirectionalLight('#ffffff', 2.2)
  keyLight.position.set(maxDimension, maxDimension * 1.5, maxDimension)
  scene.add(keyLight)

  const aspect = width / height
  const frustum = maxDimension * 1.55
  const camera = new THREE.OrthographicCamera(
    (-frustum * aspect) / 2,
    (frustum * aspect) / 2,
    frustum / 2,
    -frustum / 2,
    0.1,
    maxDimension * 10,
  )
  camera.position.set(maxDimension * 1.05, maxDimension * 0.72, maxDimension * 1.18)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()

  renderer.render(scene, camera)
  const image = renderer.domElement.toDataURL('image/png')

  geometry.dispose()
  material.dispose()
  renderer.dispose()

  return image
}

const ReportPanel = ({
  isOpen,
  onClose,
  geometry,
  print,
  material,
  labor,
  result,
  materialName,
  chamber,
  mesh,
}: ReportPanelProps) => {
  const reportDate = useMemo(() => new Date(), [])
  const snapshot = useMemo(() => {
    if (!mesh) {
      return ''
    }

    try {
      return renderIsometricSnapshot(mesh)
    } catch {
      return ''
    }
  }, [mesh])
  const sourceTypeLabel =
    geometry.sourceType === 'manual'
      ? 'ручной ввод'
      : geometry.sourceType === 'stl'
        ? 'STL'
        : 'Magics'

  const costRows = [
    ['Порошок', result.powderCostRub],
    ['ФОТ', result.laborCostRub],
    ['Расходники, газ, фильтр и платформа', result.consumablesCostRub],
  ] as const

  const geometryRows = [
    ['Источник', `${geometry.sourceName} (${sourceTypeLabel})`],
    ['Материал', materialName],
    ['Камера', chamber ? `${chamber.name}, ${chamber.widthMm} x ${chamber.depthMm} мм` : 'не выбрана'],
    ['Объём деталей', `${formatNumber(geometry.partsVolumeMm3, 0)} мм3`],
    ['Объём поддержек', `${formatNumber(geometry.supportVolumeMm3, 0)} мм3`],
    ['Высота запуска', `${formatNumber(print.buildHeightMm, 1)} мм`],
    ['Высота слоя', `${formatNumber(print.layerHeightMm * 1000, 0)} мкм`],
  ] as const

  const calculationRows = [
    ['Себестоимость запуска', formatRub(result.totalCostRub)],
    ['Время печати', `${formatNumber(result.printTimeHours, 1)} ч`],
    ['Срок проекта', `${formatNumber(result.totalProjectHours, 1)} ч / ${result.workShifts8h} смен`],
    ['Порошок к списанию', `${formatNumber(result.chargeablePowderMassKg, 3)} кг`],
    ['Масса деталей', `${formatNumber(result.partsMassKg, 3)} кг`],
    ['Масса поддержек', `${formatNumber(result.supportMassKg, 3)} кг`],
    ['Трудозатраты', `${formatNumber(result.laborHours, 1)} ч`],
  ] as const

  const printReport = () => {
    window.print()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="report-modal" role="dialog" aria-modal="true" aria-label="Форма отчёта">
      <button
        className="report-modal-backdrop no-print"
        type="button"
        aria-label="Закрыть отчёт"
        onClick={onClose}
      />
      <section className="report-card" aria-label="Форма отчёта">
        <div className="report-toolbar no-print">
          <div>
            <p>Форма отчётности</p>
            <h2>Отчёт по запуску SLM</h2>
          </div>
          <div className="report-actions">
            <button type="button" onClick={printReport}>
              PDF / печать
            </button>
            <button className="report-close-button" type="button" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>

        <article className="report-document">
          <header className="report-head">
            <div>
              <span>SLM Cost Calculator</span>
              <h2>Отчёт по запуску SLM</h2>
            </div>
            <dl>
              <div>
                <dt>Дата</dt>
                <dd>{formatDate(reportDate)}</dd>
              </div>
              <div>
                <dt>Файл</dt>
                <dd>{geometry.sourceName}</dd>
              </div>
            </dl>
          </header>

        <div className="report-hero">
          <figure className="report-shot">
            {snapshot ? (
              <img src={snapshot} alt="Изометрия запуска" />
            ) : (
              <div className="report-shot-placeholder">
                Изометрия появится после загрузки STL-файла
              </div>
            )}
            <figcaption>Фотка запуска: изометрия STL-компоновки</figcaption>
          </figure>

          <section className="report-total">
            <span>Итоговая себестоимость</span>
            <strong>{formatRub(result.totalCostRub)}</strong>
            <p>
              {formatNumber(result.printTimeHours, 1)} ч печати,{' '}
              {formatNumber(result.chargeablePowderMassKg, 3)} кг порошка к списанию
            </p>
          </section>
        </div>

        <div className="report-grid">
          <section>
            <h3>Параметры запуска</h3>
            <dl className="report-list">
              {geometryRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3>Расчёт себестоимости</h3>
            <dl className="report-list report-list--strong">
              {calculationRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <section className="report-costs">
          <h3>Разбивка затрат</h3>
          <div>
            {costRows.map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{formatRub(value)}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="report-note">
          <strong>Методика</strong>
          <p>
            Порошок к списанию считается как масса деталей и поддержек плюс резерв. Порошок в
            камере, несплавленный объём, газ, фильтр, обработка платформы и ФОТ учитываются в
            технологической себестоимости запуска.
          </p>
          {result.warnings.length > 0 ? (
            <ul>
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <p>
            Команда: {labor.technicianCount} техник(а) и {labor.engineerCount} инженер(а). Стоимость
            порошка: {formatRub(material.powderCostRubKg)} / кг.
          </p>
        </section>
        </article>
      </section>
    </div>
  )
}

export default ReportPanel
