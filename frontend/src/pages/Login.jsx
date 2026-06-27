import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [activeView, setActiveView] = useState('home') // 'home', 'about', 'services'
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw', backgroundColor: 'transparent', transition: 'background-color 0.4s' }}>
      
      {/* Top Header Navigation */}
      <div className="login-header" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '1.25rem 4rem', 
        backgroundColor: 'transparent',
        borderBottom: '1px solid transparent',
      }}>
        {/* Left: Logo */}
        <div className="login-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HeartPulse size={20} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Health Insights
          </h2>
        </div>

        {/* Center: Navigation Links */}
        <div className="login-header-center" style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
          <button className={`nav-link ${activeView === 'home' ? 'active' : ''}`} onClick={() => setActiveView('home')}>
            Home
          </button>
          <button className={`nav-link ${activeView === 'about' ? 'active' : ''}`} onClick={() => setActiveView('about')}>
            About us
          </button>
          <button className={`nav-link ${activeView === 'services' ? 'active' : ''}`} onClick={() => setActiveView('services')}>
            Services
          </button>
        </div>

      </div>

      {/* Main Content: Split Screen Login */}
      <div className="login-split-container" style={{ display: 'flex', flex: 1 }}>
        {/* Left Column - Dynamic Content */}
        <div className="login-split-left" style={{ 
          flex: '0 0 45%', 
          backgroundColor: 'transparent', 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '4rem',
          borderRight: 'none',
          borderTopRightRadius: '32px',
          overflowY: 'auto'
        }}>
          {activeView === 'home' && (
            <div className="login-form-wrapper" style={{ maxWidth: '400px', width: '100%', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ color: 'var(--text-main)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--primary-color)' }}>Health</span>Insights
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Professional Medical Analysis</p>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  {isLogin ? 'Login to Your Account' : 'Create an Account'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Welcome back! Please enter your details.
                </p>
                {error && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
                    {error}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {!isLogin && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Full Name</label>
                    <input type="text" className="input-field styled-input" placeholder="Dr. John Doe" required style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)' }} />
                  </div>
                )}
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Email</label>
                  <input 
                    type="email" 
                    className="input-field styled-input" 
                    placeholder="Enter Your Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Password</label>
                  <input 
                    type="password" 
                    className="input-field styled-input" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-main)' }}
                  />
                </div>

                <button type="submit" disabled={loading} style={{ 
                  background: loading ? '#94a3b8' : 'var(--primary-color)', 
                  border: 'none', 
                  color: 'white', 
                  fontWeight: 700, 
                  fontSize: '0.95rem', 
                  padding: '0.8rem 2rem', 
                  borderRadius: '12px', 
                  cursor: loading ? 'default' : 'pointer', 
                  marginTop: '0.5rem',
                  transition: 'all 0.2s',
                }}>
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button 
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setIsLogin(!isLogin)}
                  >
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </div>
          )}

          {activeView === 'about' && (
            <div className="card shadow-soft" style={{ maxWidth: '500px', width: '100%', margin: '0 auto', animation: 'fadeIn 0.5s ease-out', borderRadius: '24px', padding: '3rem', border: '1px solid var(--border-color)' }}>
              <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
                <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  About <span style={{ color: 'var(--primary-color)' }}>Us</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Health Insights is a cutting-edge, AI-powered medical assistant built to revolutionize personal health management and make expert medical guidance universally accessible.
                </p>
              </div>
              <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 600 }}>Our Vision</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0, textAlign: 'justify' }}>
                  Our mission is to democratize healthcare intelligence. We built this platform to harness the power of <strong>Agentic AI</strong> (using advanced LLMs and secure tool integrations) to provide proactive, localized, and highly accurate health management tools to everyone.
                </p>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, textAlign: 'justify' }}>
                By orchestrating multiple specialized AI agents, Health Insights moves beyond a standard chatbot. It acts as a full-fledged health hub, from parsing complex clinical documents to finding real-world clinics via integrated mapping systems.
              </p>
              <button className="pill-btn" style={{ marginTop: '2rem', width: '100%' }} onClick={() => setActiveView('home')}>
                Back to Login
              </button>
            </div>
          )}

          {activeView === 'services' && (
            <div className="card shadow-soft" style={{ maxWidth: '500px', width: '100%', margin: '0 auto', animation: 'fadeIn 0.5s ease-out', borderRadius: '24px', padding: '3rem', border: '1px solid var(--border-color)' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Our <span style={{ color: 'var(--primary-color)' }}>Services</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  We leverage a Multi-Agent architecture to provide specialized healthcare tools:
                </p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', marginTop: '8px' }}></div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)', fontSize: '1rem' }}>AI Medical Analysis</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Upload lab reports and let our Analyst Agent parse and summarize the jargon into actionable insights.</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', marginTop: '8px' }}></div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)', fontSize: '1rem' }}>24/7 Chat & Dietitian</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Consult our Chat Agent for preliminary health guidance or ask the Dietitian Agent for custom nutrition plans.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', marginTop: '8px' }}></div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)', fontSize: '1rem' }}>Doctor & Clinic Locator</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Dynamically find hospitals near you using OpenStreetMap and Mapbox integrations.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6', marginTop: '8px' }}></div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)', fontSize: '1rem' }}>Care Schedule Hub</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Manage appointments and medication reminders with a synchronized real-time countdown system.</p>
                  </div>
                </div>
              </div>

              <button className="pill-btn" style={{ marginTop: '2rem', width: '100%' }} onClick={() => setActiveView('home')}>
                Start Now
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Illustration */}
        <div className="login-split-right" style={{ 
          flex: '1', 
          backgroundColor: 'transparent', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem',
          transition: 'background-color 0.4s'
        }}>
          <div key={activeView} style={{ maxWidth: '800px', width: '100%', animation: 'fadeIn 0.8s ease-out', mixBlendMode: 'multiply' }}>
            <img 
              src={
                activeView === 'about' ? "/assets/about_us_illustration.png" :
                activeView === 'services' ? "/assets/services_illustration.png" :
                "/assets/medical_illustration.png"
              } 
              alt="Medical Dashboard Illustration" 
              style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0 20px 40px rgba(236, 72, 153, 0.15))' }}
            />
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .nav-link {
          background: none;
          border: none;
          color: var(--text-main);
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          padding: 0.5rem;
          transition: color 0.2s;
        }
        .nav-link:hover, .nav-link.active {
          color: var(--primary-color);
        }

        .pill-btn {
          background: transparent;
          border: 2px solid var(--primary-color);
          color: var(--primary-color);
          font-weight: 700;
          font-size: 0.95rem;
          padding: 0.6rem 1.75rem;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pill-btn:hover {
          background: var(--primary-color);
          color: white;
        }
        
        .styled-input:focus {
          background-color: white !important;
          border-color: var(--primary-color) !important;
          outline: none;
          box-shadow: 0 0 0 4px rgba(12, 92, 206, 0.1);
        }
      `}</style>
    </div>
  )
}
