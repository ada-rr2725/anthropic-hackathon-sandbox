import { useRef, useEffect } from 'react';

// determine marker colour based on severity thresholds
function markerColour(severity)
{
  if (severity > 60) return '#ff3355';
  if (severity >= 30) return '#ff8a3a';
  return '#ffc83a';
}

export default function TimelineChart({ timeline })
{
  const chartRef = useRef(null);
  const initialised = useRef(false);

  useEffect(() =>
  {
    const Plotly = window.Plotly;
    if (!Plotly || !chartRef.current) return;
    if (!timeline || timeline.length === 0) return;

    const periods = timeline.map((t) => t.period);
    const severities = timeline.map((t) => t.severity);
    const markerColours = timeline.map((t) => markerColour(t.severity));
    const hoverTexts = timeline.map((t) =>
      `<b>${t.period}</b><br>${t.label}<br>Severity: ${t.severity}`
    );

    // find peak severity index for vertical line annotation
    let peakIdx = 0;
    let peakVal = -Infinity;
    severities.forEach((s, i) =>
    {
      if (s > peakVal)
      {
        peakVal = s;
        peakIdx = i;
      }
    });

    const trace = {
      type: 'scatter',
      mode: 'lines+markers',
      x: periods,
      y: severities,
      fill: 'tozeroy',
      fillcolor: 'rgba(255, 138, 58, 0.15)',
      line: {
        color: '#ff8a3a',
        width: 2,
        shape: 'spline',
      },
      marker: {
        color: markerColours,
        size: 8,
        line: {
          color: '#0d1b2a',
          width: 1,
        },
      },
      hoverinfo: 'text',
      hovertext: hoverTexts,
      hoverlabel: {
        bgcolor: '#0d1b2a',
        bordercolor: '#1e3a5f',
        font: { family: 'Outfit, sans-serif', color: '#eaf0f6', size: 12 },
      },
    };

    // vertical line at peak severity point
    const shapes = [
      {
        type: 'line',
        x0: periods[peakIdx],
        x1: periods[peakIdx],
        y0: 0,
        y1: peakVal,
        line: {
          color: '#ff3355',
          width: 1.5,
          dash: 'dot',
        },
      },
    ];

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: {
        family: 'Outfit, sans-serif',
        color: '#eaf0f6',
      },
      margin: { l: 50, r: 30, t: 20, b: 80 },
      xaxis: {
        type: 'category',
        tickangle: -45,
        tickfont: { color: '#a0b4c8', size: 10 },
        gridcolor: 'rgba(255,255,255,0.05)',
      },
      yaxis: {
        range: [0, 100],
        title: {
          text: 'Impact Severity',
          font: { color: '#a0b4c8', size: 12 },
        },
        tickfont: { color: '#a0b4c8' },
        gridcolor: 'rgba(255,255,255,0.05)',
        zeroline: true,
        zerolinecolor: 'rgba(255,255,255,0.1)',
      },
      shapes: shapes,
      // annotation marking the peak
      annotations: [
        {
          x: periods[peakIdx],
          y: peakVal,
          xref: 'x',
          yref: 'y',
          text: `Peak: ${peakVal}`,
          showarrow: true,
          arrowhead: 2,
          arrowsize: 1,
          arrowcolor: '#ff3355',
          ax: 30,
          ay: -25,
          font: { color: '#ff3355', size: 10, family: 'Outfit, sans-serif' },
          bordercolor: '#ff3355',
          borderwidth: 1,
          borderpad: 3,
          bgcolor: 'rgba(13,27,42,0.8)',
        },
      ],
    };

    const config = {
      displayModeBar: false,
      responsive: true,
    };

    // use Plotly.react for efficient updates, newPlot only on first render
    if (!initialised.current)
    {
      Plotly.newPlot(chartRef.current, [trace], layout, config);
      initialised.current = true;
    }
    else
    {
      Plotly.react(chartRef.current, [trace], layout, config);
    }

    // cleanup on unmount
    return () =>
    {
      if (chartRef.current)
      {
        Plotly.purge(chartRef.current);
        initialised.current = false;
      }
    };
  }, [timeline]);

  // graceful empty state
  if (!timeline || timeline.length === 0)
  {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-sm text-gray-500">no timeline data available</span>
      </div>
    );
  }

  return <div ref={chartRef} className="w-full h-full" />;
}
