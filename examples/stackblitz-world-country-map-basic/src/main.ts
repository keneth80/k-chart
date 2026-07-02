import { createKChart, createWorldCountryMapSeries } from "@keneth80/k-chart";
import "./style.css";

type CountryDatum = {
  name: string;
  visitors: number;
  color: string;
  tier: string;
};

const countries: CountryDatum[] = [
  { name: "South Korea", visitors: 96, color: "#5db8ff", tier: "home" },
  { name: "Japan", visitors: 88, color: "#56d08f", tier: "high" },
  { name: "China", visitors: 82, color: "#f3b45b", tier: "high" },
  { name: "India", visitors: 74, color: "#d876ff", tier: "growth" },
  { name: "Australia", visitors: 61, color: "#72e4ff", tier: "growth" },
  { name: "United States of America", visitors: 91, color: "#ff6b8a", tier: "high" },
  { name: "Canada", visitors: 57, color: "#a8d95f", tier: "growth" },
  { name: "Brazil", visitors: 49, color: "#ff9f5a", tier: "growth" },
  { name: "France", visitors: 69, color: "#2f73b8", tier: "high" },
  { name: "Germany", visitors: 65, color: "#9b5de5", tier: "high" },
  { name: "South Africa", visitors: 43, color: "#38a6e8", tier: "seed" }
];

createKChart<CountryDatum>({
  selector: "#chart",
  data: countries,
  width: 1120,
  height: 600,
  margin: { top: 62, right: 28, bottom: 24, left: 28 },
  title: { text: "World country color map", align: "left", fontSize: 15 },
  grid: { visible: false },
  legend: { visible: false },
  tooltip: { visible: true },
  axes: [],
  series: [
    createWorldCountryMapSeries<CountryDatum>({
      selector: "world-country",
      displayName: "Countries",
      dataKey: "name",
      valueField: "visitors",
      colorField: "color",
      fitPadding: 22,
      backgroundFill: "rgba(11, 16, 23, 0.32)",
      missingFill: "rgba(142, 160, 173, 0.18)",
      stroke: "rgba(248, 251, 255, 0.42)",
      strokeWidth: 0.55,
      hoverStroke: "#ffffff",
      hoverStrokeWidth: 1.5,
      labels: {
        visible: true,
        mode: "centroid",
        fill: "#f8fbff",
        fontSize: 10,
        formatter: ({ data }) => data ? data.name : ""
      },
      tooltip: {
        formatter: ({ label, data }) => data
          ? `<strong>${label}</strong><br/>visitors: ${data.visitors}<br/>tier: ${data.tier}`
          : `<strong>${label}</strong><br/>No data`
      }
    })
  ]
}).render();
