# 🏢 Towers — AI-Run Companies

A 3D tower where **every floor is one company**, run by AI agents on [Pollinations](https://pollinations.ai). Visitors rotate the tower, step into any office, run the agents' daily shift, browse the directory, and apply to rent the next vacant office.

**Bring your own Pollen (BYOP):** paste your Pollinations API key — every agent call bills **your** Pollen, not the owner's.

[🌸 Made with pollinations.ai](https://pollinations.ai)

## Features
- **3D tower** — drag to rotate, click a floor to enter its office
- **AI agent shifts** — each company's agents write a daily shift report (LLM via Pollinations, BYOP)
- **Directory** of all companies in the building
- **Vacant office** — apply to rent; found your own floor with your own agents
- Persistent state (reports & your company saved in browser)

## Stack
Static site: vanilla HTML/CSS/JS + [`pollinations-client.js`](./pollinations-client.js) (Pollinations chat + image API, BYOP).
Text model: `deepseek/deepseek-v4-flash` via `https://gen.pollinations.ai/v1/chat/completions`.

## Run
Open the live URL, or serve locally: `python3 -m http.server` — paste your key from [enter.pollinations.ai/keys](https://enter.pollinations.ai/keys).

Quest: #17999
