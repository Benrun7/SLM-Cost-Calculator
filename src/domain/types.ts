export type MaterialPreset = {
  id: string
  name: string
  bulkDensityGcm3: number
  solidDensityGcm3: number
  powderCostRubKg: number
}

export type ChamberPreset = {
  id: string
  name: string
  widthMm: number
  depthMm: number
  maxHeightMm: number
}

export type ConsumablesPreset = {
  gasCylinderCostRub: number
  gasHoursPerCylinder: number
  filterCostRub: number
  filterHours: number
  platformProcessingRub: number
}

export type GeometryInput = {
  sourceName: string
  sourceType: 'manual' | 'stl' | 'magics-csv'
  partsVolumeMm3: number
  supportVolumeMm3: number
  meanSectionMm2: number
  estimatedLayerTimeSec: number
}

export type PrintInput = {
  chamberId: string
  buildHeightMm: number
  layerHeightMm: number
  laserCount: number
  hatchSpacingMm: number
  hatchSpeedMmS: number
  contourSpeedMmS: number
  recoatingTimeSec: number
}

export type MaterialInput = {
  materialId: string
  bulkDensityGcm3: number
  solidDensityGcm3: number
  powderCostRubKg: number
  powderReserveKg: number
}

export type LaborInput = {
  layoutPreparationHours: number
  machinePreparationHours: number
  technicianCount: number
  engineerCount: number
  technicianRateRubHour: number
  engineerRateRubHour: number
  unpackingHours: number
  heatTreatmentHours: number
  edmHours: number
  roughMachiningHours: number
  fineMachiningHours: number
  finishMachiningHours: number
}

export type CalculatorInput = {
  geometry: GeometryInput
  print: PrintInput
  material: MaterialInput
  labor: LaborInput
  consumables: ConsumablesPreset
}

export type GeometryImport = Partial<
  Pick<
    GeometryInput,
    'partsVolumeMm3' | 'supportVolumeMm3' | 'meanSectionMm2' | 'estimatedLayerTimeSec'
  >
> &
  Partial<Pick<PrintInput, 'buildHeightMm' | 'layerHeightMm'>> & {
    sourceName: string
    sourceType: GeometryInput['sourceType']
  }

export type CalculationResult = {
  layerCount: number
  approximatePerimeterMm: number
  trackCount: number
  hatchLengthMm: number
  hatchTimeSec: number
  contourTimeSec: number
  layerTimeSec: number
  printTimeHours: number
  partsMassKg: number
  supportMassKg: number
  fusedMassKg: number
  buildVolumeCm3: number
  fusedVolumeCm3: number
  supportVolumeCm3: number
  unfusedPowderMassKg: number
  requiredPowderMassKg: number
  chargeablePowderMassKg: number
  powderReserveKg: number
  powderCostRub: number
  gasCostRub: number
  filterCostRub: number
  platformProcessingRub: number
  laborHours: number
  laborCostRub: number
  consumablesCostRub: number
  totalCostRub: number
  totalProjectHours: number
  workShifts8h: number
  warnings: string[]
}
