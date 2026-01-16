'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Navbar() {
    const router = useRouter()
    const [query, setQuery] = useState('')

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query)}`)
        }
    }

    return (
        <header className="sticky top-0 z-50 px-6 py-4 flex justify-between items-center bg-black/60 backdrop-blur-md border-b border-white/10 transition-all">
            {/* Brand / Logo Area (Empty for now as requested, or keep existing layout structure) */}
            <div className="flex items-center gap-4">
                <div className="md:hidden text-accent font-bold text-xl tracking-tighter">INKFLOW</div>
            </div>

            <div className="relative w-full max-w-md mx-4">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input
                    className="w-full bg-white/10 border border-white/20 rounded-full py-2.5 pl-12 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:bg-black/80 focus:ring-2 focus:ring-accent/50 transition-all"
                    placeholder="Search titles, artists, or genres..."
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>

            <div className="flex gap-3">
                <button className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined">notifications</span>
                </button>
            </div>
        </header>
    )
}
