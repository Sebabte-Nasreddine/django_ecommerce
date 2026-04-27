'use client'
import Link from 'next/link'
import { ShoppingBag, Menu, X, Search, User, LogOut, LayoutDashboard } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { useRouter, usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import { ThemeToggle } from './ThemeToggle'

const navLinks = [
    { label: 'Accueil',     href: '/'          },
    { label: 'Collections', href: '/products'   },
    { label: 'Catégories',  href: '/categorie'  },
    { label: 'Contact',     href: '/#contact'   },
]

export function Header() {
    const [open,    setOpen]    = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const { logout, isAdmin, isAuthenticated } = useAuthStore()
    const { itemCount } = useCartStore()
    const router   = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    if (pathname.startsWith('/admin')) return null

    const handleLogout = () => {
        logout()
        toast.success('À bientôt !')
        router.push('/')
    }

    const isHome = pathname === '/'
    const solid  = scrolled || !isHome

    return (
        <>
            <header className={`fixed top-10 left-0 right-0 z-50 transition-all duration-500
                ${solid
                    ? 'bg-white/95 dark:bg-[#111]/95 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.06] shadow-sm'
                    : 'bg-transparent border-b border-transparent'
                }`}
            >
                <div className="px-6 md:px-10 lg:px-16">
                    <div className="relative flex items-center h-[72px]">

                        {/* Logo */}
                        <Link href="/" className="flex-shrink-0" style={{ marginRight: '30px' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/logo.png"
                                alt="SEFA"
                                className="h-7 md:h-10 w-auto block"
                                style={{
                                    transition: 'filter 0.4s',
                                    filter: solid ? 'var(--logo-filter, none)' : 'brightness(0) invert(1)',
                                }}
                            />
                        </Link>

                        {/* Nav */}
                        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
                            {navLinks.map(l => (
                                <Link key={l.href} href={l.href}
                                    className={`text-[9px] uppercase tracking-[0.25em] font-semibold transition-colors duration-300
                                        ${solid
                                            ? 'text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white'
                                            : 'text-white/60 hover:text-white'
                                        }`}>
                                    {l.label}
                                </Link>
                            ))}
                        </nav>

                        {/* Icons */}
                        <div className="hidden md:flex items-center gap-5 ml-auto">
                            <Link href="/products?search="
                                className={`transition-colors duration-300 ${solid
                                    ? 'text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white'
                                    : 'text-white/50 hover:text-white'}`}>
                                <Search className="w-4 h-4" strokeWidth={1.5} />
                            </Link>

                            <Link href="/cart"
                                className={`relative transition-colors duration-300 ${solid
                                    ? 'text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white'
                                    : 'text-white/50 hover:text-white'}`}>
                                <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                                {itemCount() > 0 && (
                                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-black dark:bg-white text-white dark:text-black text-[8px] font-bold rounded-full flex items-center justify-center">
                                        {itemCount()}
                                    </span>
                                )}
                            </Link>

                            {/* Theme toggle */}
                            <ThemeToggle solid={solid} />

                            {isAuthenticated() ? (
                                <div className="flex items-center gap-4">
                                    {isAdmin() && (
                                        <Link href="/admin"
                                            className={`transition-colors duration-300 ${solid
                                                ? 'text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white'
                                                : 'text-white/50 hover:text-white'}`}>
                                            <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
                                        </Link>
                                    )}
                                    <Link href="/profile"
                                        className={`transition-colors duration-300 ${solid
                                            ? 'text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white'
                                            : 'text-white/50 hover:text-white'}`}>
                                        <User className="w-4 h-4" strokeWidth={1.5} />
                                    </Link>
                                    <button onClick={handleLogout}
                                        className={`transition-colors duration-300 ${solid
                                            ? 'text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white'
                                            : 'text-white/50 hover:text-white'}`}>
                                        <LogOut className="w-4 h-4" strokeWidth={1.5} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-5 pl-2 border-l border-black/10 dark:border-white/10">
                                    <Link href="/login"
                                        className={`text-[9px] uppercase tracking-[0.25em] font-semibold transition-colors duration-300
                                            ${solid
                                                ? 'text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white'
                                                : 'text-white/60 hover:text-white'}`}>
                                        Connexion
                                    </Link>
                                    <Link href="/register"
                                        className={`text-[9px] uppercase tracking-[0.25em] font-semibold border px-5 py-2 transition-all duration-300
                                            ${solid
                                                ? 'border-black/20 text-black/70 hover:border-black hover:text-black dark:border-white/20 dark:text-white/70 dark:hover:border-white dark:hover:text-white'
                                                : 'border-white/30 text-white/70 hover:border-white hover:text-white'
                                            }`}>
                                        S'inscrire
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden flex items-center gap-4 ml-auto">
                            <Link href="/cart"
                                className={`relative ${solid ? 'text-black/60 dark:text-white/60' : 'text-white/70'}`}>
                                <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                                {itemCount() > 0 && (
                                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-black dark:bg-white text-white dark:text-black text-[8px] font-bold rounded-full flex items-center justify-center">
                                        {itemCount()}
                                    </span>
                                )}
                            </Link>
                            <ThemeToggle solid={solid} />
                            <button onClick={() => setOpen(!open)}
                                className={solid ? 'text-black/60 dark:text-white/60' : 'text-white/70'}>
                                {open ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {open && (
                    <div className="md:hidden bg-white dark:bg-[#111] border-t border-black/[0.06] dark:border-white/[0.06]">
                        <nav className="px-6 py-8 space-y-6">
                            {navLinks.map(l => (
                                <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                                    className="block text-[10px] uppercase tracking-[0.3em] font-semibold text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
                                    {l.label}
                                </Link>
                            ))}
                            <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.06] space-y-4">
                                {isAuthenticated() ? (
                                    <>
                                        {isAdmin() && (
                                            <Link href="/admin" onClick={() => setOpen(false)}
                                                className="block text-[10px] uppercase tracking-[0.3em] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white">
                                                Administration
                                            </Link>
                                        )}
                                        <button onClick={handleLogout}
                                            className="block text-[10px] uppercase tracking-[0.3em] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white">
                                            Déconnexion
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/login" onClick={() => setOpen(false)}
                                            className="block text-[10px] uppercase tracking-[0.3em] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white">
                                            Connexion
                                        </Link>
                                        <Link href="/register" onClick={() => setOpen(false)}
                                            className="inline-block text-[10px] uppercase tracking-[0.3em] border border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 px-6 py-3">
                                            S'inscrire
                                        </Link>
                                    </>
                                )}
                            </div>
                        </nav>
                    </div>
                )}
            </header>

            {/* Dark logo filter via CSS variable */}
            <style>{`
                .dark img[alt="SEFA"] { --logo-filter: brightness(0) invert(1); }
            `}</style>

            {!isHome && <div className="h-[112px]" />}
        </>
    )
}
