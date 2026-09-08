<template>
  <div ref="chart" class="bookings-bar-chart" />
</template>

<script>
import * as echarts from "echarts";

export default {
  name: "BookingsBarChart",
  data() {
    return {
      chart: null,
    };
  },
  mounted() {
    this.chart = echarts.init(this.$refs.chart);
    this.chart.setOption({
      title: {
        text: "Buchungen pro Monat",
        left: "center",
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun"],
      },
      yAxis: {
        type: "value",
        name: "Anzahl",
      },
      series: [
        {
          name: "Buchungen",
          type: "bar",
          data: [12, 19, 8, 15, 22, 17],
          itemStyle: {
            color: "#1976D2",
          },
        },
      ],
    });
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
.bookings-bar-chart {
  width: 100%;
  height: 360px;
}
</style>
