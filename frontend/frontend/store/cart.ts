'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
    // unique key: productId + sizeName
    key: string
    productId: number
    productName: string
    productImage?: string
    sizeName?: string
    unitPrice: number
    quantity: number
}

interface CartStore {
    items: CartItem[]
    addItem: (item: Omit<CartItem, 'key' | 'quantity'> & { quantity?: number }) => void
    updateQty: (key: string, qty: number) => void
    removeItem: (key: string) => void
    clearCart: () => void
    itemCount: () => number
    subtotal: () => number
    // legacy compat
    cart: null
    setCart: (c: any) => void
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            cart: null,
            setCart: () => {},

            addItem: (item) => {
                const key = `${item.productId}__${item.sizeName ?? ''}`
                set(state => {
                    const existing = state.items.find(i => i.key === key)
                    if (existing) {
                        return {
                            items: state.items.map(i =>
                                i.key === key ? { ...i, quantity: i.quantity + (item.quantity ?? 1) } : i
                            )
                        }
                    }
                    return {
                        items: [...state.items, { ...item, key, quantity: item.quantity ?? 1 }]
                    }
                })
            },

            updateQty: (key, qty) => {
                if (qty <= 0) {
                    set(state => ({ items: state.items.filter(i => i.key !== key) }))
                } else {
                    set(state => ({
                        items: state.items.map(i => i.key === key ? { ...i, quantity: qty } : i)
                    }))
                }
            },

            removeItem: (key) => set(state => ({ items: state.items.filter(i => i.key !== key) })),

            clearCart: () => set({ items: [] }),

            itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

            subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
        }),
        { name: 'sefa_cart_v2' }
    )
)
