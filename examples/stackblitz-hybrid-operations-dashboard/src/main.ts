import {
  createCanvasLineSeries,
  createCustomSeries,
  createKChart,
  createWebglLineSeries,
  type KChartSeries
} from "@keneth80/k-chart";
import "./style.css";

type IncidentSeverity = "warning" | "critical";

type OperationPoint = {
  x: number;
  throughput: number;
  baseline: number;
  severity?: IncidentSeverity;
  site?: string;
  message?: string;
};

type IncidentSummary = {
  severity: IncidentSeverity;
  site: string;
  message: string;
  time: string;
};

const POINT_COUNT = 14_000;
const incidents = new Map<number, Omit<OperationPoint, "x" | "throughput" | "baseline">>([
  [3_250, { severity: "warning", site: "Seoul edge", message: "Packet retry burst" }],
  [7_820, { severity: "critical", site: "Frankfurt gateway", message: "Latency above SLA" }],
  [11_680, { severity: "warning", site: "Virginia cluster", message: "Queue depth elevated" }]
]);

const incidentSummaries: IncidentSummary[] = [
  { severity: "critical", site: "Frankfurt gateway", message: "Latency above SLA", time: "12 sec ago" },
  { severity: "warning", site: "Virginia cluster", message: "Queue depth elevated", time: "46 sec ago" },
  { severity: "warning", site: "Seoul edge", message: "Packet retry burst", time: "2 min ago" }
];

const data: OperationPoint[] = Array.from({ length: POINT_COUNT }, (_, x) => {
  const baseline = 57 + Math.sin(x / 1_900) * 4.8 + Math.cos(x / 780) * 2.1;
  const telemetry = baseline
    + Math.sin(x / 18) * 5.4
    + Math.sin(x / 71) * 3.2
    + Math.cos(x / 9) * 1.4;
  const incident = incidents.get(x);
  const incidentLift = incident?.severity === "critical" ? 24 : incident ? 14 : 0;

  return {
    x,
    throughput: Number(Math.min(96, telemetry + incidentLift).toFixed(2)),
    baseline: Number(baseline.toFixed(2)),
    ...incident
  };
});

const createIncidentSeries = (): KChartSeries<OperationPoint> =>
  createCustomSeries<OperationPoint>({
    selector: "operations-incidents",
    displayName: "SVG incidents",
    xField: "x",
    yField: "throughput",
    color: "#fb7185",
    render({ group, data: points, xScale, yScale, plotSize }) {
      if (!xScale || !yScale) return;

      const alerts = points.filter((point) => point.severity);
      const groups = group
        .selectAll("g.operation-alert")
        .data(alerts, (point: OperationPoint) => String(point.x))
        .join("g")
        .attr("class", "operation-alert")
        .attr("transform", (point: OperationPoint) =>
          `translate(${xScale.scale(point.x)},${yScale.scale(point.throughput)})`
        );

      groups.selectAll("line.alert-stem")
        .data((point: OperationPoint) => [point])
        .join("line")
        .attr("class", "alert-stem")
        .attr("x1", 0).attr("x2", 0).attr("y1", 9).attr("y2", 34)
        .attr("stroke", (point: OperationPoint) => point.severity === "critical" ? "#fb7185" : "#fbbf24");

      groups.selectAll("circle.alert-pulse")
        .data((point: OperationPoint) => [point])
        .join("circle")
        .attr("class", "alert-pulse")
        .attr("r", 10).attr("fill", "none")
        .attr("stroke", (point: OperationPoint) => point.severity === "critical" ? "#fb7185" : "#fbbf24");

      groups.selectAll("circle.alert-core")
        .data((point: OperationPoint) => [point])
        .join("circle")
        .attr("class", "alert-core")
        .attr("r", 4.5)
        .attr("fill", (point: OperationPoint) => point.severity === "critical" ? "#fb7185" : "#fbbf24")
        .attr("stroke", "#f8fafc").attr("stroke-width", 1.5);

      groups.selectAll("text.alert-label")
        .data((point: OperationPoint) => [point])
        .join("text")
        .attr("class", "alert-label")
        .attr("x", (point: OperationPoint) => xScale.scale(point.x) > plotSize.width - 150 ? -12 : 12)
        .attr("y", 40)
        .attr("text-anchor", (point: OperationPoint) => xScale.scale(point.x) > plotSize.width - 150 ? "end" : "start")
        .text((point: OperationPoint) => point.site ?? "Incident");
    }
  });

const series = [
  createWebglLineSeries<OperationPoint>({
    selector: "operations-telemetry",
    displayName: "WebGL telemetry",
    xField: "x",
    yField: "throughput",
    color: "#38bdf8",
    lineWidth: 1.2,
    downsample: { enabled: true, strategy: "min-max", pointsPerPixel: 2 }
  }),
  createCanvasLineSeries<OperationPoint>({
    selector: "operations-baseline",
    displayName: "Canvas baseline",
    xField: "x",
    yField: "baseline",
    color: "#fbbf24",
    lineWidth: 2.2
  }),
  createIncidentSeries()
];

const chart = createKChart<OperationPoint>({
  selector: "#chart",
  data,
  height: 410,
  margin: { top: 22, right: 28, bottom: 48, left: 56 },
  grid: { visible: true, x: false, y: true, color: "rgba(148, 163, 184, 0.17)", dasharray: "2 7" },
  legend: { visible: false },
  tooltip: {
    visible: true,
    formatter: ({ data: point, series: activeSeries, color }) => {
      const value = activeSeries.selector === "operations-baseline" ? point.baseline : point.throughput;
      return `<div style="min-width:168px">
        <div style="color:${color};font-weight:800;margin-bottom:6px">${activeSeries.displayName}</div>
        <div>Sample: ${point.x.toLocaleString()}</div>
        <div>Value: ${value.toFixed(2)}%</div>
        ${point.site ? `<div style="margin-top:6px;color:#f8fafc">${point.site}: ${point.message}</div>` : ""}
      </div>`;
    }
  },
  axes: [
    {
      field: "x", type: "number", placement: "bottom", min: 0, max: POINT_COUNT - 1,
      title: "Rolling 60-minute window", tickCount: 7,
      tickFormat: (value) => `${Math.round((Number(value) / (POINT_COUNT - 1)) * 60 - 60)}m`
    },
    {
      field: "throughput", domainFields: ["throughput", "baseline"], type: "number", placement: "left",
      min: 20, max: 100, title: "Capacity", tickCount: 5,
      tickFormat: (value) => `${Number(value).toFixed(0)}%`
    }
  ],
  series
}).render();

const incidentList = document.querySelector<HTMLElement>("#incident-list");
if (incidentList) {
  incidentList.innerHTML = incidentSummaries.map((incident) => `
    <article class="${incident.severity}">
      <div><i></i>${incident.severity}</div>
      <strong>${incident.site}</strong>
      <p>${incident.message}</p>
      <time>${incident.time}</time>
    </article>
  `).join("");
}

const chartElement = document.querySelector<HTMLElement>("#chart");
if (chartElement) {
  new ResizeObserver(() => chart.resize()).observe(chartElement);
}
