import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // { product, qty, addons, lineTotal }
      addItem: (product, qty = 1, addons = []) => {
        const addonTotal = addons.reduce((s, a) => s + (a.price || 0), 0);
        const unitPrice = product.cost + addonTotal;
        const items = get().items;
        const existing = items.findIndex(
          (i) => i.product._id === product._id && JSON.stringify(i.addons) === JSON.stringify(addons)
        );
        if (existing >= 0) {
          const updated = [...items];
          updated[existing] = {
            ...updated[existing],
            qty: updated[existing].qty + qty,
            lineTotal: (updated[existing].qty + qty) * unitPrice,
          };
          set({ items: updated });
        } else {
          set({ items: [...items, { product, qty, addons, unitPrice, lineTotal: qty * unitPrice }] });
        }
      },
      removeItem: (productId, addons = []) => {
        set({
          items: get().items.filter(
            (i) => !(i.product._id === productId && JSON.stringify(i.addons) === JSON.stringify(addons))
          ),
        });
      },
      updateQty: (productId, addons, qty) => {
        if (qty <= 0) {
          get().removeItem(productId, addons);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.product._id === productId && JSON.stringify(i.addons) === JSON.stringify(addons)
              ? { ...i, qty, lineTotal: qty * i.unitPrice }
              : i
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => get().items.reduce((s, i) => s + i.lineTotal, 0),
      getCount: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    { name: 'riser-cart' }
  )
);
