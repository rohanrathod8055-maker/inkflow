'use client'

import { toggleBookmark } from '@/actions/bookmark'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SeriesActions({ seriesId }: { seriesId: string }) {
    const [loading, setLoading] = useState(false)
    // Optimistic state could be better, but simple fetch for now
    const [isBookmarked, setIsBookmarked] = useState(false)
    const router = useRouter()

    const handleBookmark = async () => {
        setLoading(true)
        const res = await toggleBookmark(seriesId)
        if (res.error) {
            router.push('/login')
        } else {
            setIsBookmarked(res.isBookmarked)
        }
        setLoading(false)
    }

    return (
        <div className="flex gap-3">
            <button className="flex-1 bg-accent hover:bg-pink-600 text-white py-3.5 rounded-xl font-bold font-display tracking-wide shadow-glow hover:scale-105 transition-all flex items-center justify-center gap-2 group">
                <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">menu_book</span>
                Start Reading
            </button>
            <button
                onClick={handleBookmark}
                disabled={loading}
                className={`flex-1 ${isBookmarked ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10 text-white'} border border-white/10 backdrop-blur-xl py-3.5 rounded-xl font-bold font-display tracking-wide transition-all flex items-center justify-center gap-2`}
            >
                <span className="material-symbols-outlined">{isBookmarked ? 'check' : 'bookmark_add'}</span>
                {isBookmarked ? 'Added' : 'Library'}
            </button>
        </div>
    )
}
