'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [resendLoading, setResendLoading] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setResendSuccess(false)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
        } else {
            router.push('/')
            router.refresh()
        }
    }

    const handleResend = async () => {
        setResendLoading(true)
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
        })

        if (error) {
            setError(error.message)
        } else {
            setResendSuccess(true)
            setError(null)
        }
        setResendLoading(false)
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-purple-900 px-6 py-12 lg:px-8">
            <div className="w-full max-w-sm backdrop-blur-md bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-500">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                    <h2 className="text-center text-3xl font-bold leading-9 tracking-tight text-white font-display mb-8">
                        Welcome Back
                    </h2>
                </div>

                <form className="space-y-6" onSubmit={handleLogin}>
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
                                autoComplete="current-password"
                                required
                                className="block w-full rounded-xl border-0 bg-black/20 py-3 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-purple-500 sm:text-sm sm:leading-6 pl-4 transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex flex-col gap-2">
                            <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                                {error}
                            </div>

                            {/* Show Resend Button if error is related to confirmation */}
                            {(error.includes('Email not confirmed') || error.includes('Invalid login credentials')) && (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={resendLoading}
                                    className="text-xs text-purple-400 hover:text-purple-300 underline underline-offset-4 disabled:opacity-50"
                                >
                                    {resendLoading ? 'Sending...' : 'Resend Confirmation Email'}
                                </button>
                            )}
                        </div>
                    )}

                    {resendSuccess && (
                        <div className="text-green-400 text-sm text-center bg-green-500/10 py-2 rounded-lg border border-green-500/20 flex flex-col gap-1">
                            <span className="font-bold">Email Sent!</span>
                            <span className="text-xs">Please check your inbox to confirm.</span>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            className="flex w-full justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-3 text-sm font-bold uppercase tracking-wide leading-6 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
                        >
                            Sign in
                        </button>
                    </div>
                </form>

                <p className="mt-8 text-center text-sm text-gray-400">
                    Not a member?{' '}
                    <Link href="/register" className="font-semibold leading-6 text-purple-400 hover:text-purple-300 transition-colors">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    )
}
