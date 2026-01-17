import { supabase } from '@/lib/supabaseClient'

import SeriesCard from '@/components/SeriesCard'

import Link from 'next/link'



export const revalidate = 60 // revalidate every minute



interface Series {

  id: string

  title: string

  description: string

  cover_image_url: string

  status: string

  rating: number

  updated_at: string

  chapters: {

    chapter_number: number

  }[]

}



async function getLatestManhwa() {

  const { data, error } = await supabase

    .from('series')

    .select('*, chapters(chapter_number)')

    .order('updated_at', { ascending: false })

    .limit(10)



  if (error) {

    console.error('Error fetching series:', error)

    return []

  }

  return data as Series[]

}



export default async function Home() {

  const latestSeries = await getLatestManhwa()



  return (

    <>

      {/* Hero Section */}

      <section className="relative h-[65vh] min-h-[500px] w-full group">

        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10s] group-hover:scale-105" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBrwt-s8IPeeiIs9lPoQVFDFPfXZbKUwP6cY9GVFRXdSNXp-QuP2gjssHvVHxoP9pp8L6FDqU6q8dE3u1atO0l2ObQalTkIpIcWFFsBlp6b2Pfpnw69mBoI5ZlAP1k46uDNYSr8fh78gBvE0DCQ7XHpUIB-f5MdOmK36LwfRHjuHrdp4_TrMAF2mnEYr5q4XfH6QoEpEKjZR7-_-mnRdHToKyz7goWhtsEip72BIokd-vMw-wDBYVe5HWF4LW_VEXdRGeebC847lpw')" }}></div>

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

        <div className="absolute inset-0 bg-gradient-to-r from-background-dark/90 via-background-dark/40 to-transparent"></div>



        <div className="absolute bottom-0 left-0 w-full px-6 lg:px-10 pb-12 flex flex-col items-start gap-4 max-w-3xl">

          <div className="flex items-center gap-2 mb-2">

            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent text-white uppercase tracking-wider">Trending #1</span>

            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 backdrop-blur-sm text-white border border-white/10 uppercase tracking-wider">Action</span>

            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 backdrop-blur-sm text-white border border-white/10 uppercase tracking-wider">Fantasy</span>

          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black leading-[0.9] tracking-tighter text-white drop-shadow-2xl">

            SOLO LEVELING<br />

            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-accent">ARISE</span>

          </h1>

          <p className="text-gray-300 text-sm md:text-base font-medium line-clamp-2 max-w-xl leading-relaxed mt-2 text-shadow-sm">

            In a world where hunters must battle deadly monsters to protect the human race, a weak hunter named Jinwoo uncovers a hidden system that allows him to level up beyond all limits.

          </p>

          <div className="flex flex-wrap gap-4 mt-4">

            <button className="flex items-center gap-2 px-8 py-3.5 bg-accent hover:bg-pink-600 text-white rounded-xl font-bold font-display tracking-wide transition-all shadow-[0_0_20px_-5px_rgba(255,0,102,0.5)] hover:shadow-[0_0_30px_-5px_rgba(255,0,102,0.7)] transform hover:-translate-y-0.5">

              <span className="material-symbols-outlined text-[20px]">menu_book</span>

              <span>Read Now</span>

            </button>

            <button className="flex items-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-white rounded-xl font-bold font-display tracking-wide transition-all">

              <span className="material-symbols-outlined text-[20px]">add</span>

              <span>List</span>

            </button>

          </div>

        </div>

      </section>



      {/* Latest Updates Section */}

      <section className="px-6 lg:px-10 mt-8">

        <div className="flex items-center justify-between mb-6">

          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">

            <span className="w-1.5 h-6 bg-accent rounded-full block"></span>

            Latest Updates

          </h2>

          <button className="text-sm font-bold text-accent hover:text-white transition-colors flex items-center gap-1">

            View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>

          </button>

        </div>



        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">

          {latestSeries.map((series) => (

            <SeriesCard key={series.id} series={series} />

          ))}

        </div>

      </section>



      {/* Quick Resume Section (Static for now) */}

      <section className="px-6 lg:px-10 mt-12 mb-8">

        <div className="bg-surface rounded-2xl p-6 border border-white/5 relative overflow-hidden">

          <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl"></div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">

            <div className="flex items-center gap-4">

              <div className="size-16 rounded-lg bg-cover bg-center shadow-lg" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBzTJFLvn-Zejo0Fcnz7TigOjh9V0HCm-pzmKFqSBmaZsa8J2ze0AkCKeLlwlQduNqdUiMJO0J5S8nXE6tZDGDcDY_9RaAkO1z3DllWnGSxma3SJeVr-zU6h8T3zr7Jf3Z39I4Gn2WVNHMh0BcpTAbjnk1X00uxjqwnmh01GJrlePstR1ykLCNIvVNgdrEqCWy_gy--KuwSY_5RTY0XAfLDuahJjIuPoEDDh0pMJQ8Gurbjcmopo24HkT3GMK5mvOEpE_PjcUjEOks')" }}></div>

              <div className="flex flex-col">

                <p className="text-text-dim text-xs font-bold uppercase tracking-wider mb-1">Pick up where you left off</p>

                <h3 className="text-white font-display font-bold text-lg">Return of the Blossoming Blade</h3>

                <p className="text-sm text-gray-400">Chapter 84 <span className="mx-2 text-white/20">•</span> 2 min left</p>

              </div>

            </div>

            <button className="w-full md:w-auto px-6 py-3 bg-white text-black font-bold font-display rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">

              <span>Continue Reading</span>

              <span className="material-symbols-outlined text-[20px]">arrow_right_alt</span>

            </button>

          </div>

          <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">

            <div className="h-full bg-accent w-[75%] shadow-[0_0_10px_rgba(255,0,102,0.5)]"></div>

          </div>

        </div>

      </section>

    </>

  )

}