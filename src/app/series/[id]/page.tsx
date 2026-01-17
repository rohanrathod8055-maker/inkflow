import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 0

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

    // Sort chapters desc (Newest First)
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

    // Image logic
    const coverImage = series.cover_image_url ? `https://wsrv.nl/?url=${series.cover_image_url}` : 'https://via.placeholder.com/300x450'
    const firstChapter = series.chapters && series.chapters.length > 0 ? series.chapters[series.chapters.length - 1] : null

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-accent selection:text-black">

            {/* 1. The 'Glass' Hero Section */}
            <div className="relative w-full h-[500px] overflow-hidden">
                {/* Background Blur Layer */}
                <div
                    className="absolute inset-0 bg-cover bg-center blur-3xl opacity-40 scale-110"
                    style={{ backgroundImage: `url('${coverImage}')` }}
                ></div>
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black/80 z-10"></div>

                {/* Hero Content Container */}
                <div className="absolute inset-0 z-20 container mx-auto px-4 h-full flex items-center">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-10 w-full translate-y-10">

                        {/* Floating Cover Image */}
                        <div className="relative shrink-0 w-[200px] md:w-[280px] aspect-[2/3] rounded-lg shadow-2xl shadow-black ring-1 ring-white/10 overflow-hidden transform hover:-translate-y-2 transition-transform duration-500">
                            <img
                                src={coverImage}
                                alt={series.title}
                                className="w-full h-full object-cover"
                                unoptimized="true"
                            />
                        </div>

                        {/* 2. The Info Panel */}
                        <div className="flex flex-col gap-6 pb-4 w-full text-center md:text-left">
                            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
                                {series.title}
                            </h1>

                            {/* Metadata Row */}
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm font-bold uppercase tracking-widest text-gray-400">
                                <div className="flex items-center gap-2 text-yellow-400">
                                    <span className="text-lg">★</span>
                                    <span>{series.rating} / 10</span>
                                </div>
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                                <span className={series.status === 'Ongoing' ? 'text-green-400' : 'text-blue-400'}>
                                    {series.status}
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                                <span>Author Name</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-4 mt-2 justify-center md:justify-start">
                                {firstChapter ? (
                                    <Link
                                        href={`/series/${id}/${firstChapter.id}`}
                                        className="px-8 py-4 bg-accent text-white font-black uppercase text-sm tracking-[0.15em] hover:bg-white hover:text-black transition-all shadow-lg shadow-accent/20 rounded-sm"
                                    >
                                        Read First Chapter
                                    </Link>
                                ) : (
                                    <button disabled className="px-8 py-4 bg-gray-800 text-gray-500 font-bold uppercase text-sm tracking-widest cursor-not-allowed rounded-sm">
                                        No Chapters
                                    </button>
                                )}
                                <button className="px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 text-white font-bold uppercase text-sm tracking-widest hover:bg-white/20 transition-all rounded-sm flex items-center gap-2">
                                    <span className="text-lg">+</span> Bookmark
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. The Chapter List Section */}
            <div className="bg-[#111] min-h-screen pt-20 pb-20">
                <div className="container mx-auto px-4 max-w-5xl">

                    {/* List Header */}
                    <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-4">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest border-l-4 border-accent pl-4">
                            Latest Chapters
                        </h3>
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                            {series.chapters.length} Releases
                        </span>
                    </div>

                    {/* Chapter Grid */}
                    <div className="flex flex-col gap-1">
                        {series.chapters.length > 0 ? (
                            series.chapters.map((chapter) => (
                                <Link
                                    key={chapter.id}
                                    href={`/series/${id}/${chapter.id}`}
                                    className="group flex items-center justify-between p-5 bg-[#161616] hover:bg-[#202020] border-l-2 border-transparent hover:border-accent transition-all duration-200"
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="text-white font-bold text-sm group-hover:text-accent transition-colors">
                                            Chapter {chapter.chapter_number}
                                        </span>
                                        <span className="text-[10px] text-gray-600 font-medium uppercase tracking-wider">
                                            {new Date(chapter.release_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="text-gray-600 group-hover:text-white transition-colors">
                                        →
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="p-10 text-center text-gray-600 italic">
                                No chapters available yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
