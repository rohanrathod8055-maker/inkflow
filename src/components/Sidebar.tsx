'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Sidebar() {
    const [user, setUser] = useState<any>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
    }

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-20 z-50 flex flex-col items-center py-8 border-r border-white/5 bg-black/20 backdrop-blur-xl">
            {/* Brand/Home */}
            <Link href="/" className="size-12 rounded-xl bg-accent flex items-center justify-center shadow-glow mb-8 hover:scale-105 transition-transform group">
                <span className="material-symbols-outlined text-white group-hover:animate-pulse">auto_stories</span>
            </Link>

            {/* Navigation */}
            <div className="flex flex-col gap-6 w-full px-4 items-center">
                <Link href="/" className="p-3 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">home</span>
                </Link>
                <Link href="/library" className="p-3 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">library_books</span>
                </Link>
                <button className="p-3 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors relative group">
                    <span className="material-symbols-outlined">search</span>
                </button>
                <Link href="/bookmarks" className="p-3 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">bookmarks</span>
                </Link>
                <Link href="/history" className="p-3 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">history</span>
                </Link>
            </div>

            {/* Auth Section */}
            <div className="mt-auto flex flex-col gap-4 items-center">
                {user ? (
                    <div className="flex flex-col items-center gap-2 group relative">
                        <div className="size-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/10">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="absolute left-10 ml-4 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <Link href="/login" className="p-3 rounded-xl hover:bg-white/10 text-accent hover:text-white transition-colors group relative">
                        <span className="material-symbols-outlined">login</span>
                        <span className="absolute left-14 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Login</span>
                    </Link>
                )}

                <button className="p-3 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">settings</span>
                </button>
            </div>
        </aside>
    )
}
