[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai)

# 🏢 Towers — AI-Run Companies

A 3D tower where **every floor is one company**, run by **Pollinations agents**. Visitors rotate the tower, step into any office, and run the daily agent shift. Each floor keeps a **ledger**: the agent reports what it did, and the app does the accounting.

## How it uses Pollinations
- **Managed agents, created once by the tower owner:** the eight floor agents already exist as public managed prompt agents (`prompt_agent`, base model `deepseek/deepseek-v4-flash`) and are listed under the owner's `community/` namespace. Visitors never create agents — a scoped website key has no `account:keys` permission, so `POST /account/agents` is owner-side only.
- **Agent shifts:** running a shift invokes the floor's public agent via `POST https://gen.pollinations.ai/v1/chat/completions` with `model: community/mhmdrizki803-boop/<floor-slug>` — the agent runs on the **caller's own Pollen**.
- **Sign-in (Connect):** visitors click **Connect** and approve a scoped key on the Pollinations consent screen (`enter.pollinations.ai/authorize`). The key stays in the browser and is only used for that visitor's shifts. There is no key to paste by hand.

## The ledger — what is measured in code
A shift is the model's job; the numbers are the app's job.

1. The agent is asked one question: do today's shift and reply with **only** a JSON object —
   `{ revenue, cost, units, headcount, confidence, note }`.
2. [`ledger.js`](./ledger.js) parses that reply strictly (`parseShift`). Praise, prose and code
   fences are stripped; missing, negative or non-numeric fields **reject the shift** instead of
   being filled with invented figures. A rejected reply is counted on the floor's ledger, and the
   shift feed shows exactly what the model said.
3. Everything else is derived, never reported by the model (`scoreShift`, `applyShift`):
   - profit = revenue − cost, margin = profit / revenue
   - cash on hand after each shift, best/worst shift, average margin
   - units per agent, and **runway** = how many more shifts at the current burn rate the cash covers
4. The tower header and the directory show the folded result per floor and for the whole building.

Because the model only supplies inputs and the code applies the arithmetic, two visitors who give
the same numbers get the same ledger — and a floor cannot "claim" a profit it did not earn.

## Features
- **3D tower** — drag to rotate, click a floor to enter its office
- **Agent shift per floor** — the agent works, the ledger books
- **Per-floor ledger** — revenue, cost, profit, margin, cash, runway, rejected replies
- **Directory** — every company's cash and margin at a glance
- **Vacant office** — rent it and found your own AI-run company

## Tests
```
node --test test/ledger.test.mjs
```
Pure-function tests cover: model-reported profit is ignored, code fences/prose are stripped,
prose-only replies are rejected rather than guessed, negative/zero fields are rejected, runway and
cash come from the fold, and rejected replies are counted.

## Run
Open the live URL, or serve locally: `python3 -m http.server`, then click **Connect**.

Quest: #17999
