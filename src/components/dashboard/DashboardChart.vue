<template>
  <div ref="chart" class="dashboard-chart" :style="{ height }" />
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
  },
  data() {
    return {
      chart: null,
    };
  },
  watch: {
    option: {
      deep: true,
      handler(value) {
        if (this.chart && value) {
          this.chart.setOption(value, true);
        }
      },
    },
  },
  mounted() {
    this.chart = echarts.init(this.$refs.chart);
    if (this.option) {
      this.chart.setOption(this.option);
    }
    window.addEventListener("resize", this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.handleResize);
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
}
</style>
