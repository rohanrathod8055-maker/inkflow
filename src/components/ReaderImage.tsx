'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ReaderImageProps {
    src: string
    proxyUrl: string
    alt: string
    priority?: boolean
}

export default function ReaderImage({ src, proxyUrl, alt, priority = false }: ReaderImageProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)

    if (hasError) return null

    return (
        <div className="relative min-h-[200px] w-full bg-gray-900/50">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin"></div>
                </div>
            )}
            <img
                src={proxyUrl}
                alt={alt}
                className={`w-full h-auto block transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                loading={priority ? "eager" : "lazy"}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onLoad={() => setIsLoading(false)}
                onError={() => setHasError(true)}
            />
        </div>
    )
}
