import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Export for Client Components (Auth, etc.)
export const createClient = () =>
    createBrowserClient(supabaseUrl, supabaseAnonKey)

// Legacy Singleton for simple static fetching (Server Components/Scripts)
export const supabase = createSupabaseJsClient(supabaseUrl, supabaseAnonKey)
