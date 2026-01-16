'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function toggleBookmark(seriesId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Safe to ignore
                    }
                }
            }
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated', isBookmarked: false }

    // Check if exists
    const { data: existing } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('series_id', seriesId)
        .single()

    if (existing) {
        await supabase.from('bookmarks').delete().eq('id', existing.id)
        return { isBookmarked: false }
    } else {
        await supabase.from('bookmarks').insert({ user_id: user.id, series_id: seriesId })
        return { isBookmarked: true }
    }
}
