# Usability Test Plan — Admin UI (Light-Story)

Date: 2026-08-10 · Status: ready for moderation · UI under test: restored route-based admin (AdminSidebar shell, Tổng Quan /admin/dashboard, Thống Kê Hạ Tầng /admin/analytics, CRUD pages)

## 1. Research Questions (testable)

| # | Question | Testable version |
|---|----------|------------------|
| RQ1 | Can staff trust the numbers? | Can a participant explain WHERE each Tổng Quan / Thống Kê number comes from (server vs demo) within 30s of being asked? |
| RQ2 | Can staff complete daily content work? | Can a participant find a comic by title and add a chapter in <5 min without hints? |
| RQ3 | Can admins find governance features? | Can a superadmin locate audit logs and identify one action by a given user in <3 min? |
| RQ4 | Does the old UI cause confusion after the rollback? | Do participants attempt to use removed features (tabbed dashboard, operations center) and hit dead ends? |

## 2. Method

- **Moderated remote** (share-screen + think-aloud), 45–60 min per session
- **Participants: 5** (min 3 for core tasks): 1 superadmin/owner, 2 admin, 2 employee — real staff accounts, production data (real-data trust is part of what's being tested)
- Environment: preview deployment (staging data ok; note if empty R2/analytics skews perception)

## 3. Tasks (scenario → goal → success)

| # | Task | Scenario / Goal | Success criterion |
|---|------|-----------------|-------------------|
| T1 (warm-up) | "You're starting your shift as content manager." | Find the page that manages comics | Reaches /admin/comics without help |
| T2 (core) | "Check if we should worry about storage." | On Thống Kê Hạ Tầng, state current R2 usage, object count, and whether we're near the cap | Reads usage GB + objects; correctly interprets usage vs 10 GB cap |
| T3 (core) | "How many comics and chapters exist right now?" | On Tổng Quan, read live totals | States both numbers from the cards; says they look server-fresh |
| T4 (core) | "A reader says a comic has a broken cover." | Find the comic by title, open it, locate where its cover would be fixed | Opens the comic editor / finds cover field in <5 min |
| T5 (secondary) | "Who's our newest user?" | Find the newest account in the user list | Identifies newest user via list ordering/filter in <3 min |
| T6 (secondary, superadmin) | "Something changed a setting last night." | Find what changed and by whom | Opens audit log, filters, names one actor+action in <3 min |
| T7 (edge) | "Numbers look odd — refresh them." | On Thống Kê, refresh data | Uses the Làm mới button; understands it re-fetches from server |
| T8 (free) | "Explore anything that seems off." | Note anything broken/misleading | Recorded observations |

## 4. Success Metrics

| Metric | Target |
|--------|--------|
| Completion rate (T2–T6) | >80% |
| Time on task (T4, T6) | <2× expected |
| Error rate (wrong clicks, dead ends) | <15% |
| Trust: participant correctly names data source (T2/T3/T7) | 4/5 participants |
| Satisfaction (post-session SUS-style 1–5) | >4/5 |
| RQ4: abandoned-feature attempts | 0 critical |

## 5. Moderator Guide

**Intro (5 min):** "This is a test of the UI, not you. There are no wrong answers. Please think out loud — say what you're looking at and what you expect before you click."

**Non-leading prompts only:**
- "What are you looking for right now?" (not "are you looking for the settings button?")
- "What do you expect to happen if you click that?"
- After silence >15s: "What's going through your mind?"

**Post-task questions (per task):**
- "Was that easy or hard? What made it that way?"
- "Did anything surprise you?"

**Post-session (10 min):**
- "Which numbers on the dashboard would you trust, and which would you double-check?"
- "What did the old design do better?"
- "What would you change first?"

**Recording:** screen + audio, note per task: completion, time, errors, hesitations, quotes.

## 6. Report Format

Per finding: severity (4 critical / 3 major / 2 minor / 1 cosmetic) + task + evidence quote + recommendation. Prioritize: Frequency × Severity × Solvability.

Known caveats to state in the report: R2/analytics may show near-zero until real traffic flows; test accounts must have correct roles (audit = superadmin, settings = admin) or tasks T6/T7 are invalid.
