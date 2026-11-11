<template>
  <BaseSection title="Buchungsobjekte" icon="mdi-calendar-check">
    <SubSection
      title="Benutzerdefinierte Felder"
      icon="mdi-form-textbox"
      description="Definiere benutzerdefinierte Felder, die in allen
                   Buchungsobjekten verfügbar sind. Mandanten können die
                   Werte überschreiben, wenn erlaubt."
      no-margin
    >
      <CustomFieldList
        :fields="instance.bookableCustomFields || []"
        @update:fields="onFieldsChanged"
      />
    </SubSection>

    <SubSection
      :title="$t('instance.edit.customerUploads.title')"
      icon="mdi-file-upload-outline"
      :description="$t('instance.edit.customerUploads.intro')"
      no-margin
      class="mt-12"
    >
      <v-form ref="form" @submit.prevent>
        <v-switch
          data-test="instance-customer-uploads-enabled"
          :input-value="customerUploads.enabled"
          color="primary"
          :label="$t('instance.edit.customerUploads.enabled')"
          :hint="$t('instance.edit.customerUploads.enabled-hint')"
          persistent-hint
          class="mt-0"
          @change="changeUploads({ enabled: !!$event })"
        />

        <template v-if="customerUploads.enabled">
          <div class="text-subtitle-2 mt-6 mb-1">
            {{ $t("instance.edit.customerUploads.limits") }}
          </div>
          <p class="text-caption text--secondary mb-1">
            {{ $t("instance.edit.customerUploads.limits-hint") }}
          </p>
          <v-row>
            <v-col
              v-for="limit in limitFields"
              :key="limit.name"
              cols="12"
              md="4"
            >
              <v-text-field
                :data-test="`instance-customer-uploads-${limit.name}`"
                :value="customerUploads[limit.name]"
                :label="$t(`instance.edit.customerUploads.${limit.name}`)"
                :placeholder="String(ceilings[limit.name])"
                :hint="
                  $t('instance.edit.customerUploads.limit-hint', {
                    max: ceilings[limit.name],
                  })
                "
                persistent-hint
                :suffix="limit.suffix"
                type="number"
                min="1"
                :max="ceilings[limit.name]"
                :rules="rule(limit.name)"
                :error-messages="apiErrors[limit.name] || []"
                background-color="accent"
                filled
                dense
                @input="changeLimit(limit.name, $event)"
              />
            </v-col>
          </v-row>
        </template>
      </v-form>
    </SubSection>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import SubSection from "@/components/commons/SubSection.vue";
import CustomFieldList from "@/components/CustomFields/CustomFieldList.vue";
import {
  customerUploadCeilingsOf,
  instanceCustomerUploadsIssues,
  instanceCustomerUploadsOf,
} from "@/utils/customerUploads";

export default {
  name: "InstanceEditBookables",
  components: { BaseSection, SubSection, CustomFieldList },
  props: {
    instance: { type: Object, required: true },
  },
  data() {
    return { apiErrors: {} };
  },
  computed: {
    customerUploads() {
      return instanceCustomerUploadsOf(this.instance);
    },
    /** The ceilings of the server, from the public instance. */
    ceilings() {
      return customerUploadCeilingsOf(
        this.$store?.getters["instance/instance"]
      );
    },
    issues() {
      return instanceCustomerUploadsIssues(this.customerUploads, this.ceilings);
    },
    limitFields() {
      return [
        { name: "maxFileSizeMb", suffix: "MB" },
        { name: "maxFilesPerBooking", suffix: null },
        { name: "maxTotalSizeMbPerBooking", suffix: "MB" },
      ];
    },
  },
  methods: {
    onFieldsChanged(fields) {
      this.$emit("update:instance", {
        ...this.instance,
        bookableCustomFields: fields,
      });
    },
    changeUploads(changes) {
      this.$emit("update:instance", {
        ...this.instance,
        customerUploads: { ...this.customerUploads, ...changes },
      });
    },
    changeLimit(name, value) {
      this.apiErrors = { ...this.apiErrors, [name]: [] };
      this.changeUploads({
        [name]: value === "" || value === null ? null : Number(value),
      });
    },
    rule(name) {
      return [
        () =>
          this.issues[name]
            ? this.$t(this.issues[name], { max: this.ceilings[name] })
            : true,
      ];
    },
    validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      this.apiErrors = {};
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
    /** A limit the server refused, under its field. */
    showApiErrors(errors) {
      const apiErrors = {};
      for (const { field } of errors || []) {
        if (!(field in this.customerUploads) || field === "enabled") continue;
        apiErrors[field] = [
          this.$t("instance.edit.customerUploads.validation.limit", {
            max: this.ceilings[field],
          }),
        ];
      }
      this.apiErrors = apiErrors;
    },
  },
};
</script>
