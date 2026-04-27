/**
 * Transforme une URL d'image en chemin relatif pour le navigateur.
 * En production, /uploads/ est servi par Nginx directement.
 */
export function publicImageUrl(url: string | undefined | null): string | undefined {
    if (url == null || String(url).trim() === '') return undefined
    const u = String(url).trim()
    
    // Si c'est déjà un chemin absolu ou URL complète
    if (u.startsWith('http://') || u.startsWith('https://')) {
        return u
    }
    
    // Si c'est /uploads/xxx, retourner tel quel (Nginx proxy vers backend)
    if (u.startsWith('/uploads/')) {
        return u
    }
    
    // Pour /api/media/xxx, convertir en /uploads/xxx
    if (u.startsWith('/api/media/')) {
        return '/uploads/' + u.slice('/api/media/'.length)
    }
    
    return u
}
