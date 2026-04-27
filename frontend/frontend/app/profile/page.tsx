'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { PageBanner } from '@/components/PageBanner'
import { Package, LayoutDashboard, LogOut, Mail } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ProfilePage() {
    const { isAuthenticated, user, logout } = useAuthStore()
    const router = useRouter()

    useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [isAuthenticated, router])

    const handleLogout = () => { logout(); toast.success('À bientôt !'); router.push('/') }

    if (!user) return null

    return (
        <div className="min-h-screen">
            <PageBanner label="Sefa" title="Mon Espace" subtitle="Votre compte personnel" />

            <div className="container-xl py-16 pb-40">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white border border-black/[0.05] p-8">
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/[0.05]">
                                <div className="w-12 h-12 bg-brand-500 flex items-center justify-center shrink-0 font-serif text-lg font-black text-white">
                                    {user.firstName?.[0]?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-serif text-lg font-bold text-brand-500 tracking-tight truncate">
                                        {user.firstName} {user.lastName}
                                    </h2>
                                    <p className="text-[9px] uppercase tracking-widest text-black/30 mt-0.5">
                                        {user.role === 'ROLE_ADMIN' ? 'Administrateur' : 'Client Privilégié'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-black/30">
                                <Mail className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                                <p className="text-[9px] uppercase tracking-widest truncate">{user.email}</p>
                            </div>
                        </div>

                        <button onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-3 bg-white border border-black/[0.05] text-black/30 text-[9px] uppercase tracking-[0.3em] py-4 hover:border-red-300 hover:text-red-500 transition-all group">
                            <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
                            Se déconnecter
                        </button>
                    </div>

                    {/* Main */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Link href="/orders"
                                className="group bg-white border border-black/[0.05] p-8 hover:border-brand-500/30 transition-all duration-300 flex flex-col justify-between min-h-[180px]">
                                <div className="w-10 h-10 border border-black/10 flex items-center justify-center group-hover:bg-brand-500 group-hover:border-brand-500 transition-all duration-300">
                                    <Package className="w-4 h-4 text-black/25 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h3 className="font-serif text-lg font-bold text-brand-500 mb-1">Mes Commandes</h3>
                                    <p className="text-[9px] uppercase tracking-widest text-black/30">Historique et suivi</p>
                                </div>
                            </Link>

                            {user.role === 'ROLE_ADMIN' && (
                                <Link href="/admin"
                                    className="group bg-brand-500 border border-brand-500 p-8 hover:bg-black hover:border-black transition-all duration-300 flex flex-col justify-between min-h-[180px]">
                                    <div className="w-10 h-10 border border-white/20 flex items-center justify-center">
                                        <LayoutDashboard className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h3 className="font-serif text-lg font-bold text-white mb-1">Administration</h3>
                                        <p className="text-[9px] uppercase tracking-widest text-white/40">Tableau de bord</p>
                                    </div>
                                </Link>
                            )}
                        </div>

                        <div className="bg-white border border-black/[0.05] p-8 flex items-center justify-between gap-6">
                            <div>
                                <p className="text-[9px] uppercase tracking-[0.3em] text-black/30 mb-2">Code de bienvenue</p>
                                <p className="font-serif text-2xl font-black text-brand-500 tracking-tight">BIENVENUE10</p>
                                <p className="text-[9px] uppercase tracking-widest text-black/30 mt-1">10% sur votre première commande</p>
                            </div>
                            <div className="font-serif text-4xl font-black text-black/5 select-none">%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
