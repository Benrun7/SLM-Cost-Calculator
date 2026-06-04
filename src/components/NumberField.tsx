type NumberFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  hint?: string
  slider?: boolean
  className?: string
  fractionDigits?: number
}

const NumberField = ({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit,
  hint,
  slider = false,
  className,
  fractionDigits,
}: NumberFieldProps) => {
  const inputValue = Number.isFinite(value)
    ? value.toFixed(fractionDigits ?? (step % 1 === 0 ? 0 : 2))
    : '0'

  const handleChange = (rawValue: string) => {
    const parsed = Number(rawValue)
    onChange(Number.isFinite(parsed) ? parsed : 0)
  }

  return (
    <label className={className ? `field ${className}` : 'field'}>
      <span>
        {label}
        {unit ? <small className="field-unit">{unit}</small> : null}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={inputValue}
        onChange={(event) => handleChange(event.target.value)}
      />
      {slider && max !== undefined ? (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
        />
      ) : null}
      {hint ? <em>{hint}</em> : null}
    </label>
  )
}

export default NumberField
