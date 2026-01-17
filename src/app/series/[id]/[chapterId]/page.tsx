'use client';
import { useState, useEffect, use, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 2. The 'SmartImage' Component (Updated)
const SmartImage = ({
    url,
    index,
    forceShowAll,
    onVisible
}: {
    url: string,
    index: number,
    forceShowAll: boolean,
    onVisible: () => void
}) => {
    // states: 'loading', 'visible', 'rejected', 'error'
    const [status, setStatus] = useState<'loading' | 'visible' | 'rejected' | 'error'>('loading');
    const [notified, setNotified] = useState(false);

    // Force Show Logic
    useEffect(() => {
        if (forceShowAll && status === 'rejected') {
            setStatus('visible');
        }
    }, [forceShowAll, status]);

    // Notify Parent Logic
    useEffect(() => {
        if ((status === 'visible' || status === 'error') && !notified) {
            onVisible();
            setNotified(true);
        }
    }, [status, notified, onVisible]);

    if (status === 'rejected' && !forceShowAll) return null;

    if (status === 'error') {
        return (
            <div className="w-full h-64 bg-[#111] flex flex-col items-center justify-center border border-white/5 my-2">
                <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest mb-2">Failed to Load</p>
                <button
                    onClick={() => setStatus('loading')}
                    className="px-4 py-2 bg-white/10 text-white text-[9px] uppercase tracking-widest hover:bg-white/20"
                >
                    Retry Image
                </button>
            </div>
        );
    }

    // Default: Image
    return (
        <img
            src={`https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp`}
            className={`w-full h-auto block select-none mb-0 transition-opacity duration-700 ${status === 'visible' ? 'opacity-100' : 'opacity-0 h-0'}`}
            loading={index < 3 ? "eager" : "lazy"}
            alt={`p-${index}`}
            unoptimized="true"
            onLoad={(e) => {
                const img = e.currentTarget;
                img.classList.remove('h-0'); // Remove initial height constraint

                if (forceShowAll) {
                    setStatus('visible');
                    return;
                }

                // Filter Logic: Only Hide TINY icons
                if (img.naturalHeight < 50) {
                    setStatus('rejected');
                } else {
                    setStatus('visible');
                }
            }}
            onError={() => setStatus('error')}
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

    // 1. State Management
    const [forceShowAll, setForceShowAll] = useState(false);
    const [visibleCount, setVisibleCount] = useState(0);

    const loadContent = async () => {
        setImages([]);
        setVisibleCount(0);
        setForceShowAll(false);
        setStatus('Initializing Visual Engine...');

        // Get Current Chapter
        const { data: current } = await supabase.from('chapters')
            .select('*, series(*)')
            .eq('id', resolvedParams.chapterId)
            .single();

        if (!current) return setStatus('Chapter Not Found');
        setChapter(current);

        // Fetch Neighbors
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
            // Vacuum Scraper
            setStatus('Scanning Visual Assets...');
            const targetUrl = current.source_url || current.url;
            const res = await fetch('https://r.jina.ai/' + targetUrl);
            if (!res.ok) throw new Error('Bridge Failed');

            const markdown = await res.text();

            // Regex: Grab EVERY image link
            const urlRegex = /(https?:\/\/[^\s)"']+\.(?:jpg|jpeg|png|webp))/gi;
            const found = [];
            let match;
            while ((match = urlRegex.exec(markdown)) !== null) {
                found.push(match[1]);
            }

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

    // 3. The 'Safety Valve' (Self-Healing)
    useEffect(() => {
        // If we have downloaded images, but nearly all are hidden, UNHIDE everything.
        if (images.length > 5 && visibleCount < 3) {
            const timer = setTimeout(() => {
                if (!forceShowAll) {
                    console.log("Activating Self-Healing Mode");
                    setForceShowAll(true);
                }
            }, 3000); // 3 seconds grace period
            return () => clearTimeout(timer);
        }
    }, [visibleCount, images.length, forceShowAll]);

    const handleVisible = useCallback(() => {
        setVisibleCount(prev => prev + 1);
    }, []);

    return (
        <div suppressHydrationWarning={true} className="bg-[#111] min-h-screen text-white font-sans relative">
            {/* Header */}
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

            {/* Main Content */}
            <div className="flex flex-col items-center w-full min-h-screen pt-0 pb-32">
                {images.length > 0 ? (
                    <>
                        {/* Self-Healing Banner (Debugging) */}
                        {forceShowAll && (
                            <div className="fixed top-14 left-0 w-full bg-accent/20 border-b border-accent/50 text-accent text-[9px] font-bold uppercase tracking-widest text-center py-1 z-40">
                                Self-Healing Active: All Filters Disabled
                            </div>
                        )}

                        {/* Image Strip */}
                        <div className="w-full max-w-3xl flex flex-col gap-0 mx-auto mt-14 shadow-2xl shadow-black bg-[#111] min-h-screen">
                            {images.map((url, i) => (
                                <SmartImage
                                    key={i}
                                    url={url}
                                    index={i}
                                    forceShowAll={forceShowAll}
                                    onVisible={handleVisible}
                                />
                            ))}
                        </div>

                        {/* 4. End of Content Card (Only if images are visible) */}
                        {visibleCount > 0 && (
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
                        )}
                    </>
                ) : (
                    // Loading State
                    <div className="flex flex-col items-center justify-center h-[80vh] gap-6 animate-pulse">
                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin opacity-50"></div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.25em]">{status}</p>
                    </div>
                )}
            </div>

            {/* Controls */}
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