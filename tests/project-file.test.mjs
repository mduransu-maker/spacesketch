import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePlan,
  resizePlan,
  blankPlan,
  createPart,
} from "../src/lib/model.ts";
import { parseProject, serializeProject } from "../src/lib/project-file.ts";
import { TEMPLATES, createTemplate } from "../src/lib/templates.ts";
test("starter layouts are valid, portable and independent", () => {
  for (const t of TEMPLATES) {
    const plan = createTemplate(t.id);
    assert.deepEqual(parseProject(serializeProject(plan)), parsePlan(plan));
    assert.ok(plan.items.some((p) => p.kind === "door"));
  }
  const a = createTemplate("office"),
    b = createTemplate("office");
  a.items[0].x = 9;
  assert.notEqual(a.items[0].x, b.items[0].x);
});
test("custom room dimensions snap, clamp and round-trip", () => {
  const p = resizePlan(createTemplate("studio"), 7351, 5251);
  assert.equal(p.length, 7350);
  assert.equal(p.width, 5250);
  assert.ok(parseProject(serializeProject(p)));
  const small = resizePlan(p, -500, 999999);
  assert.equal(small.length, 1000);
  assert.equal(small.width, 20000);
  assert.ok(parsePlan(small));
  assert.equal(resizePlan(p, Infinity, 5000), p);
});
test("invalid project files do not turn into accepted scenes", () => {
  for (const text of [
    "{",
    "null",
    serializeProject(createTemplate("office")).replace(
      '"schemaVersion": 1',
      '"schemaVersion": 999',
    ),
    " ".repeat(128001),
    JSON.stringify({
      application: "Other app",
      schemaVersion: 1,
      plan: blankPlan(),
    }),
  ])
    assert.equal(parseProject(text), null);
  const p = blankPlan();
  p.items = [{ ...createPart("desk", "d", p), width: -20 }];
  assert.equal(parsePlan(p), null);
  const clean = JSON.parse(serializeProject(createTemplate("shop")));
  clean.plan.unexpected = "discard";
  clean.plan.items[0].onClick = "discard";
  const result = parseProject(JSON.stringify(clean));
  assert.ok(result);
  assert.equal(result.unexpected, undefined);
  assert.equal(result.items[0].onClick, undefined);
});
