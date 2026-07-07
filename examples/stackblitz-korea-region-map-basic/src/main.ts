import { createGeoRegionMapSeries, createKChart } from "@keneth80/k-chart";
import koreaRegions from "./data/korea-provinces-2018-topo-simple.json";
import "./style.css";

type RegionDatum = {
  name: string;
  value: number;
  color: string;
  note: string;
};

const data: RegionDatum[] = [
  { name: "서울특별시", value: 112, color: "#9f1239", note: "Capital area" },
  { name: "경기도", value: 111, color: "#be123c", note: "Largest population" },
  { name: "강원도", value: 104, color: "#fb7185", note: "Mountain tourism" },
  { name: "인천광역시", value: 108, color: "#f43f5e", note: "Airport gateway" },
  { name: "충청북도", value: 107, color: "#f43f5e", note: "Inland region" },
  { name: "충청남도", value: 109, color: "#e11d48", note: "West coast" },
  { name: "대전광역시", value: 106, color: "#fb7185", note: "Science city" },
  { name: "세종특별자치시", value: 107, color: "#f43f5e", note: "Administrative city" },
  { name: "경상북도", value: 106, color: "#fb7185", note: "Heritage route" },
  { name: "대구광역시", value: 103, color: "#fda4af", note: "Metro city" },
  { name: "전라북도", value: 107, color: "#f43f5e", note: "Food route" },
  { name: "전라남도", value: 107, color: "#f43f5e", note: "Island route" },
  { name: "광주광역시", value: 104, color: "#fb7185", note: "Culture city" },
  { name: "경상남도", value: 105, color: "#fb7185", note: "South coast" },
  { name: "부산광역시", value: 105, color: "#fb7185", note: "Harbor city" },
  { name: "울산광역시", value: 110, color: "#e11d48", note: "Industrial city" },
  { name: "제주특별자치도", value: 103, color: "#fda4af", note: "Island destination" }
];

createKChart<RegionDatum>({
  selector: "#chart",
  data,
  width: 1080,
  height: 640,
  margin: { top: 62, right: 36, bottom: 28, left: 36 },
  title: { text: "Korea region choropleth", align: "left", fontSize: 15 },
  grid: { visible: false },
  legend: { visible: false },
  tooltip: { visible: true },
  axes: [],
  series: [
    createGeoRegionMapSeries<RegionDatum>({
      selector: "korea-region",
      displayName: "Korea Regions",
      geoJson: koreaRegions,
      topoObjectName: "skorea_provinces_2018_geo",
      dataKey: "name",
      featureKey: "name",
      labelKey: "name",
      valueField: "value",
      colorField: "color",
      fitPadding: 44,
      backgroundFill: "rgba(11, 16, 23, 0.26)",
      stroke: "rgba(248, 251, 255, 0.92)",
      strokeWidth: 1.4,
      hoverStrokeWidth: 2.4,
      zoom: {
        enabled: true,
        wheel: true,
        pan: true,
        scaleExtent: [1, 7],
        controls: { visible: true, x: 10, y: 10, step: 0.3 }
      },
      labels: {
        visible: true,
        mode: "centroid",
        fill: "#edf3f8",
        fontSize: 9,
        fontWeight: 900,
        stroke: "rgba(15, 23, 42, 0.68)",
        strokeWidth: 2,
        formatter: ({ value }) => String(value ?? "")
      },
      tooltip: {
        formatter: ({ label, data: item, value }) =>
          `<strong>${label}</strong><br/>score: ${value}<br/>${item?.note ?? ""}`
      }
    })
  ]
}).render();
