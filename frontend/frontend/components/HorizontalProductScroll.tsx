'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Package, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { publicImageUrl } from '@/lib/mediaUrl'
import { formatEuro } from '@/lib/formatPrice'
import toast from 'react-hot-toast'

/* ─────────────────────────────────────────────────────────────────── */
/*  Single card                                                         */
/* ─────────────────────────────────────────────────────────────────── */
function ScrollCard({ product, index, dragActive, isMobile }: {
    product: any
    index: number
    dragActive: boolean
    isMobile: boolean
}) {
    const { addItem } = useCartStore()
    const [inView,  setInView]  = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < 640
    )
    const [hovered, setHovered] = useState(false)
    const [added,   setAdded]   = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isMobile) { setInView(true); return }
        const el = ref.current; if (!el) return
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setInView(true) },
            { threshold: 0.08 }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [isMobile])

    const outOfStock = !product.sizes?.length || product.sizes.every((s: any) => s.stockQuantity === 0)
    const img1 = publicImageUrl(product.images?.[0] ?? product.imageUrl)
    const img2 = product.images?.[1] ? publicImageUrl(product.images[1]) : null
    const discount = product.compareAtPrice
        ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : null

    const handleAdd = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation()
        if (outOfStock || dragActive) return
        if (product.sizes?.length) { window.location.href = `/products/${product.slug}`; return }
        addItem({ productId: product.id, productName: product.name,
            productImage: product.images?.[0] || '', unitPrice: product.price, quantity: 1 })
        toast.success('Ajouté au panier !')
        setAdded(true); setTimeout(() => setAdded(false), 900)
    }

    const delay = Math.min(index * 70, 500)

    return (
        <div ref={ref}
            className="relative flex-shrink-0"
            style={{
                width: isMobile ? '78vw' : 'clamp(240px, 40vw, 340px)',
                opacity:   inView ? 1 : 0,
                transform: inView ? 'none' : 'translateX(40px) scale(0.97)',
                transition: `opacity .7s ease ${delay}ms, transform .8s cubic-bezier(.16,1,.3,1) ${delay}ms`,
            }}
            onMouseEnter={() => !dragActive && setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Link href={`/products/${product.slug}`}
                onClick={e => { if (dragActive) e.preventDefault() }}
                className="block select-none">

                {/* ── Image ── */}
                <div className="relative overflow-hidden bg-[#eeede8] dark:bg-[#1c1c1c]"
                    style={{ aspectRatio: '3/4' }}>

                    {img1 ? <>
                        {/* Primary */}
                        <Image src={img1} alt={product.name} fill unoptimized className="object-cover"
                            style={{
                                opacity:   hovered && img2 ? 0 : outOfStock ? .45 : 1,
                                transform: hovered ? 'scale(1.07)' : 'scale(1)',
                                transition: 'opacity .55s ease, transform 1.1s cubic-bezier(.16,1,.3,1)',
                            }}
                            sizes="(max-width: 640px) 70vw, 340px"
                            priority={index < 4} />

                        {/* Secondary */}
                        {img2 && (
                            <Image src={img2} alt="" fill unoptimized className="object-cover absolute inset-0"
                                style={{
                                    opacity:   hovered ? 1 : 0,
                                    transform: hovered ? 'scale(1.03)' : 'scale(1.09)',
                                    transition: 'opacity .55s ease, transform 1.1s cubic-bezier(.16,1,.3,1)',
                                }}
                                sizes="(max-width: 640px) 70vw, 340px" />
                        )}
                    </> : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Package className="w-8 h-8 text-black/10" strokeWidth={1} />
                        </div>
                    )}

                    {/* Gradient — always present, stronger on hover */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.15) 45%, transparent 70%)',
                            opacity: hovered ? 1 : 0.7,
                            transition: 'opacity .45s ease',
                        }} />

                    {/* ── Bottom info (always visible) ── */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                        <div style={{
                            transform: hovered ? 'translateY(0)' : 'translateY(5px)',
                            transition: 'transform .45s cubic-bezier(.16,1,.3,1)',
                        }}>
                            {product.categoryName && (
                                <p className="text-[8px] uppercase tracking-[0.32em] text-white/45 mb-1.5">
                                    {product.categoryName}
                                </p>
                            )}
                            <h3 className="font-serif text-[1rem] font-normal text-white tracking-tight line-clamp-1 mb-3">
                                {product.name}
                            </h3>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-white text-[11px] font-semibold tracking-widest">
                                        {outOfStock ? 'Épuisé' : formatEuro(product.price)}
                                    </span>
                                    {discount && !outOfStock && (
                                        <span className="text-white/40 text-[10px] line-through tracking-wide">
                                            {formatEuro(product.compareAtPrice)}
                                        </span>
                                    )}
                                </div>

                                {!outOfStock && (
                                    <button onClick={handleAdd}
                                        className="w-8 h-8 flex items-center justify-center transition-all duration-300"
                                        style={{
                                            background: added ? '#16a34a' : 'rgba(255,255,255,0.95)',
                                            opacity:    hovered ? 1 : 0,
                                            transform:  hovered ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(4px)',
                                            transition: 'all .35s cubic-bezier(.16,1,.3,1)',
                                        }}>
                                        <ShoppingBag className="w-3.5 h-3.5"
                                            style={{ color: added ? '#fff' : '#1a1a1a' }}
                                            strokeWidth={1.5} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Badges */}
                    {discount && !outOfStock && (
                        <div className="absolute top-4 left-4 z-10">
                            <span className="text-[8px] uppercase tracking-[0.2em] font-semibold bg-white/90 text-black px-2.5 py-1">
                                −{discount}%
                            </span>
                        </div>
                    )}
                    {outOfStock && (
                        <div className="absolute top-4 left-4 z-10">
                            <span className="text-[8px] uppercase tracking-[0.2em] font-semibold bg-black/60 text-white/80 px-2.5 py-1">
                                Épuisé
                            </span>
                        </div>
                    )}

                    {/* Thin border */}
                    <div className="absolute inset-0 pointer-events-none border border-white/0"
                        style={{ borderColor: hovered ? 'rgba(255,255,255,0.08)' : 'transparent', transition: 'border-color .4s' }} />
                </div>
            </Link>
        </div>
    )
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Main component                                                      */
/* ─────────────────────────────────────────────────────────────────── */
export function HorizontalProductScroll({ products, title, subtitle, label, viewAllHref = '/products' }: {
    products: any[]
    title: string
    subtitle?: string
    label?: string
    viewAllHref?: string
}) {
    const trackRef  = useRef<HTMLDivElement>(null)
    const dragging  = useRef(false)
    const didDrag   = useRef(false)
    const startX    = useRef(0)
    const originSL  = useRef(0)
    const velX      = useRef(0)
    const prevX     = useRef(0)
    const prevT     = useRef(0)
    const rafId     = useRef<number>()

    const [progress, setProgress]  = useState(0)
    const [canLeft,  setCanLeft]   = useState(false)
    const [canRight, setCanRight]  = useState(true)
    const [isDrag,   setIsDrag]    = useState(false)
    const [isMobile, setIsMobile]  = useState(false)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    /* ── Update progress & arrows ── */
    const sync = useCallback(() => {
        const el = trackRef.current; if (!el) return
        const max = el.scrollWidth - el.clientWidth
        const p   = max > 0 ? el.scrollLeft / max : 0
        setProgress(p)
        setCanLeft(el.scrollLeft > 4)
        setCanRight(el.scrollLeft < max - 4)
    }, [])

    useEffect(() => { sync() }, [sync])

    /* ── Arrow scroll ── */
    const arrowScroll = (dir: number) => {
        const el = trackRef.current; if (!el) return
        const first = el.querySelector<HTMLElement>('[data-hcard]')
        const step  = first ? first.offsetWidth + 16 : 300
        el.scrollBy({ left: step * dir, behavior: 'smooth' })
    }

    /* ── Inertia ── */
    const inertia = () => {
        let v = velX.current * 14
        if (rafId.current) cancelAnimationFrame(rafId.current)
        const tick = () => {
            const el = trackRef.current; if (!el || Math.abs(v) < 0.4) { setIsDrag(false); return }
            el.scrollLeft += v
            v *= 0.91
            rafId.current = requestAnimationFrame(tick)
        }
        rafId.current = requestAnimationFrame(tick)
    }

    /* ── Mouse drag ── */
    const onDown = (e: React.MouseEvent) => {
        if (rafId.current) cancelAnimationFrame(rafId.current)
        dragging.current = true
        didDrag.current  = false
        startX.current   = e.clientX
        originSL.current = trackRef.current?.scrollLeft ?? 0
        velX.current = 0
        prevX.current = e.clientX
        prevT.current = Date.now()
        setIsDrag(true)
    }
    const onMove = (e: React.MouseEvent) => {
        if (!dragging.current || !trackRef.current) return
        const dx = e.clientX - startX.current
        if (Math.abs(dx) > 4) didDrag.current = true
        trackRef.current.scrollLeft = originSL.current - dx * 1.15
        const now = Date.now()
        const dt  = Math.max(now - prevT.current, 1)
        velX.current = (prevX.current - e.clientX) / dt
        prevX.current = e.clientX
        prevT.current = now
    }
    const onUp = () => {
        if (!dragging.current) return
        dragging.current = false
        inertia()
    }

    return (
        <div className="overflow-x-clip">
            {/* ── Header ── */}
            <div className="container-xl mb-10 flex items-end justify-between gap-6">
                <div>
                    {label && (
                        <p className="text-[9px] uppercase tracking-[0.35em] text-black/30 dark:text-white/30 mb-3 flex items-center gap-3">
                            <span className="inline-block w-6 h-px bg-current opacity-50" />
                            {label}
                        </p>
                    )}
                    <h2 className="text-3xl md:text-5xl font-serif dark:text-white">{title}</h2>
                    {subtitle && (
                        <p className="text-[10px] uppercase tracking-luxury text-black/30 dark:text-white/30 mt-1.5">{subtitle}</p>
                    )}
                </div>
                <Link href={viewAllHref}
                    className="hidden sm:inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white border-b border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white transition-all duration-300 pb-px shrink-0">
                    Voir tout <ArrowRight className="w-3 h-3" />
                </Link>
            </div>

            {/* ── Track ── */}
            <div
                ref={trackRef}
                className="flex gap-4 overflow-x-auto scrollbar-none select-none"
                style={{
                    paddingLeft:  isMobile ? '11vw' : 'max(24px, calc((100vw - 1400px) / 2 + 64px))',
                    paddingRight: isMobile ? '11vw' : 'max(24px, calc((100vw - 1400px) / 2 + 64px))',
                    cursor: isDrag ? 'grabbing' : 'grab',
                    scrollSnapType: isMobile ? 'x mandatory' : 'x proximity',
                }}
                onMouseDown={onDown}
                onMouseMove={onMove}
                onMouseUp={onUp}
                onMouseLeave={onUp}
                onScroll={sync}
            >
                {products.map((p, i) => (
                    <div key={p.id} data-hcard style={{ scrollSnapAlign: isMobile ? 'center' : 'start', scrollSnapStop: isMobile ? 'always' : 'normal' }}>
                        <ScrollCard product={p} index={i} dragActive={didDrag.current} isMobile={isMobile} />
                    </div>
                ))}
                <div className="flex-shrink-0 w-2" />
            </div>

            {/* ── Footer: progress + arrows ── */}
            <div className="container-xl mt-8 flex items-center gap-5">
                {/* Progress */}
                <div className="flex-1 h-px bg-black/8 dark:bg-white/8 relative overflow-hidden rounded-full">
                    <div
                        className="absolute inset-y-0 left-0 bg-black dark:bg-white rounded-full"
                        style={{ width: `${Math.max(progress * 100, 4)}%`, transition: 'width .15s ease' }}
                    />
                </div>

                {/* Scroll hint */}
                <span className="text-[8px] uppercase tracking-[0.3em] text-black/20 dark:text-white/20 hidden md:block">
                    Glisser
                </span>

                {/* Arrows */}
                <div className="flex gap-2">
                    {[{ dir: -1, Icon: ArrowLeft, can: canLeft }, { dir: 1, Icon: ArrowRight, can: canRight }].map(({ dir, Icon, can }) => (
                        <button key={dir} onClick={() => arrowScroll(dir)} disabled={!can}
                            className="w-9 h-9 border flex items-center justify-center transition-all duration-250"
                            style={{
                                borderColor: can ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.05)',
                                color:       can ? 'inherit' : 'rgba(0,0,0,0.15)',
                                cursor:      can ? 'pointer' : 'not-allowed',
                            }}>
                            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
