<div align="center">

# Studyspark ⚡ 
**Turning "I should study" into "I actually want to."**
 
An AI-powered study buddy. Give it a topic and it builds you a personalized roadmap, teaches each piece, quizzes you on it, and tracks how far you've come.
 
`Next.js 16` · `TypeScript` · `Supabase` · `OpenRouter` · `Tailwind v4` · `Vercel`
 
[Live Demo](https://studyspark-three.vercel.app) · [Devlog](#-devlog) · [Roadmap](#-roadmap)
 
</div>
<!-- 📸 IMAGE SLOT: hero shot — the home page with a generated roadmap open.
     Save to docs/images/hero.png and uncomment: -->
<!-- ![StudySpark home](docs/images/hero.png) -->
 
---
 
## 📑 Table of Contents
 
- [About](#-about)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Architecture](#-architecture)
- [Database Schema](#-database-schema)
- [How the AI Works](#-how-the-ai-works)
- [Points of Interest](#-points-of-interest)
- [Roadmap](#-roadmap)
- [Devlog](#-devlog)
---
 
## 🎯 About
 
StudySpark began as research, not code. Our team interviewed six undergraduates about how they actually study, and the same thing kept surfacing: it's not that people don't *want* to learn — it's that studying feels like one big, overwhelming, ambiguous task.
 
Four findings came out of that research, and every one of them is now a real feature:
 
| Research finding | How StudySpark answers it |
|---|---|
| Big tasks kill motivation | AI breaks any topic into a roadmap of bite-sized modules |
| Learning feels passive | Every submodule has a micro-lecture *and* a quiz |
| Visible progress builds momentum | Streaks, points, and a progress-colored UI |
| Structure affects retention | Modules are ordered so each builds on the last |
 
**The loop:** log in → generate a roadmap → open a submodule → read the AI lecture → take the quiz → earn points → climb the leaderboard.
 
---
 
## ✨ Features
 
- **🗺️ AI-generated learning roadmaps** — type any topic, get 3–5 ordered modules with bite-sized submodules
- **📖 AI micro-lectures** — every submodule expands into a 300–500 word markdown lesson, cached after first generation
- **📝 Auto-generated quizzes** — 4 multiple-choice questions drawn directly from the lecture content
- **✅ Server-side scoring** — answers are graded on the server, never in the browser
- **🔥 Streaks & points** — 10 pts per correct answer, consecutive-day streak tracking
- **🏆 Leaderboard** — ranked across all users via a `SECURITY DEFINER` Postgres function
- **🔐 Passwordless auth** — magic-link login with cookie-based sessions
- **💾 Saved history** — every roadmap persists to your account
---
 
## 📸 Screenshots
 
<!-- 📸 IMAGE SLOTS: drop your screenshots in docs/images/ and uncomment each block. -->
 
### Home — generate a roadmap
<!-- ![Home](docs/images/home.png) -->
*Type a topic, get a structured roadmap. Streak and points shown in green — the "visible progress" research finding, made literal.*
 
### Micro-lecture
<!-- ![Lecture](docs/images/lecture.png) -->
*Each submodule opens into an AI-written lesson in markdown, with a Key Takeaway section.*
 
### Quiz
<!-- ![Quiz](docs/images/quiz.png) -->
*Four questions generated from the lecture you just read. Scored server-side.*
 
### Leaderboard
<!-- ![Leaderboard](docs/images/leaderboard.png) -->
*Ranked by points. Your row is highlighted.*
 
---
 
## 🛠 Tech Stack
 
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript) | API routes + pages in one codebase |
| Database & Auth | **Supabase** (Postgres + magic link) | Row-level security out of the box |
| AI | **OpenRouter** → DeepSeek V4 Flash | One key, any model — swap by changing a string |
| AI SDK | **Vercel AI SDK** (`generateObject`, `generateText`) | Structured output enforcement |
| Validation | **Zod** | Forces AI responses into a valid shape |
| Styling | **Tailwind v4** (`@theme` tokens) | Single-source design system |
| Hosting | **Vercel** | Auto-deploys on push to `main` |
 
---
 
---
### Pages
 
| Path | What it is |
|---|---|
| `/` | Home — topic input, roadmap render, history, stats bar |
| `/login` | Magic-link login |
| `/learn/[roadmapId]/[moduleIndex]/[submoduleIndex]` | Micro-lecture view |
| `/learn/.../quiz` | Quiz + results |
| `/leaderboard` | Rankings |

 
## 🗄 Database Schema
 
| Table | Purpose | RLS |
|---|---|---|
| `roadmaps` | Generated roadmaps (`content` is jsonb) | Own rows only |
| `lectures` | Cached micro-lectures, unique per submodule | Own rows only |
| `quizzes` | Cached quizzes, unique per submodule | Own rows only |
| `quiz_attempts` | Every scored attempt — source of truth for streaks, points, **and** the leaderboard | Own rows only |
| `profiles` | Display names, auto-created on signup by trigger | Public read |
 
---
 
## 🤖 How the AI Works
 
All AI runs **server-side in API routes** — never in the browser. Three prompts, one model (`deepseek/deepseek-v4-flash` via OpenRouter).
 
### 1. Roadmap — `app/api/roadmap/route.ts`
 
> *Create a structured learning roadmap for someone who wants to learn "{topic}". Break it into 3-5 modules, ordered so each builds on the previous. Each module has 2-4 bite-sized submodules. Keep titles short and every description to one sentence.*
 
Uses `generateObject` with a **Zod schema** that forces the shape: `topic` → `modules[]` → `submodules[]`.
 
### 2. Micro-lecture — `app/api/lecture/route.ts`
 
> *Write a concise micro-lecture on "{submodule}" within the module "{module}". Format as markdown: use `##` subheadings, bullet points where helpful, and end with a `## Key Takeaway` section. Length: 300–500 words.*
 
Uses `generateText` — prose has no rigid shape, so control lives entirely in the prompt wording.
 
### 3. Quiz — `app/api/quiz/route.ts`
 
> *Based on the following study material, generate exactly 4 multiple-choice questions to test understanding. Each question must have exactly 4 options and one correct answer. Make questions test genuine comprehension, not just recall of exact wording.*
 
Uses `generateObject` + Zod (`.length(4)` on both questions and options). **The lecture content is fed in as the source material** — so a student who read the lecture can answer every question.
 
### Acceptance criteria
 
How we decide an AI output is *valid*:
 
| Output | Valid if… |
|---|---|
| **Roadmap** | On-topic; modules in true prerequisite order; no duplicate submodules; nothing vague |
| **Lecture** | Teaches *that* submodule; factually correct; correct markdown structure; beginner-readable |
| **Quiz** | Every question answerable **from the lecture**; exactly one defensibly correct answer; distractors plausible but wrong; tests understanding, not word-matching |
 
**The one rule:** each stage must be faithful to the stage that fed it. *Roadmap faithful to the topic → lecture faithful to the submodule → quiz faithful to the lecture.* Drift at any stage = invalid.
 
---
 
## 💡 Points of Interest
 
Things worth reading the code for:
 
**🔒 Structured output, not hope.** `generateObject` + a Zod schema means the model's response is *validated against a strict shape* before it's used. No parsing free-form text and praying it's valid JSON. If the model returns something malformed, it fails loudly instead of silently breaking the UI.
 
**⚡ Cache-first AI.** Every AI route checks the database before calling the model. Generate once, serve from Postgres forever after. This is why lectures load instantly on a second visit — and why the whole app costs pennies to run.
 
**🧮 AI creates; math counts.** Scoring, streaks, and rankings are deterministic database logic with **zero AI involvement**. The parts you have to trust can't hallucinate. That separation is deliberate.
 
**🍪 Cookie-based auth, done properly.** Two Supabase clients (browser + server) sharing one cookie session, with middleware refreshing it on every request. This is the fix for the classic *"the callback sets a session but the page can't see it"* bug.
 
**🎨 A design system, not scattered colors.** `globals.css` defines every color once as a Tailwind `@theme` token. The palette is grounded in color-and-learning research: **neutral base** (low distraction), **blue** for focus and productivity, **green** for progress — mapping directly onto the "visible progress builds momentum" research finding.
 
**🛡️ `SECURITY DEFINER` for the leaderboard.** RLS means users can only read their own rows — which makes a leaderboard impossible by default. The `get_leaderboard()` function runs with elevated privileges to aggregate across users *without* exposing anyone's individual data.
 
---
 
## 🗺 Roadmap
 
- [ ] **AI tutor chat** — ask follow-up questions inside any lecture ("explain this with a real-world analogy")
- [ ] **Visual aids** — fetch relevant images per submodule, for topics where seeing beats reading (origami folds, a golf grip)
- [ ] **Full Figma-to-component redesign**
- [ ] **PWA install** — home-screen install on mobile
- [ ] Note scanner, offline mode, spaced repetition *(deliberately out of scope for v1)*
---
 
## 📓 Devlog
 
<!-- 📸 Drop weekly screenshots into docs/images/ and reference them inside each week. -->
 
### Week 0 — The research
 
<!-- ![Figma prototype](docs/images/figma-prototype.png) -->
 
StudySpark started as a prototype in my User Experience Design, Prototyping, and Evaluation class.
 
Over the last few months my team and I worked on the idea and UI design of an app called StudySpark. It started after we interviewed some of our fellow peers about their study habits. One thing stood out: most students know they should study, they *want* to do it, but when they actually sit down — it just doesn't click. Learning often feels passive, repetitive, and honestly kind of draining.
 
So we set out to understand why students struggle to engage with learning outside of class, and to build a tool that would increase engagement and retention.
 
Four findings shaped everything that followed:
 
**Bite-sized sessions.** Think Duolingo, Mimo, Quizlet, Anki. Everyone we interviewed consistently reported that large tasks like studying feel daunting, which kills motivation. Our design breaks work into short, manageable sessions.
 
**Visible progress.** Students said they were more motivated when they could see advancement. So we focused on clear progress indicators and milestone feedback. In a user sense, it's great to see your progress — and on the business side, it's what keeps users coming back, because they're "winning."
 
**An engaging experience.** Studying felt passive and repetitive to our peers. The design needed to make learning interactive, stimulating, and rewarding.
 
**Clear content structure.** How material is presented directly affects focus and retention.
 
To summarize: an app that lets you learn in bite-sized sessions, with visible progress, in a clear structure, that keeps you engaged.
 
At the end of this phase we had a Figma prototype, a clear vision, and **no working app.**
 
---
 
### Week 1 — Foundations, and one very stubborn bug
 
<!-- ![First deploy](docs/images/week1-auth.png) -->
 
Scaffolded Next.js, pushed to GitHub, and had a blank app live on Vercel the same night. The professor's advice was blunt and correct: **deploy first, before you build anything.** It's much easier to keep a deployed app working than to deploy a finished one.
 
Then came magic-link auth — and the bug that ate the week. Clicking the link kept landing me on the Supabase domain with `{"error":"requested path is invalid"}`. Two causes, stacked: localhost wasn't in Supabase's redirect allowlist, *and* the auth callback was storing the session in a cookie while the home page was looking for it in localStorage. It said I was logged out while I was, in fact, logged in.
 
The fix was migrating fully to `@supabase/ssr` — a browser client, a server client, and middleware to refresh the session cookie on every request. Auth has been rock-solid since.
 
**Learned:** when a login "works" but bounces you back to the login page, suspect a session *storage* mismatch, not the login itself.
 
---
 
### Week 2 — The heart of the app
 
<!-- ![First roadmap](docs/images/week2-roadmap.png) -->
 
Built the AI core loop. A topic goes to a server-side API route, DeepSeek (via OpenRouter) returns a structured roadmap, Zod validates the shape, and it saves to Postgres.
 
The first `curl` that came back with a real roadmap — modules, submodules, in a sensible teaching order — was the moment this stopped being a class project and started being an app.
 
One thing that made me laugh: I typed **"Basic Derivatives"** expecting calculus, and got a *finance* roadmap — forwards, futures, Black-Scholes. Not a bug. "Derivatives" is genuinely ambiguous, and the model picked the more common standalone meaning. Good lesson in how much the prompt's specificity matters.
 
**Learned:** `generateObject` + a Zod schema turns "hope the AI returns clean JSON" into "guaranteed valid shape or a loud error."
 
---
 
### Week 3 — From an outline to an actual lesson
 
<!-- ![Micro-lecture](docs/images/week3-lecture.png) -->
 
Made submodules clickable. Each one now opens into an AI-written micro-lecture in markdown — and gets cached in Postgres, so the second visit is instant and free.
 
This is the week StudySpark went from *a list of topics* to *a place you actually learn something.*
 
---
 
### Week 4–5 — Quizzes, streaks, points, leaderboard
 
<!-- ![Quiz results](docs/images/week4-quiz.png) -->
 
Quizzes generate from the lecture content itself, so you're always tested on exactly what you just read. Scoring happens **server-side** — the browser never sees the answer key.
 
Then streaks and points (10 per correct answer), and a leaderboard built on a `SECURITY DEFINER` Postgres function, which is the only way to aggregate scores across users when row-level security means everyone can normally only see their own rows.
 
At the end of this stretch, the full loop worked end to end: **log in → roadmap → lecture → quiz → points → rank.**
 
---
 
### Week 6 — Making it not look like a prototype
 
<!-- ![Before and after](docs/images/week6-colors.png) -->
 
Function was done; it looked like a wireframe. Rather than pick colors I liked, I grounded the palette in color-and-learning research: green boosts concentration and reads naturally as progress, blue supports focus and productivity, and vibrant colors should accent rather than dominate — balanced by neutrals.
 
That translated into a design system in `globals.css`: neutral base, **blue for focus** (buttons, links), **green for progress** (streaks, points), warm accent used sparingly. Every color has a reason, and the green streak counter is our "visible progress" research finding rendered literally on screen.
 
Also spent an embarrassing amount of time on a production 500 (`MIDDLEWARE_INVOCATION_FAILED`) before realizing I'd been configuring **the wrong Vercel project** the entire time. The env vars were fine. They were just on a different app.
 
**Learned:** a green "deployed" checkmark does not mean the app works. Environment variables live in the host, not the repo — and a build can succeed while every feature quietly fails.
 
---
 
### What's next
 
<!-- ![What's next](docs/images/whats-next.png) -->
 
An AI tutor chat inside every lesson. Visual aids for topics where seeing beats reading. The full Figma design brought to life. Home-screen install.
 
A wall of notes is not a study plan. Your phone shouldn't just distract you — it should help you learn.
 
**Built from real research. Built solo. Just getting started.**
 
---
 
<div align="center">
*StudySpark — a project by Jose Blanco*
 
</div>
 



















































