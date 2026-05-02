'use client'
import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { productApi, categoryApi } from '@/lib/api'
import { ProductCard } from '@/components/ProductCard'
import { PageBanner } from '@/components/PageBanner'
import { Search, X, ChevronDown, SlidersHorizontal, Check, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { publicImageUrl } from '@/lib/mediaUrl'
import { useSearchParams, useRouter } from 'next/navigation'
import { formatEuro } from '@/lib/formatPrice'

interface Category { id: number; name: string; slug: string }
interface Product {
    id: number; name: string; slug: string; price: number
    compareAtPrice?: number; imageUrl?: string; images?: string[]
    categoryName?: string; categoryId?: number; createdAt?: string
    sizes?: { stockQuantity: number }[]
}

const SORT_OPTIONS = [
    { label: 'Plus récents',    value: 'createdAt,desc' },
    { label: 'Prix croissant',  value: 'price,asc'      },
    { label: 'Prix décroissant',value: 'price,desc'     },
    { label: 'Nom A–Z',         value: 'name,asc'       },
]

/* ─── helpers ─── */
function cls(...args: (string | false | undefined)[]) { return args.filter(Boolean).join(' ') }

/* ─── Price panel ─── */
function PricePanel({ min, max, priceMin, priceMax, onApply, onClose }: {
    min: number; max: number
    priceMin: string; priceMax: string
    onApply: (mn: string, mx: string) => void
    onClose: () => void
}) {
    const [lo, setLo] = useState(priceMin)
    const [hi, setHi] = useState(priceMax)

    return (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1a1a1a] border border-black/[0.08] dark:border-white/[0.08] shadow-xl z-50 p-5 space-y-4">
            <p className="text-[9px] uppercase tracking-[0.28em] font-semibold text-black/40 dark:text-white/40">
                Fourchette de prix (DH)
            </p>
            <div className="flex items-center gap-3">
                <input type="number" placeholder={String(min)} value={lo}
                    onChange={e => setLo(e.target.value)} min={min} max={max}
                    className="w-full bg-transparent border border-black/10 dark:border-white/10 px-3 py-2 text-[11px] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 focus:outline-none focus:border-black dark:focus:border-white transition-colors" />
                <span className="text-black/20 dark:text-white/20 shrink-0">—</span>
                <input type="number" placeholder={String(max)} value={hi}
                    onChange={e => setHi(e.target.value)} min={min} max={max}
                    className="w-full bg-transparent border border-black/10 dark:border-white/10 px-3 py-2 text-[11px] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 focus:outline-none focus:border-black dark:focus:border-white transition-colors" />
            </div>
            <div className="flex gap-2 pt-1">
                <button onClick={() => { onApply(lo, hi); onClose() }}
                    className="flex-1 bg-black dark:bg-white text-white dark:text-black text-[9px] uppercase tracking-widest py-2.5 font-semibold hover:opacity-80 transition-opacity">
                    Appliquer
                </button>
                <button onClick={() => { setLo(''); setHi(''); onApply('', ''); onClose() }}
                    className="px-3 border border-black/10 dark:border-white/10 text-black/30 dark:text-white/30 text-[9px] uppercase tracking-widest hover:text-black dark:hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    )
}

/* ─── Main content ─── */
function ProductsContent() {
    const sp     = useSearchParams()
    const router = useRouter()

    /* ── raw data ── */
    const [allProducts, setAllProducts] = useState<Product[]>([])
    const [categories,  setCategories]  = useState<Category[]>([])
    const [loading,     setLoading]     = useState(true)
    const [fetched,     setFetched]     = useState(false)

    /* ── filter state (never pre-load from URL — always start fresh) ── */
    const [search,          setSearch]          = useState('')
    const [debSearch,       setDebSearch]       = useState('')
    const [categoryId,      setCategoryId]      = useState<number | null>(null)
    const [sort,            setSort]            = useState('createdAt,desc')
    const [priceMin,        setPriceMin]        = useState('')
    const [priceMax,        setPriceMax]        = useState('')
    const [showPrice,       setShowPrice]       = useState(false)
    const [showSort,        setShowSort]        = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const priceRef  = useRef<HTMLDivElement>(null)
    const sortRef   = useRef<HTMLDivElement>(null)
    const searchRef = useRef<HTMLDivElement>(null)
    const debRef    = useRef<ReturnType<typeof setTimeout>>()

    /* ── debounce search ── */
    useEffect(() => {
        clearTimeout(debRef.current)
        debRef.current = setTimeout(() => setDebSearch(search), 280)
        return () => clearTimeout(debRef.current)
    }, [search])

    /* ── fetch on every mount (handles back-navigation from checkout) ── */
    useEffect(() => {
        setLoading(true)
        setFetched(false)
        Promise.all([productApi.list({}), categoryApi.list()])
            .then(([pd, cats]) => {
                const list = Array.isArray(pd) ? pd : (pd?.content ?? pd?.data ?? [])
                setAllProducts(list)
                setCategories(Array.isArray(cats) ? cats : (cats?.content ?? []))
            })
            .catch(() => {})
            .finally(() => { setLoading(false); setFetched(true) })
    }, [])

    /* ── price bounds from loaded products ── */
    const { priceLow, priceHigh } = useMemo(() => ({
        priceLow:  allProducts.length ? Math.floor(Math.min(...allProducts.map(p => p.price))) : 0,
        priceHigh: allProducts.length ? Math.ceil(Math.max(...allProducts.map(p => p.price)))  : 99999,
    }), [allProducts])

    /* ── in-memory filter + sort (no API call) ── */
    const products = useMemo(() => {
        let list = [...allProducts]

        // category
        if (categoryId) list = list.filter(p => (p as any).categoryId === categoryId)

        // search
        if (debSearch.trim()) {
            const q = debSearch.toLowerCase()
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.categoryName?.toLowerCase().includes(q)
            )
        }

        // price
        const lo = priceMin !== '' ? Number(priceMin) : null
        const hi = priceMax !== '' ? Number(priceMax) : null
        if (lo !== null) list = list.filter(p => p.price >= lo)
        if (hi !== null) list = list.filter(p => p.price <= hi)

        // sort
        const [by, dir] = sort.split(',')
        list.sort((a: any, b: any) => {
            let va = a[by] ?? 0, vb = b[by] ?? 0
            if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase() }
            return dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
        })

        return list
    }, [allProducts, categoryId, debSearch, priceMin, priceMax, sort])

    /* ── sync URL (without triggering refetch) ── */
    useEffect(() => {
        const p = new URLSearchParams()
        if (search)     p.set('search', search)
        if (categoryId) p.set('cat', String(categoryId))
        if (sort !== 'createdAt,desc') p.set('sort', sort)
        if (priceMin)   p.set('pmin', priceMin)
        if (priceMax)   p.set('pmax', priceMax)
        router.replace(`/products${p.size ? '?' + p : ''}`, { scroll: false })
    }, [search, categoryId, sort, priceMin, priceMax, router])

    /* ── suggestions from loaded products ── */
    const suggestions = useMemo(() => {
        if (!search.trim() || search.length < 1) return []
        const q = search.toLowerCase()
        return allProducts
            .filter(p => p.name.toLowerCase().includes(q) || p.categoryName?.toLowerCase().includes(q))
            .slice(0, 6)
    }, [search, allProducts])

    /* ── close dropdowns on outside click ── */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (showPrice && priceRef.current && !priceRef.current.contains(e.target as Node)) setShowPrice(false)
            if (showSort  && sortRef.current  && !sortRef.current.contains(e.target as Node))  setShowSort(false)
            if (showSuggestions && searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showPrice, showSort, showSuggestions])

    const activeFilterCount = [categoryId, priceMin || priceMax].filter(Boolean).length
    const activeSortLabel   = SORT_OPTIONS.find(o => o.value === sort)?.label || ''
    const hasPriceFilter    = priceMin !== '' || priceMax !== ''

    const reset = () => { setSearch(''); setCategoryId(null); setPriceMin(''); setPriceMax(''); setSort('createdAt,desc') }

    return (
        <div className="min-h-screen">
            <PageBanner label="Sefa — Maison de Mode" title="La Collection"
                subtitle={loading ? 'Chargement…' : `${products.length} pièce${products.length > 1 ? 's' : ''}`} />

            {/* ── Filter bar ─────────────────────────────────────────── */}
            <div className="sticky top-[112px] z-40 bg-white/95 dark:bg-[#111]/95 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.06]">
                <div className="container-xl">

                    {/* Row 1: search + controls */}
                    <div className="flex items-center gap-0 divide-x divide-black/[0.06] dark:divide-white/[0.06] h-14">

                        {/* Search */}
                        <div ref={searchRef} className="relative flex items-center gap-2.5 flex-1 px-4 h-full">
                            <Search className="w-3.5 h-3.5 text-black/25 dark:text-white/25 shrink-0" strokeWidth={1.5} />
                            <input
                                type="text" value={search}
                                onChange={e => { setSearch(e.target.value); setShowSuggestions(true) }}
                                onFocus={() => search && setShowSuggestions(true)}
                                onKeyDown={e => { if (e.key === 'Escape') setShowSuggestions(false) }}
                                placeholder="Rechercher un article…"
                                className="flex-1 bg-transparent border-none text-[11px] tracking-wide focus:ring-0 placeholder:text-black/20 dark:placeholder:text-white/20 outline-none text-black dark:text-white min-w-0"
                            />
                            {search && (
                                <button onClick={() => { setSearch(''); setShowSuggestions(false) }}
                                    className="text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            )}

                            {/* Suggestions dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-px bg-white dark:bg-[#1a1a1a] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl z-50 overflow-hidden">
                                    {suggestions.map(p => {
                                        const img = publicImageUrl(p.images?.[0] ?? p.imageUrl)
                                        return (
                                            <Link
                                                key={p.id}
                                                href={`/products/${p.slug}`}
                                                onClick={() => setShowSuggestions(false)}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors group"
                                            >
                                                {/* Thumbnail */}
                                                <div className="w-10 h-12 shrink-0 bg-black/[0.04] dark:bg-white/[0.04] overflow-hidden">
                                                    {img
                                                        ? <img src={img} alt={p.name} className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full" />
                                                    }
                                                </div>
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-medium text-black dark:text-white truncate">{p.name}</p>
                                                    {p.categoryName && (
                                                        <p className="text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30 mt-0.5">{p.categoryName}</p>
                                                    )}
                                                </div>
                                                {/* Price + arrow */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[11px] font-bold text-black dark:text-white">{formatEuro(p.price)}</span>
                                                    <ArrowUpRight className="w-3 h-3 text-black/20 dark:text-white/20 group-hover:text-black dark:group-hover:text-white transition-colors" strokeWidth={1.5} />
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Prix filter */}
                        <div ref={priceRef} className="relative hidden sm:block">
                            <button
                                onClick={() => { setShowPrice(v => !v); setShowSort(false) }}
                                className={cls(
                                    'flex items-center gap-2 px-5 h-14 text-[10px] uppercase tracking-[0.22em] font-medium transition-colors whitespace-nowrap',
                                    hasPriceFilter
                                        ? 'text-black dark:text-white'
                                        : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
                                )}>
                                {hasPriceFilter
                                    ? `${priceMin || priceLow} – ${priceMax || priceHigh} DH`
                                    : 'Prix'}
                                {hasPriceFilter
                                    ? <X className="w-3 h-3 ml-1" onClick={e => { e.stopPropagation(); setPriceMin(''); setPriceMax('') }} />
                                    : <ChevronDown className="w-3 h-3" style={{ rotate: showPrice ? '180deg' : '0deg', transition: 'rotate .2s' }} />
                                }
                            </button>
                            {showPrice && (
                                <PricePanel min={priceLow} max={priceHigh}
                                    priceMin={priceMin} priceMax={priceMax}
                                    onApply={(mn, mx) => { setPriceMin(mn); setPriceMax(mx) }}
                                    onClose={() => setShowPrice(false)} />
                            )}
                        </div>

                        {/* Sort */}
                        <div ref={sortRef} className="relative">
                            <button
                                onClick={() => { setShowSort(v => !v); setShowPrice(false) }}
                                className="flex items-center gap-2 px-5 h-14 text-[10px] uppercase tracking-[0.22em] font-medium text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors whitespace-nowrap">
                                <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
                                <span className="hidden md:inline">{activeSortLabel}</span>
                                <span className="md:hidden">Trier</span>
                                <ChevronDown className="w-3 h-3" style={{ rotate: showSort ? '180deg' : '0deg', transition: 'rotate .2s' }} />
                            </button>
                            {showSort && (
                                <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-[#1a1a1a] border border-black/[0.08] dark:border-white/[0.08] shadow-xl z-50 overflow-hidden">
                                    {SORT_OPTIONS.map(o => (
                                        <button key={o.value} onClick={() => { setSort(o.value); setShowSort(false) }}
                                            className={cls(
                                                'w-full flex items-center justify-between px-5 py-3.5 text-[10px] uppercase tracking-[0.22em] text-left transition-colors',
                                                sort === o.value
                                                    ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                                                    : 'text-black/50 dark:text-white/50 hover:bg-black/4 dark:hover:bg-white/4 hover:text-black dark:hover:text-white'
                                            )}>
                                            {o.label}
                                            {sort === o.value && <Check className="w-3 h-3" strokeWidth={2.5} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Reset (visible only when filters active) */}
                        {(activeFilterCount > 0 || search || sort !== 'createdAt,desc') && (
                            <button onClick={reset}
                                className="flex items-center gap-1.5 px-4 h-14 text-[9px] uppercase tracking-widest text-black/25 dark:text-white/25 hover:text-black dark:hover:text-white transition-colors whitespace-nowrap">
                                <X className="w-3 h-3" /> Tout effacer
                            </button>
                        )}
                    </div>

                    {/* Row 2: category tabs */}
                    {categories.length > 0 && (
                        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none border-t border-black/[0.04] dark:border-white/[0.04]">
                            {[{ id: null, name: 'Tout' }, ...categories].map(cat => {
                                const active = cat.id === categoryId
                                return (
                                    <button key={cat.id ?? 'all'}
                                        onClick={() => setCategoryId(cat.id)}
                                        className={cls(
                                            'relative px-5 py-3 text-[9px] uppercase tracking-[0.25em] whitespace-nowrap transition-all duration-200 font-medium shrink-0',
                                            active
                                                ? 'text-black dark:text-white'
                                                : 'text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white'
                                        )}>
                                        {cat.name}
                                        {/* active underline */}
                                        <span className="absolute bottom-0 left-3 right-3 h-px bg-black dark:bg-white transition-all duration-250"
                                            style={{ opacity: active ? 1 : 0, transform: active ? 'scaleX(1)' : 'scaleX(0)' }} />
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Active filter pills (mobile prix) ─── */}
            {hasPriceFilter && (
                <div className="container-xl pt-4 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 font-semibold">
                        Prix : {priceMin || priceLow} – {priceMax || priceHigh} DH
                        <button onClick={() => { setPriceMin(''); setPriceMax('') }}
                            className="ml-1 opacity-60 hover:opacity-100">
                            <X className="w-2.5 h-2.5" />
                        </button>
                    </span>
                </div>
            )}

            {/* ── Grid ───────────────────────────────────────────────── */}
            <div className="container-xl py-16 pb-40">
                {loading || !fetched ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-14">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="space-y-3">
                                <div className="aspect-[3/4] bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />
                                <div className="h-2.5 w-1/3 bg-black/[0.04] dark:bg-white/[0.04] animate-pulse rounded" />
                                <div className="h-3 w-2/3 bg-black/[0.04] dark:bg-white/[0.04] animate-pulse rounded" />
                            </div>
                        ))}
                    </div>
                ) : products.length === 0 && allProducts.length > 0 ? (
                    /* filtres actifs mais aucun résultat */
                    <div className="text-center py-40 space-y-6">
                        <p className="font-serif text-2xl text-black/20 dark:text-white/20">Aucun résultat</p>
                        <p className="text-[10px] uppercase tracking-widest text-black/20 dark:text-white/20">
                            Essayez d'élargir vos filtres
                        </p>
                        <button onClick={reset}
                            className="text-[9px] uppercase tracking-widest border-b border-black/20 dark:border-white/20 pb-px text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition-all">
                            Réinitialiser les filtres
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="text-[9px] uppercase tracking-widest text-black/20 dark:text-white/20 mb-10">
                            {products.length} résultat{products.length > 1 ? 's' : ''}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16">
                            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default function ProductsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen">
                <div className="bg-white dark:bg-[#111] py-20 border-b border-black/[0.05]" />
                <div className="h-14 bg-white dark:bg-[#111] border-b border-black/[0.06]" />
                <div className="container-xl py-16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => <div key={i} className="aspect-[3/4] bg-black/[0.04] dark:bg-white/[0.04] animate-pulse" />)}
                </div>
            </div>
        }>
            <ProductsContent />
        </Suspense>
    )
}
