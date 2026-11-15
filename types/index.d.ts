// The panel's contract: what the Visibility Coach panel shows, and where
// it comes from. Display data only. No method, scoring or playbook text
// belongs here or anywhere else in this repository.
//
// The server sends `CoachPanel` as a `panel` object on the result of
// `start_here` (as `structuredContent.panel`, or as a top-level `panel` key
// when the result is JSON text). Every field is optional: the panel draws
// what it is given and an honest empty state for the rest.
//
// The panel is one card: one number, one next step, one line for what is
// waiting. Anything more is asked for in the chat.

/** One line of the first check: how the business looks to anyone today. */
export type CoachCheck = {
  /** "Google search" */
  label: string
  state: 'good' | 'fix'
}

/** The one number the owner cares about, read as a sentence:
 * "14" + "calls from Google this month". */
export type CoachResult = {
  /** "14" */
  value: string
  /** What follows the value: "calls from Google this month". */
  label: string
  /** The comparison in words, never a bare symbol: "3 more than last month". */
  change?: string
  /** Colors the comparison. The words carry the meaning on their own. */
  tone?: 'good' | 'bad' | 'neutral'
  /** The value at the first check, so progress has a starting point: "9". */
  start?: string
}

export type CoachPlan = {
  state: 'active' | 'grace' | 'ended' | 'none'
  /** Where to buy or renew. https only. */
  buyUrl?: string
}

export type CoachPanel = {
  business?: string
  /** Mentioned only when it needs the owner's attention. */
  plan?: CoachPlan
  /** The first check, taken from the website address alone. It is the
   * headline until there is a result to show instead. */
  standing?: CoachCheck[]
  /** The one number. One, not a dashboard. */
  result?: CoachResult
  /** The one thing to do next. One, not a list. */
  next?: { title: string; minutes?: number }
  /** How many drafted changes are waiting for the owner's yes. */
  waiting?: number
  /** ISO date of the next weekly check-in; absent when there is none. */
  checkIn?: string
  /** When this was read, ISO. Set by the panel, not the server. */
  asOf?: string
}

/** How the connection to the coach stands. */
export type CoachLink = 'on' | 'sign-in' | 'off' | 'missing' | 'error' | 'unknown'

declare module 'claude-code' {
  interface PluginState {
    'visibility-coach': {
      panel: Shaped<CoachPanel | null>
      coach: Shaped<CoachLink>
      isExample: boolean
      isSigningIn: boolean
    }
  }
}
