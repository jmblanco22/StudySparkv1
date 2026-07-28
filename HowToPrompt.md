# What Building an AI Study App Taught Me About Prompting
 
The idea I had when I began building StudySpark was that prompting was about improving my instructions. Just make sure that you say what you mean and the model will do it for you. Weeks spent developing machine learning lectures proved me that the vast majority of the time, this notion is false or, at least, this approach only touches upon half of the truth.

The most important thing I have learned but no one told me back then was that all of my **best prompting solutions were not actually the solutions to the prompts.** Whenever there was something wrong, I would try to resolve the issue by adjusting my instructions and failed every single time.
 
## First: stop hoping the AI formats things right
 
StudySpark takes any subject and creates a roadmap for you consisting of modules and creates a micro-lecture and a quiz for each module. Roadmap and quizzes have to be of a specific structure: a list of modules each having sub-modules; quiz containing four questions each with four options. My initial reaction was to *tell* the model what structure I needed in the prompt:
"return JSON containing these fields"

It will work till it doesn't because sometimes the model returns an additional field or adds a code fence or leaves out a comma.
 
In reality, the solution was the Zod schema that was sent to the generateObject function of the AI SDK. Rather than requesting a shape and hoping for the best, the schema *guarantees* the shape – the output of the model is checked against a specific schema before being accessed by my code.
 
That was lesson one, and it reframed everything after: **if the problem is about format, fix it in code, not in the prompt.** Don't ask the model to be well-behaved. Make well-behaved the only option.
 
## The detour I had to throw away
 
For procedural lectures about folding origami and tying knots, I needed diagrams. Thus, I prompted the model to output Mermaid, a diagramming syntax language expressed in text format, and rendered the diagrams on the page.

It did what I wanted only once out of every four attempts. The rest of the time, the model returned Mermaid that was *almost* valid, a stray parenthesis here or a character that crashed the parser, and displayed the message "Syntax error in text" on the page.

I tightened my prompts and added examples, and still only sometimes did I get the results I wanted. At some point, I made a decision I'm happy I made: I decided to abandon the feature.

This one is a more subtle lesson: **there are things a language model simply isn't reliable enough to accomplish, no matter how much you prompt it.** It's part of the craft to know when to stop prompting and give up. A feature that works 25% of the time is worse than no feature.
 
## The metaphor problem, or: why you can't police the output
 
I started putting pictures into lectures; the model left placeholders for a figure to go in, something like `[FIGURE: search query | caption]`, and I went out and found a picture for it. This was great for physical topics. I opened up a calculus lecture on "l'hopital's rule" and got a picture of a **balance scale**.
 
The reasoning went like this: L'Hôpital's rule is about resolving ambiguous limits, and a balance scale symbolizes ambiguity. Photographable, and completely useless for teaching.
 
So I added a rule: only concrete objects, no abstract concepts. And for the next abstract lecture I tried, "slope of a tangent line," I got a picture of a **grass-covered hillside**. "Hill has a slope." I had been outsmarted by a loophole.
 
And so I tightened the rules; banned metaphorical concepts, made a list of common metaphors to ban (no light bulbs for "ideas," no mazes for "complexity"). And it helped, but I could feel it was going to happen; I was playing whack-a-mole against a model that *wanted* to illustrate and would always have another loophole.
 
The problem wasn’t with a better rule. It was with understanding that I was fighting the battle at the wrong level.
 
Rather than try to *detect* bad figures after the model made them, I decided to decide at an earlier point. Prior to generating a lecture, when StudySpark creates the roadmap (prior to the existence of any lecture), it designates whether the submodule is “visual” or not – only true for things literally able to be photographed, false otherwise. And then, when I generate a lecture, I add the figure instruction into the prompt at all only if the latter holds.
 
A model that has never been told about the existence of figures cannot devise metaphorical figures. Entire categories of the problem disappeared – not through finally writing the perfect rule but rather by not giving the model the opportunity to violate it.
 
That’s the sentence I’d have tattooed on the inside of my eyelids: **constrain the input, not the output.**
 
## Teaching the model to judge before it generates
 
An even smaller instance of the same thing: when I asked StudySpark "how do I do addition," I received a five module curriculum about arithmetic. It took an incredibly simple request and turned it into a curriculum because my roadmap prompt always asked for three to five modules.

How to fix it? Get the model to *evaluate before outputting*. The prompt now states, effectively, that the first step is to evaluate how broad the request is and give a proper number of modules based on that either one or two for a small request and four or five for a larger one. The same intuition as the visual prompt but applied slightly differently: put an evaluation step before the output step rather than the other way around.
## Failing invisibly on purpose
 
And one more principle running throughout it all. Sometimes AI-generated content will be flawed that could be a misaligned diagram, a failed image search resulting in a blank slate. And the issue comes down to what the user is shown when this takes place.
 
And my response to that, everywhere, was: nothing at all. A Mermaid diagram that doesn't parse simply fails as blank space; not an error message. An image search that produces no results is simply stripped of the image. The failure happens, but it doesn't happen *visibly*. In a demo, for instance, "one less image" is invisible. "An error message in red" is not.
 
## The framework I wish I'd had on day one
 
If I could hand my past self one thing, it's a way to triage prompting problems:
 
- **Is it a *format* problem** — wrong shape, invalid structure? Fix it with a schema, not words.
- **Is it a *content* problem** — right shape, wrong substance? *That's* where prompt wording earns its keep.
- **Is it a "the model keeps finding loopholes" problem?** Stop writing rules. Move the decision upstream so the model is never offered the choice.
Most of my time went into the third category, and every time, I wasted a day on rule-writing before remembering the fix lived somewhere else entirely.
 
Prompting, it turns out, is less about being persuasive and more about being an architect — deciding what the model is even allowed to attempt. The best prompt is often the instruction you removed, because you moved the decision to where it belonged.
 
