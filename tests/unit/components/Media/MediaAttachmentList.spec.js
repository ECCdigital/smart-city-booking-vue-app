import { describe, expect, it } from "vitest";
import MediaAttachmentList from "@/components/Media/MediaAttachmentList.vue";
import { mountComponent } from "@tests/unit/support/mount";

const attachment = (overrides = {}) => ({
  id: "att-1",
  title: "Hausordnung",
  type: "agreement",
  show: false,
  required: false,
  mailAttach: false,
  ...overrides,
});

/** The list with its one attachment expanded, so its switches render. */
async function mountList(entry) {
  const wrapper = mountComponent(MediaAttachmentList, {
    propsData: { value: [entry] },
    stubs: { MediaReferenceField: true },
  });
  await wrapper.setData({ expandedItems: [entry.id] });
  return wrapper;
}

/** The switch input next to its label. */
function switchInput(wrapper, label) {
  const field = wrapper
    .findAll(".v-input--switch")
    .wrappers.find((input) => input.text().includes(label));
  return field.find("input");
}

describe("MediaAttachmentList: „Muss akzeptiert werden“ follows „Im Buchungsprozess anzeigen“", () => {
  it("disables the acceptance switch while the attachment is not shown", async () => {
    const wrapper = await mountList(attachment());

    expect(
      switchInput(wrapper, "Muss akzeptiert werden").attributes("disabled")
    ).toBe("disabled");
  });

  it("enables the acceptance switch once the attachment is shown", async () => {
    const wrapper = await mountList(attachment({ show: true }));

    expect(
      switchInput(wrapper, "Muss akzeptiert werden").attributes("disabled")
    ).toBeUndefined();
  });

  it("drops the requirement when the attachment is hidden", async () => {
    const wrapper = await mountList(attachment({ show: true, required: true }));

    wrapper.vm.setShow(wrapper.vm.attachments[0], false);

    expect(wrapper.emitted("input")[0][0][0]).toMatchObject({
      show: false,
      required: false,
    });
  });

  it("does not mark a hidden attachment as required", async () => {
    const wrapper = await mountList(attachment({ required: true }));

    expect(wrapper.text()).not.toContain("Pflicht");
  });
});
