import {createKChart, createScatterSeries} from '@keneth80/k-chart';
import './style.css';

interface StudentResult {
  student: string;
  studyHours: number;
  examScore: number;
  cohort: 'Morning' | 'Evening';
}

const data: StudentResult[] = [
  {student: 'Ari', studyHours: 3.5, examScore: 61, cohort: 'Evening'},
  {student: 'Bea', studyHours: 4.2, examScore: 68, cohort: 'Morning'},
  {student: 'Chen', studyHours: 5.1, examScore: 72, cohort: 'Morning'},
  {student: 'Dara', studyHours: 5.8, examScore: 70, cohort: 'Evening'},
  {student: 'Eli', studyHours: 6.4, examScore: 79, cohort: 'Morning'},
  {student: 'Faye', studyHours: 7.1, examScore: 83, cohort: 'Evening'},
  {student: 'Gus', studyHours: 7.7, examScore: 86, cohort: 'Morning'},
  {student: 'Hana', studyHours: 8.2, examScore: 84, cohort: 'Evening'},
  {student: 'Ivan', studyHours: 8.9, examScore: 91, cohort: 'Morning'},
  {student: 'Jules', studyHours: 9.6, examScore: 94, cohort: 'Evening'},
  {student: 'Kira', studyHours: 10.4, examScore: 96, cohort: 'Morning'},
  {student: 'Leo', studyHours: 6.9, examScore: 76, cohort: 'Evening'}
];

const scatterSeries = createScatterSeries<StudentResult>({
  selector: 'study-results',
  displayName: 'Student result',
  xField: 'studyHours',
  yField: 'examScore',
  radius: 6,
  fill: (point) => point.cohort === 'Morning' ? '#38bdf8' : '#34d399',
  stroke: '#f8fafc',
  strokeWidth: 1.5,
  opacity: 0.9
});

const panel = document.querySelector<HTMLElement>('.chart-panel');
const chartHeight = 520;
const chartWidth = () => Math.max(320, Math.min(1040, (panel?.clientWidth ?? 980) - 48));

const chart = createKChart<StudentResult>({
  selector: '#chart',
  data,
  width: chartWidth(),
  height: chartHeight,
  margin: {top: 76, right: 36, bottom: 62, left: 72},
  title: {text: 'Focused study and final score', align: 'left', fontSize: 18},
  grid: {visible: true, x: true, y: true, color: 'rgba(148, 163, 184, 0.18)', dasharray: '3 8'},
  legend: {visible: false},
  tooltip: {visible: true},
  axes: [
    {field: 'studyHours', type: 'number', placement: 'bottom', min: 2, max: 12, title: 'Study hours per week'},
    {field: 'examScore', type: 'number', placement: 'left', min: 55, max: 100, title: 'Exam score'}
  ],
  series: [scatterSeries]
});

chart.render();

const resize = () => chart.resize({width: chartWidth(), height: chartHeight});
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  window.removeEventListener('resize', resize);
  chart.destroy();
});
