export type PartKind =
  | "door"
  | "innerDoor"
  | "window"
  | "socket"
  | "partition"
  | "basin"
  | "toilet"
  | "light"
  | "desk"
  | "table"
  | "shelf";
export type Wall = "top" | "right" | "bottom" | "left";
export type Angle = 0 | 90 | 180 | 270;
export interface Part {
  id: string;
  kind: PartKind;
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation: Angle;
  wall?: Wall;
  flipped?: boolean;
}
export interface Plan {
  version: 1;
  length: number;
  width: number;
  title: string;
  items: Part[];
}
export const FORMATS = [
  { id: "6000", length: 6000, width: 2400, label: "6.00 × 2.40 m" },
  { id: "7000", length: 7000, width: 2900, label: "7.00 × 2.90 m" },
  { id: "office", length: 6000, width: 4000, label: "6.00 × 4.00 m" },
  { id: "studio", length: 8000, width: 6000, label: "8.00 × 6.00 m" },
] as const;
export const PARTS: Record<
  PartKind,
  {
    name: string;
    width: number;
    depth: number;
    category: string;
    wallBound: boolean;
    code: string;
  }
> = {
  desk: {
    name: "Desk",
    width: 1400,
    depth: 700,
    category: "Furniture",
    wallBound: false,
    code: "DSK",
  },
  table: {
    name: "Table",
    width: 1600,
    depth: 800,
    category: "Furniture",
    wallBound: false,
    code: "TBL",
  },
  shelf: {
    name: "Shelf",
    width: 1200,
    depth: 400,
    category: "Furniture",
    wallBound: false,
    code: "SHF",
  },
  door: {
    name: "Entry door",
    width: 900,
    depth: 60,
    category: "Openings",
    wallBound: true,
    code: "ED",
  },
  innerDoor: {
    name: "Interior door",
    width: 800,
    depth: 60,
    category: "Layout",
    wallBound: false,
    code: "ID",
  },
  window: {
    name: "Window",
    width: 1200,
    depth: 80,
    category: "Openings",
    wallBound: true,
    code: "WIN",
  },
  socket: {
    name: "Socket",
    width: 120,
    depth: 80,
    category: "Electrical",
    wallBound: true,
    code: "SO",
  },
  partition: {
    name: "Partition",
    width: 1200,
    depth: 80,
    category: "Layout",
    wallBound: false,
    code: "PW",
  },
  basin: {
    name: "Basin",
    width: 600,
    depth: 500,
    category: "Plumbing",
    wallBound: false,
    code: "BAS",
  },
  toilet: {
    name: "WC",
    width: 400,
    depth: 700,
    category: "Plumbing",
    wallBound: false,
    code: "WC",
  },
  light: {
    name: "Ceiling light",
    width: 300,
    depth: 300,
    category: "Electrical",
    wallBound: false,
    code: "LGT",
  },
};
export const WALLS: Wall[] = ["top", "right", "bottom", "left"];
export const WALL_LABELS: Record<Wall, string> = {
  top: "Top",
  right: "Right",
  bottom: "Bottom",
  left: "Left",
};
export const SNAP = 50;
export const MIN_DIMENSION = 1000;
export const MAX_DIMENSION = 20000;
const validDimension = (v: unknown): v is number =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= MIN_DIMENSION &&
  v <= MAX_DIMENSION &&
  v % SNAP === 0;
export const snap = (value: number) => Math.round(value / SNAP) * SNAP;
const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), Math.max(min, max));
export const formatMm = (v: number) =>
  new Intl.NumberFormat("en-GB").format(Math.round(v));
export function blankPlan(): Plan {
  return {
    version: 1,
    title: "Untitled space",
    length: 6000,
    width: 2400,
    items: [],
  };
}
export function constrainPart(
  part: Part,
  plan: Pick<Plan, "length" | "width">,
): Part {
  const p = { ...part };
  if (PARTS[p.kind].wallBound) {
    p.wall ??= "top";
    const horizontal = p.wall === "top" || p.wall === "bottom";
    const span = horizontal ? plan.length : plan.width;
    p.width = clamp(
      p.width,
      100,
      p.kind === "door"
        ? Math.min(span - 100, (horizontal ? plan.width : plan.length) - 100)
        : span - 100,
    );
    const along = clamp(
      horizontal ? p.x : p.y,
      p.width / 2 + 50,
      span - p.width / 2 - 50,
    );
    p.x = horizontal ? along : p.wall === "right" ? plan.length : 0;
    p.y = horizontal ? (p.wall === "bottom" ? plan.width : 0) : along;
    p.rotation = (WALLS.indexOf(p.wall) * 90) as Angle;
  } else {
    delete p.wall;
    const rotated = p.rotation === 90 || p.rotation === 270;
    p.width = clamp(p.width, 100, (rotated ? plan.width : plan.length) - 100);
    p.depth = clamp(p.depth, 50, (rotated ? plan.length : plan.width) - 100);
    if (p.kind === "light") {
      p.width = Math.min(p.width, plan.length - 100, plan.width - 100);
      p.depth = p.width;
    }
    const halfX = (rotated ? p.depth : p.width) / 2;
    const halfY = (rotated ? p.width : p.depth) / 2;
    p.x = clamp(p.x, halfX + 50, plan.length - halfX - 50);
    p.y = clamp(p.y, halfY + 50, plan.width - halfY - 50);
    if (p.kind === "innerDoor") {
      p.width = Math.min(p.width, plan.length - 100, plan.width - 100);
      if (p.rotation === 0) {
        p.x = clamp(p.x, p.width / 2 + 50, plan.length - p.width / 2 - 50);
        p.y = clamp(p.y, 50, plan.width - p.width - 50);
      }
      if (p.rotation === 90) {
        p.x = clamp(p.x, p.width + 50, plan.length - 50);
        p.y = clamp(p.y, p.width / 2 + 50, plan.width - p.width / 2 - 50);
      }
      if (p.rotation === 180) {
        p.x = clamp(p.x, p.width / 2 + 50, plan.length - p.width / 2 - 50);
        p.y = clamp(p.y, p.width + 50, plan.width - 50);
      }
      if (p.rotation === 270) {
        p.x = clamp(p.x, 50, plan.length - p.width - 50);
        p.y = clamp(p.y, p.width / 2 + 50, plan.width - p.width / 2 - 50);
      }
    }
  }
  return p;
}
export function movePart(part: Part, x: number, y: number, plan: Plan): Part {
  const p = { ...part, x: snap(x), y: snap(y) };
  if (PARTS[p.kind].wallBound) {
    const nearest = [
      { wall: "top", distance: Math.abs(y) },
      { wall: "bottom", distance: Math.abs(y - plan.width) },
      { wall: "left", distance: Math.abs(x) },
      { wall: "right", distance: Math.abs(x - plan.length) },
    ].sort((a, b) => a.distance - b.distance)[0];
    p.wall = nearest.wall as Wall;
  }
  return constrainPart(p, plan);
}
export function rotatePart(part: Part, plan: Plan): Part {
  if (part.wall) {
    const wall = WALLS[(WALLS.indexOf(part.wall) + 1) % 4];
    const oldSpan =
      part.wall === "top" || part.wall === "bottom" ? plan.length : plan.width;
    const position =
      (part.wall === "top" || part.wall === "bottom" ? part.x : part.y) /
      oldSpan;
    return constrainPart(
      {
        ...part,
        wall,
        x: snap(position * plan.length),
        y: snap(position * plan.width),
      },
      plan,
    );
  }
  return constrainPart(
    { ...part, rotation: ((part.rotation + 90) % 360) as Angle },
    plan,
  );
}
export function createPart(kind: PartKind, id: string, plan: Plan): Part {
  const d = PARTS[kind];
  const existing = plan.items.filter((p) => p.kind === kind).length;
  const p: Part = {
    id,
    kind,
    width: d.width,
    depth: d.depth,
    x: snap(plan.length / 2 + existing * 350),
    y: snap(plan.width / 2),
    rotation: 0,
  };
  if (d.wallBound) {
    p.wall = kind === "door" ? "bottom" : "top";
    p.x = snap(
      plan.length * (kind === "door" ? 0.2 : 0.5) + existing * (d.width + 200),
    );
  }
  return constrainPart(p, plan);
}
export function resizePlan(plan: Plan, length: number, width: number): Plan {
  if (!Number.isFinite(length) || !Number.isFinite(width)) return plan;
  length = clamp(snap(length), MIN_DIMENSION, MAX_DIMENSION);
  width = clamp(snap(width), MIN_DIMENSION, MAX_DIMENSION);
  const resized = { ...plan, length, width };
  resized.items = plan.items.map((p) =>
    constrainPart(
      {
        ...p,
        x: snap((p.x / plan.length) * length),
        y: snap((p.y / plan.width) * width),
      },
      resized,
    ),
  );
  return resized;
}
export function samplePlan(): Plan {
  const plan = blankPlan();
  plan.items = [
    { ...createPart("door", "sample-door", plan), x: 1200 },
    { ...createPart("window", "sample-window", plan), x: 1800 },
    {
      ...createPart("socket", "sample-socket", plan),
      x: 3500,
      wall: "bottom" as const,
    },
    { ...createPart("light", "sample-light", plan), x: 2900, y: 1200 },
  ].map((p) => constrainPart(p, plan));
  return plan;
}
export function getWarnings(plan: Plan): string[] {
  const result: string[] = [];
  if (!plan.items.some((p) => p.kind === "door"))
    result.push("Add an entry door to indicate access.");
  const openings = plan.items.filter(
    (p) => p.kind === "door" || p.kind === "window",
  );
  for (let i = 0; i < openings.length; i++)
    for (let j = i + 1; j < openings.length; j++) {
      const a = openings[i],
        b = openings[j];
      if (a.wall === b.wall) {
        const horizontal = a.wall === "top" || a.wall === "bottom";
        if (
          Math.abs((horizontal ? a.x : a.y) - (horizontal ? b.x : b.y)) <
          (a.width + b.width) / 2 + 100
        )
          result.push(
            "Doors or windows are very close together. Review their positions.",
          );
      }
    }
  const walls = plan.items.filter((p) => p.kind === "partition");
  for (const fixture of plan.items.filter((p) =>
    ["basin", "toilet", "light", "desk", "table", "shelf"].includes(p.kind),
  )) {
    const f = bounds(fixture);
    if (
      walls.some((w) => {
        const b = bounds(w);
        return (
          Math.abs(fixture.x - w.x) < f.halfX + b.halfX &&
          Math.abs(fixture.y - w.y) < f.halfY + b.halfY
        );
      })
    )
      result.push("A component overlaps a partition. Review the layout.");
  }
  return [...new Set(result)];
}
export function bounds(part: Part) {
  const r = part.rotation === 90 || part.rotation === 270;
  return {
    halfX: (r ? part.depth : part.width) / 2,
    halfY: (r ? part.width : part.depth) / 2,
  };
}
export type History = { past: Plan[]; present: Plan; future: Plan[] };
export function commit(history: History, plan: Plan): History {
  if (JSON.stringify(history.present) === JSON.stringify(plan)) return history;
  return {
    past: [...history.past.slice(-49), history.present],
    present: plan,
    future: [],
  };
}
export function undo(history: History): History {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1)!,
    future: [history.present, ...history.future],
  };
}
export function redo(history: History): History {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  };
}
export function parsePlan(value: unknown): Plan | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    v.version !== 1 ||
    typeof v.title !== "string" ||
    v.title.length > 100 ||
    !validDimension(v.length) ||
    !validDimension(v.width) ||
    !Array.isArray(v.items) ||
    v.items.length > 100
  )
    return null;
  const plan: Plan = {
    version: 1,
    title: v.title,
    length: v.length as number,
    width: v.width as number,
    items: [],
  };
  const ids = new Set<string>();
  for (const item of v.items) {
    if (!item || typeof item !== "object") return null;
    const p = item as Record<string, unknown>;
    if (
      typeof p.id !== "string" ||
      p.id.length > 100 ||
      ids.has(p.id) ||
      typeof p.kind !== "string" ||
      !Object.hasOwn(PARTS, p.kind) ||
      ![0, 90, 180, 270].includes(p.rotation as number)
    )
      return null;
    if (
      !["x", "y", "width", "depth"].every(
        (k) =>
          typeof p[k] === "number" &&
          Number.isFinite(p[k]) &&
          Math.abs(p[k] as number) <= 100000,
      )
    )
      return null;
    if (p.wall !== undefined && !WALLS.includes(p.wall as Wall)) return null;
    if ((p.width as number) <= 0 || (p.depth as number) <= 0) return null;
    ids.add(p.id);
    plan.items.push(
      constrainPart(
        {
          id: p.id,
          kind: p.kind as PartKind,
          x: p.x as number,
          y: p.y as number,
          width: p.width as number,
          depth: p.depth as number,
          rotation: p.rotation as Angle,
          wall: p.wall as Wall | undefined,
          flipped: p.flipped === true,
        },
        plan,
      ),
    );
  }
  return plan;
}
