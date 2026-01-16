import Link from 'next/link'

interface Series {
    id: string
    title: string
    cover_image_url: string
    rating?: number
    chapters?: { chapter_number: number }[]
}

interface SeriesCardProps {
    series: Series
}

export default function SeriesCard({ series }: SeriesCardProps) {
    const latestChapter = series.chapters && series.chapters.length > 0
        ? Math.max(...series.chapters.map(c => c.chapter_number))
        : 0;

    return (
        <Link href={`/series/${series.id}`} className="group relative flex flex-col gap-3 cursor-pointer">
            <div className="aspect-[2/3] w-full rounded-xl overflow-hidden relative shadow-lg shadow-black/50">
                {/* Use img for external URLs */}
                <img
                    src={series.cover_image_url ? `https://wsrv.nl/?url=${series.cover_image_url}` : 'https://via.placeholder.com/300x450'}
                    alt={series.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                    <span className="material-symbols-outlined text-yellow-400 text-[12px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-[10px] font-bold text-white">{series.rating || 'N/A'}</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/40 backdrop-blur-[2px]">
                    <button className="size-12 rounded-full bg-accent text-white flex items-center justify-center shadow-glow hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-[28px] ml-0.5">play_arrow</span>
                    </button>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <h3 className="text-white font-display font-bold text-base leading-tight truncate group-hover:text-accent transition-colors">{series.title}</h3>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-text-dim">Action</span>
                    <span className="text-[10px] font-bold bg-primary-light text-purple-200 px-2 py-0.5 rounded-full border border-white/5 group-hover:border-accent/50 group-hover:text-accent transition-colors">
                        {latestChapter > 0 ? `Ch. ${latestChapter}` : 'New'}
                    </span>
                </div>
            </div>
        </Link>
    )
}
