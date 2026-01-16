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
    const href = chapter.source_url.startsWith('http')
        ? chapter.source_url
        : `https://asuracomic.net/series/${chapter.source_url.replace(/^\//, '')}`

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
            onClick={handleClick}
        >
            {children}
        </a>
    )
}
