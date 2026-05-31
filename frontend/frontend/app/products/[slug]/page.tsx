'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { productApi, reviewApi } from '@/lib/api'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import { useTheme } from '@/components/ThemeProvider'
import { ShoppingCart, Package, ArrowLeft, Check, Star, StarHalf, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatEuro } from '@/lib/formatPrice'
import { publicImageUrl } from '@/lib/mediaUrl'
import { ProductCard } from '@/components/ProductCard'

export default function ProductDetailPage() {
    const { slug }  = useParams<{ slug: string }>()
    const router    = useRouter()
    const { addItem } = useCartStore()
    const { theme } = useTheme()
    const dark = theme === 'dark'

    const [product,      setProduct]      = useState<any>(null)
    const [related,      setRelated]      = useState<any[]>([])
    const [loading,      setLoading]      = useState(true)
    const [qty,          setQty]          = useState(1)
    const [adding,       setAdding]       = useState(false)
    const [added,        setAdded]        = useState(false)
    const [imgIdx,       setImgIdx]       = useState(0)
    const [selectedSize, setSelectedSize] = useState<any>(null)
    const [mounted,      setMounted]      = useState(false)

    const [reviews,         setReviews]         = useState<any[]>([])
    const [reviewRating,    setReviewRating]    = useState(0)
    const [reviewComment,   setReviewComment]   = useState('')
    const [submitting,      setSubmitting]      = useState(false)
    const [hoverRating,     setHoverRating]     = useState(0)
    const { user, isAuthenticated } = useAuthStore()

    const touchStartX = useRef(0)
    const touchStartY = useRef(0)

    useEffect(() => {
        setMounted(false)
        setRelated([])
        setImgIdx(0)
        setSelectedSize(null)
        setReviewRating(0)
        setReviewComment('')
        productApi.getBySlug(slug)
            .then(p => {
                setProduct(p)
                reviewApi.list(p.id).then(setReviews).catch(() => {})
                setTimeout(() => setMounted(true), 60)
            })
            .catch(() => router.push('/products'))
            .finally(() => setLoading(false))
        productApi.related(slug).then(setRelated).catch(() => {})
    }, [slug, router])

    /* instant switch — all images already in DOM, no loading delay */
    const switchImage = (i: number) => {
        if (i === imgIdx) return
        setImgIdx(i)
    }

    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
    }
    const onTouchEnd = (e: React.TouchEvent) => {
        const dx = touchStartX.current - e.changedTouches[0].clientX
        const dy = touchStartY.current - e.changedTouches[0].clientY
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) {
            const total = product?.images?.length || 1
            if (dx > 0) switchImage((imgIdx + 1) % total)
            else switchImage((imgIdx - 1 + total) % total)
        }
    }

    const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
    const sortedSizes = [...(product?.sizes ?? [])].sort((a: any, b: any) => {
        const ai = SIZE_ORDER.indexOf(a.name.toUpperCase())
        const bi = SIZE_ORDER.indexOf(b.name.toUpperCase())
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
    })

    const allOutOfStock = !product?.sizes?.length || product.sizes.every((s: any) => s.stockQuantity === 0)

    const handleAdd = () => {
        if (allOutOfStock) return
        if (product.sizes?.length > 0 && !selectedSize) {
            toast.error('Veuillez sélectionner une taille')
            return
        }
        if (selectedSize && qty > selectedSize.stockQuantity) {
            toast.error(`Stock insuffisant — seulement ${selectedSize.stockQuantity} disponible(s)`)
            setQty(selectedSize.stockQuantity)
            return
        }
        setAdding(true)
        addItem({
            productId:    product.id,
            productName:  product.name,
            productImage: product.images?.[0] || '',
            sizeName:     selectedSize?.name,
            unitPrice:    product.price,
            quantity:     qty,
        })
        toast.success(`${qty} article(s) ajouté(s) au panier !`)
        setAdded(true)
        setTimeout(() => { setAdding(false); setAdded(false) }, 1800)
    }

    const handleReviewSubmit = async () => {
        if (reviewRating === 0) { toast.error('Veuillez sélectionner une note'); return }
        if (!product) return
        setSubmitting(true)
        try {
            const r = await reviewApi.create(product.id, { rating: reviewRating, comment: reviewComment })
            setReviews(prev => [r, ...prev])
            setReviewRating(0)
            setReviewComment('')
            toast.success('Votre avis a été publié !')
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.response?.data?.rating?.[0] || "Erreur lors de l'envoi"
            toast.error(msg)
        }
        setSubmitting(false)
    }

    const hasReviewed = isAuthenticated() && reviews.some(r => r.userId === user?.id)

    /* ── Loading skeleton ── */
    if (loading) return (
        <div className="container-xl pt-24 pb-40">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 animate-pulse">
                <div className="aspect-[4/5] bg-surface-100 rounded-sm" />
                <div className="space-y-5 pt-6">
                    {[40, 70, 30, 90, 55].map((w, i) => (
                        <div key={i} className="h-5 rounded bg-surface-100" style={{ width: `${w}%` }} />
                    ))}
                </div>
            </div>
        </div>
    )

    if (!product) return null

    const discount = product.compareAtPrice
        ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
        : null

    /* transition helpers */
    const col = (extraDelay: number) => ({
        opacity:   mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateY(28px)',
        transition: `opacity .7s ease ${extraDelay}ms, transform .7s cubic-bezier(.22,.6,.36,1) ${extraDelay}ms`,
    })

    return (
        <div className="-mt-10 lg:mt-0 pt-0 lg:pt-10 pb-40 min-h-screen">
            <div className="container-xl">

                {/* ── Breadcrumb — desktop only ──────────── */}
                <div style={col(0)} className="hidden lg:flex items-center gap-2 text-[9px] uppercase tracking-widest text-black/25 dark:text-white/25 mb-12">
                    <Link href="/products" className="flex items-center gap-1.5 hover:text-black dark:hover:text-white transition-colors">
                        <ArrowLeft className="w-3 h-3" /> Collection
                    </Link>
                    <span>/</span>
                    <span className="text-black/50 dark:text-white/50">{product.name}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-20">

                    {/* ── Images ────────────────────────────── */}
                    <div className="lg:col-span-7 space-y-4 -mx-6 lg:mx-0" style={col(80)}>

                        {/* Main image viewer — all images in DOM, instant CSS transition */}
                        <div
                            className="relative aspect-[4/5] bg-surface-100 dark:bg-[#1a1a1a] lg:border border-black/[0.04] dark:border-white/[0.06] overflow-hidden"
                            onTouchStart={onTouchStart}
                            onTouchEnd={onTouchEnd}
                        >
                            {product.images?.length > 0 ? (
                                product.images.map((img: string, i: number) => {
                                    const src = publicImageUrl(img)
                                    if (!src) return null
                                    return (
                                        <Image
                                            key={i}
                                            src={src}
                                            alt={product.name}
                                            fill
                                            className="object-cover absolute inset-0"
                                            style={{
                                                opacity: i === imgIdx ? 1 : 0,
                                                transition: 'opacity .28s ease',
                                                zIndex: i === imgIdx ? 1 : 0,
                                            }}
                                            sizes="(max-width: 1024px) 100vw, 58vw"
                                            priority={i === 0}
                                            loading={i === 0 ? 'eager' : 'lazy'}
                                        />
                                    )
                                })
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-12 h-12 text-black/10" strokeWidth={1} />
                                </div>
                            )}

                            {/* Épuisé overlay */}
                            {allOutOfStock && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <span className="bg-white/90 dark:bg-black/80 text-black dark:text-white text-[10px] uppercase tracking-[0.3em] font-bold px-5 py-2.5 border border-black/10 dark:border-white/10">
                                        Épuisé
                                    </span>
                                </div>
                            )}

                            {/* Discount badge */}
                            {discount && !allOutOfStock && (
                                <div className="absolute top-6 left-6 z-10">
                                    <span className="bg-brand-500 text-white text-[10px] px-3 py-1 uppercase tracking-widest font-bold">
                                        -{discount}%
                                    </span>
                                </div>
                            )}

                            {/* Image counter */}
                            {product.images?.length > 1 && (
                                <div className="absolute bottom-5 right-5 bg-black/30 backdrop-blur-sm text-white text-[9px] tracking-widest px-2.5 py-1 font-medium">
                                    {imgIdx + 1} / {product.images.length}
                                </div>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {product.images?.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-1 px-6 lg:px-0 scrollbar-none dark:[color-scheme:dark]">
                                {product.images.map((img: string, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => switchImage(i)}
                                        className="relative shrink-0 w-20 aspect-square border overflow-hidden"
                                        style={{
                                            borderColor: imgIdx === i ? (dark ? '#e8e8e8' : '#1a1a1a') : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                            opacity:     imgIdx === i ? 1 : 0.55,
                                            transform:   imgIdx === i ? 'scale(1)' : 'scale(0.97)',
                                            transition:  'border-color .3s, opacity .3s, transform .3s',
                                            animationDelay: `${i * 60 + 300}ms`,
                                        }}
                                    >
                                        <Image
                                            src={publicImageUrl(img)!}
                                            alt={`${product.name} ${i + 1}`}
                                            fill
                                            className="object-cover"
                                            sizes="100px"
                                            loading="lazy"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Info ──────────────────────────────── */}
                    <div className="lg:col-span-5 space-y-10 pt-8 lg:pt-0" style={col(180)}>

                        {/* Category + name + price */}
                        <div className="space-y-5">
                            {product.categoryName && (
                                <p className="text-[9px] uppercase tracking-[0.35em] text-black/30 dark:text-white/30">{product.categoryName}</p>
                            )}
                            <h1 className="text-4xl md:text-5xl font-serif tracking-tight text-black dark:text-white leading-tight">
                                {product.name}
                            </h1>
                            <div
                                className="flex items-baseline gap-4 pt-5 border-t border-black/[0.05] dark:border-white/[0.07]"
                                style={col(260)}
                            >
                                <span className="text-2xl font-bold tracking-widest text-black dark:text-white">
                                    {formatEuro(product.price)}
                                </span>
                                {product.compareAtPrice && (
                                    <span className="text-sm text-black/25 dark:text-white/30 line-through tracking-widest">
                                        {formatEuro(product.compareAtPrice)}
                                    </span>
                                )}
                                {discount && (
                                    <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest ml-auto">
                                        Économisez {discount}%
                                    </span>
                                )}
                            </div>
                            {product.averageRating && (
                                <div className="flex items-center gap-2 pt-1">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <Star
                                                key={i}
                                                className="w-3 h-3"
                                                fill={i <= Math.round(product.averageRating) ? 'currentColor' : 'none'}
                                                strokeWidth={1.5}
                                                style={{ color: i <= Math.round(product.averageRating) ? '#f59e0b' : 'currentColor', opacity: i <= Math.round(product.averageRating) ? 1 : 0.2 }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-black/40 dark:text-white/40">
                                        {product.averageRating} · {product.reviewsCount} avis
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div style={col(300)} className="text-xs leading-loose text-black/45 dark:text-white/50 tracking-wide max-w-md">
                                {product.description}
                            </div>
                        )}

                        {/* Divider */}
                        <div className="border-t border-black/[0.05] dark:border-white/[0.07]" />

                        {/* Sizes */}
                        {product.sizes?.length > 0 && (
                            <div style={col(340)} className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] uppercase tracking-[0.28em] font-bold text-black/35 dark:text-white/40">Taille</label>
                                    {selectedSize && (
                                        <span className="text-[9px] text-black/50 dark:text-white/50 tracking-widest">
                                            Stock : {selectedSize.stockQuantity}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {sortedSizes.map((sz: any) => {
                                        const inStock  = sz.stockQuantity > 0
                                        const selected = selectedSize?.id === sz.id
                                        return (
                                            <button
                                                key={sz.id}
                                                disabled={!inStock}
                                                onClick={() => { if (inStock) { setSelectedSize(sz); setQty(1) } }}
                                                style={{
                                                    background:  selected ? (dark ? '#e8e8e8' : '#1a1a1a') : 'transparent',
                                                    borderColor: selected ? (dark ? '#e8e8e8' : '#1a1a1a') : inStock ? (dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)') : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                                                    color:       selected ? (dark ? '#111' : '#fff') : !inStock ? (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : (dark ? 'rgba(255,255,255,0.65)' : 'rgba(26,26,26,0.6)'),
                                                    transform:   selected ? 'scale(1.05)' : 'scale(1)',
                                                    transition:  'all .25s cubic-bezier(.22,.6,.36,1)',
                                                }}
                                                className="relative w-12 h-12 flex items-center justify-center text-[10px] font-bold tracking-widest border"
                                                title={!inStock ? 'Rupture de stock' : `Stock : ${sz.stockQuantity}`}
                                            >
                                                {sz.name}
                                                {!inStock && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="w-[65%] h-px bg-current opacity-25 -rotate-45" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Quantity */}
                        <div style={col(380)} className="space-y-4">
                            <label className="text-[9px] uppercase tracking-[0.28em] font-bold text-black/35 dark:text-white/40 block">Quantité</label>
                            <div className="flex items-center border border-black/10 dark:border-white/10 w-fit">
                                <button
                                    onClick={() => setQty(Math.max(1, qty - 1))}
                                    className="w-12 h-12 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black/50 dark:text-white/50 text-lg font-light select-none"
                                >
                                    −
                                </button>
                                <span
                                    key={qty}
                                    className="w-12 text-center text-sm font-bold text-black dark:text-white"
                                    style={{ animation: 'qtyPop .2s ease' }}
                                >
                                    {qty}
                                </span>
                                <button
                                    onClick={() => setQty(Math.min(qty + 1, selectedSize?.stockQuantity ?? 999))}
                                    disabled={(product.sizes?.length > 0 && !selectedSize) || (selectedSize && qty >= selectedSize.stockQuantity)}
                                    className="w-12 h-12 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black/50 dark:text-white/50 text-lg font-light select-none disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Add to cart */}
                        <div style={col(420)}>
                            <button
                                onClick={handleAdd}
                                disabled={adding || allOutOfStock}
                                className="relative w-full overflow-hidden py-5 text-[9px] uppercase tracking-[0.32em] font-bold flex items-center justify-center gap-3 transition-all duration-500 disabled:cursor-not-allowed"
                                style={{
                                    background: allOutOfStock ? '#9ca3af' : added ? '#16a34a' : '#1a1a1a',
                                    color: '#fff',
                                }}
                            >
                                {/* Shimmer sweep on idle */}
                                {!added && !adding && !allOutOfStock && (
                                    <span
                                        className="absolute inset-y-0 w-1/2 pointer-events-none"
                                        style={{
                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                                            animation: 'btnSweep 2.8s ease-in-out infinite',
                                        }}
                                    />
                                )}
                                {allOutOfStock
                                    ? <><Package className="w-4 h-4" strokeWidth={1.5} /> Épuisé</>
                                    : added
                                        ? <><Check className="w-4 h-4" strokeWidth={2.5} /> Ajouté au panier !</>
                                        : adding
                                            ? <span className="opacity-60">...</span>
                                            : <><ShoppingCart className="w-4 h-4" strokeWidth={1.5} /> Ajouter au Panier — {formatEuro(product.price * qty)}</>
                                }
                            </button>

                            {/* Free shipping note */}
                            <p className="text-center text-[9px] uppercase tracking-widest text-black/25 dark:text-white/25 mt-4">
                                Livraison gratuite · Paiement à la livraison
                            </p>
                        </div>

                        {/* Meta */}
                        {product.sku && (
                            <p style={col(450)} className="text-[8px] uppercase tracking-[0.3em] text-black/20 dark:text-white/20 pt-2">
                                Réf. {product.sku}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Suggestions ──────────────────────────────────── */}
            {related.length > 0 && (
                <section className="mt-32 border-t border-black/[0.05] dark:border-white/[0.06] pt-20">
                    <div className="container-xl">
                        <div className="flex items-end justify-between mb-14">
                            <div>
                                <p className="text-[9px] uppercase tracking-[0.35em] text-black/25 dark:text-white/30 mb-2">Vous aimerez aussi</p>
                                <h2 className="text-2xl md:text-3xl font-serif tracking-tight text-black dark:text-white">Suggestions</h2>
                            </div>
                            <Link href="/products"
                                className="hidden sm:flex items-center gap-2 text-[9px] uppercase tracking-widest font-bold text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white border-b border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white transition-all pb-0.5">
                                Voir tout
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-14">
                            {related.slice(0, 4).map((p: any, i: number) => (
                                <ProductCard key={p.id} product={p} index={i} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Reviews ──────────────────────────────────── */}
            <section className="mt-32 border-t border-black/[0.05] dark:border-white/[0.06] pt-20">
                <div className="container-xl">
                    <div className="flex items-end justify-between mb-14">
                        <div>
                            <p className="text-[9px] uppercase tracking-[0.35em] text-black/25 dark:text-white/30 mb-2">Avis clients</p>
                            <h2 className="text-2xl md:text-3xl font-serif tracking-tight text-black dark:text-white">
                                {reviews.length > 0 ? `${reviews.length} avis` : 'Soyez le premier à donner votre avis'}
                            </h2>
                        </div>
                    </div>

                    {/* ── Review list ── */}
                    {reviews.length > 0 && (
                        <div className="space-y-6 mb-16">
                            {reviews.map((r: any) => (
                                <div key={r.id} className="border-b border-black/[0.04] dark:border-white/[0.06] pb-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center">
                                            <UserIcon className="w-4 h-4 text-black/30 dark:text-white/30" strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-black dark:text-white">{r.userName}</p>
                                            <p className="text-[8px] text-black/30 dark:text-white/30 uppercase tracking-widest">
                                                {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5 mb-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <Star
                                                key={i}
                                                className="w-3.5 h-3.5"
                                                fill={i <= r.rating ? '#f59e0b' : 'none'}
                                                strokeWidth={1.5}
                                                style={{ color: i <= r.rating ? '#f59e0b' : 'currentColor', opacity: i <= r.rating ? 1 : 0.15 }}
                                            />
                                        ))}
                                    </div>
                                    {r.comment && (
                                        <p className="text-[11px] leading-relaxed text-black/50 dark:text-white/50 max-w-lg">{r.comment}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Review form ── */}
                    {isAuthenticated() ? (
                        hasReviewed ? (
                            <div className="bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] p-8 text-center">
                                <p className="text-[11px] text-black/50 dark:text-white/50">Vous avez déjà donné votre avis sur ce produit.</p>
                            </div>
                        ) : (
                            <div className="max-w-lg space-y-6">
                                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-black/40 dark:text-white/40">Donnez votre avis</p>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setReviewRating(i)}
                                            onMouseEnter={() => setHoverRating(i)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            className="transition-transform hover:scale-110"
                                        >
                                            <Star
                                                className="w-6 h-6"
                                                fill={i <= (hoverRating || reviewRating) ? '#f59e0b' : 'none'}
                                                strokeWidth={1.5}
                                                style={{ color: i <= (hoverRating || reviewRating) ? '#f59e0b' : 'currentColor', opacity: i <= (hoverRating || reviewRating) ? 1 : 0.2 }}
                                            />
                                        </button>
                                    ))}
                                    {reviewRating > 0 && (
                                        <span className="text-[10px] text-black/40 dark:text-white/40 ml-2 self-center">
                                            {['', 'Médiocre', 'Passable', 'Bien', 'Très bien', 'Excellent'][reviewRating]}
                                        </span>
                                    )}
                                </div>
                                <textarea
                                    value={reviewComment}
                                    onChange={e => setReviewComment(e.target.value)}
                                    placeholder="Partagez votre expérience avec ce produit (optionnel)…"
                                    rows={3}
                                    className="w-full bg-transparent border border-black/10 dark:border-white/10 px-4 py-3 text-[11px] text-black dark:text-white placeholder:text-black/20 dark:placeholder:text-white/20 focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors resize-none"
                                />
                                <button
                                    onClick={handleReviewSubmit}
                                    disabled={submitting || reviewRating === 0}
                                    className="px-8 py-3 bg-black text-white text-[9px] uppercase tracking-[0.3em] font-bold hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Envoi…' : 'Publier mon avis'}
                                </button>
                            </div>
                        )
                    ) : (
                        <div className="bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] p-8 text-center">
                            <p className="text-[11px] text-black/50 dark:text-white/50">
                                <Link href="/login" className="underline hover:text-black dark:hover:text-white">Connectez-vous</Link> pour laisser un avis.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            <style>{`
                @keyframes qtyPop {
                    0%   { transform: scale(1.35); opacity:.5 }
                    100% { transform: scale(1);    opacity:1  }
                }
                @keyframes btnSweep {
                    0%   { left: -60% }
                    60%  { left: 130% }
                    100% { left: 130% }
                }
            `}</style>
        </div>
    )
}
