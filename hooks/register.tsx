// The Nearmost card: one small card beside the chat.
//
// It is a display. The owner talks to Nearmost in the chat, and nothing on
// the card is needed to get work done: it shows where things stand and what
// to say next. Its only presses are Sign In (before there is a connection),
// See an Example and a Renew link.
//
// It answers three questions: is it working (one number, with where it was
// counted), how healthy am I (one line), what do I do next and why (one
// step, done for the owner or taught to them). Everything else is asked for
// in the chat.
//
// Before there is anything to show it is the owner's way in: how to sign in,
// the one thing to say, and what happens in the first ten minutes.
//
// It only displays. It holds no method, no scoring and no playbook text: it
// mirrors the `panel` object the Nearmost server sends (the contract
// is ../types/index.d.ts). It reads no files, runs no processes and makes no
// network requests of its own; the one server call it makes is `start_here`,
// on the owner's own command, over the session's existing connection. It
// also keeps Microsoft's Clarity server from starting for an owner who has
// not set it up.
import { atom, read, update } from 'claude-code'
import type {
  ElementTable,
  EngineInterface,
  Register,
  RenderElement,
} from 'claude-code'

import type {
  CoachCheck,
  CoachLink,
  CoachPanel,
  CoachResult,
  CoachSource,
} from '../types'

type UI = Pick<ElementTable, 'Box' | 'Text' | 'Button' | 'Link'>

const PANE = 'coach'
const TITLE = 'Nearmost'
// The server's key in this plugin's .mcp.json.
const COACH = 'nearmost'
// Microsoft's Clarity server, the other key there. Optional.
const CLARITY = 'clarity'

// How each source is named to the owner. A number from anywhere else is
// not drawn: every number on the card says where it was counted.
const SOURCES: Record<CoachSource, string> = {
  'google-business': 'Google Business Profile',
  'search-console': 'Google Search Console',
  analytics: 'Google Analytics',
  clarity: 'Microsoft Clarity',
  screenshot: 'your screenshot',
  owner: 'what you told me',
}

// The three meanings a color may carry. Words always carry the meaning too.
const GOOD = 'success'
const WARN = 'warning'
const BAD = 'error'

// Change a tag when the value's fields change: it declines what an earlier
// version stored, which outlives a reload.
const panel = atom({ plugin: 'nearmost', key: 'panel' } as const, null, {
  shape: 'panel-4',
})
const coach = atom(
  { plugin: 'nearmost', key: 'coach' } as const,
  'unknown',
  { shape: 'coach-1' },
)
const isExample = atom(
  { plugin: 'nearmost', key: 'isExample' } as const,
  false,
)
const isSigningIn = atom(
  { plugin: 'nearmost', key: 'isSigningIn' } as const,
  false,
)
// Whether the owner has talked to Nearmost yet. Until they have, the card
// says how to begin; after, it gets out of the way.
const hasBegun = atom({ plugin: 'nearmost', key: 'hasBegun' } as const, false)

// Said once, the first time after installing.
const WELCOME = 'Nearmost is ready. Say "Nearmost, help me show up on Google" to begin.'

// Shown only on the owner's press, under a banner that says it is one.
const EXAMPLE: CoachPanel = {
  business: 'Harbour Plumbing',
  standing: [
    { label: 'Google search', state: 'good' },
    { label: 'Google Maps', state: 'good' },
    { label: 'Reviews', state: 'good' },
    { label: 'AI assistants', state: 'fix' },
  ],
  result: {
    value: '14',
    label: 'taps on Call from Google this month',
    source: 'google-business',
    through: '2026-11-12',
    change: '3 more than last month',
    tone: 'good',
    start: '9',
  },
  next: {
    title: 'Add the suburbs you serve',
    minutes: 10,
    why: 'Google shows you to people searching in the suburbs you name.',
  },
  done: 6,
  waiting: 2,
  checkIn: '2026-11-16',
}

// ---------------------------------------------------------------------------
// Reading what the server sent. Everything from outside is cut to size and
// drawn as plain text: never as markdown, a command or a prompt.

const field = (from: unknown, key: string): unknown =>
  typeof from === 'object' && from !== null
    ? (from as Record<string, unknown>)[key]
    : undefined

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  const line = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim()

  return line === '' ? undefined : line.slice(0, max)
}

const count = (value: unknown, max: number): number | undefined =>
  typeof value === 'number' && value >= 1 && value <= max
    ? Math.round(value)
    : undefined

const toChecks = (value: unknown): CoachCheck[] =>
  (Array.isArray(value) ? value.slice(0, 5) : []).flatMap(one => {
    const label = text(field(one, 'label'), 30)

    return label === undefined
      ? []
      : [{ label, state: field(one, 'state') === 'good' ? 'good' : 'fix' }]
  })

/** A number is kept only when it says where it was counted. */
const toResult = (raw: unknown): CoachResult | undefined => {
  const value = text(field(raw, 'value'), 12)
  const label = text(field(raw, 'label'), 50)
  const source = (Object.keys(SOURCES) as CoachSource[]).find(
    known => known === field(raw, 'source'),
  )

  return value === undefined || label === undefined || source === undefined
    ? undefined
    : {
        value,
        label,
        source,
        through: text(field(raw, 'through'), 30),
        change: text(field(raw, 'change'), 60),
        tone: (['good', 'bad', 'neutral'] as const).find(
          known => known === field(raw, 'tone'),
        ),
        start: text(field(raw, 'start'), 12),
      }
}

const toPanel = (raw: unknown, readAt: string): CoachPanel | undefined => {
  if (typeof raw !== 'object' || raw === null) {
    return undefined
  }

  const plan = field(raw, 'plan')
  const state = (['active', 'grace', 'ended', 'none'] as const).find(
    known => known === field(plan, 'state'),
  )
  const buyUrl = text(field(plan, 'buyUrl'), 300)
  const step = field(raw, 'next')
  const next = text(field(step, 'title'), 80)

  return {
    business: text(field(raw, 'business'), 60),
    plan:
      state === undefined
        ? undefined
        : { state, buyUrl: buyUrl?.startsWith('https://') ? buyUrl : undefined },
    standing: toChecks(field(raw, 'standing')),
    result: toResult(field(raw, 'result')),
    next:
      next === undefined
        ? undefined
        : {
            title: next,
            minutes: count(field(step, 'minutes'), 240),
            why: text(field(step, 'why'), 140),
          },
    done: count(field(raw, 'done'), 999),
    waiting: count(field(raw, 'waiting'), 99),
    checkIn: text(field(raw, 'checkIn'), 30),
    asOf: text(field(raw, 'asOf'), 40) ?? readAt,
  }
}

const parse = (json: string): unknown => {
  try {
    return JSON.parse(json)
  } catch {
    return undefined
  }
}

/** Finds the `panel` object in a tool result, however the server carried it. */
const findPanel = (result: unknown, modelText?: string): unknown => {
  const direct =
    field(field(result, 'structuredContent'), 'panel') ?? field(result, 'panel')

  if (direct !== undefined) {
    return direct
  }

  const blocks = field(result, 'content')
  const texts = [
    ...(Array.isArray(blocks) ? blocks.map(block => field(block, 'text')) : []),
    result,
    modelText,
  ]

  for (const one of texts) {
    if (typeof one === 'string' && one.includes('"panel"')) {
      const found = field(parse(one), 'panel')

      if (found !== undefined) {
        return found
      }
    }
  }

  return undefined
}

// ---------------------------------------------------------------------------
// The connection to the coach.

/** The tool's own name when it belongs to the coach's server, whatever name
 * that server runs under: this plugin's, or a connector the owner added,
 * under today's name or the one it had before. */
const coachTool = (tool: string): string | undefined => {
  const [, server = '', name] = /^mcp__(.+?)__(.+)$/.exec(tool) ?? []

  return /nearmost|visibility[-_ ]?coach/i.test(server) ? name : undefined
}

/** Whether a server about to join the session is the Microsoft Clarity entry
 * this plugin lists. Never the coach's own server, and never a Clarity the
 * owner added themselves. */
export const isOwnClarity = (
  e: { server: string; provider: { plugin: string } },
  plugin: string,
): boolean => e.provider.plugin === plugin && /(^|:)clarity$/.test(e.server)

const sense = async ($: EngineInterface): Promise<CoachLink> => {
  const tools = await $.tool.list()

  if (tools.some(tool => tool.mcp && coachTool(tool.name) !== undefined)) {
    return 'on'
  }

  const asked = await $.mcp.connect(COACH)

  if (asked.isConnected) {
    return 'on'
  }

  if (asked.reason === 'auth') {
    return 'sign-in'
  }

  if (asked.reason === 'disabled') {
    return 'off'
  }

  return asked.reason === 'unlisted' ? 'missing' : 'error'
}

const look = async ($: EngineInterface): Promise<CoachLink> => {
  let found: CoachLink = 'unknown'

  try {
    found = await sense($)
  } catch {
    // Left "unknown": the panel then asks for nothing it cannot be sure of.
  }

  await update($, coach, () => found)

  return found
}

const keep = async ($: EngineInterface, fresh: CoachPanel): Promise<void> => {
  await update($, panel, () => fresh)
  await update($, isExample, () => false)
  await update($, isSigningIn, () => false)
  await $.store.set('panel', fresh)
}

/** The owner has talked to Nearmost: remembered across sessions. */
const begin = async ($: EngineInterface): Promise<void> => {
  if ((await read($, hasBegun)) === true) {
    return
  }

  await update($, hasBegun, () => true)
  await $.store.set('begun', true)
}

const stamp = async ($: EngineInterface): Promise<string> =>
  new Date(await $.clock.now()).toISOString()

/** The owner's own ask: look at the connection, then read the latest. */
const refresh = async ($: EngineInterface): Promise<void> => {
  if ((await look($)) !== 'on') {
    return
  }

  try {
    const server = await $.mcp.connect(COACH)

    if (!server.isConnected) {
      return
    }

    const answer = await $.mcp.call(server.server, 'start_here')
    const fresh = answer.isError
      ? undefined
      : toPanel(findPanel(answer), await stamp($))

    if (fresh !== undefined) {
      await keep($, fresh)
    }
  } catch {
    // The panel keeps what it had.
  }
}

/** Lets Clarity through in a session where it was held before the owner
 * saved their token. */
const joinClarity = async ($: EngineInterface): Promise<void> => {
  try {
    await $.mcp.connect(CLARITY)
  } catch {
    // Clarity is an extra: the coach works without it.
  }
}

/** Puts words in the message box for the owner to send: the card never
 * sends anything on its own. Used for signing in only. */
const fill = async ($: EngineInterface, words: string): Promise<void> => {
  const { isFilled } = await $.prompt.fill({ text: words })

  $.ui.toast(isFilled ? 'Press Enter to send.' : `Type: ${words}`)
}

// ---------------------------------------------------------------------------
// Words.

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const day = (iso: string | undefined): string | undefined => {
  const [, , month, date] = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '') ?? []
  const name = MONTHS[Number(month) - 1]

  return name === undefined ? undefined : `${name} ${Number(date)}`
}

const SIGN_IN_STEPS = [
  '1. Send /mcp (it is in the message box now).',
  '2. Choose nearmost.',
  '3. Use the email you bought Nearmost with. We email you a sign-in link.',
]

// What the first ten minutes hold, for an owner who has not started.
const FIRST_STEPS = [
  '1. A few questions about your business.',
  '2. A first check of where you stand.',
  '3. Your first fix: done for you, or shown to you.',
]

/** Visibility health in the owner's words: "3 of 4". */
const health = (standing: CoachCheck[]): string =>
  `${standing.filter(check => check.state === 'good').length} of ${standing.length}`

/** Where the number was counted, and the last day it covers. */
const counted = (result: CoachResult): string => {
  const until = day(result.through)

  return `From ${SOURCES[result.source]}${until === undefined ? '' : `, through ${until}`}`
}

/** The work so far, in one line: "6 done · 2 waiting for your OK". */
const tally = (done: number, waiting: number): string | undefined => {
  const parts = [
    done > 0 ? `${done} done` : undefined,
    waiting > 0 ? `${waiting} waiting for your OK` : undefined,
  ].filter(part => part !== undefined)

  return parts.length === 0 ? undefined : parts.join(' · ')
}

const toneColor = (tone: CoachResult['tone']): string | undefined => {
  if (tone === 'good') {
    return GOOD
  }

  return tone === 'bad' ? BAD : undefined
}

// ---------------------------------------------------------------------------
// Drawing. One card, top to bottom: whose it is, the one number and where it
// was counted, the one next step with why it matters and what to say to get
// it done, then one line each for visibility health and the work so far.

/** The headline: the result when there is one, else visibility health from
 * the first check, else how to begin. */
const headline = (
  { Box, Text }: UI,
  shown: CoachPanel | null,
  how: CoachLink,
  isUnderWay: boolean,
): RenderElement => {
  const result = shown?.result
  const standing = shown?.standing ?? []

  if (result !== undefined) {
    const under = [
      result.change,
      result.start === undefined ? undefined : `Started at ${result.start}`,
    ].filter(part => part !== undefined)

    return (
      <Box flexDirection="column">
        <Text size="title" weight="bold" tabular>
          {result.value}
        </Text>
        <Text>{result.label}</Text>
        {under.length > 0 && (
          <Text
            size="footnote"
            color={toneColor(result.tone)}
            dimColor={toneColor(result.tone) === undefined}
          >
            {under.join('. ')}.
          </Text>
        )}
        <Text dimColor size="caption">
          {counted(result)}
        </Text>
      </Box>
    )
  }

  if (standing.length > 0) {
    const toFix = standing.filter(check => check.state === 'fix')

    return (
      <Box flexDirection="column">
        <Text size="title" weight="bold" tabular>
          {health(standing)}
        </Text>
        <Text>visibility checks in good shape</Text>
        <Text dimColor size="footnote">
          {toFix.length === 0
            ? 'Everything we checked looks good.'
            : `Needs work: ${toFix.map(check => check.label).join(', ')}.`}
        </Text>
      </Box>
    )
  }

  if (how !== 'on' && how !== 'unknown') {
    return (
      <Box flexDirection="column">
        <Text size="heading" weight="semibold">
          Sign in to begin
        </Text>
        <Text dimColor size="footnote">
          One email link. No password.
        </Text>
      </Box>
    )
  }

  // Talked to Nearmost, and the first check has not come back yet.
  if (isUnderWay) {
    return (
      <Box flexDirection="column">
        <Text size="heading" weight="semibold">
          You are under way
        </Text>
        <Text dimColor size="footnote">
          Keep going in the chat. Say "what's next?" any time.
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text size="heading" weight="semibold">
        See how customers find you
      </Text>
      <Text dimColor size="footnote">
        It takes your website address and about two minutes.
      </Text>
    </Box>
  )
}

const full = (
  ui: UI,
  $: EngineInterface,
  shown: CoachPanel | null,
  how: CoachLink,
  isSample: boolean,
  isStepping: boolean,
  isUnderWay: boolean,
): RenderElement => {
  const { Box, Text, Button, Link } = ui
  const hasStarted =
    shown?.result !== undefined || (shown?.standing?.length ?? 0) > 0
  const needsSignIn = !isSample && how !== 'on' && how !== 'unknown'
  const work = tally(shown?.done ?? 0, shown?.waiting ?? 0)
  const standing = shown?.standing ?? []
  const checkIn = day(shown?.checkIn)
  const hasLapsed = shown?.plan !== undefined && shown.plan.state !== 'active'

  return (
    <Box flexDirection="column" rowGap={1} paddingX={1}>
      {isSample && (
        <Box justifyContent="space-between" columnGap={1}>
          <Text color={WARN}>Example. Not your business.</Text>
          <Button
            key="example"
            label="Hide"
            onPress={() => update($, isExample, () => false)}
          />
        </Box>
      )}

      <Box flexDirection="column">
        <Text dimColor size="footnote">
          {shown?.business ?? TITLE}
        </Text>
        {headline(ui, shown, how, isUnderWay)}
      </Box>

      {shown?.next !== undefined && (
        <Box flexDirection="column">
          <Text weight="medium">{shown.next.title}</Text>
          {shown.next.minutes !== undefined && (
            <Text dimColor size="footnote">
              {shown.next.minutes} minutes
            </Text>
          )}
          {shown.next.why !== undefined && (
            <Text dimColor size="footnote">
              {shown.next.why}
            </Text>
          )}
          {/* The step gets done in the chat: the card only says how to ask. */}
          <Text size="footnote">Say "do it for me" or "show me how".</Text>
        </Box>
      )}

      {(work !== undefined ||
        (shown?.result !== undefined && standing.length > 0)) && (
        <Box flexDirection="column">
          {shown?.result !== undefined && standing.length > 0 && (
            <Text>{`Visibility health: ${health(standing)} good`}</Text>
          )}
          {work !== undefined && <Text>{work}</Text>}
        </Box>
      )}

      {!hasStarted && !isSample && (
        <Box flexDirection="column">
          <Box columnGap={1}>
            {needsSignIn ? (
              <Button
                key="sign-in"
                label="Sign In"
                variant="primary"
                onPress={async () => {
                  await update($, isSigningIn, () => true)
                  await fill($, '/mcp')
                }}
              />
            ) : (
              shown?.next === undefined &&
              !isUnderWay && (
                <Text size="footnote">Say "Nearmost, help me show up on Google".</Text>
              )
            )}
          </Box>
          {/* What saying it starts, so the first ten minutes hold no surprise. */}
          {!needsSignIn && shown?.next === undefined && !isUnderWay && (
            <Box flexDirection="column">
              <Text dimColor size="footnote">
                Then, in about ten minutes:
              </Text>
              {FIRST_STEPS.map(step => (
                <Text dimColor size="footnote">
                  {step}
                </Text>
              ))}
            </Box>
          )}
          <Box>
            <Button
              key="example"
              label="See an Example"
              onPress={() => update($, isExample, () => true)}
            />
          </Box>
          {needsSignIn &&
            isStepping &&
            SIGN_IN_STEPS.map(step => <Text size="footnote">{step}</Text>)}
        </Box>
      )}

      {hasLapsed && (
        <Box columnGap={1}>
          <Text color={WARN} size="footnote">
            Your plan has ended.
          </Text>
          {shown?.plan?.buyUrl !== undefined && (
            <Link href={shown.plan.buyUrl} label="Renew" />
          )}
        </Box>
      )}

      {checkIn !== undefined && (
        <Text dimColor size="caption">
          Next check-in {checkIn}
        </Text>
      )}
    </Box>
  )
}

/** The small form: the number, and what is waiting. */
const glance = (
  { Box, Text }: UI,
  shown: CoachPanel | null,
  how: CoachLink,
  isUnderWay: boolean,
): RenderElement => {
  const waiting = shown?.waiting ?? 0
  const result = shown?.result
  const title =
    result === undefined
      ? (shown?.next?.title ?? shown?.business ?? TITLE)
      : `${result.value} ${result.label}`
  let note = 'Nothing needs you right now'

  if (waiting > 0) {
    note = `${waiting} waiting for your OK`
  } else if (how !== 'on' && how !== 'unknown') {
    note = 'Sign in to start'
  } else if (shown === null && !isUnderWay) {
    note = 'Say "Nearmost, help me show up on Google"'
  }

  return (
    <Box flexDirection="column">
      <Text weight="semibold" wrap="truncate-end">
        {title}
      </Text>
      <Text dimColor size="footnote">
        {note}
      </Text>
    </Box>
  )
}

// ---------------------------------------------------------------------------

// Opened once a session, when the coach is first used: never at start-up,
// and not again after the owner closes it.
let hasOpened = false

const show = async ($: EngineInterface): Promise<void> => {
  if (hasOpened) {
    return
  }

  hasOpened = true
  void $.ui.open({ id: PANE, title: TITLE, placement: 'widget' })
  await look($)
}

export const register: Register = (on, options) => {
  // Read only to see whether it is set. The token itself is never read here,
  // shown, stored or sent: Claude Code hands it to Microsoft's server alone.
  const hasClarity =
    typeof options.clarity_api_token === 'string' &&
    options.clarity_api_token.trim() !== ''

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'nearmost',
      description: 'Show your Nearmost card',
    })

    // What the last session read, so the panel is not blank at the start.
    const kept = toPanel(await $.store.get('panel'), '')

    if (kept !== undefined) {
      await update($, panel, current => current ?? kept)
    }

    try {
      if ((await $.store.get('begun')) === true) {
        await update($, hasBegun, () => true)
      }

      // Once, the first time after installing, and only where someone is
      // there to read it: the one thing to say.
      if (e.isInteractive && (await $.store.get('welcomed')) !== true) {
        await $.store.set('welcomed', true)
        $.ui.toast(WELCOME, { timeoutMs: 12000 })
      }
    } catch {
      // A welcome that cannot show must never hold up the session.
    }

    return next(e)
  })

  on('command.run', { command: 'nearmost' }, async $ => {
    hasOpened = true
    await $.ui.open({ id: PANE, title: TITLE })
    void refresh($)

    if (hasClarity) {
      void joinClarity($)
    }

    return { text: 'Nearmost card opened.' }
  })

  // The owner asked for the coach: show the panel, even when the server is
  // not connected yet (that is when its Sign In button matters most).
  on('skill.prompt', async ($, e, next) => {
    if (e.pluginName === $.plugin.name) {
      await show($)

      if (hasClarity) {
        void joinClarity($)
      }
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // Mirror what the coach's server answers. The call and its result pass
  // through untouched: nothing here changes what the model sends or reads.
  on('tool.call', async ($, e, next) => {
    const tool = coachTool(String(e.tool))
    const ran = await next(e)

    if (tool === undefined) {
      return ran
    }

    try {
      await show($)

      const hasAnswered = ran.deny === undefined && ran.isError !== true
      const fresh = hasAnswered
        ? toPanel(findPanel(ran.result, ran.text), await stamp($))
        : undefined

      if (hasAnswered) {
        await begin($)
      }

      if (fresh !== undefined) {
        await keep($, fresh)
      }
    } catch {
      // A panel that cannot update must never cost the owner a tool call.
    }

    return ran
  }).catch(($, e, next) => next(e))

  // Microsoft Clarity ships listed but held back: it joins a session only
  // once the owner has saved a Clarity token in this plugin's options. An
  // owner who does not use Clarity never sees it start, fail or ask for
  // anything. A failure here lets it through, which is harmless.
  on('mcp.connect', ($, e, next) => {
    if (hasClarity || !isOwnClarity(e, $.plugin.name)) {
      return next(e)
    }

    return {
      value: {
        isConnected: false,
        reason: 'disabled',
        message:
          'Microsoft Clarity is off until you add your Clarity token: /plugin configure nearmost.',
      },
    }
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const isSample = (await read($, isExample)) === true
    const shown = isSample ? EXAMPLE : await read($, panel)
    const how = await read($, coach)
    const isUnderWay = (await read($, hasBegun)) === true

    return e.props.placement === 'widget'
      ? glance(ui, shown, how, isUnderWay)
      : full(
          ui,
          $,
          shown,
          how,
          isSample,
          (await read($, isSigningIn)) === true,
          isUnderWay,
        )
  })
}
