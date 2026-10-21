import {
  blankPlan,
  createPart,
  constrainPart,
  type PartKind,
  type Plan,
} from "./model.ts";
export const TEMPLATES = [
  { id: "office", name: "Compact office" },
  { id: "shop", name: "Pop-up shop" },
  { id: "studio", name: "Creative studio" },
] as const;
export function createTemplate(id: string): Plan {
  const base = blankPlan();
  const plan: Plan = {
    ...base,
    length: id === "studio" ? 8000 : 6000,
    width: id === "studio" ? 6000 : 4000,
    title: TEMPLATES.find((t) => t.id === id)?.name || "Untitled space",
  };
  const add = (
    kind: PartKind,
    x: number,
    y: number,
    rotation: 0 | 90 | 180 | 270 = 0,
  ) => {
    const p = createPart(kind, `starter-${plan.items.length + 1}`, plan);
    plan.items.push(constrainPart({ ...p, x, y, rotation }, plan));
  };
  add("door", 1200, plan.width);
  add("window", 2000, 0);
  add("window", 4400, 0);
  add("light", 3000, 1900);
  if (id === "shop") {
    add("shelf", 900, 600);
    add("shelf", 5100, 600);
    add("table", 4000, 2800);
    add("table", 2400, 1600);
  } else if (id === "studio") {
    add("table", 4000, 3000);
    add("desk", 1300, 1000);
    add("shelf", 6800, 1000);
    add("shelf", 6800, 2200);
    add("basin", 700, 4800);
  } else {
    add("desk", 1400, 1000);
    add("desk", 4100, 1000);
    add("table", 4100, 2800);
    add("shelf", 700, 2700);
    add("socket", 1700, 0);
  }
  return plan;
}
