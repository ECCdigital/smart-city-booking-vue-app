// PROTOTYPE (ECCdigital/tickets#341), throwaway: never merge.
//
// One field, one rule, shared by all three variants: what the basics
// component reads, how it reports a change (a top-level patch, #340), and the
// rules every variant applies the same way. Only the rendering differs.
import ApiEventService from "@/services/api/ApiEventService";
import ApiTagsService from "@/services/api/ApiTagsService";
import bookableFlowStep from "@/mixins/bookableFlowStep";
import bookableExpertMode from "@/mixins/bookableExpertMode";
import { externalReferenceOf } from "@/utils/mediaReference";
import { getTypeIcon, getTypeText } from "@/utils/bookables";
import { FLOW_BOOKABLE_TYPES, isFlowMode } from "@/utils/bookableFlow";

/** The one set of labels the prototype proposes for both modes. */
export const LABELS = Object.freeze({
  title: "Titel",
  description: "Beschreibung",
  flags: "Merkmale",
  images: "Bilder",
  location: "Standort",
  event: "Veranstaltung",
  type: "Typ",
  tags: "Interne Tags",
});

export const HINTS = Object.freeze({
  title: "Daran erkennen Buchende das Objekt, z. B. „Großer Saal“.",
  flags:
    "Kurze Vorteile neben der Beschreibung, z. B. „WLAN inklusive“. Eingeben und mit Enter übernehmen.",
  images:
    "Das erste Bild ist das Titelbild im Katalog. Aus der Mediathek wählen, hochladen oder extern verlinken.",
  location:
    "Wo Buchende hin müssen. Wird die Adresse gefunden, erscheint sie auf der Objektseite auf der Karte.",
  event: "Verknüpft das Ticket mit einer Veranstaltung des Mandanten.",
  typeNew:
    "Bestimmt Darstellung und Icon im Katalog. Lässt sich nach dem Anlegen nicht mehr ändern.",
  typeFixed: "Wird beim Anlegen festgelegt.",
  tags: "Nur für die Verwaltung, zum Filtern und Gruppieren. Buchende sehen sie nicht.",
  publicOnly:
    "Dieses Buchungsobjekt ist öffentlich sichtbar, interne Medien können hier nicht gespeichert werden.",
});

/**
 * Title: the backend's `title: { type: String, required: true }` rejects an
 * empty title, so both modes check it. Trimmed, as the flow's `hasName` does.
 */
export const titleRules = [
  (v) => !!(v || "").trim() || "Bitte einen Titel eingeben.",
];

export default {
  mixins: [bookableFlowStep, bookableExpertMode],
  props: {
    isNew: { type: Boolean, default: false },
  },
  data() {
    return {
      LABELS,
      HINTS,
      titleRules,
      events: [],
      tagsAvailable: [],
    };
  },
  computed: {
    /** The frame around the component: the editor's tab or the flow's step. */
    frame() {
      return isFlowMode({
        bookableId: this.$route.query.id,
        mode: this.$route.query.mode,
      })
        ? "flow"
        : "editor";
    },
    location() {
      const location = this.bookable.location;
      return typeof location === "string"
        ? { display_address: location }
        : location || { display_address: null, lat: null, lng: null };
    },
    images() {
      return this.bookable.images || [];
    },
    /** Shown in both modes, never moved without a click (as the editor does today). */
    legacyCoverUrl() {
      return this.images.length === 0 ? this.bookable.imgUrl || "" : "";
    },
    coverImage() {
      return this.images[0] || this.bookable.imgUrl || null;
    },
    isTicket() {
      return this.bookable.type === "ticket";
    },
    typeItems() {
      return FLOW_BOOKABLE_TYPES.map((type) => ({
        value: type,
        text: getTypeText(type),
        icon: getTypeIcon(type),
      }));
    },
    typeText() {
      return getTypeText(this.bookable.type);
    },
    typeIcon() {
      return getTypeIcon(this.bookable.type);
    },
    /** #339: a used expert option is always shown, an unused one only in expert mode. */
    tagsShown() {
      return this.expertMode || (this.bookable.tags || []).length > 0;
    },
  },
  watch: {
    // The bookable's own tenant in both modes (the editor asked the current one).
    "bookable.type": {
      immediate: true,
      handler(type) {
        if (type === "ticket" && !this.events.length) this.fetchEvents();
      },
    },
    tagsShown: {
      immediate: true,
      handler(shown) {
        if (shown && !this.tagsAvailable.length) this.fetchTags();
      },
    },
  },
  methods: {
    async fetchEvents() {
      try {
        const response = await ApiEventService.getEvents(
          this.bookable.tenantId || undefined
        );
        this.events = response?.data || [];
      } catch (error) {
        console.error(error);
        this.events = [];
      }
    },
    // The tenant's tags as suggestions; the editor's list stayed empty.
    async fetchTags() {
      try {
        const response = await ApiTagsService.getTags(
          this.bookable.tenantId || undefined
        );
        this.tagsAvailable = (response?.data || []).filter(Boolean);
      } catch (error) {
        console.error(error);
      }
    },
    adoptLegacyCover() {
      const url = this.bookable.imgUrl;
      if (!url) return;
      this.patch({
        images: [externalReferenceOf(url), ...this.images],
        imgUrl: "",
      });
    },
    removeFrom(field, item) {
      this.patch({
        [field]: (this.bookable[field] || []).filter((value) => value !== item),
      });
    },
  },
};
