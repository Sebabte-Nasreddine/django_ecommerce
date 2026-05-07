import axios from 'axios'
import { useAuthStore } from '@/store/auth'

function getApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || '/api'
    }
    return process.env.BACKEND_URL || 'http://backend:8080/api'
}

export const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
})

// Attach JWT — read directly from Zustand in-memory state (always in sync)
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = useAuthStore.getState().token
        if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// On 401 — clear auth and show login form (no redirect needed, layout handles it)
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            useAuthStore.getState().logout()
        }
        return Promise.reject(error)
    }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
    register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
        api.post('/auth/register', data).then(r => r.data),
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data).then(r => r.data),
    adminLogin: (data: { email: string; password: string }) =>
        api.post('/auth/admin/login', data).then(r => r.data),
    me: () => api.get('/auth/me').then(r => r.data),
}

// ── Products ──────────────────────────────────────────────────────────────────
export const productApi = {
    list: (params?: Record<string, unknown>) =>
        api.get('/products', { params }).then(r => r.data),
    getById: (id: number) => api.get(`/products/${id}`).then(r => r.data),
    getBySlug: (slug: string) => api.get(`/products/slug/${slug}`).then(r => r.data),
    related:   (slug: string) => api.get(`/products/slug/${slug}/related`).then(r => r.data),
    create: (data: unknown) => api.post('/products', data).then(r => r.data),
    update: (id: number, data: unknown) => api.put(`/products/${id}`, data).then(r => r.data),
    delete: (id: number) => api.delete(`/products/${id}`),
}

export const uploadApi = {
    image: (file: File) => {
        const formData = new FormData()
        formData.append('file', file)
        return api.post('/admin/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => r.data)
    },
    downloadImage: async (url: string) => {
        const filename = url.split('/').pop()
        if (!filename) return
        const response = await api.get(`/admin/download-image/${filename}`, {
            responseType: 'blob'
        })
        const blob = new Blob([response.data])
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
    }
}

// ── Categories ────────────────────────────────────────────────────────────────
export const categoryApi = {
    list: () => api.get('/categories').then(r => r.data),
    featured: () => api.get('/categories/featured').then(r => r.data),
    getById: (id: number) => api.get(`/categories/${id}`).then(r => r.data),
    create: (data: unknown) => api.post('/categories', data).then(r => r.data),
    update: (id: number, data: unknown) => api.put(`/categories/${id}`, data).then(r => r.data),
    delete: (id: number) => api.delete(`/categories/${id}`),
    toggleFeatured: (id: number, featured: boolean, order: number) =>
        api.patch(`/categories/${id}/featured`, { featured, featured_order: order }).then(r => r.data),
}

// ── Sizes ──────────────────────────────────────────────────────────────────────
export const sizeApi = {
    list: () => api.get('/sizes').then(r => r.data),
    create: (data: { name: string }) => api.post('/sizes', data).then(r => r.data),
    delete: (id: number) => api.delete(`/sizes/${id}`),
}

// ── Cart stock validation ──────────────────────────────────────────────────────
export const stockApi = {
    checkCart: (items: { productId: number; sizeName: string; quantity: number }[]) =>
        api.post('/products/check-stock', items).then(r => r.data),
}

// ── Product Size Stock ─────────────────────────────────────────────────────────
export const productSizeApi = {
    getStock: (productId: number) => api.get(`/products/${productId}/sizes`).then(r => r.data),
    setStock: (productId: number, data: { sizeName: string; stockQuantity: number }) =>
        api.put(`/products/${productId}/sizes/stock`, data).then(r => r.data),
    // upsert: update stock by sizeId  (used in admin panel)
    upsert: (productId: number, sizeId: number, data: { stock: number }) =>
        api.put(`/products/${productId}/sizes/${sizeId}/stock`, { stockQuantity: data.stock }).then(r => r.data),
}

// ── Cart ──────────────────────────────────────────────────────────────────────
export const cartApi = {
    get: async () => {
        const r = await api.get('/cart')
        return r.data
    },
    addItem: async (productId: number, quantity: number, sizeName?: string) => {
        const r = await api.post('/cart/items', { productId, quantity, sizeName })
        return r.data
    },
    updateItem: async (itemId: number, quantity: number) => {
        const r = await api.put(`/cart/items/${itemId}`, { quantity })
        return r.data
    },
    clear: () => api.delete('/cart'),
}

// ── Orders ────────────────────────────────────────────────────────────────────
export const orderApi = {
    checkout: (data: { addressId: number; shippingMethod: string; promoCode?: string; notes?: string }) =>
        api.post('/orders/checkout', data).then(r => r.data),
    list: () => api.get('/orders').then(r => r.data),
    getById: (id: number) => api.get(`/orders/${id}`).then(r => r.data),
    updateStatus: (id: number, status: string) =>
        api.patch(`/orders/${id}/status`, { status }).then(r => r.data),
    delete: (id: number) => api.delete(`/orders/${id}`),
    adminDelete: (id: number) => api.delete(`/orders/${id}/delete`),
}

// ── Admin ──────────────────────────────────────────────────────────────────────
export const adminApi = {
    stats: () => api.get('/admin/stats').then(r => r.data),
    /** Toutes les catégories actives (admin). */
    categories: () => api.get('/admin/categories').then(r => r.data),
    users: (params?: Record<string, unknown>) => api.get('/admin/users', { params }).then(r => r.data),
    orders: (params?: Record<string, unknown>) => api.get('/admin/orders', { params }).then(r => r.data),
    promotions: () => api.get('/admin/promotions').then(r => r.data),
    createPromotion: (data: unknown) => api.post('/admin/promotions', data).then(r => r.data),
    updatePromotion: (id: number, data: unknown) => api.put(`/admin/promotions/${id}`, data).then(r => r.data),
    deletePromotion: (id: number) => api.delete(`/admin/promotions/${id}`),
    deleteUser: (id: number) => api.delete(`/admin/users/${id}`),

    // Aliases used by the admin page
    promos: () => api.get('/admin/promotions').then(r => r.data),
    createPromo: (data: unknown) => api.post('/admin/promotions', data).then(r => r.data),
    updatePromo: (id: number, data: unknown) => api.put(`/admin/promotions/${id}`, data).then(r => r.data),
    deletePromo: (id: number) => api.delete(`/admin/promotions/${id}`),
}
