import { NextRequest, NextResponse } from 'next/server'

function backendOrigin(): string {
    return (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:8080').replace(
        /\/api\/?$/,
        ''
    )
}

/**
 * Proxy des fichiers /uploads du backend vers le même domaine que le front.
 * Fonctionne en local et dans Docker (BACKEND_URL=http://backend:8080/api).
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const segments = params.path || []
    const subPath = segments.join('/')
    if (!subPath || subPath.includes('..')) {
        return new NextResponse(null, { status: 400 })
    }

    const target = `${backendOrigin()}/uploads/${subPath}`
    try {
        const res = await fetch(target, {
            cache: 'no-store',
            headers: { Accept: 'image/*,*/*' },
        })
        if (!res.ok) {
            return new NextResponse(null, { status: res.status === 404 ? 404 : 502 })
        }
        const buf = await res.arrayBuffer()
        const contentType = res.headers.get('content-type') || 'application/octet-stream'
        return new NextResponse(buf, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
        })
    } catch {
        return new NextResponse(null, { status: 502 })
    }
}

export const runtime = 'nodejs'
