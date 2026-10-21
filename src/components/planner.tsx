import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  DoorOpen,
  PanelTop,
  Plug,
  Minus,
  LampCeiling,
  Bath,
  Toilet,
  Undo2,
  Redo2,
  RotateCw,
  Copy,
  Trash2,
  Download,
  Check,
  Grid2X2,
  Hash,
  MousePointer2,
  Move,
  Save,
  ChevronDown,
  Upload,
  Square,
  Table2,
  Archive,
  X,
  FlipHorizontal2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Hand,
  SlidersHorizontal,
  Layers,
  PencilRuler,
} from "lucide-react";
import { PlanSvg } from "./plan-svg";
import {
  PARTS,
  FORMATS,
  WALLS,
  WALL_LABELS,
  SNAP,
  MIN_DIMENSION,
  MAX_DIMENSION,
  blankPlan,
  createPart,
  constrainPart,
  movePart,
  rotatePart,
  resizePlan,
  getWarnings,
  parsePlan,
  commit,
  undo,
  redo,
  type Part,
  type PartKind,
  type Plan,
  type History,
  type Wall,
} from "../lib/model";
import { INITIAL_VIEW, clampView, type Viewport } from "../lib/viewport";
import { TEMPLATES, createTemplate } from "../lib/templates";
import { parseProject, serializeProject } from "../lib/project-file";
import "./planner.css";
const STORAGE_KEY = "spacesketch-plan-v1";
const icons = {
  door: DoorOpen,
  innerDoor: DoorOpen,
  window: PanelTop,
  socket: Plug,
  partition: Minus,
  basin: Bath,
  toilet: Toilet,
  light: LampCeiling,
  desk: Square,
  table: Table2,
  shelf: Archive,
};
function NumberField({
  label,
  value,
  onCommit,
  min = 0,
  max = 10000,
  disabled = false,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => number | void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label className="plan-number-field">
      <span>{label}</span>
      <div>
        <input
          key={value}
          aria-label={label}
          type="number"
          disabled={disabled}
          min={min}
          max={max}
          step={50}
          defaultValue={Math.round(value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          onBlur={(e) => {
            const n = Number(e.currentTarget.value);
            if (e.currentTarget.value !== "" && Number.isFinite(n)) {
              const sanitized = Math.min(max, Math.max(min, n));
              const actual = onCommit(sanitized);
              e.currentTarget.value = String(actual ?? sanitized);
            } else {
              e.currentTarget.value = String(value);
            }
          }}
        />
        <span>mm</span>
      </div>
    </label>
  );
}
export function Planner() {
  const [history, setHistory] = useState<History>(() => ({
    past: [],
    present: createTemplate("office"),
    future: [],
  }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [grid, setGrid] = useState(true),
    [numbers, setNumbers] = useState(true);
  const [hydrated, setHydrated] = useState(false),
    [stored, setStored] = useState(true);
  const [exporting, setExporting] = useState(false),
    [message, setMessage] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"plan" | "parts" | "details">(
    "plan",
  );
  const [view, setView] = useState<Viewport>(INITIAL_VIEW);
  const [panMode, setPanMode] = useState(false);
  const panDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    view: Viewport;
    scale: number;
  } | null>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{
    id: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    base: Plan;
    latest: Plan;
  } | null>(null);
  const plan = draft ?? history.present;
  const selected = plan.items.find((p) => p.id === selectedId);
  const warnings = getWarnings(plan);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = parsePlan(JSON.parse(raw));
        if (parsed) setHistory({ past: [], present: parsed, future: [] });
      }
    } catch {
      setStored(false);
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
      setStored(true);
    } catch {
      setStored(false);
    }
  }, [history.present, hydrated]);
  function saveProject() {
    const blob = new Blob([serializeProject(history.present)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spacesketch-project.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      "Editable project saved. Import it to continue on another browser.",
    );
  }
  async function importProject(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 128000) throw new Error();
      const restored = parseProject(await file.text());
      if (!restored) throw new Error();
      update(restored);
      setSelectedId(null);
      setView(INITIAL_VIEW);
      setPanMode(false);
      setMessage("Project imported. Undo restores your previous layout.");
    } catch {
      setMessage(
        "This file is not a valid SpaceSketch project (maximum 128 KB). Your current plan was kept.",
      );
    }
  }
  function showPanel(panel: "plan" | "parts" | "details") {
    setMobilePanel(panel);
    if (window.matchMedia("(max-width: 650px)").matches)
      workspaceRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
  }
  function setZoom(zoom: number) {
    setView(clampView(plan.length, plan.width, { zoom, x: 0, y: 0 }));
    if (zoom <= 1) setPanMode(false);
  }
  function startPan(e: PointerEvent<SVGElement>) {
    if (!panMode) {
      setSelectedId(null);
      return;
    }
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    panDrag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      view: clampView(plan.length, plan.width, view),
      scale: matrix.a,
    };
  }
  function update(next: Plan) {
    setHistory((h) => commit(h, next));
    setMessage("");
  }
  function patchPart(p: Part) {
    update({
      ...history.present,
      items: history.present.items.map((item) =>
        item.id === p.id ? constrainPart(p, history.present) : item,
      ),
    });
  }
  function property(key: "width" | "depth" | "x" | "y", value: number) {
    if (!selected) return;
    const next = constrainPart({ ...selected, [key]: value }, history.present);
    patchPart(next);
    return next[key];
  }
  function add(kind: PartKind) {
    if (plan.items.length >= 100) {
      setMessage("A project can contain up to 100 components.");
      return;
    }
    const p = createPart(kind, crypto.randomUUID(), history.present);
    update({ ...history.present, items: [...history.present.items, p] });
    setSelectedId(p.id);
    setView((v) =>
      clampView(plan.length, plan.width, {
        ...v,
        x: p.x - plan.length / 2,
        y: p.y - plan.width / 2,
      }),
    );
    setPanMode(false);
    showPanel("plan");
  }
  function remove() {
    if (!selected) return;
    update({
      ...history.present,
      items: history.present.items.filter((p) => p.id !== selected.id),
    });
    setSelectedId(null);
  }
  function duplicate() {
    if (!selected || plan.items.length >= 100) return;
    const horizontal = selected.wall === "top" || selected.wall === "bottom";
    const p = constrainPart(
      {
        ...selected,
        id: crypto.randomUUID(),
        x:
          selected.x +
          (selected.wall ? (horizontal ? selected.width + 150 : 0) : 250),
        y:
          selected.y +
          (selected.wall ? (horizontal ? 0 : selected.width + 150) : 250),
      },
      history.present,
    );
    update({ ...history.present, items: [...history.present.items, p] });
    setSelectedId(p.id);
  }
  function rotate() {
    if (selected) patchPart(rotatePart(selected, history.present));
  }
  function point(e: PointerEvent<SVGElement>) {
    const svg = svgRef.current,
      matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
  }
  function down(e: PointerEvent<SVGGElement>, part: Part) {
    if (e.button !== 0) return;
    if (panMode) {
      startPan(e);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const p = point(e);
    if (!p) return;
    setSelectedId(part.id);
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: part.id,
      pointerId: e.pointerId,
      offsetX: p.x - part.x,
      offsetY: p.y - part.y,
      base: history.present,
      latest: history.present,
    };
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    const pan = panDrag.current;
    if (pan && pan.pointerId === e.pointerId) {
      setView(
        clampView(plan.length, plan.width, {
          ...pan.view,
          x: pan.view.x - (e.clientX - pan.startX) / pan.scale,
          y: pan.view.y - (e.clientY - pan.startY) / pan.scale,
        }),
      );
      return;
    }
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = point(e);
    if (!p) return;
    const part = d.base.items.find((x) => x.id === d.id)!;
    const moved = movePart(part, p.x - d.offsetX, p.y - d.offsetY, d.base);
    d.latest = {
      ...d.base,
      items: d.base.items.map((x) => (x.id === d.id ? moved : x)),
    };
    setDraft(d.latest);
  }
  function up(e: PointerEvent<SVGSVGElement>) {
    if (panDrag.current?.pointerId === e.pointerId) {
      panDrag.current = null;
      return;
    }
    if (drag.current?.pointerId !== e.pointerId) return;
    update(drag.current.latest);
    drag.current = null;
    setDraft(null);
  }
  function cancel() {
    panDrag.current = null;
    drag.current = null;
    setDraft(null);
  }
  function partKey(e: KeyboardEvent<SVGGElement>, part: Part) {
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-SNAP, 0],
      ArrowRight: [SNAP, 0],
      ArrowUp: [0, -SNAP],
      ArrowDown: [0, SNAP],
    };
    if (offsets[e.key]) {
      e.preventDefault();
      e.stopPropagation();
      const [x, y] = offsets[e.key];
      patchPart(movePart(part, part.x + x, part.y + y, history.present));
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      update({
        ...history.present,
        items: history.present.items.filter((p) => p.id !== part.id),
      });
      setSelectedId(null);
    }
    if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      patchPart(rotatePart(part, history.present));
    }
  }
  function keyboard(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      cancel();
      setSelectedId(null);
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      setHistory((h) => (e.shiftKey ? redo(h) : undo(h)));
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      setHistory(redo);
    }
  }
  async function download() {
    if (!svgRef.current) return;
    setExporting(true);
    setMessage("");
    try {
      const { exportPlanPdf } = await import("../lib/pdf");
      await exportPlanPdf(history.present, svgRef.current);
      setMessage("Your sketch and component list have been exported.");
    } catch {
      setMessage("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }
  const summary = Object.entries(PARTS)
    .map(([kind, d]) => ({
      name: d.name,
      count: plan.items.filter((p) => p.kind === kind).length,
    }))
    .filter((x) => x.count);
  return (
    <div className="room-planner">
      <section className="plan-intro">
        <div className="wrap">
          <div>
            <p className="eyebrow">
              SPACESKETCH / 2D LAYOUT PLANNER{" "}
              <span className="prototype-chip">EARLY RELEASE</span>
            </p>
            <h1>Small spaces. Clear plans.</h1>
            <p>A room, a few building blocks, a better idea of what fits.</p>
          </div>
          <div className="plan-intro-label">
            <MousePointer2 size={15} />
            <span>
              Less guesswork.
              <br />
              More room to think.
            </span>
          </div>
        </div>
      </section>
      <div className="project-toolbar wrap">
        <label>
          STARTER LAYOUT
          <select
            aria-label="Starter layout"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                update(createTemplate(e.target.value));
                setSelectedId(null);
                setView(INITIAL_VIEW);
                setPanMode(false);
                e.target.value = "";
              }
            }}
          >
            <option value="" disabled>
              Choose a starting point…
            </option>
            {TEMPLATES.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="local-badge">
            <span /> Local-first
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              void importProject(e.currentTarget.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
          <button onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Import JSON
          </button>
          <button onClick={saveProject}>
            <Save size={16} /> Save project
          </button>
        </div>
      </div>
      <section
        className="planner-workspace"
        ref={workspaceRef}
        data-mobile-panel={mobilePanel}
        aria-label="Space planner"
      >
        <nav className="mobile-plan-tabs" aria-label="Planner panels">
          <button
            aria-pressed={mobilePanel === "plan"}
            onClick={() => showPanel("plan")}
          >
            <PencilRuler size={17} />
            Plan
          </button>
          <button
            aria-pressed={mobilePanel === "parts"}
            onClick={() => showPanel("parts")}
          >
            <Layers size={17} />
            Components
          </button>
          <button
            aria-pressed={mobilePanel === "details"}
            onClick={() => showPanel("details")}
          >
            <SlidersHorizontal size={17} />
            Details
          </button>
        </nav>
        <aside className="parts-library">
          <div className="sidebar-heading">
            <span className="plan-section-number">01</span>
            <h2>Your space</h2>
          </div>
          <label className="plan-format-label">
            Outline size
            <select
              aria-label="Room preset"
              value={
                FORMATS.find(
                  (f) => f.length === plan.length && f.width === plan.width,
                )?.id || "custom"
              }
              onChange={(e) => {
                const f = FORMATS.find((f) => f.id === e.target.value)!;
                update(resizePlan(history.present, f.length, f.width));
                setView(INITIAL_VIEW);
                setPanMode(false);
              }}
            >
              <option value="custom" disabled>
                Custom size
              </option>
              {FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <div className="dimension-fields room-size-fields">
            <NumberField
              label="Room length"
              value={plan.length}
              min={MIN_DIMENSION}
              max={MAX_DIMENSION}
              onCommit={(n) => {
                const next = resizePlan(history.present, n, plan.width);
                update(next);
                setView(INITIAL_VIEW);
                return next.length;
              }}
            />
            <NumberField
              label="Room width"
              value={plan.width}
              min={MIN_DIMENSION}
              max={MAX_DIMENSION}
              onCommit={(n) => {
                const next = resizePlan(history.present, plan.length, n);
                update(next);
                setView(INITIAL_VIEW);
                return next.width;
              }}
            />
          </div>
          <div className="plan-area">
            <span>
              {((plan.length * plan.width) / 1000000).toLocaleString("en-GB", {
                maximumFractionDigits: 2,
              })}{" "}
              m²
            </span>
            <small>Outline area</small>
          </div>
          <div className="sidebar-heading parts-heading">
            <span className="plan-section-number">02</span>
            <h2>Add components</h2>
          </div>
          <p className="library-help">Click to add. Drag to position.</p>
          <div className="parts-buttons">
            {(
              Object.entries(PARTS) as [PartKind, (typeof PARTS)[PartKind]][]
            ).map(([kind, def]) => {
              const Icon = icons[kind];
              return (
                <button
                  key={kind}
                  className="part-button"
                  onClick={() => add(kind)}
                  disabled={plan.items.length >= 100}
                  aria-label={`${def.name} — add`}
                >
                  <Icon size={20} />
                  <span>
                    <strong>{def.name}</strong>
                    <small>
                      {def.width}{" "}
                      {kind === "window" ||
                      kind === "door" ||
                      kind === "innerDoor"
                        ? "mm wide"
                        : kind === "partition"
                          ? "mm long"
                          : "mm"}
                    </small>
                  </span>
                  <span className="part-plus">+</span>
                </button>
              );
            })}
          </div>
          <p className="library-footnote">
            Illustrative components. Adjust their dimensions to explore your
            layout.
          </p>
        </aside>
        <div className="plan-center">
          <div className="mobile-plan-caption">
            <span>
              {(plan.length / 1000).toLocaleString("en-GB")} ×{" "}
              {(plan.width / 1000).toLocaleString("en-GB")} m
            </span>
            <span>{plan.items.length} Components</span>
          </div>
          <div className="drawing-toolbar">
            <div className="history-buttons">
              <button
                aria-label="Undo"
                title="Undo"
                disabled={!history.past.length}
                onClick={() => {
                  cancel();
                  setHistory(undo);
                }}
              >
                <Undo2 size={18} />
              </button>
              <button
                aria-label="Redo"
                title="Redo"
                disabled={!history.future.length}
                onClick={() => {
                  cancel();
                  setHistory(redo);
                }}
              >
                <Redo2 size={18} />
              </button>
            </div>
            <span className="drawing-title">
              TOP VIEW <span>50 mm snap grid</span>
            </span>
            <div className="drawing-options">
              <button
                aria-label="Show grid"
                aria-pressed={grid}
                title="Show grid"
                onClick={() => setGrid(!grid)}
              >
                <Grid2X2 size={17} />
              </button>
              <button
                aria-label="Show component numbers"
                aria-pressed={numbers}
                title="Show component numbers"
                onClick={() => setNumbers(!numbers)}
              >
                <Hash size={17} />
              </button>
            </div>
          </div>
          <div className="zoom-toolbar" aria-label="Canvas view">
            <button
              aria-label="Zoom out"
              disabled={view.zoom <= 1}
              onClick={() => setZoom(view.zoom - 0.25)}
            >
              <ZoomOut size={18} />
            </button>
            <span aria-live="polite">{Math.round(view.zoom * 100)} %</span>
            <button
              aria-label="Zoom in"
              disabled={view.zoom >= 2.5}
              onClick={() => setZoom(view.zoom + 0.25)}
            >
              <ZoomIn size={18} />
            </button>
            <button
              aria-label="Fit entire plan"
              onClick={() => {
                setZoom(1);
                setPanMode(false);
              }}
              title="Fit entire plan"
            >
              <Maximize size={17} />
            </button>
            <button
              aria-label="Pan canvas"
              aria-pressed={panMode}
              disabled={view.zoom <= 1}
              onClick={() => setPanMode(!panMode)}
            >
              <Hand size={17} />
              <span>Pan view</span>
            </button>
          </div>
          <div className="drawing-stage" onKeyDown={keyboard}>
            <PlanSvg
              plan={plan}
              view={view}
              panMode={panMode}
              onBackgroundDown={startPan}
              svgRef={svgRef}
              selectedId={selectedId}
              showGrid={grid}
              showNumbers={numbers}
              onPartDown={down}
              onMove={move}
              onUp={up}
              onCancel={cancel}
              onSelect={setSelectedId}
              onPartKey={partKey}
            />
            <div className="drawing-stage-hint">
              <Move size={13} />
              <span>Drag to move · Arrow keys: 50 mm · R: rotate</span>
            </div>
          </div>
          {selected && (
            <div className="mobile-selection-bar">
              <span>
                {plan.items.indexOf(selected) + 1}. {PARTS[selected.kind].name}
              </span>
              <button onClick={() => showPanel("details")}>
                <SlidersHorizontal size={17} />
                Edit
              </button>
              <button aria-label="Rotate selected component" onClick={rotate}>
                <RotateCw size={18} />
              </button>
              <button aria-label="Delete selected component" onClick={remove}>
                <Trash2 size={18} />
              </button>
            </div>
          )}
          <div className="drawing-status">
            <span>
              <span className="status-dot" />
              {plan.items.length} Components
            </span>
            <span>
              <Save size={12} />
              {!hydrated
                ? "Loading your plan…"
                : stored
                  ? "Saved in this browser"
                  : "Browser save unavailable"}
            </span>
          </div>
          <div className="plan-actions">
            <label className="plan-project-name">
              <span>PROJECT NAME</span>
              <input
                key={history.present.title}
                aria-label="Project name"
                maxLength={100}
                defaultValue={history.present.title}
                onBlur={(e) =>
                  update({
                    ...history.present,
                    title: e.target.value.trim() || "Untitled space",
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
            </label>
            <div>
              <button
                className="button button-outline"
                onClick={() => {
                  update(blankPlan());
                  setSelectedId(null);
                }}
              >
                Start empty
              </button>
              <button
                className="button button-blue"
                onClick={download}
                disabled={exporting}
              >
                <Download size={17} />
                {exporting ? "Creating PDF…" : "Export PDF"}
              </button>
            </div>
          </div>
          {message && (
            <p className="planner-message" role="status">
              {message}
            </p>
          )}
          <div className="plan-notice">
            <span className="notice-icon">i</span>
            <p>
              A concept sketch, not a construction drawing. Symbols and wall
              thickness are illustrative. Verify dimensions and installation
              requirements before real-world use.
            </p>
          </div>
        </div>
        <aside className="part-inspector">
          <div className="sidebar-heading">
            <span className="plan-section-number">03</span>
            <h2>Details & position</h2>
          </div>
          <label className="plan-format-label part-picker-label">
            Select a component
            <select
              aria-label="Select a component"
              value={selected?.id || ""}
              onChange={(e) => {
                const part = plan.items.find((p) => p.id === e.target.value);
                setSelectedId(part?.id || null);
                if (part)
                  setView((v) =>
                    clampView(plan.length, plan.width, {
                      ...v,
                      x: part.x - plan.length / 2,
                      y: part.y - plan.width / 2,
                    }),
                  );
              }}
            >
              <option value="">Select a component…</option>
              {plan.items.map((p, i) => (
                <option key={p.id} value={p.id}>
                  {i + 1}. {PARTS[p.kind].name}
                </option>
              ))}
            </select>
          </label>
          {selected ? (
            <>
              <div className="selected-part-heading">
                <span className="selected-number">
                  {plan.items.indexOf(selected) + 1}
                </span>
                <div>
                  <h3>{PARTS[selected.kind].name}</h3>
                  <span>{PARTS[selected.kind].category}</span>
                </div>
                <button
                  className="deselect-button"
                  aria-label="Clear selection"
                  onClick={() => setSelectedId(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="inspector-tool-row">
                <button
                  onClick={rotate}
                  title={selected.wall ? "Move to next wall" : "Rotate 90°"}
                >
                  <RotateCw size={17} />
                  <span>{selected.wall ? "Change wall" : "Rotate"}</span>
                </button>
                <button
                  onClick={duplicate}
                  disabled={plan.items.length >= 100}
                  title="Duplicate component"
                >
                  <Copy size={17} />
                  <span>Duplicate</span>
                </button>
                <button onClick={remove} title="Delete component">
                  <Trash2 size={17} />
                  <span>Delete</span>
                </button>
              </div>
              {selected.wall && (
                <label className="plan-format-label">
                  Boundary wall
                  <select
                    aria-label="Boundary wall"
                    value={selected.wall}
                    onChange={(e) =>
                      patchPart({ ...selected, wall: e.target.value as Wall })
                    }
                  >
                    {WALLS.map((w) => (
                      <option key={w} value={w}>
                        {WALL_LABELS[w]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="dimension-fields">
                <NumberField
                  label={selected.kind === "partition" ? "Length" : "Width"}
                  value={selected.width}
                  min={100}
                  max={
                    selected.wall
                      ? (selected.wall === "top" || selected.wall === "bottom"
                          ? plan.length
                          : plan.width) - 100
                      : plan.length - 100
                  }
                  onCommit={(n) => property("width", n)}
                />
                {!selected.wall &&
                  selected.kind !== "innerDoor" &&
                  selected.kind !== "light" && (
                    <NumberField
                      label="Depth"
                      value={selected.depth}
                      min={50}
                      max={plan.width - 100}
                      onCommit={(n) => property("depth", n)}
                    />
                  )}
              </div>
              <p className="property-group-label">POSITION FROM TOP LEFT</p>
              <div className="dimension-fields">
                <NumberField
                  label="X position"
                  disabled={
                    selected.wall === "left" || selected.wall === "right"
                  }
                  value={selected.x}
                  max={plan.length}
                  onCommit={(n) => property("x", n)}
                />
                <NumberField
                  label="Y position"
                  disabled={
                    selected.wall === "top" || selected.wall === "bottom"
                  }
                  value={selected.y}
                  max={plan.width}
                  onCommit={(n) => property("y", n)}
                />
              </div>
              {(selected.kind === "door" || selected.kind === "innerDoor") && (
                <button
                  className="hinge-button"
                  onClick={() =>
                    patchPart({ ...selected, flipped: !selected.flipped })
                  }
                >
                  <FlipHorizontal2 size={16} /> Flip door hinge
                </button>
              )}
              <p className="inspector-note">
                {selected.wall
                  ? "Snaps to the nearest boundary wall while dragging."
                  : "Move and rotate this component anywhere inside the space."}
              </p>
            </>
          ) : (
            <div className="no-part-selected">
              <MousePointer2 size={30} />
              <h3>A little more detail.</h3>
              <p>Select a component to adjust its dimensions and position.</p>
            </div>
          )}
          <div className="plan-summary">
            <h3>
              Component list <span>{plan.items.length}</span>
            </h3>
            {summary.length ? (
              <ul>
                {summary.map((x) => (
                  <li key={x.name}>
                    <span>{x.name}</span>
                    <strong>{x.count}×</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No components yet.</p>
            )}
          </div>
          {warnings.length > 0 && (
            <div className="plan-warnings">
              <h3>Layout notes</h3>
              {warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
        </aside>
      </section>
      <div className="planner-bottom wrap">
        <span>
          <Check size={14} />
          Sketch locally. Save your project. Share a PDF.
        </span>
        <button
          onClick={() => {
            update(createTemplate("office"));
            setSelectedId(null);
          }}
        >
          Restore starter layout <ChevronDown size={13} />
        </button>
      </div>
    </div>
  );
}
