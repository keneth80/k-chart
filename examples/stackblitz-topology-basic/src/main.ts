import { createCustomSeries, createKChart } from '@keneth80/k-chart';
import './style.css';

type TopologyPoint = { label: string; x: number; value: number };

const topologySeries = createCustomSeries<TopologyPoint>({
  selector: 'topology',
  displayName: 'Topology',
  render({ group, plotSize }) {
    const groups = [
      { id: 'TEST_CLEAN', x: 28, y: 24, members: ['C1', 'C4', 'D1', 'D2', 'C2', 'C3'], machines: ['M16-FW-01', 'M16-FW-02'] },
      { id: 'TEST_CMP', x: 360, y: 24, members: ['D1', 'D2', 'C1', 'C2', 'C3', 'C4'], machines: ['M16-FW-02', 'M16-FW-03'] },
      { id: 'TEST_IMP', x: 310, y: plotSize.height - 140, members: ['D1', 'D2', 'C1', 'C2', 'C3', 'C4'], machines: ['M16-FW-01', 'M16-FW-03'] },
      { id: 'TEST_PHOTO', x: 650, y: plotSize.height - 140, members: ['D1', 'D2', 'C1', 'C2', 'C3', 'C4', 'C5'], machines: ['M16-FW-03', 'P3-Dummy-01', 'P3-Dummy-02'] }
    ];
    const machines = ['M16-FW-01', 'M16-FW-02', 'M16-FW-03', 'P3-Dummy-01', 'P3-Dummy-02'];
    const machinePositions = new Map<string, { x: number; y: number }>();
    const memberPositions: Array<{ id: string; group: string; machine: string; x: number; y: number }> = [];
    const machineY = plotSize.height * 0.48;

    group.selectAll('*').remove();
    group.append('rect').attr('width', plotSize.width).attr('height', plotSize.height).style('fill', '#eef1f5');
    const links = group.append('g');
    const nodes = group.append('g');
    const startX = plotSize.width / 2 - 300;
    machines.forEach((machine, index) => machinePositions.set(machine, { x: startX + index * 150, y: machineY }));

    groups.forEach((item) => {
      const width = item.members.length * 44 + 24;
      const top = item.y < machineY;
      const frame = nodes.append('g').attr('data-group', item.id).attr('transform', `translate(${item.x},${item.y})`).style('cursor', 'pointer');
      frame.append('rect').attr('class', 'frame').attr('width', width).attr('height', 110).attr('rx', 10).style('fill', '#dfe3e8').style('stroke', '#c6ccd5');
      frame.append('text').attr('x', 14).attr('y', top ? 26 : 96).style('font-weight', 900).style('fill', '#111827').text(item.id);
      item.members.forEach((member, index) => {
        const machine = item.machines[index % item.machines.length];
        const localX = 14 + index * 44;
        const localY = top ? 40 : 12;
        const node = frame.append('g').attr('data-member', `${item.id}-${member}`).style('cursor', 'pointer').attr('transform', `translate(${localX},${localY})`);
        node.append('rect').attr('width', 34).attr('height', 58).attr('rx', 7).style('fill', '#fff').style('stroke', '#c6ccd5');
        node.append('text').attr('x', 17).attr('y', 38).style('text-anchor', 'middle').style('fill', '#1f2937').text(member);
        memberPositions.push({ id: `${item.id}-${member}`, group: item.id, machine, x: item.x + localX + 17, y: item.y + localY + (top ? 58 : 0) });
      });
    });

    memberPositions.forEach((member) => {
      const machine = machinePositions.get(member.machine);
      if (!machine) return;
      links.append('path').attr('data-group', member.group).attr('data-member', member.id).attr('data-machine', member.machine)
        .attr('d', `M${member.x},${member.y} C${member.x},${(member.y + machine.y) / 2} ${machine.x},${(member.y + machine.y) / 2} ${machine.x},${machine.y}`)
        .style('fill', 'none').style('stroke', '#8c8f94').style('stroke-width', 1).style('opacity', 0.72);
    });

    machines.forEach((machine) => {
      const position = machinePositions.get(machine);
      if (!position) return;
      const node = nodes.append('g').attr('data-machine', machine).attr('transform', `translate(${position.x - 54},${position.y})`).style('cursor', 'pointer');
      node.append('rect').attr('width', 108).attr('height', 64).attr('rx', 10).style('fill', '#fff').style('stroke', '#c6ccd5');
      node.append('text').attr('x', 54).attr('y', 39).style('text-anchor', 'middle').style('font-weight', 900).style('fill', '#111827').text(machine);
    });

    const reset = () => {
      group.selectAll('path').style('opacity', 0.72).style('stroke', '#8c8f94').style('stroke-width', 1);
      group.selectAll('[data-group],[data-member],[data-machine]').style('opacity', 1);
    };
    const highlight = (attr: 'group' | 'member' | 'machine', id: string) => {
      const activeGroups = new Set<string>();
      const activeMembers = new Set<string>();
      const activeMachines = new Set<string>();
      group.selectAll<SVGPathElement, unknown>('path').style('opacity', function () {
        const active = this.getAttribute(`data-${attr}`) === id;
        if (active) {
          activeGroups.add(this.getAttribute('data-group') ?? '');
          activeMembers.add(this.getAttribute('data-member') ?? '');
          activeMachines.add(this.getAttribute('data-machine') ?? '');
        }
        return active ? 1 : 0.12;
      }).style('stroke', function () { return this.getAttribute(`data-${attr}`) === id ? '#0384fc' : '#8c8f94'; }).style('stroke-width', function () { return this.getAttribute(`data-${attr}`) === id ? 2 : 1; });
      group.selectAll<SVGGElement, unknown>('[data-group]').style('opacity', function () { return activeGroups.has(this.getAttribute('data-group') ?? '') ? 1 : 0.28; });
      group.selectAll<SVGGElement, unknown>('[data-member]').style('opacity', function () { return activeMembers.has(this.getAttribute('data-member') ?? '') ? 1 : 0.24; });
      group.selectAll<SVGGElement, unknown>('[data-machine]').style('opacity', function () { return activeMachines.has(this.getAttribute('data-machine') ?? '') ? 1 : 0.28; });
    };

    group.selectAll<SVGGElement, unknown>('[data-group]').on('mouseenter', function () { highlight('group', this.getAttribute('data-group') ?? ''); }).on('mouseleave', reset);
    group.selectAll<SVGGElement, unknown>('[data-member]').on('mouseenter', function (event) { event.stopPropagation(); highlight('member', this.getAttribute('data-member') ?? ''); }).on('mouseleave', reset);
    group.selectAll<SVGGElement, unknown>('[data-machine]').on('mouseenter', function (event) { event.stopPropagation(); highlight('machine', this.getAttribute('data-machine') ?? ''); }).on('mouseleave', reset);
  }
});

createKChart<TopologyPoint>({ selector: '#chart', data: [{ label: 'topology', x: 0, value: 0 }], width: 1320, height: 660, margin: { top: 10, right: 10, bottom: 10, left: 10 }, grid: { visible: false }, legend: { visible: false }, tooltip: { visible: false }, axes: [], series: [topologySeries] }).render();
