import { describe, expect, it } from "vitest";
import {
  carriesOwnCompartments,
  compartmentGroups,
  takenCompartmentIds,
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
      [...takenCompartmentIds(accessPoints, { provider: "open-locker" })].sort()
    ).toEqual([UUID_1, UUID_2].sort());
  });

  it("leaves out the Anlage being edited", () => {
    expect([
      ...takenCompartmentIds(accessPoints, {
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
