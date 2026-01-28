import { useState, useEffect } from 'react'
import './App.css'

const API_BASE = 'https://goal-tracker-zeta-five.vercel.app/api'

const DATE_RANGES = {
  week: 'This Week',
  month: 'This Month',
  '90days': 'Last 90 Days',
  year: 'This Year',
  all: 'All Time',
}

function getDateRange(range) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  let from

  switch (range) {
    case 'week': {
      const dayOfWeek = now.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const monday = new Date(now)
      monday.setDate(monday.getDate() - daysToMonday)
      from = monday.toISOString().split('T')[0]
      break
    }
    case 'month':
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      break
    case '90days': {
      const past = new Date(now)
      past.setDate(past.getDate() - 90)
      from = past.toISOString().split('T')[0]
      break
    }
    case 'year':
      from = `${now.getFullYear()}-01-01`
      break
    case 'all':
      from = '2000-01-01'
      break
    default:
      from = today
  }

  return { from, to: today }
}

function App() {
  const [metrics, setMetrics] = useState([])
  const [totals, setTotals] = useState({})
  const [selectedRange, setSelectedRange] = useState('week')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)

  // Update dates when range changes
  useEffect(() => {
    const { from, to } = getDateRange(selectedRange)
    setDateFrom(from)
    setDateTo(to)
  }, [selectedRange])

  // Fetch metrics on mount
  useEffect(() => {
    fetch(`${API_BASE}/metrics`)
      .then(res => res.json())
      .then(data => setMetrics(data.metrics || []))
      .catch(err => console.error('Failed to fetch metrics:', err))
  }, [])

  // Fetch totals when metrics or dates change
  useEffect(() => {
    if (!metrics.length || !dateFrom || !dateTo) return

    setLoading(true)

    Promise.all(
      metrics.map(metric =>
        fetch(`${API_BASE}/metrics/${metric.id}/total?dateFrom=${dateFrom}&dateTo=${dateTo}`)
          .then(res => res.json())
          .then(data => ({ id: metric.id, ...data }))
          .catch(() => ({ id: metric.id, value: null, count: 0 }))
      )
    ).then(results => {
      const totalsMap = {}
      results.forEach(r => { totalsMap[r.id] = r })
      setTotals(totalsMap)
      setLoading(false)
    })
  }, [metrics, dateFrom, dateTo])

  return (
    <div className="app">
      <header>
        <h1>Metrics</h1>
        <div className="date-controls">
          <div className="range-buttons">
            {Object.entries(DATE_RANGES).map(([key, label]) => (
              <button
                key={key}
                className={selectedRange === key ? 'active' : ''}
                onClick={() => setSelectedRange(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="date-range">
            <input
              type="date"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value)
                setSelectedRange(null)
              }}
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value)
                setSelectedRange(null)
              }}
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="metrics-grid">
          {metrics.map(metric => {
            const total = totals[metric.id]
            const displayValue = total?.value !== null ? total?.value : '-'
            const label = metric.type === 'checkin' ? 'avg' : metric.unit

            return (
              <div key={metric.id} className="metric-card">
                <div className="metric-icon">{metric.icon}</div>
                <div className="metric-value">{displayValue}</div>
                <div className="metric-label">{label}</div>
                <div className="metric-title">{metric.title}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default App
