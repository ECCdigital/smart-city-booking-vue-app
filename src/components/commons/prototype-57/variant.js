// PROTOTYPE (ECCdigital/tickets#57), throwaway: three variants of the row
// beneath the search band, switchable via `?variant=` on the pages Buchungen,
// Meine Mandanten, Räume, Rabatte and Regeln. No `?variant=` is today's row.

export const VARIANTS = [
  { key: null, name: "Heute" },
  { key: "A", name: "Einheitliche Leiste" },
  { key: "B", name: "Ruhig" },
  { key: "C", name: "Register" },
];

export const prototypeEnabled = process.env.NODE_ENV !== "production";

export function rowVariantOf(route) {
  if (!prototypeEnabled) return null;
  const key = route?.query?.variant;
  return VARIANTS.some((v) => v.key && v.key === key) ? key : null;
}

/**
 * `rowVariant`: "A" | "B" | "C", or null for today's row. `primaryInRow`:
 * the creation moves into the row (A, B); in C it floats bottom right as
 * today, as Marvin-Anders chose.
 */
export const rowVariantMixin = {
  computed: {
    rowVariant() {
      return rowVariantOf(this.$route);
    },
    primaryInRow() {
      return !!this.rowVariant && this.rowVariant !== "C";
    },
  },
};

/** Keeps the chosen variant while clicking from page to page. */
export function carryVariant(router) {
  if (!prototypeEnabled) return;
  router.beforeEach((to, from, next) => {
    const variant = from.query.variant;
    if (variant && !to.query.variant && to.path !== from.path) {
      next({
        path: to.path,
        query: { ...to.query, variant },
        hash: to.hash,
        replace: true,
      });
      return;
    }
    next();
  });
}
