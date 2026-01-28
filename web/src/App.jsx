import { useState, useEffect } from 'react'
import './App.css'

const API_BASE = 'https://goal-tracker-zeta-five.vercel.app/api'

function App() {
  const [metrics, setMetrics] = useState([])
  const [selectedMetric, setSelectedMetric] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Set default dates (current week)
  useEffect(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(now)
    monday.setDate(monday.getDate() - daysToMonday)

    setDateFrom(monday.toISOString().split('T')[0])
    setDateTo(now.toISOString().split('T')[0])
  }, [])

  // Fetch available metrics on mount
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`${API_BASE}/metrics`)
        const data = await response.json()
        setMetrics(data.metrics || [])
        if (data.metrics?.length > 0) {
          setSelectedMetric(data.metrics[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch metrics:', err)
        setError('Failed to load metrics')
      }
    }
    fetchMetrics()
  }, [])

  const fetchTotal = async () => {
    if (!selectedMetric || !dateFrom || !dateTo) {
      setError('Please select a metric and date range')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(
        `${API_BASE}/metrics/${selectedMetric}/total?dateFrom=${dateFrom}&dateTo=${dateTo}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch total')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      console.error('Failed to fetch total:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <h1>Metrics Dashboard</h1>

      <div className="controls">
        <div className="field">
          <label htmlFor="metric">Metric</label>
          <select
            id="metric"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            {metrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.icon} {metric.title}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="dateFrom">From</label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="dateTo">To</label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <button onClick={fetchTotal} disabled={loading}>
          {loading ? 'Loading...' : 'Get Total'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result">
          <h2>{result.title}</h2>
          <div className="result-grid">
            <div className="result-item">
              <span className="label">Type</span>
              <span className="value">{result.type}</span>
            </div>
            <div className="result-item">
              <span className="label">{result.type === 'checkin' ? 'Average' : 'Total'}</span>
              <span className="value highlight">
                {result.value !== null ? result.value : '-'}
              </span>
            </div>
            <div className="result-item">
              <span className="label">Entries</span>
              <span className="value">{result.count}</span>
            </div>
            <div className="result-item">
              <span className="label">Period</span>
              <span className="value">
                {new Date(result.dateFrom).toLocaleDateString()} - {new Date(result.dateTo).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
