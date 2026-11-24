# Nearmost

Your own visibility agent, inside the Claude you already use.
It finds what stops the right customers from finding your business on Google and AI search.
Then it makes each fix for you, once you approve it. Prefer to do it yourself? It shows you how, step by step.
Nothing goes live without your yes, and you can always see what was done and what happened.

You talk to it in Claude, the way you would talk to a person you hired. There is nothing to learn and nothing to set up beyond signing in.

## Get started

Three steps. About two minutes.

### 1. Add Nearmost to Claude

**claude.ai, the Claude desktop app, or the Claude app on your phone**

[Add Nearmost to Claude](https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Nearmost&connectorUrl=https%3A%2F%2Fmcp.nearmost.io%2Fmcp)

The link opens Claude's own "Add custom connector" box with Nearmost already filled in. Click **Add**. Adding it once makes it available on your computer and your phone.

On a Team or Enterprise plan, an owner adds it once for everyone with [this link](https://claude.ai/admin-settings/connectors?modal=add-custom-connector&connectorName=Nearmost&connectorUrl=https%3A%2F%2Fmcp.nearmost.io%2Fmcp). Each person then opens Customize > Connectors and clicks Connect.

**Claude Code**

```
/plugin install nearmost --marketplace sameerch1b/visibility-coach-plugin
```

### 2. Sign in

Click **Connect** when Claude offers it (in Claude Code, type `/mcp` and choose `nearmost`). Enter the email you bought Nearmost with and click the link we send you. There is no password.

### 3. Say hello

Start a new chat and say:

> help me show up on Google

Or [open Claude with that already typed](https://claude.ai/new?q=Help%20me%20show%20up%20on%20Google) and press send.

## Your first ten minutes

1. **A few questions about your business.** What you sell, where, and who to. One question at a time.
2. **A first check of where you stand.** How you look today on Google search, Google Maps, reviews and AI assistants. It needs only your website address.
3. **Your first fix.** The one change that would help most, with why it matters. You approve it, and Nearmost makes the change on your site.

Stop whenever you like. Next time, Nearmost picks up where you left off.

**In your first week**, connect Google Search Console: say "connect Google Search Console" and Nearmost walks you through it. It is Google's free tool and it is where your results are measured. The 90-day guarantee asks for it within your first 7 days, and for your first three approved fixes to be live within 30.

## What to say

You never need a command. These cover almost everything:

| Say | What happens |
|---|---|
| "What's next?" | Your next step, how long it takes, and why it matters |
| "Approve" | Nearmost makes the change you just saw on your site |
| "Show me how" | It walks you through the step one screen at a time |
| "Is this working?" | Your numbers: where they were counted, and how they compare with where you started |
| "What's waiting for my OK?" | Every change drafted and not yet approved |
| "I only have ten minutes" | The most useful thing that fits in ten minutes |

## You approve it, Nearmost makes it

Nearmost shows you each change exactly as it will appear. Say yes, and it makes the change on your site itself:

- **Built your site with Claude?** It edits your site's code (in Claude Code, or through a GitHub connection) and publishes it the way your site already publishes.
- **On WordPress, Shopify, Wix, Webflow or Squarespace?** It makes the change through that connection, or in your site's editor with Claude in Chrome.

Rather do it yourself? Say "show me how" and it walks you through one screen at a time. On the phone app, where Claude can't reach your site, it gives you the steps instead.

It never types your passwords or sign-in codes, never pays for anything, and never writes or posts a review.

## If something is not working

- **No sign-in email.** It arrives within a minute. Check your spam folder, and check you typed the email you bought Nearmost with.
- **It says you have no plan, and you have paid.** You signed in with a different email from the one on your receipt. Sign in again with that one.
- **Claude does not seem to know Nearmost.** Start a new chat. In claude.ai, click the **+** in the message box, choose Connectors, and check Nearmost is switched on.
- **It gives you steps instead of making the change.** That Claude cannot reach your site, as on the phone app. Use Claude Code, the Claude desktop app, or Claude in Chrome, or connect your site's GitHub or website platform to Claude.
- **Anything else.** Use the Contact page of the Nearmost store.

## Your card (Claude Code)

You do everything by talking to Nearmost in the chat. In Claude Code there is also a small card beside the chat, so you can see where things stand at a glance. Type `/nearmost` to open it. Before you have started it tells you how to sign in and what to say. After that it shows:

- **Is it working?** One number, such as taps on Call from Google this month, against last month and against where you started. Under it: where the number was counted and the last day it covers.
- **How healthy is my visibility?** One line: how many of the places customers look for you are in good shape.
- **What happens next, and why?** One step, about how long it takes, and one sentence on how it gets you ahead.
- **The work so far.** How many changes are live, and how many are waiting for your OK.

Before you have a result, your visibility health is the headline.

The card only displays. To get anything done, say it in the chat. It reads no files, runs no programs and makes no network requests of its own; `claude plugin validate` on this folder lists everything it can call.

It opens by itself, as a small card, the first time you use Nearmost in a session. It never opens at start-up. The first time after you install, one line tells you what to say to begin.

## Your numbers

You do not have to connect anything. Pick whichever is easiest:

- **Ask me**: answer one question at each weekly check-in.
- **Screenshot**: send a screenshot of your Google Business Profile performance page about once a month.
- **Connect**: connect your website platform or a reporting tool once, and it is automatic. Ask Nearmost and it finds what your Claude can connect.

Every number is counted, never estimated, and the card will not show one that does not say where it came from. A number is named for exactly what was counted: a tap on your phone number is a tap, not a call. Only you, or a call-tracking number, know how many people actually rang.

### Microsoft Clarity

If you use Microsoft Clarity on your website, you can connect it in Claude Code:

1. In Clarity, open Settings, Data Export, Generate new API token.
2. In Claude Code, type `/plugin configure nearmost` and paste the token.

The token is kept in your computer's secure storage and goes only to Microsoft's own Clarity server (`@microsoft/clarity-mcp-server`, which needs Node.js on your computer). If you leave it empty, Clarity never starts.

## Cost

It runs on your own Claude plan. A Nearmost plan unlocks the full coaching; Claude tells you how to get one the first time you use it.

## Privacy

We store your sign-in email, your business profile and your work history. Payments go through Shopify. Your own Claude does the reading and writing; our server never crawls your site. Full details: [privacy policy](https://mcp.nearmost.io/privacy).

---

Unofficial, not affiliated with Anthropic.

The plugin in this repository is MIT licensed. The Nearmost service, its playbooks and its coaching method are not in this repository and are not covered by that license.
