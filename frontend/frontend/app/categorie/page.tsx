'use client'
import { useEffect, useState, Suspense } from 'react'
import Image from 'next/image'
import { categoryApi, productApi } from '@/lib/api'
import { ProductCard } from '@/components/ProductCard'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { publicImageUrl } from '@/lib/mediaUrl'

function CategorieContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const categoryId = searchParams.get('id')

    const [categories, setCategories] = useState<any[]>([])
    const [selectedCategory, setSelectedCategory] = useState<any>(null)
    const [products, setProducts] = useState<any[]>([])
    const [loadingCats, setLoadingCats] = useState(true)
    const [loadingProds, setLoadingProds] = useState(false)
    const initialCategoryId = categoryId

    // Load categories once on mount only — never re-fetch on URL change
    useEffect(() => {
        categoryApi.list()
            .then((data: any) => {
                const cats = Array.isArray(data) ? data : []
                setCategories(cats)
                if (initialCategoryId) {
                    const found = cats.find((c: any) => c.id === parseInt(initialCategoryId))
                    if (found) setSelectedCategory(found)
                }
            })
            .catch(() => {})
            .finally(() => setLoadingCats(false))
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Load products when category selected
    useEffect(() => {
        if (!selectedCategory) { setProducts([]); return }
        setLoadingProds(true)
        productApi.list({ categoryId: selectedCategory.id })
            .then((data: any) => setProducts(Array.isArray(data) ? data : (data.content || [])))
            .catch(() => setProducts([]))
            .finally(() => setLoadingProds(false))
    }, [selectedCategory])

    const selectCategory = (cat: any) => {
        setSelectedCategory(cat)
        router.push(`/categorie?id=${cat.id}`, { scroll: false })
    }

    const clearCategory = () => {
        setSelectedCategory(null)
        router.replace('/categorie', { scroll: false })
    }

    // ── Vue produits d'une catégorie ──────────────────────────────────────
    if (selectedCategory) {
        return (
            <div className="min-h-screen">
                {/* Header catégorie sans image */}
                <div className="bg-white dark:bg-[#111] border-b border-black/[0.05] dark:border-white/[0.06] py-14 px-8 md:px-16">
                    <p className="text-[9px] uppercase tracking-luxury text-black/30 dark:text-white/30 mb-4">Collection</p>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-black dark:text-white mb-4">
                        {selectedCategory.name}
                    </h1>
                    {selectedCategory.description && (
                        <p className="text-xs text-black/45 dark:text-white/45 leading-relaxed max-w-sm">
                            {selectedCategory.description}
                        </p>
                    )}
                    <button
                        onClick={clearCategory}
                        className="mt-8 flex items-center gap-2 text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 hover:text-brand-500 dark:hover:text-brand-500 transition-colors w-fit"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Toutes les catégories
                    </button>
                </div>

                {/* Produits */}
                <div className="container-xl py-8">

                    {loadingProds ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="aspect-[3/4] bg-surface-100 border border-black/[0.04] animate-pulse" />
                            ))}
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-32 border border-black/[0.03] dark:border-white/[0.04] bg-white dark:bg-[#1a1a1a]">
                            <p className="text-[10px] uppercase tracking-luxury text-black/25 dark:text-white/25">
                                Aucun produit dans cette catégorie
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-[10px] uppercase tracking-luxury text-black/30 dark:text-white/30 mb-10">
                                {products.length} pièce{products.length > 1 ? 's' : ''}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16">
                                {products.map((p: any, i: number) => (
                                    <ProductCard key={p.id} product={p} index={i} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        )
    }

    // ── Vue grille de catégories ──────────────────────────────────────────
    return (
        <div className="min-h-screen">
            {/* Header */}
            <section className="bg-white dark:bg-[#111] py-20 border-b border-black/[0.05] dark:border-white/[0.06] text-center">
                <div className="container-xl">
                    <h1 className="text-5xl md:text-6xl font-serif mb-4 uppercase tracking-tight text-brand-500 dark:text-white">Nos Collections</h1>
                    <div className="h-px w-16 bg-black/10 dark:bg-white/10 mx-auto mb-6" />
                    <p className="text-[10px] uppercase tracking-luxury text-black/30 dark:text-white/30">
                        Choisissez votre univers
                    </p>
                </div>
            </section>

            {/* Grille de catégories avec grandes images */}
            <div className="container-xl py-16">
                {loadingCats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="aspect-[4/5] bg-surface-100 border border-black/[0.04] animate-pulse" />
                        ))}
                    </div>
                ) : categories.length === 0 ? (
                    <p className="text-center text-[10px] uppercase tracking-luxury text-black/25 py-32">
                        Aucune catégorie disponible
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => selectCategory(cat)}
                                className="group relative aspect-[4/5] overflow-hidden bg-surface-100 text-left"
                            >
                                {cat.image ? (
                                    <Image
                                        src={publicImageUrl(cat.image) || cat.image}
                                        alt={cat.name}
                                        fill
                                        loading="lazy"
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-100 transition-transform duration-700 group-hover:scale-105" />
                                )}
                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent group-hover:from-black/70 transition-all duration-500" />
                                {/* Text */}
                                <div className="absolute inset-0 flex flex-col justify-end p-8">
                                    <p className="text-[9px] uppercase tracking-luxury text-white/60 mb-2">Collection</p>
                                    <h2 className="text-3xl font-serif font-bold text-white tracking-tight mb-2">
                                        {cat.name}
                                    </h2>
                                    {cat.description && (
                                        <p className="text-xs text-white/60 line-clamp-2 mb-4">{cat.description}</p>
                                    )}
                                    <span className="text-[9px] uppercase tracking-widest text-white/50 group-hover:text-white transition-colors border-b border-white/20 group-hover:border-white/60 pb-0.5 w-fit">
                                        Découvrir →
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function CategoriePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-black/5 border-t-brand-500 rounded-full animate-spin" />
            </div>
        }>
            <CategorieContent />
        </Suspense>
    )
}
