'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function addToHistory(seriesId: string, chapterNumber: number) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Safe to ignore in Server Component 
                    }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    try {
        const { error } = await supabase
            .from('history')
            .upsert(
                {
                    user_id: user.id,
                    series_id: seriesId,
                    chapter_number: chapterNumber,
                    read_at: new Date().toISOString(),
                },
                { onConflict: 'user_id, series_id, chapter_number' }
            )

        if (error) {
            console.error('History upsert error:', error)
            return { error: error.message }
        }
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}
