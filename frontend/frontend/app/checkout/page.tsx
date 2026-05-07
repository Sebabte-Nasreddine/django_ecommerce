'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cart'
import { PageBanner } from '@/components/PageBanner'
import { MapPin, Truck, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatEuro } from '@/lib/formatPrice'
import { api, productApi } from '@/lib/api'

const inputClass = "w-full bg-transparent border-0 border-b border-black/10 dark:border-white/10 focus:border-brand-500 dark:focus:border-brand-500 focus:ring-0 text-sm py-3 transition-colors placeholder:text-black/15 dark:placeholder:text-white/20 outline-none text-black dark:text-white"
const labelClass = "text-[9px] uppercase tracking-[0.25em] text-black/40 dark:text-white/40"
const GUEST_KEY = 'sefa_guest_info'

export default function CheckoutPage() {
    const router = useRouter()
    const { items, subtotal, clearCart } = useCartStore()
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({ fullName: '', phone: '', address: '', city: '' })
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (items.length === 0) { router.push('/cart'); return }
        try {
            const saved = JSON.parse(localStorage.getItem(GUEST_KEY) || '{}')
            if (saved.fullName) setForm(f => ({ ...f, fullName: saved.fullName || '', phone: saved.phone || '', address: saved.address || '', city: saved.city || '' }))
        } catch {}
    }, [])

    const setField = (k: string, v: string) => {
        setForm(f => ({ ...f, [k]: v }))
        setErrors(e => ({ ...e, [k]: '' }))
    }

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.fullName.trim()) e.fullName = 'Nom complet requis'
        if (!form.phone.trim()) e.phone = 'Téléphone requis'
        if (!form.address.trim()) e.address = 'Adresse requise'
        if (!form.city.trim()) e.city = 'Ville requise'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setSubmitting(true)
        localStorage.setItem(GUEST_KEY, JSON.stringify({ fullName: form.fullName, phone: form.phone, address: form.address, city: form.city }))
        try {
            // Validate current stock before submitting
            const stockCheck = await api.post('/products/check-stock', items.map(i => ({
                productId: i.productId,
                sizeName: i.sizeName || '',
                quantity: i.quantity,
            }))).then(r => r.data)
            if (!stockCheck.ok) {
                stockCheck.errors.forEach((msg: string) => toast.error(msg))
                setSubmitting(false)
                return
            }

            const payload = {
                guestName: form.fullName,
                guestPhone: form.phone,
                guestAddress: form.address,
                guestCity: form.city,
                items: items.map(i => ({
                    productId: i.productId,
                    sizeName: i.sizeName || '',
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    productName: i.productName,
                    productImage: i.productImage || '',
                })),
            }
            const resp = await api.post('/orders/guest-checkout', payload)
            clearCart()
            toast.success('Commande confirmée ! Nous vous contacterons bientôt.')
            router.push(`/order-confirmed?id=${resp.data.id}`)
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Erreur lors de la commande')
        } finally { setSubmitting(false) }
    }

    const sub = subtotal()
    const totalItems = items.reduce((s, i) => s + i.quantity, 0)

    return (
        <div className="min-h-screen">
            <PageBanner label="Sefa" title="Commander" subtitle="Finalisez votre sélection" />
            <div className="container-xl py-16 pb-40">
                <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    <div className="lg:col-span-7 space-y-14">
                        <div>
                            <h2 className="flex items-center gap-3 text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 dark:text-white/40 mb-8 pb-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                                <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} /> Informations de livraison
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
                                <div className="sm:col-span-2 space-y-1">
                                    <label className={labelClass}>Nom complet *</label>
                                    <input value={form.fullName} onChange={e => setField('fullName', e.target.value)} className={inputClass} />
                                    {errors.fullName && <p className="text-red-500 text-[9px] pt-1">{errors.fullName}</p>}
                                </div>
                                <div className="sm:col-span-2 space-y-1">
                                    <label className={labelClass}>Téléphone *</label>
                                    <input value={form.phone} onChange={e => setField('phone', e.target.value)} className={inputClass} />
                                    {errors.phone && <p className="text-red-500 text-[9px] pt-1">{errors.phone}</p>}
                                </div>
                                <div className="sm:col-span-2 space-y-1">
                                    <label className={labelClass}>Adresse *</label>
                                    <input value={form.address} onChange={e => setField('address', e.target.value)} className={inputClass} />
                                    {errors.address && <p className="text-red-500 text-[9px] pt-1">{errors.address}</p>}
                                </div>
                                <div className="sm:col-span-2 space-y-1">
                                    <label className={labelClass}>Ville *</label>
                                    <input value={form.city} onChange={e => setField('city', e.target.value)} className={inputClass} />
                                    {errors.city && <p className="text-red-500 text-[9px] pt-1">{errors.city}</p>}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="flex items-center gap-3 text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 dark:text-white/40 mb-8 pb-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                                <Truck className="w-3.5 h-3.5" strokeWidth={1.5} /> Livraison & Paiement
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-3 p-6 border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-green-700 dark:text-green-400">Livraison gratuite</span>
                                        <span className="text-[9px] font-bold text-green-700 dark:text-green-400">0,00 DH</span>
                                    </div>
                                    <p className="text-[9px] uppercase tracking-widest text-green-600/70 dark:text-green-500/70">Partout au Maroc</p>
                                </div>
                                <div className="flex flex-col gap-3 p-6 border border-brand-500 bg-brand-500/5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-brand-500">Paiement à la livraison</span>
                                        <CheckCircle className="w-4 h-4 text-brand-500" strokeWidth={1.5} />
                                    </div>
                                    <p className="text-[9px] uppercase tracking-widest text-brand-500/60">Payez en cash à la réception</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5">
                        <div className="bg-white dark:bg-[#1a1a1a] border border-black/[0.05] dark:border-white/[0.06] p-8 sticky top-28 space-y-8">
                            <h2 className="text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 dark:text-white/40 border-b border-black/[0.05] dark:border-white/[0.05] pb-6">
                                Votre sélection ({totalItems} article{totalItems > 1 ? 's' : ''})
                            </h2>
                            <div className="space-y-4 max-h-52 overflow-y-auto">
                                {items.map(item => (
                                    <div key={item.key} className="flex justify-between items-start gap-4">
                                        <div className="min-w-0">
                                            <p className="text-[9px] uppercase tracking-widest font-bold text-brand-500 truncate">{item.productName}</p>
                                            <p className="text-[8px] text-black/25 dark:text-white/30 mt-0.5">
                                                {item.sizeName && `Taille : ${item.sizeName} • `}Qté : {item.quantity}
                                            </p>
                                        </div>
                                        <span className="text-[9px] font-bold text-brand-500 shrink-0">{formatEuro(item.unitPrice * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-black/[0.05] dark:border-white/[0.05] pt-6 space-y-3">
                                <div className="flex justify-between text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30">
                                    <span>Sous-total</span><span className="text-brand-500">{formatEuro(sub)}</span>
                                </div>
                                <div className="flex justify-between text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30">
                                    <span>Livraison</span><span className="text-green-500 font-bold">Gratuite</span>
                                </div>
                                <div className="flex justify-between text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30">
                                    <span>Paiement</span><span className="text-brand-500 font-bold">À la livraison</span>
                                </div>
                                <div className="flex justify-between items-baseline pt-4 border-t border-black/[0.05] dark:border-white/[0.05]">
                                    <span className="text-[9px] uppercase tracking-widest font-bold text-black/40 dark:text-white/40">Total</span>
                                    <span className="font-serif text-2xl font-black text-brand-500">{formatEuro(sub)}</span>
                                </div>
                            </div>
                            <button type="submit" disabled={submitting}
                                className="w-full bg-brand-500 text-white dark:bg-white dark:text-black text-[9px] uppercase tracking-[0.3em] py-4 hover:bg-black hover:text-white dark:hover:bg-black dark:hover:text-white transition-colors flex items-center justify-center gap-3 font-semibold disabled:opacity-60">
                                {submitting
                                    ? <div className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin" />
                                    : <><CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} /> Confirmer la commande</>
                                }
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
