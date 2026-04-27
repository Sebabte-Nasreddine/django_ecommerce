import Image from 'next/image'
export const dynamic = 'force-dynamic'
import { HorizontalProductScroll } from '@/components/HorizontalProductScroll'
import { PromoTicker } from '@/components/PromoTicker'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.BACKEND_URL || 'http://backend:8080/api'

async function getHomeData() {
    try {
        const [featuredRes, featuredCatsRes] = await Promise.all([
            fetch(`${API_URL}/products?featured=true`, { cache: 'no-store' }),
            fetch(`${API_URL}/categories/featured`,    { cache: 'no-store' }),
        ])
        const featuredData = await featuredRes.json()
        const featuredCats = await featuredCatsRes.json()
        return {
            featured:   featuredData.content || featuredData || [],
            categories: Array.isArray(featuredCats) ? featuredCats : [],
        }
    } catch {
        return { featured: [], categories: [] }
    }
}

export default async function HomePage() {
    const { featured, categories } = await getHomeData()

    return (
        <>
            {/* ── Hero ─────────────────────────────────────────────────── */}
            <section className="relative h-[100dvh] min-h-[560px] sm:min-h-[700px] overflow-hidden" style={{ marginTop: '-112px' }}>
                <Image src="/images/bg-hero-desktop.jpg" alt="" fill priority
                    className="hidden md:block object-cover object-center" sizes="100vw" />
                <Image src="/images/bg-hero-mobile.jpg?v=3" alt="" fill priority
                    className="block md:hidden object-cover object-center" sizes="100vw" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-black/60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                <div className="absolute top-0 left-0 right-0 z-20 pt-8 px-8 md:px-16 flex justify-between items-center">
                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/50">Sefa — Maison de Mode</span>
                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/50">Collection 2026</span>
                </div>

                <div className="absolute inset-0 flex flex-col justify-end pb-10 sm:pb-16 md:pb-24 px-8 md:px-16 lg:px-24 z-10">
                    <div className="max-w-3xl">
                        <h1 className="font-serif leading-none mb-4 sm:mb-8 text-white">
                            <span className="block text-5xl sm:text-6xl md:text-8xl lg:text-[9rem] font-black tracking-tight">PURE</span>
                            <span className="block text-5xl sm:text-6xl md:text-8xl lg:text-[9rem] font-light italic tracking-wide opacity-80">Design.</span>
                        </h1>
                        <div className="flex flex-row items-end gap-6 sm:gap-16">
                            <p className="hidden sm:block text-xs text-white/55 leading-loose uppercase tracking-widest max-w-xs">
                                Une sélection exclusive de pièces<br />intemporelles pour les esprits exigeants.
                            </p>
                            <Link href="/products"
                                className="inline-flex items-center gap-3 bg-white text-black text-[10px] uppercase tracking-widest font-bold px-5 sm:px-8 py-4 hover:bg-white/90 transition-all duration-300">
                                Découvrir <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-8 right-8 md:right-16 z-10 flex flex-col items-center gap-2">
                    <div className="w-px h-12 bg-white/20 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full bg-white/60"
                            style={{ height: '40%', animation: 'scrollLine 2s ease-in-out infinite' }} />
                    </div>
                    <span className="text-[8px] uppercase tracking-[0.3em] text-white/30 [writing-mode:vertical-rl]">Scroll</span>
                </div>
            </section>

            {/* ── Nouvelles Collections — horizontal scroll ──────────────── */}
            {featured.length > 0 && (
                <section id="nouvelles-collections" className="py-6 lg:py-10 bg-white dark:bg-[#0d0d0d]">
                    <HorizontalProductScroll
                        products={featured}
                        label="Nouveautés"
                        title="Nouvelles Collections"
                        subtitle="Sélectionnées par nos soins"
                        viewAllHref="/products"
                    />
                </section>
            )}

            {/* ── Promo Ticker ──────────────────────────────────────────── */}
            <PromoTicker />

            {/* ── Catégories vedettes — horizontal scroll ────────────────── */}
            {categories.map((cat: any, ci: number) => (
                cat.products?.length > 0 && (
                    <section key={cat.id}
                        className={`py-6 lg:py-10 border-t border-black/[0.04] dark:border-white/[0.04]
                            ${ci % 2 === 0 ? 'bg-surface dark:bg-[#111]' : 'bg-white dark:bg-[#0d0d0d]'}`}>
                        <HorizontalProductScroll
                            products={cat.products}
                            title={cat.name}
                            viewAllHref={`/categorie?id=${cat.id}`}
                        />
                    </section>
                )
            ))}

            {/* ── Contact ───────────────────────────────────────────────── */}
            <section id="contact" className="py-24 bg-white dark:bg-[#0d0d0d] border-t border-black/[0.03] dark:border-white/[0.05]">
                <div className="container-xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-serif mb-4 dark:text-white">Contact</h2>
                        <p className="text-[10px] uppercase tracking-luxury text-brand-500/40 dark:text-white/40">Nous sommes là pour vous</p>
                    </div>
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 max-w-lg mx-auto">
                            <div>
                                <p className="text-[10px] uppercase tracking-luxury font-bold mb-2 text-brand-500/60 dark:text-white/50">Adresse</p>
                                <p className="text-sm text-brand-500/80 dark:text-white/70">1 Av. Ibn Sina<br />Berkane 60300</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-luxury font-bold mb-2 text-brand-500/60 dark:text-white/50">Téléphone</p>
                                <a href="tel:+212695240522" className="text-sm text-brand-500/80 dark:text-white/70 hover:text-brand-500 dark:hover:text-white transition-colors">+212 695-240522</a>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-6 pt-8 border-t border-black/[0.05] dark:border-white/[0.07]">
                            <a href="https://www.instagram.com/pourellefh?igsh=M3Vva2k1MGFlbjk2" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-brand-500/40 dark:text-white/40 hover:text-brand-500 dark:hover:text-white transition-colors">
                                Instagram
                            </a>
                            <span className="w-px h-4 bg-black/10 dark:bg-white/10" />
                            <a href="https://www.facebook.com/share/1Gj6qmkciy/" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-brand-500/40 dark:text-white/40 hover:text-brand-500 dark:hover:text-white transition-colors">
                                Facebook
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
