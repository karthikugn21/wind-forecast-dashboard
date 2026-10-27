// src/pages/Dashboard.tsx
import { motion } from 'framer-motion'
import { useAccuracy } from '../api/useWindData'
import { KPICard } from '../components/KPICard'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import { ErrorChart } from '../components/ErrorChart'
import { HourlyProfile } from '../components/HourlyProfile'
import { DailyTable } from '../components/DailyTable'

function LoadingState() {
  return (
    <div className="state-container">
      <div className="spinner" />
      <div className="state-title">Fetching Elexon BMRS data…</div>
      <div className="state-desc">
        Loading January 2026 wind actuals and day-ahead forecasts.
        This may take 10–20 seconds on first load.
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="state-container">
      <div className="error-icon">⚠️</div>
      <div className="state-title">Failed to load data</div>
      <div className="state-desc">{message}</div>
    </div>
  )
}

export function Dashboard() {
  const { data, isLoading, error } = useAccuracy()

  const headerAnim = { initial: { opacity: 0, y: -16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } }

  return (
    <div className="app-layout">
      {/* ── Header ── */}
      <motion.header className="header" {...headerAnim}>
        <div className="header-logo">
          <div className="header-logo-icon">💨</div>
          <div>
            <div className="header-title">WindSight</div>
            <div className="header-subtitle">UK Wind Forecast Accuracy · Day-Ahead Procurement</div>
          </div>
        </div>
        <div className="header-badge">
          <div className="header-badge-dot" />
          January 2026 · Elexon BMRS
        </div>
      </motion.header>

      {/* ── Loading / Error ── */}
      {isLoading && <LoadingState />}
      {error && <ErrorState message={String(error)} />}

      {/* ── Main content ── */}
      {data && data.overall && (
        <>
          {/* ── Insight Banner ── */}
          <motion.div
            className="insight-banner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Across <strong>{data.matched_count.toLocaleString()} settlement periods</strong> in January 2026,
            the day-ahead WINDFOR forecast deviated from actual FUELHH wind generation by an average of{' '}
            <strong>{data.overall.mae.toLocaleString()} MW (MAE)</strong> and{' '}
            <strong>{data.overall.rmse.toLocaleString()} MW (RMSE)</strong>.
            {data.overall.bias > 0
              ? ` The forecast systematically under-estimated actual generation by ${data.overall.bias.toLocaleString()} MW on average (positive bias).`
              : ` The forecast systematically over-estimated actual generation by ${Math.abs(data.overall.bias).toLocaleString()} MW on average (negative bias).`}
          </motion.div>

          {/* ── KPI Strip ── */}
          <section className="kpi-strip">
            <KPICard
              label="Mean Absolute Error"
              value={data.overall.mae.toLocaleString()}
              unit="MW"
              description="Average magnitude of forecast error"
              icon="📉"
              color="var(--color-coral)"
            />
            <KPICard
              label="Root Mean Sq. Error"
              value={data.overall.rmse.toLocaleString()}
              unit="MW"
              description="Penalises large errors more heavily"
              icon="📊"
              color="var(--color-amber)"
            />
            <KPICard
              label="MAPE"
              value={data.overall.mape != null ? data.overall.mape.toFixed(1) : '—'}
              unit="%"
              description="Mean absolute % error"
              icon="🎯"
              color="var(--color-violet)"
            />
            <KPICard
              label="Forecast Bias"
              value={(data.overall.bias > 0 ? '+' : '') + data.overall.bias.toLocaleString()}
              unit="MW"
              description={data.overall.bias > 0 ? 'Under-forecasting on avg' : 'Over-forecasting on avg'}
              icon={data.overall.bias > 0 ? '📈' : '📉'}
              color={data.overall.bias > 0 ? 'var(--color-green)' : 'var(--color-coral)'}
            />
          </section>

          {/* ── Time Series Chart ── */}
          <section className="section">
            <TimeSeriesChart pairs={data.pairs} step={2} />
          </section>

          {/* ── Error Chart + Hourly Profile ── */}
          <section className="charts-grid">
            <ErrorChart pairs={data.pairs} step={2} />
            <HourlyProfile data={data.hourly} />
          </section>

          {/* ── Daily Accuracy Table ── */}
          <section className="section glass-card">
            <div className="section-header" style={{ padding: '20px 24px 0' }}>
              <span className="section-title">Daily Accuracy Breakdown</span>
              <span className="section-pill">Click column headers to sort</span>
            </div>
            <DailyTable data={data.daily} />
          </section>
        </>
      )}
    </div>
  )
}
