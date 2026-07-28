# What Building an AI Study App Taught Me About Prompting
 
When I started building StudySpark, I thought prompting was about writing better instructions. Say what you want clearly enough, and the model does it. A few weeks of building AI-generated lectures taught me that's mostly wrong — or at least, it's the least interesting half of the story.
 
Here's the thing nobody told me: **my best prompting fixes weren't prompts at all.** Every hard problem I hit, I first tried to solve by wording the instruction more carefully. And I kept losing. The fixes that actually worked came from changing the structure *around* the prompt, not the prompt itself. This is the story of how I learned that, one failure at a time.
 
## First: stop hoping the AI formats things right
 
StudySpark turns any topic into a roadmap of modules, then generates a micro-lecture and a quiz for each one. The roadmap and quizzes need a strict shape — a list of modules, each with submodules; a quiz with exactly four questions and four options each. My first instinct was to *ask* for that shape in the prompt: "return JSON with these fields."
 
That works until it doesn't. The model returns an extra field, or wraps the JSON in a code fence, or drops a comma, and your app crashes trying to parse it.
 
The real fix was a Zod schema passed to the AI SDK's `generateObject`. Instead of asking for a shape and hoping, the schema *forces* it — the model's output is validated against a strict structure before my code ever touches it. If it comes back malformed, it fails loudly and immediately, not three screens later.
 
That was lesson one, and it reframed everything after: **if the problem is about format, fix it in code, not in the prompt.** Don't ask the model to be well-behaved. Make well-behaved the only option.
 
## The detour I had to throw away
 
For lectures on procedural topics — folding origami, tying a knot — I wanted diagrams. So I told the model to emit Mermaid, a text-based diagram syntax, and rendered it on the page.
 
It worked maybe one time in four. The rest of the time the model produced *almost*-valid Mermaid — a stray parenthesis in a label, a character that broke the parser — and the page showed "Syntax error in text."
 
I tightened the prompt. I gave it examples. I restricted it to the simplest possible syntax. The hit rate got a little better and stayed unreliable. Eventually I made a call I'm glad I made: I cut the feature entirely.
 
The lesson there is quieter but real: **some things the model just isn't reliable enough to do, and no prompt fixes that.** Knowing when to stop tuning and walk away is part of the skill. A feature that works 25% of the time in a live demo is worse than no feature.
 
## The metaphor problem, or: why you can't police the output
 
This is the one that actually taught me something.
 
I added images to lectures — the model marks where a figure should go with a `[FIGURE: search query | caption]` placeholder, and I fetch a real photo for it. For physical topics it was great. Then I opened a calculus lecture on "indeterminate forms" and found a photo of a **balance scale**.
 
The model had reasoned: indeterminate forms are about *ambiguity*, and a balance scale *represents* ambiguity. Technically photographable. Completely useless for studying.
 
So I added a rule: no abstract concepts, only concrete objects. Next abstract lecture, "the slope of a tangent line," gave me a photo of a **grassy hillside**. A hill has a slope. Loophole found.
 
I tightened again — banned metaphors, listed specific clichés (no lightbulbs for "ideas," no mazes for "complexity"). It helped. But I could feel what was happening: I was playing whack-a-mole against a model that *wanted* to illustrate and would always find one more clever substitution. Every rule I wrote, it routed around.
 
The fix wasn't a better rule. It was realizing I was fighting at the wrong layer.
 
Instead of trying to *catch* bad images after the model decided to make them, I moved the decision upstream. When StudySpark generates the roadmap — before any lecture exists — it now flags each submodule as visual or not: true only for things you can literally photograph, false for anything conceptual. Then, when I generate a lecture, I only include the figure instructions in the prompt *at all* if that flag is true.
 
A model that is never told figures exist cannot invent a metaphorical one. The whole class of problem vanished — not because I finally wrote the perfect rule, but because I stopped giving the model the chance to break it.
 
That's the sentence I'd tattoo on the inside of my eyelids: **constrain the input, don't police the output.**
 
## Teaching the model to judge before it generates
 
A smaller version of the same idea: I asked StudySpark "how do I do addition" and got a five-module curriculum on arithmetic. It padded a trivial question into a full course, because my roadmap prompt always asked for three to five modules.
 
The fix was to make the model *assess before producing*. The prompt now says, in effect: first judge the scope of what was asked — a tiny question gets one or two modules, a broad subject gets four or five — then build to match. Same instinct as the visual flag: put a judgment step in front of the generation step, rather than trying to correct the generation after the fact.
 
## Failing invisibly on purpose
 
One last principle that runs through all of it. AI-generated content will sometimes be broken — a bad diagram, an image search that returns nothing. The question is what the user sees when that happens.
 
My answer, everywhere, became: nothing. A Mermaid diagram that won't parse renders as empty space, not an error. An image search that finds no match drops the figure silently, leaving clean prose instead of a broken-image icon. The failure still happens; it just isn't *visible*. In a live demo, "one fewer picture" is invisible. "A red error box on screen" is not.
 
## The framework I wish I'd had on day one
 
If I could hand my past self one thing, it's a way to triage prompting problems:
 
- **Is it a *format* problem** — wrong shape, invalid structure? Fix it with a schema, not words.
- **Is it a *content* problem** — right shape, wrong substance? *That's* where prompt wording earns its keep.
- **Is it a "the model keeps finding loopholes" problem?** Stop writing rules. Move the decision upstream so the model is never offered the choice.
Most of my time went into the third category, and every time, I wasted a day on rule-writing before remembering the fix lived somewhere else entirely.
 
Prompting, it turns out, is less about being persuasive and more about being an architect — deciding what the model is even allowed to attempt. The best prompt is often the instruction you removed, because you moved the decision to where it belonged.
 
