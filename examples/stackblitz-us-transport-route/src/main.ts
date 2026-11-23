import maplibregl, { type Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";

type Stop = {
  id: string;
  order: number;
  name: string;
  coordinates: [number, number];
  role: "start" | "waypoint" | "transfer" | "arrival";
  detail: string;
};

type Route = {
  id: string;
  mode: "sea" | "road" | "rail" | "air";
  label: string;
  color: string;
  badge: string;
  points: [number, number][];
};

const stops: Stop[] = [
  { id: "seattle", order: 1, name: "Seattle", coordinates: [-122.3321, 47.6062], role: "start", detail: "Pacific origin terminal" },
  { id: "san-francisco", order: 2, name: "San Francisco", coordinates: [-122.4194, 37.7749], role: "waypoint", detail: "Sea-to-road transfer" },
  { id: "denver", order: 3, name: "Denver", coordinates: [-104.9903, 39.7392], role: "transfer", detail: "Road-to-rail transfer" },
  { id: "chicago", order: 4, name: "Chicago", coordinates: [-87.6298, 41.8781], role: "transfer", detail: "Rail-to-air transfer" },
  { id: "new-york", order: 5, name: "New York", coordinates: [-74.006, 40.7128], role: "arrival", detail: "East Coast destination" }
];

const routes: Route[] = [
  {
    id: "pacific-sea",
    mode: "sea",
    label: "Coastal shipping",
    color: "#22d3ee",
    badge: "SEA",
    points: [[-122.3321, 47.6062], [-125.1, 44.8], [-124.7, 41.3], [-122.4194, 37.7749]]
  },
  {
    id: "western-road",
    mode: "road",
    label: "Interstate road",
    color: "#f59e0b",
    badge: "ROAD",
    points: [[-122.4194, 37.7749], [-118.8, 38.8], [-113.5, 40.2], [-109.2, 39.5], [-104.9903, 39.7392]]
  },
  {
    id: "central-rail",
    mode: "rail",
    label: "Freight rail",
    color: "#34d399",
    badge: "RAIL",
    points: [[-104.9903, 39.7392], [-100.4, 40.1], [-95.9, 41.2], [-91.5, 41.5], [-87.6298, 41.8781]]
  },
  {
    id: "eastern-air",
    mode: "air",
    label: "Express air",
    color: "#a78bfa",
    badge: "AIR",
    points: [[-87.6298, 41.8781], [-74.006, 40.7128]]
  }
];

const stopColors: Record<Stop["role"], string> = {
  start: "#22c55e",
  waypoint: "#38bdf8",
  transfer: "#f59e0b",
  arrival: "#fb7185"
};

const lab = document.querySelector<HTMLElement>(".route-lab");
const mapContainer = document.querySelector<HTMLElement>("#map");
const overlay = document.querySelector<SVGSVGElement>("#route-overlay");
const legend = document.querySelector<HTMLElement>("#route-legend");
const callout = document.querySelector<HTMLElement>("#route-callout");
const animationToggle = document.querySelector<HTMLButtonElement>("#animation-toggle");

if (!lab || !mapContainer || !overlay || !legend || !callout || !animationToggle) {
  throw new Error("The route example container is incomplete.");
}

const svgNode = <K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] =>
  document.createElementNS("http://www.w3.org/2000/svg", name);

const projectPath = (map: Map, route: Route): string => {
  const projected = route.points.map((coordinates) => map.project(coordinates));
  if (route.mode === "air") {
    const [start, end] = projected;
    const lift = Math.min(72, Math.abs(end.x - start.x) * 0.14);
    return `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${Math.min(start.y, end.y) - lift} ${end.x} ${end.y}`;
  }
  return projected.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
};

const showStop = (stop: Stop) => {
  callout.replaceChildren();
  const number = document.createElement("i");
  number.style.backgroundColor = stopColors[stop.role];
  number.textContent = String(stop.order);
  const content = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = stop.name;
  const detail = document.createElement("span");
  detail.textContent = stop.detail;
  content.append(name, detail);
  callout.append(number, content);
};

legend.innerHTML = `<strong>Transport modes</strong>${routes.map((route) => `
  <div><i style="background:${route.color}"></i><b>${route.badge}</b><span>${route.label}</span></div>
`).join("")}`;
showStop(stops[3]);

const map = new maplibregl.Map({
  container: mapContainer,
  style: "https://tiles.openfreemap.org/styles/liberty",
  bounds: [[-127.5, 32], [-69, 51.5]],
  fitBoundsOptions: {
    padding: { top: 76, right: 72, bottom: 46, left: 64 },
    duration: 0
  },
  minZoom: 2.2,
  maxZoom: 8,
  attributionControl: { compact: true }
});

map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

const renderOverlay = () => {
  const { width, height } = mapContainer.getBoundingClientRect();
  overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
  overlay.replaceChildren();

  routes.forEach((route) => {
    const pathData = projectPath(map, route);
    const path = svgNode("path");
    path.setAttribute("d", pathData);
    path.setAttribute("class", `route-path route-path-${route.mode}`);
    path.setAttribute("stroke", route.color);
    path.setAttribute("vector-effect", "non-scaling-stroke");
    const flow = svgNode("path");
    flow.setAttribute("d", pathData);
    flow.setAttribute("class", "route-flow");
    flow.setAttribute("vector-effect", "non-scaling-stroke");
    overlay.append(path, flow);

    const middle = map.project(route.points[Math.floor(route.points.length / 2)]);
    const badge = svgNode("g");
    badge.setAttribute("class", "route-mode-badge");
    badge.setAttribute("transform", `translate(${middle.x} ${middle.y})`);
    const circle = svgNode("circle");
    circle.setAttribute("r", "20");
    circle.setAttribute("fill", route.color);
    const text = svgNode("text");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dy", "4");
    text.textContent = route.badge;
    badge.append(circle, text);
    overlay.append(badge);
  });

  stops.forEach((stop) => {
    const point = map.project(stop.coordinates);
    const marker = svgNode("g");
    marker.setAttribute("class", "route-stop");
    marker.setAttribute("transform", `translate(${point.x} ${point.y})`);
    marker.setAttribute("role", "button");
    marker.setAttribute("tabindex", "0");
    marker.setAttribute("aria-label", `${stop.order}. ${stop.name}: ${stop.detail}`);
    const pin = svgNode("path");
    pin.setAttribute("d", "M 0 18 C -5 11 -14 2 -14 -8 A 14 14 0 1 1 14 -8 C 14 2 5 11 0 18 Z");
    pin.setAttribute("fill", stopColors[stop.role]);
    const number = svgNode("text");
    number.setAttribute("text-anchor", "middle");
    number.setAttribute("dy", "-3");
    number.textContent = String(stop.order);
    const label = svgNode("text");
    label.setAttribute("class", "route-stop-label");
    label.setAttribute("x", "19");
    label.setAttribute("dy", "5");
    label.textContent = stop.name;
    marker.append(pin, number, label);
    marker.addEventListener("click", () => showStop(stop));
    marker.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showStop(stop);
      }
    });
    overlay.append(marker);
  });
};

map.on("load", renderOverlay);
map.on("move", renderOverlay);
map.on("resize", renderOverlay);
new ResizeObserver(() => {
  map.resize();
  renderOverlay();
}).observe(mapContainer);

animationToggle.addEventListener("click", () => {
  const isAnimating = lab.classList.toggle("is-route-animating");
  animationToggle.setAttribute("aria-pressed", String(isAnimating));
  const icon = animationToggle.querySelector("i");
  if (icon) {
    icon.textContent = isAnimating ? "II" : ">";
  }
});
