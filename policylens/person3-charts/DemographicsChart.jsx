import { useRef, useEffect } from 'react';

// determine bar colour based on impact score thresholds
function barColour(score)
{
  if (score < -15) return '#ff3355';
  if (score > 15) return '#30d98c';
  return '#ffc83a';
}

export default function DemographicsChart({ demographics })
{
  const chartRef = useRef(null);
  const initialised = useRef(false);

  useEffect(() =>
  {
    const Plotly = window.Plotly;
    if (!Plotly || !chartRef.current) return;
    if (!demographics || demographics.length === 0) return;

    // sort by impact score, most positive at top (plotly renders bottom-up so reverse)
    const sorted = [...demographics].sort((a, b) => a.impact_score - b.impact_score);

    const groups = sorted.map((d) => d.group);
    const scores = sorted.map((d) => d.impact_score);
    const colours = sorted.map((d) => barColour(d.impact_score));
    const hoverTexts = sorted.map((d) =>
      `<b>${d.group}</b><br>Score: ${d.impact_score}<br>${d.key_effect || ''}`
    );

    const trace = {
      type: 'bar',
      orientation: 'h',
      y: groups,
      x: scores,
      marker: {
        color: colours,
      },
      hoverinfo: 'text',
      hovertext: hoverTexts,
      hoverlabel: {
        bgcolor: '#0d1b2a',
        bordercolor: '#1e3a5f',
        font: { family: 'Outfit, sans-serif', color: '#eaf0f6', size: 12 },
      },
    };

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: {
        family: 'Outfit, sans-serif',
        color: '#eaf0f6',
      },
      margin: { l: 180, r: 40, t: 20, b: 60 },
      xaxis: {
        range: [-100, 100],
        zeroline: true,
        zerolinecolor: '#eaf0f6',
        zerolinewidth: 2,
        gridcolor: 'rgba(255,255,255,0.05)',
        tickfont: { color: '#a0b4c8' },
        title: {
          text: 'Impact Score',
          font: { color: '#a0b4c8', size: 12 },
        },
      },
      yaxis: {
        automargin: true,
        tickfont: { color: '#a0b4c8', size: 11 },
      },
      // annotations for "harmed" and "benefits" labels
      annotations: [
        {
          x: -50,
          y: 1.05,
          xref: 'x',
          yref: 'paper',
          text: 'Harmed',
          showarrow: false,
          font: { color: '#ff3355', size: 13, family: 'Outfit, sans-serif' },
          xanchor: 'centre',
        },
        {
          x: 50,
          y: 1.05,
          xref: 'x',
          yref: 'paper',
          text: 'Benefits',
          showarrow: false,
          font: { color: '#30d98c', size: 13, family: 'Outfit, sans-serif' },
          xanchor: 'centre',
        },
      ],
      bargap: 0.15,
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
  }, [demographics]);

  // graceful empty state
  if (!demographics || demographics.length === 0)
  {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-sm text-gray-500">no demographics data available</span>
      </div>
    );
  }

  return <div ref={chartRef} className="w-full h-full" />;
}
