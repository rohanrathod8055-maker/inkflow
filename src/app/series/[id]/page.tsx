import { supabase } from '@/lib/supabaseClient'
import ChapterLink from '@/components/ChapterLink'
import Sidebar from '@/components/Sidebar'
import SeriesActions from '@/components/SeriesActions'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 60

interface Chapter {
    id: string
    chapter_number: number
    source_url: string
    release_date: string
}

interface SeriesDetails {
    id: string
    title: string
    description: string
    cover_image_url: string
    status: string
    rating: number
    chapters: Chapter[]
}

async function getSeriesDetails(id: string) {
    const { data, error } = await supabase
        .from('series')
        .select('*, chapters(*)')
        .eq('id', id)
        .single()

    if (error || !data) {
        console.error('Error fetching series:', error)
        return null
    }

    // Sort chapters desc
    const series = data as SeriesDetails
    if (series.chapters) {
        series.chapters.sort((a, b) => b.chapter_number - a.chapter_number)
    }

    return series
}

export default async function SeriesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const series = await getSeriesDetails(id)

    if (!series) {
        notFound()
    }

    const coverImage = series.cover_image_url ? `https://wsrv.nl/?url=${series.cover_image_url}` : 'https://via.placeholder.com/300x450'
    const latestChapter = series.chapters && series.chapters.length > 0 ? series.chapters[0] : null
    const firstChapter = series.chapters && series.chapters.length > 0 ? series.chapters[series.chapters.length - 1] : null

    // Determine latest chapter link
    const startReadingLink = firstChapter ?
        firstChapter.source_url.startsWith('http') ? firstChapter.source_url : `https://asuracomic.net/series/${firstChapter.source_url.replace(/^\//, '')}`
        : '#'

    const continueLink = latestChapter ?
        latestChapter.source_url.startsWith('http') ? latestChapter.source_url : `https://asuracomic.net/series/${latestChapter.source_url.replace(/^\//, '')}`
        : '#'


    return (
        <div className="relative min-h-screen w-full bg-background-dark text-white selection:bg-accent selection:text-white">

            {/* Ambient Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/95 to-background-dark/80 z-10"></div>
                <div
                    className="absolute inset-0 bg-cover bg-center blur-[100px] opacity-40 scale-110"
                    style={{ backgroundImage: `url('${coverImage}')` }}
                ></div>
            </div>

            {/* Sidebar Navigation (Simplified for Focus) */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="relative z-10 ml-20 p-8 lg:p-12 xl:p-16 min-h-screen">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                    {/* Left Column: Cover & Actions */}
                    <div className="lg:col-span-4 flex flex-col gap-6 sticky top-8">
                        <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 group">
                            <img
                                src={coverImage}
                                alt={series.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            {/* Status Badge */}
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10 ${series.status === 'ongoing' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {series.status}
                                </span>
                            </div>
                        </div>

                        <SeriesActions seriesId={id} />
                    </div>

                    {/* Right Column: Info & Chapters */}
                    <div className="lg:col-span-8 flex flex-col gap-10">
                        {/* Header Info */}
                        <div className="flex flex-col gap-4">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black leading-[0.9] tracking-tighter text-white drop-shadow-lg">
                                {series.title}
                            </h1>
                            <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
                                <span className="flex items-center gap-1.5 text-yellow-400">
                                    <span className="material-symbols-outlined text-[20px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    <span className="text-white font-bold text-lg">{series.rating}</span>
                                </span>
                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                <span>{series.chapters.length} Chapters</span>
                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                <span>Action, Fantasy</span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-xl"></div>
                            <h3 className="text-sm font-bold text-text-dim uppercase tracking-wider mb-2">Synopsis</h3>
                            <p className="text-gray-300 text-lg leading-relaxed font-light">
                                {series.description || 'No description available for this series.'}
                            </p>
                        </div>

                        {/* Chapter List */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <h3 className="text-xl font-display font-bold text-white">Chapters</h3>
                                <div className="flex items-center gap-2">
                                    <button className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">sort</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {series.chapters && series.chapters.map((chapter) => {
                                    return (
                                        <ChapterLink
                                            key={chapter.id}
                                            seriesId={id}
                                            chapter={chapter}
                                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 transition-all group/chapter cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-text-dim text-sm font-mono opacity-50 group-hover/chapter:text-accent group-hover/chapter:opacity-100 transition-colors">
                                                    {String(chapter.chapter_number).padStart(3, '0')}
                                                </span>
                                                <p className="font-medium text-white group-hover/chapter:text-accent transition-colors">
                                                    {`Chapter ${chapter.chapter_number}`}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-text-dim">{new Date(chapter.release_date).toLocaleDateString()}</span>
                                                <span className="material-symbols-outlined text-[20px] text-text-dim group-hover/chapter:translate-x-1 transition-transform">arrow_forward</span>
                                            </div>
                                        </ChapterLink>
                                    )
                                })}
                                {!series.chapters || series.chapters.length === 0 && (
                                    <div className="p-12 text-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                                        No chapters uploaded yet.
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div >
            </main >
        </div >
    )
}
