import type {
  ChamberPreset,
  ConsumablesPreset,
  GeometryInput,
  LaborInput,
  MaterialInput,
  MaterialPreset,
  PrintInput,
} from '../domain/types'

export const materialPresets: MaterialPreset[] = [
  {
    id: 'pc-300',
    name: 'РС-300',
    bulkDensityGcm3: 1.4,
    solidDensityGcm3: 2.7,
    powderCostRubKg: 3000,
  },
  {
    id: 'pc-320',
    name: 'PC-320',
    bulkDensityGcm3: 1.25,
    solidDensityGcm3: 2.68,
    powderCostRubKg: 3500,
  },
  {
    id: 'stainless',
    name: 'Нержавейка',
    bulkDensityGcm3: 4.1,
    solidDensityGcm3: 7.9,
    powderCostRubKg: 5000,
  },
]

export const chamberPresets: ChamberPreset[] = [
  {
    id: 'ls-m350',
    name: 'Лазерные Системы М350',
    widthMm: 350,
    depthMm: 350,
    maxHeightMm: 390,
  },
  {
    id: 'small-250',
    name: 'Камера 250 x 250',
    widthMm: 250,
    depthMm: 250,
    maxHeightMm: 300,
  },
  {
    id: 'large-400',
    name: 'Камера 400 x 400',
    widthMm: 400,
    depthMm: 400,
    maxHeightMm: 400,
  },
]

export const defaultConsumables: ConsumablesPreset = {
  gasCylinderCostRub: 3500,
  gasHoursPerCylinder: 24,
  filterCostRub: 7000,
  filterHours: 48,
  platformProcessingRub: 3000,
}

export const defaultGeometryInput: GeometryInput = {
  sourceName: 'Ручной ввод',
  sourceType: 'manual',
  partsVolumeMm3: 120000,
  supportVolumeMm3: 0,
  meanSectionMm2: 0,
  estimatedLayerTimeSec: 0,
}

export const defaultPrintInput: PrintInput = {
  chamberId: chamberPresets[0].id,
  buildHeightMm: 100,
  layerHeightMm: 0.06,
  laserCount: 2,
  hatchSpacingMm: 0.12,
  hatchSpeedMmS: 1540,
  contourSpeedMmS: 430,
  recoatingTimeSec: 8,
}

export const defaultMaterialInput: MaterialInput = {
  materialId: materialPresets[0].id,
  bulkDensityGcm3: materialPresets[0].bulkDensityGcm3,
  solidDensityGcm3: materialPresets[0].solidDensityGcm3,
  powderCostRubKg: materialPresets[0].powderCostRubKg,
  powderReserveKg: 0.5,
}

export const defaultLaborInput: LaborInput = {
  layoutPreparationHours: 4,
  machinePreparationHours: 2,
  technicianCount: 1,
  engineerCount: 1,
  technicianRateRubHour: 900,
  engineerRateRubHour: 1500,
  unpackingHours: 1.5,
  heatTreatmentHours: 2,
  edmHours: 2,
  roughMachiningHours: 2,
  fineMachiningHours: 4,
  finishMachiningHours: 2,
}
