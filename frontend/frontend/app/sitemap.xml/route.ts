import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://sefa.ma'
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8080/api'

function url(loc: string, priority: string, changefreq: string): string {
    const now = new Date().toISOString()
    return `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
}

export async function GET() {
    const urls: string[] = [
        url(BASE_URL,                   '1.0', 'daily'),
        url(`${BASE_URL}/products`,     '0.9', 'daily'),
        url(`${BASE_URL}/categorie`,    '0.7', 'weekly'),
    ]

    try {
        const [productsRes, categoriesRes] = await Promise.all([
            fetch(`${BACKEND_URL}/products?limit=1000`),
            fetch(`${BACKEND_URL}/categories`),
        ])

        if (productsRes.ok) {
            const data = await productsRes.json()
            const products: { slug: string; updated_at?: string }[] = Array.isArray(data) ? data : (data.results ?? [])
            for (const p of products) {
                urls.push(url(`${BASE_URL}/products/${p.slug}`, '0.8', 'weekly'))
            }
        }

        if (categoriesRes.ok) {
            const data = await categoriesRes.json()
            const categories: { id: number }[] = Array.isArray(data) ? data : (data.results ?? [])
            for (const c of categories) {
                urls.push(url(`${BASE_URL}/categorie?id=${c.id}`, '0.6', 'weekly'))
            }
        }
    } catch {
        // retourne au moins les pages statiques
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'no-store',
        },
    })
}
