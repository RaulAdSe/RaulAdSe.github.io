---
title: "Supersonik<br/>Killing the Software Demo Game"
date: "2025-09-20"
excerpt: "• 9 months in stealth<br/>• $5M from a16z<br/>• Fortune 500 CEOs on speed dial<br/><br/>Coffee with the founders who just made 'Book a Demo' buttons obsolete"
author: "Raul Adell"
status: "published"
tags: ["startups", "enterprise", "demos", "barcelona", "a16z"]
---

------


Picture this: You want to try new software. You fill out a form. Wait 3 days. Schedule a call for next week. Sit through 45 minutes of someone screen-sharing who doesn't know if their product actually solves your problem.

It's 2025 and we're still doing demos like it's 1999.

Two Barcelona engineers looked at this and said: "This is stupid. Let's fix it."

Then they disappeared for 9 months.

## The Builders

![Coffee with Supersonik founders](/supersonik.jpeg)
*Post-coffee evidence. These guys are about to change how every B2B company does demos.*


Met Daniel Carmona and Pol Ruiz at their Barcelona office last week. Top floor, entire team in one room, that energy when people know they're building something that matters.

**Daniel** - Serial entrepreneur. Aerospace engineer turned founder. Previously built Aldara (Y Combinator S22, raised €2.7M). The kind of guy who automated a $15M import business just because manual processes annoyed him. Technical product-oriented beast. His superpower? Spotting inefficiencies and being physically unable to not fix them. 

**Pol** - Deep learning engineer who skipped classes at UPC to build real stuff. We actually have mutual friends from uni, but he did not really ever stepped into the classroom. When I asked about technical challenges, his eyes lit up. This guy dreams in WebRTC packets and latency measurements.

Their philosophy is simple: "If you want to build something great for a long time, solve a problem that personally pisses you off. The harder the problem, the greater the impact."

Software demos pissed them off.

## The 9-Month Sprint Nobody Saw Coming

While everyone was debating GPT wrappers, these two were in stealth mode building something actually hard.

The vision: What if your best sales engineer was available 24/7, spoke every language, never had a bad day, and could navigate your actual product in real-time?

Not a chatbot. Not a video recording. An AI agent that actually controls your software and shows prospects exactly what they need to see.

## I Built Their Product (Kinda) Over a Weekend

Before meeting them, I wanted to understand what they were actually doing. Found this beautiful repo [adriablancafort](https://github.com/adriablancafort/software-demo-realtime-voice-agent) and went deep.

Built a local prototype. Here's the actual architecture:

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser UI    │────►│  WebRTC      │────►│  Voice Agent    │
│  (localhost)    │◄────│  Transport   │◄────│   Pipeline      │
└─────────────────┘     └──────────────┘     └─────────────────┘
                                                       │
                              ┌────────────────────────┼────────────────────────┐
                              │                        │                        │
                        ┌──────▼──────┐       ┌────────▼────────┐      ┌────────▼────────┐
                        │  Deepgram   │       │     OpenAI      │      │    Cartesia     │
                        │    (STT)    │       │   GPT-4.1 (LLM) │      │     (TTS)       │
                        └─────────────┘       └─────────────────┘      └─────────────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │   Playwright    │
                                              │  Browser Auto   │
                                              └─────────────────┘
```

The stack:
- **Pipecat** for streaming AI pipelines (no request-response delays)
- **WebRTC** for sub-second latency (this is where most fail)
- **Playwright** for actual browser control
- **Deepgram/Cartesia** for voice (fastest STT/TTS combo out there)

Got my demo working locally. It was janky but functional.

Then Pol confirmed: "Yeah, that's not that far from our stack."

Then came the reality check: "But the real problems? Server geography, handling many concurrent demos, state management across sessions, integrating with every CRM on the planet..."

That's when I understood why they need engineers who've built real infrastructure.

## Two Weeks Out of Stealth: The Floodgates Open

They announced their $5M seed from a16z two weeks ago.

The response has been insane.

Not sales managers calling. Not VPs of Sales. **CEOs of Fortune 500 companies** are literally calling Daniel directly saying "we need this yesterday."

The pull is obvious when you think about it:
- 2/3 of internet consumption is in the US
- Every B2B SaaS company has this problem
- Buyers expect instant gratification (we're all ruined by B2C)
- Current demo-to-close conversion: 18-23%
- Time to first demo: 5.4 days average

Supersonik makes it instant.

## The Hard Lessons from Y Combinator

Asked them what they learned from their YC experience with Aldara.

"Two things," Daniel said. "First, know what you're good at and what makes you happy. I'm good at high-complexity technical problems that require smart teams. In real estate, you grow by hiring less qualified people. Made me miserable."

"Second," he continued, "if you're ambitious and capable, choose the hardest possible problem. It attracts the best talent, the biggest markets, and the most capital."

They could have built another CRUD app. Instead, they picked one of the hardest problems in enterprise software.

"Selling the technical challenges to engineers is trivial," Pol added. "Show them we're working at the edge of what's possible with real-time AI, and they're in."

## The Brutal Reality of Their Growth

Biggest bottleneck? People.

They need to 5x the team in three months. But not just any developers.

They're hunting for "Forward Deployment Engineers" - people with technical chops who can also sit with a Fortune 500 CTO, understand their problems, and configure solutions on the spot. Part engineer, part consultant, part magician.

## The Advice That Hit Different

End of our coffee. Asked them for advice for someone wanting to break into startups.

"Hazlo a tope."

Do it all the way. No half-measures. No hedging. 

"Look at early-stage companies with funding and ambitious projects. Don't go to places with processes. Don't go to places with mediocrity. Surround yourself with people who make you better."

They mentioned companies like Altan in Barcelona as examples of where hungry engineers should look.

"The people who go hardest get furthest, fastest. It's that simple."


## Walking Away From That Coffee

Left that meeting with one clear thought: These aren't first-time founders hoping to get lucky.

Daniel and Pol already did this dance with Aldara. Y Combinator 2022. Built it. Scaled it.  Sold it. They know exactly what it takes to go from zero to acquisition.

Now they're back. Same leading builders, bigger problem, way more ambitious.

This is what second-time founders look like when they've learned from round one: They pick harder problems. They move faster. They know exactly what kind of people to hire. They don't waste time on stuff that doesn't matter.

The software demo is dead. These guys killed it. And unlike most "disruptors," they've actually disrupted before.

<p class="normal">The takeaway? When engineers who've already won once decide to build again, pay attention. They're not experimenting anymore. They're executing.</p>
---

*P.S. - That GitHub repo I reverse-engineered? [Check it out](https://github.com/adriablancafort/software-demo-realtime-voice-agent). Building your own version is the best way to understand the magic.*

*P.P.S. - "Hazlo a tope" is now my default advice for everything.*

*P.P.P.S. - They're actively hiring Forward Deployment Engineers. If you can code AND talk to humans, slide into their DMs.*