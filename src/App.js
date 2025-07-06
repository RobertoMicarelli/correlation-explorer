import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";

// Pearson correlation
function correlation(points) {
  if (points.length < 2) return 0;
  const n = points.length;
  const meanX = points.reduce((a, p) => a + p.x, 0) / n;
  const meanY = points.reduce((a, p) => a + p.y, 0) / n;
  let num = 0,
    denomX = 0,
    denomY = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  return denomX * denomY === 0 ? 0 : num / Math.sqrt(denomX * denomY);
}

// Random linear dataset with variable correlation
const randomLinear = (slope = 0.8, noise = 1) =>
  Array.from({ length: 20 }, (_, i) => {
    const x = i + 1;
    const y = slope * x + (Math.random() - 0.5) * noise * 10 + 10;
    return { id: `${Date.now()}-${i}`, x, y };
  });

// Random linear with variable correlation (r from 0 to 1, sign for positive/negative)
function randomLinearWithCorrelation(r = 0.8, sign = 1) {
  // r in [0,1], sign = 1 (positive), -1 (negative)
  // Slope is proportional to r, noise is inversely proportional
  const slope = sign * r;
  // Noise: più r è alto, meno rumore
  const noise = 1.5 - r * 1.5 + 0.2; // noise da 1.7 (r=0) a 0.2 (r=1)
  return randomLinear(slope, noise);
}

// Anscombe quartet
const anscombe = {
  A: [
    { x: 10, y: 8.04 }, { x: 8, y: 6.95 }, { x: 13, y: 7.58 }, { x: 9, y: 8.81 }, { x: 11, y: 8.33 },
    { x: 14, y: 9.96 }, { x: 6, y: 7.24 }, { x: 4, y: 4.26 }, { x: 12, y: 10.84 }, { x: 7, y: 4.82 }, { x: 5, y: 5.68 },
  ],
  B: [
    { x: 10, y: 9.14 }, { x: 8, y: 8.14 }, { x: 13, y: 8.74 }, { x: 9, y: 8.77 }, { x: 11, y: 9.26 },
    { x: 14, y: 8.1 }, { x: 6, y: 6.13 }, { x: 4, y: 3.1 }, { x: 12, y: 9.13 }, { x: 7, y: 7.26 }, { x: 5, y: 4.74 },
  ],
  C: [
    { x: 10, y: 7.46 }, { x: 8, y: 6.77 }, { x: 13, y: 12.74 }, { x: 9, y: 7.11 }, { x: 11, y: 7.81 },
    { x: 14, y: 8.84 }, { x: 6, y: 6.08 }, { x: 4, y: 5.39 }, { x: 12, y: 8.15 }, { x: 7, y: 6.42 }, { x: 5, y: 5.73 },
  ],
  D: [
    { x: 8, y: 6.58 }, { x: 8, y: 5.76 }, { x: 8, y: 7.71 }, { x: 8, y: 8.84 }, { x: 8, y: 8.47 },
    { x: 8, y: 7.04 }, { x: 8, y: 5.25 }, { x: 19, y: 12.5 }, { x: 8, y: 5.56 }, { x: 8, y: 7.91 }, { x: 8, y: 6.89 },
  ],
};
Object.keys(anscombe).forEach((k) => {
  anscombe[k] = anscombe[k].map((p, i) => ({ ...p, id: `${k}-${i}` }));
});

const PRESET_KEYS = [
  "Lineare positiva",
  "Lineare negativa",
  "Nessuna correlazione",
  "Anscombe A",
  "Anscombe B",
  "Anscombe C",
  "Anscombe D",
];

// SVG icons
const RefreshCcw = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10M1 14.94A9 9 0 0 0 20.49 15"/></svg>
);
const MousePointerClick = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9l13 3-7.5 2.5L15 21 9 9z"/><path d="M5 12v.01"/><path d="M5 21v.01"/><path d="M9 17v.01"/><path d="M17 17v.01"/></svg>
);

// Draggable dot
function DraggableDot({ cx, cy, payload, plotRef, setPoints }) {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const handleMove = (e) => {
      if (!dragging || !plotRef.current) return;
      const rect = plotRef.current.getBoundingClientRect();
      const xVal = ((e.clientX - rect.left) / rect.width) * 20;
      const yVal = 20 - ((e.clientY - rect.top) / rect.height) * 20;
      setPoints((pts) => pts.map((p) => (p.id === payload.id ? { ...p, x: xVal, y: yVal } : p)));
    };
    const stopDrag = () => setDragging(false);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopDrag);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopDrag);
    };
  }, [dragging, plotRef, payload.id, setPoints]);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill="#3b82f6"
      pointerEvents="all"
      onPointerDown={() => setDragging(true)}
      className={dragging ? "cursor-grabbing" : "cursor-grab"}
    />
  );
}

function App() {
  // Slider state per i modelli lineari
  const [correlationValue, setCorrelationValue] = useState(0.8); // default 0.8
  const [presetKey, setPresetKey] = useState("Lineare positiva");
  const [points, setPoints] = useState(randomLinearWithCorrelation(0.8, 1));
  const plotRef = useRef(null);

  // Determina se il preset è lineare
  const isLinear =
    presetKey === "Lineare positiva" || presetKey === "Lineare negativa" || presetKey === "Nessuna correlazione";

  // Aggiorna i punti quando preset o correlationValue cambiano
  useEffect(() => {
    if (isLinear) {
      let r = correlationValue;
      let sign = 1;
      if (presetKey === "Lineare negativa") sign = -1;
      if (presetKey === "Nessuna correlazione") r = 0;
      setPoints(randomLinearWithCorrelation(r, sign));
    } else {
      setPoints(anscombe[presetKey.split(" ")[1]]);
    }
    // eslint-disable-next-line
  }, [presetKey, correlationValue]);

  const regenerate = useCallback(() => {
    if (isLinear) {
      let r = correlationValue;
      let sign = 1;
      if (presetKey === "Lineare negativa") sign = -1;
      if (presetKey === "Nessuna correlazione") r = 0;
      setPoints(randomLinearWithCorrelation(r, sign));
    } else {
      setPoints(anscombe[presetKey.split(" ")[1]]);
    }
    // eslint-disable-next-line
  }, [presetKey, correlationValue]);

  // Correlation info
  const r = correlation(points);
  const rRounded = r.toFixed(2);
  const strength =
    Math.abs(r) > 0.7 ? "forte" : Math.abs(r) > 0.3 ? "moderata" : "debole";
  const direction = r > 0 ? "positiva" : r < 0 ? "negativa" : "nessuna";

  return (
    <div className="container" style={{ maxWidth: 700, margin: "40px auto", padding: 16 }}>
      <div className="card" style={{
        background: "#fff", borderRadius: 18, boxShadow: "0 4px 24px 0 rgba(0,0,0,0.07)",
        padding: "32px 24px", marginBottom: 32
      }}>
        <div className="card-header" style={{ marginBottom: 18 }}>
          <div className="card-title" style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 8px 0" }}>
            Esploratore di Correlazione Interattivo
          </div>
        </div>
        <div className="controls" style={{
          display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 18
        }}>
          <select value={presetKey} onChange={e => setPresetKey(e.target.value)}>
            {PRESET_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          {isLinear && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={correlationValue}
                onChange={e => setCorrelationValue(Number(e.target.value))}
                style={{ width: 120 }}
              />
              <span style={{ fontSize: 14, color: "#3b82f6", minWidth: 32, textAlign: "center" }}>
                r: {correlationValue.toFixed(2)}
              </span>
            </div>
          )}
          <button onClick={regenerate} style={{
            fontSize: "1rem", padding: "6px 14px", borderRadius: 8, border: "1px solid #d1d5db",
            background: "#f3f4f6", display: "flex", alignItems: "center", gap: 6, cursor: "pointer"
          }}>
            <RefreshCcw />Rigenera dati
          </button>
          <span className="info" style={{
            fontSize: "0.97rem", color: "#6b7280", display: "flex", alignItems: "center", gap: 4
          }}>
            <MousePointerClick />Trascina i punti con il mouse!
          </span>
        </div>
        <div ref={plotRef} className="chart-area" style={{ width: "100%", height: 400, marginBottom: 18 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" domain={[0, 20]} tickCount={11} />
              <YAxis type="number" dataKey="y" domain={[0, 20]} tickCount={11} />
              <Tooltip formatter={(v) => Number(v).toFixed(2)} />
              <Scatter
                data={points}
                shape={props => (
                  <DraggableDot {...props} plotRef={plotRef} setPoints={setPoints} />
                )}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <motion.div
          key={rRounded}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="explanation"
          style={{
            background: "#f3f4f6", borderRadius: 12, padding: "18px 16px",
            boxShadow: "0 1px 4px 0 rgba(0,0,0,0.03)", marginTop: 10
          }}
        >
          <p className="text-lg" style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            r = {rRounded} ⇒ correlazione {strength} {direction}
          </p>
          <p className="text-sm" style={{ fontSize: "0.97rem", color: "#555" }}>
            Il coefficiente di correlazione misura la tendenza lineare tra X e Y, ma non rivela sempre la reale struttura dei dati. Dataset con forme differenti possono condividere lo stesso valore di r (come negli esempi di Anscombe). Trascina i punti per vedere come ogni modifica influisce su direzione e forza della correlazione.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default App; 