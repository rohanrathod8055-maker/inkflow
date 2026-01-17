'use client';
import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 2. The 'Relaxed' SmartImage Component
const SmartImage = ({ url, index }: { url: string, index: number }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isRejected, setIsRejected] = useState(false);

    if (isRejected) return null;

    return (
        <img
            src={`https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp`}
            className={`w-full h-auto block select-none mb-0 transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0 h-0 hidden'}`}
            loading={index < 3 ? "eager" : "lazy"}
            alt={`p-${index}`}
            unoptimized="true"
            onLoad={(e) => {
                const img = e.currentTarget;
                // Relaxed Rule: Only hide TINY icons.
                // Allow Wide Panels (Double Spreads) and Short Panels.
                if (img.naturalHeight < 50) {
                    setIsRejected(true);
                    return;
                }

                // Show everything else
                img.classList.remove('hidden');
                setIsVisible(true);
            }}
            onError={() => setIsRejected(true)}
        />
    );
};

export default function ReaderPage({ params }: { params: Promise<{ id: string, chapterId: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();

    const [images, setImages] = useState<string[]>([]);
    const [chapter, setChapter] = useState<any>(null);
    const [prevChapter, setPrevChapter] = useState<any>(null);
    const [nextChapter, setNextChapter] = useState<any>(null);
    const [status, setStatus] = useState('Initializing Visual Engine...');

    const loadContent = async () => {
        setImages([]);
        setStatus('Initializing Visual Engine...');

        // 1. Get Current Chapter & Series Info
        const { data: current } = await supabase.from('chapters')
            .select('*, series(*)')
            .eq('id', resolvedParams.chapterId)
            .single();

        if (!current) return setStatus('Chapter Not Found');
        setChapter(current);

        // 2. Navigation: Fetch Neighbors
        const { data: allChapters } = await supabase.from('chapters')
            .select('id, chapter_number')
            .eq('series_id', current.series_id)
            .order('chapter_number', { ascending: true });

        if (allChapters) {
            const currentIndex = allChapters.findIndex(c => c.id === current.id);
            if (currentIndex > 0) setPrevChapter(allChapters[currentIndex - 1]);
            if (currentIndex < allChapters.length - 1) setNextChapter(allChapters[currentIndex + 1]);
        }

        try {
            // 3. The 'Vacuum' Scraper (Server Side)
            setStatus('Scanning Visual Assets...');
            const targetUrl = current.source_url || current.url;
            const res = await fetch('https://r.jina.ai/' + targetUrl);
            if (!res.ok) throw new Error('Bridge Failed');

            const markdown = await res.text();

            // 4. Regex: Grab EVERY image link (Zero Filtering)
            // Catches everything http(s) ending in image extension
            const urlRegex = /(https?:\/\/[^\s)"']+\.(?:jpg|jpeg|png|webp))/gi;
            const found = [];
            let match;
            while ((match = urlRegex.exec(markdown)) !== null) {
                found.push(match[1]);
            }

            // Deduplicate only
            const uniqueImages = Array.from(new Set(found));

            if (uniqueImages.length > 0) {
                setImages(uniqueImages);
            } else {
                setStatus('No Images Found (Source Blocked)');
            }
        } catch (e) {
            console.error(e);
            setStatus('Connection Error');
        }
    };

    useEffect(() => {
        loadContent();
    }, [resolvedParams.chapterId]);

    return (
        <div suppressHydrationWarning={true} className="bg-[#111] min-h-screen text-white font-sans relative">
            {/* Header: Sticky, Blur, Minimal */}
            <div className="fixed top-0 w-full px-4 py-3 bg-black/90 backdrop-blur-md z-50 border-b border-white/5 flex justify-between items-center transition-all">
                <Link
                    href={`/series/${resolvedParams.id}`}
                    className="text-[10px] font-black tracking-[0.2em] text-gray-500 hover:text-white transition-colors"
                >
                    ESC
                </Link>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase truncate max-w-[150px]">
                        {chapter?.series?.title || 'Loading...'}
                    </span>
                    <span className="text-[9px] font-black text-white tracking-[0.3em] mt-0.5">
                        CH. {chapter?.chapter_number}
                    </span>
                </div>
                <div className="w-6"></div>
            </div>

            {/* Main Content: Mangagojo Style */}
            <div className="flex flex-col items-center w-full min-h-screen pt-0 pb-32">
                {images.length > 0 ? (
                    <>
                        {/* 3. The 'Load More' Safety Net */}
                        {images.length < 5 && (
                            <div className="w-full max-w-3xl mx-auto mt-20 mb-4 px-4">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full py-3 bg-red-900/30 border border-red-500/50 text-red-200 font-bold uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                                >
                                    Warning: Low Page Count ({images.length}) - Click to Force Retry
                                </button>
                            </div>
                        )}

                        {/* Image Strip with Relaxed Gatekeepers */}
                        <div className="w-full max-w-3xl flex flex-col gap-0 mx-auto mt-14 shadow-2xl shadow-black bg-[#111] min-h-screen">
                            {images.map((url, i) => (
                                <SmartImage key={i} url={url} index={i} />
                            ))}
                        </div>

                        {/* End-of-Chapter Card */}
                        <div className="w-full max-w-3xl mx-auto mt-0 p-8 bg-[#0a0a0a] border-t border-white/5 flex flex-col items-center gap-6 text-center">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">End of Content</h3>
                                <h2 className="text-white text-xl font-bold">You've finished Chapter {chapter?.chapter_number}</h2>
                            </div>

                            {nextChapter ? (
                                <button
                                    onClick={() => router.push(`/series/${chapter.series_id}/${nextChapter.id}`)}
                                    className="px-10 py-4 bg-accent text-white font-black text-sm uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all animate-pulse hover:animate-none scale-105"
                                >
                                    Continue to Chapter {nextChapter.chapter_number}
                                </button>
                            ) : (
                                <div className="px-10 py-4 bg-[#222] text-gray-500 font-bold text-xs uppercase tracking-widest border border-white/5">
                                    No New Chapters
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    // Loading State
                    <div className="flex flex-col items-center justify-center h-[80vh] gap-6 animate-pulse">
                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin opacity-50"></div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.25em]">{status}</p>
                    </div>
                )}
            </div>

            {/* Controls: Next Chapter Footer (Floating) */}
            <div className="fixed bottom-0 w-full bg-[#111]/90 backdrop-blur-md border-t border-white/5 px-4 py-3 z-50 flex justify-between items-center max-w-full">
                <button
                    onClick={() => prevChapter && router.push(`/series/${chapter.series_id}/${prevChapter.id}`)}
                    disabled={!prevChapter}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${prevChapter ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-700 cursor-not-allowed hidden md:flex'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Prev</span>
                </button>

                <div className="flex flex-col items-center cursor-pointer group" onClick={() => router.push(`/series/${resolvedParams.id}`)}>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] group-hover:text-accent transition-colors">
                        Chapter {chapter?.chapter_number}
                    </span>
                </div>

                <button
                    onClick={() => nextChapter && router.push(`/series/${chapter.series_id}/${nextChapter.id}`)}
                    disabled={!nextChapter}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${nextChapter ? 'bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-white' : 'bg-transparent text-gray-700 cursor-not-allowed border border-white/5'}`}
                >
                    <span className="text-[10px] font-bold uppercase tracking-widest">Next</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
            </div>
        </div>
    );
}