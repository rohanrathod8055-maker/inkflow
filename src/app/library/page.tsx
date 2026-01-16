import { supabase } from '@/lib/supabaseClient'
import SeriesCard from '@/components/SeriesCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface LibraryPageProps {
    searchParams: Promise<{ page?: string }>
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
    const { page } = await searchParams
    const currentPage = parseInt(page || '1', 10)
    const limit = 24
    const from = (currentPage - 1) * limit
    const to = from + limit - 1

    const { data: seriesList, error, count } = await supabase
        .from('series')
        .select('*, chapters(chapter_number)', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(from, to)

    if (error) {
        console.error('Library fetch error:', error)
    }

    const totalPages = count ? Math.ceil(count / limit) : 1
    const hasNext = currentPage < totalPages
    const hasPrev = currentPage > 1

    return (
        <div className="px-6 lg:px-10 pt-24 pb-12">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-accent">library_books</span>
                    Library
                </h1>
                <div className="text-sm text-text-dim">
                    Page {currentPage} of {totalPages}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 mb-10">
                {seriesList?.map((series) => (
                    <SeriesCard key={series.id} series={series} />
                ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-center items-center gap-4">
                <Link
                    href={`/library?page=${currentPage - 1}`}
                    className={`px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2 transition-colors ${!hasPrev ? 'pointer-events-none opacity-50 text-gray-500' : 'hover:bg-white/10 text-white'}`}
                >
                    <span className="material-symbols-outlined">chevron_left</span>
                    Previous
                </Link>

                <div className="flex gap-2">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        // Logic to show a window of pages around current, simplified for now to just show first 5 or logic?
                        // Simple logic: range from current - 2 to current + 2
                        let p = currentPage - 2 + i;
                        // adjust if p < 1
                        if (currentPage < 3) p = i + 1;
                        // adjust if p > total
                        if (p > totalPages) return null;

                        return (
                            <Link
                                key={p}
                                href={`/library?page=${p}`}
                                className={`size-10 rounded-lg flex items-center justify-center border font-bold transition-colors ${p === currentPage ? 'bg-accent border-accent text-white' : 'border-white/10 hover:bg-white/10 text-text-dim'}`}
                            >
                                {p}
                            </Link>
                        )
                    })}
                </div>

                <Link
                    href={`/library?page=${currentPage + 1}`}
                    className={`px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2 transition-colors ${!hasNext ? 'pointer-events-none opacity-50 text-gray-500' : 'hover:bg-white/10 text-white'}`}
                >
                    Next
                    <span className="material-symbols-outlined">chevron_right</span>
                </Link>
            </div>
        </div>
    )
}
