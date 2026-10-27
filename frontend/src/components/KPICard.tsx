// src/components/KPICard.tsx
import { motion } from 'framer-motion'

interface KPICardProps {
  label: string
  value: string | number
  unit?: string
  description?: string
  icon: string
  color: string
}

export function KPICard({ label, value, unit, description, icon, color }: KPICardProps) {
  return (
    <motion.div
      className="glass-card kpi-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {description && <div className="kpi-desc">{description}</div>}
      <div className="kpi-icon">{icon}</div>
    </motion.div>
  )
}
