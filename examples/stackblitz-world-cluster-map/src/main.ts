import {createMapLibreFlatMap} from '@keneth80/k-chart-maplibre';
import type {KChartMapLibrePlace} from '@keneth80/k-chart-maplibre';
import '@keneth80/k-chart-maplibre/style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

interface OperationsPlace extends KChartMapLibrePlace {
  region: string;
}

const hubs = [
  ['Seoul', 37.5665, 126.978, 96, 'Asia Pacific'],
  ['Tokyo', 35.6762, 139.6503, 82, 'Asia Pacific'],
  ['Singapore', 1.3521, 103.8198, 64, 'Asia Pacific'],
  ['Sydney', -33.8688, 151.2093, 52, 'Asia Pacific'],
  ['Mumbai', 19.076, 72.8777, 58, 'Asia Pacific'],
  ['Dubai', 25.2048, 55.2708, 44, 'Middle East'],
  ['London', 51.5072, -0.1276, 76, 'Europe'],
  ['Berlin', 52.52, 13.405, 54, 'Europe'],
  ['Amsterdam', 52.3676, 4.9041, 38, 'Europe'],
  ['New York', 40.7128, -74.006, 88, 'North America'],
  ['Chicago', 41.8781, -87.6298, 46, 'North America'],
  ['San Francisco', 37.7749, -122.4194, 69, 'North America'],
  ['Mexico City', 19.4326, -99.1332, 42, 'Latin America'],
  ['Sao Paulo', -23.5505, -46.6333, 62, 'Latin America'],
  ['Cape Town', -33.9249, 18.4241, 35, 'Africa']
] as const;

const places: OperationsPlace[] = hubs.flatMap(
  ([city, hubLat, hubLon, count, region], hubIndex) =>
    Array.from({length: count}, (_unused, pointIndex) => {
      const angle = pointIndex * 2.3999632297 + hubIndex * 0.41;
      const distance = 0.08 + Math.sqrt(pointIndex + 1) * 0.055;
      const lat = Math.max(-85, Math.min(85, hubLat + Math.sin(angle) * distance));
      const rawLon = hubLon + Math.cos(angle) * distance * 1.35;
      const lon = ((rawLon + 180) % 360 + 360) % 360 - 180;
      return {
        id: `${city.toLowerCase().replace(/\s+/g, '-')}-${pointIndex + 1}`,
        name: `${city} signal ${pointIndex + 1}`,
        category: region,
        region,
        description: 'Aggregated operational event available for drilldown.',
        lat,
        lon
      };
    })
);

const controller = createMapLibreFlatMap<OperationsPlace>({
  container: '#map',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  initialZoom: 1.15,
  minZoom: 0.6,
  maxZoom: 12,
  cluster: true,
  clusterRadius: 58,
  markerColor: '#22d3ee',
  onPlaceClick: ({place}) => console.info('Selected place', place)
});

await controller.show({
  lat: 20,
  lon: 5,
  zoom: 1.15,
  places
});

// MapLibre repeats the same world horizontally at low zoom. This is one map,
// not two map instances. Set false when a single bounded world is preferred.
const map = controller.getMap();
map?.setRenderWorldCopies(true);
map?.setPaintProperty('kchart-maplibre-place-clusters', 'circle-color', [
  'step', ['get', 'point_count'], '#4ade80', 24, '#facc15', 64, '#fb923c'
]);
map?.setPaintProperty('kchart-maplibre-place-clusters', 'circle-radius', [
  'step', ['get', 'point_count'], 16, 24, 21, 64, 27
]);
map?.setPaintProperty('kchart-maplibre-place-cluster-count', 'text-color', '#17202a');
