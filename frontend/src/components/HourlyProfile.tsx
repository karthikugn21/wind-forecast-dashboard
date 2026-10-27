// src/components/HourlyProfile.tsx
// Bar chart: average |error| (MAE) by hour-of-day

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { HourlyStats } from '../api/useWindData'

interface Props {
  data: HourlyStats[]
}

interface TooltipPayload {
  value: number
  dataKey: string
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string | number
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const h = typeof label === 'number' ? label : 0
  const mae = payload[0]?.value
  return (
    <div className="custom-tooltip">
      <div className="tooltip-time">{String(h).padStart(2, '0')}:00 – {String(h + 1).padStart(2, '0')}:00 UTC</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Avg |Error|</span>
        <span className="tooltip-val" style={{ color: 'var(--color-teal)' }}>
          {mae?.toLocaleString()} MW
        </span>
      </div>
    </div>
  )
}

export function HourlyProfile({ data }: Props) {
  // Colour bars from green (low error) to coral (high error)
  const maxMae = Math.max(...data.map(d => d.mae), 1)

  return (
    <div className="chart-container glass-card chart-sm">
      <div className="section-header" style={{ padding: '0 0 12px' }}>
        <span className="section-title">Error Profile by Hour-of-Day</span>
        <span className="section-pill">Avg |Error| by UTC hour</span>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hour"
            tickFormatter={(h: number) => `${String(h).padStart(2,'0')}h`}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v/1000).toFixed(1)}k`}
            width={34}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="mae" name="MAE" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => {
              const ratio = d.mae / maxMae
              // interpolate teal → amber → coral
              const r = Math.round(0 + ratio * 255)
              const g = Math.round(229 - ratio * 155)
              const b = Math.round(204 - ratio * 204)
              return <Cell key={i} fill={`rgb(${r},${g},${b})`} fillOpacity={0.85} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
