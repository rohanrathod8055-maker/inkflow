'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Register() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [pendingVerification, setPendingVerification] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            setError(error.message)
        } else {
            setPendingVerification(true)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-purple-900 px-6 py-12 lg:px-8">
            <div className="w-full max-w-sm backdrop-blur-md bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-500">

                {pendingVerification ? (
                    <div className="text-center flex flex-col items-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 mb-6 group">
                            <span className="material-symbols-outlined text-4xl text-green-400 group-hover:scale-110 transition-transform">mark_email_read</span>
                        </div>
                        <h2 className="text-3xl font-bold leading-9 tracking-tight text-white font-display mb-4">
                            Check your Inbox
                        </h2>
                        <p className="text-gray-300 text-sm leading-relaxed mb-8">
                            We have sent a confirmation link to <span className="font-bold text-white">{email}</span>. Please click it to activate your account.
                        </p>
                        <Link
                            href="/login"
                            className="w-full flex justify-center rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-sm font-bold uppercase tracking-wide leading-6 text-white hover:bg-white/10 transition-colors"
                        >
                            Back to Login
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                            <h2 className="text-center text-3xl font-bold leading-9 tracking-tight text-white font-display mb-8">
                                Create Account
                            </h2>
                        </div>

                        <form className="space-y-6" onSubmit={handleRegister}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-300">
                                    Email address
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="block w-full rounded-xl border-0 bg-black/20 py-3 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-purple-500 sm:text-sm sm:leading-6 pl-4 transition-all"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-300">
                                        Password
                                    </label>
                                </div>
                                <div className="mt-2">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        className="block w-full rounded-xl border-0 bg-black/20 py-3 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-purple-500 sm:text-sm sm:leading-6 pl-4 transition-all"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                                    {error}
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    className="flex w-full justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-3 text-sm font-bold uppercase tracking-wide leading-6 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
                                >
                                    Sign Up
                                </button>
                            </div>
                        </form>

                        <p className="mt-8 text-center text-sm text-gray-400">
                            Already a member?{' '}
                            <Link href="/login" className="font-semibold leading-6 text-purple-400 hover:text-purple-300 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
