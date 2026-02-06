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

function getPreviousPeriodDates(range) {
  const now = new Date()

  switch (range) {
    case 'week': {
      const dayOfWeek = now.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const thisMonday = new Date(now)
      thisMonday.setDate(thisMonday.getDate() - daysToMonday)
      const prevMonday = new Date(thisMonday)
      prevMonday.setDate(prevMonday.getDate() - 7)
      const prevSunday = new Date(thisMonday)
      prevSunday.setDate(prevSunday.getDate() - 1)
      return {
        from: prevMonday.toISOString().split('T')[0],
        to: prevSunday.toISOString().split('T')[0]
      }
    }
    case 'month': {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        from: prevMonth.toISOString().split('T')[0],
        to: lastDayPrevMonth.toISOString().split('T')[0]
      }
    }
    case '90days': {
      const prevEnd = new Date(now)
      prevEnd.setDate(prevEnd.getDate() - 91)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - 89)
      return {
        from: prevStart.toISOString().split('T')[0],
        to: prevEnd.toISOString().split('T')[0]
      }
    }
    case 'year': {
      const prevYear = now.getFullYear() - 1
      return {
        from: `${prevYear}-01-01`,
        to: `${prevYear}-12-31`
      }
    }
    default:
      return null
  }
}

function App() {
  const [metrics, setMetrics] = useState([])
  const [totals, setTotals] = useState({})
  const [prevTotals, setPrevTotals] = useState({})
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

    // Fetch current period totals
    const currentPromises = metrics.map(metric =>
      fetch(`${API_BASE}/metrics/${metric.id}/total?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .then(res => res.json())
        .then(data => ({ id: metric.id, ...data }))
        .catch(() => ({ id: metric.id, value: null, count: 0 }))
    )

    // Fetch previous period totals if a range is selected
    const prevDates = selectedRange ? getPreviousPeriodDates(selectedRange) : null
    const prevPromises = prevDates
      ? metrics.map(metric =>
          fetch(`${API_BASE}/metrics/${metric.id}/total?dateFrom=${prevDates.from}&dateTo=${prevDates.to}`)
            .then(res => res.json())
            .then(data => ({ id: metric.id, ...data }))
            .catch(() => ({ id: metric.id, value: null, count: 0 }))
        )
      : []

    Promise.all([Promise.all(currentPromises), Promise.all(prevPromises)])
      .then(([currentResults, prevResults]) => {
        const totalsMap = {}
        currentResults.forEach(r => { totalsMap[r.id] = r })
        setTotals(totalsMap)

        const prevTotalsMap = {}
        prevResults.forEach(r => { prevTotalsMap[r.id] = r })
        setPrevTotals(prevTotalsMap)

        setLoading(false)
      })
  }, [metrics, dateFrom, dateTo, selectedRange])

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
            const prev = prevTotals[metric.id]
            const displayValue = total?.value !== null ? total?.value : '-'
            const label = metric.type === 'checkin' ? 'avg' : metric.unit

            // Calculate trend
            let trend = null
            if (total?.value != null && prev?.value != null && prev.value !== 0) {
              const diff = total.value - prev.value
              trend = { diff, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same' }
            } else if (total?.value != null && prev?.value === 0 && total.value > 0) {
              trend = { diff: total.value, direction: 'up' }
            }

            return (
              <div key={metric.id} className="metric-card">
                <div className="metric-icon">{metric.icon}</div>
                <div className="metric-value">{displayValue}</div>
                {trend && (
                  <div className={`metric-trend trend-${trend.direction}`}>
                    {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
                    {' '}
                    {Math.abs(trend.diff).toFixed(metric.type === 'checkin' ? 1 : 0)}
                  </div>
                )}
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
