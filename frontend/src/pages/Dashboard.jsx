import React, { useState, useRef, useEffect } from 'react'
import { Activity, Plus, Upload, Send, MessageSquare, Stethoscope, Apple, HeartPulse, User, FileText, Clock, Moon, Sun, Mic, Droplet, Coffee, MapPin, CalendarDays, Bell, ChevronLeft } from 'lucide-react'
import { supabase } from '../supabaseClient'
import ReactMarkdown from 'react-markdown'
import DoctorLocator from '../components/DoctorLocator'
import CareSchedule from '../components/CareSchedule'

export default function Dashboard() {
  const [activeFeature, setActiveFeature] = useState('home') // 'home', 'analysis', 'diet', 'chat', 'history', 'locator', 'schedule'
  const [initialClinicForSchedule, setInitialClinicForSchedule] = useState(null)
  const [reportText, setReportText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  
  const fileInputRef = useRef(null)
  const resultsRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  
  // Patient details for Analysis
  const [patientName, setPatientName] = useState('')
  const [patientAge, setPatientAge] = useState('')

  // Multi-Agent Tab State
  const [activeAgentTab, setActiveAgentTab] = useState('diagnosis')

  // Profile and Notifications State
  const [currentUser, setCurrentUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  const formatTimeAMPM = (time24) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    const hours = parseInt(h, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${m} ${suffix}`;
  };

  const fetchUserAndNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUser(user)
      if (user.user_metadata) {
        const apps = (user.user_metadata.appointments || []).map(a => ({ ...a, type: 'Checkup' }))
        const rems = (user.user_metadata.reminders || []).map(r => ({ ...r, type: 'Medication' }))
        const allItems = [...apps, ...rems].filter(item => !item.completed)
        const now = new Date()
        
        const notifs = allItems.map(item => {
          const target = new Date(`${item.date}T${item.time}`)
          const diffMs = target - now
          let status = ''
          
          if (diffMs < 0) {
            if (diffMs > -3600000) status = 'Just now'
            else status = 'Past due'
          } else {
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMins / 60)
            if (diffHours < 24) {
              if (diffHours > 0) status = `In ${diffHours} hr ${diffMins % 60} min`
              else status = `In ${diffMins} min`
            }
          }
          return status ? { ...item, status } : null
        }).filter(Boolean).sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
        
        setNotifications(notifs)
      }
    }
  }

  useEffect(() => {
    fetchUserAndNotifications()
    const interval = setInterval(fetchUserAndNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  // History State
  const [historyLogs, setHistoryLogs] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState(null)

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => document.body.classList.contains('dark'))

  // Chat Agent State
  const [chatMessages, setChatMessages] = useState([
    { role: 'agent', text: 'Hello! I am your AI Medical Assistant. How can I help you understand your health today?' }
  ])
  const [currentMessage, setCurrentMessage] = useState('')
  const [chatContext, setChatContext] = useState(null)
  
  // Voice Recognition State
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  const toggleTheme = () => {
    if (isDarkMode) {
      document.body.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDarkMode(false)
    } else {
      document.body.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDarkMode(true)
    }
  }

  useEffect(() => {
    if (activeFeature === 'history') {
      fetchHistory()
    }
  }, [activeFeature])

  // Track activeFeature in a ref for speech recognition closure
  const activeFeatureRef = useRef(activeFeature)
  useEffect(() => {
    activeFeatureRef.current = activeFeature
  }, [activeFeature])

  // Initialize Speech Recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          } else {
            interimTranscript += event.results[i][0].transcript
          }
        }
        
        if (activeFeatureRef.current === 'analysis') {
          if (finalTranscript) {
            setReportText((prev) => prev.replace(recognitionRef.current.lastInterim || '', '') + finalTranscript + ' ')
            recognitionRef.current.lastInterim = ''
          } else if (interimTranscript) {
            setReportText((prev) => prev.replace(recognitionRef.current.lastInterim || '', '') + interimTranscript)
            recognitionRef.current.lastInterim = interimTranscript
          }
        } else {
          if (finalTranscript) {
            setCurrentMessage((prev) => prev.replace(recognitionRef.current.lastInterim || '', '') + finalTranscript + ' ')
            recognitionRef.current.lastInterim = ''
          } else if (interimTranscript) {
            setCurrentMessage((prev) => prev.replace(recognitionRef.current.lastInterim || '', '') + interimTranscript)
            recognitionRef.current.lastInterim = interimTranscript
          }
        }
      }

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

  // Auto-scroll to results
  useEffect(() => {
    if (analysisResult && !isAnalyzing && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [analysisResult, isAnalyzing])

  const fetchHistory = async () => {
    setIsLoadingHistory(true)
    setHistoryError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from('history_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setHistoryLogs(data || [])
    } catch (err) {
      setHistoryError(err.message)
      console.error("Error fetching history:", err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!currentMessage.trim()) return

    const userText = currentMessage
    const newMessages = [...chatMessages, { role: 'user', text: userText }]
    setChatMessages(newMessages)
    setCurrentMessage('')

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          context: chatContext
        })
      })

      if (!response.ok) throw new Error("Failed to connect to Chat AI")

      const data = await response.json()
      const reply = data.reply

      setChatMessages(prev => [...prev, { role: 'agent', text: reply }])

      // Log Chat Session to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('history_logs').insert([{
            user_id: user.id,
            log_type: 'chat',
            patient_name: 'Chat Session',
            summary: `Topic: ${userText.substring(0, 30)}...`,
            content: { messages: [...newMessages, { role: 'agent', text: reply }] }
          }])
        }
      } catch (err) { console.error("Error saving chat log:", err) }

    } catch (error) {
      console.error(error)
      setChatMessages(prev => [...prev, { role: 'agent', text: "Error connecting to AI backend. Please ensure the backend server is running." }])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }
  
  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!reportText.trim() && !selectedFile) return
    setIsAnalyzing(true)
    setAnalysisResult(null)
    
    try {
      let symptomsToAnalyze = reportText;

      // If a file is uploaded, parse it through the backend
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const uploadResponse = await fetch(`${apiUrl}/api/upload/`, {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) throw new Error("Failed to parse document");
        
        const uploadData = await uploadResponse.json();
        symptomsToAnalyze = (reportText ? reportText + "\n\n" : "") + uploadData.extracted_text;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiUrl}/api/analysis/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: symptomsToAnalyze || "No symptoms provided.",
          patient_name: patientName || "Unknown Patient",
          patient_age: patientAge ? parseInt(patientAge) : 30
        })
      })
      
      if (!response.ok) throw new Error("Analysis failed")
      
      const data = await response.json()
      setAnalysisResult(data)

      // Log Analysis to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('history_logs').insert([{
            user_id: user.id,
            log_type: 'analysis',
            patient_name: patientName || 'Unknown Patient',
            summary: `Diagnosis: ${data.diagnosis.diagnosis}`,
            content: { result: data }
          }])
        }
      } catch (err) { console.error("Error saving analysis log:", err) }
      
    } catch (err) {
      console.error(err)
      setAnalysisResult({ error: "Failed to connect to backend AI orchestrator." })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDiscussAnalysis = () => {
    if (!analysisResult) return;
    const ctx = `Patient: ${patientName || 'Unknown'}, Age: ${patientAge || 30}\nDiagnosis: ${analysisResult.diagnosis?.diagnosis} (Confidence: ${analysisResult.diagnosis?.confidence}%)\nRisk: ${analysisResult.risk?.risk}\nNutrition Advice: ${analysisResult.nutrition?.primary_focus}`;
    setChatContext(ctx);
    
    // Add initial system intro
    setChatMessages([
      { role: 'agent', text: `Hello! I have reviewed the recent Multi-Agent Analysis for ${patientName || 'the patient'}, which indicated a primary diagnosis of **${analysisResult.diagnosis?.diagnosis}**. What specific questions do you have about this diagnosis, the risk assessment, or the recommended recovery plan?` }
    ])
    setActiveFeature('chat')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleViewLog = (log) => {
    if (log.log_type === 'analysis') {
      setAnalysisResult(log.content.result)
      setPatientName(log.patient_name)
      setActiveFeature('analysis')
    } else if (log.log_type === 'chat') {
      setChatMessages(log.content.messages)
      setActiveFeature('chat')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'transparent' }}>
      
      {/* Top Header Navigation (Like Reference Image) */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '1.25rem 4rem', 
        backgroundColor: 'transparent',
        borderBottom: '1px solid transparent', 
        position: 'relative'
      }}>
        
        {/* Left: Brand / Logo */}
        <div onClick={() => setActiveFeature('home')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem' }}>
          <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HeartPulse size={20} strokeWidth={2.5} />
          </div>
          <h2 className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Health Insights
          </h2>
        </div>

        {/* Center: Navigation Links */}
        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <button className={`nav-link ${activeFeature === 'analysis' ? 'active' : ''}`} onClick={() => setActiveFeature('analysis')}>
            Analysis
          </button>
          <button className={`nav-link ${activeFeature === 'diet' ? 'active' : ''}`} onClick={() => setActiveFeature('diet')}>
            Dietitian
          </button>
          <button className={`nav-link ${activeFeature === 'chat' ? 'active' : ''}`} onClick={() => setActiveFeature('chat')}>
            Chat Agent
          </button>
          <button className={`nav-link ${activeFeature === 'history' ? 'active' : ''}`} onClick={() => setActiveFeature('history')}>
            History
          </button>
          <button className={`nav-link ${activeFeature === 'locator' ? 'active' : ''}`} onClick={() => setActiveFeature('locator')}>
            Find Doctor
          </button>
          <button className={`nav-link ${activeFeature === 'schedule' ? 'active' : ''}`} onClick={() => { setActiveFeature('schedule'); setInitialClinicForSchedule(null); }}>
            Care Schedule
          </button>
        </div>

        {/* Right: Notifications, Profile, Theme Toggle, & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }}>
          
          {/* Notifications Bell */}
          <div>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', position: 'relative' }}>
              <Bell size={20} color="var(--text-main)" />
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', width: '10px', height: '10px', borderRadius: '50%', border: '2px solid white' }}></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div style={{ position: 'absolute', top: 'calc(100% + 15px)', right: '120px', width: '320px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', zIndex: 100, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeIn 0.2s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>Notifications</h4>
                  <span style={{ fontSize: '0.7rem', backgroundColor: '#fce7f3', color: 'var(--primary-color)', padding: '0.2rem 0.5rem', borderRadius: 'full', fontWeight: 600 }}>{notifications.length} upcoming</span>
                </div>
                {notifications.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No upcoming reminders.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.map((n, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{n.title}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: n.status === 'Past due' ? '#ef4444' : 'var(--primary-color)', backgroundColor: n.status === 'Past due' ? '#fef2f2' : '#fce7f3', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{n.status}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={10} /> {formatTimeAMPM(n.time)} - {n.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile */}
          {currentUser && (
            <div 
              onClick={() => setActiveFeature('profile')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.25rem', cursor: 'pointer' }}
              className="hover-lift">
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem' }}>
                {currentUser.user_metadata?.full_name ? currentUser.user_metadata.full_name.charAt(0).toUpperCase() : currentUser.email.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>{currentUser.user_metadata?.full_name || 'User'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser.email}</span>
              </div>
            </div>
          )}

          <button className="pill-btn pill-btn-danger" style={{ marginLeft: '0.5rem' }} onClick={handleSignOut}>
            Sign Out
          </button>
        </div>

      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 2rem' }}>
        <div style={{ maxWidth: activeFeature === 'locator' ? '1600px' : ((activeFeature === 'analysis' || activeFeature === 'diet' || activeFeature === 'schedule') && analysisResult && !isAnalyzing ? '1400px' : '900px'), margin: '0 auto', transition: 'max-width 0.4s ease-out', width: '100%' }}>
          
          {/* VIEW: HOME / ABOUT US */}
          {activeFeature === 'home' && (
            <div style={{ animation: 'fadeIn 0.5s ease-out', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', textAlign: 'center' }}>
              <div style={{ backgroundColor: 'var(--primary-color)', padding: '1.25rem', borderRadius: '24px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', boxShadow: '0 10px 25px rgba(236, 72, 153, 0.3)' }}>
                <HeartPulse size={48} strokeWidth={2.5} />
              </div>
              <h1 className="gradient-text" style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: '1.25rem', lineHeight: 1.1 }}>
                Welcome to Health Insights
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '650px', marginBottom: '3.5rem', lineHeight: 1.6 }}>
                Your AI-powered medical assistant. We combine state-of-the-art multi-agent AI to provide instant diagnoses, personalized dietary plans, and 24/7 medical chat support.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', maxWidth: '800px', width: '100%', marginBottom: '4rem' }}>
                
                <div onClick={() => setActiveFeature('analysis')} className="card shadow-soft hover-lift" style={{ padding: '2rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                    <Stethoscope color="var(--primary-color)" size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Medical Analysis</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>Upload reports for AI diagnosis.</p>
                </div>

                <div onClick={() => setActiveFeature('diet')} className="card shadow-soft hover-lift" style={{ padding: '2rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                    <Apple color="var(--primary-color)" size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Dietitian Plan</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>Get personalized nutritional goals.</p>
                </div>

                <div onClick={() => setActiveFeature('chat')} className="card shadow-soft hover-lift" style={{ padding: '2rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                    <MessageSquare color="var(--primary-color)" size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Chat Agent</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>24/7 medical chat assistance.</p>
                </div>

                <div onClick={() => setActiveFeature('history')} className="card shadow-soft hover-lift" style={{ padding: '2rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                    <Clock color="var(--primary-color)" size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>History</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>View past logs and analysis.</p>
                </div>

                <div onClick={() => setActiveFeature('locator')} className="card shadow-soft hover-lift" style={{ padding: '2rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                    <MapPin color="var(--primary-color)" size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Find Doctor</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>Locate clinics near you on a map.</p>
                </div>

                <div onClick={() => { setActiveFeature('schedule'); setInitialClinicForSchedule(null); }} className="card shadow-soft hover-lift" style={{ padding: '2rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                    <CalendarDays color="var(--primary-color)" size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Care Schedule</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>Book appointments and reminders.</p>
                </div>
              </div>

              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}>
                <span>&copy; 2026 Health Insights. All rights reserved.</span>
              </div>
            </div>
          )}

          {/* VIEW: ANALYSIS */}
          {activeFeature === 'analysis' && (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div className="card shadow-soft" style={{ padding: '2.5rem', border: 'none', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Stethoscope color="var(--primary-color)" size={28} />
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px' }}>New Medical Analysis</h1>
                </div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontWeight: 500 }}>Upload a patient's medical report or type the symptoms manually for our AI agents to analyze.</p>

                <form onSubmit={handleAnalyze}>
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Patient Name</label>
                      <input type="text" className="input-field styled-input" placeholder="E.g., Jane Doe" required value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                    </div>
                    <div style={{ width: '120px' }}>
                      <label className="form-label">Age</label>
                      <input type="number" className="input-field styled-input" placeholder="30" required value={patientAge} onChange={(e) => setPatientAge(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <label className="form-label">Upload Medical Document</label>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".pdf,.jpg,.jpeg,.png,.dcm,.dicom" 
                      style={{ display: 'none' }} 
                    />
                    <div 
                      style={{ 
                        border: '2px dashed', 
                        borderRadius: '16px', 
                        padding: '2.5rem 2rem', 
                        textAlign: 'center', 
                        backgroundColor: selectedFile ? '#f0fdf4' : '#f8fafc', 
                        borderColor: selectedFile ? '#10b981' : '#cbd5e1',
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }} 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div style={{ backgroundColor: selectedFile ? '#d1fae5' : '#e0f2fe', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                        <Upload size={28} color={selectedFile ? "#10b981" : "var(--primary-color)"} />
                      </div>
                      {selectedFile ? (
                        <>
                          <p style={{ fontWeight: 700, color: '#064e3b', fontSize: '1.05rem', marginBottom: '0.25rem' }}>{selectedFile.name}</p>
                          <p style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 500 }}>File ready for analysis</p>
                        </>
                      ) : (
                        <>
                          <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.05rem', marginBottom: '0.25rem' }}>Click to upload or drag and drop</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>PDF, JPG, PNG, or DICOM (max. 25MB)</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>OR ENTER MANUALLY</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <label className="form-label">Medical Notes / Symptoms</label>
                    <div style={{ position: 'relative' }}>
                      <textarea 
                        className="input-field styled-input" 
                        rows={5} 
                        placeholder="Describe symptoms, paste text from a report, or add additional notes..."
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        style={{ resize: 'vertical', width: '100%', paddingRight: '3rem' }}
                      />
                      <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', display: 'flex', gap: '0.5rem', backgroundColor: 'transparent' }}>
                        <button 
                          type="button" 
                          onClick={toggleListening}
                          className={isListening ? 'mic-pulsing' : ''}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: isListening ? '#ef4444' : 'var(--text-muted)', 
                            cursor: 'pointer', 
                            padding: '0.5rem', 
                            borderRadius: '50%',
                            transition: 'color 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Dictate Symptoms"
                        >
                          <Mic size={22} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button type="submit" className="pill-btn-solid" disabled={isAnalyzing}>
                      {isAnalyzing ? 'Analyzing...' : 'Analyze Report'}
                    </button>
                  </div>
                </form>
              </div>

              {/* REPORT VIEWER UI */}
              {analysisResult && !analysisResult.error && !isAnalyzing && (
                <div ref={resultsRef} style={{ marginTop: '3rem', animation: 'fadeIn 0.5s ease-out' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>
                      Multi-Agent Medical Board
                    </h2>
                    <button onClick={handleDiscussAnalysis} className="pill-btn" style={{ backgroundColor: '#eff6ff', color: 'var(--primary-color)', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                      <MessageSquare size={16} /> Discuss with AI
                    </button>
                  </div>

                  <div className="card" style={{ padding: '3rem', backgroundColor: 'var(--card-bg)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3rem' }}>
                      
                      {/* LEFT COLUMN */}
                      <div>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Primary Diagnosis</h3>
                        <h2 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.75rem' }}>
                          {analysisResult.diagnosis?.diagnosis}
                        </h2>
                        <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: 'var(--primary-color)', padding: '0.35rem 1rem', borderRadius: '99px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '3rem', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                          Confidence: {analysisResult.diagnosis?.confidence}%
                        </div>

                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <HeartPulse size={20} color="var(--primary-color)"/> AI Reasoning Timeline
                        </h3>
                        <div className="glass-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', position: 'relative', maxHeight: '450px', paddingRight: '0.5rem' }}>
                          {/* Vertical connecting line */}
                          <div style={{ position: 'absolute', left: '15px', top: '20px', bottom: '20px', width: '2px', backgroundColor: 'var(--border-color)', zIndex: 0 }}></div>
                          
                          {analysisResult.reasoning_timeline?.map((step, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--card-bg)', border: '2px solid var(--primary-color)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, flexShrink: 0, boxShadow: '0 0 0 6px var(--bg-color)' }}>
                                {idx + 1}
                              </div>
                              <div style={{ paddingTop: '0.3rem' }}>
                                <p style={{ fontSize: '1rem', color: 'var(--text-main)', lineHeight: '1.6', margin: 0, fontWeight: 500 }}>
                                  {step}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* RIGHT COLUMN */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        
                        {/* Risk Assessment */}
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>Risk Assessment</h3>
                          <div style={{ padding: '1.5rem', backgroundColor: analysisResult.risk.emergency ? 'rgba(225, 29, 72, 0.1)' : 'rgba(255,255,255,0.4)', borderRadius: '16px', border: analysisResult.risk.emergency ? '1px solid #e11d48' : '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)' }}>
                            <div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</span>
                              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: analysisResult.risk.risk === 'Low' ? '#10b981' : analysisResult.risk.risk === 'Medium' ? '#f59e0b' : '#e11d48', marginTop: '0.25rem' }}>
                                {analysisResult.risk.risk} Risk
                              </div>
                            </div>
                            {analysisResult.risk.emergency && (
                              <div style={{ backgroundColor: '#e11d48', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem', animation: 'pulse 2s infinite' }}>
                                ⚠️ EMERGENCY
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Nutrition */}
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Apple size={18} color="#10b981"/> Nutrition Summary
                          </h3>
                          <div className="glass-scroll" style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(10px)', maxHeight: '350px' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{analysisResult.nutrition?.primary_focus || "Dietary Plan"}</h4>
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>{analysisResult.nutrition?.reasoning || "See Dietitian tab for full details."}</p>
                          </div>
                        </div>

                        {/* Follow-up */}
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={18} color="#f59e0b"/> Recommended Follow-up
                          </h3>
                          <div className="glass-scroll" style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(10px)', maxHeight: '350px' }}>
                            <ul style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                              {analysisResult.follow_up?.tests?.map((test, i) => (
                                <li key={i} style={{ marginBottom: '0.5rem' }}>{test}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                      </div>

                      {/* COLUMN 3 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        {/* Evidence */}
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={18} color="#6366f1"/> Clinical Evidence
                          </h3>
                          <div className="glass-scroll" style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(10px)', height: '100%', maxHeight: '600px' }}>
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                              {analysisResult.evidence?.evidence}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {analysisResult && analysisResult.error && !isAnalyzing && (
                 <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', fontWeight: '500' }}>
                   {analysisResult.error}
                 </div>
              )}
            </div>
          )}

          {/* VIEW: DIET */}
          {activeFeature === 'diet' && (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              
              {!analysisResult ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                      <Apple color="var(--primary-color)" size={48} />
                    </div>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Dietitian Plan Available</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 2rem' }}>Please run a Medical Analysis first to generate a personalized dietary and nutrition plan based on the diagnosis.</p>
                  <button onClick={() => setActiveFeature('analysis')} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>
                    Go to Analysis
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', padding: '0.5rem', borderRadius: '12px' }}>
                          <Apple color="var(--primary-color)" size={28} />
                        </div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Dietitian Plan</h1>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '1rem' }}>AI-generated nutritional recommendations based on recent analysis.</p>
                    </div>
                    
                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', padding: '0.75rem 1.25rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Patient</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{patientName || "Unknown"}</span>
                      </div>
                      <div style={{ height: '30px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Condition</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-color)' }}>{analysisResult.diagnosis?.diagnosis || "Unknown"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Nutritional Focus */}
                  <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(139, 92, 246, 0.1))', borderLeft: '4px solid var(--primary-color)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ backgroundColor: 'white', color: 'var(--primary-color)', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.15)' }}>
                      <HeartPulse size={32} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Primary Focus: {analysisResult.nutrition?.primary_focus || "General Health"}</h3>
                      <p style={{ color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>{analysisResult.nutrition?.reasoning || analysisResult.nutrition?.advice || "Please run a new analysis to see full details."}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                    
                    {/* Foods to Eat */}
                    <div className="card glass-scroll" style={{ padding: '1.5rem', backgroundColor: 'var(--card-bg)', maxHeight: '500px' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }}></div> Recommended Foods
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(analysisResult.nutrition?.foods_to_eat || ['Balanced whole foods']).map((food, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500, color: 'var(--text-main)' }}>
                            <div style={{ backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '50%', padding: '0.25rem' }}>
                              <Plus size={14} strokeWidth={3} />
                            </div>
                            {food}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Foods to Avoid */}
                    <div className="card glass-scroll" style={{ padding: '1.5rem', backgroundColor: 'var(--card-bg)', maxHeight: '500px' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }}></div> Limit or Avoid
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(analysisResult.nutrition?.foods_to_avoid || ['Processed foods', 'Excessive sugar']).map((food, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500, color: 'var(--text-main)' }}>
                            <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '50%', padding: '0.25rem', transform: 'rotate(45deg)' }}>
                              <Plus size={14} strokeWidth={3} />
                            </div>
                            {food}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Column 3: Hydration & Lifestyle */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      
                      {/* Hydration Goals */}
                      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--card-bg)' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Droplet size={20} color="#3b82f6" /> Hydration Goals
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
                          {analysisResult.nutrition?.hydration_advice || "Aim for at least 2-3 liters of water per day unless fluid restricted."}
                        </p>
                      </div>

                      {/* Lifestyle & Meal Timing */}
                      <div className="card glass-scroll" style={{ padding: '1.5rem', backgroundColor: 'var(--card-bg)', flex: 1, maxHeight: '300px' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Coffee size={20} color="#8b5cf6" /> Lifestyle & Timing
                        </h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {(analysisResult.nutrition?.lifestyle_tips || ['Eat balanced meals', 'Maintain regular eating schedule']).map((tip, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontWeight: 500, color: 'var(--text-main)' }}>
                              <div style={{ color: '#8b5cf6', marginTop: '2px' }}>•</div>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIEW: CHAT */}
          {activeFeature === 'chat' && (
            <div className="card" style={{ 
              animation: 'fadeIn 0.4s ease-out', 
              display: 'flex', 
              flexDirection: 'column', 
              height: '600px', 
              border: '1px solid var(--border-color)', 
              borderRadius: '24px', 
              padding: 0, 
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              backgroundColor: 'var(--card-bg)',
              backdropFilter: 'blur(20px)'
            }}>
              
              {/* Chat Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 2rem', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
                <div style={{ backgroundColor: 'var(--chat-agent-bg)', padding: '0.6rem', borderRadius: '12px' }}>
                  <MessageSquare color="var(--primary-color)" size={24} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-main)', marginBottom: '0.1rem' }}>Health Insights Chat Agent</h1>
                  <p style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: 'var(--primary-color)', borderRadius: '50%' }}></span> Online
                  </p>
                </div>
              </div>
              
              {/* Chat Messages Area */}
              <div className="glass-scroll" style={{ flex: 1, padding: '2rem', overflowY: 'auto', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeIn 0.3s ease-out' }}>
                    {/* Agent Avatar */}
                    {msg.role === 'agent' && (
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--chat-agent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 'auto', marginBottom: 'auto' }}>
                        <HeartPulse size={20} color="var(--primary-color)" />
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div style={{ 
                      maxWidth: '70%', 
                      width: 'fit-content',
                      padding: '1rem 1.25rem', 
                      borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px', 
                      backgroundColor: msg.role === 'user' ? 'var(--chat-user-bg)' : 'var(--chat-agent-bg)', 
                      color: msg.role === 'user' ? 'var(--chat-user-text)' : 'var(--chat-agent-text)', 
                      fontWeight: 500,
                      lineHeight: 1.5,
                      boxShadow: 'var(--shadow-md)',
                      border: '1px solid var(--border-color)',
                      backdropFilter: 'blur(10px)',
                      fontSize: '0.95rem'
                    }} className={msg.role === 'agent' ? 'markdown-chat' : ''}>
                      {msg.role === 'user' ? msg.text : <ReactMarkdown>{msg.text}</ReactMarkdown>}
                    </div>

                    {/* User Avatar */}
                    {msg.role === 'user' && (
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 'auto', marginBottom: 'auto' }}>
                        <User size={20} color="white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chat Input Area */}
              <div style={{ padding: '1.5rem 2rem', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderTop: '1px solid var(--border-color)', zIndex: 10, backdropFilter: 'blur(10px)' }}>
                <form 
                  onSubmit={handleSendMessage} 
                  style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    backgroundColor: '#f8fafc', 
                    padding: '0.5rem 0.5rem 0.5rem 1.5rem', 
                    borderRadius: 'var(--radius-full)', 
                    border: '2px solid #e2e8f0', 
                    alignItems: 'center',
                    transition: 'border-color 0.2s',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <input 
                    type="text" 
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Ask a medical question..." 
                    style={{ flex: 1, border: 'none', backgroundColor: 'transparent', boxShadow: 'none', fontWeight: 500, outline: 'none', color: 'var(--text-main)', fontSize: '1rem' }} 
                  />
                  <button 
                    type="button" 
                    onClick={toggleListening}
                    className={isListening ? 'mic-pulsing' : ''}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--text-muted)', 
                      cursor: 'pointer', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      marginRight: '0.5rem'
                    }}
                    title={isListening ? "Stop listening" : "Start speaking"}
                  >
                    <Mic size={22} />
                  </button>
                  <button type="submit" disabled={!currentMessage.trim()} style={{ 
                    backgroundColor: currentMessage.trim() ? 'var(--primary-color)' : '#cbd5e1', 
                    border: 'none', 
                    color: 'white', 
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%', 
                    cursor: currentMessage.trim() ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: currentMessage.trim() ? '0 4px 14px rgba(12, 92, 206, 0.35)' : 'none'
                  }}>
                    <Send size={20} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VIEW: HISTORY */}
          {activeFeature === 'history' && (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                <div style={{ backgroundColor: '#e0f2fe', padding: '0.5rem', borderRadius: '12px' }}>
                  <FileText color="var(--primary-color)" size={28} />
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Past Logs & History</h1>
              </div>

              {isLoadingHistory ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading history from Supabase...</div>
              ) : historyError ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>Error: {historyError}</div>
              ) : historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No history logs found. Start an analysis or chat!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {historyLogs.map(log => {
                    const isAnalysis = log.log_type === 'analysis'
                    const isChat = log.log_type === 'chat'
                    
                    return (
                      <div key={log.id} onClick={() => handleViewLog(log)} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', border: '1px solid var(--border-color)', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'var(--card-bg)' }} onMouseOver={(e) => {e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.05)'; }} onMouseOut={(e) => {e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none';}}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ backgroundColor: 'var(--chat-agent-bg)', padding: '1rem', borderRadius: '12px' }}>
                            {isAnalysis ? <Stethoscope size={24} color="var(--primary-color)" /> : <MessageSquare size={24} color="var(--primary-color)" />}
                          </div>
                          <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                              {isAnalysis ? `Medical Analysis: ${log.patient_name}` : `Chat Agent Session`}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>{log.summary}</p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                            <Clock size={12}/> {new Date(log.created_at).toLocaleString()}
                          </p>
                          <span style={{ fontSize: '0.75rem', backgroundColor: isAnalysis ? '#e0f2fe' : '#f1f5f9', color: isAnalysis ? 'var(--primary-color)' : '#64748b', padding: '0.3rem 0.75rem', borderRadius: 'full', fontWeight: 700 }}>
                            {isAnalysis ? 'Analysis Log' : 'Chat Log'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW: DOCTOR LOCATOR */}
          {activeFeature === 'locator' && (
            <div style={{ animation: 'fadeIn 0.5s ease-out', height: '80vh', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
              <DoctorLocator onBookAppointment={(clinic) => { setInitialClinicForSchedule(clinic); setActiveFeature('schedule'); }} />
            </div>
          )}

        {/* VIEW: CARE SCHEDULE */}
          {activeFeature === 'schedule' && (
            <CareSchedule 
              initialClinic={initialClinicForSchedule} 
              onScheduleClose={initialClinicForSchedule ? () => { setActiveFeature('locator'); setInitialClinicForSchedule(null); } : null} 
              onDataUpdate={fetchUserAndNotifications}
            />
          )}

          {/* VIEW: PROFILE */}
          {activeFeature === 'profile' && (
            <div style={{ animation: 'fadeIn 0.5s ease-out', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <button 
                onClick={() => setActiveFeature('home')}
                style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, padding: 0, alignSelf: 'flex-start' }}
                className="hover-lift">
                <ChevronLeft size={20} /> Back to Dashboard
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ backgroundColor: '#fce7f3', padding: '1rem', borderRadius: '50%' }}>
                  <User size={32} color="var(--primary-color)" />
                </div>
                <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-main)' }}>Your Profile</h2>
              </div>
              
              <div className="card shadow-soft" style={{ padding: '2.5rem', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'white' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  <div>
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      className="styled-input" 
                      style={{ width: '100%' }} 
                      value={currentUser?.user_metadata?.full_name || ''} 
                      onChange={(e) => setCurrentUser({...currentUser, user_metadata: {...currentUser.user_metadata, full_name: e.target.value}})}
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div>
                    <label className="form-label">Email Address</label>
                    <input 
                      type="text" 
                      className="styled-input" 
                      style={{ width: '100%', backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }} 
                      value={currentUser?.email || ''} 
                      disabled
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Age</label>
                    <input 
                      type="number" 
                      className="styled-input" 
                      style={{ width: '100%' }} 
                      value={currentUser?.user_metadata?.age || ''} 
                      onChange={(e) => setCurrentUser({...currentUser, user_metadata: {...currentUser.user_metadata, age: e.target.value}})}
                      placeholder="e.g. 28"
                    />
                  </div>

                  <button 
                    onClick={async () => {
                      const { data, error } = await supabase.auth.updateUser({
                        data: {
                          full_name: currentUser.user_metadata.full_name,
                          age: currentUser.user_metadata.age
                        }
                      });
                      if (!error) {
                        alert("Profile updated successfully!");
                      } else {
                        alert("Error updating profile.");
                      }
                    }}
                    className="pill-btn-solid" 
                    style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1rem' }}>
                    Save Profile Changes
                  </button>

                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .shadow-soft {
          box-shadow: var(--shadow-md);
        }

        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
        }

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
        .nav-link:hover {
          color: var(--primary-color);
        }
        .nav-link.active {
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

        .pill-btn-danger {
          border-color: var(--error-color);
          color: var(--error-color);
        }
        .pill-btn-danger:hover {
          background: var(--error-color);
          color: white !important;
        }

        .pill-btn-solid {
          background: var(--primary-color);
          border: none;
          color: white;
          font-weight: 700;
          font-size: 0.95rem;
          padding: 0.8rem 2rem;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .pill-btn-solid:hover {
          background: var(--primary-hover);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(12, 92, 206, 0.2);
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .styled-input {
          padding: 0.875rem 1rem;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          font-weight: 500;
          background-color: #f8fafc;
        }
        .styled-input:focus {
          background-color: white;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(12, 92, 206, 0.1);
        }
      `}</style>
    </div>
  )
}
