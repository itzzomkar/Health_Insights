import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Pill, CheckCircle, Plus, X, Stethoscope, AlertCircle, Trash2, CalendarDays, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function CareSchedule({ initialClinic = null, onScheduleClose = null, onDataUpdate = null }) {
  const [activeTab, setActiveTab] = useState(initialClinic ? 'appointments' : 'reminders'); // 'appointments' or 'reminders'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  
  // Data State
  const [appointments, setAppointments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(!!initialClinic);
  const [newTitle, setNewTitle] = useState(initialClinic?.name || '');
  const [newHour, setNewHour] = useState('09');
  const [newMinute, setNewMinute] = useState('00');
  const [newAMPM, setNewAMPM] = useState('AM');
  const [newType, setNewType] = useState('Checkup'); // or 'Medicine'
  const [now, setNow] = useState(new Date());
  
  // Load data from Supabase Auth user_metadata
  useEffect(() => {
    fetchUserData();
    const interval = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchUserData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.user_metadata) {
      setAppointments(user.user_metadata.appointments || []);
      setReminders(user.user_metadata.reminders || []);
    }
    setIsLoading(false);
  };

  const saveUserData = async (newApps, newRems) => {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        appointments: newApps,
        reminders: newRems
      }
    });
    if (error) console.error("Error saving data:", error);
    if (onDataUpdate) onDataUpdate();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle) return;

    // Convert AM/PM back to 24h for sorting/storage consistency
    let h24 = parseInt(newHour, 10);
    if (newAMPM === 'PM' && h24 < 12) h24 += 12;
    if (newAMPM === 'AM' && h24 === 12) h24 = 0;
    const time24 = `${h24.toString().padStart(2, '0')}:${newMinute}`;

    const newItem = {
      id: Date.now().toString(),
      title: newTitle,
      time: time24,
      date: formatDateLocal(selectedDate),
      type: newType,
      completed: false,
      clinicId: initialClinic?.id || null
    };

    if (activeTab === 'appointments') {
      const updatedApps = [...appointments, newItem].sort((a, b) => a.time.localeCompare(b.time));
      setAppointments(updatedApps);
      await saveUserData(updatedApps, reminders);
    } else {
      const updatedRems = [...reminders, newItem].sort((a, b) => a.time.localeCompare(b.time));
      setReminders(updatedRems);
      await saveUserData(appointments, updatedRems);
    }

    setNewTitle('');
    setNewHour('09');
    setNewMinute('00');
    setNewAMPM('AM');
    setIsAdding(false);
  };

  const toggleComplete = async (id, isAppt) => {
    if (isAppt) {
      const updated = appointments.map(a => a.id === id ? { ...a, completed: !a.completed } : a);
      setAppointments(updated);
      await saveUserData(updated, reminders);
    } else {
      const updated = reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
      setReminders(updated);
      await saveUserData(appointments, updated);
    }
  };

  const handleDelete = async (id, isAppt) => {
    if (isAppt) {
      const updated = appointments.filter(a => a.id !== id);
      setAppointments(updated);
      await saveUserData(updated, reminders);
    } else {
      const updated = reminders.filter(r => r.id !== id);
      setReminders(updated);
      await saveUserData(appointments, updated);
    }
  };

  // Calendar Logic
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date(new Date().setHours(0,0,0,0));
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      const d = new Date(year, month, -firstDay.getDay() + i + 1);
      days.push({ date: d, isCurrentMonth: false, isPast: d < today });
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true, isPast: d < today });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, isPast: false });
    }
    return days;
  };
  const calendarDays = getDaysInMonth(currentMonth);

  const formatDateLocal = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const selectedDateStr = formatDateLocal(selectedDate);
  const filteredAppointments = appointments.filter(a => a.date === selectedDateStr);
  const filteredReminders = reminders.filter(r => r.date === selectedDateStr);

  const formatTimeAMPM = (time24) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    const hours = parseInt(h, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${m} ${suffix}`;
  };

  const getTimeRemaining = (dateStr, timeStr) => {
    const target = new Date(`${dateStr}T${timeStr}`);
    const diffMs = target - now;
    
    if (diffMs < 0) {
      if (diffMs > -3600000) return 'Just now';
      return 'Past due';
    }
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays === 1) return `Tomorrow`;
    if (diffHours > 0) return `In ${diffHours} hr ${diffMins % 60} min`;
    return `In ${diffMins} min`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Header & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="gradient-text" style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CalendarDays size={32} color="var(--primary-color)" />
          Care Schedule
        </h2>
        
        {onScheduleClose && (
          <button onClick={onScheduleClose} className="pill-btn" style={{ padding: '0.4rem 1rem' }}>Back to Map</button>
        )}

        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '0.25rem' }}>
          <button 
            onClick={() => setActiveTab('appointments')}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', background: activeTab === 'appointments' ? 'white' : 'transparent', color: activeTab === 'appointments' ? 'var(--primary-color)' : '#64748b', fontWeight: 600, cursor: 'pointer', boxShadow: activeTab === 'appointments' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
            Appointments
          </button>
          <button 
            onClick={() => setActiveTab('reminders')}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', background: activeTab === 'reminders' ? 'white' : 'transparent', color: activeTab === 'reminders' ? 'var(--primary-color)' : '#64748b', fontWeight: 600, cursor: 'pointer', boxShadow: activeTab === 'reminders' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
            Reminders
          </button>
        </div>
      </div>

      {/* Full Calendar View */}
      <div className="card shadow-soft" style={{ padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Calendar Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex' }}>
              <ChevronLeft size={20} color="var(--text-main)" />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex' }}>
              <ChevronRight size={20} color="var(--text-main)" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '1rem' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{day}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
            {calendarDays.map((d, i) => {
              const isSelected = d.date.toDateString() === selectedDate.toDateString();
              const dayStr = formatDateLocal(d.date);
              const hasAppt = appointments.some(a => a.date === dayStr);
              const hasRem = reminders.some(r => r.date === dayStr);
              const isDisabled = d.isPast;

              return (
                <div 
                  key={i} 
                  onClick={() => { if(!isDisabled) setSelectedDate(d.date) }}
                  style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '0.5rem', borderRadius: '12px', cursor: isDisabled ? 'not-allowed' : 'pointer',
                    backgroundColor: isSelected ? 'var(--primary-color)' : (d.isCurrentMonth ? '#f8fafc' : 'transparent'),
                    color: isSelected ? 'white' : (isDisabled ? '#cbd5e1' : 'var(--text-main)'),
                    opacity: d.isCurrentMonth ? 1 : 0.4,
                    border: isSelected ? 'none' : '1px solid transparent',
                    minHeight: '60px', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { if(!isDisabled && !isSelected) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  onMouseOut={(e) => { if(!isDisabled && !isSelected) e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <span style={{ fontSize: '1.1rem', fontWeight: isSelected ? 700 : 500 }}>
                    {d.date.getDate()}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', height: '6px', marginTop: '4px' }}>
                    {hasAppt && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isSelected ? 'white' : (isDisabled ? '#cbd5e1' : '#3b82f6') }} />}
                    {hasRem && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isSelected ? 'white' : (isDisabled ? '#cbd5e1' : '#f59e0b') }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="card shadow-soft" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {activeTab === 'appointments' ? <Stethoscope size={20} color="#3b82f6" /> : <Pill size={20} color="#f59e0b" />}
            {activeTab === 'appointments' ? 'Scheduled Appointments' : 'Medicine & Checkup Reminders'}
            <span style={{ fontSize: '1.05rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '0.25rem' }}>
              - {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </h3>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="pill-btn-solid" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', gap: '0.5rem', background: isAdding ? '#ef4444' : 'var(--primary-color)' }}>
            {isAdding ? <><X size={16}/> Cancel</> : <><Plus size={16}/> Add New</>}
          </button>
        </div>

        {/* Add Form */}
        {isAdding && (
          <form onSubmit={handleAddSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ flex: 2 }}>
              <label className="form-label">{activeTab === 'appointments' ? 'Hospital / Doctor Name' : 'Medicine / Task Name'}</label>
              <input type="text" className="styled-input" style={{ width: '100%' }} value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder={activeTab === 'appointments' ? 'e.g. City Hospital' : 'e.g. Vitamin C (500mg)'} autoFocus />
            </div>
            <div style={{ flex: 1.5 }}>
              <label className="form-label">Time</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select className="styled-input" style={{ padding: '0.75rem 0.5rem', minWidth: '70px', cursor: 'pointer' }} value={newHour} onChange={e => setNewHour(e.target.value)}>
                  {['12','01','02','03','04','05','06','07','08','09','10','11'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span style={{ fontWeight: 700 }}>:</span>
                <select className="styled-input" style={{ padding: '0.75rem 0.5rem', minWidth: '70px', cursor: 'pointer' }} value={newMinute} onChange={e => setNewMinute(e.target.value)}>
                  {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                  <button type="button" onClick={() => setNewAMPM('AM')} style={{ padding: '0.4rem 0.75rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', backgroundColor: newAMPM === 'AM' ? 'var(--primary-color)' : 'transparent', color: newAMPM === 'AM' ? 'white' : '#64748b', transition: 'all 0.2s' }}>AM</button>
                  <button type="button" onClick={() => setNewAMPM('PM')} style={{ padding: '0.4rem 0.75rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', backgroundColor: newAMPM === 'PM' ? 'var(--primary-color)' : 'transparent', color: newAMPM === 'PM' ? 'white' : '#64748b', transition: 'all 0.2s' }}>PM</button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="pill-btn-solid" style={{ padding: '0.875rem 2rem' }}>Save</button>
            </div>
          </form>
        )}

        {/* Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Loader2 className="spin" size={32} color="var(--primary-color)" style={{ animation: 'spin 2s linear infinite' }} />
            </div>
          ) : (activeTab === 'appointments' ? filteredAppointments : filteredReminders).length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.5, padding: '3rem 0' }}>
              <CalendarIcon size={48} style={{ marginBottom: '1rem' }} />
              <p style={{ margin: 0 }}>No {activeTab} scheduled for this date.</p>
            </div>
          ) : (
            (activeTab === 'appointments' ? filteredAppointments : filteredReminders).map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', backgroundColor: item.completed ? '#f8fafc' : 'white', border: '1px solid var(--border-color)', borderRadius: '16px', transition: 'all 0.2s', opacity: item.completed ? 0.7 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button onClick={() => toggleComplete(item.id, activeTab === 'appointments')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                    <CheckCircle size={24} color={item.completed ? '#22c55e' : '#cbd5e1'} style={{ transition: 'color 0.2s' }} />
                  </button>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-main)', textDecoration: item.completed ? 'line-through' : 'none' }}>{item.title}</h4>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {formatTimeAMPM(item.time)}</span>
                      {activeTab === 'appointments' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Stethoscope size={14} /> Checkup</span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Pill size={14} /> Medication</span>
                      )}
                      {!item.completed && (
                        <span style={{ padding: '0.2rem 0.6rem', backgroundColor: '#f1f5f9', borderRadius: '6px', fontWeight: 700, color: 'var(--primary-color)' }}>
                          {getTimeRemaining(item.date, item.time)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id, activeTab === 'appointments')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: '#ef4444', opacity: 0.5 }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
