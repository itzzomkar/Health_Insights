# 🏥 Health Insights: Your Secure AI Medical Concierge

> **Kaggle AI Agents: Intensive Vibe Coding Capstone Project**  
> **Track:** Concierge Agents  

Health Insights is a secure, multi-agent AI medical concierge built to democratize healthcare intelligence. By leveraging a specialized multi-agent architecture, the platform can translate complex medical jargon from lab reports, generate personalized dietary plans, and help users locate nearby medical facilities, all while keeping their sensitive personal data completely secure.

### 🌐 Live Demo
* [Insert Vercel Link Here]

### 🎥 Video Walkthrough
* [Insert YouTube Link Here]

---

## ✨ Features

- **Multi-Agent Specialization**: 
  - 🩺 **Medical Analyst**: Upload reports or type symptoms for jargon-free, actionable health summaries.
  - 🥗 **Dietitian**: Get personalized meal plans based on your unique health profile.
  - 💬 **Chat Agent**: 24/7 conversational support for general inquiries.
- **Concierge Care Schedule**: An interactive, mobile-responsive calendar to track medication reminders and upcoming checkups.
- **Dynamic Doctor Locator**: Real-time Mapbox integration to locate the nearest hospitals and clinics based on the user's location.
- **Bank-Grade Security**: Integrated Supabase Authentication ensures that all user data, queries, and history are strictly private.

---

## 🏗️ Architecture

- **Frontend**: React, Vite, Vanilla CSS (Glassmorphism & Modern UI)
- **Backend**: Python, FastAPI
- **Authentication**: Supabase
- **AI/LLM Framework**: LangChain, Google Gemini / OpenAI GPT-4o
- **Cloud Deployment**: Vercel (Frontend), Render (Backend)

---

## 🚀 Setup & Installation (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/itzzomkar/Health_Insights.git
cd Health_Insights
```

### 2. Frontend Setup (React/Vite)
```bash
cd frontend
npm install
npm run dev
```
> The frontend will be available at `http://localhost:5173`. Make sure you have your `.env` variables for Supabase configured.

### 3. Backend Setup (FastAPI)
Open a new terminal window:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
uvicorn main:app --reload
```
> The backend will be available at `http://localhost:8000`.

---

## 🤖 Built with Antigravity
This project was rapidly developed using "Vibe Coding" techniques with **Antigravity** (Google's AI coding assistant). Antigravity functioned as a senior pair-programmer, accelerating the development of mobile-responsive CSS grids, multi-agent Python backend architecture, and cloud deployment pipelines.
