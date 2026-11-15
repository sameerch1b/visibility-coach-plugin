# Visibility Coach

Help the right customers find your business on Google and AI search.
Claude reads your site, tells you what to improve and why, and drafts the changes.
You approve each change, and you can always see what was done and what happened.

## Install

### Claude Code

```
/plugin marketplace add sameerch1b/visibility-coach-plugin
/plugin install visibility-coach@visibility-coach
```

Then run `/mcp`, pick `visibility-coach`, and sign in.

### claude.ai and Cowork

Add it as a custom connector with this URL:

```
https://visibility-coach.vercel.app/mcp
```

- Pro and Max: Customize > Connectors > + Add > Add custom connector.
- Team and Enterprise: an owner adds it in Organization settings > Connectors, then members open Customize > Connectors and click Connect.

## Your panel

In Claude Code, type `/coach`. One small card opens beside the chat. It answers three questions:

- **Is it working?** One number, such as taps on Call from Google this month, against last month and against where you started. Under it: where the number was counted and the last day it covers.
- **How healthy is my visibility?** One line: how many of the places customers look for you are in good shape. Press it and the coach walks you through each one.
- **What do I do next, and why?** One step, about how long it takes, and one sentence on how it gets you ahead. Below it, anything waiting for your OK. Nothing goes live without your yes.

Before you have a result, your visibility health is the headline. For anything else, ask in the chat.

It also opens by itself, as a small card, the first time you use the coach in a session. It never opens at start-up.

The panel only displays. It reads no files, runs no programs and makes no network requests of its own; `claude plugin validate` on this folder lists everything it can call.

## Your numbers

You do not have to connect anything. Pick whichever is easiest:

- **Ask me**: answer one question at each weekly check-in.
- **Screenshot**: send a screenshot of your Google Business Profile performance page about once a month.
- **Connect**: connect your website platform or a reporting tool once, and it is automatic. Ask the coach and it finds what your Claude can connect.

Every number is counted, never estimated, and the card will not show one that does not say where it came from. A number is named for exactly what was counted: a tap on your phone number is a tap, not a call. Only you, or a call-tracking number, know how many people actually rang.

### Microsoft Clarity

If you use Microsoft Clarity on your website, you can connect it:

1. In Clarity, open Settings, Data Export, Generate new API token.
2. In Claude Code, type `/plugin configure visibility-coach` and paste the token.

The token is kept in your computer's secure storage and goes only to Microsoft's own Clarity server (`@microsoft/clarity-mcp-server`, which needs Node.js on your computer). If you leave it empty, Clarity never starts.

## Sign in

Enter your email and click the sign-in link we send you. No password.

## Cost

It runs on your own Claude plan. A Visibility Coach plan unlocks the full coaching; Claude tells you how to get one the first time you use it.

## Privacy

We store your business profile and your work history only. Your own Claude does the reading and writing; our server never crawls your site.

## Start

Say "help me show up on Google" or "grill me" in any chat.

---

Unofficial, not affiliated with Anthropic.

The plugin in this repository is MIT licensed. The Visibility Coach service, its playbooks and its coaching method are not in this repository and are not covered by that license.
