// src/components/TimeSeriesChart.tsx
// Actual vs. Forecast line chart for wind generation (Jan 2026)


import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { AccuracyPair } from '../api/useWindData'

interface Props {
  pairs: AccuracyPair[]
  /** subsample step — show every Nth point to keep chart responsive */
  step?: number
}

interface TooltipPayload {
  color: string
  name: string
  value: number
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="custom-tooltip">
      <div className="tooltip-time">{format(parseISO(label), 'd MMM HH:mm')}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tooltip-row">
          <span className="tooltip-label" style={{ color: p.color }}>{p.name}</span>
          <span className="tooltip-val" style={{ color: p.color }}>
            {p.value.toLocaleString()} MW
          </span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="tooltip-row" style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 }}>
          <span className="tooltip-label">Error</span>
          <span
            className="tooltip-val"
            style={{ color: (payload[0].value - payload[1].value) < 0 ? 'var(--color-coral)' : 'var(--color-green)' }}
          >
            {(payload[0].value - payload[1].value).toLocaleString()} MW
          </span>
        </div>
      )}
    </div>
  )
}

export function TimeSeriesChart({ pairs, step = 4 }: Props) {
  // Subsample for performance (every `step` records)
  const data = pairs
    .filter((_, i) => i % step === 0)
    .map(p => ({
      startTime: p.startTime,
      actual: p.actual,
      forecast: p.forecast,
    }))

  return (
    <div className="chart-container glass-card">
      <div className="section-header" style={{ padding: '0 0 12px' }}>
        <span className="section-title">Actual vs. Forecast — Wind Generation</span>
        <span className="section-pill">Jan 2026 · 30-min resolution</span>
      </div>
      <div className="legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--color-amber)' }} />
          Actual (FUELHH)
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--color-violet)' }} />
          Day-Ahead Forecast (WINDFOR)
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <XAxis
            dataKey="startTime"
            tickFormatter={(v: string) => format(parseISO(v), 'd MMM')}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={Math.floor(data.length / 8)}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke="var(--color-amber)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="var(--color-violet)"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
