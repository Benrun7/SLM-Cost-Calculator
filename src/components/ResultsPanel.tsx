import type { CalculationResult } from '../domain/types'

type ResultsPanelProps = {
  result: CalculationResult
}

const formatNumber = (value: number, maximumFractionDigits = 2) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(value)

const formatRub = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)

const ResultCard = ({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) => (
  <article className="result-card">
    <span>{label}</span>
    <strong>{value}</strong>
    {note ? <small>{note}</small> : null}
  </article>
)

const ResultsPanel = ({ result }: ResultsPanelProps) => (
  <aside className="results-panel">
    <div className="panel-heading">
      <span>Итог</span>
      <strong>{formatRub(result.totalCostRub)}</strong>
    </div>

    <div className="result-grid">
      <ResultCard
        label="Затраты порошка"
        value={formatRub(result.powderCostRub)}
        note={`${formatNumber(result.chargeablePowderMassKg, 3)} кг к списанию`}
      />
      <ResultCard
        label="Масса деталей"
        value={`${formatNumber(result.partsMassKg, 3)} кг`}
        note={`${formatNumber(result.fusedVolumeCm3, 1)} см3 вместе с поддержками`}
      />
      <ResultCard
        label="Масса поддержек"
        value={`${formatNumber(result.supportMassKg, 3)} кг`}
        note={`${formatNumber(result.supportVolumeCm3, 1)} см3 поддержек`}
      />
      <ResultCard label="Инертный газ" value={formatRub(result.gasCostRub)} />
      <ResultCard label="Ресурс фильтра" value={formatRub(result.filterCostRub)} />
      <ResultCard label="ФОТ" value={formatRub(result.laborCostRub)} />
      <ResultCard label="Расходники" value={formatRub(result.consumablesCostRub)} />
      <ResultCard
        label="Время печати"
        value={`${formatNumber(result.printTimeHours, 1)} ч`}
        note={`${formatNumber(result.layerTimeSec, 1)} сек/слой`}
      />
      <ResultCard
        label="Срок проекта"
        value={`${formatNumber(result.totalProjectHours, 1)} ч`}
        note={`${result.workShifts8h} смен по 8 часов`}
      />
    </div>

    <dl className="details">
      <div>
        <dt>Количество слоёв</dt>
        <dd>{formatNumber(result.layerCount, 0)}</dd>
      </div>
      <div>
        <dt>Приблизительный периметр слоя</dt>
        <dd>{formatNumber(result.approximatePerimeterMm)} мм</dd>
      </div>
      <div>
        <dt>Расчётное количество треков</dt>
        <dd>{formatNumber(result.trackCount, 0)}</dd>
      </div>
      <div>
        <dt>Длина штриховки слоя</dt>
        <dd>{formatNumber(result.hatchLengthMm, 0)} мм</dd>
      </div>
      <div>
        <dt>Штриховка слоя</dt>
        <dd>{formatNumber(result.hatchTimeSec)} сек</dd>
      </div>
      <div>
        <dt>Контуры слоя</dt>
        <dd>{formatNumber(result.contourTimeSec)} сек</dd>
      </div>
      <div>
        <dt>Сплавленный металл</dt>
        <dd>{formatNumber(result.fusedMassKg, 3)} кг</dd>
      </div>
      <div>
        <dt>Резерв порошка к списанию</dt>
        <dd>{formatNumber(result.powderReserveKg, 3)} кг</dd>
      </div>
      <div>
        <dt>Требуется порошка в камере</dt>
        <dd>{formatNumber(result.requiredPowderMassKg, 3)} кг</dd>
      </div>
      <div>
        <dt>Несплавленный порошок</dt>
        <dd>{formatNumber(result.unfusedPowderMassKg, 3)} кг</dd>
      </div>
      <div>
        <dt>Рабочий объём засыпки</dt>
        <dd>{formatNumber(result.buildVolumeCm3, 1)} см3</dd>
      </div>
      <div>
        <dt>Трудозатраты</dt>
        <dd>{formatNumber(result.laborHours, 1)} ч</dd>
      </div>
      <div>
        <dt>Обработка платформы</dt>
        <dd>{formatRub(result.platformProcessingRub)}</dd>
      </div>
    </dl>

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

export default ResultsPanel
