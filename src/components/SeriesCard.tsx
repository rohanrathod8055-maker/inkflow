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
        <Link href={`/series/${series.id}`} className="group relative overflow-hidden rounded-xl bg-gray-900 border border-white/5 transition-transform duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 flex flex-col cursor-pointer h-full">
            <div className="aspect-[2/3] w-full overflow-hidden relative">
                {/* Use img for external URLs */}
                <img
                    src={series.cover_image_url ? `https://wsrv.nl/?url=${series.cover_image_url}` : 'https://via.placeholder.com/300x450'}
                    alt={series.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {/* Subtle gradient so title is always readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-white/10 z-10">
                    <span className="material-symbols-outlined text-yellow-400 text-[12px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-[10px] font-bold text-white">{series.rating || 'N/A'}</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px] z-20">
                    <button className="size-12 rounded-full bg-accent text-white flex items-center justify-center shadow-glow hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-[28px] ml-0.5">play_arrow</span>
                    </button>
                </div>
            </div>

            {/* Title and Info Overlay at Bottom */}
            <div className="flex flex-col gap-1 p-3 absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-10 z-10">
                <h3 className="text-white font-display font-bold text-base leading-tight truncate group-hover:text-accent transition-colors drop-shadow-md">{series.title}</h3>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-300 font-medium">Action</span>
                    <span className="text-[10px] font-bold bg-accent/20 text-accent-light px-2 py-0.5 rounded-full border border-accent/20 text-accent-light">
                        {latestChapter > 0 ? `Ch. ${latestChapter}` : 'New'}
                    </span>
                </div>
            </div>
        </Link>
    )
}
