"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

const GRID = 18;
const COLS = 30;
const ROWS = [0, 1, 3, 4, 5, 6, 7, 9, 10];
const STORAGE_KEY = "protohelp.project.v1";
const WIRE_COLORS = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed"];

type Part = { id: string; label: string; x: number; y: number; w: number; h: number; rotation: number; color: string };
type Wire = { id: string; from: [number, number]; to: [number, number]; color: string; points: [number, number][] };
type Project = { name: string; pitchX: number; pitchY: number; slackPercent: number; slackMm: number; parts: Part[]; wires: Wire[] };

const initialProject: Project = {
  name: "Mi primer circuito",
  pitchX: 2.54,
  pitchY: 2.54,
  slackPercent: 5,
  slackMm: 0,
  parts: [
    { id: "led-1", label: "LED", x: 11, y: 4, w: 2, h: 2, rotation: 0, color: "#ef4444" },
    { id: "r1", label: "R1 · 220 Ω", x: 16, y: 3, w: 5, h: 1, rotation: 0, color: "#d6a86e" },
  ],
  wires: [
    { id: "wire-1", from: [4, 1], to: [11, 4], color: "#ef4444", points: [[4, 1], [4, 2], [11, 2], [11, 4]] },
    { id: "wire-2", from: [13, 5], to: [19, 6], color: "#2563eb", points: [[13, 5], [15, 5], [15, 6], [19, 6]] },
  ],
};

function snap(value: number) { return Math.round(value / GRID); }
function wireLength(wire: Wire, project: Project) {
  const routeMm = wire.points.slice(1).reduce((total, point, index) => {
    const previous = wire.points[index];
    return total + Math.hypot((point[0] - previous[0]) * project.pitchX, (point[1] - previous[1]) * project.pitchY);
  }, 0);
  const exact = routeMm * (1 + project.slackPercent / 100) + project.slackMm + 16;
  return { routeMm, exact, cut: Math.ceil(exact / 2.54) * 2.54 };
}

export function ProtohelpEditor() {
  const [project, setProject] = useState<Project>(initialProject);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tool, setTool] = useState<"select" | "wire">("select");
  const [selectedId, setSelectedId] = useState("led-1");
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setProject(JSON.parse(saved)); } catch { /* keep starter */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); }, [project, ready]);

  const total = useMemo(() => project.wires.reduce((sum, wire) => sum + wireLength(wire, project).cut, 0), [project]);
  const boardX = 90, boardY = 105, boardW = (COLS + 1) * GRID, boardH = 12 * GRID;

  function movePart(event: ReactPointerEvent<SVGGElement>, part: Part) {
    if (tool !== "select") return;
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    setSelectedId(part.id);
    setDrag({ id: part.id, dx: event.clientX - box.left - (boardX + part.x * GRID) * zoom, dy: event.clientY - box.top - (boardY + part.y * GRID) * zoom });
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function dragPart(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = snap((event.clientX - box.left - drag.dx) / zoom - boardX);
    const y = snap((event.clientY - box.top - drag.dy) / zoom - boardY);
    setProject(current => ({ ...current, parts: current.parts.map(part => part.id === drag.id ? { ...part, x, y } : part) }));
  }
  function addPart() {
    const count = project.parts.length + 1;
    setProject(current => ({ ...current, parts: [...current.parts, { id: `part-${Date.now()}`, label: `Componente ${count}`, x: 8 + count, y: 6, w: 4, h: 2, rotation: 0, color: "#35b7a0" }] }));
  }
  function rotateSelected() {
    setProject(current => ({ ...current, parts: current.parts.map(part => part.id === selectedId ? { ...part, rotation: (part.rotation + 90) % 360 } : part) }));
  }
  function exportProject() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${project.name.replaceAll(" ", "-").toLowerCase()}.protohelp.json`; link.click(); URL.revokeObjectURL(link.href);
  }
  function importProject(file?: File) {
    if (!file) return;
    file.text().then(text => { try { setProject(JSON.parse(text)); } catch { window.alert("No pudimos leer este proyecto."); } });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMenuOpen(value => !value)} aria-label="Abrir menú">☰</button>
        <div className="brand"><span className="brand-mark">P</span><span>protohelp</span></div>
        <nav className={menuOpen ? "main-nav open" : "main-nav"}>
          <button onClick={() => { setProject(initialProject); setMenuOpen(false); }}>Nuevo proyecto</button>
          <button onClick={() => fileInput.current?.click()}>Importar</button>
          <button onClick={exportProject}>Exportar</button>
          <button>Bibliotecas⌄</button>
        </nav>
        <input ref={fileInput} hidden type="file" accept=".json,.protohelp.json" onChange={event => importProject(event.target.files?.[0])} />
        <div className="project-title"><span className="status-dot" />{project.name}<small>Guardado en este dispositivo</small></div>
        <button className="primary-button" onClick={exportProject}>Exportar diseño</button>
      </header>

      <section className="workspace">
        <aside className="toolrail" aria-label="Herramientas">
          <button className={tool === "select" ? "active" : ""} onClick={() => setTool("select")} title="Seleccionar">↖</button>
          <button onClick={addPart} title="Agregar componente">＋</button>
          <button className={tool === "wire" ? "active" : ""} onClick={() => setTool("wire")} title="Dibujar puente">⌁</button>
          <span />
          <button onClick={rotateSelected} title="Rotar 90 grados">↻</button>
        </aside>

        <div className="canvas-wrap">
          <div className="canvas-toolbar">
            <span>Montaje físico</span><i />
            <button onClick={() => setZoom(value => Math.max(.6, value - .1))}>−</button>
            <strong>{Math.round(zoom * 100)}%</strong>
            <button onClick={() => setZoom(value => Math.min(1.5, value + .1))}>＋</button>
          </div>
          <svg className="editor-canvas" viewBox="0 0 920 560" onPointerMove={dragPart} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
            <defs><pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#cbd1d2" /></pattern></defs>
            <rect width="920" height="560" fill="url(#grid)" />
            <g transform={`scale(${zoom})`}>
              <g className="board-layer">
                <rect x={boardX} y={boardY} width={boardW} height={boardH} rx="12" fill="#f7f3e9" stroke="#d5d0c5" strokeWidth="3" />
                <rect x={boardX + 12} y={boardY + 16} width={boardW - 24} height={GRID * 2} rx="6" fill="#e7f3f0" opacity=".75" />
                <rect x={boardX + 12} y={boardY + boardH - GRID * 2 - 16} width={boardW - 24} height={GRID * 2} rx="6" fill="#f6e6e3" opacity=".75" />
                <rect x={boardX + 10} y={boardY + GRID * 5.65} width={boardW - 20} height={GRID * .7} fill="#dedbd3" />
                {ROWS.flatMap(row => Array.from({ length: COLS }, (_, col) => {
                  const cx = boardX + GRID + col * GRID, cy = boardY + GRID + row * GRID;
                  const rail = row < 2 || row > 8;
                  return <g key={`${row}-${col}`}><circle cx={cx} cy={cy} r="5" fill={rail ? (row % 2 ? "#7fb8c7" : "#db8f88") : "#ddd9cf"} opacity=".3" /><circle cx={cx} cy={cy} r="2.3" fill="#525b5c" /></g>;
                }))}
              </g>
              <g className="component-layer">
                {project.parts.map(part => {
                  const x = boardX + part.x * GRID, y = boardY + part.y * GRID;
                  const warning = part.x < 0 || part.y < 0 || part.x + part.w >= COLS || part.y + part.h >= 12;
                  return <g key={part.id} transform={`rotate(${part.rotation} ${x + part.w * GRID / 2} ${y + part.h * GRID / 2})`} onPointerDown={event => movePart(event, part)} className="part">
                    <rect x={x} y={y} width={part.w * GRID} height={part.h * GRID} rx="5" fill={part.color} fillOpacity=".72" stroke={warning ? "#ef4444" : selectedId === part.id ? "#111" : "#5e6866"} strokeWidth={selectedId === part.id ? 2.5 : 1.5} />
                    <text x={x + part.w * GRID / 2} y={y + part.h * GRID / 2 + 4} textAnchor="middle">{part.label}</text>
                    <circle cx={x} cy={y + part.h * GRID / 2} r="4" className={warning ? "pin warning" : "pin"} /><circle cx={x + part.w * GRID} cy={y + part.h * GRID / 2} r="4" className="pin" />
                  </g>;
                })}
              </g>
              <g className="wire-layer">
                {project.wires.map(wire => <polyline key={wire.id} points={wire.points.map(p => `${boardX + p[0] * GRID},${boardY + p[1] * GRID}`).join(" ")} fill="none" stroke={wire.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />)}
              </g>
            </g>
          </svg>
          <div className="canvas-hint"><kbd>Espacio</kbd> + arrastrar para mover · Rueda para zoom</div>
        </div>

        <aside className="inspector">
          <section><div className="section-title"><span>Proyecto</span><button>•••</button></div><label>Nombre<input value={project.name} onChange={event => setProject({ ...project, name: event.target.value })} /></label><div className="field-row"><label>Pitch X<input type="number" step=".01" value={project.pitchX} onChange={event => setProject({ ...project, pitchX: +event.target.value })} /></label><label>Pitch Y<input type="number" step=".01" value={project.pitchY} onChange={event => setProject({ ...project, pitchY: +event.target.value })} /></label></div></section>
          <section><div className="section-title"><span>Capas</span><small>3 visibles</small></div>{[["▦", "Protoboards", "1 elemento"], ["◇", "Componentes", `${project.parts.length} elementos`], ["⌁", "Puentes", `${project.wires.length} elementos`]].map(item => <div className="layer-row" key={item[1]}><b>{item[0]}</b><span>{item[1]}<small>{item[2]}</small></span><em>◉</em></div>)}</section>
          <section className="wire-summary"><div className="section-title"><span>Lista de corte</span><small>{project.wires.length} cables</small></div>{project.wires.map((wire, index) => { const length = wireLength(wire, project); return <div className="wire-row" key={wire.id}><i style={{ background: wire.color }} /><span>Puente {index + 1}<small>{length.exact.toFixed(1)} mm exactos</small></span><strong>{length.cut.toFixed(2)} mm<small>{(length.cut / 25.4).toFixed(1)}″</small></strong></div>})}<div className="total-row"><span>Total para cortar</span><strong>{total.toFixed(1)} mm</strong></div></section>
        </aside>
      </section>
    </main>
  );
}
