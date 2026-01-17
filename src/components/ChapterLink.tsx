'use client'

import { addToHistory } from '@/actions/history'
import Link from 'next/link'

export default function ChapterLink({
    seriesId,
    chapter,
    children,
    className
}: {
    seriesId: string,
    chapter: any,
    children: React.ReactNode,
    className?: string
}) {
    const handleClick = async () => {
        // optimistically ignore errors
        await addToHistory(seriesId, chapter.chapter_number)
    }

    // construct URL logic from previous page.tsx
    return (
        <Link
            href={`/series/${seriesId}/${chapter.id}`}
            className={className}
            onClick={handleClick}
        >
            {children}
        </Link>
    )
}
