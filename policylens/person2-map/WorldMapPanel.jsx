import { useRef, useEffect, useState, useCallback } from "react";

// d3 and topojson loaded via CDN in index.html
const d3 = window.d3;
const topojson = window.topojson;

const WORLD_ATLAS_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// colour maps keyed to spec enums
const IMPACT_COLOUR = {
  negative: "var(--red)",
  positive: "var(--green)",
  mixed: "var(--purple)",
};

const ROUTE_COLOUR = {
  disrupted: "var(--orange)",
  redirected: "var(--blue)",
  new: "var(--green)",
  strengthened: "var(--cyan)",
};

export default function WorldMapPanel({ impactSpec })
{
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const worldDataRef = useRef(null);
  const zoomTransformRef = useRef(d3.zoomIdentity);
  const projectionRef = useRef(null);
  const mapGRef = useRef(null);
  const zoomBehaviourRef = useRef(null);

  // mouse coordinate display
  const [mouseCoords, setMouseCoords] = useState(null);

  // ------------------------------------------------------------------
  // helper: compute dimensions from container
  // ------------------------------------------------------------------
  const getDimensions = useCallback(() =>
  {
    const el = containerRef.current;
    if (!el) return { width: 960, height: 500 };
    return { width: el.clientWidth, height: el.clientHeight };
  }, []);

  // ------------------------------------------------------------------
  // helper: build / update projection to fit current dimensions
  // ------------------------------------------------------------------
  const buildProjection = useCallback((width, height) =>
  {
    const projection = d3
      .geoNaturalEarth1()
      .fitSize([width, height], { type: "Sphere" });
    projectionRef.current = projection;
    return projection;
  }, []);

  // ------------------------------------------------------------------
  // mount effect — create SVG skeleton, load world data, draw base map
  // ------------------------------------------------------------------
  useEffect(() =>
  {
    const { width, height } = getDimensions();

    // create SVG once
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // ocean gradient (radial, dark)
    const defs = svg.append("defs");

    const radialGrad = defs
      .append("radialGradient")
      .attr("id", "ocean-gradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "70%");
    radialGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#0d1a2a");
    radialGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#06090f");

    // pulsing ring animation filter
    defs.append("style").text(`
      @keyframes map-pulse-ring {
        0%   { r: 8; opacity: 0.7; }
        100% { r: 24; opacity: 0; }
      }
      .pulse-ring {
        animation: map-pulse-ring 2s ease-out infinite;
      }
    `);

    // main group that zoom transforms
    const mapG = svg.append("g").attr("class", "map-g");
    mapGRef.current = mapG;

    const projection = buildProjection(width, height);
    const path = d3.geoPath().projection(projection);

    // ocean sphere
    mapG
      .append("path")
      .datum({ type: "Sphere" })
      .attr("d", path)
      .attr("fill", "url(#ocean-gradient)")
      .attr("class", "ocean");

    // graticule
    mapG
      .append("path")
      .datum(d3.geoGraticule10())
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#1a2438")
      .attr("stroke-width", 0.3)
      .attr("stroke-opacity", 0.5)
      .attr("class", "graticule");

    // placeholder group for countries (filled after fetch)
    mapG.append("g").attr("class", "countries-g");

    // group for simulation overlay elements
    mapG.append("g").attr("class", "sim-layer");

    // idle overlay text (shown when no spec)
    svg
      .append("text")
      .attr("class", "idle-text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-2)")
      .attr("font-family", "var(--font-sans)")
      .attr("font-size", 14)
      .attr("opacity", 0.6)
      .text("Submit a policy to see impact analysis");

    // ---------------------------------------------------------------
    // zoom behaviour
    // ---------------------------------------------------------------
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) =>
      {
        zoomTransformRef.current = event.transform;
        mapG.attr("transform", event.transform);
      });

    zoomBehaviourRef.current = zoom;
    svg.call(zoom);

    // restore persisted transform
    if (zoomTransformRef.current !== d3.zoomIdentity)
    {
      svg.call(zoom.transform, zoomTransformRef.current);
    }

    // ---------------------------------------------------------------
    // mouse coordinate tracking
    // ---------------------------------------------------------------
    svg.on("mousemove", (event) =>
    {
      const [mx, my] = d3.pointer(event);
      const t = zoomTransformRef.current;
      // invert zoom then invert projection
      const inverted = projectionRef.current.invert([
        (mx - t.x) / t.k,
        (my - t.y) / t.k,
      ]);
      if (inverted && isFinite(inverted[0]) && isFinite(inverted[1]))
      {
        setMouseCoords({
          lat: inverted[1].toFixed(2),
          lon: inverted[0].toFixed(2),
        });
      }
      else
      {
        setMouseCoords(null);
      }
    });

    svg.on("mouseleave", () => setMouseCoords(null));

    // ---------------------------------------------------------------
    // fetch world topo data (once)
    // ---------------------------------------------------------------
    d3.json(WORLD_ATLAS_URL).then((world) =>
    {
      worldDataRef.current = world;
      const countries = topojson.feature(world, world.objects.countries);

      mapG
        .select(".countries-g")
        .selectAll("path")
        .data(countries.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#111c2e")
        .attr("stroke", "#1e2d42")
        .attr("stroke-width", 0.5);
    });

    // ---------------------------------------------------------------
    // resize handler
    // ---------------------------------------------------------------
    const handleResize = () =>
    {
      const { width: w, height: h } = getDimensions();

      svg.attr("width", w).attr("height", h);

      const newProjection = buildProjection(w, h);
      const newPath = d3.geoPath().projection(newProjection);

      // redraw static geometry
      mapG.select(".ocean").attr("d", newPath({ type: "Sphere" }));
      mapG.select(".graticule").attr("d", newPath(d3.geoGraticule10()));
      mapG
        .select(".countries-g")
        .selectAll("path")
        .attr("d", newPath);

      // reposition idle text
      svg
        .select(".idle-text")
        .attr("x", w / 2)
        .attr("y", h / 2);
    };

    window.addEventListener("resize", handleResize);

    return () =>
    {
      window.removeEventListener("resize", handleResize);
      // clean up svg content but keep the element
      svg.selectAll("*").remove();
      svg.on("mousemove", null).on("mouseleave", null);
    };
  }, []); // mount only

  // ------------------------------------------------------------------
  // effect: draw / clear simulation overlay when impactSpec changes
  // ------------------------------------------------------------------
  useEffect(() =>
  {
    const svg = d3.select(svgRef.current);
    const mapG = mapGRef.current;
    if (!mapG) return;

    const simLayer = mapG.select(".sim-layer");
    // clear previous simulation elements
    simLayer.selectAll("*").remove();

    // toggle idle text
    svg.select(".idle-text").attr("opacity", impactSpec ? 0 : 0.6);

    if (!impactSpec) return;

    const projection = projectionRef.current;
    if (!projection) return;

    const {
      primary_region,
      affected_regions = [],
      trade_routes = [],
    } = impactSpec;

    // ---------------------------------------------------------------
    // trade route arcs (drawn first so they sit behind markers)
    // ---------------------------------------------------------------
    trade_routes.forEach((route, i) =>
    {
      const from = projection([route.from_lon, route.from_lat]);
      const to = projection([route.to_lon, route.to_lat]);
      if (!from || !to) return;

      // quadratic bezier control point — offset perpendicular to midpoint
      const mx = (from[0] + to[0]) / 2;
      const my = (from[1] + to[1]) / 2;
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      // perpendicular offset scaled by distance
      const offset = dist * 0.25;
      const cx = mx - (dy / dist) * offset;
      const cy = my + (dx / dist) * offset;

      const pathStr = `M ${from[0]},${from[1]} Q ${cx},${cy} ${to[0]},${to[1]}`;

      const strokeWidth = 1 + route.magnitude / 30;
      const colour = ROUTE_COLOUR[route.route_type] || "var(--text-2)";

      const arc = simLayer
        .append("path")
        .attr("d", pathStr)
        .attr("fill", "none")
        .attr("stroke", colour)
        .attr("stroke-width", strokeWidth)
        .attr("stroke-opacity", 0.7)
        .attr("stroke-linecap", "round");

      // animate draw-in via stroke-dashoffset
      const totalLength = arc.node().getTotalLength();
      arc
        .attr("stroke-dasharray", totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .delay(300 + i * 250) // staggered
        .duration(1200)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

      // route tooltip on hover
      arc
        .on("mouseenter", (event) =>
        {
          showTooltip(
            event,
            `<strong>${route.from_name} → ${route.to_name}</strong><br/>` +
              `${route.commodity} &middot; ${route.route_type}<br/>` +
              `Magnitude: ${route.magnitude}%`
          );
        })
        .on("mouseleave", hideTooltip);
    });

    // ---------------------------------------------------------------
    // affected region markers
    // ---------------------------------------------------------------
    affected_regions.forEach((region, i) =>
    {
      const coords = projection([region.lon, region.lat]);
      if (!coords) return;

      const isPrimary =
        primary_region &&
        region.lat === primary_region.lat &&
        region.lon === primary_region.lon;

      const colour = IMPACT_COLOUR[region.impact_direction] || "var(--text-1)";
      const radius = 3 + region.impact_score / 10;

      if (isPrimary)
      {
        // outer pulsing ring
        simLayer
          .append("circle")
          .attr("cx", coords[0])
          .attr("cy", coords[1])
          .attr("r", 8)
          .attr("fill", "none")
          .attr("stroke", colour)
          .attr("stroke-width", 2)
          .attr("class", "pulse-ring");

        // inner solid circle
        simLayer
          .append("circle")
          .attr("cx", coords[0])
          .attr("cy", coords[1])
          .attr("r", radius + 2)
          .attr("fill", colour)
          .attr("fill-opacity", 0.9)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.6);
      }
      else
      {
        // standard affected region dot with fade-in
        simLayer
          .append("circle")
          .attr("cx", coords[0])
          .attr("cy", coords[1])
          .attr("r", 0)
          .attr("fill", colour)
          .attr("fill-opacity", 0)
          .attr("stroke", colour)
          .attr("stroke-width", 1)
          .attr("stroke-opacity", 0.4)
          .transition()
          .delay(100 + i * 120)
          .duration(500)
          .attr("r", radius)
          .attr("fill-opacity", 0.8);
      }

      // text label: country name + score%
      simLayer
        .append("text")
        .attr("x", coords[0] + radius + 4)
        .attr("y", coords[1] + 3)
        .attr("fill", "var(--text-1)")
        .attr("font-family", "var(--font-sans)")
        .attr("font-size", 9)
        .attr("pointer-events", "none")
        .attr("opacity", 0)
        .text(`${region.name} ${region.impact_score}%`)
        .transition()
        .delay(200 + i * 120)
        .duration(400)
        .attr("opacity", 0.85);

      // invisible larger hit area for tooltip
      simLayer
        .append("circle")
        .attr("cx", coords[0])
        .attr("cy", coords[1])
        .attr("r", Math.max(radius + 4, 10))
        .attr("fill", "transparent")
        .attr("cursor", "pointer")
        .on("mouseenter", (event) =>
        {
          showTooltip(
            event,
            `<strong>${region.name}</strong> (${region.country_code})<br/>` +
              `Impact: ${region.impact_score}% &middot; ${region.impact_direction}<br/>` +
              `<span style="color:var(--text-2);font-size:11px">${region.impact_summary}</span>`
          );
        })
        .on("mouseleave", hideTooltip);
    });

    // ---------------------------------------------------------------
    // primary region marker (if not already in affected_regions)
    // ---------------------------------------------------------------
    if (primary_region)
    {
      const alreadyDrawn = affected_regions.some(
        (r) => r.lat === primary_region.lat && r.lon === primary_region.lon
      );

      if (!alreadyDrawn)
      {
        const coords = projection([primary_region.lon, primary_region.lat]);
        if (coords)
        {
          // outer pulsing ring
          simLayer
            .append("circle")
            .attr("cx", coords[0])
            .attr("cy", coords[1])
            .attr("r", 8)
            .attr("fill", "none")
            .attr("stroke", "var(--purple)")
            .attr("stroke-width", 2)
            .attr("class", "pulse-ring");

          // inner solid
          simLayer
            .append("circle")
            .attr("cx", coords[0])
            .attr("cy", coords[1])
            .attr("r", 10)
            .attr("fill", "var(--purple)")
            .attr("fill-opacity", 0.85)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.5);

          // label
          simLayer
            .append("text")
            .attr("x", coords[0] + 14)
            .attr("y", coords[1] + 3)
            .attr("fill", "var(--text-0)")
            .attr("font-family", "var(--font-sans)")
            .attr("font-size", 10)
            .attr("font-weight", 600)
            .attr("pointer-events", "none")
            .text(primary_region.name);
        }
      }
    }
  }, [impactSpec]);

  // ------------------------------------------------------------------
  // tooltip helpers
  // ------------------------------------------------------------------
  const showTooltip = useCallback((event, html) =>
  {
    const tip = tooltipRef.current;
    if (!tip) return;
    tip.innerHTML = html;
    tip.style.opacity = 1;
    tip.style.pointerEvents = "none";

    // position relative to container
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let left = event.clientX - rect.left + 12;
    let top = event.clientY - rect.top - 10;

    // keep inside bounds
    const tipWidth = tip.offsetWidth;
    const tipHeight = tip.offsetHeight;
    if (left + tipWidth > rect.width - 8) left = left - tipWidth - 24;
    if (top + tipHeight > rect.height - 8) top = top - tipHeight - 8;
    if (top < 4) top = 4;

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }, []);

  const hideTooltip = useCallback(() =>
  {
    const tip = tooltipRef.current;
    if (tip) tip.style.opacity = 0;
  }, []);

  // ------------------------------------------------------------------
  // render
  // ------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[var(--bg-0)]"
    >
      {/* main SVG — d3 owns its internals */}
      <svg
        ref={svgRef}
        className="block w-full h-full"
        style={{ minHeight: 0 }}
      />

      {/* tooltip overlay */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none rounded px-3 py-2 text-xs leading-snug max-w-[260px] z-50"
        style={{
          opacity: 0,
          transition: "opacity 0.15s ease",
          background: "var(--bg-card)",
          border: "1px solid var(--border-1)",
          color: "var(--text-0)",
          fontFamily: "var(--font-sans)",
        }}
      />

      {/* coordinate readout — bottom right */}
      {mouseCoords && (
        <div
          className="absolute bottom-2 right-3 text-[10px] tabular-nums select-none mono"
          style={{
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {mouseCoords.lat}° lat, {mouseCoords.lon}° lon
        </div>
      )}
    </div>
  );
}
