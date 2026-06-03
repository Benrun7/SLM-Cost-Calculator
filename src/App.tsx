import { useMemo, useState } from 'react'
import './App.css'
import FileImport from './components/FileImport'
import NumberField from './components/NumberField'
import ResultsPanel from './components/ResultsPanel'
import {
  chamberPresets,
  defaultConsumables,
  defaultGeometryInput,
  defaultLaborInput,
  defaultMaterialInput,
  defaultPrintInput,
  materialPresets,
} from './data/presets'
import { calculateSlmCost } from './domain/calculations'
import type { GeometryImport, GeometryInput, LaborInput, MaterialInput, PrintInput } from './domain/types'

function App() {
  const [geometry, setGeometry] = useState<GeometryInput>(defaultGeometryInput)
  const [print, setPrint] = useState<PrintInput>(defaultPrintInput)
  const [material, setMaterial] = useState<MaterialInput>(defaultMaterialInput)
  const [labor, setLabor] = useState<LaborInput>(defaultLaborInput)
  const [status, setStatus] = useState('Файл компоновки пока не загружен.')

  const result = useMemo(
    () =>
      calculateSlmCost({
        geometry,
        print,
        material,
        labor,
        consumables: defaultConsumables,
      }),
    [geometry, print, material, labor],
  )

  const selectedChamber = chamberPresets.find((chamber) => chamber.id === print.chamberId)

  const updateGeometry = (patch: Partial<GeometryInput>) =>
    setGeometry((current) => ({ ...current, ...patch }))

  const updatePrint = (patch: Partial<PrintInput>) =>
    setPrint((current) => ({ ...current, ...patch }))

  const updateLabor = (patch: Partial<LaborInput>) =>
    setLabor((current) => ({ ...current, ...patch }))

  const applyGeometryImport = (imported: GeometryImport) => {
    setGeometry((current) => ({
      ...current,
      sourceName: imported.sourceName,
      sourceType: imported.sourceType,
      partsVolumeMm3: imported.partsVolumeMm3 ?? current.partsVolumeMm3,
      supportVolumeMm3: imported.supportVolumeMm3 ?? current.supportVolumeMm3,
      meanSectionMm2: imported.meanSectionMm2 ?? current.meanSectionMm2,
      estimatedLayerTimeSec: imported.estimatedLayerTimeSec ?? current.estimatedLayerTimeSec,
    }))
    setPrint((current) => ({
      ...current,
      buildHeightMm: imported.buildHeightMm ?? current.buildHeightMm,
      layerHeightMm: imported.layerHeightMm ?? current.layerHeightMm,
    }))
  }

  const applyMaterialPreset = (materialId: string) => {
    const preset = materialPresets.find((item) => item.id === materialId) ?? materialPresets[0]
    setMaterial({
      materialId: preset.id,
      bulkDensityGcm3: preset.bulkDensityGcm3,
      solidDensityGcm3: preset.solidDensityGcm3,
      powderCostRubKg: preset.powderCostRubKg,
      powderReserveKg: material.powderReserveKg,
    })
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p>SLM Cost Calculator</p>
        <h1>Калькулятор запуска SLM</h1>
        <span>Импорт STL/CSV, оценка себестоимости</span>
        <div className="hero-visual" aria-hidden="true"></div>
      </header>

      <div className="workspace">
        <section className="input-panel">
          <section className="card">
            <div className="section-heading">
              <h2>Компоновка</h2>
              <span>{geometry.sourceName}</span>
            </div>
            <FileImport onImport={applyGeometryImport} onStatus={setStatus} />
            <p className="status">{status}</p>

            <div className="form-grid">
              <NumberField
                label="Объём деталей"
                unit="мм3"
                value={geometry.partsVolumeMm3}
                onChange={(value) => updateGeometry({ partsVolumeMm3: value })}
                step={1000}
              />
              <NumberField
                label="Объём поддержек"
                unit="мм3"
                value={geometry.supportVolumeMm3}
                onChange={(value) => updateGeometry({ supportVolumeMm3: value })}
                hint="Можно вводить вручную без тяжёлого STL"
                step={1000}
              />
              <NumberField
                label="Среднее сечение деталей и поддержек"
                unit="мм2"
                value={geometry.meanSectionMm2}
                onChange={(value) => updateGeometry({ meanSectionMm2: value })}
                hint="0 значит V деталей + поддержек / H"
                step={10}
              />
              <NumberField
                label="Время слоя из Magics"
                unit="сек"
                value={geometry.estimatedLayerTimeSec}
                onChange={(value) => updateGeometry({ estimatedLayerTimeSec: value })}
                hint="0 значит считать по скоростям"
                step={0.1}
              />
            </div>
          </section>

          <section className="card">
            <div className="section-heading">
              <h2>Печать</h2>
              <span>{selectedChamber?.name}</span>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Камера принтера</span>
                <select
                  value={print.chamberId}
                  onChange={(event) => updatePrint({ chamberId: event.target.value })}
                >
                  {chamberPresets.map((chamber) => (
                    <option key={chamber.id} value={chamber.id}>
                      {chamber.name}, H до {chamber.maxHeightMm} мм
                    </option>
                  ))}
                </select>
              </label>
              <NumberField
                label="Высота запуска"
                unit="мм"
                value={print.buildHeightMm}
                onChange={(value) => updatePrint({ buildHeightMm: value })}
                max={selectedChamber?.maxHeightMm ?? 500}
                step={1}
                slider
              />
              <NumberField
                label="Высота слоя"
                unit="мм"
                value={print.layerHeightMm}
                onChange={(value) => updatePrint({ layerHeightMm: value })}
                min={0.02}
                max={0.1}
                step={0.01}
                slider
              />
              <NumberField
                label="Количество лазеров"
                value={print.laserCount}
                onChange={(value) => updatePrint({ laserCount: value })}
                min={1}
                max={4}
                step={1}
                slider
              />
              <NumberField
                label="Скорость штриховки"
                unit="мм/с"
                value={print.hatchSpeedMmS}
                onChange={(value) => updatePrint({ hatchSpeedMmS: value })}
                max={2000}
                step={10}
                slider
              />
              <NumberField
                label="Шаг штриховки"
                unit="мм"
                value={print.hatchSpacingMm}
                onChange={(value) => updatePrint({ hatchSpacingMm: value })}
                min={0.05}
                max={0.2}
                step={0.01}
                hint="Используется для авторасчёта количества треков"
                slider
              />
              <NumberField
                label="Скорость контуров"
                unit="мм/с"
                value={print.contourSpeedMmS}
                onChange={(value) => updatePrint({ contourSpeedMmS: value })}
                max={1200}
                step={10}
                slider
              />
              <NumberField
                label="Нанесение слоя"
                unit="сек"
                value={print.recoatingTimeSec}
                onChange={(value) => updatePrint({ recoatingTimeSec: value })}
                max={30}
                step={0.5}
                slider
              />
            </div>
          </section>

          <section className="card">
            <div className="section-heading">
              <h2>Материал</h2>
              <span>плотности и стоимость можно уточнить</span>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Материал</span>
                <select
                  value={material.materialId}
                  onChange={(event) => applyMaterialPreset(event.target.value)}
                >
                  {materialPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
              <NumberField
                label="Насыпная плотность"
                unit="г/см3"
                value={material.bulkDensityGcm3}
                onChange={(value) =>
                  setMaterial((current) => ({ ...current, bulkDensityGcm3: value }))
                }
                min={0.1}
                max={10}
                step={0.01}
                slider
              />
              <NumberField
                label="Плотность детали"
                unit="г/см3"
                value={material.solidDensityGcm3}
                onChange={(value) =>
                  setMaterial((current) => ({ ...current, solidDensityGcm3: value }))
                }
                min={0.1}
                max={10}
                step={0.01}
                slider
              />
              <NumberField
                label="Стоимость порошка"
                unit="руб/кг"
                value={material.powderCostRubKg}
                onChange={(value) =>
                  setMaterial((current) => ({ ...current, powderCostRubKg: value }))
                }
                max={20000}
                step={100}
                slider
              />
              <NumberField
                label="Резерв списываемого порошка"
                unit="кг"
                value={material.powderReserveKg}
                onChange={(value) =>
                  setMaterial((current) => ({ ...current, powderReserveKg: value }))
                }
                max={5}
                step={0.1}
                hint="Добавляется к массе деталей и поддержек"
                slider
              />
            </div>
          </section>

          <section className="card">
            <div className="section-heading">
              <h2>ФОТ и операции</h2>
              <span>суммируются с временем печати</span>
            </div>
            <div className="form-grid">
              <NumberField
                label="Подготовка компоновки"
                unit="ч"
                value={labor.layoutPreparationHours}
                onChange={(value) => updateLabor({ layoutPreparationHours: value })}
                max={24}
                step={0.5}
                slider
              />
              <NumberField
                label="Подготовка машины"
                unit="ч"
                value={labor.machinePreparationHours}
                onChange={(value) => updateLabor({ machinePreparationHours: value })}
                max={24}
                step={0.5}
                slider
              />
              <NumberField
                label="Техники"
                value={labor.technicianCount}
                onChange={(value) => updateLabor({ technicianCount: value })}
                max={5}
                step={1}
                slider
              />
              <NumberField
                label="Инженеры"
                value={labor.engineerCount}
                onChange={(value) => updateLabor({ engineerCount: value })}
                max={5}
                step={1}
                slider
              />
              <NumberField
                label="Распаковка"
                unit="ч"
                value={labor.unpackingHours}
                onChange={(value) => updateLabor({ unpackingHours: value })}
                max={24}
                step={0.5}
                slider
              />
              <NumberField
                label="Термообработка"
                unit="ч"
                value={labor.heatTreatmentHours}
                onChange={(value) => updateLabor({ heatTreatmentHours: value })}
                max={48}
                step={0.5}
                slider
              />
              <NumberField
                label="ЭЭО"
                unit="ч"
                value={labor.edmHours}
                onChange={(value) => updateLabor({ edmHours: value })}
                max={24}
                step={0.5}
                slider
              />
              <NumberField
                label="Мехобработка грубая"
                unit="ч"
                value={labor.roughMachiningHours}
                onChange={(value) => updateLabor({ roughMachiningHours: value })}
                max={80}
                step={0.5}
                slider
              />
              <NumberField
                label="Мехобработка тонкая"
                unit="ч"
                value={labor.fineMachiningHours}
                onChange={(value) => updateLabor({ fineMachiningHours: value })}
                max={80}
                step={0.5}
                slider
              />
              <NumberField
                label="Мехобработка финишная"
                unit="ч"
                value={labor.finishMachiningHours}
                onChange={(value) => updateLabor({ finishMachiningHours: value })}
                max={80}
                step={0.5}
                slider
              />
            </div>
          </section>
        </section>

        <ResultsPanel result={result} />
      </div>
    </main>
  )
}

export default App
