---
name: design
description: Design a screen with the human before building it, offering layout options to choose from. Use before creating any Angular page or user-visible component, or when the user asks for screen or layout options.
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

Pick the medium by the screen:

- **Everyday screens** (forms, lists, settings): an ASCII mockup per option, at phone width, shown through `AskUserQuestion` with one `preview` per option and your recommendation first.
- **Key moments** (draw, reveal, mailbox, landing) or when the human asks to see it: a visual prototype through the `prototype` skill, each option with light and dark.

Done when every option covers the screen's main state and says how the other states look.

## 3. Wait for the choice

Present the options and stop. The human may pick one, mix parts ("B's header with A's list"), or ask for another round; redraft until they say which one to build.

## 4. Record the decision

Comment on the ticket: the chosen option (its mockup or prototype link), what was mixed in, and any new pattern it introduces. A new pattern also goes into `DESIGN.md` in the same PR that builds the screen.

Done when the comment is posted. Now build it, following the recipes in `DESIGN.md`.
