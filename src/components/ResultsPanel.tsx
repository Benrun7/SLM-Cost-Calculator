import type { CalculationResult } from '../domain/types'

type ResultsPanelProps = {
  result: CalculationResult
  onOpenReport: () => void
}

const formatNumber = (value: number, maximumFractionDigits = 2) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(value)

const formatRub = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)

const ResultsPanel = ({ result, onOpenReport }: ResultsPanelProps) => {
  const summaryItems = [
    {
      label: 'Печать',
      value: `${formatNumber(result.printTimeHours, 1)} ч`,
      note: `${formatNumber(result.layerTimeSec, 1)} сек/слой`,
    },
    {
      label: 'Проект',
      value: `${formatNumber(result.totalProjectHours, 1)} ч`,
      note: `${result.workShifts8h} смен по 8 часов`,
    },
    {
      label: 'Порошок',
      value: `${formatNumber(result.chargeablePowderMassKg, 3)} кг`,
      note: 'к списанию',
    },
    {
      label: 'Детали',
      value: `${formatNumber(result.partsMassKg, 3)} кг`,
      note: `${formatNumber(result.supportMassKg, 3)} кг поддержек`,
    },
  ]

  const costRows = [
    { label: 'Порошок', value: result.powderCostRub },
    { label: 'ФОТ', value: result.laborCostRub },
    { label: 'Расходники', value: result.consumablesCostRub },
    { label: 'Инертный газ', value: result.gasCostRub },
    { label: 'Ресурс фильтра', value: result.filterCostRub },
    { label: 'Обработка платформы', value: result.platformProcessingRub },
  ]
  const costShareTotal = Math.max(result.totalCostRub, 1)

  const detailRows = [
    ['Слоёв', formatNumber(result.layerCount, 0)],
    ['Периметр слоя', `${formatNumber(result.approximatePerimeterMm)} мм`],
    ['Треков', formatNumber(result.trackCount, 0)],
    ['Длина штриховки слоя', `${formatNumber(result.hatchLengthMm, 0)} мм`],
    ['Штриховка', `${formatNumber(result.hatchTimeSec)} сек`],
    ['Контуры', `${formatNumber(result.contourTimeSec)} сек`],
    ['Сплавленный металл', `${formatNumber(result.fusedMassKg, 3)} кг`],
    ['Резерв порошка', `${formatNumber(result.powderReserveKg, 3)} кг`],
    ['Порошок в камере', `${formatNumber(result.requiredPowderMassKg, 3)} кг`],
    ['Несплавленный порошок', `${formatNumber(result.unfusedPowderMassKg, 3)} кг`],
    ['Рабочий объём засыпки', `${formatNumber(result.buildVolumeCm3, 1)} см3`],
    ['Трудозатраты', `${formatNumber(result.laborHours, 1)} ч`],
  ]

  return (
    <aside className="results-panel">
      <div className="panel-heading">
        <span>Общая себестоимость запуска</span>
        <strong>{formatRub(result.totalCostRub)}</strong>
        <button className="report-open-button" type="button" onClick={onOpenReport}>
          Отчёт
        </button>
      </div>

      <div className="summary-strip">
        {summaryItems.map((item) => (
          <article className="summary-item" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </div>

      <section className="result-section">
        <div className="result-section-heading">
          <h3>Разбивка стоимости</h3>
          <span>доля в итоге</span>
        </div>
        <div className="cost-breakdown">
          {costRows.map((row) => (
            <article className="cost-row" key={row.label}>
              <div>
                <span>{row.label}</span>
                <strong>{formatRub(row.value)}</strong>
              </div>
              <div className="cost-bar" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.max((row.value / costShareTotal) * 100, 2)}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <details className="result-section tech-details">
        <summary>
          <span>Технологические данные</span>
          <strong>Показать</strong>
        </summary>
        <dl className="result-list">
          {detailRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </details>

      {result.warnings.length > 0 ? (
        <div className="warnings">
          <strong>Важно</strong>
          {result.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </aside>
  )
}

export default ResultsPanel
