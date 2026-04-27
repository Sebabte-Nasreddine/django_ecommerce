'use client'
import Link from 'next/link'
import { Phone, MapPin, Instagram, Facebook } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function Footer() {
    const pathname = usePathname()
    if (pathname.startsWith('/admin')) return null

    return (
        <footer className="bg-white dark:bg-[#111] border-t border-black/[0.05] dark:border-white/[0.06] mt-20">
            <div className="container-xl py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
                    {/* Brand */}
                    <div className="space-y-6">
                        <Link href="/" className="font-serif text-2xl font-black text-brand-500 dark:text-white tracking-tight">SEFA</Link>
                        <p className="text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30 leading-loose max-w-xs">
                            Une sélection exclusive de pièces intemporelles pour les esprits exigeants.
                        </p>
                        <div className="flex gap-5">
                            <a href="https://www.facebook.com/share/1Gj6qmkciy/" target="_blank" rel="noopener noreferrer"
                                className="text-black/20 dark:text-white/20 hover:text-brand-500 dark:hover:text-white transition-colors">
                                <Facebook className="w-4 h-4" strokeWidth={1.5} />
                            </a>
                            <a href="https://www.instagram.com/pourellefh?igsh=M3Vva2k1MGFlbjk2" target="_blank" rel="noopener noreferrer"
                                className="text-black/20 dark:text-white/20 hover:text-brand-500 dark:hover:text-white transition-colors">
                                <Instagram className="w-4 h-4" strokeWidth={1.5} />
                            </a>
                        </div>
                    </div>

                    {/* Boutique */}
                    <div>
                        <h3 className="text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 dark:text-white/40 mb-6">Boutique</h3>
                        <ul className="space-y-3">
                            {[
                                { label: 'Tous les produits', href: '/products' },
                                { label: 'Collections',       href: '/categorie' },
                                { label: 'Nouveautés',        href: '/products?sort=createdAt,desc' },
                            ].map(({ label, href }) => (
                                <li key={href}>
                                    <Link href={href} className="text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30 hover:text-brand-500 dark:hover:text-white transition-colors">
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Maison */}
                    <div>
                        <h3 className="text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 dark:text-white/40 mb-6">Maison</h3>
                        <ul className="space-y-3">
                            {[
                                { label: 'Mon profil',     href: '/profile'   },
                                { label: 'Mes commandes',  href: '/orders'    },
                                { label: 'Connexion',      href: '/login'     },
                                { label: 'Nous rejoindre', href: '/register'  },
                            ].map(l => (
                                <li key={l.href}>
                                    <Link href={l.href} className="text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30 hover:text-brand-500 dark:hover:text-white transition-colors">
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-[9px] uppercase tracking-[0.3em] font-bold text-black/40 dark:text-white/40 mb-6">Contact</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30">
                                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
                                1 Av. Ibn Sina, Berkane 60300
                            </li>
                            <li className="flex items-center gap-3 text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30">
                                <Phone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                                <a href="tel:+212695240522" className="hover:text-brand-500 dark:hover:text-white transition-colors">+212 695-240522</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-black/[0.04] dark:border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4 text-[8px] uppercase tracking-[0.2em] text-black/20 dark:text-white/20">
                    <p>© {new Date().getFullYear()} Sefa — Tous droits réservés</p>
                    <div className="flex gap-8">
                        <Link href="#" className="hover:text-brand-500 dark:hover:text-white transition-colors">Confidentialité</Link>
                        <Link href="#" className="hover:text-brand-500 dark:hover:text-white transition-colors">Mentions Légales</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
