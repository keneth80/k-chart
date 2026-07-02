import { createGeoRegionMapSeries, createKChart } from "@keneth80/k-chart";
import "./style.css";

type RegionDatum = {
  name: string;
  value: number;
  color: string;
  note: string;
};

const koreaRegions = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "강원도" }, geometry: { type: "Polygon", coordinates: [[[127.35, 38.55], [129.42, 38.42], [129.35, 37.05], [128.45, 36.75], [127.25, 37.05], [127.35, 38.55]]] } },
    { type: "Feature", properties: { name: "경기도" }, geometry: { type: "Polygon", coordinates: [[[126.34, 38.18], [127.68, 38.05], [127.72, 37.05], [126.92, 36.82], [126.32, 37.24], [126.34, 38.18]]] } },
    { type: "Feature", properties: { name: "서울특별시" }, geometry: { type: "Polygon", coordinates: [[[126.78, 37.72], [127.18, 37.70], [127.18, 37.42], [126.80, 37.42], [126.78, 37.72]]] } },
    { type: "Feature", properties: { name: "충청북도" }, geometry: { type: "Polygon", coordinates: [[[127.25, 37.15], [128.32, 36.9], [128.2, 36.1], [127.15, 35.92], [126.9, 36.72], [127.25, 37.15]]] } },
    { type: "Feature", properties: { name: "충청남도" }, geometry: { type: "Polygon", coordinates: [[[126.1, 36.95], [127.1, 36.78], [127.2, 35.92], [126.15, 35.72], [125.8, 36.45], [126.1, 36.95]]] } },
    { type: "Feature", properties: { name: "대전광역시" }, geometry: { type: "Polygon", coordinates: [[[127.25, 36.48], [127.55, 36.46], [127.55, 36.22], [127.24, 36.22], [127.25, 36.48]]] } },
    { type: "Feature", properties: { name: "경상북도" }, geometry: { type: "Polygon", coordinates: [[[128.2, 36.85], [129.35, 36.95], [129.55, 35.55], [128.45, 35.25], [127.95, 36.05], [128.2, 36.85]]] } },
    { type: "Feature", properties: { name: "대구광역시" }, geometry: { type: "Polygon", coordinates: [[[128.45, 35.98], [128.78, 35.95], [128.78, 35.72], [128.44, 35.72], [128.45, 35.98]]] } },
    { type: "Feature", properties: { name: "전라북도" }, geometry: { type: "Polygon", coordinates: [[[126.35, 35.8], [127.65, 35.82], [127.75, 35.1], [126.35, 34.92], [126.0, 35.42], [126.35, 35.8]]] } },
    { type: "Feature", properties: { name: "전라남도" }, geometry: { type: "Polygon", coordinates: [[[125.85, 35.0], [127.35, 35.05], [127.15, 34.22], [126.08, 33.95], [125.75, 34.48], [125.85, 35.0]]] } },
    { type: "Feature", properties: { name: "광주광역시" }, geometry: { type: "Polygon", coordinates: [[[126.73, 35.28], [127.0, 35.26], [127.0, 35.06], [126.73, 35.06], [126.73, 35.28]]] } },
    { type: "Feature", properties: { name: "경상남도" }, geometry: { type: "Polygon", coordinates: [[[127.55, 35.22], [128.88, 35.36], [129.25, 34.75], [128.1, 34.48], [127.35, 34.72], [127.55, 35.22]]] } },
    { type: "Feature", properties: { name: "부산광역시" }, geometry: { type: "Polygon", coordinates: [[[129.0, 35.28], [129.28, 35.24], [129.28, 35.02], [129.02, 34.98], [129.0, 35.28]]] } },
    { type: "Feature", properties: { name: "울산광역시" }, geometry: { type: "Polygon", coordinates: [[[129.18, 35.7], [129.48, 35.66], [129.48, 35.42], [129.18, 35.42], [129.18, 35.7]]] } },
    { type: "Feature", properties: { name: "제주특별자치도" }, geometry: { type: "Polygon", coordinates: [[[126.1, 33.62], [126.95, 33.62], [126.95, 33.22], [126.1, 33.22], [126.1, 33.62]]] } }
  ]
};

const data: RegionDatum[] = [
  { name: "서울특별시", value: 92, color: "#2f73b8", note: "Capital area" },
  { name: "경기도", value: 85, color: "#35995a", note: "Largest population" },
  { name: "강원도", value: 48, color: "#e0005c", note: "Mountain tourism" },
  { name: "충청북도", value: 52, color: "#65b946", note: "Inland region" },
  { name: "충청남도", value: 58, color: "#41b434", note: "West coast" },
  { name: "대전광역시", value: 66, color: "#2e9f68", note: "Science city" },
  { name: "경상북도", value: 69, color: "#f05a1a", note: "Heritage route" },
  { name: "대구광역시", value: 74, color: "#f36b21", note: "Metro city" },
  { name: "전라북도", value: 57, color: "#8a1194", note: "Food route" },
  { name: "전라남도", value: 63, color: "#38a6e8", note: "Island route" },
  { name: "광주광역시", value: 61, color: "#36a8ee", note: "Culture city" },
  { name: "경상남도", value: 71, color: "#55c2d6", note: "South coast" },
  { name: "부산광역시", value: 82, color: "#202b84", note: "Harbor city" },
  { name: "울산광역시", value: 67, color: "#5ecce0", note: "Industrial city" },
  { name: "제주특별자치도", value: 79, color: "#72e4ff", note: "Island destination" }
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
      labels: {
        visible: true,
        mode: "callout",
        fill: "#edf3f8",
        fontSize: 11,
        offset: 18,
        formatter: ({ label }) => label.replace("광역시", "").replace("특별시", "")
      },
      tooltip: {
        formatter: ({ label, data: item, value }) =>
          `<strong>${label}</strong><br/>score: ${value}<br/>${item?.note ?? ""}`
      }
    })
  ]
}).render();
