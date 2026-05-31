'use client'
import { useEffect, useState, useRef, FormEvent, ChangeEvent, ComponentType } from 'react'
import { adminApi, productApi, categoryApi, uploadApi, sizeApi, orderApi, productSizeApi, shippingApi, bannerApi, api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import {
    LayoutDashboard, Package, Tag, ShoppingBag, Users,
    Ticket, TrendingUp, Plus, Pencil, Trash2, X, Check,
    Eye, Ruler, LogOut, User, MapPin, Menu, ChevronRight,
    AlertCircle, Star, Megaphone, Truck, CreditCard, Gift, Phone, ImageIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatEuro } from '@/lib/formatPrice'
import { useAuthStore } from '@/store/auth'
import { publicImageUrl } from '@/lib/mediaUrl'

type Tab = 'dashboard' | 'products' | 'categories' | 'orders' | 'users' | 'promotions' | 'sizes' | 'reviews' | 'publicites' | 'livraison' | 'banniere'

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'EN ATTENTE',
    CONFIRMED: 'CONFIRMÉ',
    PROCESSING: 'PRÉPARATION',
    DELIVERED: 'LIVRÉ',
    CANCELLED: 'ANNULÉ',
}

const STATUS_COLOR: Record<string, string> = {
    PENDING:    'bg-amber-50  border-amber-200  text-amber-700',
    CONFIRMED:  'bg-blue-50   border-blue-200   text-blue-700',
    PROCESSING: 'bg-purple-50 border-purple-200 text-purple-700',
    DELIVERED:  'bg-green-50  border-green-200  text-green-700',
    CANCELLED:  'bg-red-50    border-red-200    text-red-700',
}

const ALLOWED_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'DELIVERED']

/* ─── helpers ──────────────────────────────────────────────────────────── */
function imgSrc(url: string | undefined | null): string {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('/uploads/')) return url
    return publicImageUrl(url) || url
}

function fullName(user: any) {
    if (!user) return '—'
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
}

function fmtDate(iso: string | undefined) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ─── Input component ──────────────────────────────────────────────────── */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-2">
        <label className="block text-[9px] uppercase tracking-luxury font-bold text-black/40">{label}</label>
        {children}
    </div>
)

const inputCls = "w-full bg-surface border-none px-4 py-3 text-[11px] text-black focus:ring-1 focus:ring-black transition-all outline-none"

/* Resize image client-side before upload: avoids sending 5–8 MB raw phone photos */
async function resizeBeforeUpload(file: File, maxPx = 1000): Promise<File> {
    return new Promise((resolve) => {
        if (file.size < 200 * 1024) { resolve(file); return }
        const img = new window.Image()
        const objectUrl = URL.createObjectURL(file)
        img.onload = () => {
            URL.revokeObjectURL(objectUrl)
            let { width: w, height: h } = img
            if (w <= maxPx && h <= maxPx) { resolve(file); return }
            if (w > h) { h = Math.round(h * maxPx / w); w = maxPx }
            else        { w = Math.round(w * maxPx / h); h = maxPx }
            const canvas = document.createElement('canvas')
            canvas.width = w; canvas.height = h
            canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
            canvas.toBlob(
                (blob) => resolve(new File([blob!], file.name, { type: 'image/jpeg' })),
                'image/jpeg', 0.82
            )
        }
        img.src = objectUrl
    })
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function AdminPage() {
    const router = useRouter()
    const [tab, setTab]           = useState<Tab>('dashboard')
    const [sideOpen, setSideOpen] = useState(false)

    const [stats,      setStats]      = useState<any>({})
    const [products,   setProducts]   = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [orders,     setOrders]     = useState<any[]>([])
    const [users,      setUsers]      = useState<any[]>([])
    const [promos,     setPromos]     = useState<any[]>([])
    const [sizes,      setSizes]      = useState<any[]>([])
    const [reviews,    setReviews]    = useState<any[]>([])
    const [loading,    setLoading]    = useState(false)

    /* product modal */
    const [productModal,      setProductModal]      = useState(false)
    const [selectedProduct,   setSelectedProduct]   = useState<any>(null)
    const [productImages,     setProductImages]     = useState<string[]>([])
    const [productSizesStock, setProductSizesStock] = useState<Record<string, number>>({})
    const [formData, setFormData] = useState({
        name: '', slug: '', description: '',
        price: 0, compareAtPrice: '', categoryId: '',
        sizeIds: [] as number[], availableSizeIds: [] as number[],
        featured: false,
    })

    /* category modal */
    const [categoryModal,  setCategoryModal]  = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<any>(null)
    const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '', image: '' })

    /* size modal */
    const [sizeModal, setSizeModal] = useState(false)
    const [sizeName,  setSizeName]  = useState('')

    /* promo modal */
    const [promoModal,   setPromoModal]   = useState(false)
    const [selectedPromo, setSelectedPromo] = useState<any>(null)
    const [promoForm, setPromoForm] = useState({ code: '', discount: 0, minPurchase: 0, expiresAt: '', usageLimit: 0 })

    /* advertisement state */
    const [ads,        setAds]        = useState<any[]>([])
    const [adModal,    setAdModal]    = useState(false)
    const [selectedAd, setSelectedAd] = useState<any>(null)
    const [adForm,     setAdForm]     = useState({ text: '', icon: 'none', is_active: true, order: 0 })

    /* shipping state */
    const [shippingForm,    setShippingForm]    = useState({ shippingPrice: 0, freeShippingThreshold: '' })
    const [shippingSaving,  setShippingSaving]  = useState(false)

    /* banner state */
    const [bannerDesktop,   setBannerDesktop]   = useState('')
    const [bannerMobile,    setBannerMobile]    = useState('')
    const [bannerSaving,    setBannerSaving]    = useState(false)
    const [bannerDesktopErr, setBannerDesktopErr] = useState('')
    const [bannerMobileErr,  setBannerMobileErr]  = useState('')
    const bannerDesktopInputRef = useRef<HTMLInputElement>(null)
    const bannerMobileInputRef  = useRef<HTMLInputElement>(null)

    /* order modal */
    const [orderModal,   setOrderModal]   = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<any>(null)

    /* ── load data ────────────────────────────────────────────────────── */
    useEffect(() => { loadData() }, [tab])

    const loadData = async () => {
        setLoading(true)
        try {
            if      (tab === 'dashboard')             { setStats(await adminApi.stats()) }
            else if (tab === 'products')              { setProducts(await productApi.list()); setSizes(await sizeApi.list()); setCategories(await categoryApi.list()) }
            else if (tab === 'categories')            { setCategories(await categoryApi.list()) }
            else if (tab === 'orders')                { setOrders(await orderApi.list()) }
            else if (tab === 'users')                 { setUsers(await adminApi.users()) }
            else if (tab === 'promotions')            { setPromos(await adminApi.promos()) }
            else if (tab === 'sizes')                 { setSizes(await sizeApi.list()) }
            else if (tab === 'reviews')               { setReviews(await adminApi.reviews()) }
            else if (tab === 'publicites')            { setAds(await adminApi.advertisements()) }
            else if (tab === 'banniere')              {
                const b = await bannerApi.get()
                setBannerDesktop(b.desktopImage || '')
                setBannerMobile(b.mobileImage || '')
            }
            else if (tab === 'livraison')             {
                const s = await shippingApi.get()
                setShippingForm({ shippingPrice: s.shippingPrice, freeShippingThreshold: s.freeShippingThreshold ?? '' })
            }
        } catch { toast.error('Erreur de chargement') }
        finally  { setLoading(false) }
    }

    const saveShipping = async () => {
        setShippingSaving(true)
        try {
            await shippingApi.update({
                shippingPrice: Number(shippingForm.shippingPrice),
                freeShippingThreshold: shippingForm.freeShippingThreshold !== '' ? Number(shippingForm.freeShippingThreshold) : null,
            })
            toast.success('Paramètres de livraison enregistrés')
        } catch { toast.error('Erreur') }
        finally { setShippingSaving(false) }
    }

    /* Check aspect ratio + resize in one pass using createImageBitmap (async, non-blocking) */
    const processBannerImage = async (
        file: File,
        mode: 'desktop' | 'mobile',
        maxPx: number,
    ): Promise<File | null> => {
        let bitmap: ImageBitmap
        try {
            bitmap = await createImageBitmap(file)
        } catch {
            return file  // can't decode → upload as-is
        }
        const { width, height } = bitmap
        const ratio = width / height
        if (mode === 'desktop' && ratio < 1.5) {
            setBannerDesktopErr('Format paysage requis (ratio ≥ 3:2). Utilisez une image plus large que haute.')
            bitmap.close(); return null
        }
        if (mode === 'mobile' && ratio > 0.8) {
            setBannerMobileErr('Format portrait requis (ratio ≤ 4:5). Utilisez une image plus haute que large.')
            bitmap.close(); return null
        }
        // Skip resize if already small enough
        if (file.size < 200 * 1024 && width <= maxPx && height <= maxPx) {
            bitmap.close(); return file
        }
        let w = width, h = height
        if (w > maxPx || h > maxPx) {
            if (w > h) { h = Math.round(h * maxPx / w); w = maxPx }
            else        { w = Math.round(w * maxPx / h); h = maxPx }
        }
        // Prefer OffscreenCanvas (convertToBlob is async)
        if (typeof OffscreenCanvas !== 'undefined') {
            const oc = new OffscreenCanvas(w, h)
            oc.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
            bitmap.close()
            const blob = await oc.convertToBlob({ type: 'image/jpeg', quality: 0.82 })
            return new File([blob], file.name, { type: 'image/jpeg' })
        }
        // Fallback: regular canvas (bitmap already decoded so drawImage is fast)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
        bitmap.close()
        return new Promise(resolve => {
            canvas.toBlob(
                blob => resolve(new File([blob!], file.name, { type: 'image/jpeg' })),
                'image/jpeg', 0.82,
            )
        })
    }

    const onBannerDesktopChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return
        // Reset input so the same file can be re-selected after an error
        e.target.value = ''
        setBannerDesktopErr('')
        try {
            const optimized = await processBannerImage(file, 'desktop', 1600)
            if (!optimized) return
            const { url } = await uploadApi.image(optimized)
            setBannerDesktop(url)
            toast.success('Image desktop uploadée')
        } catch { toast.error('Erreur upload') }
    }

    const onBannerMobileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return
        e.target.value = ''
        setBannerMobileErr('')
        try {
            const optimized = await processBannerImage(file, 'mobile', 1000)
            if (!optimized) return
            const { url } = await uploadApi.image(optimized)
            setBannerMobile(url)
            toast.success('Image mobile uploadée')
        } catch { toast.error('Erreur upload') }
    }

    const saveBanner = async () => {
        setBannerSaving(true)
        try {
            await bannerApi.update({ desktopImage: bannerDesktop, mobileImage: bannerMobile })
            toast.success('Bannière enregistrée')
        } catch { toast.error('Erreur') }
        finally { setBannerSaving(false) }
    }

    const handleLogout = () => {
        useAuthStore.getState().logout()
        router.push('/')
    }

    /* ── nav ──────────────────────────────────────────────────────────── */
    const navItems: { id: Tab; label: string; icon: ComponentType<any> }[] = [
        { id: 'dashboard',              label: 'Tableau de bord',      icon: LayoutDashboard },
        { id: 'products',               label: 'Produits',              icon: Package },
        { id: 'categories',             label: 'Catégories',            icon: Tag },
        { id: 'orders',                 label: 'Commandes',             icon: ShoppingBag },
        { id: 'users',                  label: 'Utilisateurs',          icon: Users },
        { id: 'promotions',             label: 'Promotions',            icon: Ticket },
        { id: 'sizes',                  label: 'Tailles',               icon: Ruler },
        { id: 'reviews',                label: 'Avis clients',          icon: Star },
        { id: 'publicites',             label: 'Publicités',            icon: Megaphone },
        { id: 'livraison',              label: 'Livraison',             icon: Truck },
        { id: 'banniere',               label: 'Ajout d\'image',        icon: ImageIcon },
    ]

    const goTab = (t: Tab) => { setTab(t); setSideOpen(false) }

    /* ── product CRUD ─────────────────────────────────────────────────── */
    const openProductModal = (product?: any) => {
        if (product) {
            setSelectedProduct(product)
            setFormData({
                name:           product.name,
                slug:           product.slug,
                description:    product.description || '',
                price:          product.price,
                compareAtPrice: product.compareAtPrice || '',
                categoryId:     product.categoryId ?? '',
                sizeIds:        product.sizes?.map((s: any) => s.id) || [],
                availableSizeIds: [],
                featured:       product.featured || false,
            })
            const stockMap: Record<string, number> = {}
            product.sizes?.forEach((s: any) => { stockMap[s.name] = s.stockQuantity ?? 0 })
            setProductSizesStock(stockMap)
            setProductImages(product.images || [])
        } else {
            setSelectedProduct(null)
            setFormData({ name: '', slug: '', description: '', price: 0, compareAtPrice: '', categoryId: '', sizeIds: [], availableSizeIds: [], featured: false })
            setProductSizesStock({})
            setProductImages([])
        }
        setProductModal(true)
    }

    const onProductSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const payload = {
                name: formData.name, slug: formData.slug, description: formData.description,
                price: formData.price,
                compareAtPrice: formData.compareAtPrice || null,
                categoryId: formData.categoryId || null,
                sizeIds: formData.sizeIds,
                featured: formData.featured,
                images: productImages,
            }
            let pid: number
            if (selectedProduct) {
                await productApi.update(selectedProduct.id, payload)
                pid = selectedProduct.id
                toast.success('Produit mis à jour')
            } else {
                const p = await productApi.create(payload)
                pid = p.id
                toast.success('Produit créé')
            }
            // sync stock for each size
            for (const sizeId of formData.sizeIds) {
                const sz = sizes.find((s: any) => s.id === sizeId)
                if (sz && productSizesStock[sz.name] !== undefined) {
                    await productSizeApi.upsert(pid, sizeId, { stock: productSizesStock[sz.name] })
                }
            }
            setProductModal(false)
            loadData()
        } catch { toast.error('Erreur lors de la sauvegarde') }
        finally  { setLoading(false) }
    }

    const onImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const optimized = await resizeBeforeUpload(file)
            const { url } = await uploadApi.image(optimized)
            setProductImages(prev => [...prev, url])
            toast.success('Image ajoutée')
        } catch { toast.error("Erreur d'upload") }
        e.target.value = ''
    }

    const deleteProduct = async (id: number) => {
        if (!confirm('Supprimer ce produit ?')) return
        try { await productApi.delete(id); toast.success('Produit supprimé'); loadData() }
        catch { toast.error('Erreur') }
    }

    /* ── category CRUD ────────────────────────────────────────────────── */
    const openCategoryModal = (c?: any) => {
        if (c) { setSelectedCategory(c); setCategoryForm({ name: c.name, slug: c.slug, description: c.description || '', image: c.image || '' }) }
        else   { setSelectedCategory(null); setCategoryForm({ name: '', slug: '', description: '', image: '' }) }
        setCategoryModal(true)
    }

    const onCategoryImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const optimized = await resizeBeforeUpload(file)
            const { url } = await uploadApi.image(optimized)
            setCategoryForm(prev => ({ ...prev, image: url }))
            toast.success('Image ajoutée')
        } catch { toast.error("Erreur d'upload") }
        e.target.value = ''
    }

    const onCategorySubmit = async (e: FormEvent) => {
        e.preventDefault(); setLoading(true)
        try {
            if (selectedCategory) { await categoryApi.update(selectedCategory.id, categoryForm); toast.success('Catégorie mise à jour') }
            else                  { await categoryApi.create(categoryForm); toast.success('Catégorie créée') }
            setCategoryModal(false); loadData()
        } catch { toast.error('Erreur') } finally { setLoading(false) }
    }

    const deleteCategory = async (id: number) => {
        if (!confirm('Supprimer cette catégorie ?')) return
        try { await categoryApi.delete(id); toast.success('Catégorie supprimée'); loadData() }
        catch { toast.error('Erreur') }
    }

    /* ── size CRUD ────────────────────────────────────────────────────── */
    const onSizeSubmit = async (e: FormEvent) => {
        e.preventDefault(); setLoading(true)
        try { await sizeApi.create({ name: sizeName.trim().toUpperCase() }); toast.success('Taille créée'); setSizeModal(false); setSizeName(''); loadData() }
        catch { toast.error('Erreur') } finally { setLoading(false) }
    }

    const deleteSize = async (id: number) => {
        if (!confirm('Supprimer cette taille ?')) return
        try { await sizeApi.delete(id); toast.success('Taille supprimée'); loadData() }
        catch { toast.error('Erreur') }
    }

    /* ── promo CRUD ───────────────────────────────────────────────────── */
    const openPromoModal = (p?: any) => {
        if (p) { setSelectedPromo(p); setPromoForm({ code: p.code, discount: p.discount, minPurchase: p.minPurchase, expiresAt: p.expiresAt ? p.expiresAt.split('T')[0] : '', usageLimit: p.usageLimit }) }
        else   { setSelectedPromo(null); setPromoForm({ code: '', discount: 0, minPurchase: 0, expiresAt: '', usageLimit: 0 }) }
        setPromoModal(true)
    }

    const onPromoSubmit = async (e: FormEvent) => {
        e.preventDefault(); setLoading(true)
        try {
            const payload = { ...promoForm, expiresAt: promoForm.expiresAt ? new Date(promoForm.expiresAt).toISOString() : null }
            if (selectedPromo) { await adminApi.updatePromo(selectedPromo.id, payload); toast.success('Promotion mise à jour') }
            else               { await adminApi.createPromo(payload); toast.success('Promotion créée') }
            setPromoModal(false); loadData()
        } catch { toast.error('Erreur') } finally { setLoading(false) }
    }

    const deletePromo = async (id: number) => {
        if (!confirm('Supprimer cette promotion ?')) return
        try { await adminApi.deletePromo(id); toast.success('Promotion supprimée'); loadData() }
        catch { toast.error('Erreur') }
    }

    /* ── advertisement CRUD ──────────────────────────────────────────────── */
    const openAdModal = (ad?: any) => {
        if (ad) {
            setSelectedAd(ad)
            setAdForm({ text: ad.text, icon: ad.icon || 'none', is_active: ad.is_active, order: ad.order })
        } else {
            setSelectedAd(null)
            setAdForm({ text: '', icon: 'none', is_active: true, order: 0 })
        }
        setAdModal(true)
    }

    const onAdSubmit = async (e: FormEvent) => {
        e.preventDefault(); setLoading(true)
        try {
            if (selectedAd) { await adminApi.updateAd(selectedAd.id, adForm); toast.success('Publicité mise à jour') }
            else            { await adminApi.createAd(adForm); toast.success('Publicité créée') }
            setAdModal(false); loadData()
        } catch { toast.error('Erreur') } finally { setLoading(false) }
    }

    const deleteAd = async (id: number) => {
        if (!confirm('Supprimer cette publicité ?')) return
        try { await adminApi.deleteAd(id); toast.success('Publicité supprimée'); loadData() }
        catch { toast.error('Erreur') }
    }

    const toggleAdActive = async (ad: any) => {
        try {
            await adminApi.updateAd(ad.id, { is_active: !ad.is_active })
            toast.success(ad.is_active ? 'Publicité désactivée' : 'Publicité activée')
            loadData()
        } catch { toast.error('Erreur') }
    }

    /* ── order status ─────────────────────────────────────────────────── */
    const updateOrderStatus = async (orderId: number, status: string) => {
        try {
            await orderApi.updateStatus(orderId, status)
            const updated = orders.map(o => o.id === orderId ? { ...o, status } : o)
            setOrders(updated)
            if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status })
            toast.success('Statut mis à jour')
        } catch { toast.error('Erreur') }
    }

    const deleteOrder = async (orderId: number) => {
        if (!confirm(`Supprimer la commande #${orderId} ? Cette action est irréversible.`)) return
        try {
            await orderApi.adminDelete(orderId)
            setOrders(prev => prev.filter(o => o.id !== orderId))
            if (selectedOrder?.id === orderId) setOrderModal(false)
            toast.success('Commande supprimée')
        } catch { toast.error('Erreur lors de la suppression') }
    }

    /* ════════════════════════════════════════════════════════════════════
       RENDER
    ════════════════════════════════════════════════════════════════════ */
    const currentNav = navItems.find(n => n.id === tab)

    const Sidebar = () => (
        <aside className="flex flex-col h-full bg-white border-r border-black/5">
            {/* Brand */}
            <div className="px-8 py-8 border-b border-black/5">
                <p className="text-2xl font-serif tracking-tighter text-black">SEFA</p>
                <p className="text-[8px] uppercase tracking-luxury text-black/30 mt-1">Administration</p>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
                {navItems.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => goTab(id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 mb-1 text-left text-[10px] uppercase tracking-wider transition-all rounded-sm
                            ${tab === id
                                ? 'bg-black text-white font-bold'
                                : 'text-black/50 hover:bg-black/5 hover:text-black'}`}>
                        <Icon className="w-4 h-4 shrink-0" strokeWidth={tab === id ? 2 : 1.5} />
                        {label}
                        {tab === id && <ChevronRight className="w-3 h-3 ml-auto" />}
                    </button>
                ))}
            </nav>

            {/* Footer */}
            <div className="px-6 py-6 border-t border-black/5">
                <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] uppercase tracking-wider text-black/40 hover:text-red-500 hover:bg-red-50 transition-all rounded-sm">
                    <LogOut className="w-4 h-4" strokeWidth={1.5} />
                    Déconnexion
                </button>
            </div>
        </aside>
    )

    return (
        <div className="min-h-screen flex bg-zinc-50">
            {/* Desktop sidebar */}
            <div className="hidden lg:flex w-64 shrink-0 flex-col fixed inset-y-0 left-0 z-30">
                <Sidebar />
            </div>

            {/* Mobile sidebar overlay */}
            {sideOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setSideOpen(false)} />
                    <div className="absolute left-0 top-0 bottom-0 w-72 z-50">
                        <Sidebar />
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

                {/* Top bar */}
                <header className="sticky top-0 z-20 bg-white border-b border-black/5 px-6 py-4 flex items-center gap-4">
                    <button onClick={() => setSideOpen(true)} className="lg:hidden p-2 hover:bg-zinc-100 rounded-sm transition-colors">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-sm font-bold uppercase tracking-widest text-black">
                            {currentNav?.label}
                        </h1>
                        <p className="text-[9px] uppercase tracking-luxury text-black/30 mt-0.5">Centre d'administration SEFA</p>
                    </div>
                    {loading && (
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    )}
                </header>

                {/* Page body */}
                <main className="flex-1 p-6 lg:p-8 space-y-6">

                    {/* ── DASHBOARD ──────────────────────────────────────── */}
                    {tab === 'dashboard' && (
                        <div className="space-y-6">
                            {/* KPI cards */}
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                                {[
                                    { label: 'Commandes totales',   value: stats.totalOrders   ?? '—', icon: ShoppingBag, color: 'text-blue-600',   bg: 'bg-blue-50' },
                                    { label: 'Produits actifs',     value: stats.totalProducts ?? '—', icon: Package,     color: 'text-purple-600', bg: 'bg-purple-50' },
                                    { label: 'Clients inscrits',    value: stats.totalUsers    ?? '—', icon: Users,       color: 'text-green-600',  bg: 'bg-green-50' },
                                    { label: 'Revenus du mois',     value: stats.monthlyRevenue != null ? formatEuro(stats.monthlyRevenue) : '—', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
                                ].map(({ label, value, icon: Icon, color, bg }) => (
                                    <div key={label} className="bg-white border border-black/5 p-6 rounded-sm">
                                        <div className={`w-10 h-10 ${bg} rounded-sm flex items-center justify-center mb-4`}>
                                            <Icon className={`w-5 h-5 ${color}`} strokeWidth={1.5} />
                                        </div>
                                        <p className="text-2xl font-bold text-black">{value}</p>
                                        <p className="text-[10px] uppercase tracking-wider text-black/40 mt-1">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Revenue + Orders by status */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white border border-black/5 p-6 rounded-sm space-y-4">
                                    <h2 className="text-[10px] uppercase tracking-luxury font-bold text-black/50">Revenus totaux</h2>
                                    <p className="text-4xl font-serif text-black">{stats.totalRevenue != null ? formatEuro(stats.totalRevenue) : '—'}</p>
                                    <div className="pt-4 border-t border-black/5">
                                        <p className="text-[9px] uppercase tracking-wider text-black/30 mb-1">Ce mois-ci</p>
                                        <p className="text-xl font-bold text-black">{stats.monthlyRevenue != null ? formatEuro(stats.monthlyRevenue) : '—'}</p>
                                    </div>
                                </div>

                                <div className="bg-white border border-black/5 p-6 rounded-sm space-y-4">
                                    <h2 className="text-[10px] uppercase tracking-luxury font-bold text-black/50">Commandes par statut</h2>
                                    {stats.ordersByStatus?.length > 0 ? (
                                        <div className="space-y-3">
                                            {stats.ordersByStatus.map((s: any) => (
                                                <div key={s.status} className="flex items-center gap-3">
                                                    <span className={`text-[9px] uppercase px-2 py-1 border rounded-sm font-bold ${STATUS_COLOR[s.status] || 'bg-zinc-50 border-zinc-200 text-zinc-500'}`}>
                                                        {STATUS_LABEL[s.status] || s.status}
                                                    </span>
                                                    <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                                                        <div className="h-full bg-black rounded-full"
                                                            style={{ width: `${Math.min(100, (s.count / (stats.totalOrders || 1)) * 100)}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-black">{s.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-black/30 italic">Aucune commande</p>
                                    )}
                                </div>
                            </div>

                            {/* Quick links */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {navItems.slice(1).map(({ id, label, icon: Icon }) => (
                                    <button key={id} onClick={() => goTab(id)}
                                        className="bg-white border border-black/5 p-4 flex flex-col items-center gap-3 hover:border-black/20 hover:shadow-sm transition-all rounded-sm group">
                                        <Icon className="w-5 h-5 text-black/30 group-hover:text-black transition-colors" strokeWidth={1.5} />
                                        <span className="text-[9px] uppercase tracking-wider text-black/40 group-hover:text-black transition-colors">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── PRODUCTS ───────────────────────────────────────── */}
                    {tab === 'products' && (
                        <div className="bg-white border border-black/5 rounded-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
                                <p className="text-[10px] uppercase tracking-wider text-black/40 font-bold">{products.length} produit(s)</p>
                                <button onClick={() => openProductModal()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-800 transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Nouveau
                                </button>
                            </div>

                            {products.length === 0 ? (
                                <div className="py-20 text-center text-black/30">
                                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" strokeWidth={1} />
                                    <p className="text-[11px] uppercase tracking-wider">Aucun produit</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-zinc-50 text-[9px] uppercase tracking-wider text-black/40">
                                                <th className="px-6 py-3 text-left font-bold">Produit</th>
                                                <th className="px-6 py-3 text-left font-bold hidden sm:table-cell">Catégorie</th>
                                                <th className="px-6 py-3 text-left font-bold">Prix</th>
                                                <th className="px-6 py-3 text-left font-bold hidden md:table-cell">Tailles</th>
                                                <th className="px-6 py-3 text-left font-bold hidden md:table-cell">Vedette</th>
                                                <th className="px-6 py-3 text-right font-bold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/[0.04]">
                                            {products.map((p: any) => (
                                                <tr key={p.id} className="hover:bg-zinc-50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-zinc-100 border border-black/5 shrink-0 overflow-hidden">
                                                                {p.images?.[0]
                                                                    ? <img src={imgSrc(p.images[0])} alt={p.name} className="w-full h-full object-cover" />
                                                                    : <Package className="w-6 h-6 text-black/10 m-auto mt-3" strokeWidth={1} />
                                                                }
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-bold text-black uppercase tracking-wide">{p.name}</p>
                                                                <p className="text-[9px] text-black/30 mt-0.5">{p.slug}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-[10px] text-black/50 hidden sm:table-cell">
                                                        {p.categoryName || <span className="italic text-black/20">Sans catégorie</span>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-[11px] font-bold text-black">{formatEuro(p.price)}</p>
                                                        {p.compareAtPrice && <p className="text-[9px] text-black/30 line-through">{formatEuro(p.compareAtPrice)}</p>}
                                                    </td>
                                                    <td className="px-6 py-4 hidden md:table-cell">
                                                        <div className="flex gap-1 flex-wrap">
                                                            {p.sizes?.slice(0, 4).map((s: any) => (
                                                                <span key={s.id} className="text-[8px] uppercase px-2 py-0.5 border border-black/10 text-black/50">{s.name}</span>
                                                            ))}
                                                            {p.sizes?.length > 4 && <span className="text-[8px] text-black/30">+{p.sizes.length - 4}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 hidden md:table-cell">
                                                        {p.featured
                                                            ? <Check className="w-4 h-4 text-green-500" />
                                                            : <span className="text-black/20">—</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button onClick={() => openProductModal(p)}
                                                                className="p-2 hover:bg-zinc-100 rounded-sm transition-colors" title="Modifier">
                                                                <Pencil className="w-4 h-4 text-black/40" strokeWidth={1.5} />
                                                            </button>
                                                            <button onClick={() => deleteProduct(p.id)}
                                                                className="p-2 hover:bg-red-50 rounded-sm transition-colors" title="Supprimer">
                                                                <Trash2 className="w-4 h-4 text-red-400" strokeWidth={1.5} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── CATEGORIES ─────────────────────────────────────── */}
                    {tab === 'categories' && (
                        <div className="bg-white border border-black/5 rounded-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
                                <p className="text-[10px] uppercase tracking-wider text-black/40 font-bold">{categories.length} catégorie(s)</p>
                                <button onClick={() => openCategoryModal()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-800 transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Nouvelle
                                </button>
                            </div>
                            {categories.length === 0 ? (
                                <div className="py-20 text-center text-black/30">
                                    <Tag className="w-12 h-12 mx-auto mb-4 opacity-20" strokeWidth={1} />
                                    <p className="text-[11px] uppercase tracking-wider">Aucune catégorie</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 divide-y sm:divide-y-0 sm:gap-px sm:bg-black/5">
                                    {categories.map((c: any, idx: number) => (
                                        <div key={c.id} className={`bg-white p-6 flex flex-col gap-3 group ${c.featured ? 'ring-2 ring-amber-300 ring-inset' : ''}`}>
                                            {c.image && (
                                                <div className="w-full h-28 bg-zinc-100 overflow-hidden mb-1">
                                                    <img src={imgSrc(c.image)} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-bold text-black truncate">{c.name}</h3>
                                                    <p className="text-[9px] text-black/30 mt-0.5 font-mono">{c.slug}</p>
                                                </div>
                                                {c.featured && (
                                                    <span className="text-[8px] uppercase px-2 py-0.5 border rounded-sm font-bold bg-amber-50 border-amber-200 text-amber-700 shrink-0">
                                                        Accueil #{categories.filter((x: any) => x.featured).findIndex((x: any) => x.id === c.id) + 1}
                                                    </span>
                                                )}
                                            </div>
                                            {c.description && <p className="text-[10px] text-black/50 line-clamp-2">{c.description}</p>}
                                            <div className="flex gap-2 mt-auto pt-2 border-t border-black/5 flex-wrap">
                                                <button onClick={async () => {
                                                    const featuredCats = categories.filter((x: any) => x.featured)
                                                    const newFeatured = !c.featured
                                                    const order = newFeatured ? featuredCats.length : 0
                                                    try {
                                                        await categoryApi.toggleFeatured(c.id, newFeatured, order)
                                                        toast.success(newFeatured ? 'Affichée en accueil' : 'Retirée de l\'accueil')
                                                        loadData()
                                                    } catch { toast.error('Erreur') }
                                                }} className={`flex items-center gap-1.5 text-[9px] uppercase tracking-wider transition-colors ${c.featured ? 'text-amber-500 hover:text-amber-700' : 'text-black/30 hover:text-amber-500'}`}>
                                                    <Star className="w-3 h-3" fill={c.featured ? 'currentColor' : 'none'} /> {c.featured ? 'Retirer' : 'Accueil'}
                                                </button>
                                                <button onClick={() => openCategoryModal(c)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-black/40 hover:text-black transition-colors">
                                                    <Pencil className="w-3 h-3" /> Modifier
                                                </button>
                                                <button onClick={() => deleteCategory(c.id)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-red-400 hover:text-red-600 transition-colors">
                                                    <Trash2 className="w-3 h-3" /> Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── ORDERS ─────────────────────────────────────────── */}
                    {tab === 'orders' && (
                        <div className="bg-white border border-black/5 rounded-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-black/5">
                                <p className="text-[10px] uppercase tracking-wider text-black/40 font-bold">{orders.length} commande(s)</p>
                            </div>
                            {orders.length === 0 ? (
                                <div className="py-20 text-center text-black/30">
                                    <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" strokeWidth={1} />
                                    <p className="text-[11px] uppercase tracking-wider">Aucune commande</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-zinc-50 text-[9px] uppercase tracking-wider text-black/40">
                                                <th className="px-6 py-3 text-left font-bold">#</th>
                                                <th className="px-6 py-3 text-left font-bold">Client</th>
                                                <th className="px-6 py-3 text-left font-bold hidden md:table-cell">Date</th>
                                                <th className="px-6 py-3 text-left font-bold">Total</th>
                                                <th className="px-6 py-3 text-left font-bold">Statut</th>
                                                <th className="px-6 py-3 text-right font-bold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/[0.04]">
                                            {orders.map((o: any) => (
                                                <tr key={o.id} className="hover:bg-zinc-50 transition-colors cursor-pointer"
                                                    onClick={() => { setSelectedOrder(o); setOrderModal(true) }}>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[11px] font-bold text-black font-mono">#{o.id}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-[11px] font-bold text-black">{o.user ? fullName(o.user) : (o.guestName || '—')}</p>
                                                        <p className="text-[9px] text-black/40">{o.user ? o.user?.email : o.guestPhone}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-[10px] text-black/50 hidden md:table-cell">{fmtDate(o.createdAt)}</td>
                                                    <td className="px-6 py-4 text-[11px] font-bold text-black">{formatEuro(o.total)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[9px] uppercase px-2.5 py-1 border font-bold rounded-sm ${STATUS_COLOR[o.status] || 'bg-zinc-50 border-zinc-200 text-zinc-500'}`}>
                                                            {STATUS_LABEL[o.status] || o.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button onClick={() => { setSelectedOrder(o); setOrderModal(true) }}
                                                                className="p-2 hover:bg-zinc-100 rounded-sm transition-colors" title="Voir">
                                                                <Eye className="w-4 h-4 text-black/30" strokeWidth={1.5} />
                                                            </button>
                                                            <button onClick={() => deleteOrder(o.id)}
                                                                className="p-2 hover:bg-red-50 rounded-sm transition-colors" title="Supprimer">
                                                                <Trash2 className="w-4 h-4 text-red-400" strokeWidth={1.5} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── USERS ──────────────────────────────────────────── */}
                    {tab === 'users' && (
                        <div className="bg-white border border-black/5 rounded-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-black/5">
                                <p className="text-[10px] uppercase tracking-wider text-black/40 font-bold">{users.length} utilisateur(s)</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-zinc-50 text-[9px] uppercase tracking-wider text-black/40">
                                            <th className="px-6 py-3 text-left font-bold">Nom</th>
                                            <th className="px-6 py-3 text-left font-bold">Email</th>
                                            <th className="px-6 py-3 text-left font-bold hidden md:table-cell">Rôle</th>
                                            <th className="px-6 py-3 text-left font-bold hidden lg:table-cell">Inscrit le</th>
                                            <th className="px-6 py-3 text-right font-bold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/[0.04]">
                                        {users.map((u: any) => (
                                            <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                                                            <span className="text-[9px] font-bold text-black/50">
                                                                {(u.firstName?.[0] || u.email[0]).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-black">{fullName(u)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[10px] text-black/60">{u.email}</td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <span className={`text-[9px] uppercase px-2 py-0.5 border font-bold rounded-sm ${u.role === 'ROLE_ADMIN' ? 'bg-black text-white border-black' : 'bg-zinc-50 border-zinc-200 text-zinc-500'}`}>
                                                        {u.role === 'ROLE_ADMIN' ? 'Admin' : 'Client'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[10px] text-black/40 hidden lg:table-cell">{fmtDate(u.date_joined)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    {u.role !== 'ROLE_ADMIN' && (
                                                        <button onClick={() => {
                                                            if (!confirm(`Supprimer ${u.email} ?`)) return
                                                            adminApi.deleteUser(u.id).then(() => { toast.success('Utilisateur supprimé'); loadData() }).catch(() => toast.error('Erreur'))
                                                        }} className="p-1.5 hover:bg-red-50 rounded-sm transition-colors">
                                                            <Trash2 className="w-4 h-4 text-red-400" strokeWidth={1.5} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── PROMOTIONS ─────────────────────────────────────── */}
                    {tab === 'promotions' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] uppercase tracking-wider text-black/40 font-bold">{promos.length} promotion(s)</p>
                                <button onClick={() => openPromoModal()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-800 transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Nouvelle
                                </button>
                            </div>
                            {promos.length === 0 ? (
                                <div className="bg-white border border-black/5 py-20 text-center text-black/30 rounded-sm">
                                    <Ticket className="w-12 h-12 mx-auto mb-4 opacity-20" strokeWidth={1} />
                                    <p className="text-[11px] uppercase tracking-wider">Aucune promotion</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {promos.map((p: any) => (
                                        <div key={p.id} className="bg-white border border-black/5 rounded-sm p-6 flex flex-col gap-4 hover:border-black/20 transition-colors group">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-xl font-mono font-bold text-black">{p.code}</p>
                                                    <p className="text-[9px] text-black/30 mt-0.5">–{p.discount}% de réduction</p>
                                                </div>
                                                <span className={`text-[8px] uppercase px-2 py-0.5 border rounded-sm font-bold ${p.isActive ? 'bg-green-50 border-green-200 text-green-600' : 'bg-zinc-100 border-zinc-200 text-zinc-400'}`}>
                                                    {p.isActive ? 'Actif' : 'Inactif'}
                                                </span>
                                            </div>
                                            <div className="text-[9px] text-black/40 space-y-1 border-t border-black/5 pt-3">
                                                <p>Min. achat : <strong className="text-black">{formatEuro(p.minPurchase)}</strong></p>
                                                <p>Utilisation : <strong className="text-black">{p.usageCount} / {p.usageLimit || '∞'}</strong></p>
                                                {p.expiresAt && <p>Expire le : <strong className="text-black">{fmtDate(p.expiresAt)}</strong></p>}
                                            </div>
                                            <div className="flex gap-3 mt-auto pt-3 border-t border-black/5">
                                                <button onClick={() => openPromoModal(p)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-black/40 hover:text-black transition-colors">
                                                    <Pencil className="w-3 h-3" /> Modifier
                                                </button>
                                                <button onClick={() => deletePromo(p.id)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-red-400 hover:text-red-600 transition-colors ml-auto">
                                                    <Trash2 className="w-3 h-3" /> Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── SIZES ──────────────────────────────────────────── */}
                    {tab === 'sizes' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] uppercase tracking-wider text-black/40 font-bold">{sizes.length} taille(s)</p>
                                <button onClick={() => setSizeModal(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-800 transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Nouvelle
                                </button>
                            </div>
                            {sizes.length === 0 ? (
                                <div className="bg-white border border-black/5 py-20 text-center text-black/30 rounded-sm">
                                    <Ruler className="w-12 h-12 mx-auto mb-4 opacity-20" strokeWidth={1} />
                                    <p className="text-[11px] uppercase tracking-wider">Aucune taille</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                                    {sizes.map((s: any) => (
                                        <div key={s.id} className="bg-white border border-black/5 rounded-sm p-4 flex flex-col items-center gap-3 group hover:border-black/20 transition-colors">
                                            <span className="text-lg font-bold text-black font-mono">{s.name}</span>
                                            <button onClick={() => deleteSize(s.id)}
                                                className="text-[8px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── REVIEWS ─────────────────────────────────────────── */}
                    {tab === 'reviews' && (
                        <div className="bg-white border border-black/5 rounded-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-black/5">
                                <p className="text-[10px] uppercase tracking-wider text-black/40 font-bold">{reviews.length} avis</p>
                            </div>
                            {reviews.length === 0 ? (
                                <div className="py-20 text-center text-black/30">
                                    <Star className="w-12 h-12 mx-auto mb-4 opacity-20" strokeWidth={1} />
                                    <p className="text-[11px] uppercase tracking-wider">Aucun avis</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-zinc-50 text-[9px] uppercase tracking-wider text-black/40">
                                                <th className="px-6 py-3 text-left font-bold">Produit</th>
                                                <th className="px-6 py-3 text-left font-bold">Client</th>
                                                <th className="px-6 py-3 text-left font-bold">Note</th>
                                                <th className="px-6 py-3 text-left font-bold hidden md:table-cell">Commentaire</th>
                                                <th className="px-6 py-3 text-left font-bold">Statut</th>
                                                <th className="px-6 py-3 text-right font-bold">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/[0.04]">
                                            {reviews.map((r: any) => (
                                                <tr key={r.id} className="hover:bg-zinc-50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <p className="text-[11px] font-bold text-black">{r.productName}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-[11px] text-black">{r.userName}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-0.5">
                                                            {[1, 2, 3, 4, 5].map(i => (
                                                                <Star key={i} className="w-3 h-3" fill={i <= r.rating ? '#f59e0b' : 'none'}
                                                                    strokeWidth={1.5}
                                                                    style={{ color: i <= r.rating ? '#f59e0b' : 'currentColor', opacity: i <= r.rating ? 1 : 0.15 }} />
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 hidden md:table-cell max-w-xs">
                                                        <p className="text-[10px] text-black/60 truncate">{r.comment || <span className="italic text-black/20">Aucun commentaire</span>}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[9px] uppercase px-2 py-0.5 border font-bold rounded-sm ${
                                                            r.is_active ? 'bg-green-50 border-green-200 text-green-600' : 'bg-zinc-100 border-zinc-200 text-zinc-400'
                                                        }`}>
                                                            {r.is_active ? 'Actif' : 'Inactif'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await adminApi.toggleReview(r.id, !r.is_active)
                                                                    setReviews(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x))
                                                                    toast.success(r.is_active ? 'Avis masqué' : 'Avis visible')
                                                                } catch { toast.error('Erreur') }
                                                            }}
                                                            className={`px-3 py-1.5 text-[9px] uppercase font-bold tracking-wider border rounded-sm transition-colors ${
                                                                r.is_active ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'
                                                            }`}>
                                                            {r.is_active ? 'Masquer' : 'Afficher'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PUBLICITÉS ─────────────────────────────────────── */}
                    {tab === 'publicites' && (() => {
                        const AD_ICON_OPTS = [
                            { value: 'none',        label: 'Aucune',     Icon: Megaphone  },
                            { value: 'truck',       label: 'Livraison',  Icon: Truck      },
                            { value: 'credit_card', label: 'Paiement',   Icon: CreditCard },
                            { value: 'tag',         label: 'Promotion',  Icon: Tag        },
                            { value: 'gift',        label: 'Cadeau',     Icon: Gift       },
                            { value: 'phone',       label: 'Téléphone',  Icon: Phone      },
                            { value: 'star',        label: 'Étoile',     Icon: Star       },
                        ]
                        const IconFor = (iconKey: string) => AD_ICON_OPTS.find(o => o.value === iconKey)?.Icon ?? Megaphone

                        return (
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-black/40 font-bold">{ads.length} publicité(s)</p>
                                        <p className="text-[9px] text-black/30 mt-0.5">Ces messages apparaissent dans la barre d'annonce et le ticker défilant</p>
                                    </div>
                                    <button onClick={() => openAdModal()}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-800 transition-colors">
                                        <Plus className="w-3.5 h-3.5" /> Nouvelle
                                    </button>
                                </div>

                                {/* Info banner */}
                                <div className="bg-amber-50 border border-amber-100 rounded-sm p-4 flex gap-3">
                                    <Megaphone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                                    <div className="text-[10px] text-amber-700 space-y-1">
                                        <p className="font-bold">Comment ça fonctionne ?</p>
                                        <p>Les publicités <strong>actives</strong> s'affichent automatiquement dans la <strong>barre noire</strong> en haut du site (rotation toutes les 3,8 s) et dans le <strong>ticker défilant</strong> entre les collections. Utilisez le champ "Ordre" pour contrôler l'ordre d'apparition (0 = premier).</p>
                                    </div>
                                </div>

                                {/* List */}
                                {ads.length === 0 ? (
                                    <div className="bg-white border border-black/5 py-20 text-center text-black/30 rounded-sm">
                                        <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-20" strokeWidth={1} />
                                        <p className="text-[11px] uppercase tracking-wider">Aucune publicité</p>
                                        <p className="text-[9px] mt-2 text-black/20">Créez votre première publicité en cliquant sur « Nouvelle »</p>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-black/5 rounded-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-zinc-50 text-[9px] uppercase tracking-wider text-black/40">
                                                        <th className="px-6 py-3 text-left font-bold">Ordre</th>
                                                        <th className="px-6 py-3 text-left font-bold">Icône</th>
                                                        <th className="px-6 py-3 text-left font-bold">Texte</th>
                                                        <th className="px-6 py-3 text-left font-bold">Statut</th>
                                                        <th className="px-6 py-3 text-right font-bold">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-black/[0.04]">
                                                    {ads.map((ad: any) => {
                                                        const AdIcon = IconFor(ad.icon)
                                                        return (
                                                            <tr key={ad.id} className="hover:bg-zinc-50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <span className="w-8 h-8 bg-zinc-100 rounded-sm flex items-center justify-center text-[11px] font-bold text-black/60 font-mono">
                                                                        {ad.order}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center">
                                                                        <AdIcon className="w-4 h-4 text-white" strokeWidth={1.5} />
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 max-w-xs">
                                                                    <p className="text-[11px] font-semibold text-black truncate">{ad.text}</p>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <button onClick={() => toggleAdActive(ad)}
                                                                        className={`text-[9px] uppercase px-3 py-1 border font-bold rounded-sm transition-colors ${
                                                                            ad.is_active
                                                                                ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                                                                                : 'bg-zinc-100 border-zinc-200 text-zinc-400 hover:bg-zinc-200'
                                                                        }`}>
                                                                        {ad.is_active ? 'Actif' : 'Inactif'}
                                                                    </button>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button onClick={() => openAdModal(ad)}
                                                                            className="p-2 hover:bg-zinc-100 rounded-sm transition-colors" title="Modifier">
                                                                            <Pencil className="w-4 h-4 text-black/40" strokeWidth={1.5} />
                                                                        </button>
                                                                        <button onClick={() => deleteAd(ad.id)}
                                                                            className="p-2 hover:bg-red-50 rounded-sm transition-colors" title="Supprimer">
                                                                            <Trash2 className="w-4 h-4 text-red-400" strokeWidth={1.5} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })()}

                    {/* ── LIVRAISON ───────────────────────────────────────── */}
                    {tab === 'banniere' && (
                        <div className="space-y-6 max-w-2xl">
                            <div className="bg-white border border-black/5 rounded-sm p-6 space-y-8">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-black/50">Bannière personnalisée</p>
                                <p className="text-[9px] text-black/40">La bannière s'affiche sur la homepage après "Nouvelles collections". Uploadez une image par format.</p>

                                {/* Desktop */}
                                <div className="space-y-3">
                                    <p className="text-[9px] uppercase tracking-luxury font-bold text-black/40">
                                        Image Desktop <span className="text-black/25 normal-case font-normal tracking-normal">(format paysage obligatoire — ratio min 3:2)</span>
                                    </p>
                                    <input ref={bannerDesktopInputRef} type="file" accept="image/*" className="hidden" onChange={onBannerDesktopChange} />
                                    <button type="button" onClick={() => bannerDesktopInputRef.current?.click()}
                                        className={`w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed transition-colors hover:border-black/30
                                            ${bannerDesktop ? 'border-black/20' : 'border-black/10'} p-6`}>
                                        {bannerDesktop ? (
                                            <>
                                                <img src={publicImageUrl(bannerDesktop) || bannerDesktop} alt="desktop" className="w-full max-h-48 object-cover rounded-sm" />
                                                <span className="text-[9px] uppercase tracking-widest text-black/30">Cliquer pour changer</span>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-8 h-8 text-black/15" strokeWidth={1} />
                                                <span className="text-[9px] uppercase tracking-widest text-black/30">Importer image desktop</span>
                                                <span className="text-[8px] text-black/20">Paysage — ex: 1600×500, 1920×600, 3:1</span>
                                            </>
                                        )}
                                    </button>
                                    {bannerDesktopErr && <p className="text-red-500 text-[9px]">{bannerDesktopErr}</p>}
                                    {bannerDesktop && (
                                        <button type="button" onClick={() => setBannerDesktop('')} className="text-[9px] uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors">
                                            Supprimer l'image desktop
                                        </button>
                                    )}
                                </div>

                                {/* Mobile */}
                                <div className="space-y-3">
                                    <p className="text-[9px] uppercase tracking-luxury font-bold text-black/40">
                                        Image Mobile <span className="text-black/25 normal-case font-normal tracking-normal">(format portrait obligatoire — ratio max 4:5)</span>
                                    </p>
                                    <input ref={bannerMobileInputRef} type="file" accept="image/*" className="hidden" onChange={onBannerMobileChange} />
                                    <button type="button" onClick={() => bannerMobileInputRef.current?.click()}
                                        className={`w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed transition-colors hover:border-black/30
                                            ${bannerMobile ? 'border-black/20' : 'border-black/10'} p-6`}>
                                        {bannerMobile ? (
                                            <>
                                                <img src={publicImageUrl(bannerMobile) || bannerMobile} alt="mobile" className="w-40 max-h-64 object-cover rounded-sm mx-auto" />
                                                <span className="text-[9px] uppercase tracking-widest text-black/30">Cliquer pour changer</span>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-8 h-8 text-black/15" strokeWidth={1} />
                                                <span className="text-[9px] uppercase tracking-widest text-black/30">Importer image mobile</span>
                                                <span className="text-[8px] text-black/20">Portrait — ex: 750×1000, 9:16, 3:4</span>
                                            </>
                                        )}
                                    </button>
                                    {bannerMobileErr && <p className="text-red-500 text-[9px]">{bannerMobileErr}</p>}
                                    {bannerMobile && (
                                        <button type="button" onClick={() => setBannerMobile('')} className="text-[9px] uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors">
                                            Supprimer l'image mobile
                                        </button>
                                    )}
                                </div>

                                <button onClick={saveBanner} disabled={bannerSaving}
                                    className="flex items-center gap-2 px-6 py-3 bg-black text-white text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-800 transition-colors disabled:opacity-50">
                                    {bannerSaving ? <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Enregistrer la bannière
                                </button>
                            </div>
                        </div>
                    )}

                    {tab === 'livraison' && (() => {
                        const price = Number(shippingForm.shippingPrice) || 0
                        const threshold = shippingForm.freeShippingThreshold !== '' ? Number(shippingForm.freeShippingThreshold) : null
                        const isFree = price === 0
                        return (
                            <div className="space-y-6 max-w-lg">
                                <div className="bg-white border border-black/5 rounded-sm p-6 space-y-6">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-black/50">Paramètres de livraison</p>

                                    {/* Prix de livraison */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] uppercase tracking-luxury font-bold text-black/40 block">Prix de livraison (DH)</label>
                                        <p className="text-[9px] text-black/30">Mettre 0 pour afficher "Livraison gratuite" partout.</p>
                                        <input
                                            type="number" min={0} step={1}
                                            value={shippingForm.shippingPrice}
                                            onChange={e => setShippingForm(f => ({ ...f, shippingPrice: Number(e.target.value) }))}
                                            className={inputCls}
                                            placeholder="Ex : 30"
                                        />
                                    </div>

                                    {/* Seuil livraison gratuite */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] uppercase tracking-luxury font-bold text-black/40 block">Livraison gratuite à partir de (DH) — optionnel</label>
                                        <p className="text-[9px] text-black/30">Laisser vide si vous ne voulez pas de seuil. Si rempli, la livraison sera gratuite dès ce montant.</p>
                                        <input
                                            type="number" min={0} step={1}
                                            value={shippingForm.freeShippingThreshold}
                                            onChange={e => setShippingForm(f => ({ ...f, freeShippingThreshold: e.target.value }))}
                                            className={inputCls}
                                            placeholder="Ex : 299"
                                        />
                                    </div>

                                    <button onClick={saveShipping} disabled={shippingSaving}
                                        className="flex items-center gap-2 px-6 py-3 bg-black text-white text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-800 transition-colors disabled:opacity-50">
                                        {shippingSaving ? <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        Enregistrer
                                    </button>
                                </div>

                                {/* Aperçu */}
                                <div className="bg-white border border-black/5 rounded-sm p-6 space-y-3">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-black/50 mb-4">Aperçu client</p>
                                    <div className={`flex items-center justify-between p-4 border rounded-sm text-[9px] uppercase tracking-wider font-bold
                                        ${isFree ? 'border-green-200 bg-green-50 text-green-700' : 'border-black/10 bg-surface text-black/60'}`}>
                                        <span>{isFree ? 'Livraison gratuite' : 'Livraison standard'}</span>
                                        <span>{isFree ? 'Gratuit' : `${price.toFixed(2)} DH`}</span>
                                    </div>
                                    {!isFree && threshold !== null && (
                                        <p className="text-[9px] text-black/40 px-1">
                                            → Livraison <span className="font-bold text-green-600">gratuite</span> dès <span className="font-bold">{threshold.toFixed(0)} DH</span> d'achat
                                        </p>
                                    )}
                                    {isFree && (
                                        <p className="text-[9px] text-green-600 px-1">Le client voit "Livraison gratuite" sur toutes ses commandes.</p>
                                    )}
                                </div>
                            </div>
                        )
                    })()}

                </main>
            </div>

            {/* ══════════════════════════════════════════════════════════
                MODALS
            ══════════════════════════════════════════════════════════ */}

            {/* ── Product modal ── */}
            {productModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setProductModal(false)}>
                    <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl">
                        <div className="sticky top-0 bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-black">
                                {selectedProduct ? 'Modifier le produit' : 'Nouveau produit'}
                            </h2>
                            <button onClick={() => setProductModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-sm transition-colors">
                                <X className="w-5 h-5 text-black/50" />
                            </button>
                        </div>

                        <form onSubmit={onProductSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Nom du produit">
                                    <input value={formData.name} required
                                        onChange={e => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                                        className={inputCls} placeholder="Robe Noire Élégante" />
                                </Field>
                                <Field label="Slug (URL)">
                                    <input value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                        className={inputCls + ' font-mono text-[10px]'} />
                                </Field>
                                <Field label="Description">
                                    <textarea value={formData.description} rows={3}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className={inputCls + ' col-span-2 resize-none'} />
                                </Field>
                                <Field label="Prix (€)">
                                    <input type="number" step="0.01" min="0" required value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        className={inputCls} />
                                </Field>
                                <Field label="Prix barré (€) — optionnel">
                                    <input type="number" step="0.01" min="0" value={formData.compareAtPrice}
                                        onChange={e => setFormData({ ...formData, compareAtPrice: e.target.value })}
                                        className={inputCls} placeholder="0.00" />
                                </Field>
                                <Field label="Catégorie">
                                    <select value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} className={inputCls}>
                                        <option value="">— Sans catégorie —</option>
                                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="En vedette">
                                    <label className="flex items-center gap-3 cursor-pointer mt-1">
                                        <div className={`w-10 h-5 rounded-full transition-colors ${formData.featured ? 'bg-black' : 'bg-zinc-200'}`}
                                            onClick={() => setFormData({ ...formData, featured: !formData.featured })}>
                                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.featured ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-[10px] text-black/60">{formData.featured ? 'Oui' : 'Non'}</span>
                                    </label>
                                </Field>
                            </div>

                            {/* Sizes */}
                            {sizes.length > 0 && (
                                <Field label="Tailles & stock">
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-1">
                                        {sizes.map((sz: any) => {
                                            const selected = formData.sizeIds.includes(sz.id)
                                            return (
                                                <div key={sz.id} className="space-y-2">
                                                    <button type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            sizeIds: selected ? prev.sizeIds.filter(id => id !== sz.id) : [...prev.sizeIds, sz.id]
                                                        }))}
                                                        className={`w-full py-2 text-[10px] font-bold tracking-wider border transition-all ${selected ? 'bg-black text-white border-black' : 'bg-zinc-50 text-black/40 border-zinc-200 hover:border-black/30'}`}>
                                                        {sz.name}
                                                    </button>
                                                    {selected && (
                                                        <input type="number" min="0" placeholder="Stock"
                                                            value={productSizesStock[sz.name] ?? ''}
                                                            onChange={e => setProductSizesStock(prev => ({ ...prev, [sz.name]: parseInt(e.target.value) || 0 }))}
                                                            className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-[10px] text-center text-black focus:ring-1 focus:ring-black outline-none" />
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </Field>
                            )}

                            {/* Images */}
                            <Field label="Photos du produit">
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-1">
                                    {productImages.map((img, idx) => (
                                        <div key={idx} className="relative aspect-square bg-zinc-100 border border-black/5 group overflow-hidden">
                                            <img src={imgSrc(img)} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => setProductImages(prev => prev.filter((_, i) => i !== idx))}
                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <X className="w-4 h-4 text-white" />
                                            </button>
                                            {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black text-white text-[7px] uppercase text-center py-0.5">Principale</span>}
                                        </div>
                                    ))}
                                    {productImages.length < 10 && (
                                        <label className="aspect-square bg-zinc-50 border border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors">
                                            <input type="file" accept="image/*" onChange={onImageFileChange} className="hidden" />
                                            <Plus className="w-5 h-5 text-black/20" strokeWidth={1.5} />
                                            <span className="text-[8px] text-black/20 mt-1">Ajouter</span>
                                        </label>
                                    )}
                                </div>
                            </Field>

                            <div className="flex gap-3 pt-2 border-t border-black/5">
                                <button type="button" onClick={() => setProductModal(false)}
                                    className="flex-1 py-3 text-[10px] uppercase font-bold tracking-wider text-black/40 hover:text-black border border-black/10 hover:border-black/30 transition-all">
                                    Annuler
                                </button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 py-3 bg-black text-white text-[10px] uppercase font-bold tracking-wider hover:bg-zinc-800 transition-colors disabled:opacity-50">
                                    {loading ? 'Enregistrement…' : selectedProduct ? 'Mettre à jour' : 'Créer le produit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Category modal ── */}
            {categoryModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-sm shadow-2xl">
                        <div className="border-b border-black/5 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-black">
                                {selectedCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                            </h2>
                            <button onClick={() => setCategoryModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-sm transition-colors">
                                <X className="w-5 h-5 text-black/50" />
                            </button>
                        </div>
                        <form onSubmit={onCategorySubmit} className="p-6 space-y-4">
                            <Field label="Nom">
                                <input value={categoryForm.name} required
                                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                                    className={inputCls} placeholder="Robes de soirée" />
                            </Field>
                            <Field label="Slug">
                                <input value={categoryForm.slug} onChange={e => setCategoryForm({ ...categoryForm, slug: e.target.value })} className={inputCls + ' font-mono text-[10px]'} />
                            </Field>
                            <Field label="Description">
                                <textarea value={categoryForm.description} rows={2}
                                    onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                    className={inputCls + ' resize-none'} />
                            </Field>
                            <Field label="Image de la catégorie">
                                <div className="flex items-center gap-4 mt-1">
                                    {categoryForm.image && (
                                        <div className="relative w-20 h-20 shrink-0 bg-zinc-100 border border-black/5 overflow-hidden">
                                            <img src={imgSrc(categoryForm.image)} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => setCategoryForm(prev => ({ ...prev, image: '' }))}
                                                className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <X className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                    )}
                                    <label className="flex-1 h-20 bg-zinc-50 border border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors">
                                        <input type="file" accept="image/*" onChange={onCategoryImageChange} className="hidden" />
                                        <Plus className="w-5 h-5 text-black/20" strokeWidth={1.5} />
                                        <span className="text-[8px] text-black/30 mt-1">{categoryForm.image ? 'Changer' : 'Ajouter une image'}</span>
                                    </label>
                                </div>
                            </Field>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setCategoryModal(false)}
                                    className="flex-1 py-3 text-[10px] uppercase font-bold text-black/40 hover:text-black border border-black/10 hover:border-black/30 transition-all">Annuler</button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 py-3 bg-black text-white text-[10px] uppercase font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50">
                                    {selectedCategory ? 'Mettre à jour' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Size modal ── */}
            {sizeModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-sm shadow-2xl">
                        <div className="border-b border-black/5 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-black">Nouvelle taille</h2>
                            <button onClick={() => setSizeModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-sm">
                                <X className="w-5 h-5 text-black/50" />
                            </button>
                        </div>
                        <form onSubmit={onSizeSubmit} className="p-6 space-y-4">
                            <Field label="Taille (S, M, L, 42…)">
                                <input value={sizeName} required onChange={e => setSizeName(e.target.value)}
                                    placeholder="XL" className={inputCls + ' font-mono font-bold text-center text-lg uppercase'} />
                            </Field>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setSizeModal(false)}
                                    className="flex-1 py-3 text-[10px] uppercase font-bold text-black/40 hover:text-black border border-black/10 hover:border-black/30 transition-all">Annuler</button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 py-3 bg-black text-white text-[10px] uppercase font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50">Créer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Promo modal ── */}
            {promoModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-sm shadow-2xl">
                        <div className="border-b border-black/5 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-black">
                                {selectedPromo ? 'Modifier la promotion' : 'Nouvelle promotion'}
                            </h2>
                            <button onClick={() => setPromoModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-sm">
                                <X className="w-5 h-5 text-black/50" />
                            </button>
                        </div>
                        <form onSubmit={onPromoSubmit} className="p-6 space-y-4">
                            <Field label="Code promo">
                                <input value={promoForm.code} required onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                                    className={inputCls + ' font-mono font-bold uppercase'} placeholder="SEFA10" />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Réduction (%)">
                                    <input type="number" step="0.01" min="0" max="100" required value={promoForm.discount}
                                        onChange={e => setPromoForm({ ...promoForm, discount: parseFloat(e.target.value) || 0 })} className={inputCls} />
                                </Field>
                                <Field label="Achat minimum (€)">
                                    <input type="number" step="0.01" min="0" value={promoForm.minPurchase}
                                        onChange={e => setPromoForm({ ...promoForm, minPurchase: parseFloat(e.target.value) || 0 })} className={inputCls} />
                                </Field>
                                <Field label="Limite d'utilisation">
                                    <input type="number" min="0" value={promoForm.usageLimit}
                                        onChange={e => setPromoForm({ ...promoForm, usageLimit: parseInt(e.target.value) || 0 })}
                                        className={inputCls} placeholder="0 = illimité" />
                                </Field>
                                <Field label="Date d'expiration">
                                    <input type="date" value={promoForm.expiresAt}
                                        onChange={e => setPromoForm({ ...promoForm, expiresAt: e.target.value })} className={inputCls} />
                                </Field>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setPromoModal(false)}
                                    className="flex-1 py-3 text-[10px] uppercase font-bold text-black/40 hover:text-black border border-black/10 hover:border-black/30 transition-all">Annuler</button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 py-3 bg-black text-white text-[10px] uppercase font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50">
                                    {selectedPromo ? 'Mettre à jour' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Advertisement modal ── */}
            {adModal && (() => {
                const AD_ICON_OPTS = [
                    { value: 'none',        label: 'Aucune',     Icon: Megaphone  },
                    { value: 'truck',       label: 'Livraison',  Icon: Truck      },
                    { value: 'credit_card', label: 'Paiement',   Icon: CreditCard },
                    { value: 'tag',         label: 'Promotion',  Icon: Tag        },
                    { value: 'gift',        label: 'Cadeau',     Icon: Gift       },
                    { value: 'phone',       label: 'Téléphone',  Icon: Phone      },
                    { value: 'star',        label: 'Étoile',     Icon: Star       },
                ]
                return (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-md rounded-sm shadow-2xl">
                            <div className="border-b border-black/5 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-black">
                                    {selectedAd ? 'Modifier la publicité' : 'Nouvelle publicité'}
                                </h2>
                                <button onClick={() => setAdModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-sm">
                                    <X className="w-5 h-5 text-black/50" />
                                </button>
                            </div>
                            <form onSubmit={onAdSubmit} className="p-6 space-y-5">
                                {/* Text */}
                                <Field label="Texte de la publicité">
                                    <input
                                        value={adForm.text}
                                        required
                                        maxLength={300}
                                        onChange={e => setAdForm({ ...adForm, text: e.target.value })}
                                        className={inputCls}
                                        placeholder="Livraison gratuite dès 500 DH d'achat"
                                    />
                                    <p className="text-[9px] text-black/30 mt-1">{adForm.text.length}/300 caractères</p>
                                </Field>

                                {/* Icon selector */}
                                <Field label="Icône">
                                    <div className="grid grid-cols-4 gap-2 mt-1">
                                        {AD_ICON_OPTS.map(({ value, label, Icon }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setAdForm({ ...adForm, icon: value })}
                                                className={`flex flex-col items-center gap-1.5 py-3 border transition-all rounded-sm ${
                                                    adForm.icon === value
                                                        ? 'bg-black border-black text-white'
                                                        : 'bg-zinc-50 border-zinc-200 text-black/50 hover:border-black/30'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4" strokeWidth={1.5} />
                                                <span className="text-[8px] uppercase tracking-wide">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </Field>

                                {/* Order + Active */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Ordre d'affichage">
                                        <input
                                            type="number"
                                            min={0}
                                            value={adForm.order}
                                            onChange={e => setAdForm({ ...adForm, order: parseInt(e.target.value) || 0 })}
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label="Statut">
                                        <label className="flex items-center gap-3 cursor-pointer mt-3">
                                            <div
                                                className={`w-10 h-5 rounded-full transition-colors ${adForm.is_active ? 'bg-black' : 'bg-zinc-200'}`}
                                                onClick={() => setAdForm({ ...adForm, is_active: !adForm.is_active })}
                                            >
                                                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${adForm.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-[10px] text-black/60">{adForm.is_active ? 'Active' : 'Inactive'}</span>
                                        </label>
                                    </Field>
                                </div>

                                {/* Preview */}
                                {adForm.text && (
                                    <div className="bg-black rounded-sm px-4 py-3 flex items-center gap-2">
                                        {(() => { const Ico = AD_ICON_OPTS.find(o => o.value === adForm.icon)?.Icon ?? Megaphone; return <Ico className="w-3 h-3 text-white/50 shrink-0" strokeWidth={1.5} /> })()}
                                        <span className="text-white text-[10px] uppercase tracking-[0.22em] font-semibold truncate">{adForm.text}</span>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setAdModal(false)}
                                        className="flex-1 py-3 text-[10px] uppercase font-bold text-black/40 hover:text-black border border-black/10 hover:border-black/30 transition-all">
                                        Annuler
                                    </button>
                                    <button type="submit" disabled={loading}
                                        className="flex-1 py-3 bg-black text-white text-[10px] uppercase font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50">
                                        {loading ? 'Enregistrement…' : selectedAd ? 'Mettre à jour' : 'Créer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            })()}

            {/* ── Order detail modal ── */}
            {orderModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-3xl rounded-sm shadow-2xl my-auto">
                        {/* Header */}
                        <div className="border-b border-black/5 px-6 py-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-black">Commande #{selectedOrder.id}</h2>
                                <p className="text-[9px] text-black/40 mt-0.5">{fmtDate(selectedOrder.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => deleteOrder(selectedOrder.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase font-bold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Supprimer
                                </button>
                                <button onClick={() => setOrderModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-sm">
                                    <X className="w-5 h-5 text-black/50" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Statut',     value: <span className={`text-[9px] uppercase px-2 py-1 border font-bold rounded-sm ${STATUS_COLOR[selectedOrder.status]}`}>{STATUS_LABEL[selectedOrder.status] || selectedOrder.status}</span> },
                                    { label: 'Livraison',  value: selectedOrder.shippingMethod === 'EXPRESS' ? '⚡ Express' : '📦 Standard' },
                                    { label: 'Paiement',   value: 'Confirmé' },
                                    { label: 'Articles',   value: `${selectedOrder.items?.length || 0} article(s)` },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-zinc-50 p-4 rounded-sm">
                                        <p className="text-[8px] uppercase tracking-wider text-black/30 mb-1">{label}</p>
                                        <p className="text-[11px] font-bold text-black">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Client + Address */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-zinc-50 p-4 rounded-sm space-y-2">
                                    <p className="text-[9px] uppercase tracking-wider text-black/40 font-bold flex items-center gap-2"><User className="w-3 h-3" /> Client</p>
                                    {selectedOrder.user ? <>
                                        <p className="text-[11px] font-bold text-black">{fullName(selectedOrder.user)}</p>
                                        <p className="text-[10px] text-black/50">{selectedOrder.user?.email}</p>
                                    </> : <>
                                        <p className="text-[11px] font-bold text-black">{selectedOrder.guestName || '—'}</p>
                                        <p className="text-[10px] text-black/50">{selectedOrder.guestPhone}</p>
                                        <span className="text-[8px] uppercase px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-500 font-bold rounded-sm">Invité</span>
                                    </>}
                                </div>
                                <div className="bg-zinc-50 p-4 rounded-sm space-y-2">
                                    <p className="text-[9px] uppercase tracking-wider text-black/40 font-bold flex items-center gap-2"><MapPin className="w-3 h-3" /> Livraison</p>
                                    {selectedOrder.address ? <>
                                        <p className="text-[11px] font-bold text-black">{selectedOrder.address.fullName}</p>
                                        <p className="text-[10px] text-black/50">{selectedOrder.address.street}</p>
                                        <p className="text-[10px] text-black/50">{selectedOrder.address.postalCode} {selectedOrder.address.city}, {selectedOrder.address.country}</p>
                                        <p className="text-[10px] text-black/50">{selectedOrder.address.phone}</p>
                                    </> : selectedOrder.guestAddress ? <>
                                        <p className="text-[11px] font-bold text-black">{selectedOrder.guestName}</p>
                                        <p className="text-[10px] text-black/50">{selectedOrder.guestAddress}</p>
                                        <p className="text-[10px] text-black/50">{selectedOrder.guestCity}, Maroc</p>
                                        <p className="text-[10px] text-black/50">{selectedOrder.guestPhone}</p>
                                    </> : <p className="text-[10px] text-black/30 italic">Adresse non disponible</p>}
                                </div>
                            </div>

                            {/* Notes / promo */}
                            {(selectedOrder.notes || selectedOrder.promoCode) && (
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-sm space-y-1">
                                    {selectedOrder.promoCode && <p className="text-[10px] font-bold text-amber-700">Code promo : {selectedOrder.promoCode}</p>}
                                    {selectedOrder.notes && <p className="text-[10px] text-amber-600 italic">« {selectedOrder.notes} »</p>}
                                </div>
                            )}

                            {/* Items */}
                            <div>
                                <p className="text-[9px] uppercase tracking-wider text-black/40 font-bold mb-3">Articles commandés</p>
                                <div className="divide-y divide-black/5 border border-black/5 rounded-sm overflow-hidden">
                                    {selectedOrder.items?.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-4 p-4">
                                            <div className="w-14 h-14 bg-zinc-100 shrink-0 overflow-hidden">
                                                {item.productImage
                                                    ? <img src={imgSrc(item.productImage)} className="w-full h-full object-cover" />
                                                    : <Package className="w-6 h-6 text-black/10 m-auto mt-4" strokeWidth={1} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-black truncate">{item.productName}</p>
                                                <p className="text-[9px] text-black/40">
                                                    {item.sizeName && `Taille: ${item.sizeName} • `}Qté: {item.quantity}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[11px] font-bold text-black">{formatEuro(item.subtotal)}</p>
                                                <p className="text-[9px] text-black/40">{formatEuro(item.unitPrice)} × {item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-zinc-50 p-4 rounded-sm space-y-2">
                                <div className="flex justify-between text-[10px] text-black/50">
                                    <span>Sous-total</span><span className="font-bold text-black">{formatEuro(selectedOrder.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-black/50">
                                    <span>Livraison</span><span className="font-bold text-black">{formatEuro(selectedOrder.shippingCost)}</span>
                                </div>
                                {parseFloat(selectedOrder.discountAmount) > 0 && (
                                    <div className="flex justify-between text-[10px] text-green-600">
                                        <span>Remise</span><span className="font-bold">-{formatEuro(selectedOrder.discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-3 border-t border-black/10">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-black">Total</span>
                                    <span className="text-xl font-bold text-black">{formatEuro(selectedOrder.total)}</span>
                                </div>
                            </div>

                            {/* Status update */}
                            <div>
                                <p className="text-[9px] uppercase tracking-wider text-black/40 font-bold mb-3">Changer le statut</p>
                                <div className="flex flex-wrap gap-2">
                                    {ALLOWED_STATUSES.map(key => (
                                        <button key={key} onClick={() => updateOrderStatus(selectedOrder.id, key)}
                                            className={`px-4 py-2 text-[9px] uppercase font-bold tracking-wider border transition-all rounded-sm
                                                ${selectedOrder.status === key ? 'bg-black text-white border-black' : 'bg-white text-black/50 border-black/10 hover:border-black/40 hover:text-black'}`}>
                                            {STATUS_LABEL[key]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
