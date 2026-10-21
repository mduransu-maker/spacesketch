import test from "node:test";
import assert from "node:assert/strict";
import {
  blankPlan,
  samplePlan,
  createPart,
  movePart,
  rotatePart,
  constrainPart,
  resizePlan,
  getWarnings,
  commit,
  undo,
  redo,
  parsePlan,
  PARTS,
} from "../src/lib/model.ts";

test("wall-bound parts snap to the nearest wall and remain within corners", () => {
  const plan = blankPlan(),
    w = createPart("window", "w", plan);
  const right = movePart(w, 5990, 1157, plan);
  assert.equal(right.wall, "right");
  assert.equal(right.x, 6000);
  assert.equal(right.y, 1150);
  assert.equal(right.rotation, 90);
  const corner = movePart(w, -1000, -1000, plan);
  assert.ok(corner.x >= corner.width / 2 + 50);
  assert.equal(corner.y, 0);
  const door = constrainPart(
    { ...createPart("door", "d", plan), width: 5900 },
    plan,
  );
  assert.equal(door.width, 2300);
});
test("interior parts remain in bounds after rotations and format changes", () => {
  const plan = blankPlan();
  let p = createPart("basin", "b", plan);
  p = movePart(p, 20000, -5000, plan);
  assert.ok(p.x + p.width / 2 <= plan.length);
  assert.ok(p.y - p.depth / 2 >= 0);
  p = rotatePart(p, plan);
  assert.equal(p.rotation, 90);
  assert.ok(p.x + p.depth / 2 <= plan.length);
  const large = {
    ...plan,
    length: 7000,
    width: 2900,
    items: [{ ...p, x: 6650, y: 2500 }],
  };
  const resized = resizePlan(large, 6000, 2400);
  assert.ok(resized.items[0].x <= 6000);
  assert.ok(resized.items[0].y <= 2400);
  let door = createPart("innerDoor", "i", plan);
  for (let n = 0; n < 4; n++) {
    door = rotatePart(movePart(door, 99999, 99999, plan), plan);
    assert.ok(door.x <= plan.length);
    assert.ok(door.y <= plan.width);
    if (door.rotation === 0) assert.ok(door.y + door.width <= plan.width);
  }
});
test("rotating wall parts changes the assigned wall consistently", () => {
  const plan = blankPlan();
  let part = createPart("window", "w", plan);
  const walls = [];
  for (let i = 0; i < 4; i++) {
    part = rotatePart(part, plan);
    walls.push(part.wall);
  }
  assert.deepEqual(walls, ["right", "bottom", "left", "top"]);
});
test("history treats committed changes atomically and clears redo after edits", () => {
  const initial = blankPlan();
  let h = { past: [], present: initial, future: [] };
  const one = { ...initial, items: [createPart("window", "w", initial)] };
  h = commit(h, one);
  assert.equal(h.past.length, 1);
  h = undo(h);
  assert.equal(h.present.items.length, 0);
  h = redo(h);
  assert.equal(h.present.items.length, 1);
  h = undo(h);
  h = commit(h, { ...initial, title: "Anderer Entwurf" });
  assert.equal(h.future.length, 0);
  assert.equal(commit(h, h.present), h);
});
test("overlapping openings and missing access produce planning hints", () => {
  const plan = blankPlan();
  assert.equal(getWarnings(plan).length, 1);
  const door = createPart("door", "d", plan),
    window = {
      ...createPart("window", "w", plan),
      wall: door.wall,
      x: door.x,
      y: door.y,
    };
  const p = { ...plan, items: [door, window] };
  assert.match(getWarnings(p).join(" "), /close together/);
});
test("stored plans are validated before loading and round-trip all parts", () => {
  const plan = samplePlan();
  assert.ok(parsePlan(JSON.parse(JSON.stringify(plan))));
  for (const broken of [
    { ...plan, length: 1234 },
    { ...plan, items: [{ ...plan.items[0], x: NaN }] },
    { ...plan, items: [{ ...plan.items[0], kind: "toString" }] },
    { ...plan, items: [plan.items[0], plan.items[0]] },
    { ...plan, items: [{ ...plan.items[0], rotation: 33 }] },
  ])
    assert.equal(parsePlan(broken), null);
  const all = {
    ...blankPlan(),
    items: Object.keys(PARTS).map((kind, i) =>
      createPart(kind, String(i), blankPlan()),
    ),
  };
  assert.equal(parsePlan(all)?.items.length, Object.keys(PARTS).length);
});

test("zoom and pan keep the visible canvas inside the complete drawing", async () => {
  const { clampView, planViewBox } = await import("../src/lib/viewport.ts");
  const full = planViewBox(6000, 2400).split(" ").map(Number);
  assert.deepEqual(full, [-700, -700, 7400, 3800]);
  const view = clampView(6000, 2400, { zoom: 2, x: 99999, y: -99999 });
  const box = planViewBox(6000, 2400, view).split(" ").map(Number);
  assert.ok(box[0] >= full[0]);
  assert.ok(box[1] >= full[1]);
  assert.ok(box[0] + box[2] <= full[0] + full[2]);
  assert.ok(box[1] + box[3] <= full[1] + full[3]);
  assert.deepEqual(clampView(6000, 2400, { zoom: 1, x: 5000, y: 5000 }), {
    zoom: 1,
    x: 0,
    y: 0,
  });
  assert.equal(clampView(6000, 2400, { zoom: 99, x: 0, y: 0 }).zoom, 2.5);
});
