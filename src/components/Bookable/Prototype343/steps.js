// PROTOTYPE (ECCdigital/tickets#343), throwaway: never merge.
// The flow renders one component per step without saying which, so each
// step gets its own name with the part fixed.
import PricePrototype from "./PricePrototype.vue";

export const PricePrototypePrice = {
  name: "PricePrototypePrice",
  extends: PricePrototype,
  props: { part: { type: String, default: "price" } },
};

export const PricePrototypeAmount = {
  name: "PricePrototypeAmount",
  extends: PricePrototype,
  props: { part: { type: String, default: "amount" } },
};
