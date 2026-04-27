'use client'
import { useEffect, useState } from 'react'
import { orderApi } from '@/lib/api'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { PageBanner } from '@/components/PageBanner'
import { Package, ChevronRight, ArrowRight } from 'lucide-react'
import { formatEuro } from '@/lib/formatPrice'

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'En attente', CONFIRMED: 'Confirmée', PROCESSING: 'En traitement',
    SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée', REFUNDED: 'Remboursée',
}
const STATUS_DOT: Record<string, string> = {
    DELIVERED: 'bg-green-500', CANCELLED: 'bg-red-500', REFUNDED: 'bg-red-500',
    PENDING: 'bg-yellow-500', CONFIRMED: 'bg-blue-500', PROCESSING: 'bg-blue-500', SHIPPED: 'bg-purple-500',
}

export default function OrdersPage() {
    const { isAuthenticated } = useAuthStore()
    const router = useRouter()
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isAuthenticated()) { router.push('/login'); return }
        orderApi.list().then(d => setOrders(Array.isArray(d) ? d : (d.content || []))).finally(() => setLoading(false))
    }, [isAuthenticated, router])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-6 h-6 border border-black/10 border-t-brand-500 rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen">
            <PageBanner label="Sefa" title="Mes Commandes" subtitle={`${orders.length} commande${orders.length > 1 ? 's' : ''}`} />

            <div className="container-xl max-w-4xl py-16 pb-40">
                {orders.length === 0 ? (
                    <div className="text-center py-40">
                        <Package className="w-10 h-10 text-black/10 mx-auto mb-8" strokeWidth={1} />
                        <p className="font-serif text-2xl text-black/20 mb-8">Aucune commande</p>
                        <Link href="/products"
                            className="inline-flex items-center gap-3 bg-brand-500 text-white text-[9px] uppercase tracking-[0.3em] px-8 py-4 hover:bg-black transition-colors font-semibold">
                            Découvrir la collection <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {orders.map((order: any) => (
                            <Link key={order.id} href={`/orders/${order.id}`}
                                className="group flex items-center justify-between bg-white border border-black/[0.05] p-6 md:p-8 hover:border-brand-500/30 hover:shadow-sm transition-all duration-300">
                                <div className="flex items-center gap-5 min-w-0">
                                    <div className="w-10 h-10 border border-black/[0.08] flex items-center justify-center shrink-0 group-hover:bg-brand-500 group-hover:border-brand-500 transition-all duration-300">
                                        <Package className="w-4 h-4 text-black/20 group-hover:text-white transition-colors" strokeWidth={1.5} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-brand-500">#{order.orderNumber}</p>
                                        <p className="text-[9px] uppercase tracking-widest text-black/30 mt-1">
                                            {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 shrink-0">
                                    <div className="hidden sm:flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status] || 'bg-black/20'}`} />
                                        <span className="text-[9px] uppercase tracking-widest text-black/40">
                                            {STATUS_LABEL[order.status] || order.status}
                                        </span>
                                    </div>
                                    <p className="font-serif text-lg font-black text-brand-500">{formatEuro(order.total)}</p>
                                    <ChevronRight className="w-4 h-4 text-black/15 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" strokeWidth={1.5} />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
