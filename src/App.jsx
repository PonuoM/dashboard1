import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Login from './Login'

function Home({ user, onLogout }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('./api/get_data.php')
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching data:', error)
        setLoading(false)
      })
  }, [])

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard Users</h1>
        {user && (
          <div>
            <span>Welcome, {user.username} </span>
            <button onClick={onLogout} style={{ marginLeft: '10px' }}>Logout</button>
          </div>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="user-list">
          {data.length > 0 ? (
            <ul>
              {data.map((user, index) => (
                <li key={index}>
                  <strong>ID:</strong> {user.id || index} |
                  <strong> Name:</strong> {user.name || 'N/A'}
                </li>
              ))}
            </ul>
          ) : (
            <p>No users found or connection failed.</p>
          )}
        </div>
      )}
      <p style={{ marginTop: '20px', fontSize: '0.8em', color: '#666' }}>
        Data fetched from <code>./api/get_data.php</code>
      </p>
    </div>
  )
}

function App() {
  // Simple check for localStorage, ideally verify token
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={user ? <Home user={user} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/login"
          element={user ? <Home user={user} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />}
        />
      </Routes>
    </HashRouter>
  )
}

export default App
