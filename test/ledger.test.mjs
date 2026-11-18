import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const L = require("../ledger.js");

test("parses a clean shift and never trusts model-reported profit", () => {
  const r = L.parseShift('{"revenue":120,"cost":45,"units":3,"headcount":2,"confidence":0.7,"note":"shipped 3 posts","profit":9999,"margin":42}');
  assert.equal(r.ok, true);
  assert.equal(r.shift.revenue, 120);
  assert.equal(r.shift.cost, 45);
  assert.equal(r.shift.profit, undefined);
  assert.equal(r.shift.margin, undefined);
  const s = L.scoreShift(0, r.shift);
  assert.equal(s.profit, 75);
  assert.equal(s.cash, 75);
  assert.equal(Math.round(s.margin * 100), 63);
  assert.equal(s.perHead, 1.5);
});

test("strips code fences and surrounding prose", () => {
  const raw = 'Here is the shift:\n```json\n{"revenue":"$80.50","cost":"30","units":"2","headcount":"2"}\n```\nDone.';
  const r = L.parseShift(raw);
  assert.equal(r.ok, true);
  assert.equal(r.shift.revenue, 80.5);
  assert.equal(r.shift.units, 2);
});

test("rejects prose instead of inventing figures", () => {
  const r = L.parseShift("Great day! The agents wrote three blog posts and everyone is happy.");
  assert.equal(r.ok, false);
  assert.match(r.error, /No ledger JSON/);
});

test("rejects missing and negative fields", () => {
  assert.equal(L.parseShift('{"revenue":10,"cost":5,"units":1}').ok, false);
  assert.equal(L.parseShift('{"revenue":-10,"cost":5,"units":1,"headcount":2}').ok, false);
  assert.equal(L.parseShift('{"revenue":10,"cost":5,"units":1,"headcount":0}').ok, false);
  const r = L.parseShift('{"revenue":10,"cost":5,"units":1,"headcount":0}');
  assert.match(r.error, /headcount/);
});

test("runway and cash come from the fold, not the model", () => {
  const a = L.applyShift(L.emptyBook(), { revenue: 100, cost: 40, units: 2, headcount: 2 }, "2026-11-18T00:00:00Z");
  assert.equal(a.cash, 60);
  const b = L.applyShift(a, { revenue: 10, cost: 70, units: 1, headcount: 2 }, "2026-11-19T00:00:00Z");
  assert.equal(b.cash, 0);
  assert.equal(b.shifts.length, 2);
  const last = b.shifts[b.shifts.length - 1];
  assert.equal(last.profit, -60);
  assert.equal(last.runway, 0);
  const c = L.applyShift(L.applyShift(L.emptyBook(), { revenue: 100, cost: 40, units: 1, headcount: 1 }, null), { revenue: 10, cost: 30, units: 1, headcount: 1 }, null);
  assert.equal(c.cash, 40);
  assert.equal(c.shifts[1].runway, 2);
  const sum = L.summarise(b);
  assert.equal(sum.best, 60);
  assert.equal(sum.worst, -60);
  assert.equal(sum.cash, 0);
});

test("rejected shifts are counted, not silently dropped", () => {
  const book = L.rejectShift(L.emptyBook());
  assert.equal(L.summarise(book).rejected, 1);
  assert.equal(L.summarise(book).shifts, 0);
});

test("tower summary skips empty floors", () => {
  const one = L.applyShift(L.emptyBook(), { revenue: 50, cost: 20, units: 1, headcount: 1 }, null);
  const t = L.towerSummary([one, L.emptyBook(), null]);
  assert.equal(t.cash, 30);
  assert.equal(t.shifts, 1);
  assert.equal(t.floors, 1);
});
