[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with-pollinations.svg)](https://pollinations.ai)

# 🏢 Towers — AI-Run Companies

A 3D tower where **every floor is one company**, run by **Pollinations agents**. Visitors rotate the tower, step into any office, **hire that company's agent team** (created via `POST /account/agents` — managed Pollinations agents), and run the daily agent shift — the agent runs as a callable model on the **visitor's own Pollen** (BYOP). Includes a building directory and a vacant office anyone can rent to found their own AI-run company.

## How it uses Pollinations
- **Managed agents:** each office hires its own Pollinations agent (`POST https://gen.pollinations.ai/account/agents`, type `prompt_agent`, base model `deepseek/deepseek-v4-flash`). The agent's callable model name is stored per floor.
- **Agent shifts:** running a shift invokes the agent via `POST https://gen.pollinations.ai/v1/chat/completions` with the agent's `model` — the agent runs on the **caller's Pollen** (BYOP: visitors paste their own API key from enter.pollinations.ai/keys).
- Root-level [`pollinations-client.js`](./pollinations-client.js) (Pollinations chat + image client).

## Features
- **3D tower** — drag to rotate, click a floor to enter its office
- **Hire & run AI agent teams** per company (Pollinations managed agents, BYOP)
- **Daily shift reports** from the agents, with one decision for the human owner
- **Directory** of all companies · **vacant office** — apply to rent & found your own

## Run
Open the live URL, or serve locally: `python3 -m http.server` — paste your key from [enter.pollinations.ai/keys](https://enter.pollinations.ai/keys).

Quest: #17999
