'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Package, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import toast from 'react-hot-toast'
import { useState, useRef, useEffect } from 'react'
import { formatEuro } from '@/lib/formatPrice'
import { publicImageUrl } from '@/lib/mediaUrl'

interface ProductSize { id: number; name: string; stockQuantity: number }
interface Product {
    id: number; name: string; slug: string; price: number
    compareAtPrice?: number; imageUrl?: string; images?: string[]
    categoryName?: string; sizes?: ProductSize[]
}

function isOutOfStock(product: Product): boolean {
    if (!product.sizes || product.sizes.length === 0) return true
    return product.sizes.every(s => s.stockQuantity === 0)
}

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
    const { addItem } = useCartStore()
    const [loading, setLoading] = useState(false)
    const [added,   setAdded]   = useState(false)
    const [hovered, setHovered] = useState(false)
    const [inView,  setInView]  = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = ref.current; if (!el) return
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
            { threshold: 0.08 }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    const outOfStock = isOutOfStock(product)
    const discount   = product.compareAtPrice
        ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : null

    const raw1   = product.images?.[0] ?? product.imageUrl
    const raw2   = product.images?.[1]
    const imgSrc  = publicImageUrl(raw1)
    const imgSrc2 = raw2 ? publicImageUrl(raw2) : null

    const handleAdd = (e: React.MouseEvent) => {
        e.preventDefault(); if (outOfStock) return
        if (product.sizes && product.sizes.length > 0) {
            window.location.href = `/products/${product.slug}`; return
        }
        setLoading(true)
        addItem({
            productId: product.id, productName: product.name,
            productImage: product.images?.[0] || product.imageUrl || '',
            unitPrice: product.price, quantity: 1,
        })
        toast.success('Ajouté au panier !')
        setAdded(true)
        setTimeout(() => { setLoading(false); setAdded(false) }, 900)
    }

    const delay = Math.min(index * 90, 500)

    return (
        <div ref={ref} style={{
            opacity:   inView ? 1 : 0,
            transform: inView ? 'translateY(0px)' : 'translateY(36px)',
            transition: `opacity .65s ease ${delay}ms, transform .65s cubic-bezier(.22,.6,.36,1) ${delay}ms`,
        }}>
            <Link href={`/products/${product.slug}`} className="group block"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}>

                {/* ── Image ─────────────────────────── */}
                <div className="relative aspect-[3/4] bg-surface-100 dark:bg-[#1a1a1a] overflow-hidden">

                    {imgSrc ? (
                        <Image src={imgSrc} alt={product.name} fill className="object-cover"
                            style={{
                                opacity:   hovered && imgSrc2 ? 0 : outOfStock ? 0.45 : 1,
                                transform: hovered ? 'scale(1.08)' : 'scale(1)',
                                transition: 'opacity .6s ease, transform .8s cubic-bezier(.22,.6,.36,1)',
                            }}
                            sizes="(max-width: 768px) 50vw, 25vw" loading="lazy" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-black/10" strokeWidth={1} />
                        </div>
                    )}

                    {imgSrc2 && (
                        <Image src={imgSrc2} alt={product.name} fill className="object-cover absolute inset-0"
                            style={{
                                opacity:   hovered ? 1 : 0,
                                transform: hovered ? 'scale(1.04)' : 'scale(1.1)',
                                transition: 'opacity .6s ease, transform .8s cubic-bezier(.22,.6,.36,1)',
                            }}
                            sizes="(max-width: 768px) 50vw, 25vw" loading="lazy" />
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent pointer-events-none"
                        style={{ opacity: hovered && !outOfStock ? 1 : 0, transition: 'opacity .45s ease' }} />

                    {/* Hover CTA */}
                    {!outOfStock && (
                        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5"
                            style={{
                                opacity:   hovered ? 1 : 0,
                                transform: hovered ? 'translateY(0)' : 'translateY(14px)',
                                transition: 'opacity .4s ease, transform .4s cubic-bezier(.22,.6,.36,1)',
                            }}>
                            <button onClick={handleAdd} disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 text-[9px] uppercase tracking-[0.28em] font-bold transition-colors duration-300"
                                style={{ background: added ? '#16a34a' : '#fff', color: added ? '#fff' : '#1a1a1a' }}>
                                <ShoppingBag className="w-3 h-3" strokeWidth={2} />
                                {added ? 'Ajouté !' : product.sizes?.length ? 'Choisir la taille' : 'Ajout rapide'}
                            </button>
                        </div>
                    )}

                    {/* Épuisé */}
                    {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-white/90 dark:bg-black/80 text-black dark:text-white text-[9px] uppercase tracking-[0.3em] font-bold px-4 py-2 border border-black/10">
                                Épuisé
                            </span>
                        </div>
                    )}

                    {/* Discount */}
                    {discount && discount > 0 && !outOfStock && (
                        <div className="absolute top-4 left-4 z-10">
                            <span className="bg-brand-500 text-white text-[9px] px-2.5 py-1 uppercase tracking-widest font-bold">
                                -{discount}%
                            </span>
                        </div>
                    )}

                    {/* Border */}
                    <div className="absolute inset-0 pointer-events-none border"
                        style={{
                            borderColor: hovered ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.04)',
                            transition: 'border-color .4s ease',
                        }} />
                </div>

                {/* ── Info ──────────────────────────── */}
                <div className="pt-4 pb-2 space-y-1.5">
                    {product.categoryName && (
                        <p className="text-[8px] uppercase tracking-[0.3em] text-black/25 dark:text-white/25">{product.categoryName}</p>
                    )}
                    <h3 className={`font-serif text-sm tracking-tight line-clamp-1 transition-colors duration-300
                        ${hovered ? 'text-black dark:text-white' : 'text-black/65 dark:text-white/65'}`}>
                        {product.name}
                    </h3>
                    <div className="flex items-center gap-3">
                        {outOfStock ? (
                            <span className="text-[10px] font-bold tracking-widest text-black/25 dark:text-white/25">Épuisé</span>
                        ) : (
                            <>
                                <span className="text-[10px] font-bold tracking-widest text-black dark:text-white">{formatEuro(product.price)}</span>
                                {product.compareAtPrice && (
                                    <span className="text-[9px] text-black/25 dark:text-white/25 line-through">{formatEuro(product.compareAtPrice)}</span>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    )
}
