import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import * as cheerio from 'cheerio'

// Force dynamic rendering since we are scraping live
export const dynamic = 'force-dynamic'

interface ReaderPageProps {
    params: Promise<{ chapterId: string }>
}

export default async function ReaderPage({ params }: ReaderPageProps) {
    const { chapterId } = await params

    // 1. Fetch Chapter Info from Supabase
    const { data: chapter, error } = await supabase
        .from('chapters')
        .select('*, series(*)')
        .eq('id', chapterId)
        .single()

    if (error || !chapter) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Chapter Not Found</h1>
                    <Link href="/" className="text-accent hover:underline">Go Home</Link>
                </div>
            </div>
        )
    }

    // 2. Fetch Adjacent Chapters for Navigation
    const { data: adjacentChapters } = await supabase
        .from('chapters')
        .select('id, chapter_number')
        .eq('series_id', chapter.series_id)
        .order('chapter_number', { ascending: true })

    // Find current index
    const currentIndex = adjacentChapters?.findIndex(c => c.id === chapter.id) ?? -1
    const prevChapter = currentIndex > 0 ? adjacentChapters?.[currentIndex - 1] : null
    const nextChapter = currentIndex !== -1 && adjacentChapters && currentIndex < adjacentChapters.length - 1 ? adjacentChapters[currentIndex + 1] : null

    // 3. Live Scrape Logic
    let images: string[] = []

    try {
        // Attempt to fetch source page
        const sourceUrl = chapter.source_url
        if (sourceUrl) {
            const response = await fetch(sourceUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                next: { revalidate: 3600 } // Cache for 1 hour if successful
            })

            if (response.ok) {
                const html = await response.text()
                const $ = cheerio.load(html)

                // Strategy: Find all images in the potential reader container.
                // Usually they are in a div with id 'readerarea' or similar on Asura.
                // But user said "Find all manga images (img tags inside the main reader container)".
                // We'll try to be broader first.

                // Common selectors for manga sites (High Quality)
                const selectors = ['.reading-content img', '.wp-manga-chapter-img', '#readerarea img'];

                for (const sel of selectors) {
                    $(sel).each((_, el) => {
                        // Prefer data-src for lazy loading sites (often contains HD)
                        const src = $(el).attr('data-src') || $(el).attr('src');
                        if (src && !images.includes(src)) {
                            // Trim whitespace just in case
                            images.push(src.trim());
                        }
                    });
                    if (images.length > 0) break;
                }

                // Fallback: Just grab all big images if selectors fail?
                if (images.length === 0) {
                    $('img').each((_, el) => {
                        const src = $(el).attr('src');
                        if (src && !src.includes('logo') && !src.includes('banner')) {
                            // Heuristic: ignore small icons?
                            images.push(src);
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.error("Scrape failed:", e);
    }

    // 4. Render UI
    const hasImages = images.length > 0;

    return (
        <div className="bg-black min-h-screen text-white pb-20">
            {/* Top Bar */}
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <Link href={`/series/${chapter.series_id}`} className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Back
                </Link>
                <div className="text-center">
                    <h1 className="text-sm font-bold truncate max-w-[200px] md:max-w-md">{chapter.title}</h1>
                </div>
                <div className="w-16"></div> {/* Spacer */}
            </div>

            {/* Reader Content */}
            <div className="w-full max-w-3xl mx-auto min-h-[80vh] bg-gray-900">
                {hasImages ? (
                    <div className="flex flex-col space-y-0">
                        {images.map((src, idx) => (
                            <img
                                key={idx}
                                // Use LOCAL PROXY to bypass hotlink protection & keep quality
                                src={`/api/proxy?url=${encodeURIComponent(src)}`}
                                alt={`Page ${idx + 1}`}
                                className="w-full h-auto block"
                                loading="lazy"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6">
                        <span className="material-symbols-outlined text-6xl text-gray-600">broken_image</span>
                        <div>
                            <h2 className="text-xl font-bold mb-2">Could not load images</h2>
                            <p className="text-gray-400 max-w-md mx-auto">
                                This could be due to protection on the source site. You can read this chapter directly on the source.
                            </p>
                        </div>
                        <a
                            href={chapter.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-accent hover:bg-pink-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span>Read on Asura Scans</span>
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-t border-white/10 px-4 py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                    <Link
                        href={prevChapter ? `/read/${prevChapter.id}` : '#'}
                        className={`flex-1 py-3 rounded-lg border border-white/10 flex items-center justify-center gap-2 font-bold transition-all ${!prevChapter ? 'opacity-50 pointer-events-none text-gray-500' : 'hover:bg-white/10 text-white'}`}
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                        Previous
                    </Link>

                    <Link
                        href={nextChapter ? `/read/${nextChapter.id}` : '#'}
                        className={`flex-1 py-3 rounded-lg bg-white text-black hover:bg-gray-200 flex items-center justify-center gap-2 font-bold transition-all ${!nextChapter ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        Next
                        <span className="material-symbols-outlined">chevron_right</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
