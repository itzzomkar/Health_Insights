import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './index.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check dark mode preference
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark')
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--primary-color)' }}>Loading...</div>
  }

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
          <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/dashboard/*" element={session ? <Dashboard /> : <Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
