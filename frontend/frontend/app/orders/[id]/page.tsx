'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { orderApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import { PageBanner } from '@/components/PageBanner'
import { Package, MapPin, ChevronLeft } from 'lucide-react'
import { formatEuro } from '@/lib/formatPrice'

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
const STATUS_LABEL: Record<string, string> = {
    PENDING: 'En attente', CONFIRMED: 'Confirmée', PROCESSING: 'En traitement',
    SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée', REFUNDED: 'Remboursée',
}
const STATUS_DOT: Record<string, string> = {
    DELIVERED: 'bg-green-500', CANCELLED: 'bg-red-500', REFUNDED: 'bg-red-500',
    PENDING: 'bg-yellow-500', CONFIRMED: 'bg-blue-500', PROCESSING: 'bg-blue-500', SHIPPED: 'bg-purple-500',
}

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { isAuthenticated } = useAuthStore()
    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isAuthenticated()) { router.push('/login'); return }
        orderApi.getById(Number(id)).then(setOrder).catch(() => router.push('/orders')).finally(() => setLoading(false))
    }, [id, isAuthenticated, router])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-6 h-6 border border-black/10 border-t-brand-500 rounded-full animate-spin" />
        </div>
    )
    if (!order) return null

    const stepIdx = STATUS_STEPS.indexOf(order.status)
    const isCancelled = ['CANCELLED', 'REFUNDED'].includes(order.status)

    return (
        <div className="min-h-screen">
            <PageBanner label="Sefa" title={`Commande #${order.orderNumber}`}
                subtitle={new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />

            <div className="container-xl max-w-4xl py-12 pb-40">
                <Link href="/orders"
                    className="inline-flex items-center gap-2 text-[9px] uppercase tracking-widest text-black/25 hover:text-brand-500 transition-colors mb-10 group">
                    <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
                    Toutes mes commandes
                </Link>

                {/* Status */}
                <div className="flex items-center gap-3 mb-10">
                    <div className={`w-2 h-2 rounded-full ${STATUS_DOT[order.status] || 'bg-black/20'}`} />
                    <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-black/50">
                        {STATUS_LABEL[order.status] || order.status}
                    </span>
                </div>

                {/* Progress */}
                {!isCancelled && (
                    <div className="bg-white border border-black/[0.05] p-8 mb-6">
                        <div className="relative flex items-center justify-between max-w-xl mx-auto">
                            <div className="absolute left-0 right-0 top-3 h-px bg-black/[0.06]">
                                <div className="h-px bg-brand-500 transition-all duration-1000"
                                    style={{ width: stepIdx >= 0 ? `${(stepIdx / (STATUS_STEPS.length - 1)) * 100}%` : '0%' }} />
                            </div>
                            {STATUS_STEPS.map((s, i) => (
                                <div key={s} className="relative z-10 flex flex-col items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500
                                        ${i <= stepIdx ? 'bg-brand-500 border-brand-500' : 'bg-white border-black/15'}`}>
                                        {i <= stepIdx && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                    <span className={`text-[8px] uppercase tracking-widest whitespace-nowrap hidden sm:block transition-colors
                                        ${i <= stepIdx ? 'text-brand-500 font-bold' : 'text-black/20'}`}>
                                        {['Reçue', 'Confirmée', 'Traitement', 'Expédiée', 'Livrée'][i]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-white border border-black/[0.05] p-8">
                            <h2 className="flex items-center gap-3 text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 border-b border-black/[0.05] pb-5 mb-6">
                                <Package className="w-3.5 h-3.5" strokeWidth={1.5} /> Articles
                            </h2>
                            <div className="divide-y divide-black/[0.04]">
                                {order.items?.map((item: any) => (
                                    <div key={item.id} className="py-4 flex justify-between items-start gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest font-bold text-brand-500">{item.productName}</p>
                                            {item.sizeName && <p className="text-[9px] text-black/30 mt-1">Taille : {item.sizeName}</p>}
                                            <p className="text-[9px] text-black/30 mt-0.5">{item.quantity} × {formatEuro(item.unitPrice)}</p>
                                        </div>
                                        <p className="font-serif text-base font-bold text-brand-500 shrink-0">{formatEuro(item.totalPrice)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white border border-black/[0.05] p-8">
                            <h2 className="flex items-center gap-3 text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 border-b border-black/[0.05] pb-5 mb-6">
                                <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} /> Livraison
                            </h2>
                            <p className="text-sm text-black/50 leading-relaxed">{order.shippingAddress}</p>
                            {order.shippingMethod && (
                                <p className="text-[9px] uppercase tracking-widest text-black/30 mt-4">
                                    Mode : <span className="text-brand-500 font-bold">{order.shippingMethod}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-4">
                        <div className="bg-white border border-black/[0.05] p-8 sticky top-28">
                            <h2 className="text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 border-b border-black/[0.05] pb-5 mb-6">Récapitulatif</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between text-[9px] uppercase tracking-widest text-black/30">
                                    <span>Sous-total</span><span>{formatEuro(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-[9px] uppercase tracking-widest text-black/30">
                                    <span>Livraison</span><span>{formatEuro(order.shippingCost)}</span>
                                </div>
                                {order.discountAmount > 0 && (
                                    <div className="flex justify-between text-[9px] uppercase tracking-widest text-green-600">
                                        <span>Réduction</span><span>-{formatEuro(order.discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-baseline pt-4 border-t border-black/[0.05]">
                                    <span className="text-[9px] uppercase tracking-widest font-bold text-black/40">Total</span>
                                    <span className="font-serif text-xl font-black text-brand-500">{formatEuro(order.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
