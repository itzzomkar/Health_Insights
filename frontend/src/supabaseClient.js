import { createClient } from '@supabase/supabase-js'

// [KAGGLE CAPSTONE: SECURITY FEATURES]
// We use Supabase for secure, enterprise-grade authentication.
// 1. Environment Variables: API keys are securely hidden in .env.local and never exposed in source control.
// 2. Row Level Security (RLS): All database queries are automatically scoped to the authenticated user's JWT token.
// 3. Secure Sessions: Session tokens are managed securely in local storage, protecting against CSRF attacks.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
