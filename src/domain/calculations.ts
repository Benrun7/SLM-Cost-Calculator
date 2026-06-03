import { chamberPresets } from '../data/presets'
import type { CalculationResult, CalculatorInput } from './types'

const safePositive = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback

const round = (value: number, precision = 2) => {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

export const calculateSlmCost = (input: CalculatorInput): CalculationResult => {
  const warnings: string[] = []
  const chamber =
    chamberPresets.find((preset) => preset.id === input.print.chamberId) ?? chamberPresets[0]

  const buildHeightMm = safePositive(input.print.buildHeightMm, 1)
  const layerHeightMm = safePositive(input.print.layerHeightMm, 0.06)
  const partsVolumeMm3 = Math.max(0, input.geometry.partsVolumeMm3)
  const supportVolumeMm3 = Math.max(0, input.geometry.supportVolumeMm3)
  const fusedVolumeMm3 = partsVolumeMm3 + supportVolumeMm3
  const meanSectionMm2 = safePositive(
    input.geometry.meanSectionMm2,
    fusedVolumeMm3 > 0 ? fusedVolumeMm3 / buildHeightMm : 1,
  )
  const laserCount = safePositive(input.print.laserCount, 1)
  const hatchSpacingMm = safePositive(input.print.hatchSpacingMm, 0.12)
  const hatchSpeedMmS = safePositive(input.print.hatchSpeedMmS, 1)
  const contourSpeedMmS = safePositive(input.print.contourSpeedMmS, 1)
  const recoatingTimeSec = Math.max(0, input.print.recoatingTimeSec)

  if (input.print.buildHeightMm > chamber.maxHeightMm) {
    warnings.push(`Высота запуска выше лимита камеры ${chamber.name}.`)
  }

  if (input.geometry.sourceType === 'stl') {
    warnings.push('STL не содержит технологические треки, время печати рассчитано приближенно.')
  }

  if (input.geometry.estimatedLayerTimeSec > 0) {
    warnings.push('Время слоя взято из импортированного файла и имеет приоритет над оценкой.')
  }

  const layerCount = Math.ceil(buildHeightMm / layerHeightMm)
  const averageTrackLengthMm = Math.sqrt(meanSectionMm2)
  const trackCount = averageTrackLengthMm / hatchSpacingMm
  const hatchLengthMm = averageTrackLengthMm * trackCount
  const approximatePerimeterMm = 4 * Math.sqrt(meanSectionMm2)
  const hatchTimeSec = hatchLengthMm / hatchSpeedMmS
  const contourTimeSec = approximatePerimeterMm / contourSpeedMmS
  const estimatedFormulaLayerTimeSec = hatchTimeSec + contourTimeSec + recoatingTimeSec
  const layerTimeSec =
    input.geometry.estimatedLayerTimeSec > 0
      ? input.geometry.estimatedLayerTimeSec
      : estimatedFormulaLayerTimeSec
  const printTimeHours = (layerTimeSec * layerCount) / 3600 / laserCount

  const partsVolumeCm3 = partsVolumeMm3 / 1000
  const supportVolumeCm3 = supportVolumeMm3 / 1000
  const buildVolumeCm3 = (chamber.widthMm * chamber.depthMm * buildHeightMm) / 1000
  const fusedVolumeCm3 = partsVolumeCm3 + supportVolumeCm3
  const solidDensityGcm3 = safePositive(input.material.solidDensityGcm3, 1)
  const bulkDensityGcm3 = safePositive(input.material.bulkDensityGcm3, 1)
  const partsMassKg = (partsVolumeCm3 * safePositive(input.material.solidDensityGcm3, 1)) / 1000
  const supportMassKg = (supportVolumeCm3 * solidDensityGcm3) / 1000
  const fusedMassKg = partsMassKg + supportMassKg
  const unfusedPowderVolumeCm3 = Math.max(0, buildVolumeCm3 - fusedVolumeCm3)
  const unfusedPowderMassKg = (unfusedPowderVolumeCm3 * bulkDensityGcm3) / 1000
  const requiredPowderMassKg = fusedMassKg + unfusedPowderMassKg
  const powderReserveKg = Math.max(0, input.material.powderReserveKg)
  const chargeablePowderMassKg = fusedMassKg + powderReserveKg
  const powderCostRub = chargeablePowderMassKg * Math.max(0, input.material.powderCostRubKg)

  const gasCostRub =
    Math.ceil(printTimeHours / input.consumables.gasHoursPerCylinder) *
    input.consumables.gasCylinderCostRub
  const filterCostRub =
    (printTimeHours / input.consumables.filterHours) * input.consumables.filterCostRub
  const platformProcessingRub = input.consumables.platformProcessingRub
  const consumablesCostRub = gasCostRub + filterCostRub + platformProcessingRub

  const laborHours =
    input.labor.layoutPreparationHours +
    input.labor.machinePreparationHours +
    input.labor.unpackingHours +
    input.labor.heatTreatmentHours +
    input.labor.edmHours +
    input.labor.roughMachiningHours +
    input.labor.fineMachiningHours +
    input.labor.finishMachiningHours
  const crewHourlyCostRub =
    input.labor.technicianCount * input.labor.technicianRateRubHour +
    input.labor.engineerCount * input.labor.engineerRateRubHour
  const laborCostRub = laborHours * crewHourlyCostRub
  const totalProjectHours = printTimeHours + laborHours

  return {
    layerCount,
    approximatePerimeterMm: round(approximatePerimeterMm),
    trackCount: round(trackCount, 0),
    hatchLengthMm: round(hatchLengthMm),
    hatchTimeSec: round(hatchTimeSec),
    contourTimeSec: round(contourTimeSec),
    layerTimeSec: round(layerTimeSec),
    printTimeHours: round(printTimeHours, 1),
    partsMassKg: round(partsMassKg, 3),
    supportMassKg: round(supportMassKg, 3),
    fusedMassKg: round(fusedMassKg, 3),
    buildVolumeCm3: round(buildVolumeCm3, 1),
    fusedVolumeCm3: round(fusedVolumeCm3, 1),
    supportVolumeCm3: round(supportVolumeCm3, 1),
    unfusedPowderMassKg: round(unfusedPowderMassKg, 3),
    requiredPowderMassKg: round(requiredPowderMassKg, 3),
    chargeablePowderMassKg: round(chargeablePowderMassKg, 3),
    powderReserveKg: round(powderReserveKg, 3),
    powderCostRub: round(powderCostRub, 0),
    gasCostRub,
    filterCostRub: round(filterCostRub, 0),
    platformProcessingRub,
    laborHours: round(laborHours, 1),
    laborCostRub: round(laborCostRub, 0),
    consumablesCostRub: round(consumablesCostRub, 0),
    totalCostRub: round(powderCostRub + consumablesCostRub + laborCostRub, 0),
    totalProjectHours: round(totalProjectHours, 1),
    workShifts8h: Math.ceil(totalProjectHours / 8),
    warnings,
  }
}
