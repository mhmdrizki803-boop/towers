/**
 * Tower ledger — the part of each floor that is measured, not narrated.
 *
 * A shift is the model's job. Turning a shift into money, margin, cash on hand
 * and runway is this file's job. The model may not assert any of those numbers:
 * it only reports what it did (revenue, cost, units, headcount) and the code
 * derives the rest. If the model returns prose, the shift is rejected instead
 * of being silently filled with made-up figures.
 *
 * Pure functions only — no DOM, no network. Works in the browser as
 * `window.TowerLedger` and in Node via `require("./ledger.js")`.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) module.exports = factory();
    else root.TowerLedger = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const MAX_MONEY = 1e9;

    function firstJsonObject(text) {
        if (typeof text !== "string") return null;
        const cleaned = text.replace(/```(?:json)?/gi, "").trim();
        const start = cleaned.indexOf("{");
        if (start === -1) return null;
        let depth = 0, inStr = false, esc = false;
        for (let i = start; i < cleaned.length; i++) {
            const c = cleaned[i];
            if (inStr) {
                if (esc) esc = false;
                else if (c === "\\") esc = true;
                else if (c === '"') inStr = false;
                continue;
            }
            if (c === '"') inStr = true;
            else if (c === "{") depth++;
            else if (c === "}") {
                depth--;
                if (depth === 0) return cleaned.slice(start, i + 1);
            }
        }
        return null;
    }

    function money(v) {
        if (typeof v === "string") v = Number(v.replace(/[$,\s]/g, ""));
        if (typeof v !== "number" || !isFinite(v) || v < 0 || v > MAX_MONEY) return null;
        return Math.round(v * 100) / 100;
    }

    function count(v, min) {
        if (typeof v === "string") v = Number(v.trim());
        if (typeof v !== "number" || !isFinite(v)) return null;
        const n = Math.round(v);
        if (n < min || n > MAX_MONEY) return null;
        return n;
    }

    /**
     * Parse one model reply into a shift.
     * @returns {{ok:true, shift:object} | {ok:false, error:string, raw:string}}
     */
    function parseShift(raw) {
        const blob = firstJsonObject(raw);
        if (!blob) return { ok: false, error: "No ledger JSON in the model reply.", raw: String(raw || "") };
        let data;
        try {
            data = JSON.parse(blob);
        } catch (e) {
            return { ok: false, error: "Ledger JSON did not parse: " + e.message, raw: String(raw || "") };
        }
        if (!data || typeof data !== "object") return { ok: false, error: "Ledger JSON was not an object.", raw: String(raw || "") };

        const revenue = money(data.revenue);
        const cost = money(data.cost);
        const units = count(data.units, 0);
        const headcount = count(data.headcount, 1);
        const problems = [];
        if (revenue === null) problems.push("revenue");
        if (cost === null) problems.push("cost");
        if (units === null) problems.push("units");
        if (headcount === null) problems.push("headcount");
        if (problems.length) return { ok: false, error: "Shift missing or invalid: " + problems.join(", ") + ".", raw: String(raw || "") };

        let confidence = null;
        if (data.confidence !== undefined && data.confidence !== null) {
            const c = typeof data.confidence === "string" ? Number(data.confidence) : data.confidence;
            if (typeof c === "number" && isFinite(c)) confidence = Math.min(1, Math.max(0, c));
        }
        const note = typeof data.note === "string" ? data.note.trim().slice(0, 240) : "";

        return { ok: true, shift: { revenue, cost, units, headcount, confidence, note } };
    }

    /** Derive the numbers the model is not allowed to state. */
    function scoreShift(cashBefore, shift) {
        const profit = Math.round((shift.revenue - shift.cost) * 100) / 100;
        const cash = Math.round((cashBefore + profit) * 100) / 100;
        const margin = shift.revenue > 0 ? profit / shift.revenue : (profit < 0 ? -1 : 0);
        const perHead = shift.headcount > 0 ? shift.units / shift.headcount : 0;
        // Shifts left at this burn rate, using the cash actually on hand now.
        // A floor that is already at or below zero has no runway left.
        let runway = null;
        if (profit < 0) runway = Math.max(0, Math.floor(cash / -profit));
        return { profit, cash, margin, perHead, runway };
    }

    function emptyBook() {
        return { shifts: [], cash: 0, revenue: 0, cost: 0, units: 0, rejected: 0 };
    }

    /**
     * Add a parsed shift to a floor's book. Returns a new book; never mutates.
     * `at` is an ISO timestamp supplied by the caller (keeps this pure).
     */
    function applyShift(book, shift, at) {
        const base = book && Array.isArray(book.shifts) ? book : emptyBook();
        const scored = scoreShift(base.cash, shift);
        const entry = { at: at || null, ...shift, ...scored };
        const shifts = base.shifts.concat([entry]).slice(-50);
        return {
            shifts,
            cash: scored.cash,
            revenue: Math.round((base.revenue + shift.revenue) * 100) / 100,
            cost: Math.round((base.cost + shift.cost) * 100) / 100,
            units: base.units + shift.units,
            rejected: base.rejected || 0,
        };
    }

    function rejectShift(book) {
        const base = book && Array.isArray(book.shifts) ? book : emptyBook();
        return { ...base, rejected: (base.rejected || 0) + 1 };
    }

    /** Floor-level summary used by the tower and the directory. */
    function summarise(book) {
        const b = book && Array.isArray(book.shifts) ? book : emptyBook();
        const n = b.shifts.length;
        const profits = b.shifts.map((s) => s.profit);
        const best = n ? Math.max(...profits) : 0;
        const worst = n ? Math.min(...profits) : 0;
        const avgMargin = n ? b.shifts.reduce((a, s) => a + s.margin, 0) / n : 0;
        return {
            shifts: n,
            cash: b.cash || 0,
            revenue: b.revenue || 0,
            cost: b.cost || 0,
            units: b.units || 0,
            rejected: b.rejected || 0,
            best,
            worst,
            avgMargin,
            profitable: n > 0 && b.cash > 0,
        };
    }

    /** Whole-tower book: sums per-floor summaries. */
    function towerSummary(books) {
        const list = Array.isArray(books) ? books : [];
        let cash = 0, revenue = 0, cost = 0, shifts = 0, floors = 0, rejected = 0;
        list.forEach((b) => {
            const s = summarise(b);
            if (s.shifts > 0) floors++;
            cash += s.cash;
            revenue += s.revenue;
            cost += s.cost;
            shifts += s.shifts;
            rejected += s.rejected;
        });
        const round = (v) => Math.round(v * 100) / 100;
        return { cash: round(cash), revenue: round(revenue), cost: round(cost), shifts, floors, rejected };
    }

    function prompt(company, tagline, roles) {
        return [
            "You run the floor \"" + company + "\" (" + tagline + "), staffed by: " + roles + ".",
            "Do one work shift for today and report it as numbers only.",
            "Reply with ONE JSON object and nothing else, no prose, no code fences:",
            '{"revenue": <USD this shift, number>, "cost": <USD this shift, number>, "units": <deliverables shipped, integer>, "headcount": <agents that worked, integer>, "confidence": <0-1>, "note": "<one short line>"}',
            "Rules: revenue and cost are non-negative numbers; do not invent numbers larger than 5000; do not report profit or margin (the app computes those).",
        ].join("\n");
    }

    return { parseShift, scoreShift, applyShift, rejectShift, summarise, towerSummary, emptyBook, prompt, firstJsonObject };
});
