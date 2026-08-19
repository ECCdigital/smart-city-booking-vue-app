<template>
  <div
    ref="chart"
    class="dashboard-chart"
    :style="{ height, minWidth: minWidth || undefined }"
  />
</template>

<script>
import * as echarts from "echarts";

export default {
  name: "DashboardChart",
  props: {
    option: {
      type: Object,
      required: true,
    },
    height: {
      type: String,
      default: "320px",
    },
    minWidth: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      chart: null,
      resizeObserver: null,
    };
  },
  watch: {
    option: {
      deep: true,
      handler(value) {
        if (this.chart && value) {
          this.chart.setOption(value, true);
          this.$nextTick(this.handleResize);
        }
      },
    },
    minWidth() {
      this.$nextTick(this.handleResize);
    },
  },
  mounted() {
    this.chart = echarts.init(this.$refs.chart);
    if (this.option) {
      this.chart.setOption(this.option);
    }
    window.addEventListener("resize", this.handleResize);
    if (typeof ResizeObserver !== "undefined" && this.$refs.chart) {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.$refs.chart);
    }
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.handleResize);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  },
  methods: {
    handleResize() {
      if (this.chart) {
        this.chart.resize();
      }
    },
  },
};
</script>

<style scoped>
.dashboard-chart {
  width: 100%;
  min-width: 0;
}
</style>
