import { createKChart, createWorldCountryMapSeries } from "@keneth80/k-chart";
import "./style.css";

type CountryDatum = {
  name: string;
  color: string;
  score: number;
};

const countries: CountryDatum[] = [
  { name: "South Korea", color: "#ffd45a", score: 100 },
  { name: "Japan", color: "#6ee7b7", score: 86 },
  { name: "Philippines", color: "#18764b", score: 74 },
  { name: "Australia", color: "#48bfe3", score: 68 },
  { name: "United States of America", color: "#ff5a36", score: 92 },
  { name: "Canada", color: "#ff5a36", score: 66 },
  { name: "Colombia", color: "#48bfe3", score: 56 },
  { name: "United Kingdom", color: "#df185c", score: 82 },
  { name: "Netherlands", color: "#4ecfb0", score: 73 },
  { name: "Germany", color: "#57c7d4", score: 78 },
  { name: "South Africa", color: "#df185c", score: 63 }
];

const makePhoto = (label: string, color: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="#eff6ff"/>
        <stop offset="1" stop-color="${color}"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" fill="url(#sky)"/>
    <rect x="20" y="42" width="80" height="52" rx="4" fill="#f8fafc" opacity=".92"/>
    <rect x="30" y="54" width="16" height="18" fill="${color}" opacity=".82"/>
    <rect x="52" y="54" width="16" height="18" fill="${color}" opacity=".65"/>
    <rect x="74" y="54" width="16" height="18" fill="${color}" opacity=".82"/>
    <rect x="48" y="78" width="24" height="16" fill="#334155" opacity=".85"/>
    <text x="60" y="24" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#0f172a">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

createKChart<CountryDatum>({
  selector: "#chart",
  data: countries,
  width: 1180,
  height: 640,
  margin: { top: 56, right: 24, bottom: 24, left: 24 },
  title: { text: "Global branches with photo markers", align: "left", fontSize: 15 },
  grid: { visible: false },
  legend: { visible: false },
  tooltip: { visible: true },
  axes: [],
  series: [
    createWorldCountryMapSeries<CountryDatum>({
      selector: "world-photo-map",
      displayName: "Branches",
      dataKey: "name",
      valueField: "score",
      colorField: "color",
      fitPadding: 8,
      backgroundFill: "#1f7daf",
      fill: "#f8fbff",
      missingFill: "#f8fbff",
      stroke: "rgba(255, 255, 255, 0.85)",
      strokeWidth: 0.55,
      hoverStroke: "#ffffff",
      hoverStrokeWidth: 1.5,
      zoom: {
        enabled: true,
        wheel: true,
        pan: true,
        scaleExtent: [1, 6],
        controls: { visible: true, x: 10, y: 10, step: 0.3 }
      },
      bubbles: [
        { id: "kr", lat: 37.56, lon: 126.97, value: 56, color: "#ffd45a", opacity: 0.9 },
        { id: "ph", lat: 14.6, lon: 121.0, value: 46, color: "#18764b", opacity: 0.86 },
        { id: "us", lat: 39.8, lon: -98.5, value: 82, color: "#ff5a36", opacity: 0.82 },
        { id: "za", lat: -30.5, lon: 22.9, value: 72, color: "#df185c", opacity: 0.86 },
        { id: "au", lat: -25.2, lon: 133.7, value: 70, color: "#48bfe3", opacity: 0.86 },
        { id: "co", lat: 4.57, lon: -74.3, value: 52, color: "#48bfe3", opacity: 0.86 }
      ],
      markers: [
        {
          id: "netherlands",
          label: "네덜란드교회",
          lat: 52.37,
          lon: 4.9,
          color: "#4ecfb0",
          size: 66,
          imageUrl: makePhoto("NL", "#4ecfb0"),
          labelPosition: "top"
        },
        {
          id: "germany",
          label: "중부독일교회",
          lat: 50.11,
          lon: 8.68,
          color: "#57c7d4",
          size: 62,
          imageUrl: makePhoto("DE", "#57c7d4"),
          labelPosition: "right"
        },
        {
          id: "uk",
          label: "영국교회",
          lat: 51.5,
          lon: -0.12,
          color: "#df185c",
          size: 58,
          imageUrl: makePhoto("UK", "#df185c"),
          labelPosition: "left"
        },
        {
          id: "philippines",
          label: "필리핀교회",
          lat: 14.6,
          lon: 121.0,
          color: "#18764b",
          size: 60,
          imageUrl: makePhoto("PH", "#18764b"),
          labelPosition: "right"
        },
        {
          id: "australia",
          label: "호주교회",
          lat: -33.86,
          lon: 151.2,
          color: "#48bfe3",
          size: 62,
          imageUrl: makePhoto("AU", "#48bfe3"),
          labelPosition: "bottom"
        },
        {
          id: "chicago",
          label: "시카고교회",
          lat: 41.88,
          lon: -87.63,
          color: "#ff5a36",
          size: 62,
          imageUrl: makePhoto("US", "#ff5a36"),
          labelPosition: "top"
        },
        {
          id: "new-york",
          label: "뉴욕교회",
          lat: 40.71,
          lon: -74.0,
          color: "#ff5a36",
          size: 62,
          imageUrl: makePhoto("NY", "#ff5a36"),
          labelPosition: "right"
        },
        {
          id: "colombia",
          label: "콜롬비아교회",
          lat: 4.71,
          lon: -74.07,
          color: "#48bfe3",
          size: 62,
          imageUrl: makePhoto("CO", "#48bfe3"),
          labelPosition: "bottom"
        },
        {
          id: "cape-town",
          label: "케이프타운교회",
          lat: -33.92,
          lon: 18.42,
          color: "#df185c",
          size: 64,
          imageUrl: makePhoto("ZA", "#df185c"),
          labelPosition: "bottom"
        }
      ],
      tooltip: {
        formatter: ({ label, data }) => data
          ? `<strong>${label}</strong><br/>score: ${data.score}`
          : `<strong>${label}</strong><br/>No data`
      }
    })
  ]
}).render();
