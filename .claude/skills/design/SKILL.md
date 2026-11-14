---
name: design
description: Design a screen with the human before building it, offering layout options as a visual prototype to choose from. Use before creating any Angular page or user-visible component, or when the user asks for screen or layout options.
---

# Design a screen

The human chooses how a screen looks; you bring options that already speak the house style. Nothing under `frontend/src/app` is written until a choice is made and recorded.

## 1. Load the context

Read, in one batch:

- `DESIGN.md`: personality, colour roles, recipes, layout patterns, motion, voice.
- The ticket the screen belongs to (`gh issue view <n> --json title,body,comments`): what the screen must do, its states, its data.
- The closest existing screens and `frontend/src/app/shared/ui/`: what the options should reuse.

Done when you can list every state the screen has (empty, loading, error, success, each role that sees it) and the one primary action of each.

## 2. Draft the options

Draft **2–3 options that disagree about structure**: layout, information hierarchy, primary affordance. Colours, type and shape come from `DESIGN.md` in every option, so options never differ only in colour or copy. Each option names the `DESIGN.md` patterns and `shared/ui` pieces it uses, and any new pattern it would add.

Show them as a **visual prototype** through the `mattpocock-skills:prototype` skill (its UI branch), so the human chooses by looking at the real thing:

- One throwaway route in the SPA, `/prototype/<feature>?variant=A|B|C`, registered only under `isDevMode()`, with code under `features/<feature>/prototype/` (outside `pages/` and `components/`).
- Built from the real `app-shell`, `shared/ui` pieces and tokens, with stub data in memory: no API calls.
- A floating bar switches the variant (← → too), every state from step 1, and light/dark, so each state is judged in both themes.
- Serve it (`npx ng serve --port <free port>`) and hand the human the URL and the variant keys.

An ASCII mockup through `AskUserQuestion` (one `preview` per option, your recommendation first) is the fallback when the human asks for a quick sketch instead.

Done when every option renders the screen's main state and the bar reaches all its other states.

## 3. Wait for the choice

Present the options and stop. The human may pick one, mix parts ("B's header with A's list"), or ask for another round; redraft until they say which one to build.

## 4. Record the decision

1. Capture the prototype as the primary source: commit it on a throwaway branch `prototype/<n>-<slug>`, push it, and keep it out of the ticket's branch (the route and its folder go nowhere near `main`).
2. Comment on the ticket: the chosen option, the prototype branch and how to run it, what was mixed in, and any new pattern it introduces. A new pattern also goes into `DESIGN.md` in the same PR that builds the screen.

Done when the comment is posted. Now build it properly, following the recipes in `DESIGN.md`: the prototype is the visual reference, rewritten with tests, never copied wholesale.

When a subagent builds the screen, create its new `pages/` and `components/` files yourself first, as placeholders: the design hook only recognises this skill in the session that ran it, and editing an existing file is always allowed.
