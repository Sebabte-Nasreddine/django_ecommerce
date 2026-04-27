'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import { PageBanner } from '@/components/PageBanner'
import { Plus, Minus, ShoppingBag, ArrowRight, Package } from 'lucide-react'
import { formatEuro } from '@/lib/formatPrice'
import { publicImageUrl } from '@/lib/mediaUrl'

export default function CartPage() {
    const { items, updateQty, removeItem, subtotal } = useCartStore()

    if (items.length === 0) return (
        <div className="min-h-screen">
            <PageBanner label="Sefa" title="Mon Panier" />
            <div className="container-xl py-40 text-center">
                <ShoppingBag className="w-12 h-12 text-black/10 dark:text-white/10 mx-auto mb-8" strokeWidth={1} />
                <p className="font-serif text-2xl text-black/25 dark:text-white/25 mb-8">Votre panier est vide</p>
                <Link href="/products"
                    className="inline-flex items-center gap-3 bg-black dark:bg-white text-white dark:text-black text-[9px] uppercase tracking-[0.3em] px-8 py-4 hover:opacity-80 transition-opacity font-semibold">
                    Découvrir la collection <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    )

    const sub = subtotal()
    const totalItems = items.reduce((s, i) => s + i.quantity, 0)

    return (
        <div className="min-h-screen">
            <PageBanner label="Sefa" title="Mon Panier" subtitle={`${totalItems} article${totalItems > 1 ? 's' : ''}`} />

            <div className="container-xl py-16 pb-40">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                    {/* Items */}
                    <div className="lg:col-span-8 divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                        {items.map(item => {
                            const imgUrl = publicImageUrl(item.productImage)
                            return (
                                <div key={item.key} className="py-8 flex gap-6 items-start group">
                                    <div className="relative w-24 md:w-28 aspect-[3/4] bg-surface-100 dark:bg-[#1a1a1a] border border-black/[0.05] dark:border-white/[0.06] overflow-hidden shrink-0">
                                        {imgUrl ? (
                                            <Image src={imgUrl} alt={item.productName} fill unoptimized
                                                className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="150px" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-6 h-6 text-black/10 dark:text-white/10" strokeWidth={1} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-serif text-base font-bold text-black dark:text-white tracking-tight mb-1 truncate">{item.productName}</h3>
                                        {item.sizeName && (
                                            <p className="text-[9px] uppercase tracking-widest text-black/30 dark:text-white/40 mb-3">Taille : {item.sizeName}</p>
                                        )}
                                        <p className="text-[9px] uppercase tracking-widest text-black/30 dark:text-white/40">{formatEuro(item.unitPrice)} / pièce</p>

                                        <div className="flex items-center gap-4 mt-5">
                                            <div className="flex items-center border border-black/10 dark:border-white/10">
                                                <button onClick={() => updateQty(item.key, item.quantity - 1)}
                                                    className="w-9 h-9 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                    <Minus className="w-3 h-3 text-black/40 dark:text-white/40" strokeWidth={1.5} />
                                                </button>
                                                <span className="w-9 text-center text-[10px] font-bold text-black dark:text-white">{item.quantity}</span>
                                                <button onClick={() => updateQty(item.key, item.quantity + 1)}
                                                    className="w-9 h-9 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                    <Plus className="w-3 h-3 text-black/40 dark:text-white/40" strokeWidth={1.5} />
                                                </button>
                                            </div>
                                            <button onClick={() => removeItem(item.key)}
                                                className="text-[9px] uppercase tracking-widest text-black/20 dark:text-white/25 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                                Retirer
                                            </button>
                                        </div>
                                    </div>

                                    <p className="font-serif text-lg font-bold text-black dark:text-white shrink-0">{formatEuro(item.unitPrice * item.quantity)}</p>
                                </div>
                            )
                        })}
                    </div>

                    {/* Summary */}
                    <div className="lg:col-span-4">
                        <div className="bg-white dark:bg-[#141414] border border-black/[0.05] dark:border-white/[0.07] p-8 sticky top-28 space-y-8">
                            <h2 className="text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 dark:text-white/40 border-b border-black/[0.05] dark:border-white/[0.06] pb-6">Récapitulatif</h2>

                            <div className="space-y-4">
                                <div className="flex justify-between text-[9px] uppercase tracking-widest text-black/30 dark:text-white/35">
                                    <span>Sous-total</span>
                                    <span className="font-bold text-black dark:text-white">{formatEuro(sub)}</span>
                                </div>
                                <div className="flex justify-between text-[9px] uppercase tracking-widest text-black/30 dark:text-white/35">
                                    <span>Livraison</span>
                                    <span className="font-bold text-green-500">Gratuite</span>
                                </div>
                                <div className="flex justify-between text-[9px] uppercase tracking-widest text-black/30 dark:text-white/35">
                                    <span>Paiement</span>
                                    <span className="font-bold text-black/50 dark:text-white/50">À la livraison</span>
                                </div>
                            </div>

                            <div className="border-t border-black/[0.05] dark:border-white/[0.06] pt-6 flex justify-between items-baseline">
                                <span className="text-[9px] uppercase tracking-widest font-bold text-black/40 dark:text-white/40">Total</span>
                                <span className="font-serif text-2xl font-black text-black dark:text-white">{formatEuro(sub)}</span>
                            </div>

                            <div className="space-y-3 pt-2">
                                <Link href="/checkout"
                                    className="block w-full bg-black dark:bg-white text-white dark:text-black text-[9px] uppercase tracking-[0.3em] py-4 text-center hover:opacity-80 transition-opacity font-semibold">
                                    Passer la commande
                                </Link>
                                <Link href="/products"
                                    className="block w-full border border-black/10 dark:border-white/10 text-black/30 dark:text-white/30 text-[9px] uppercase tracking-[0.3em] py-4 text-center hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-all">
                                    Continuer mes achats
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
