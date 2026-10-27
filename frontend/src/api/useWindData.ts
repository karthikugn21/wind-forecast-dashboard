// src/api/useWindData.ts
// React Query hooks for the three WindSight API endpoints

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

export interface ActualRecord {
  startTime: string
  settlementPeriod: number
  generation: number
}

export interface ForecastRecord {
  startTime: string
  publishTime: string
  generation: number
  gateClosure: string
}

export interface AccuracyPair {
  startTime: string
  actual: number
  forecast: number
  error: number
  absError: number
  pctError: number | null
  publishTime: string
  gateClosure: string
}

export interface DailyStats {
  date: string
  mae: number
  rmse: number
  bias: number
  mape: number | null
  count: number
}

export interface HourlyStats {
  hour: number
  mae: number
  rmse: number
  bias: number
  mape: number | null
  count: number
}

export interface OverallStats {
  mae: number
  rmse: number
  bias: number
  mape: number | null
  count: number
}

export interface AccuracyData {
  overall: OverallStats | null
  daily: DailyStats[]
  hourly: HourlyStats[]
  matched_count: number
  total_actuals: number
  total_forecasts: number
  pairs: AccuracyPair[]
}

export function useActuals() {
  return useQuery<{ count: number; data: ActualRecord[] }>({
    queryKey: ['actuals'],
    queryFn: () => axios.get(`${API_BASE}/api/actuals`).then(r => r.data),
  })
}

export function useForecasts() {
  return useQuery<{ count: number; data: ForecastRecord[] }>({
    queryKey: ['forecasts'],
    queryFn: () => axios.get(`${API_BASE}/api/forecasts`).then(r => r.data),
  })
}

export function useAccuracy() {
  return useQuery<AccuracyData>({
    queryKey: ['accuracy'],
    queryFn: () => axios.get(`${API_BASE}/api/accuracy`).then(r => r.data),
  })
}
