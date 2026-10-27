// src/components/DailyTable.tsx
// Sortable table of per-day accuracy metrics

import { useState } from 'react'
import type { DailyStats } from '../api/useWindData'

interface Props {
  data: DailyStats[]
}

type SortKey = 'date' | 'mae' | 'rmse' | 'mape' | 'bias'

function getBadge(mape: number | null) {
  if (mape === null) return null
  if (mape < 10) return <span className="badge badge-green">Good</span>
  if (mape < 20) return <span className="badge badge-amber">Fair</span>
  return <span className="badge badge-coral">Poor</span>
}

export function DailyTable({ data }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 1 ? -1 : 1)
    } else {
      setSortKey(key)
      setSortDir(1)
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] ?? 0
    const bv = b[sortKey] ?? 0
    if (typeof av === 'string') return sortDir * av.localeCompare(bv as string)
    return sortDir * ((av as number) - (bv as number))
  })

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 1 ? ' ↑' : ' ↓') : ''

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {([
              ['date', 'Date'],
              ['mae', 'MAE (MW)'],
              ['rmse', 'RMSE (MW)'],
              ['mape', 'MAPE (%)'],
              ['bias', 'Bias (MW)'],
            ] as [SortKey, string][]).map(([key, label]) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                className={sortKey === key ? 'sorted' : ''}
              >
                {label}{arrow(key)}
              </th>
            ))}
            <th>Quality</th>
            <th style={{ textAlign: 'right' }}>Periods</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr key={row.date}>
              <td>{row.date}</td>
              <td>{row.mae.toLocaleString()}</td>
              <td>{row.rmse.toLocaleString()}</td>
              <td>{row.mape != null ? row.mape.toFixed(1) + '%' : '—'}</td>
              <td style={{ color: row.bias >= 0 ? 'var(--color-green)' : 'var(--color-coral)' }}>
                {row.bias >= 0 ? '+' : ''}{row.bias.toLocaleString()}
              </td>
              <td>{getBadge(row.mape)}</td>
              <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
