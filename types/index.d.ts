// The card's contract: what the Litmark card shows, and where
// it comes from. Display data only. No method, scoring or playbook text
// belongs here or anywhere else in this repository.
//
// The server sends `CoachPanel` as a `panel` object on the result of
// `start_here` (as `structuredContent.panel`, or as a top-level `panel` key
// when the result is JSON text). Every field is optional: the panel draws
// what it is given and an honest empty state for the rest.
//
// The card is a display: the owner talks to Litmark in the chat. It answers
// three questions: is it working (one number), how healthy am I (one line),
// what happens next and why (one step). Anything more is asked for in the
// chat.

/** One line of visibility health: how the business looks to anyone today. */
export type CoachCheck = {
  /** "Google search" */
  label: string
  state: 'good' | 'fix'
}

/** Where a number was counted. A number that does not say is not drawn. */
export type CoachSource =
  /** Google Business Profile's own count. */
  | 'google-business'
  /** Google Search Console's own count. */
  | 'search-console'
  /** Google Analytics on the owner's website. */
  | 'analytics'
  /** Microsoft Clarity on the owner's website. */
  | 'clarity'
  /** Read off a screenshot the owner sent. */
  | 'screenshot'
  /** The owner said so. */
  | 'owner'

/** The one number the owner cares about, read as a sentence:
 * "14" + "taps on Call from Google this month". */
export type CoachResult = {
  /** "14". Counted, never estimated, and never two sources added up. */
  value: string
  /** What follows the value, naming exactly what the source counted:
   * "taps on Call from Google this month". A tap is not a call: say "calls"
   * only when the owner or a call log counted calls. */
  label: string
  /** Where it was counted. Required: without it the number is not drawn. */
  source: CoachSource
  /** ISO date of the last day the count covers. */
  through?: string
  /** The comparison in words, never a bare symbol: "3 more than last month".
   * Same source, same length of time on both sides. */
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
  /** Visibility health: each place a customer could find the business, and
   * whether it is in good shape. The first check fills it from the website
   * address alone. It is the headline until there is a result, then one
   * line under it. */
  standing?: CoachCheck[]
  /** The one number. One, not a dashboard. */
  result?: CoachResult
  /** The one thing to do next. One, not a list. `why` is one plain sentence
   * on how it gets the owner ahead: the panel teaches as it goes. */
  next?: { title: string; minutes?: number; why?: string }
  /** How many changes are live so far: the work done, as one number. */
  done?: number
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
    litmark: {
      panel: Shaped<CoachPanel | null>
      coach: Shaped<CoachLink>
      isExample: boolean
      isSigningIn: boolean
      /** Whether the owner has talked to Litmark yet. */
      hasBegun: boolean
    }
  }
}
