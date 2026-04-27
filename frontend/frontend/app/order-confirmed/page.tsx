'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle, ShoppingBag } from 'lucide-react'

function Content() {
    return (
        <div className="min-h-screen flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center space-y-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" strokeWidth={1} />
                <div className="space-y-3">
                    <h1 className="text-3xl font-serif text-black dark:text-white">Commande confirmée</h1>
                    <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
                        Merci pour votre commande ! Nous vous contacterons par téléphone pour confirmer la livraison.
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">Paiement à la livraison · Livraison gratuite</p>
                </div>
                <div className="flex flex-col gap-3 pt-4">
                    <Link href="/products"
                        className="inline-flex items-center justify-center gap-2 bg-brand-500 text-white dark:bg-white dark:text-black text-[9px] uppercase tracking-[0.3em] px-8 py-4 hover:bg-black hover:text-white transition-colors font-semibold">
                        <ShoppingBag className="w-4 h-4" strokeWidth={1.5} /> Continuer mes achats
                    </Link>
                    <Link href="/" className="text-[9px] uppercase tracking-widest text-black/30 dark:text-white/30 hover:text-brand-500 dark:hover:text-white transition-colors">
                        Retour à l'accueil
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function OrderConfirmedPage() {
    return <Suspense><Content /></Suspense>
}
