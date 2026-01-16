import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

export const revalidate = 0

export default async function HistoryPage() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                    } catch {
                        // Safe to ignore in Server Component 
                    }
                }
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <div className="text-white p-10">Please login to view history</div>

    const { data: history } = await supabase
        .from('history')
        .select('*, series(title, cover_image_url)')
        .eq('user_id', user.id)
        .order('read_at', { ascending: false })
        .limit(50)

    return (
        <div className="flex min-h-screen bg-background-dark text-white font-body selection:bg-accent selection:text-white">
            <Sidebar />
            <main className="flex-1 ml-20 p-8 lg:p-12 xl:p-16">
                <h1 className="text-3xl font-display font-bold mb-8 flex items-center gap-3">
                    <span className="material-symbols-outlined text-accent text-4xl">history</span>
                    Reading History
                </h1>

                <div className="flex flex-col gap-4 max-w-4xl">
                    {history?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-accent/30 transition-colors">
                            <img
                                src={item.series.cover_image_url ? `https://wsrv.nl/?url=${item.series.cover_image_url}` : 'https://via.placeholder.com/50'}
                                alt={item.series.title}
                                className="w-16 h-24 object-cover rounded shadow-md"
                            />
                            <div className="flex-1">
                                <Link href={`/series/${item.series_id}`} className="font-bold text-lg hover:text-accent transition-colors">
                                    {item.series.title}
                                </Link>
                                <p className="text-gray-400">
                                    Read <span className="text-white font-bold">Chapter {item.chapter_number}</span>
                                </p>
                                <p className="text-xs text-text-dim mt-1">
                                    {new Date(item.read_at).toLocaleString()}
                                </p>
                            </div>
                            <Link href={`/series/${item.series_id}`} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white">
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </Link>
                        </div>
                    ))}
                    {(!history || history.length === 0) && (
                        <p className="text-gray-400 italic">No reading history found. Start reading!</p>
                    )}
                </div>
            </main>
        </div>
    )
}
