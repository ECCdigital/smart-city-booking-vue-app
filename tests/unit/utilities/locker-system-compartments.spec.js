import { describe, expect, it } from "vitest";
import {
  carriesOwnCompartments,
  compartmentCountMismatches,
  compartmentGroups,
  leavingCompartmentIds,
  compartmentTitle,
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
 * A Fach stands in at most one Anlage and is then no fixed Fach: what the
 * other access points of the provider already hold is not to be chosen.
 */
describe("the Fächer other access points hold", () => {
  const accessPoints = [
    {
      id: "anlage-1",
      type: "locker",
      provider: "open-locker",
      config: { compartments: [{ id: UUID_1 }] },
    },
    {
      id: "fach-1",
      type: "door",
      provider: "open-locker",
      externalId: UUID_2,
    },
    { id: "tuer-1", type: "door", provider: "nuki", externalId: UUID_3 },
  ];

  it("names those in another Anlage and the fixed Fächer of the provider", () => {
    expect(
      [...takenProviderIds(accessPoints, { provider: "open-locker" })].sort()
    ).toEqual([UUID_1, UUID_2].sort());
  });

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

  it("leaves out the Anlage being edited", () => {
    expect([
      ...takenProviderIds(accessPoints, {
        provider: "open-locker",
        exceptId: "anlage-1",
      }),
    ]).toEqual([UUID_2]);
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
 * `amount` stays independent of the Fächer, but the form says so when it
 * is unlimited or larger than the Fächer of a linked Anlage
 * (ECCdigital/tickets#1038).
 */
describe("compartmentCountMismatches", () => {
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

  it("names an Anlage with fewer Fächer than the amount, counting every Fach", () => {
    expect(
      compartmentCountMismatches(bookable(3, ["ap-garage", "ap-keller"]), [
        GARAGE,
        KELLER,
      ])
    ).toEqual([{ accessPointId: "ap-keller", label: "Keller", count: 2 }]);
  });

  it("names every linked Anlage while the amount is unlimited", () => {
    expect(
      compartmentCountMismatches(bookable(null, ["ap-garage", "ap-keller"]), [
        GARAGE,
        KELLER,
      ])
    ).toEqual([
      { accessPointId: "ap-garage", label: "Fahrradgarage", count: 4 },
      { accessPointId: "ap-keller", label: "Keller", count: 2 },
    ]);
  });

  it("reads an amount of 0 as unlimited, as the backend does", () => {
    expect(
      compartmentCountMismatches(bookable(0, ["ap-keller"]), [KELLER])
    ).toHaveLength(1);
  });

  it("names nothing when the amount fits or lies below the Fächer", () => {
    expect(
      compartmentCountMismatches(bookable(2, ["ap-garage", "ap-keller"]), [
        GARAGE,
        KELLER,
      ])
    ).toEqual([]);
  });

  it("ignores Anlagen whose provider assigns, and access points not linked", () => {
    expect(
      compartmentCountMismatches(bookable(null, ["ap-ifbs"]), [IFBS, GARAGE])
    ).toEqual([]);
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
