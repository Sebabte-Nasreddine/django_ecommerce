'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const schema = z.object({
    firstName: z.string().min(2, '2 caractères minimum'),
    lastName: z.string().min(2, '2 caractères minimum'),
    email: z.string().email('Email invalide'),
    password: z.string().min(8, '8 caractères minimum'),
    phone: z.string().optional(),
})

const inputClass = "w-full bg-transparent border-0 border-b border-black/10 dark:border-white/10 focus:border-brand-500 dark:focus:border-white focus:ring-0 text-sm py-3 transition-colors placeholder:text-black/15 dark:placeholder:text-white/20 outline-none text-brand-500 dark:text-white"
const labelClass = "text-[9px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40"

export default function RegisterPage() {
    const router = useRouter()
    const setAuth = useAuthStore(s => s.setAuth)
    const [loading, setLoading] = useState(false)
    const [show, setShow] = useState(false)

    const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

    const onSubmit = async (data: z.infer<typeof schema>) => {
        setLoading(true)
        try {
            const res = await authApi.register(data)
            setAuth(res.token, { email: res.email, firstName: res.firstName, lastName: res.lastName, role: res.role })
            toast.success(`Bienvenue, ${res.firstName} !`)
            router.push('/')
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Erreur lors de l'inscription")
        } finally { setLoading(false) }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left — brand */}
            <div className="hidden lg:flex lg:w-1/2 bg-brand-500 flex-col justify-between p-16">
                <Link href="/" className="font-serif text-3xl font-black text-white tracking-tight">SEFA</Link>
                <div>
                    <p className="text-white/40 text-[9px] uppercase tracking-[0.4em] mb-6">Bienvenue dans la Maison</p>
                    <h2 className="font-serif text-5xl font-light text-white leading-tight mb-8">
                        Rejoignez<br /><em className="text-white/50">l'élite</em>
                    </h2>
                </div>
                <p className="text-white/20 text-[9px] uppercase tracking-widest">© 2026 Sefa</p>
            </div>

            {/* Right — form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-20 bg-surface dark:bg-[#0d0d0d]">
                <div className="w-full max-w-sm">
                    <Link href="/" className="lg:hidden block font-serif text-2xl font-black text-brand-500 dark:text-white mb-12">SEFA</Link>

                    <div className="mb-10">
                        <h1 className="font-serif text-3xl font-black text-brand-500 dark:text-white tracking-tight mb-2">Créer un compte</h1>
                        <p className="text-[9px] uppercase tracking-[0.3em] text-black/30 dark:text-white/30">Rejoignez la maison Sefa</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7" autoComplete="off">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelClass}>Prénom</label>
                                <input {...register('firstName')} autoComplete="off" className={inputClass} placeholder="" />
                                {errors.firstName && <p className="text-red-500 text-[9px] pt-1">{errors.firstName.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>Nom</label>
                                <input {...register('lastName')} autoComplete="off" className={inputClass} placeholder="" />
                                {errors.lastName && <p className="text-red-500 text-[9px] pt-1">{errors.lastName.message}</p>}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Email</label>
                            <input {...register('email')} type="email" autoComplete="off" className={inputClass} placeholder="" />
                            {errors.email && <p className="text-red-500 text-[9px] pt-1">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Téléphone (optionnel)</label>
                            <input {...register('phone')} type="tel" autoComplete="off" className={inputClass} placeholder="" />
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Mot de passe</label>
                            <div className="relative">
                                <input {...register('password')} type={show ? 'text' : 'password'} autoComplete="new-password" className={inputClass + ' pr-8'} placeholder="8 caractères minimum" />
                                <button type="button" onClick={() => setShow(!show)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 text-black/20 dark:text-white/20 hover:text-brand-500 dark:hover:text-white transition-colors">
                                    {show ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-[9px] pt-1">{errors.password.message}</p>}
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full bg-brand-500 dark:bg-white text-white dark:text-black text-[9px] uppercase tracking-[0.3em] py-4 hover:bg-black dark:hover:bg-white/85 transition-colors flex items-center justify-center font-semibold mt-2">
                            {loading ? <div className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin" /> : 'Créer mon compte'}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-black/[0.05] dark:border-white/[0.07]">
                        <p className="text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30 text-center">
                            Déjà membre ?{' '}
                            <Link href="/login" className="text-brand-500 dark:text-white font-bold hover:text-black dark:hover:text-white/70 transition-colors">Se connecter</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
