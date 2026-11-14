---
name: design
description: Design a screen with the human before building it: a briefing, then a prototype agent that builds the layout options as a visual prototype to choose from. Use before creating any Angular page or user-visible component, or when the user asks for screen or layout options.
---

# Design a screen

The human chooses how a screen looks; you bring options that already speak the house style. Apart from the throwaway prototype, nothing under `frontend/src/app` is written until a choice is made and recorded.

## 1. Load the context

Read, in one batch:

- `DESIGN.md`: personality, colour roles, recipes, layout patterns, motion, voice.
- The ticket the screen belongs to (`gh issue view <n> --json title,body,comments`): what the screen must do, its states, its data.
- The closest existing screens and `frontend/src/app/shared/ui/`: what the options should reuse.

Done when you can list every state the screen has (empty, loading, error, success, each role that sees it) and the one primary action of each.

## 2. Write the briefing

Draft **2–3 options that disagree about structure**: layout, information hierarchy, primary affordance. Colours, type and shape come from `DESIGN.md` in every option, so options never differ only in colour or copy.

Write them into a **briefing**, the prototype agent's only context, in this order:

1. **What it is**: the screen's purpose in the ticket's domain words, and who sees it.
2. **What can be done**: actions, limits, and what the screen never shows (e.g. anything about a Giver).
3. **Data**: the API shapes it renders, from `backend/openapi.json` or the agreed contract.
4. **States**: every state from step 1, each with its primary action.
5. **Visual context**: the layout pattern, the `shared/ui` pieces to reuse, and the motion and voice rules that apply.
6. **Options A/B/C**: each one's structure, the `DESIGN.md` patterns it uses and any new pattern it adds; your recommendation first.

Save it as `briefing-<n>.md` in your scratchpad directory and show it to the human in one message. They may edit it before the prototype is built, so keep going only once they say to.

Done when the briefing covers every state and every option names its structure.

## 3. Dispatch the prototype agent

Launch one subagent (`Agent` tool) with the briefing pasted in full, plus this brief:

> Invoke the `mattpocock-skills:prototype` skill and build its UI branch from the briefing.
> - One throwaway route, `/prototype/<feature>?variant=A|B|C`, registered only under `isDevMode()` in `app.routes.ts`, code under `frontend/src/app/features/<feature>/prototype/` (outside `pages/` and `components/`).
> - Built from the real `app-shell`, `shared/ui` pieces and tokens, with stub data in memory and no API calls.
> - A floating bar switches the variant (← → too), every state in the briefing, and light/dark.
> - Commit nothing. Done when `npx tsc -p frontend/tsconfig.app.json --noEmit` is clean. Reply with the route, the variant keys, the states the bar reaches, and the files you touched.

The agent runs in the background, so keep talking with the human while it works. When it reports back, serve the prototype yourself (`npx ng serve --port <free port>` from `frontend/`, in the background, so it outlives the agent). Then open the route in the browser and look at each variant before handing it over.

Done when the human has the URL, the variant keys and a line per option.

## 4. Wait for the choice

Stop there. The human may pick one, mix parts ("B's header with A's list"), or ask for another round. For another round, resume the same prototype agent with the changes; it keeps its context. Redraft until they say which one to build.

An ASCII mockup through `AskUserQuestion` (one `preview` per option, recommendation first) replaces steps 3–4 when the human asks for a quick sketch.

## 5. Record the decision

1. Capture the prototype as the primary source: commit it on a throwaway branch `prototype/<n>-<slug>`, push it, and keep it out of the ticket's branch (the route and its folder go nowhere near `main`).
2. Comment on the ticket: the chosen option, the prototype branch and how to run it, what was mixed in, and any new pattern it introduces. A new pattern also goes into `DESIGN.md` in the same PR that builds the screen.

Done when the comment is posted. Now build it properly, following the recipes in `DESIGN.md`: the prototype is the visual reference, rewritten with tests, never copied wholesale.

When a subagent builds the screen, create its new `pages/` and `components/` files yourself first, as placeholders: the design hook only recognises this skill in the session that ran it, and editing an existing file is always allowed.
