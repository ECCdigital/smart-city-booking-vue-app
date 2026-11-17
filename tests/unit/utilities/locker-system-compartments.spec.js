import { describe, expect, it } from "vitest";
import {
  carriesOwnCompartments,
  compartmentCountMismatch,
  compartmentCountMismatches,
  compartmentGroups,
  compartmentOutcome,
  compartmentsByLockerBank,
  leavingCompartmentIds,
  compartmentTitle,
  heldCompartmentIds,
  lockerSystemIdsLinkedElsewhere,
  takenProviderIds,
} from "@/utilities/locker-system-compartments";

const UUID_1 = "9b2f6c1e-3d4a-4f5b-8c7d-1e2f3a4b5c6d";
const UUID_2 = "0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const UUID_3 = "1d2e3f4a-5b6c-4d7e-9f8a-0b1c2d3e4f5a";
const UUID_4 = "2e3f4a5b-6c7d-4e8f-a09b-1c2d3e4f5a6b";

/** A compartment as Open Locker's listing names it. */
function listed(id, lockerBank, number) {
  return {
    id,
    type: "door",
    provider: "open-locker",
    externalId: id,
    label: `${lockerBank.name} · Fach ${number}`,
    metadata: { id, number, lockerBank },
  };
}

const LABOR = { id: "bank-labor", name: "Labor Fachbank 1" };
const HAFEN = { id: "bank-hafen", name: "Quartiersschrank Hafen" };

/**
 * Whether an access point carries its own Fächer - an Open Locker
 * Schließfachanlage does (ECCdigital/tickets#1037), and that hangs on its
 * data: iFBS and Pareva Anlagen carry none.
 */
describe("whether an access point carries its own Fächer", () => {
  it.each([
    [{ type: "locker", config: { compartments: [] } }, true],
    [{ type: "locker", config: { compartments: [{ id: UUID_1 }] } }, true],
    [{ type: "locker", provider: "ifbs", config: {} }, false],
    [{ type: "door", config: { compartments: [] } }, false],
    [null, false],
  ])("%o: %s", (accessPoint, carries) => {
    expect(carriesOwnCompartments(accessPoint)).toBe(carries);
  });
});

/**
 * A Fach stands in at most one Anlage (ECCdigital/tickets#1162): the Fächer
 * the other Anlagen of the provider hold are not to be chosen, and nothing
 * else holds a Fach.
 */
describe("the Fächer other Anlagen hold", () => {
  const accessPoints = [
    {
      id: "anlage-1",
      type: "locker",
      provider: "open-locker",
      config: { compartments: [{ id: UUID_1 }] },
    },
    {
      id: "anlage-2",
      type: "locker",
      provider: "open-locker",
      config: { compartments: [{ id: UUID_4 }] },
    },
    // A door of Open Locker from before: it holds no Fach.
    {
      id: "fach-1",
      type: "door",
      provider: "open-locker",
      externalId: UUID_2,
    },
    { id: "tuer-1", type: "door", provider: "nuki", externalId: UUID_3 },
  ];

  it("names the Fächer of the other Anlagen of the provider, nothing else", () => {
    expect(
      [...heldCompartmentIds(accessPoints, { provider: "open-locker" })].sort()
    ).toEqual([UUID_1, UUID_4].sort());
  });

  it("leaves out the Anlage being edited", () => {
    expect([
      ...heldCompartmentIds(accessPoints, {
        provider: "open-locker",
        exceptId: "anlage-1",
      }),
    ]).toEqual([UUID_4]);
  });
});

/**
 * A lock of the provider's listing that another access point already
 * stands for is created already.
 */
describe("the ids other access points stand for", () => {
  it("names what any other access point of the provider stands for, a Schließfachanlage of iFBS too", () => {
    const ifbs = [
      { id: "box-1", type: "locker", provider: "ifbs", externalId: "S" },
      { id: "tuer-2", type: "door", provider: "ifbs", externalId: "T" },
      { id: "anlage-ol", type: "locker", provider: "open-locker" },
    ];
    expect([...takenProviderIds(ifbs, { provider: "ifbs" })].sort()).toEqual([
      "S",
      "T",
    ]);
  });

  it("leaves out the access point being edited", () => {
    const doors = [
      { id: "tuer-1", type: "door", provider: "nuki", externalId: "lock-1" },
      { id: "tuer-2", type: "door", provider: "nuki", externalId: "lock-2" },
    ];
    expect([
      ...takenProviderIds(doors, { provider: "nuki", exceptId: "tuer-1" }),
    ]).toEqual(["lock-2"]);
  });
});

/**
 * The Fächer to choose from, grouped by Schließfachschrank in the order
 * Open Locker lists them: the free ones and the chosen ones, never one
 * another access point holds. A chosen Fach the listing does not name -
 * Open Locker is not active, or the account lost it - stays in its
 * Schrank as stored, so it can still be taken out.
 */
describe("the Fächer to choose from", () => {
  const listing = [
    listed(UUID_1, LABOR, 1),
    listed(UUID_2, LABOR, 2),
    listed(UUID_3, HAFEN, 3),
  ];

  it("groups the listing by Schließfachschrank", () => {
    const groups = compartmentGroups(listing, [], new Set());

    expect(
      groups.map((group) => ({
        name: group.lockerBank.name,
        numbers: group.compartments.map((c) => c.number),
      }))
    ).toEqual([
      { name: "Labor Fachbank 1", numbers: [1, 2] },
      { name: "Quartiersschrank Hafen", numbers: [3] },
    ]);
  });

  it("marks the chosen ones with whether they are out of service", () => {
    const groups = compartmentGroups(
      listing,
      [{ id: UUID_2, outOfService: true }],
      new Set()
    );

    expect(groups[0].compartments).toEqual([
      {
        id: UUID_1,
        number: 1,
        lockerBank: LABOR,
        selected: false,
        outOfService: false,
        listed: true,
      },
      {
        id: UUID_2,
        number: 2,
        lockerBank: LABOR,
        selected: true,
        outOfService: true,
        listed: true,
      },
    ]);
  });

  it("hides what another access point holds, and a Schrank left empty by it", () => {
    const groups = compartmentGroups(listing, [], new Set([UUID_1, UUID_3]));

    expect(groups.map((group) => group.compartments.map((c) => c.id))).toEqual([
      [UUID_2],
    ]);
  });

  it("keeps a chosen Fach the listing does not name, as stored", () => {
    const stored = {
      id: UUID_4,
      number: 7,
      lockerBank: HAFEN,
      outOfService: false,
    };

    const groups = compartmentGroups([], [stored], new Set());

    expect(groups).toEqual([
      {
        lockerBank: HAFEN,
        compartments: [{ ...stored, selected: true, listed: false }],
      },
    ]);
  });
});

/**
 * An Anlage with its own Fächer belongs to one bookable only
 * (ECCdigital/tickets#1038): the bookable form does not offer one another
 * bookable already links.
 */
describe("lockerSystemIdsLinkedElsewhere", () => {
  const SYSTEM = {
    id: "ap-system",
    type: "locker",
    provider: "open-locker",
    config: { compartments: [] },
  };
  const IFBS = { id: "ap-ifbs", type: "locker", provider: "ifbs" };
  const DOOR = { id: "ap-door", type: "door", provider: "nuki" };
  const linking = (id, ids, active = true) => ({
    id,
    accessPointDetails: { active, accessPointIds: ids },
  });

  it("names an Anlage with its own Fächer another bookable links", () => {
    const linked = lockerSystemIdsLinkedElsewhere(
      [SYSTEM, IFBS, DOOR],
      [linking("b2", ["ap-system", "ap-ifbs", "ap-door"])],
      "b1"
    );

    expect([...linked]).toEqual(["ap-system"]);
  });

  it("does not count the bookable's own link", () => {
    const linked = lockerSystemIdsLinkedElsewhere(
      [SYSTEM],
      [linking("b1", ["ap-system"])],
      "b1"
    );

    expect(linked.size).toBe(0);
  });

  it("counts the link of a bookable whose access is switched off", () => {
    const linked = lockerSystemIdsLinkedElsewhere(
      [SYSTEM],
      [linking("b2", ["ap-system"], false)],
      "b1"
    );

    expect([...linked]).toEqual(["ap-system"]);
  });

  it("names every other link of a new bookable, which has no id yet", () => {
    const linked = lockerSystemIdsLinkedElsewhere(
      [SYSTEM],
      [linking("b2", ["ap-system"])],
      undefined
    );

    expect([...linked]).toEqual(["ap-system"]);
  });
});

/**
 * `amount` stays independent of the Fächer, but the form names each linked
 * Anlage whose Fächer in service it does not equal (ECCdigital/tickets#1038,
 * #1164), by the rule of `compartmentCountMismatch`.
 */
describe("compartmentCountMismatches", () => {
  // Each Anlage has its first Fach out of service.
  const system = (id, label, count) => ({
    id,
    type: "locker",
    provider: "open-locker",
    label,
    config: {
      compartments: Array.from({ length: count }, (_, i) => ({
        id: `${id}-c${i}`,
        number: i + 1,
        outOfService: i === 0,
      })),
    },
  });
  const GARAGE = system("ap-garage", "Fahrradgarage", 4);
  const KELLER = system("ap-keller", "Keller", 2);
  const IFBS = { id: "ap-ifbs", type: "locker", provider: "ifbs", label: "B" };
  const bookable = (amount, ids) => ({
    amount,
    accessPointDetails: { active: true, accessPointIds: ids },
  });

  it("names an Anlage with fewer Fächer in service than the amount", () => {
    expect(
      compartmentCountMismatches(bookable(3, ["ap-garage", "ap-keller"]), [
        GARAGE,
        KELLER,
      ])
    ).toEqual([
      {
        accessPointId: "ap-keller",
        label: "Keller",
        kind: "larger",
        amount: 3,
        inService: 1,
        suggestedAmount: 1,
      },
    ]);
  });

  it("names an Anlage with more Fächer in service than the amount", () => {
    expect(
      compartmentCountMismatches(bookable(1, ["ap-garage", "ap-keller"]), [
        GARAGE,
        KELLER,
      ])
    ).toEqual([
      {
        accessPointId: "ap-garage",
        label: "Fahrradgarage",
        kind: "smaller",
        amount: 1,
        inService: 3,
        suggestedAmount: 3,
      },
    ]);
  });

  it("names every linked Anlage while the amount is unlimited", () => {
    expect(
      compartmentCountMismatches(bookable(null, ["ap-garage", "ap-keller"]), [
        GARAGE,
        KELLER,
      ]).map(({ accessPointId, kind, suggestedAmount }) => [
        accessPointId,
        kind,
        suggestedAmount,
      ])
    ).toEqual([
      ["ap-garage", "unlimited", 3],
      ["ap-keller", "unlimited", 1],
    ]);
  });

  it("names nothing when the amount equals the Fächer in service", () => {
    expect(
      compartmentCountMismatches(bookable(3, ["ap-garage"]), [GARAGE])
    ).toEqual([]);
  });

  it("ignores Anlagen whose provider assigns, and access points not linked", () => {
    expect(
      compartmentCountMismatches(bookable(null, ["ap-ifbs"]), [IFBS, GARAGE])
    ).toEqual([]);
  });
});

/**
 * The Regel für Anzahl und Fächer of one Anlage (ECCdigital/tickets#1164):
 * the bookable's `amount` should equal the Fächer in service. It takes the
 * Fächer as they stand, a stored Anlage's or the dialog's draft, and the
 * bookable or none, so the dialog of the Anlage can ask it too.
 */
describe("compartmentCountMismatch", () => {
  const fächer = (inService, outOfService = 0) => [
    ...Array.from({ length: inService }, (_, i) => ({ id: `in-${i}` })),
    ...Array.from({ length: outOfService }, (_, i) => ({
      id: `off-${i}`,
      outOfService: true,
    })),
  ];

  it("reports nothing when the amount equals the Fächer in service", () => {
    expect(compartmentCountMismatch(fächer(3), { amount: 3 })).toBeNull();
  });

  it("does not count a Fach out of service", () => {
    expect(compartmentCountMismatch(fächer(2, 1), { amount: 2 })).toBeNull();
  });

  it("reports a larger amount and suggests the Fächer in service", () => {
    expect(compartmentCountMismatch(fächer(4), { amount: 6 })).toEqual({
      kind: "larger",
      amount: 6,
      inService: 4,
      suggestedAmount: 4,
    });
  });

  it("reports a smaller amount and suggests the Fächer in service", () => {
    expect(compartmentCountMismatch(fächer(4), { amount: 1 })).toEqual({
      kind: "smaller",
      amount: 1,
      inService: 4,
      suggestedAmount: 4,
    });
  });

  it("suggests the smaller amount when a Fach is out of service", () => {
    expect(compartmentCountMismatch(fächer(5, 1), { amount: 6 })).toEqual({
      kind: "larger",
      amount: 6,
      inService: 5,
      suggestedAmount: 5,
    });
  });

  it.each([
    ["empty", null],
    ["0, as the backend reads it", 0],
  ])("reports an unlimited amount, %s", (_, amount) => {
    expect(compartmentCountMismatch(fächer(2), { amount })).toEqual({
      kind: "unlimited",
      amount: null,
      inService: 2,
      suggestedAmount: 2,
    });
  });

  /** 0 reads as unlimited in Biletado, so it is never suggested. */
  it.each([
    ["a limited", 2, "larger", 2],
    ["an unlimited", null, "unlimited", null],
  ])(
    "suggests nothing for %s amount while no Fach is in service",
    (_, amount, kind, reported) => {
      expect(compartmentCountMismatch(fächer(0, 2), { amount })).toEqual({
        kind,
        amount: reported,
        inService: 0,
        suggestedAmount: null,
      });
    }
  );

  it("reports nothing without a bookable: there is no amount to compare", () => {
    expect(compartmentCountMismatch(fächer(3), null)).toBeNull();
    expect(compartmentCountMismatch(fächer(0), undefined)).toBeNull();
  });
});

/**
 * „Was daraus wird“ in the dialog of the Anlage (ECCdigital/tickets#1166):
 * from the Fächer as they stand and the bookable chosen, the case, three
 * numbers - Fächer (out of service among them), Anzahl, zur selben Zeit
 * buchbar - and one sentence. A Fach out of service is not bookable.
 */
describe("compartmentOutcome", () => {
  const fächer = (inService, outOfService = 0) => [
    ...Array.from({ length: inService }, (_, i) => ({ id: `in-${i}` })),
    ...Array.from({ length: outOfService }, (_, i) => ({
      id: `off-${i}`,
      outOfService: true,
    })),
  ];
  const bookable = (amount, title = "Fahrradboxen Bahnhof Nord") => ({
    id: "b1",
    title,
    type: "resource",
    amount,
  });

  it("asks to tick the Fächer while none is chosen", () => {
    expect(compartmentOutcome([], bookable(6))).toEqual({
      kind: "empty",
      count: 0,
      outOfService: 0,
      inService: 0,
      amount: 6,
      unlimited: false,
      concurrent: 0,
      suggestedAmount: null,
      text: "Noch kein Fach gewählt. Klicken Sie links die Fächer an, die zu dieser Schließfachanlage gehören.",
    });
  });

  it("fits when the Anzahl equals the Fächer in service", () => {
    expect(compartmentOutcome(fächer(6), bookable(6))).toEqual({
      kind: "fits",
      count: 6,
      outOfService: 0,
      inService: 6,
      amount: 6,
      unlimited: false,
      concurrent: 6,
      suggestedAmount: null,
      text: "Passt: „Fahrradboxen Bahnhof Nord“ kann 6-mal zur selben Zeit gebucht werden, und jede dieser Buchungen bekommt ihr eigenes Fach.",
    });
  });

  it("fits the key to a room: one Fach, Anzahl 1", () => {
    const outcome = compartmentOutcome(
      fächer(1),
      bookable(1, "Besprechungsraum 2.14")
    );

    expect(outcome.kind).toBe("fits");
    expect(outcome.concurrent).toBe(1);
    expect(outcome.text).toBe(
      "Passt: „Besprechungsraum 2.14“ wird immer nur einmal zur selben Zeit gebucht, und dafür gibt es ein Fach."
    );
  });

  /** „dafür gibt es ein Fach“ only where exactly one Fach is in service. */
  it("says one Fach for Anzahl 1 only with one Fach in service, else the case it is", () => {
    const oneOfThree = compartmentOutcome(fächer(1, 2), bookable(1, "Labor"));
    expect(oneOfThree.kind).toBe("fits");
    expect(oneOfThree.text).toBe(
      "Passt: „Labor“ wird immer nur einmal zur selben Zeit gebucht, und dafür gibt es ein Fach."
    );

    const threeInService = compartmentOutcome(fächer(3), bookable(1, "Labor"));
    expect(threeInService.kind).toBe("smaller");
    expect(threeInService.text).toBe(
      "„Labor“ hat die Anzahl 1, in Betrieb sind 3 Fächer. 2 Fächer werden nie gebraucht. Setzen Sie die Anzahl auf 3, oder nehmen Sie 2 Fächer heraus."
    );
  });

  it("names the Anzahl the bookable should have while there is none", () => {
    expect(compartmentOutcome(fächer(3, 1), null)).toEqual({
      kind: "unassigned",
      count: 4,
      outOfService: 1,
      inService: 3,
      amount: null,
      unlimited: false,
      concurrent: 3,
      suggestedAmount: 3,
      text: "Zur selben Zeit buchbar: 3, je Fach in Betrieb eine Buchung. Ordnen Sie die Schließfachanlage einem Buchungsobjekt zu. Seine Anzahl sollte 3 sein.",
    });
  });

  /** 0 reads as unlimited in Biletado, so it is never the Anzahl to have. */
  it("names no Anzahl without a bookable while no Fach is in service", () => {
    const outcome = compartmentOutcome(fächer(0, 2), null);

    expect(outcome.kind).toBe("unassigned");
    expect(outcome.concurrent).toBe(0);
    expect(outcome.suggestedAmount).toBeNull();
    expect(outcome.text).toBe(
      "Kein Fach ist in Betrieb. Zur selben Zeit buchbar ist deshalb nichts."
    );
  });

  it("books only the Fächer in service when the Anzahl is larger", () => {
    expect(compartmentOutcome(fächer(5, 1), bookable(6))).toEqual({
      kind: "larger",
      count: 6,
      outOfService: 1,
      inService: 5,
      amount: 6,
      unlimited: false,
      concurrent: 5,
      suggestedAmount: 5,
      text: "„Fahrradboxen Bahnhof Nord“ hat die Anzahl 6, aber nur 5 Fächer in Betrieb. Zur selben Zeit buchbar sind deshalb nur 5. Wählen Sie 1 weiteres Fach, oder setzen Sie die Anzahl auf 5.",
    });
  });

  it("books nothing when the Anzahl is larger and no Fach is in service", () => {
    const outcome = compartmentOutcome(fächer(0, 1), bookable(2));

    expect(outcome.kind).toBe("larger");
    expect(outcome.concurrent).toBe(0);
    expect(outcome.suggestedAmount).toBeNull();
    expect(outcome.text).toBe(
      "„Fahrradboxen Bahnhof Nord“ hat die Anzahl 2, aber kein Fach in Betrieb. Zur selben Zeit buchbar ist deshalb nichts."
    );
  });

  it("names the Fächer never needed when the Anzahl is smaller", () => {
    expect(compartmentOutcome(fächer(6), bookable(4))).toEqual({
      kind: "smaller",
      count: 6,
      outOfService: 0,
      inService: 6,
      amount: 4,
      unlimited: false,
      concurrent: 4,
      suggestedAmount: 6,
      text: "„Fahrradboxen Bahnhof Nord“ hat die Anzahl 4, in Betrieb sind 6 Fächer. 2 Fächer werden nie gebraucht. Setzen Sie die Anzahl auf 6, oder nehmen Sie 2 Fächer heraus.",
    });
  });

  it("books only the Fächer in service when the Anzahl is unlimited", () => {
    expect(compartmentOutcome(fächer(3), bookable(null))).toEqual({
      kind: "unlimited",
      count: 3,
      outOfService: 0,
      inService: 3,
      amount: null,
      unlimited: true,
      concurrent: 3,
      suggestedAmount: 3,
      text: "Die Anzahl von „Fahrradboxen Bahnhof Nord“ ist unbegrenzt. Zur selben Zeit buchbar sind trotzdem nur 3, weil jede Buchung ein eigenes Fach braucht.",
    });
  });

  /** The Anzahl the dialog would save with the Anlage counts instead. */
  it("measures an Anzahl given in place of the bookable's", () => {
    const outcome = compartmentOutcome(fächer(4), bookable(null), {
      amount: 4,
    });

    expect(outcome.kind).toBe("fits");
    expect(outcome.amount).toBe(4);
    expect(outcome.text).toBe(
      "Passt: „Fahrradboxen Bahnhof Nord“ kann 4-mal zur selben Zeit gebucht werden, und jede dieser Buchungen bekommt ihr eigenes Fach."
    );
  });
});

describe("leavingCompartmentIds", () => {
  const fach = (id, outOfService = false) => ({ id, outOfService });

  it("names the Fächer taken out of the list and those newly out of service", () => {
    const stored = {
      type: "locker",
      config: {
        compartments: [
          fach(UUID_1),
          fach(UUID_2),
          fach(UUID_3, true),
          fach(UUID_4, true),
        ],
      },
    };

    expect(
      leavingCompartmentIds(stored, [
        fach(UUID_1),
        fach(UUID_2, true),
        fach(UUID_3, true),
      ])
    ).toEqual([UUID_2, UUID_4]);
  });

  it("names none when a Fach goes back into service or a new one comes", () => {
    const stored = {
      type: "locker",
      config: { compartments: [fach(UUID_1, true)] },
    };

    expect(leavingCompartmentIds(stored, [fach(UUID_1), fach(UUID_2)])).toEqual(
      []
    );
  });

  it("names none for a new Anlage", () => {
    expect(leavingCompartmentIds(null, [fach(UUID_1, true)])).toEqual([]);
  });
});

/**
 * A Fach as the administration reads it - in the list of free Fächer, the
 * bookings at a Fach and the title on the booking page alike.
 */
describe("the title of a Fach", () => {
  it.each([
    [
      { number: 3, lockerBankName: "Labor Fachbank 1" },
      "Schrank Labor Fachbank 1, Fach 3",
    ],
    [{ number: 3, lockerBankName: null }, "Fach 3"],
    [
      { number: null, lockerBankName: "Labor Fachbank 1" },
      "Schrank Labor Fachbank 1",
    ],
    [null, ""],
  ])("%o: %s", (compartment, title) => {
    expect(compartmentTitle(compartment)).toBe(title);
  });
});

/**
 * The Fächer of an Anlage as the dialog „QR-Codes der Fächer“ lists them
 * (ECCdigital/tickets#1056): grouped by Schrank, in the order the backend
 * assigns them - Schrank by name, the same name by its id, then the number
 * numerically.
 */
describe("the Fächer of an Anlage by Schrank", () => {
  const ZENTRUM_B = { id: "bank-b", name: "Zentrum" };
  const ZENTRUM_A = { id: "bank-a", name: "Zentrum" };

  it("groups by Schrank, sorted like the Zuteilung", () => {
    const groups = compartmentsByLockerBank([
      { id: UUID_1, number: 10, lockerBank: LABOR, outOfService: false },
      { id: UUID_2, number: 2, lockerBank: ZENTRUM_B, outOfService: false },
      { id: UUID_3, number: 9, lockerBank: LABOR, outOfService: true },
      { id: UUID_4, number: 1, lockerBank: ZENTRUM_A, outOfService: false },
      { id: "u5", number: 1, lockerBank: HAFEN, outOfService: false },
    ]);

    expect(
      groups.map((group) => [
        group.lockerBank.id,
        group.compartments.map((c) => c.number),
      ])
    ).toEqual([
      ["bank-labor", [9, 10]],
      ["bank-hafen", [1]],
      ["bank-a", [1]],
      ["bank-b", [2]],
    ]);
    expect(groups[0].compartments[0]).toEqual({
      id: UUID_3,
      number: 9,
      lockerBank: LABOR,
      outOfService: true,
    });
  });

  it("has no group for an Anlage without Fächer", () => {
    expect(compartmentsByLockerBank([])).toEqual([]);
    expect(compartmentsByLockerBank(undefined)).toEqual([]);
  });
});
