# Builder UI Reconstruction v0.1

Status: proposal_for_review  
Date: 2026-05-02  
Scope: UI reconstruction spec only, no implementation

## Purpose

This document defines the intended Builder UI reconstruction.

It exists to stop a specific kind of drift:

- additive panel growth inside the current Builder Studio shell
- Maya becoming just one block inside an operator cockpit
- UI truth drifting away from the intended product truth

This is not a frontend code plan yet.
It is the reviewable target specification for the next Builder UI rebuild slice.

## Product Truth

Builder is Maya-first.

The user should primarily feel:

- "I speak to Maya"
- "Maya decides how to solve this"
- "the machine room appears only when needed"

The user should not primarily feel:

- "I am operating a complex admin console"
- "I must create and supervise tasks manually"
- "the product is a stack of technical side panels"

## Current UI Diagnosis

The current Builder UI has useful pieces, but the shell is still wrong.

Main issues:

1. the page is still structurally a control room
2. manual task creation is still prominent
3. the right rail is fixed and too expensive in space
4. too many secondary panels are visible by default
5. the default state does not collapse into a chat-first Maya surface
6. the current shell wastes too much horizontal and vertical space
7. panel borders and visual separations are too weak in places, making structure feel muddy

Important:

- this is not solved by another polish pass
- this requires a shell-level reconstruction

## Reconstruction Goal

The Builder desktop UI should have three experience modes:

1. `default`
2. `single_specialist`
3. `pipeline`

These modes should not merely change text.
They should change:

- visible surfaces
- spatial hierarchy
- which panels exist at all
- how much of the machine room is exposed

## Core Layout

The desktop shell should be rebuilt into three structural zones:

1. left collapsible sidebar
2. central Maya stage
3. right contextual drawer

### 1. Left Sidebar

Default state:

- collapsed
- approximately 56 px wide
- icon-only

Expanded state:

- approximately 220 px wide
- icon plus label

Primary purpose:

- house secondary navigation
- remove fixed left-side panel stacks from the default composition
- preserve quick operator access without stealing stage width

Target item order:

1. Maya Chat
2. Tasks
3. Patrol
4. Models
5. Files
6. Inbox / Notes

Behavior:

- hover tooltip in collapsed mode
- explicit expand/collapse affordance
- no mandatory internal scrolling in normal desktop state

### 2. Central Maya Stage

This is the primary surface.

It should contain:

- slim topbar
- main stage body
- persistent composer at the bottom

The stage is where the user spends attention.
The stage must not be visually subordinate to side rails.

### 3. Right Contextual Drawer

This is not a permanent right column.

It should:

- be closed by default
- open only on demand
- host advanced and contextual surfaces

Examples:

- model configuration
- detailed task internals
- file inspection
- deeper evidence or review surfaces

It should not permanently consume width in the empty or simple states.

## Topbar

The current hero block with:

- `Builder Studio`
- subtitle
- action button row

is removed.

It is replaced by a slim operational topbar.

### Default Mode Topbar

- left: compact readiness signal
- right: optional subtle environment hint

Example:

- `Pipeline bereit`
- `6 Modelle verbunden`

### Single-specialist Mode Topbar

- left: compact readiness or current activity signal
- right: subtle transparency hint for the active specialist model

### Pipeline Mode Topbar

- left: active task pill with title and current phase
- right: compact estimate if available

Important:

- the topbar should inform
- it should not become a second hero area

## Default Mode

If no task is active, the Builder UI should collapse into a chat-first Maya surface.

Visible:

- greeting
- one short invitation line
- a small set of suggestion chips
- the Maya composer as the dominant action

Not visible:

- manual task creation form
- run / approve / revert controls
- pool cards
- tribune
- delivery surface
- review / evidence panels
- file explorer as a full panel
- continuity notes as a full panel
- task list as a fixed large panel

The empty state message should feel like:

- "start with Maya"

not like:

- "configure a workflow system"

## Single-specialist Mode

This mode is for tasks where Maya uses one specialist or one narrow tool path, not the full pipeline.

Visible:

- user message
- small transparency banner
- Maya response
- composer

Not visible:

- six-pool pipeline strip
- full tribune stack
- phase path
- broad machine-room diagnostics

Design intent:

- transparency without spectacle
- useful disclosure without overexposing internals

## Pipeline Mode

This mode is for full multi-instance coordinated work.

Visible:

- user message
- pipeline banner
- tribune as primary stage content
- contextual pool visibility

The tribune is fully justified here.
It is not the universal default shell.

### Required Tribune Blocks

In this order:

1. First Cognition
2. Phase Path
3. Active Team
4. Maya Says Right Now

These blocks should explain:

- what Maya is doing
- why this mode is active
- which team is involved
- what phase is currently live

## Sidebar Content Migration

The current page contains multiple fixed surfaces that should no longer be permanently laid out.

### Move Into Sidebar Or Drawer

- Task list
- File explorer
- Patrol entry
- model configuration entry
- notes / memory entry

### Become Contextual Only

- delivery surface
- evidence / technical details
- runtime checks
- deeper dialog viewer

### Remove From Primary Screen

- prominent manual task creation block
- fixed right-side task creation rail
- broad hero header

## Manual Task Creation

Primary rule:

- task creation happens through Maya communication

Therefore:

- the current right-rail form with title, goal, risk, type, intent, output, format is not a primary screen feature

For v1 direction:

- remove it from the main stage shell
- if needed later, move it behind an `advanced` entry for power users

But it must not remain visually dominant.

## Contextual Surfaces

The following surfaces are valid, but should not be permanently visible in the main shell:

- Dialog Viewer
- Delivery Surface
- Pruefstand
- Technische Details
- Context / Continuity Notes

Rule:

- no task -> hidden
- single_specialist -> minimal disclosure
- pipeline -> selectively available

The current always-there approach is rejected.

## Design Rules

### Visual Hierarchy

- Maya stage first
- contextual infrastructure second
- operator internals third

### Empty Space

Large empty dark areas are only acceptable if they are deliberate stage breathing space.

They are not acceptable when caused by:

- fixed rails with low-value content
- panels remaining visible with no relevant task
- layout columns that stay open without content

### Borders And Contours

This is explicit because it is currently too weak in parts and was weak in the external HTML preview.

Contours must be visibly legible.

Rules:

- primary card borders must be clearly readable against the dark background
- do not rely on barely visible translucent lines
- active states need stronger border contrast than resting states
- section separation must still be visible at normal laptop brightness

Minimum intent:

- standard borders should feel deliberate, not ghosted
- active borders should feel unmistakable
- structural containers should remain visible even when content is sparse

Practical implication:

- prefer stronger border contrast and slightly more solid panel separation over ultra-subtle "luxury dark UI" outlines

### Language

The Builder UI is fully German.

No mixed language shell such as:

- `Task Detail`
- `Delivery Surface`
- `Context`
- `Live Tribune`

next to German labels.

The shell should speak one consistent language.

### Encoding

No mojibake strings.

Examples to avoid:

- `OberflÃ¤che`
- `Pruefstand` next to umlauted German elsewhere

Use either:

- correct German characters

or, if needed during development:

- consistent ASCII transliteration

but not accidental mixed encoding.

## Current -> Future Replacement Table

| Current | Future |
| --- | --- |
| Large `Builder Studio` hero zone | slim topbar |
| permanent action button row | reduced topbar controls or contextual drawer actions |
| permanent pool cards | visible only in pipeline mode |
| global session banner | integrated into pipeline stage or removed |
| fixed task list panel | sidebar entry |
| fixed file explorer panel | sidebar or drawer entry |
| fixed right-side task detail rail | contextual drawer |
| prominent manual task creation form | removed from primary shell, optional advanced path only |
| always-visible tribune | pipeline-mode primary surface only |
| always-visible delivery surface | contextual surface |
| always-visible pruefstand | contextual surface |
| always-visible technical details | contextual surface |
| always-visible continuity notes | inbox / notes entry behind sidebar or drawer |

## Mode-Based Visibility Matrix

### Default

Visible:

- topbar
- greeting / chips
- Maya composer
- collapsed sidebar

Hidden:

- tribune
- team strip
- operator controls
- evidence panels
- task creation rail

### Single-specialist

Visible:

- topbar
- user message
- specialist banner
- Maya response
- composer

Optional:

- lightweight contextual details

Hidden:

- full pipeline tribune
- six-pool activity strip
- broad evidence machinery

### Pipeline

Visible:

- topbar
- user message
- pipeline banner
- tribune
- active team surface
- contextual drilldowns when requested

## First Implementation Slice After Approval

The first implementation slice should be shell surgery, not polish.

Recommended order:

1. remove hero zone
2. introduce collapsible left sidebar shell
3. remove fixed right-side manual task creation from the primary screen
4. make default state chat-first
5. gate pipeline-specific surfaces behind active pipeline mode

Do not start with:

- color tuning
- motion
- icon refinement
- micro-spacing

## Risks

1. keeping the current panel tree and only hiding some cards will still preserve the wrong mental model
2. rebuilding too literally around current component names may keep operator semantics too visible
3. over-subtle borders will again make the dark shell feel muddy and unfinished
4. if model configuration is over-specified before backend truth is aligned, the drawer may drift from real options

## Open Questions

1. should task history open as a sidebar view or a drawer view
2. should patrol remain a separate route or become an integrated sidebar section
3. how much of file exploration remains first-party vs on-demand
4. which contextual surfaces deserve drawer treatment first after the shell rebuild

## Acceptance Criteria

This spec is acceptable if it clearly defines:

- the three-zone shell
- the three user experience modes
- chat-first default state
- removal of manual task creation from the primary shell
- contextualization of secondary panels
- stronger, intentional contour rules
- a concrete `current -> future` replacement table
- a realistic first rebuild slice

