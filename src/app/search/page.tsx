import { supabase } from '@/lib/supabaseClient'
import SeriesCard from '@/components/SeriesCard'

export const dynamic = 'force-dynamic'

interface SearchPageProps {
    searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const { q } = await searchParams
    const query = q || ''

    if (!query) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                <span className="material-symbols-outlined text-6xl text-text-dim mb-4">search_off</span>
                <h2 className="text-2xl font-bold mb-2">Search for something</h2>
                <p className="text-text-dim">Type in the search bar to find manga.</p>
            </div>
        )
    }

    const { data: results, error } = await supabase
        .from('series')
        .select('*, chapters(chapter_number)')
        .ilike('title', `%${query}%`)
        .limit(50)

    if (error) {
        console.error('Search error:', error)
    }

    const hasResults = results && results.length > 0

    return (
        <div className="px-6 lg:px-10 pt-24">
            <div className="flex items-center gap-3 mb-8">
                <h1 className="text-3xl font-display font-bold">Search Results</h1>
                <span className="px-3 py-1 rounded-full bg-white/10 text-sm font-bold border border-white/5">
                    &quot;{query}&quot;
                </span>
            </div>

            {!hasResults ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
                    <span className="material-symbols-outlined text-6xl text-text-dim mb-4">search_off</span>
                    <h2 className="text-2xl font-bold mb-2">No results found</h2>
                    <p className="text-text-dim">We couldn&apos;t find any manga matching &quot;{query}&quot;.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                    {results.map((series) => (
                        <SeriesCard key={series.id} series={series} />
                    ))}
                </div>
            )}
        </div>
    )
}
