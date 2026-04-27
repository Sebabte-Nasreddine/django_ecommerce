import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Toaster } from 'react-hot-toast'
import { StorefrontGuard } from '@/components/StorefrontGuard'
import { AnnouncementBar } from '@/components/AnnouncementBar'
import { ThemeProvider } from '@/components/ThemeProvider'
import { WhatsAppButton } from '@/components/WhatsAppButton'

const BASE_URL = 'https://sefa.ma'

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title: {
        default: 'Sefa – Élégance Premium',
        template: '%s | Sefa',
    },
    description: 'Découvrez notre collection exclusive de pièces intemporelles. Livraison rapide, paiement sécurisé.',
    keywords: ['sefa', 'boutique', 'ecommerce', 'premium', 'mode'],
    authors: [{ name: 'Sefa' }],
    icons: {
        icon: '/favicon-32x32.png',
        shortcut: '/favicon-32x32.png',
        apple: '/apple-touch-icon.png',
    },
    openGraph: {
        type: 'website',
        url: BASE_URL,
        locale: 'fr_FR',
        siteName: 'Sefa',
        title: 'Sefa – Élégance Premium',
        description: 'Boutique en ligne premium – pièces de qualité supérieure.',
        images: [
            {
                url: '/images/logo.png',
                width: 281,
                height: 97,
                alt: 'Sefa – Élégance Premium',
            },
        ],
    },
    twitter: {
        card: 'summary',
        title: 'Sefa – Élégance Premium',
        description: 'Boutique en ligne premium – pièces de qualité supérieure.',
        images: ['/images/logo.png'],
    },
    robots: { index: true, follow: true },
    themeColor: '#1a1a1a',
}

const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sefa',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
}

const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sefa',
    url: BASE_URL,
    potentialAction: {
        '@type': 'SearchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/products?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <head>
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
            </head>
            <body>
                <ThemeProvider>
                    <StorefrontGuard />
                    <AnnouncementBar />
                    <div className="h-10" />
                    <Header />
                    <main className="min-h-screen">{children}</main>
                    <Footer />
                    <WhatsAppButton />
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: '#1a1815',
                                color: '#f5f5f5',
                                border: '1px solid rgba(212,118,42,0.2)',
                            },
                            success: { iconTheme: { primary: '#d4762a', secondary: '#fff' } },
                        }}
                    />
                </ThemeProvider>
            </body>
        </html>
    )
}
