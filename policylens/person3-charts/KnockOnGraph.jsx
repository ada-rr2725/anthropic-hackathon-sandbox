import { useRef, useEffect, useCallback } from 'react';

// colour map for node types
const TYPE_COLOURS = {
  trigger: '#ff3355',
  economic: '#3a9eff',
  social: '#a78bfa',
  political: '#22d3ee',
  environmental: '#30d98c',
  outcome: '#ffc83a',
};

// base node radius
const BASE_RADIUS = 14;
// extra radius per incoming edge
const RADIUS_PER_EDGE = 3;

export default function KnockOnGraph({ knockonGraph })
{
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  // compute node radius based on incoming edge count
  const getNodeRadius = useCallback((nodeId, edges) =>
  {
    const incoming = edges.filter((e) => e.target === nodeId || e.target?.id === nodeId).length;
    return BASE_RADIUS + incoming * RADIUS_PER_EDGE;
  }, []);

  useEffect(() =>
  {
    const d3 = window.d3;
    if (!d3 || !containerRef.current) return;
    if (!knockonGraph || !knockonGraph.nodes || knockonGraph.nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // clean up previous render
    if (simulationRef.current)
    {
      simulationRef.current.stop();
      simulationRef.current = null;
    }
    d3.select(container).select('svg').remove();

    // deep copy so d3 mutation doesn't affect props
    const nodes = knockonGraph.nodes.map((n) => ({ ...n }));
    const edges = knockonGraph.edges.map((e) => ({ ...e }));

    // pin trigger nodes to the left, outcome nodes to the right
    nodes.forEach((n) =>
    {
      if (n.type === 'trigger')
      {
        n.fx = 100;
      }
      else if (n.type === 'outcome')
      {
        n.fx = width - 100;
      }
    });

    // create svg
    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svgRef.current = svg;

    // defs: arrowhead marker and glow filter
    const defs = svg.append('defs');

    // arrowhead marker
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#1e3a5f');

    // glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // zoom behaviour
    const zoomBehaviour = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) =>
      {
        rootGroup.attr('transform', event.transform);
      });

    svg.call(zoomBehaviour);

    // root group for zoom/pan
    const rootGroup = svg.append('g');

    // link generator for curved links
    const linkGen = d3.linkHorizontal()
      .x((d) => d.x)
      .y((d) => d.y);

    // draw edges
    const linkGroup = rootGroup.append('g').attr('class', 'links');

    const linkPaths = linkGroup.selectAll('path')
      .data(edges)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#1e3a5f')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')
      .attr('opacity', (d) => Math.max(0.2, d.strength || 0.5));

    // edge hover labels (title element)
    linkPaths.append('title')
      .text((d) => d.label || '');

    // draw nodes
    const nodeGroup = rootGroup.append('g').attr('class', 'nodes');

    const nodeGroups = nodeGroup.selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab');

    // node circles
    nodeGroups.append('circle')
      .attr('r', (d) => getNodeRadius(d.id, knockonGraph.edges))
      .attr('fill', (d) => TYPE_COLOURS[d.type] || '#8899aa')
      .attr('stroke', (d) =>
      {
        // sentiment border hint
        if (d.sentiment === 'positive') return '#30d98c';
        if (d.sentiment === 'negative') return '#ff3355';
        if (d.sentiment === 'mixed') return '#ffc83a';
        return '#445566';
      })
      .attr('stroke-width', 2)
      .attr('filter', 'url(#glow)');

    // node labels
    nodeGroups.append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => getNodeRadius(d.id, knockonGraph.edges) + 14)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '9px')
      .attr('fill', '#a0b4c8')
      .attr('pointer-events', 'none');

    // drag behaviour
    const drag = d3.drag()
      .on('start', (event, d) =>
      {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) =>
      {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) =>
      {
        if (!event.active) simulation.alphaTarget(0);
        // keep trigger and outcome nodes pinned horizontally
        if (d.type === 'trigger')
        {
          d.fx = 100;
          d.fy = null;
        }
        else if (d.type === 'outcome')
        {
          d.fx = width - 100;
          d.fy = null;
        }
        else
        {
          d.fx = null;
          d.fy = null;
        }
      });

    nodeGroups.call(drag);

    // force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id((d) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(35))
      .on('tick', () =>
      {
        // update link paths using curved horizontal links
        linkPaths.attr('d', (d) =>
        {
          return linkGen({
            source: [d.source.x, d.source.y],
            target: [d.target.x, d.target.y],
          });
        });

        // update node positions
        nodeGroups.attr('transform', (d) => `translate(${d.x},${d.y})`);
      });

    simulationRef.current = simulation;

    // cleanup
    return () =>
    {
      if (simulationRef.current)
      {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      d3.select(container).select('svg').remove();
    };
  }, [knockonGraph, getNodeRadius]);

  // graceful empty state
  if (!knockonGraph || !knockonGraph.nodes || knockonGraph.nodes.length === 0)
  {
    return (
      <div className="relative w-full h-full bg-[var(--bg-0)] flex items-center justify-center">
        <span className="text-sm text-gray-500">no knock-on data available</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[var(--bg-0)]" />
  );
}
