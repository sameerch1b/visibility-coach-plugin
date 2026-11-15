// The Visibility Coach panel: one small card beside the chat.
//
// One number, one next step, one line for what is waiting. Everything else
// is asked for in the chat.
//
// It only displays. It holds no method, no scoring and no playbook text: it
// mirrors the `panel` object the Visibility Coach server sends (the contract
// is ../types/index.d.ts). It reads no files, runs no processes and makes no
// network requests of its own; the one server call it makes is `start_here`,
// on the owner's own command, over the session's existing connection.
import { atom, read, update } from 'claude-code'
import type {
  ElementTable,
  EngineInterface,
  Register,
  RenderElement,
} from 'claude-code'

import type { CoachCheck, CoachLink, CoachPanel, CoachResult } from '../types'

type UI = Pick<ElementTable, 'Box' | 'Text' | 'Button' | 'Link'>

const PANE = 'coach'
const TITLE = 'Visibility Coach'
// The server's key in this plugin's .mcp.json.
const COACH = 'visibility-coach'

// The three meanings a color may carry. Words always carry the meaning too.
const GOOD = 'success'
const WARN = 'warning'
const BAD = 'error'

// Change a tag when the value's fields change: it declines what an earlier
// version stored, which outlives a reload.
const panel = atom({ plugin: 'visibility-coach', key: 'panel' } as const, null, {
  shape: 'panel-3',
})
const coach = atom(
  { plugin: 'visibility-coach', key: 'coach' } as const,
  'unknown',
  { shape: 'coach-1' },
)
const isExample = atom(
  { plugin: 'visibility-coach', key: 'isExample' } as const,
  false,
)
const isSigningIn = atom(
  { plugin: 'visibility-coach', key: 'isSigningIn' } as const,
  false,
)

// Shown only on the owner's press, under a banner that says it is one.
const EXAMPLE: CoachPanel = {
  business: 'Harbour Plumbing',
  result: {
    value: '14',
    label: 'calls from Google this month',
    change: '3 more than last month',
    tone: 'good',
    start: '9',
  },
  next: { title: 'Add the suburbs you serve to your home page', minutes: 10 },
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

const toResult = (raw: unknown): CoachResult | undefined => {
  const value = text(field(raw, 'value'), 12)
  const label = text(field(raw, 'label'), 50)

  return value === undefined || label === undefined
    ? undefined
    : {
        value,
        label,
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
  const next = text(field(field(raw, 'next'), 'title'), 80)

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
        : { title: next, minutes: count(field(field(raw, 'next'), 'minutes'), 240) },
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
 * that server runs under (this plugin's, or a connector the owner added). */
const coachTool = (tool: string): string | undefined => {
  const [, server = '', name] = /^mcp__(.+?)__(.+)$/.exec(tool) ?? []

  return /visibility[-_ ]?coach/i.test(server) ? name : undefined
}

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

/** Puts words in the message box for the owner to send: the panel never
 * sends anything on its own. */
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
  '2. Choose visibility-coach.',
  '3. Sign in with the link we email you.',
]

const toneColor = (tone: CoachResult['tone']): string | undefined => {
  if (tone === 'good') {
    return GOOD
  }

  return tone === 'bad' ? BAD : undefined
}

// ---------------------------------------------------------------------------
// Drawing. One card, top to bottom: whose it is, the one number, the one
// next step with the one tinted button, one line for what is waiting.

/** The headline: the result when there is one, else the first check, else
 * how to begin. */
const headline = (
  { Box, Text }: UI,
  shown: CoachPanel | null,
  how: CoachLink,
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
      </Box>
    )
  }

  if (standing.length > 0) {
    const toFix = standing.filter(check => check.state === 'fix')

    return (
      <Box flexDirection="column">
        <Text size="title" weight="bold" tabular>
          {toFix.length} of {standing.length}
        </Text>
        <Text>{toFix.length === 1 ? 'needs work' : 'need work'}</Text>
        <Text dimColor size="footnote">
          {toFix.length === 0
            ? 'Everything we checked looks good.'
            : `${toFix.map(check => check.label).join(', ')}.`}
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text size="heading" weight="semibold">
        {how === 'on' || how === 'unknown'
          ? 'See how customers find you'
          : 'Sign in to begin'}
      </Text>
      <Text dimColor size="footnote">
        {how === 'on' || how === 'unknown'
          ? 'It takes your website address and about two minutes.'
          : 'One email link. No password.'}
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
): RenderElement => {
  const { Box, Text, Button, Link } = ui
  const hasStarted =
    shown?.result !== undefined || (shown?.standing?.length ?? 0) > 0
  const needsSignIn = !isSample && how !== 'on' && how !== 'unknown'
  const waiting = shown?.waiting ?? 0
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
        {headline(ui, shown, how)}
      </Box>

      {shown?.next !== undefined && (
        <Box justifyContent="space-between" columnGap={1}>
          <Box flexDirection="column">
            <Text weight="medium">{shown.next.title}</Text>
            {shown.next.minutes !== undefined && (
              <Text dimColor size="footnote">
                {shown.next.minutes} minutes
              </Text>
            )}
          </Box>
          <Button
            key="start"
            label="Start"
            variant="primary"
            onPress={() => fill($, "Let's do my next step.")}
          />
        </Box>
      )}

      {waiting > 0 && (
        <Button
          key="review"
          plain
          onPress={() => fill($, "Show me what's waiting for my OK.")}
        >
          {String(waiting)} waiting for your OK ›
        </Button>
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
              shown?.next === undefined && (
                <Button
                  key="start"
                  label="Start"
                  variant="primary"
                  onPress={() => fill($, 'Help me show up on Google.')}
                />
              )
            )}
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

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'coach',
      description: 'Show your Visibility Coach panel',
    })

    // What the last session read, so the panel is not blank at the start.
    const kept = toPanel(await $.store.get('panel'), '')

    if (kept !== undefined) {
      await update($, panel, current => current ?? kept)
    }

    return next(e)
  })

  on('command.run', { command: 'coach' }, async $ => {
    hasOpened = true
    await $.ui.open({ id: PANE, title: TITLE })
    void refresh($)

    return { text: 'Visibility Coach panel opened.' }
  })

  // The owner asked for the coach: show the panel, even when the server is
  // not connected yet (that is when its Sign In button matters most).
  on('skill.prompt', async ($, e, next) => {
    if (e.pluginName === $.plugin.name) {
      await show($)
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

      const fresh =
        ran.deny === undefined && ran.isError !== true
          ? toPanel(findPanel(ran.result, ran.text), await stamp($))
          : undefined

      if (fresh !== undefined) {
        await keep($, fresh)
      }
    } catch {
      // A panel that cannot update must never cost the owner a tool call.
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const isSample = (await read($, isExample)) === true
    const shown = isSample ? EXAMPLE : await read($, panel)
    const how = await read($, coach)

    return e.props.placement === 'widget'
      ? glance(ui, shown, how)
      : full(ui, $, shown, how, isSample, (await read($, isSigningIn)) === true)
  })
}
