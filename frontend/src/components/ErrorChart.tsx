// src/components/ErrorChart.tsx
// Absolute error over time (area chart) + signed error line

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { AccuracyPair } from '../api/useWindData'

interface Props {
  pairs: AccuracyPair[]
  step?: number
}

interface TooltipPayload {
  color: string
  name: string
  value: number
  dataKey: string
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="custom-tooltip">
      <div className="tooltip-time">{format(parseISO(label), 'd MMM HH:mm')}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tooltip-row">
          <span className="tooltip-label" style={{ color: p.color }}>{p.name}</span>
          <span className="tooltip-val" style={{ color: p.color }}>{p.value.toLocaleString()} MW</span>
        </div>
      ))}
    </div>
  )
}

export function ErrorChart({ pairs, step = 4 }: Props) {
  const data = pairs
    .filter((_, i) => i % step === 0)
    .map(p => ({
      startTime: p.startTime,
      absError: p.absError,
      error: p.error,
    }))

  return (
    <div className="chart-container glass-card">
      <div className="section-header" style={{ padding: '0 0 12px' }}>
        <span className="section-title">Forecast Error Over Time</span>
        <span className="section-pill">Actual − Forecast</span>
      </div>
      <div className="legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--color-coral)', opacity: 0.5 }} />
          |Error| (MW)
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--color-teal)' }} />
          Signed Error (MW)
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-coral)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--color-coral)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
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
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
          <Area
            type="monotone"
            dataKey="absError"
            name="|Error|"
            stroke="var(--color-coral)"
            strokeWidth={1}
            fill="url(#errGrad)"
          />
          <Line
            type="monotone"
            dataKey="error"
            name="Signed Error"
            stroke="var(--color-teal)"
            strokeWidth={1.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
