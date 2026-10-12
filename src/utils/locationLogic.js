/**
 * The location logic: the rules between the address and the point of a
 * location (glossary „Standort“, „Anschrift“, „Punkt“), pure and without DOM
 * (ECCdigital/tickets#470, spec of #372). Taken over from the reducer of the
 * prototype #375, cut down to the rules decided there.
 *
 * The input of a location holds a state, sends actions through `reducer`,
 * runs the `request` the state carries (search or reverse search) and sends
 * its answer back as an action with the same `id`. `check` says whether the
 * location may be saved, `toStored` turns the state back into the stored
 * form.
 *
 * The state (read it, never write it; only `reducer` changes it):
 *
 * - `address`: `{ street, houseNumber, postcode, city, countryCode,
 *   addition }`, all strings; `countryCode` in capitals, `"DE"` by default.
 * - `point`: `null` or `{ lat, lon }`.
 * - `pointOrigin`: `null`, `"search"`, `"map"` (by hand) or `"nuki"`;
 *   stored as `photon`, `manual` and `nuki`.
 * - `oldText`: the text of an old location without point, for the search.
 * - `suggestion`: `null`, `{ kind: "address", address }` after the reverse
 *   search or `{ kind: "point", point, distance }` (metres) after the search.
 * - `request`: `null`, `{ id, kind: "reverse", point }` or
 *   `{ id, kind: "search", address }`, for the input to run.
 * - `placing`: `null` or `{ text }` while a place without hit waits for its
 *   point.
 *
 * The other keys are the module's own.
 */

const emptyAddress = () => ({
  street: "",
  houseNumber: "",
  postcode: "",
  city: "",
  countryCode: "DE",
  addition: "",
});

function empty() {
  return {
    address: emptyAddress(),
    point: null,
    pointOrigin: null,
    oldText: "",
    suggestion: null,
    request: null,
    placing: null,
    addressOpen: false,
    nextId: 1,
    stored: { value: null, content: null },
  };
}

// What decides the stored form; equal to the content at opening means
// unchanged.
const contentOf = (s) => ({
  address: { ...s.address },
  point: s.point ? { ...s.point } : null,
  pointOrigin: s.pointOrigin,
  oldText: s.oldText,
});

const sameContent = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The state of the input for a stored location.
 *
 * `stored` is the location as stored, when the input opens one already
 * edited (a field mounted again, the check of a whole bookable): unchanged
 * then means saying what that one says, and an unchanged location comes back
 * as that one. `null` means nothing is stored yet.
 *
 * @param {*} value - The location as stored: an object, a text, `null`, `""`.
 * @param {*} [stored] - The location as stored, `value` by default.
 * @returns {Object} The state.
 */
export function fromStored(value, stored = value) {
  const s = { ...empty(), ...read(value) };
  const base = stored === value ? s : { ...empty(), ...read(stored) };
  return { ...s, stored: { value: stored, content: contentOf(base) } };
}

// Old values of `meta.source` stay stored; `nominatim` counts as the search,
// `legacy`, an unknown and a missing one as set by hand (#376).
const ORIGIN_OF_SOURCE = Object.freeze({
  photon: "search",
  nominatim: "search",
  nuki: "nuki",
});

const SOURCE_OF_ORIGIN = Object.freeze({
  search: "photon",
  map: "manual",
  nuki: "nuki",
});

const text = (value) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

function number(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * The point of a location in the stored form, or of an answer that carries
 * one the same way (NUKI's `getLocationPrefill`); old ones with `lat` and
 * `lng` too.
 *
 * @param {*} value - The location.
 * @returns {?{ lat: number, lon: number }} The point, `null` without one.
 */
export function pointOf(value) {
  if (!value || typeof value !== "object") return null;
  const points = value.coordinates?.points;
  const [lon, lat] = Array.isArray(points)
    ? [number(points[0]), number(points[1])]
    : [number(value.lon ?? value.lng), number(value.lat)];
  return lat === null || lon === null ? null : { lat, lon };
}

function read(value) {
  if (typeof value === "string") return { oldText: value.trim() };
  if (!value || typeof value !== "object") return {};

  const a = value.address || {};
  const point = pointOf(value);
  return {
    address: {
      street: text(a.street),
      houseNumber: text(a.house_number),
      postcode: text(a.postcode ?? a.post_code),
      city: text(a.city),
      countryCode: text(a.country_code).toUpperCase() || "DE",
      addition: text(value.meta?.additional),
    },
    point,
    pointOrigin: point ? ORIGIN_OF_SOURCE[value.meta?.source] || "map" : null,
    oldText: point ? "" : text(value.display_address).trim(),
  };
}

/**
 * The location in the stored form. An unchanged location comes back as it
 * was stored, word for word: only so does the backend recognise an unchanged
 * old location without point.
 *
 * @param {Object} s - The state.
 * @returns {*} The location to store.
 */
export function toStored(s) {
  if (isUnchanged(s)) return s.stored.value;
  if (!hasContent(s) && !s.point) return null;

  const a = s.address;
  const r6 = (x) => Math.round(x * 1e6) / 1e6;
  const value = {
    address: {
      street: a.street || null,
      house_number: a.houseNumber || null,
      postcode: a.postcode || null,
      city: a.city || null,
      country_code: (a.countryCode || "DE").toUpperCase(),
    },
    display_address: displayAddress(a) || s.oldText,
    meta: { additional: a.addition || null },
  };
  if (!s.point) return value;
  return {
    ...value,
    coordinates: { type: "Point", points: [r6(s.point.lon), r6(s.point.lat)] },
    meta: { source: SOURCE_OF_ORIGIN[s.pointOrigin], ...value.meta },
  };
}

/**
 * The display text of an address, as `display_address` stores it:
 * „Gasstraße 4, 03172 Guben“.
 *
 * @param {Object} a - The address of a state.
 * @returns {string} The text, empty for an empty address.
 */
export function displayAddress(a) {
  const line1 = [a.street, a.houseNumber].filter(Boolean).join(" ");
  const line2 = [a.postcode, a.city].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(", ");
}

/** Below this distance in metres a found point counts as the same. */
export const NEAR_ENOUGH_M = 25;

/**
 * The distance of two points in metres (haversine).
 *
 * @param {{ lat: number, lon: number }} p - A point.
 * @param {{ lat: number, lon: number }} q - Another point.
 * @returns {number} The distance in metres.
 */
export function distance(p, q) {
  const r = 6371000;
  const rad = Math.PI / 180;
  const dLat = (q.lat - p.lat) * rad;
  const dLon = (q.lon - p.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p.lat * rad) * Math.cos(q.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

const ADDRESS_FIELDS = ["street", "houseNumber", "postcode", "city"];
const norm = (x) => (x || "").trim().toLowerCase();
const isAddressEmpty = (a) => ADDRESS_FIELDS.every((f) => !a[f]);
const sameAddress = (a, b) =>
  ADDRESS_FIELDS.every((f) => norm(a[f]) === norm(b[f]));

// An answer counts only for the request still open; a stale one is dropped.
const answers = (s, a) => !!s.request && s.request.id === a.id;

const withRequest = (s, request) => ({
  ...s,
  nextId: s.nextId + 1,
  request: { id: s.nextId, ...request },
});

/**
 * The state after one action. Unknown actions leave it as it is.
 *
 * @param {Object} s - The state.
 * @param {Object} a - The action, `{ type, … }`.
 * @returns {Object} The new state.
 */
export function reducer(s, a) {
  switch (a.type) {
    case "hitChosen": {
      const hit = read(a.hit);
      return {
        ...s,
        address: { ...hit.address, addition: s.address.addition },
        point: hit.point,
        pointOrigin: "search",
        oldText: "",
        suggestion: null,
        request: null,
        placing: null,
        addressOpen: false,
      };
    }

    // A place the search does not know: the typed text goes into an empty
    // addition, and the point is set on the map.
    case "withoutHit":
      return {
        ...s,
        address: { ...s.address, addition: s.address.addition || a.text },
        placing: { text: a.text },
        suggestion: null,
      };

    // Removes the location: an empty one may be saved, it is optional.
    case "cleared":
      return {
        ...empty(),
        nextId: s.nextId,
        stored: s.stored,
      };

    case "placingCancelled":
      return s.placing ? { ...s, placing: null } : s;

    case "pointSet":
      return withRequest(
        {
          ...s,
          point: { lat: a.point.lat, lon: a.point.lon },
          pointOrigin: a.origin,
          suggestion: null,
          placing: null,
        },
        { kind: "reverse", point: { lat: a.point.lat, lon: a.point.lon } }
      );

    // The reverse search never overwrites the address, it only suggests:
    // in the prototype a point in the yard behind Gasstraße 4 found
    // „Wilkesche Höfe“ (#375).
    case "reverseResult": {
      if (!answers(s, a)) return s;
      const n = { ...s, request: null };
      if (!a.hit) return n;
      const found = {
        ...read(a.hit).address,
        addition: s.address.addition,
      };
      if (!found.street && s.address.street) return n;
      if (!isAddressEmpty(s.address) && sameAddress(s.address, found)) return n;
      return { ...n, suggestion: { kind: "address", address: found } };
    }

    case "suggestionAccepted": {
      const v = s.suggestion;
      if (!v) return s;
      if (v.kind === "point")
        return {
          ...s,
          point: v.point,
          pointOrigin: "search",
          suggestion: null,
        };
      return {
        ...s,
        address: { ...v.address, addition: s.address.addition },
        oldText: "",
        suggestion: null,
        addressOpen: false,
      };
    }

    case "suggestionDismissed":
      return s.suggestion ? { ...s, suggestion: null } : s;

    // A change of the addition alone triggers nothing.
    case "fieldChanged": {
      const n = { ...s, address: { ...s.address, [a.field]: a.value || "" } };
      if (a.field === "addition") return n;
      return {
        ...n,
        oldText: "",
        addressOpen: true,
        suggestion: s.suggestion?.kind === "address" ? null : s.suggestion,
      };
    }

    case "addressDone": {
      if (!s.addressOpen) return s;
      const n = { ...s, addressOpen: false };
      if (!(s.address.city || s.address.postcode)) return n;
      return withRequest(n, { kind: "search", address: { ...s.address } });
    }

    // A point from the search follows a changed address; a point set by
    // hand or by NUKI only moves when the question is answered with yes.
    case "searchResult": {
      if (!answers(s, a)) return s;
      const n = { ...s, request: null };
      const point = a.hit ? read(a.hit).point : null;
      if (!point) return n;
      if (!s.point || s.pointOrigin === "search")
        return { ...n, point, pointOrigin: "search", suggestion: null };
      const metres = distance(s.point, point);
      if (metres < NEAR_ENOUGH_M) return n;
      return {
        ...n,
        suggestion: { kind: "point", point, distance: Math.round(metres) },
      };
    }

    default:
      return s;
  }
}

const hasContent = (s) =>
  !isAddressEmpty(s.address) || !!s.address.addition || !!s.oldText;

const isUnchanged = (s) => sameContent(contentOf(s), s.stored.content);

/**
 * Whether the location may be saved, and why not.
 *
 * A new or changed location needs a point as soon as it has an address, an
 * addition or an old text; a point alone and an empty location are fine. An
 * unchanged old location without point passes, the backend lets it through
 * too (#455); `pointMissing` says the point is still to be set.
 *
 * `reason` is `null` or one of `pointNotSet` (a place without hit still
 * waits for its point), `addressWithoutPoint` and `oldTextWithoutPoint`.
 *
 * @param {Object} s - The state.
 * @returns {{ storable: boolean, reason: string|null, pointMissing: boolean }}
 */
export function check(s) {
  const pointMissing = !s.point && (hasContent(s) || !!s.placing);
  const refuse = (reason) => ({ storable: false, reason, pointMissing });

  if (s.placing && !s.point) return refuse("pointNotSet");
  if (!pointMissing || isUnchanged(s))
    return { storable: true, reason: null, pointMissing };
  if (s.oldText && isAddressEmpty(s.address))
    return refuse("oldTextWithoutPoint");
  return refuse("addressWithoutPoint");
}

/**
 * Why the location of a state may not be saved, as a key of the catalogue
 * (`location.reason.*`), or `null`. The message the input shows and the
 * refusal of every page come from here.
 *
 * @param {Object} s - The state.
 * @returns {?string} The key.
 */
export function refusalOf(s) {
  const { reason } = check(s);
  return reason ? `location.reason.${reason}` : null;
}

/**
 * Why a location may not be saved, as a key of the catalogue, or `null`: the
 * rule of the backend (`LocationGuard.storable`) for the bookable, the event
 * and the access point. A new or changed location with an address, an
 * addition or an old text needs a point; an unchanged one passes, so the
 * rule measures against the stored one.
 *
 * @param {*} location - The location as edited, in the stored form.
 * @param {*} [storedLocation] - The location as stored; none for a new one.
 * @returns {?string} The key.
 */
export function locationRefusal(location, storedLocation) {
  return refusalOf(fromStored(location, storedLocation ?? null));
}
