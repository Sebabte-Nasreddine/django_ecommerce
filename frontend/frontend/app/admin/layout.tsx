'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn } from 'lucide-react'

const schema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis'),
})
type LoginForm = z.infer<typeof schema>

function AdminLoginForm() {
    const setAuth = useAuthStore(s => s.setAuth)
    const [loading, setLoading] = useState(false)
    const [show, setShow] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(schema),
    })

    const onSubmit = async (data: LoginForm) => {
        setLoading(true)
        setError(null)
        try {
            const res = await authApi.adminLogin(data)
            setAuth(res.token, {
                email: res.email,
                firstName: res.firstName,
                lastName: res.lastName,
                role: res.role,
            })
            toast.success(`Bienvenue, ${res.firstName} !`)
        } catch {
            setError('Accès refusé — réservé aux administrateurs.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="bg-white border border-black/5 p-10 space-y-8">
                    <div className="text-center space-y-3">
                        <span className="text-2xl font-serif tracking-widest text-brand-500 uppercase">SEFA</span>
                        <div className="h-px w-8 bg-black/10 mx-auto" />
                        <p className="text-[9px] uppercase tracking-luxury text-brand-500/40">Administration</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-widest text-black/40">Email</label>
                            <input
                                {...register('email')}
                                type="email"
                                autoComplete="email"
                                className="w-full bg-transparent border-b border-black/10 focus:border-black focus:ring-0 text-sm py-2.5 transition-colors outline-none"
                                placeholder="admin@exemple.com"
                            />
                            {errors.email && <p className="text-red-500 text-[9px] mt-1">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] uppercase tracking-widest text-black/40">Mot de passe</label>
                            <div className="relative">
                                <input
                                    {...register('password')}
                                    type={show ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    className="w-full bg-transparent border-b border-black/10 focus:border-black focus:ring-0 text-sm py-2.5 transition-colors outline-none pr-8"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShow(v => !v)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 text-black/20 hover:text-black transition-colors"
                                >
                                    {show ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-[9px] mt-1">{errors.password.message}</p>}
                        </div>

                        {error && (
                            <p className="text-red-600 text-[10px] text-center bg-red-50 border border-red-100 py-2.5 px-4">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white text-[10px] uppercase tracking-luxury py-4 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading
                                ? <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                                : <><LogIn className="w-3.5 h-3.5" strokeWidth={1.5} /> Connexion</>
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [hydrated, setHydrated] = useState(false)
    const token = useAuthStore(s => s.token)
    const user = useAuthStore(s => s.user)

    useEffect(() => {
        const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
        if (useAuthStore.persist.hasHydrated()) setHydrated(true)
        return unsub
    }, [])

    // Wait for Zustand to hydrate from localStorage
    if (!hydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="w-7 h-7 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            </div>
        )
    }

    // Not authenticated or not admin → show inline login form (no redirect)
    const isAdmin = token && user?.role === 'ROLE_ADMIN'
    if (!isAdmin) {
        return <AdminLoginForm />
    }

    return <>{children}</>
}
