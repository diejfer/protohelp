"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

const GRID = 18;
const MAIN_ROWS = [4, 5, 6, 7, 8, 11, 12, 13, 14, 15];
const MINI_MAIN_ROWS = [0, 1, 2, 3, 4, 7, 8, 9, 10, 11];
const RAIL_ROWS = [0, 1, 18, 19];
const BOARD_HEIGHT = 21;
const MINI_BOARD_HEIGHT = 13;
const STORAGE_KEY = "protohelp.project.v2";
const OLD_STORAGE_KEY = "protohelp.project.v1";
const LIBRARY_STORAGE_KEY = "protohelp.libraries.v1";
const WIRE_COLORS = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed"];

type Point = [number, number];
type Board = { id: string; modelId: string; label: string; x: number; y: number; cols: number; railCols: number; railMargin: number; hasRails: boolean; rotation: number; color: string };
type Part = { id: string; modelId: string; label: string; x: number; y: number; w: number; h: number; bodyOffsetX: number; bodyOffsetY: number; rotation: number; color: string; pins: Point[] };
type Endpoint = { boardId: string; col: number; row: number };
type Wire = { id: string; from: Endpoint; to: Endpoint; color: string; points: Point[] };
type Project = { name: string; pitchX: number; pitchY: number; slackPercent: number; slackMm: number; boards: Board[]; parts: Part[]; wires: Wire[] };
type Selection = { kind: "board" | "part" | "wire"; id: string } | null;
type Drag = { kind: "board" | "part"; id: string; dx: number; dy: number } | { kind: "wirePoint"; id: string; index: number };
type LibraryKind = "components" | "boards";
type ExternalLibrary = { id: string; kind: LibraryKind; name: string; source: string; enabled: boolean; items: number };
type SchematicPin = { key: string; partId: string; partLabel: string; pinIndex: number; connected: boolean };
type SchematicNet = { id: string; pins: SchematicPin[] };

const BOARD_LIBRARY = [
  { id: "breadboard-830", name: "Estándar 830 puntos", cols: 63, railCols: 50, railMargin: 2, hasRails: true, color: "#f7f3e9" },
  { id: "breadboard-400", name: "Compacta 400 puntos", cols: 30, railCols: 25, railMargin: 0, hasRails: true, color: "#f7f3e9" },
  { id: "breadboard-170", name: "Mini 170 puntos · sin alimentación", cols: 17, railCols: 0, railMargin: 0, hasRails: false, color: "#f7f3e9" },
];
function boardFromModel(modelId: string, id: string, x: number, y: number): Board {
  const model = BOARD_LIBRARY.find(item => item.id === modelId) ?? BOARD_LIBRARY[0];
  return { id, modelId: model.id, label: model.name, x, y, cols: model.cols, railCols: model.railCols, railMargin: model.railMargin, hasRails: model.hasRails, rotation: 0, color: model.color };
}
const standardBoard: Board = boardFromModel("breadboard-830", "board-1", 5, 5);
const COMPONENT_LIBRARY = [
  { id: "led-5mm", name: "LED 5 mm", label: "LED", w: 2, h: 2, bodyOffsetX: 0, bodyOffsetY: 0, color: "#ef4444", pins: [[0, 1], [2, 1]] as Point[] },
  { id: "resistor-axial", name: "Resistencia axial", label: "R · 220 Ω", w: 5, h: 1, bodyOffsetX: 0, bodyOffsetY: -.5, color: "#d6a86e", pins: [[0, 0], [5, 0]] as Point[] },
  { id: "dip-8", name: "Circuito integrado DIP-8", label: "DIP-8", w: 4, h: 4, bodyOffsetX: 0, bodyOffsetY: 0, color: "#334155", pins: [[0, 0], [0, 1], [0, 2], [0, 3], [4, 0], [4, 1], [4, 2], [4, 3]] as Point[] },
  { id: "pushbutton", name: "Pulsador táctil", label: "SW", w: 3, h: 3, bodyOffsetX: 0, bodyOffsetY: 0, color: "#64748b", pins: [[0, 0], [0, 3], [3, 0], [3, 3]] as Point[] },
  { id: "capacitor", name: "Capacitor radial", label: "C", w: 2, h: 2, bodyOffsetX: 0, bodyOffsetY: 0, color: "#2563eb", pins: [[0, 1], [2, 1]] as Point[] },
];
function componentFromModel(modelId: string, id: string, x: number, y: number): Part {
  const model = COMPONENT_LIBRARY.find(item => item.id === modelId) ?? COMPONENT_LIBRARY[0];
  return { id, modelId: model.id, label: model.label, x, y, w: model.w, h: model.h, bodyOffsetX: model.bodyOffsetX, bodyOffsetY: model.bodyOffsetY, rotation: 0, color: model.color, pins: model.pins };
}
const initialProject: Project = {
  name: "Mi primer circuito", pitchX: 2.54, pitchY: 2.54, slackPercent: 5, slackMm: 0,
  boards: [standardBoard],
  parts: [
    { ...componentFromModel("led-5mm", "led-1", 16, 9), label: "LED" },
    { ...componentFromModel("resistor-axial", "r1", 21, 8), label: "R1 · 220 Ω" },
  ],
  wires: [
    { id: "wire-1", from: { boardId: "board-1", col: 3, row: 1 }, to: { boardId: "board-1", col: 10, row: 4 }, color: WIRE_COLORS[0], points: [[9, 8], [16, 8]] },
    { id: "wire-2", from: { boardId: "board-1", col: 12, row: 5 }, to: { boardId: "board-1", col: 18, row: 6 }, color: WIRE_COLORS[1], points: [[20, 11], [20, 12]] },
  ],
};

function rotatePoint(point: Point, center: Point, rotation: number): Point {
  const turns = ((rotation % 360) + 360) % 360 / 90;
  let [x, y] = point;
  for (let index = 0; index < turns; index++) [x, y] = [center[0] - (y - center[1]), center[1] + (x - center[0])];
  return [x, y];
}
function endpointPoint(project: Project, endpoint: Endpoint): Point {
  const board = project.boards.find(item => item.id === endpoint.boardId);
  if (!board) return [0, 0];
  return rotatePoint([board.x + 1 + endpoint.col, board.y + 1 + endpoint.row], [board.x + (board.cols + 1) / 2, board.y + boardHeight(board) / 2], board.rotation);
}
function boardHasRails(board: Board): boolean { return board.modelId !== "breadboard-170"; }
function boardHeight(board: Board): number { return boardHasRails(board) ? BOARD_HEIGHT : MINI_BOARD_HEIGHT; }
function mainRows(board: Board): number[] { return boardHasRails(board) ? MAIN_ROWS : MINI_MAIN_ROWS; }
function wireRoute(wire: Wire, project: Project): Point[] { return [endpointPoint(project, wire.from), ...wire.points, endpointPoint(project, wire.to)]; }
function wireLength(wire: Wire, project: Project) {
  const route = wireRoute(wire, project);
  const routeMm = route.slice(1).reduce((total, point, index) => total + Math.hypot((point[0] - route[index][0]) * project.pitchX, (point[1] - route[index][1]) * project.pitchY), 0);
  const exact = routeMm * (1 + project.slackPercent / 100) + project.slackMm + 16;
  return { exact, cut: Math.ceil(exact / 2.54) * 2.54 };
}
function railColumns(board: Board): number[] {
  const groupSize = 5;
  const groups = Math.ceil(board.railCols / groupSize);
  const internalGapSlots = board.cols - board.railCols - board.railMargin * 2;
  const gapSizes = Array.from({ length: Math.max(0, groups - 1) }, () => 1);
  let extraGaps = internalGapSlots - gapSizes.length;
  let distance = 0;
  while (extraGaps > 0 && gapSizes.length) {
    const center = (gapSizes.length - 1) / 2;
    const index = Math.max(0, Math.min(gapSizes.length - 1, Math.round(center + (distance % 2 ? -1 : 1) * Math.ceil(distance / 2))));
    gapSizes[index] += 1; extraGaps -= 1; distance += 1;
  }
  const columns: number[] = [];
  let cursor = board.railMargin;
  for (let group = 0; group < groups; group++) {
    const remaining = board.railCols - columns.length;
    for (let index = 0; index < Math.min(groupSize, remaining); index++) columns.push(cursor + index);
    cursor += Math.min(groupSize, remaining) + (gapSizes[group] ?? 0);
  }
  return columns;
}
function holeKey(endpoint: Endpoint): string { return `hole:${endpoint.boardId}:${endpoint.col}:${endpoint.row}`; }
function partPinPoint(part: Part, pin: Point): Point { return rotatePoint([part.x + pin[0], part.y + pin[1]], [part.x, part.y], part.rotation); }
function deriveSchematic(project: Project): SchematicNet[] {
  const parent = new Map<string, string>();
  const add = (key: string) => { if (!parent.has(key)) parent.set(key, key); };
  const find = (key: string): string => { const value = parent.get(key) ?? key; if (value === key) return key; const root = find(value); parent.set(key, root); return root; };
  const union = (first: string, second: string) => { add(first); add(second); const a = find(first), b = find(second); if (a !== b) parent.set(b, a); };
  const boardEndpoints = new Map<string, Endpoint[]>();

  project.boards.forEach(board => {
    const endpoints: Endpoint[] = [];
    const rows = mainRows(board);
    for (let col = 0; col < board.cols; col++) {
      const upper = rows.slice(0, 5).map(row => ({ boardId: board.id, col, row }));
      const lower = rows.slice(5).map(row => ({ boardId: board.id, col, row }));
      for (const group of [upper, lower]) { group.forEach(endpoint => { endpoints.push(endpoint); add(holeKey(endpoint)); }); for (let index = 1; index < group.length; index++) union(holeKey(group[0]), holeKey(group[index])); }
    }
    if (boardHasRails(board)) RAIL_ROWS.forEach(row => {
      const rail = railColumns(board).map(col => ({ boardId: board.id, col, row }));
      rail.forEach(endpoint => { endpoints.push(endpoint); add(holeKey(endpoint)); });
      for (let index = 1; index < rail.length; index++) union(holeKey(rail[0]), holeKey(rail[index]));
    });
    boardEndpoints.set(board.id, endpoints);
  });

  project.wires.forEach(wire => union(holeKey(wire.from), holeKey(wire.to)));
  const pinDetails = new Map<string, Omit<SchematicPin, "connected">>();
  project.parts.forEach(part => part.pins.forEach((pin, pinIndex) => {
    const pinKey = `pin:${part.id}:${pinIndex}`; add(pinKey);
    pinDetails.set(pinKey, { key: pinKey, partId: part.id, partLabel: part.label, pinIndex });
    const position = partPinPoint(part, pin);
    project.boards.forEach(board => (boardEndpoints.get(board.id) ?? []).forEach(endpoint => {
      const hole = endpointPoint(project, endpoint);
      if (Math.abs(hole[0] - position[0]) < .05 && Math.abs(hole[1] - position[1]) < .05) union(pinKey, holeKey(endpoint));
    }));
  }));

  const grouped = new Map<string, Array<Omit<SchematicPin, "connected">>>();
  pinDetails.forEach((pin, key) => { const root = find(key); grouped.set(root, [...(grouped.get(root) ?? []), pin]); });
  return [...grouped.entries()].map(([id, pins]) => ({ id, pins: pins.map(pin => ({ ...pin, connected: pins.length > 1 })) }));
}
function normalizeProject(value: Partial<Project>): Project {
  if (value.boards?.length) return { ...initialProject, ...value, boards: value.boards.map(board => {
    const model = BOARD_LIBRARY.find(item => item.id === board.modelId) ?? BOARD_LIBRARY.find(item => board.label.includes(item.cols === 63 ? "830" : "400")) ?? (board.cols <= 30 ? BOARD_LIBRARY[1] : BOARD_LIBRARY[0]);
    return { ...board, modelId: model.id, label: model.name, cols: model.cols, railCols: model.railCols, railMargin: model.railMargin, hasRails: model.hasRails };
  }), parts: (value.parts ?? []).map(part => {
    const model = COMPONENT_LIBRARY.find(item => item.id === part.modelId) ?? COMPONENT_LIBRARY.find(item => item.w === part.w && item.h === part.h) ?? COMPONENT_LIBRARY[0];
    return { ...part, modelId: model.id, bodyOffsetX: part.bodyOffsetX ?? model.bodyOffsetX, bodyOffsetY: part.bodyOffsetY ?? model.bodyOffsetY, pins: model.pins };
  }) } as Project;
  const legacyWires = (value as unknown as { wires?: Array<{ id: string; from: Point; to: Point; color: string; points: Point[] }> }).wires;
  return {
    ...initialProject,
    name: value.name ?? initialProject.name,
    pitchX: value.pitchX ?? initialProject.pitchX,
    pitchY: value.pitchY ?? initialProject.pitchY,
    slackPercent: value.slackPercent ?? initialProject.slackPercent,
    slackMm: value.slackMm ?? initialProject.slackMm,
    parts: (value.parts ?? initialProject.parts).map(part => { const model = COMPONENT_LIBRARY.find(item => item.w === part.w && item.h === part.h) ?? COMPONENT_LIBRARY[0]; return { ...part, modelId: model.id, bodyOffsetX: model.bodyOffsetX, bodyOffsetY: model.bodyOffsetY, pins: model.pins, x: part.x + 5, y: part.y + 5 }; }),
    wires: (legacyWires ?? []).map(wire => ({
      id: wire.id,
      from: { boardId: standardBoard.id, col: Math.max(0, wire.from[0] - 1), row: wire.from[1] },
      to: { boardId: standardBoard.id, col: Math.max(0, wire.to[0] - 1), row: wire.to[1] },
      color: wire.color,
      points: wire.points.slice(1, -1).map(point => [point[0] + 5, point[1] + 5]),
    })),
  };
}

export function ProtohelpEditor() {
  const [project, setProject] = useState<Project>(initialProject);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tool, setTool] = useState<"select" | "wire">("select");
  const [canvasMode, setCanvasMode] = useState<"physical" | "schematic">("physical");
  const [selection, setSelection] = useState<Selection>({ kind: "part", id: "led-1" });
  const [pendingEndpoint, setPendingEndpoint] = useState<Endpoint | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<"editor" | "libraries">(() => typeof window !== "undefined" && window.location.hash === "#bibliotecas" ? "libraries" : "editor");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(OLD_STORAGE_KEY);
    if (saved) try { setProject(normalizeProject(JSON.parse(saved))); } catch { /* use starter */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); }, [project, ready]);
  useEffect(() => {
    const onHashChange = () => setView(window.location.hash === "#bibliotecas" ? "libraries" : "editor");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const total = useMemo(() => project.wires.reduce((sum, wire) => sum + wireLength(wire, project).cut, 0), [project]);
  const schematicNets = useMemo(() => deriveSchematic(project), [project]);
  const selectedBoard = selection?.kind === "board" ? project.boards.find(item => item.id === selection.id) : undefined;
  const selectedPart = selection?.kind === "part" ? project.parts.find(item => item.id === selection.id) : undefined;
  const selectedWire = selection?.kind === "wire" ? project.wires.find(item => item.id === selection.id) : undefined;

  function worldPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
    const point = svg.createSVGPoint(); point.x = clientX; point.y = clientY;
    const local = point.matrixTransform(svg.getScreenCTM()!.inverse());
    return [local.x / zoom / GRID, local.y / zoom / GRID];
  }
  function beginMove(event: ReactPointerEvent<SVGGElement>, kind: "board" | "part", item: Board | Part) {
    if (tool !== "select") return;
    event.stopPropagation();
    const [x, y] = worldPoint(event.currentTarget.ownerSVGElement!, event.clientX, event.clientY);
    setSelection({ kind, id: item.id }); setDrag({ kind, id: item.id, dx: x - item.x, dy: y - item.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const [rawX, rawY] = worldPoint(event.currentTarget, event.clientX, event.clientY);
    if (drag.kind === "wirePoint") {
      setProject(current => ({ ...current, wires: current.wires.map(wire => wire.id === drag.id ? { ...wire, points: wire.points.map((point, index) => index === drag.index ? [Math.round(rawX), Math.round(rawY)] : point) } : wire) }));
      return;
    }
    const x = Math.round(rawX - drag.dx), y = Math.round(rawY - drag.dy);
    setProject(current => drag.kind === "board"
      ? { ...current, boards: current.boards.map(board => board.id === drag.id ? { ...board, x, y } : board) }
      : { ...current, parts: current.parts.map(part => part.id === drag.id ? { ...part, x, y } : part) });
  }
  function handleHole(event: ReactPointerEvent<SVGCircleElement>, endpoint: Endpoint) {
    if (tool !== "wire") return;
    event.stopPropagation();
    if (!pendingEndpoint) { setPendingEndpoint(endpoint); return; }
    if (pendingEndpoint.boardId === endpoint.boardId && pendingEndpoint.col === endpoint.col && pendingEndpoint.row === endpoint.row) return;
    const from = endpointPoint(project, pendingEndpoint), to = endpointPoint(project, endpoint);
    const wire: Wire = { id: `wire-${Date.now()}`, from: pendingEndpoint, to: endpoint, color: WIRE_COLORS[project.wires.length % WIRE_COLORS.length], points: [[from[0], to[1]]] };
    setProject(current => ({ ...current, wires: [...current.wires, wire] }));
    setSelection({ kind: "wire", id: wire.id }); setPendingEndpoint(null); setTool("select");
  }
  function addBoard(modelId = "breadboard-830") {
    const board = boardFromModel(modelId, `board-${Date.now()}`, 8 + project.boards.length * 3, 26);
    setProject(current => ({ ...current, boards: [...current.boards, board] })); setSelection({ kind: "board", id: board.id }); setTool("select");
  }
  function changeBoardModel(boardId: string, modelId: string) {
    const model = BOARD_LIBRARY.find(item => item.id === modelId);
    if (!model) return;
    setProject(current => ({ ...current, boards: current.boards.map(board => board.id === boardId ? { ...board, modelId: model.id, label: model.name, cols: model.cols, railCols: model.railCols, railMargin: model.railMargin, hasRails: model.hasRails, color: model.color } : board) }));
  }
  function addPart() {
    const part = componentFromModel("led-5mm", `part-${Date.now()}`, 13, 10);
    setProject(current => ({ ...current, parts: [...current.parts, part] })); setSelection({ kind: "part", id: part.id }); setTool("select");
  }
  function changePartModel(partId: string, modelId: string) {
    const model = COMPONENT_LIBRARY.find(item => item.id === modelId);
    if (!model) return;
    setProject(current => ({ ...current, parts: current.parts.map(part => part.id === partId ? { ...part, modelId: model.id, label: model.label, w: model.w, h: model.h, bodyOffsetX: model.bodyOffsetX, bodyOffsetY: model.bodyOffsetY, color: model.color, pins: model.pins } : part) }));
  }
  function rotateSelected() {
    if (!selection || selection.kind === "wire") return;
    setProject(current => selection.kind === "board"
      ? { ...current, boards: current.boards.map(board => board.id === selection.id ? { ...board, rotation: (board.rotation + 90) % 360 } : board) }
      : { ...current, parts: current.parts.map(part => part.id === selection.id ? { ...part, rotation: (part.rotation + 90) % 360 } : part) });
  }
  function removeSelected() {
    if (!selection) return;
    setProject(current => selection.kind === "board"
      ? { ...current, boards: current.boards.filter(board => board.id !== selection.id), wires: current.wires.filter(wire => wire.from.boardId !== selection.id && wire.to.boardId !== selection.id) }
      : selection.kind === "part" ? { ...current, parts: current.parts.filter(part => part.id !== selection.id) }
      : { ...current, wires: current.wires.filter(wire => wire.id !== selection.id) });
    setSelection(null);
  }
  function routeWire(id: string) {
    setProject(current => ({ ...current, wires: current.wires.map(wire => { if (wire.id !== id) return wire; const from = endpointPoint(current, wire.from), to = endpointPoint(current, wire.to); return { ...wire, points: [[from[0], to[1]]] }; }) }));
  }
  function routeAll() {
    setProject(current => ({ ...current, wires: current.wires.map(wire => { const from = endpointPoint(current, wire.from), to = endpointPoint(current, wire.to); return { ...wire, points: [[from[0], to[1]]] }; }) }));
  }
  function exportProject() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${project.name.replaceAll(" ", "-").toLowerCase()}.protohelp.json`; link.click(); URL.revokeObjectURL(link.href);
  }
  function importProject(file?: File) { if (file) file.text().then(text => { try { setProject(normalizeProject(JSON.parse(text))); setSelection(null); } catch { window.alert("No pudimos leer este proyecto."); } }); }

  if (view === "libraries") return <LibraryManager onBack={() => { window.location.hash = ""; setView("editor"); }} />;

  return <main className="app-shell">
    <header className="topbar">
      <button className="icon-button mobile-menu" onClick={() => setMenuOpen(value => !value)} aria-label="Abrir menú">☰</button>
      <div className="brand"><span className="brand-mark">P</span><span>protohelp</span></div>
      <nav className={menuOpen ? "main-nav open" : "main-nav"}>
        <button onClick={() => { setProject(initialProject); setSelection({ kind: "board", id: "board-1" }); }}>Nuevo proyecto</button>
        <button onClick={() => fileInput.current?.click()}>Importar</button><button onClick={exportProject}>Exportar</button><button onClick={() => { window.location.hash = "bibliotecas"; setView("libraries"); setMenuOpen(false); }}>Bibliotecas</button>
      </nav>
      <input ref={fileInput} hidden type="file" accept=".json,.protohelp.json" onChange={event => importProject(event.target.files?.[0])} />
      <div className="project-title"><span className="status-dot" />{project.name}<small>Guardado en este dispositivo</small></div>
      <button className="primary-button" onClick={exportProject}>Exportar diseño</button>
    </header>

    <section className="workspace">
      <aside className="toolrail" aria-label="Herramientas de edición">
        <button disabled={canvasMode === "schematic"} className={tool === "select" ? "active" : ""} onClick={() => { setTool("select"); setPendingEndpoint(null); }} title="Seleccionar y mover"><b>↖</b><small>Seleccionar</small></button>
        <button disabled={canvasMode === "schematic"} onClick={() => addBoard()} title="Agregar protoboard"><b>▦</b><small>Protoboard</small></button>
        <button disabled={canvasMode === "schematic"} onClick={addPart} title="Agregar componente"><b>◇</b><small>Componente</small></button>
        <button disabled={canvasMode === "schematic"} className={tool === "wire" ? "active" : ""} onClick={() => { setTool("wire"); setPendingEndpoint(null); }} title="Crear puente"><b>⌁</b><small>Puente</small></button>
        <span />
        <button disabled={canvasMode === "schematic"} onClick={routeAll} title="Autorutear todos"><b>⇢</b><small>Autorutear</small></button>
        <button onClick={removeSelected} disabled={!selection || canvasMode === "schematic"} title="Eliminar selección"><b>⌫</b><small>Eliminar</small></button>
      </aside>

      <div className="canvas-wrap">
        <div className="canvas-toolbar"><div className="view-switch"><button className={canvasMode === "physical" ? "active" : ""} onClick={() => setCanvasMode("physical")}>Montaje físico</button><button className={canvasMode === "schematic" ? "active" : ""} onClick={() => setCanvasMode("schematic")}>Esquemático</button></div><i /><span>{canvasMode === "physical" && tool === "wire" ? pendingEndpoint ? "Elegí el destino" : "Elegí el primer agujero" : ""}</span><button onClick={() => setZoom(value => Math.max(.5, +(value - .1).toFixed(1)))}>−</button><strong>{Math.round(zoom * 100)}%</strong><button onClick={() => setZoom(value => Math.min(1.6, +(value + .1).toFixed(1)))}>＋</button></div>
        {canvasMode === "physical" ? <svg className={tool === "wire" ? "editor-canvas wiring" : "editor-canvas"} viewBox="0 0 920 620" onPointerMove={onPointerMove} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)} onPointerDown={() => selection && setSelection(null)}>
          <defs><pattern id="grid" width={GRID * zoom} height={GRID * zoom} patternUnits="userSpaceOnUse"><circle cx={1} cy={1} r={Math.max(1, zoom)} fill="#bfc8c6" /></pattern></defs>
          <rect width="920" height="620" fill="url(#grid)" />
          <g transform={`scale(${zoom})`}>
            <g className="board-layer">{project.boards.map(board => {
              const x = board.x * GRID, y = board.y * GRID, width = (board.cols + 1) * GRID, height = boardHeight(board) * GRID;
              const railHoleColumns = railColumns(board);
              const hasRails = boardHasRails(board);
              return <g key={board.id} transform={`rotate(${board.rotation} ${x + width / 2} ${y + height / 2})`} onPointerDown={event => beginMove(event, "board", board)} className="board">
                <rect x={x} y={y} width={width} height={height} rx="12" fill={board.color} stroke={selection?.kind === "board" && selection.id === board.id ? "#0f766e" : "#d5d0c5"} strokeWidth={selection?.kind === "board" && selection.id === board.id ? 4 : 3} />
                {hasRails && [0, 18].map(row => <g key={`rails-${row}`}><rect x={x + 12} y={y + (row + .72) * GRID} width={width - 24} height={GRID * .55} rx="5" fill="#f5c7c4" opacity=".62" /><rect x={x + 12} y={y + (row + 1.72) * GRID} width={width - 24} height={GRID * .55} rx="5" fill="#bedce3" opacity=".72" /><text className="rail-label positive" x={x + 4} y={y + (row + 1.18) * GRID}>+</text><text className="rail-label negative" x={x + 4} y={y + (row + 2.18) * GRID}>−</text><text className="rail-label positive end" x={x + width - 10} y={y + (row + 1.18) * GRID}>+</text><text className="rail-label negative end" x={x + width - 10} y={y + (row + 2.18) * GRID}>−</text></g>)}
                <rect x={x + 10} y={y + GRID * (hasRails ? 9.6 : 5.6)} width={width - 20} height={GRID * 1.8} rx="4" fill="#dedbd3" />
                {mainRows(board).flatMap(row => Array.from({ length: board.cols }, (_, col) => { const cx = x + GRID + col * GRID, cy = y + GRID + row * GRID; const endpoint = { boardId: board.id, col, row }; const pending = pendingEndpoint?.boardId === board.id && pendingEndpoint.col === col && pendingEndpoint.row === row; return <g key={`main-${row}-${col}`}><circle cx={cx} cy={cy} r="6" fill="#ddd9cf" opacity=".35" /><circle className={pending ? "hole pending" : "hole"} cx={cx} cy={cy} r={pending ? 5 : 3} onPointerDown={event => handleHole(event, endpoint)} /></g>; }))}
                {hasRails && RAIL_ROWS.flatMap(row => railHoleColumns.map((col, railIndex) => { const cx = x + GRID + col * GRID, cy = y + GRID + row * GRID; const endpoint = { boardId: board.id, col, row }; const pending = pendingEndpoint?.boardId === board.id && pendingEndpoint.col === col && pendingEndpoint.row === row; const positive = row === 0 || row === 18; return <g key={`rail-${row}-${railIndex}`}><circle cx={cx} cy={cy} r="6" fill={positive ? "#db8f88" : "#7fb8c7"} opacity=".38" /><circle className={pending ? "hole pending" : "hole"} cx={cx} cy={cy} r={pending ? 5 : 3} onPointerDown={event => handleHole(event, endpoint)} /></g>; }))}
                {!hasRails && <g className="mounting-points"><circle cx={x + GRID * .65} cy={y + height / 2} r={GRID * .34} /><circle cx={x + width - GRID * .65} cy={y + height / 2} r={GRID * .34} /></g>}
              </g>;
            })}</g>
            <g className="component-layer">{project.parts.map(part => { const anchorX = part.x * GRID, anchorY = part.y * GRID, bodyX = anchorX + part.bodyOffsetX * GRID, bodyY = anchorY + part.bodyOffsetY * GRID, centerX = bodyX + part.w * GRID / 2, centerY = bodyY + part.h * GRID / 2; return <g key={part.id} transform={`rotate(${part.rotation} ${anchorX} ${anchorY})`} onPointerDown={event => beginMove(event, "part", part)} className="part"><rect x={bodyX} y={bodyY} width={part.w * GRID} height={part.h * GRID} rx="5" fill={part.color} fillOpacity=".72" stroke={selection?.kind === "part" && selection.id === part.id ? "#111" : "#5e6866"} strokeWidth={selection?.kind === "part" && selection.id === part.id ? 2.5 : 1.5} /><text x={centerX} y={centerY + 4} textAnchor="middle">{part.label}</text>{part.pins.map((pin, index) => <circle key={index} cx={anchorX + pin[0] * GRID} cy={anchorY + pin[1] * GRID} r="4" className="pin" />)}</g>; })}</g>
            <g className="wire-layer">{project.wires.map(wire => { const route = wireRoute(wire, project); const points = route.map(point => `${point[0] * GRID},${point[1] * GRID}`).join(" "); const selected = selection?.kind === "wire" && selection.id === wire.id; return <g key={wire.id}><polyline className="wire-hit" points={points} onPointerDown={event => { event.stopPropagation(); setSelection({ kind: "wire", id: wire.id }); setTool("select"); }} /><polyline className={selected ? "wire selected" : "wire"} points={points} stroke={wire.color} />{selected && wire.points.map((point, index) => <circle key={index} className="route-handle" cx={point[0] * GRID} cy={point[1] * GRID} r="6" onPointerDown={event => { event.stopPropagation(); setDrag({ kind: "wirePoint", id: wire.id, index }); }} />)}</g>; })}</g>
          </g>
        </svg> : <SchematicCanvas project={project} nets={schematicNets} zoom={zoom} />}
        <div className="canvas-hint">{canvasMode === "schematic" ? "Vista lógica derivada automáticamente del montaje físico" : tool === "wire" ? "Hacé clic en dos agujeros para crear el puente" : "Seleccioná un elemento para editarlo · Arrastrá los nodos de un puente para cambiar su recorrido"}</div>
      </div>

      <aside className="inspector">
        {canvasMode === "schematic" && <section className="schematic-summary"><div className="section-title"><span>Comprobación lógica</span><small>Actualización automática</small></div><div className="check-metrics"><div><strong>{schematicNets.filter(net => net.pins.length > 1).length}</strong><span>Redes entre componentes</span></div><div className={schematicNets.filter(net => net.pins.length === 1).length ? "has-warning" : ""}><strong>{schematicNets.filter(net => net.pins.length === 1).length}</strong><span>Pines sin conexión</span></div></div><p className="empty-copy">Las cruces rojas indican pines que no comparten una red lógica con otro componente. Corregilos desde “Montaje físico”.</p></section>}
        <section className="add-panel"><div className="section-title"><span>Agregar al diseño</span></div><div className="action-grid"><button onClick={() => addBoard()}><b>▦</b>Protoboard</button><button onClick={addPart}><b>◇</b>Componente</button><button onClick={() => { setTool("wire"); setPendingEndpoint(null); }}><b>⌁</b>Puente</button></div></section>
        <section className="selection-panel"><div className="section-title"><span>Selección</span><small>{selection ? selection.kind === "board" ? "Protoboard" : selection.kind === "part" ? "Componente" : "Puente" : "Nada seleccionado"}</small></div>
          {!selection && <p className="empty-copy">Seleccioná un elemento en el lienzo para moverlo, rotarlo o eliminarlo.</p>}
          {selectedBoard && <><label>Modelo<select value={selectedBoard.modelId} onChange={event => changeBoardModel(selectedBoard.id, event.target.value)}>{BOARD_LIBRARY.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label><div className="component-meta"><span>{selectedBoard.cols * 10 + selectedBoard.railCols * 4} puntos</span><span>{selectedBoard.cols} columnas centrales</span><span>{boardHasRails(selectedBoard) ? `4 rieles × ${selectedBoard.railCols}` : "Sin rieles de alimentación"}</span></div><div className="edit-actions"><button onClick={rotateSelected}>↻ Rotar 90°</button><button className="danger" onClick={removeSelected}>Eliminar</button></div></>}
          {selectedPart && <><label>Componente de la biblioteca<select value={selectedPart.modelId} onChange={event => changePartModel(selectedPart.id, event.target.value)}>{COMPONENT_LIBRARY.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label><label className="spaced-field">Etiqueta de esta instancia<input value={selectedPart.label} onChange={event => setProject(current => ({ ...current, parts: current.parts.map(part => part.id === selectedPart.id ? { ...part, label: event.target.value } : part) }))} /></label><div className="component-meta"><span>{selectedPart.w} × {selectedPart.h} pitches</span><span>{selectedPart.pins.length} pines</span></div><div className="edit-actions"><button onClick={rotateSelected}>↻ Rotar 90°</button><button className="danger" onClick={removeSelected}>Eliminar</button></div></>}
          {selectedWire && <><label>Color<input className="color-input" type="color" value={selectedWire.color} onChange={event => setProject(current => ({ ...current, wires: current.wires.map(wire => wire.id === selectedWire.id ? { ...wire, color: event.target.value } : wire) }))} /></label><p className="empty-copy">Arrastrá los puntos blancos del puente para ajustar el recorrido.</p><div className="edit-actions"><button onClick={() => routeWire(selectedWire.id)}>⇢ Autorutear</button><button className="danger" onClick={removeSelected}>Eliminar</button></div></>}
        </section>
        <section><div className="section-title"><span>Capas del montaje</span><small>Seleccionables</small></div><button className="layer-row" onClick={() => project.boards[0] && setSelection({ kind: "board", id: project.boards[0].id })}><b>▦</b><span>Protoboards<small>{project.boards.length} elementos</small></span></button><button className="layer-row" onClick={() => project.parts[0] && setSelection({ kind: "part", id: project.parts[0].id })}><b>◇</b><span>Componentes<small>{project.parts.length} elementos</small></span></button><button className="layer-row" onClick={() => project.wires[0] && setSelection({ kind: "wire", id: project.wires[0].id })}><b>⌁</b><span>Puentes<small>{project.wires.length} elementos</small></span></button></section>
        <section className="wire-summary"><div className="section-title"><span>Lista de corte</span><small>{project.wires.length} cables</small></div>{project.wires.map((wire, index) => { const length = wireLength(wire, project); return <button className="wire-row" key={wire.id} onClick={() => setSelection({ kind: "wire", id: wire.id })}><i style={{ background: wire.color }} /><span>Puente {index + 1}<small>{length.exact.toFixed(1)} mm exactos</small></span><strong>{length.cut.toFixed(2)} mm<small>{(length.cut / 25.4).toFixed(1)}″</small></strong></button>; })}<div className="total-row"><span>Total para cortar</span><strong>{total.toFixed(1)} mm</strong></div></section>
      </aside>
    </section>
  </main>;
}

function SchematicCanvas({ project, nets, zoom }: { project: Project; nets: SchematicNet[]; zoom: number }) {
  const boxWidth = 150, boxHeight = 82;
  const positions = new Map(project.parts.map((part, index) => [part.id, { x: 105 + (index % 3) * 255, y: 105 + Math.floor(index / 3) * 180 }]));
  const pinPosition = (pin: SchematicPin): Point => {
    const part = project.parts.find(item => item.id === pin.partId)!;
    const position = positions.get(pin.partId)!;
    const leftCount = Math.ceil(part.pins.length / 2);
    const onLeft = pin.pinIndex < leftCount;
    const sideIndex = onLeft ? pin.pinIndex : pin.pinIndex - leftCount;
    const sideTotal = onLeft ? leftCount : part.pins.length - leftCount;
    return [position.x + (onLeft ? 0 : boxWidth), position.y + (sideIndex + 1) * boxHeight / (sideTotal + 1)];
  };
  const connectedNets = nets.filter(net => net.pins.length > 1);
  const unconnectedPins = nets.filter(net => net.pins.length === 1).flatMap(net => net.pins);

  return <svg className="editor-canvas schematic-canvas" viewBox="0 0 920 620">
    <defs><pattern id="schematic-grid" width={18 * zoom} height={18 * zoom} patternUnits="userSpaceOnUse"><path d={`M ${18 * zoom} 0 L 0 0 0 ${18 * zoom}`} fill="none" stroke="#d9e1df" strokeWidth=".7" /></pattern></defs>
    <rect width="920" height="620" fill="url(#schematic-grid)" />
    <g transform={`scale(${zoom})`}>
      <text x="52" y="48" className="schematic-title">Esquema lógico del montaje</text><text x="52" y="68" className="schematic-subtitle">{project.parts.length} componentes · {connectedNets.length} redes · {unconnectedPins.length} pines sin conexión lógica</text>
      {connectedNets.map((net, index) => {
        const points = net.pins.map(pinPosition);
        const hubX = points.reduce((sum, point) => sum + point[0], 0) / points.length;
        const hubY = points.reduce((sum, point) => sum + point[1], 0) / points.length + (index % 3 - 1) * 10;
        const color = WIRE_COLORS[index % WIRE_COLORS.length];
        return <g key={net.id} className="schematic-net">{points.map((point, pinIndex) => <path key={pinIndex} d={`M ${point[0]} ${point[1]} H ${hubX} V ${hubY}`} stroke={color} />)}<circle cx={hubX} cy={hubY} r="4" fill={color} /><text x={hubX + 7} y={hubY - 7}>N{index + 1}</text></g>;
      })}
      {project.parts.map(part => {
        const position = positions.get(part.id)!;
        const partNets = nets.flatMap(net => net.pins).filter(pin => pin.partId === part.id);
        return <g key={part.id} className="schematic-part"><rect x={position.x} y={position.y} width={boxWidth} height={boxHeight} rx="8" /><text className="schematic-part-name" x={position.x + boxWidth / 2} y={position.y + boxHeight / 2 + 4} textAnchor="middle">{part.label}</text>{partNets.map(pin => { const point = pinPosition(pin); const left = point[0] === position.x; return <g key={pin.key}><circle className={pin.connected ? "schematic-pin" : "schematic-pin unconnected"} cx={point[0]} cy={point[1]} r="5" /><text className="pin-number" x={point[0] + (left ? 10 : -10)} y={point[1] - 7} textAnchor={left ? "start" : "end"}>{pin.pinIndex + 1}</text>{!pin.connected && <path className="unconnected-mark" d={`M ${point[0] + (left ? -13 : 13)} ${point[1] - 4} l 8 8 m 0 -8 l -8 8`} />}</g>; })}</g>;
      })}
      {!project.parts.length && <text x="460" y="300" textAnchor="middle" className="schematic-empty">Agregá componentes al montaje para generar el esquema.</text>}
    </g>
  </svg>;
}

function LibraryManager({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<LibraryKind>("components");
  const [url, setUrl] = useState("");
  const [libraries, setLibraries] = useState<ExternalLibrary[]>([]);
  const libraryFile = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (saved) try { setLibraries(JSON.parse(saved)); } catch { /* start empty */ }
  }, []);
  function persist(next: ExternalLibrary[]) { setLibraries(next); localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next)); }
  function addUrl() {
    const clean = url.trim();
    if (!/^https:\/\//i.test(clean)) { window.alert("Ingresá una URL pública HTTPS válida."); return; }
    const name = clean.split("/").filter(Boolean).pop()?.replace(/\.json$/i, "") || "Biblioteca externa";
    persist([...libraries, { id: `library-${Date.now()}`, kind: tab, name, source: clean, enabled: true, items: 0 }]); setUrl("");
  }
  function importLibrary(file?: File) {
    if (!file) return;
    file.text().then(text => { try { const data = JSON.parse(text); const items = Array.isArray(data) ? data.length : Array.isArray(data.items) ? data.items.length : 0; persist([...libraries, { id: `library-${Date.now()}`, kind: tab, name: data.name || file.name.replace(/\.json$/i, ""), source: file.name, enabled: true, items }]); } catch { window.alert("El archivo no contiene una biblioteca JSON válida."); } });
  }
  const external = libraries.filter(library => library.kind === tab);
  const builtInCount = tab === "components" ? COMPONENT_LIBRARY.length : BOARD_LIBRARY.length;

  return <main className="library-page">
    <header className="topbar"><button className="back-button" onClick={onBack}>← Volver al editor</button><div className="brand"><span className="brand-mark">P</span><span>protohelp</span></div><div className="library-heading">Bibliotecas</div></header>
    <div className="library-layout">
      <aside className="library-sidebar"><h2>Bibliotecas</h2><p>Administrá los elementos disponibles en todos tus proyectos.</p><button className={tab === "components" ? "active" : ""} onClick={() => setTab("components")}><b>◇</b><span>Componentes<small>{COMPONENT_LIBRARY.length} incorporados</small></span></button><button className={tab === "boards" ? "active" : ""} onClick={() => setTab("boards")}><b>▦</b><span>Protoboards<small>{BOARD_LIBRARY.length} incorporados</small></span></button></aside>
      <section className="library-content">
        <div className="library-title"><div><span className="eyebrow">Biblioteca de {tab === "components" ? "componentes" : "protoboards"}</span><h1>{tab === "components" ? "Componentes" : "Protoboards"}</h1><p>Elegí qué colecciones estarán disponibles en el editor.</p></div><button className="secondary-button" onClick={() => libraryFile.current?.click()}>Importar JSON</button><input ref={libraryFile} hidden type="file" accept=".json" onChange={event => importLibrary(event.target.files?.[0])} /></div>
        <div className="source-box"><label>Agregar biblioteca desde una URL pública HTTPS</label><div><input value={url} onChange={event => setUrl(event.target.value)} onKeyDown={event => event.key === "Enter" && addUrl()} placeholder="https://ejemplo.com/biblioteca.json" /><button onClick={addUrl}>Agregar biblioteca</button></div><small>La colección se guardará en este navegador. Solo se aceptan definiciones JSON.</small></div>
        <div className="collection-header"><h2>Colecciones instaladas</h2><span>{external.length + 1} {external.length ? "colecciones" : "colección"}</span></div>
        <article className="library-card builtin"><div className="library-icon">{tab === "components" ? "◇" : "▦"}</div><div><h3>Biblioteca estándar de Protohelp</h3><p>Incluida con la aplicación · {builtInCount} {tab === "components" ? "componentes" : "protoboards"}</p><div className="library-tags"><span>Incorporada</span><span>Versión 1.0</span></div></div><span className="enabled-pill">Activa</span></article>
        {external.map(library => <article className={library.enabled ? "library-card" : "library-card disabled"} key={library.id}><div className="library-icon">{tab === "components" ? "◇" : "▦"}</div><div><h3>{library.name}</h3><p title={library.source}>{library.source} · {library.items || "Sin verificar"} elementos</p><div className="library-tags"><span>Externa</span><span>JSON</span></div></div><div className="library-actions"><button onClick={() => persist(libraries.map(item => item.id === library.id ? { ...item, enabled: !item.enabled } : item))}>{library.enabled ? "Desactivar" : "Activar"}</button><button className="danger-link" onClick={() => persist(libraries.filter(item => item.id !== library.id))}>Eliminar</button></div></article>)}
        {!external.length && <div className="library-empty">Todavía no agregaste bibliotecas externas de {tab === "components" ? "componentes" : "protoboards"}.</div>}
      </section>
    </div>
  </main>;
}
