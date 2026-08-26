import {createKChart, createWorldCountryMapSeries} from '@keneth80/k-chart';
import './style.css';

type CountryActivity = {
  name: string;
  activity: number;
  region: string;
};

const countryActivity: CountryActivity[] = [
  {name: 'South Korea', activity: 92, region: 'Asia'},
  {name: 'Japan', activity: 84, region: 'Asia'},
  {name: 'China', activity: 78, region: 'Asia'},
  {name: 'India', activity: 71, region: 'Asia'},
  {name: 'Australia', activity: 63, region: 'Oceania'},
  {name: 'United States of America', activity: 88, region: 'North America'},
  {name: 'Canada', activity: 66, region: 'North America'},
  {name: 'Brazil', activity: 58, region: 'South America'},
  {name: 'France', activity: 73, region: 'Europe'},
  {name: 'Germany', activity: 76, region: 'Europe'},
  {name: 'United Kingdom', activity: 69, region: 'Europe'},
  {name: 'South Africa', activity: 46, region: 'Africa'}
];

createKChart<CountryActivity>({
  selector: '#chart',
  data: countryActivity,
  width: 1180,
  height: 650,
  margin: {top: 76, right: 24, bottom: 24, left: 24},
  title: {
    text: '글로벌 시장 활동 현황',
    align: 'center',
    fontSize: 18,
    fontWeight: 800
  },
  grid: {visible: false},
  legend: {visible: false},
  tooltip: {visible: true},
  axes: [],
  series: [
    createWorldCountryMapSeries<CountryActivity>({
      selector: 'world-activity-map',
      displayName: 'Market activity',
      dataKey: 'name',
      valueField: 'activity',
      colorLegend: {
        visible: true,
        title: '국가별 활동 지수',
        position: 'bottom-left',
        domain: [40, 100],
        colors: ['#315a7d', '#2f9c95', '#f2c14e', '#e05d5d'],
        labels: ['관찰', '안정', '활발', '최상'],
        width: 280
      },
      fitPadding: 34,
      backgroundFill: 'rgba(9, 15, 24, 0.72)',
      missingFill: 'rgba(112, 132, 151, 0.22)',
      stroke: 'rgba(225, 236, 246, 0.5)',
      strokeWidth: 0.55,
      hoverStroke: '#ffffff',
      hoverStrokeWidth: 1.5,
      zoom: {
        enabled: true,
        wheel: true,
        pan: true,
        scaleExtent: [1, 8],
        controls: {visible: true, x: 10, y: 12, step: 0.3}
      },
      tooltip: {
        formatter: ({label, data}) => data
          ? `<strong>${label}</strong><br/>활동 지수: ${data.activity}<br/>권역: ${data.region}`
          : `<strong>${label}</strong><br/>집계 데이터 없음`
      }
    })
  ]
}).render();
