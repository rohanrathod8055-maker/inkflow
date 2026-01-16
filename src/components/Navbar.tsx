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
        <header className="absolute top-0 left-0 right-0 z-10 px-6 py-4 flex justify-between items-center bg-transparent pointer-events-none">
            {/* Background gradient handled by layout or parent if needed, or we can add it here. 
          Original header had: bg-gradient-to-b from-background-dark/90 to-transparent
      */}
            <div className="absolute inset-0 bg-gradient-to-b from-background-dark/90 to-transparent -z-10"></div>

            <div className="pointer-events-auto relative w-full max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-dim">search</span>
                <input
                    className="w-full bg-surface/50 backdrop-blur-md border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                    placeholder="Search titles, artists, or genres..."
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <div className="flex gap-3 pointer-events-auto">
                <button className="size-10 rounded-full bg-surface/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined">notifications</span>
                </button>
            </div>
        </header>
    )
}
