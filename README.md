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

In Claude Code, type `/coach`. A small panel opens beside the chat and shows, in this order:

- **Where you stand**: your first check, from your website address alone. Nothing to connect.
- **Next step**: the one thing to do now, and about how long it takes.
- **Waiting for your OK**: changes that are drafted. Nothing goes live without your yes.
- **Results**: up to three numbers, each compared with last time and with where you started, and each saying where it came from.
- **Done**: the latest changes that went live.
- **Connections**: what is connected, and a button to set up what is not.

It also opens by itself, as a small card, the first time you use the coach in a session. It never opens at start-up.

The panel only displays. It reads no files, runs no programs and makes no network requests of its own; `claude plugin validate` on this folder lists everything it can call.

## Your numbers

You do not have to connect anything. Pick whichever is easiest:

- **Ask me**: answer one question at each weekly check-in.
- **Screenshot**: send a screenshot of your Google Business Profile performance page about once a month.
- **Connect**: connect your website platform or a reporting tool once, and it is automatic. In the panel, press Set Up beside Your website or Google numbers and the coach finds what your Claude can connect.

## Optional extras

Neither is needed for coaching. Each is a separate company with its own account and cost.

- **Higgsfield** (photos and video). Listed with the plugin but off. In the panel, press Turn on beside Higgsfield, then sign in. On claude.ai and Cowork, add a custom connector with the URL `https://mcp.higgsfield.ai/mcp`.
- **21st.dev Magic** (page sections). Get a key at [21st.dev/mcp](https://21st.dev/mcp), then in Claude Code run `/plugin marketplace add 21st-dev/magic-mcp` and `/plugin install 21st`.

## Sign in

Enter your email and click the sign-in link we send you. No password.

## Cost

It runs on your own Claude plan. A Visibility Coach plan unlocks the full coaching; Claude tells you how to get one the first time you use it.

## Privacy

We store your business profile and your work history only. Your own Claude does the reading and writing; our server never crawls your site.

## Start

Say "help me show up on Google" or "grill me" in any chat.

---

Unofficial, not affiliated with Anthropic, Higgsfield or 21st.dev.

The plugin in this repository is MIT licensed. The Visibility Coach service, its playbooks and its coaching method are not in this repository and are not covered by that license.
