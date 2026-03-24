import { useState, useEffect, useRef, useCallback } from "react";
import * as Plotly from "plotly";

const COLORS = {
  bg: "#111116",
  surface: "#1a1a22",
  border: "#2a2a35",
  text: "#e8e4df",
  textSec: "#9a9590",
  accent: "#c8a2ff",
  teal: "#64dfdf",
  positive: "#7ae6a0",
  negative: "#f07178",
  highlight: "#ffd580",
  grid: "#1f1f28",
};

const ROLES = {
  All: { midpoint: 6.5, steepness: 1.0, low: 0.28, high: 0.72, color: COLORS.accent, good: "7+" },
  ADC: { midpoint: 7.5, steepness: 1.1, low: 0.30, high: 0.73, color: COLORS.accent, good: "8+" },
  Mid: { midpoint: 7.0, steepness: 0.95, low: 0.29, high: 0.71, color: COLORS.teal, good: "7.5+" },
  Top: { midpoint: 6.5, steepness: 0.85, low: 0.28, high: 0.70, color: COLORS.highlight, good: "7+" },
  Jungle: { midpoint: 5.5, steepness: 0.7, low: 0.32, high: 0.68, color: COLORS.positive, good: "6+" },
  Support: { midpoint: 1.5, steepness: 0.4, low: 0.42, high: 0.58, color: COLORS.negative, good: "1.5+" },
};

function winRate(cs, role = "All") {
  const r = ROLES[role];
  return r.low + (r.high - r.low) / (1 + Math.exp(-r.steepness * (cs - r.midpoint)));
}

function generateCurve(role, steps = 200) {
  const xs = [];
  const ys = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 12;
    xs.push(x);
    ys.push(winRate(x, role) * 100);
  }
  return { xs, ys };
}

const fontFamily = "'DM Sans', system-ui, sans-serif";
const monoFamily = "'DM Mono', monospace";

function SliderControl({ label, value, min, max, step, onChange, suffix = "" }) {
  const pct = ((value - min) / (max - min)) * 100;
  const trackStyle = {
    background: `linear-gradient(to right, ${COLORS.accent} 0%, ${COLORS.accent} ${pct}%, ${COLORS.border} ${pct}%, ${COLORS.border} 100%)`,
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily }}>
        <span style={{ color: COLORS.text, fontSize: 15 }}>{label}</span>
        <span style={{ color: COLORS.accent, fontSize: 15, fontFamily: monoFamily, fontWeight: 600 }}>
          {typeof value === "number" ? value.toFixed(1) : value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="custom-slider"
        style={trackStyle}
      />
    </div>
  );
}

function Collapsible({ title, open, onToggle, children }) {
  return (
    <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 24 }}>
      <button
        onClick={onToggle}
        style={{
          background: "none",
          border: "none",
          color: COLORS.textSec,
          fontSize: 15,
          fontFamily,
          cursor: "pointer",
          padding: "16px 0 8px 0",
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 12, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(90deg)" : "none" }}>▸</span>
        {title}
      </button>
      {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
    </div>
  );
}

export default function App() {
  const [cs, setCs] = useState(6.0);
  const [showExplore, setShowExplore] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [selectedRole, setSelectedRole] = useState("All");
  const primaryRef = useRef(null);
  const exploreRef = useRef(null);
  const fontsLoaded = useRef(false);

  // Load fonts
  useEffect(() => {
    if (fontsLoaded.current) return;
    fontsLoaded.current = true;
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: ${COLORS.bg}; }
      .custom-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }
      .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: ${COLORS.accent};
        cursor: pointer;
        border: 3px solid ${COLORS.surface};
        box-shadow: 0 0 8px rgba(200,162,255,0.3);
      }
      .custom-slider::-moz-range-thumb {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: ${COLORS.accent};
        cursor: pointer;
        border: 3px solid ${COLORS.surface};
        box-shadow: 0 0 8px rgba(200,162,255,0.3);
      }
      .role-btn {
        border: 1px solid ${COLORS.border};
        background: ${COLORS.bg};
        color: ${COLORS.textSec};
        padding: 6px 14px;
        border-radius: 8px;
        font-family: ${fontFamily};
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .role-btn:hover { border-color: ${COLORS.accent}; color: ${COLORS.text}; }
      .role-btn.active { background: ${COLORS.accent}22; border-color: ${COLORS.accent}; color: ${COLORS.accent}; }
    `;
    document.head.appendChild(style);
  }, []);

  const wr = winRate(cs, "All") * 100;

  // Primary plot
  const renderPrimary = useCallback(() => {
    if (!primaryRef.current) return;
    const curve = generateCurve("All");
    const pointY = winRate(cs, "All") * 100;

    const traces = [
      {
        x: curve.xs,
        y: curve.ys,
        type: "scatter",
        mode: "lines",
        line: { color: COLORS.accent, width: 3, shape: "spline" },
        hoverinfo: "skip",
      },
      {
        x: [cs],
        y: [pointY],
        type: "scatter",
        mode: "markers",
        marker: { color: COLORS.highlight, size: 14, line: { color: COLORS.surface, width: 3 } },
        hoverinfo: "skip",
      },
    ];

    const layout = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: fontFamily, color: COLORS.textSec, size: 12 },
      margin: { t: 20, r: 20, b: 50, l: 55 },
      xaxis: {
        title: { text: "Minions killed per minute", font: { size: 13, color: COLORS.textSec } },
        range: [0, 12],
        dtick: 2,
        gridcolor: COLORS.grid,
        gridwidth: 1,
        zeroline: false,
        tickfont: { color: COLORS.textSec, size: 11 },
      },
      yaxis: {
        title: { text: "Win chance out of 100", font: { size: 13, color: COLORS.textSec } },
        range: [20, 80],
        dtick: 10,
        gridcolor: COLORS.grid,
        gridwidth: 1,
        zeroline: false,
        tickfont: { color: COLORS.textSec, size: 11 },
      },
      showlegend: false,
    };

    Plotly.react(primaryRef.current, traces, layout, { displayModeBar: false, responsive: true });
  }, [cs]);

  useEffect(() => { renderPrimary(); }, [renderPrimary]);

  // Explore plot
  const renderExplore = useCallback(() => {
    if (!exploreRef.current || !showExplore) return;

    const roleKeys = ["ADC", "Mid", "Top", "Jungle", "Support"];
    const traces = roleKeys.map((role) => {
      const curve = generateCurve(role);
      const isSelected = role === selectedRole || selectedRole === "All";
      return {
        x: curve.xs,
        y: curve.ys,
        type: "scatter",
        mode: "lines",
        name: role,
        line: {
          color: ROLES[role].color,
          width: isSelected ? 3 : 1.5,
          shape: "spline",
        },
        opacity: isSelected || selectedRole === "All" ? 1 : 0.25,
        hoverinfo: "skip",
      };
    });

    // Add user dot for selected role
    const dotRole = selectedRole === "All" ? "ADC" : selectedRole;
    traces.push({
      x: [cs],
      y: [winRate(cs, dotRole) * 100],
      type: "scatter",
      mode: "markers",
      marker: { color: COLORS.highlight, size: 12, line: { color: COLORS.surface, width: 2 } },
      showlegend: false,
      hoverinfo: "skip",
    });

    const layout = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: fontFamily, color: COLORS.textSec, size: 12 },
      margin: { t: 20, r: 20, b: 50, l: 55 },
      xaxis: {
        title: { text: "Minions killed per minute", font: { size: 13, color: COLORS.textSec } },
        range: [0, 12],
        dtick: 2,
        gridcolor: COLORS.grid,
        gridwidth: 1,
        zeroline: false,
        tickfont: { color: COLORS.textSec, size: 11 },
      },
      yaxis: {
        title: { text: "Win chance out of 100", font: { size: 13, color: COLORS.textSec } },
        range: [20, 80],
        dtick: 10,
        gridcolor: COLORS.grid,
        gridwidth: 1,
        zeroline: false,
        tickfont: { color: COLORS.textSec, size: 11 },
      },
      legend: {
        font: { size: 12, color: COLORS.textSec },
        bgcolor: "rgba(0,0,0,0)",
        x: 0.02,
        y: 0.98,
      },
    };

    Plotly.react(exploreRef.current, traces, layout, { displayModeBar: false, responsive: true });
  }, [cs, selectedRole, showExplore]);

  useEffect(() => { renderExplore(); }, [renderExplore]);

  const wrColor = wr >= 55 ? COLORS.positive : wr >= 50 ? COLORS.text : wr >= 45 ? COLORS.highlight : COLORS.negative;

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.bg,
      fontFamily,
      display: "flex",
      justifyContent: "center",
      padding: "32px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 600 }}>
        {/* HEADLINE */}
        <h1 style={{
          color: COLORS.text,
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}>
          Every minion you kill makes you more likely to win
        </h1>
        <p style={{ color: COLORS.textSec, fontSize: 15, marginBottom: 28, lineHeight: 1.4 }}>
          Better farming means more gold, stronger items, bigger leads.
        </p>

        {/* WIN CHANCE CALLOUT */}
        <div style={{
          background: COLORS.surface,
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 20,
          border: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "baseline",
          gap: 12,
        }}>
          <span style={{ color: COLORS.textSec, fontSize: 15 }}>Your win chance</span>
          <span style={{
            color: wrColor,
            fontSize: 40,
            fontWeight: 700,
            fontFamily: monoFamily,
            letterSpacing: "-0.03em",
            transition: "color 0.2s ease",
          }}>
            {wr.toFixed(1)}
          </span>
          <span style={{ color: COLORS.textSec, fontSize: 15 }}>out of 100</span>
        </div>

        {/* PRIMARY PLOT */}
        <div style={{
          background: COLORS.surface,
          borderRadius: 16,
          padding: "16px 12px 8px 4px",
          border: `1px solid ${COLORS.border}`,
          marginBottom: 20,
        }}>
          <div ref={primaryRef} style={{ width: "100%", height: 300 }} />
        </div>

        {/* PRIMARY SLIDER */}
        <div style={{
          background: COLORS.surface,
          borderRadius: 16,
          padding: "20px 24px",
          border: `1px solid ${COLORS.border}`,
        }}>
          <SliderControl
            label="Your farm rate"
            value={cs}
            min={0}
            max={12}
            step={0.1}
            onChange={setCs}
            suffix=" per min"
          />
        </div>

        {/* EXPLORE DEEPER */}
        <Collapsible
          title="Explore deeper — how does your role change things?"
          open={showExplore}
          onToggle={() => setShowExplore((v) => !v)}
        >
          <p style={{ color: COLORS.textSec, fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
            Not every role farms the same. An ADC lives or dies by CS. A support barely touches minions. Pick a role to see how much farming matters for it.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {Object.keys(ROLES).map((role) => (
              <button
                key={role}
                className={`role-btn ${selectedRole === role ? "active" : ""}`}
                onClick={() => setSelectedRole(role)}
              >
                {role}
              </button>
            ))}
          </div>

          <div style={{
            background: COLORS.surface,
            borderRadius: 16,
            padding: "16px 12px 8px 4px",
            border: `1px solid ${COLORS.border}`,
            marginBottom: 16,
          }}>
            <div ref={exploreRef} style={{ width: "100%", height: 280 }} />
          </div>

          {selectedRole !== "All" && (
            <div style={{
              background: `${ROLES[selectedRole].color}11`,
              border: `1px solid ${ROLES[selectedRole].color}33`,
              borderRadius: 12,
              padding: "14px 18px",
              fontSize: 14,
              color: COLORS.text,
              lineHeight: 1.5,
            }}>
              <strong style={{ color: ROLES[selectedRole].color }}>{selectedRole}</strong>
              {" — "}
              aim for <strong>{ROLES[selectedRole].good}</strong> CS per minute.
              {cs < parseFloat(ROLES[selectedRole].good) ? (
                <span style={{ color: COLORS.textSec }}> You're a bit below that right now. Practising last-hitting in the practice tool can help a lot.</span>
              ) : (
                <span style={{ color: COLORS.positive }}> You're in a good spot for this role.</span>
              )}
            </div>
          )}
        </Collapsible>

        {/* TECHNICAL DETAILS */}
        <Collapsible
          title="Technical details — how this model works"
          open={showTechnical}
          onToggle={() => setShowTechnical((v) => !v)}
        >
          <div style={{ color: COLORS.textSec, fontSize: 14, lineHeight: 1.7 }}>
            <p style={{ marginBottom: 14 }}>
              This uses a <strong style={{ color: COLORS.text }}>logistic (sigmoid) function</strong> to
              map CS/min to win probability. The logistic function is the standard model for binary
              outcomes (win or lose) driven by a continuous variable (farm rate).
            </p>

            <div style={{
              background: COLORS.bg,
              borderRadius: 12,
              padding: "16px 20px",
              fontFamily: monoFamily,
              fontSize: 13,
              color: COLORS.accent,
              marginBottom: 14,
              overflowX: "auto",
              border: `1px solid ${COLORS.border}`,
            }}>
              P(win) = L + (H − L) / (1 + e<sup>−k(x − m)</sup>)
            </div>

            <p style={{ marginBottom: 10 }}>Where:</p>
            <div style={{ paddingLeft: 16, marginBottom: 14 }}>
              <p><span style={{ color: COLORS.accent, fontFamily: monoFamily }}>x</span> = your CS per minute</p>
              <p><span style={{ color: COLORS.accent, fontFamily: monoFamily }}>m</span> = midpoint (the CS/min where win rate is 50%)</p>
              <p><span style={{ color: COLORS.accent, fontFamily: monoFamily }}>k</span> = steepness (how sharply the curve rises)</p>
              <p><span style={{ color: COLORS.accent, fontFamily: monoFamily }}>L, H</span> = floor and ceiling win rates</p>
            </div>

            <p style={{ marginBottom: 14 }}>
              Parameters are calibrated to approximate community-aggregated ranked data. Each role has
              different values reflecting how much CS matters for that position.
            </p>

            <div style={{
              background: `${COLORS.highlight}11`,
              border: `1px solid ${COLORS.highlight}33`,
              borderRadius: 12,
              padding: "14px 18px",
              fontSize: 13,
              color: COLORS.textSec,
              lineHeight: 1.6,
            }}>
              <strong style={{ color: COLORS.highlight }}>Assumptions & caveats:</strong> This is a simplified
              model. Real win rates depend on matchups, vision, objectives, team comp, and a hundred
              other things. CS/min is one of the strongest individual predictors of solo queue win rate,
              but it's not the whole picture. The parameter values are approximate, not sourced from a
              single authoritative dataset.
            </div>
          </div>
        </Collapsible>

        <div style={{ height: 48 }} />
      </div>
    </div>
  );
}
