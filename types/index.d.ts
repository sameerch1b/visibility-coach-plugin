// The panel's contract: what the Visibility Coach panel shows, and where
// it comes from. Display data only. No method, scoring or playbook text
// belongs here or anywhere else in this repository.
//
// The server sends `CoachPanel` as a `panel` object on the result of
// `start_here` (as `structuredContent.panel`, or as a top-level `panel` key
// when the result is JSON text). Every field is optional: the panel draws
// what it is given and an honest empty state for the rest.

/** One line in a list: a change waiting for an OK, or one already done. */
export type CoachRow = {
  /** What it is, in the owner's words: "New home page title". */
  title: string
  /** Where or when, short: "Home page", "12 Nov". */
  note?: string
}

/** One line of the first check: how the business looks to anyone today. */
export type CoachCheck = {
  /** "Google search" */
  label: string
  /** "Not on the first page for 'emergency plumber Manly'." */
  finding: string
  state: 'good' | 'fix'
}

/** One result the owner cares about, in plain words. */
export type CoachResult = {
  /** "Calls this month" */
  label: string
  /** "14" */
  value: string
  /** The comparison in words, never a bare symbol: "3 more than last month". */
  change?: string
  /** Colors the comparison. The words carry the meaning on their own. */
  tone?: 'good' | 'bad' | 'neutral'
  /** The value at the first check, so progress has a starting point: "9". */
  start?: string
  /** Where the number comes from, in the owner's words: "your Monday answers". */
  source?: string
}

export type CoachPlan = {
  state: 'active' | 'grace' | 'ended' | 'none'
  /** ISO date the plan runs to; absent for a plan with no end. */
  until?: string
  /** Where to buy or renew. https only. */
  buyUrl?: string
}

export type CoachPanel = {
  business?: string
  website?: string
  plan?: CoachPlan
  /** The first check, taken before anything is connected. Shown until there
   * are results to show instead. */
  standing?: CoachCheck[]
  /** The one thing to do next. One, not a list. */
  next?: { title: string; minutes?: number }
  /** Changes drafted and waiting for the owner's yes. */
  waiting?: CoachRow[]
  /** Up to three results. */
  results?: CoachResult[]
  /** The latest changes that went live. */
  done?: CoachRow[]
  /** ISO date of the next weekly check-in; absent when there is none. */
  checkIn?: string
  /** When this was read, ISO. Set by the panel, not the server. */
  asOf?: string
}

/** How one connection stands. */
export type CoachLink = 'on' | 'sign-in' | 'off' | 'missing' | 'error' | 'unknown'

export type CoachLinks = {
  coach: CoachLink
  /** The owner's website platform: lets the coach publish what they approve. */
  site: CoachLink
  /** Anything that brings Google's own numbers in (calls, searches). */
  google: CoachLink
  higgsfield: CoachLink
  magic: CoachLink
}

/** Which connection's set-up steps are showing, if any. */
export type CoachSetup = keyof CoachLinks | null

declare module 'claude-code' {
  interface PluginState {
    'visibility-coach': {
      panel: Shaped<CoachPanel | null>
      links: Shaped<CoachLinks>
      now: string | null
      setup: CoachSetup
      isExample: boolean
    }
  }
}
