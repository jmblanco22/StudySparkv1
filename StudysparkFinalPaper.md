# StudySpark: Building an AI-Generated Learning Platform

*A project report on what it takes to make a large language model reliably teach.*

---

> **Note on placeholders:** Anywhere you see `[INSERT ...]`, that's a spot for you to drop in a code sample, a screenshot, or a diagram. I've written a description of exactly what goes there. Code blocks that are already filled in are pulled from the real project verify them against your current files before submitting, since a few may have drifted.

---

## 1. Introduction

*Audience: everyone. Job: introduce the project to a reader who has never seen it, and hook them with the central realization.*

StudySpark is a mobile-first web app that turns any topic into a personalized course. You type what you want to learn  "basic derivatives," "how to swing a golf club," "who was Nikola Tesla" and StudySpark generates a roadmap of ordered modules, writes a micro-lecture for every submodule, quizzes you on what you just read, and tracks your progress against other learners on a leaderboard. Every piece of educational content is generated on demand by a large language model.

The project began as user research, not code. My team interviewed six undergraduates about how they study, and the same thing kept surfacing: it's not that students don't want to learn it's that studying feels like one big, overwhelming, ambiguous task. Four findings shaped everything that followed: big tasks kill motivation, learning feels passive, visible progress builds momentum, and structure affects retention. StudySpark is an attempt to answer each of those with a feature.

When I started building, I thought the AI part was simple. You want the model to teach something, so you write a good prompt asking it to teach that thing. Prompt in, lecture out. I spent the first weeks learning how wrong that is.

Reliably generating educational content from an LLM is almost never a single prompt. It's *multiple* prompts. It's deciding what order those prompts run in, and what information each one is allowed to see. It's choosing what to make explicit versus what to leave for the model to infer. And sometimes it's not even a prompt at all sometimes you have to invent a little intermediate syntax that hands off from the LLM to an ordinary, non-AI search. The interesting work of building an AI product turned out to live in the *architecture around* the prompts, far more than in the wording of any one of them.

This report is about that architecture. It covers how StudySpark actually generates a micro-lecture, the specific things I got wrong and how I fixed them, and the general principles I'd hand to anyone building something similar.

---

## 2. The Tech Stack

*Audience: process managers deciding what to build with, and coders who want to reproduce it. Job: document every moving piece and why it's there.*

| Layer | Choice | Why it's here |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript) | API routes and pages in one codebase; server-side rendering for the parts that need it |
| Database & Auth | **Supabase** (Postgres + magic-link auth) | Row-level security out of the box, so a user can only ever read their own data |
| LLM gateway | **OpenRouter** → DeepSeek V4 Flash | One API key for many models; you swap models by changing a single string |
| AI SDK | **Vercel AI SDK** (`generateObject`, `generateText`) | Structured-output enforcement this is load-bearing, see §4 |
| Validation | **Zod** | Defines the exact shape the model must return, and validates it |
| Images | **Unsplash API** | Free stock photos, fetched server-side |
| Math & tables | **remark-math + rehype-katex + KaTeX**, **remark-gfm** | Renders LaTeX formulas and markdown tables inside lectures |
| Hosting | **Vercel** | Auto-deploys on every push to `main` |

Two stack choices are worth flagging for a process reader, because they weren't obvious going in.

First, **all AI runs server-side, in API routes, never in the browser.** This isn't a performance decision, it's a secrets decision. The API key that pays for model calls can never touch the client, or anyone could read it and spend your money. Every generation route lives behind the server boundary.

Second, **the model provider is deliberately abstracted behind OpenRouter.** DeepSeek V4 Flash is cheap and good enough for lectures, but the day it isn't, switching to a different model is a one-line change instead of a rewrite. If you're evaluating whether to build this way, that abstraction is the first thing worth looking up.

---

## 3. How StudySpark Generates a Micro-Lecture

*Audience: coders who want to implement this, and process managers who want to understand the shape of the pipeline. Job: show the actual mechanism not that I did something clever, but how to do it.*

Generating a single micro-lecture is not one model call. It's a pipeline of three stages, and each stage's output constrains the next. The most important design decisions are about *where* in that pipeline each decision gets made.

**[INSERT DIAGRAM:]**

### Stage 1 — Roadmap generation, where scope and visual-ness are decided

The roadmap route takes the raw topic and returns a structured set of modules and submodules. Two judgments happen *here*, at the very start, that matter enormously downstream.

**Scope.** Early on, asking StudySpark "how do I do addition" produced a five-module curriculum, because my prompt always asked for three to five modules. The fix was to make the model assess scope *before* producing structure:

```
First, judge the scope of what the learner asked for, and size the roadmap to match:
- A narrow, simple, or single-skill request → 1-2 modules with a few submodules.
- A moderate topic → 2-3 modules.
- A broad subject → 4-5 modules.
Match the structure to what was actually asked. Never inflate a small question into a large roadmap.
```

**Visual-ness.** Each submodule gets tagged, right here, as visual or not — meaning "can this be literally photographed, or is it abstract?" This one boolean is what later lets me avoid asking for images on a calculus lecture (see §5.2). The instruction:

```
- Set "visual" to true ONLY if this submodule teaches something that can be literally
  photographed: a physical object, material, tool, place, or a person performing a
  hands-on activity.
- Set "visual" to false for anything conceptual, mathematical, theoretical, or symbolic.
  When in doubt, use false.
```

The whole output is forced into a strict shape by a Zod schema (the mechanism §4 is about):

```ts
const roadmapSchema = z.object({
  topic: z.string(),
  modules: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      submodules: z.array(
        z.object({
          title: z.string(),
          summary: z.string(),
          visual: z.boolean(),   // decided upstream, used downstream
        })
      ),
    })
  ),
})
```

### Stage 2 — Lecture generation, adapted and conditional

The lecture route generates the actual teaching text for one submodule. It does three things at once: it adapts depth to the learner, it only offers figures when the submodule was flagged visual, and it emits math as LaTeX.

The figures instruction is *conditional* — it's only added to the prompt when `visual` is true. A model that is never told figures exist cannot invent one:

```ts
const figuresBlock = sub.visual
  ? `
FIGURES:
Where a visual would genuinely help, insert a placeholder on its own line, exactly:
[FIGURE: search query | caption]
- The query must name the ACTUAL physical thing being taught — the real object, tool,
  material, or activity. Never a metaphor or symbolic stand-in.
- Include 1-3 figures, placed inline next to the text they illustrate.
- If you can't name a concrete photographable subject, omit the figure.`
  : ''
```

The rest of the prompt reads the learner's original request and adapts tone, and instructs the model to write math in LaTeX rather than backticks:

```ts
prompt: `Write a concise micro-lecture on "${sub.title}" within the module "${mod.title}".
Context: ${sub.summary}

The learner's original request was: "${roadmap.content.topic}".
Adapt the depth and tone to that request. If it signals a beginner, explain simply with
everyday language and concrete examples. If it signals an advanced learner, go deeper and
assume fundamentals are known. If there's no signal, aim for a motivated beginner.

Format as markdown: use ## subheadings and end with a ## Key Takeaway section.
Length: 300–500 words.${figuresBlock}
For any mathematical expressions, use LaTeX syntax: wrap inline math in single dollar
signs and standalone equations in double dollar signs. Do NOT use backticks.`
```

Notice what the model *emits* for a figure: not an image, but a piece of intermediate syntax `[FIGURE: search query | caption]`. This is the hand-off point where the LLM stops and something ordinary takes over.

### Stage 3 — Figure resolution, where the LLM hands off to a plain search

The lecture is saved and returned with those `[FIGURE:…]` placeholders still in it. The text renders on the page *immediately*. Then, on the client, an effect finds every placeholder, resolves each into a real image in parallel, swaps it in, and re-caches the finished version so the next visit is instant:

```tsx
useEffect(() => {
  if (!lecture) return
  const figureRegex = /\[FIGURE:\s*([^|\]]+)\|\s*([^\]]+)\]/g
  const figures = [...lecture.content.matchAll(figureRegex)]
  if (figures.length === 0) return   // guard: after swapping, there are none left

  ;(async () => {
    const urls = await Promise.all(
      figures.map(async (f) => {
        try {
          const res = await fetch(`/api/image?query=${encodeURIComponent(f[1].trim())}`)
          const { url } = await res.json()
          return url as string | null
        } catch { return null }
      })
    )
    let updated = lecture.content
    figures.forEach((f, i) => {
      updated = updated.replace(f[0], urls[i] ? `![${f[2].trim()}](${urls[i]})` : '')
    })
    setLecture({ ...lecture, content: updated })
    // cache the finished version back
    fetch('/api/lecture/save-images', { method: 'PATCH', /* … */ })
  })()
}, [lecture?.content])
```

The `/api/image` route itself is a thin wrapper around Unsplash the point is that **the "AI" figure feature is 80% a plain keyword search.** The model's only job was to decide *where* a figure belongs and *what to search for*; a non-LLM API does the actual fetching.

This staged design text now, images later, finished version cached is also what made lectures fast. Originally the route generated text, then waited on every image, then returned everything; you stared at a spinner through the whole thing. Splitting the slow part off and streaming it in behind the already-visible text hid the wait.

---

## 4. Structured Output: Prove It, Don't Describe It

*Audience: coders. Job: make the single most important reliability technique concrete.*


## 5. The Iterations: Where It Went Wrong

*Audience: process/project people looking to take mistakes off their own to-do list, and impressive people who want to see genuine iteration. Job: show real failure states and the reasoning that fixed them.*

## 6. Principles

*Audience: process people and impressive people. Job: state the general lessons the specific failures add up to.*

## 7. What I'd Do Differently

*Audience: process people. Job: hand them mistakes to skip.*

## 8. What's Next — StudySpark 2

*Audience: me, and anyone funding a next phase. Job: the concrete to-do list.*

---

