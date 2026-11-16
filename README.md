# Litmark

Your own visibility agent, inside the Claude you already use.
It finds what stops the right customers from finding your business on Google and AI search.
Then, for each fix, you choose: it shows you how, step by step, or it does it for you.
Nothing goes live without your yes, and you can always see what was done and what happened.

You talk to it in Claude, the way you would talk to a person you hired. There is nothing to learn and nothing to set up beyond signing in.

## Show me, or do it for me

Every step can be done two ways. Just say which:

- **Show me how.** It teaches you one screen at a time: what to open, what to click, what you should see next. This works anywhere you use Claude, including the phone app.
- **Do it for me.** It does the step while you watch, then stops and shows you the exact result before anything is saved or published. This needs a Claude that can act for you on your computer: a connected website platform, Claude in Chrome, or computer use in the Claude desktop app. Which of these you have depends on your Claude plan and app.

It never types your passwords or sign-in codes, never pays for anything, and never writes or posts a review.

## Install

### Claude Code

```
/plugin marketplace add sameerch1b/visibility-coach-plugin
/plugin install litmark@litmark
```

Then run `/mcp`, pick `litmark`, and sign in.

### claude.ai and Cowork

Add it as a custom connector with this URL:

```
https://visibility-coach.vercel.app/mcp
```

- Pro and Max: Customize > Connectors > + Add > Add custom connector.
- Team and Enterprise: an owner adds it in Organization settings > Connectors, then members open Customize > Connectors and click Connect.

## Your card

You do everything by talking to Litmark in the chat. In Claude Code there is also a small card beside the chat, so you can see where things stand at a glance. Type `/litmark` to open it. It shows:

- **Is it working?** One number, such as taps on Call from Google this month, against last month and against where you started. Under it: where the number was counted and the last day it covers.
- **How healthy is my visibility?** One line: how many of the places customers look for you are in good shape.
- **What happens next, and why?** One step, about how long it takes, and one sentence on how it gets you ahead.
- **The work so far.** How many changes are live, and how many are waiting for your OK.

Before you have a result, your visibility health is the headline.

The card only displays. To get anything done, say it in the chat: "do it for me", "show me how", "what's waiting for my OK?". It reads no files, runs no programs and makes no network requests of its own; `claude plugin validate` on this folder lists everything it can call.

It also opens by itself, as a small card, the first time you use Litmark in a session. It never opens at start-up.

## Your numbers

You do not have to connect anything. Pick whichever is easiest:

- **Ask me**: answer one question at each weekly check-in.
- **Screenshot**: send a screenshot of your Google Business Profile performance page about once a month.
- **Connect**: connect your website platform or a reporting tool once, and it is automatic. Ask Litmark and it finds what your Claude can connect.

Every number is counted, never estimated, and the card will not show one that does not say where it came from. A number is named for exactly what was counted: a tap on your phone number is a tap, not a call. Only you, or a call-tracking number, know how many people actually rang.

### Microsoft Clarity

If you use Microsoft Clarity on your website, you can connect it:

1. In Clarity, open Settings, Data Export, Generate new API token.
2. In Claude Code, type `/plugin configure litmark` and paste the token.

The token is kept in your computer's secure storage and goes only to Microsoft's own Clarity server (`@microsoft/clarity-mcp-server`, which needs Node.js on your computer). If you leave it empty, Clarity never starts.

## Sign in

Enter your email and click the sign-in link we send you. No password.

## Cost

It runs on your own Claude plan. A Litmark plan unlocks the full coaching; Claude tells you how to get one the first time you use it.

## Privacy

We store your business profile and your work history only. Your own Claude does the reading and writing; our server never crawls your site.

## Start

Say "help me show up on Google" or "grill me" in any chat.

---

Unofficial, not affiliated with Anthropic.

The plugin in this repository is MIT licensed. The Litmark service, its playbooks and its coaching method are not in this repository and are not covered by that license.
