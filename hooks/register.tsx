// The Visibility Coach panel: one small pane beside the chat.
//
// It only displays. It holds no method, no scoring and no playbook text: it
// mirrors the `panel` object the Visibility Coach server sends (the contract
// is ../types/index.d.ts) and shows how each connection stands. It reads no
// files, runs no processes and makes no network requests of its own; the one
// server call it makes is `start_here`, on the owner's own press or command,
// over the session's existing connection.
import { atom, read, update } from 'claude-code'
import type {
  ElementTable,
  EngineInterface,
  Register,
  RenderElement,
} from 'claude-code'

import type {
  CoachLink,
  CoachLinks,
  CoachPanel,
  CoachResult,
  CoachRow,
  CoachSetup,
} from '../types'

type UI = Pick<ElementTable, 'Box' | 'Text' | 'Button' | 'Link'>

const PANE = 'coach'
const TITLE = 'Visibility Coach'
// Keys of this plugin's .mcp.json.
const COACH = 'visibility-coach'
const HIGGSFIELD = 'higgsfield'

// The one accent, and the three meanings a color may carry. Words always
// carry the meaning too.
const TINT = 'suggestion'
const GOOD = 'success'
const WARN = 'warning'
const BAD = 'error'

const NO_LINKS: CoachLinks = {
  coach: 'unknown',
  higgsfield: 'unknown',
  magic: 'unknown',
}

// Change a tag when the value's fields change: it declines what an earlier
// version stored, which outlives a reload.
const panel = atom({ plugin: 'visibility-coach', key: 'panel' } as const, null, {
  shape: 'panel-1',
})
const links = atom(
  { plugin: 'visibility-coach', key: 'links' } as const,
  NO_LINKS,
  { shape: 'links-1' },
)
const now = atom({ plugin: 'visibility-coach', key: 'now' } as const, null)
const setup = atom({ plugin: 'visibility-coach', key: 'setup' } as const, null)
const isExample = atom(
  { plugin: 'visibility-coach', key: 'isExample' } as const,
  false,
)

// What the coach is doing, in the owner's words, by the playbook topic asked
// for. Labels only: the same topic names the skill's own table lists.
const DOING: Record<string, string> = {
  align: 'Getting to know your business',
  'mini-grill': 'A few quick questions before a change',
  'site-review': 'Reviewing your website',
  'seo-fixes': 'Improving how you show up on Google',
  'aeo-answers': 'Answering the questions customers ask',
  'geo-ai-visibility': 'Helping AI assistants recommend you',
  'local-maps': 'Google Maps and reviews',
  'structured-data': 'Helping Google read your pages',
  'llms-txt-and-crawlers': 'Letting AI assistants read your site',
  'apply-changes': 'Publishing what you approved',
  'progress-report': 'Checking what changed',
}

// Shown only on the owner's press, under a banner that says it is one.
const EXAMPLE: CoachPanel = {
  business: 'Harbour Plumbing',
  website: 'harbourplumbing.example',
  plan: { state: 'active', until: '2027-03-01' },
  next: { title: 'Add the suburbs you serve to your home page', minutes: 10 },
  waiting: [
    { title: 'New home page title', note: 'Home page' },
    { title: 'Answer: "Do you do emergency call-outs?"', note: 'Services' },
  ],
  results: [
    {
      label: 'Calls from Google',
      value: '14',
      change: '3 more than last month',
      tone: 'good',
    },
    {
      label: 'AI assistants naming you',
      value: '2 of 5 checks',
      change: 'Same as last month',
      tone: 'neutral',
    },
  ],
  done: [
    { title: 'Fixed opening hours on Google', note: 'Nov 12' },
    { title: 'Added a services list', note: 'Nov 9' },
  ],
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

const list = (value: unknown): unknown[] =>
  Array.isArray(value) ? value.slice(0, 3) : []

const toRows = (value: unknown): CoachRow[] =>
  list(value).flatMap(one => {
    const title = text(field(one, 'title'), 80)

    return title === undefined
      ? []
      : [{ title, note: text(field(one, 'note'), 40) }]
  })

const toResults = (value: unknown): CoachResult[] =>
  list(value).flatMap(one => {
    const label = text(field(one, 'label'), 40)
    const figure = text(field(one, 'value'), 24)
    const tone = (['good', 'bad', 'neutral'] as const).find(
      known => known === field(one, 'tone'),
    )

    return label === undefined || figure === undefined
      ? []
      : [{ label, value: figure, change: text(field(one, 'change'), 60), tone }]
  })

const toPanel = (raw: unknown, readAt: string): CoachPanel | undefined => {
  if (typeof raw !== 'object' || raw === null) {
    return undefined
  }

  const plan = field(raw, 'plan')
  const state = (['active', 'grace', 'ended', 'none'] as const).find(
    known => known === field(plan, 'state'),
  )
  const buyUrl = text(field(plan, 'buyUrl'), 300)
  const next = text(field(field(raw, 'next'), 'title'), 120)
  const minutes = field(field(raw, 'next'), 'minutes')

  return {
    business: text(field(raw, 'business'), 60),
    website: text(field(raw, 'website'), 60),
    plan:
      state === undefined
        ? undefined
        : {
            state,
            until: text(field(plan, 'until'), 30),
            buyUrl: buyUrl?.startsWith('https://') ? buyUrl : undefined,
          },
    next:
      next === undefined
        ? undefined
        : {
            title: next,
            minutes:
              typeof minutes === 'number' && minutes >= 1 && minutes <= 240
                ? Math.round(minutes)
                : undefined,
          },
    waiting: toRows(field(raw, 'waiting')),
    results: toResults(field(raw, 'results')),
    done: toRows(field(raw, 'done')),
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
// Connections.

const serverOf = (tool: string): string =>
  /^mcp__(.+?)__/.exec(tool)?.[1] ?? ''

/** The tool's own name when it belongs to the coach's server, whatever name
 * that server runs under (this plugin's, or a connector the owner added). */
const coachTool = (tool: string): string | undefined => {
  const [, server = '', name] = /^mcp__(.+?)__(.+)$/.exec(tool) ?? []

  return /visibility[-_ ]?coach/i.test(server) ? name : undefined
}

/** Whether a server about to join the session is the Higgsfield entry this
 * plugin lists: the one server it holds back until the owner turns it on.
 * Never the coach's own, and never a Higgsfield the owner added themselves. */
export const isOwnHiggsfield = (
  e: { server: string; provider: { plugin: string } },
  plugin: string,
): boolean => e.provider.plugin === plugin && /(^|:)higgsfield$/.test(e.server)

const standing = (reason: string): CoachLink => {
  if (reason === 'auth') {
    return 'sign-in'
  }

  if (reason === 'disabled') {
    return 'off'
  }

  return reason === 'unlisted' ? 'missing' : 'error'
}

const sense = async ($: EngineInterface): Promise<CoachLinks> => {
  const tools = await $.tool.list()
  const servers = tools.filter(tool => tool.mcp).map(tool => serverOf(tool.name))
  const runs = (pattern: RegExp): boolean =>
    servers.some(server => pattern.test(server))

  let coach: CoachLink = 'on'

  if (!runs(/visibility[-_ ]?coach/i)) {
    const asked = await $.mcp.connect(COACH)
    coach = asked.isConnected ? 'on' : standing(asked.reason)
  }

  // Higgsfield and 21st.dev count as connected however the owner added them.
  let higgsfield: CoachLink = runs(/higgs/i) ? 'on' : 'off'

  if (higgsfield === 'off' && (await $.store.get(HIGGSFIELD)) === true) {
    const asked = await $.mcp.connect(HIGGSFIELD)
    higgsfield = asked.isConnected ? 'on' : standing(asked.reason)
  }

  return {
    coach,
    higgsfield,
    magic: runs(/21st|^magic$|magic[-_ ]?mcp/i) ? 'on' : 'missing',
  }
}

const look = async ($: EngineInterface): Promise<CoachLinks> => {
  let found = NO_LINKS

  try {
    found = await sense($)
  } catch {
    // Leave every row "unknown": the panel says so and offers Refresh.
  }

  await update($, links, () => found)

  return found
}

const keep = async ($: EngineInterface, fresh: CoachPanel): Promise<void> => {
  await update($, panel, () => fresh)
  await update($, isExample, () => false)
  await $.store.set('panel', fresh)
}

const stamp = async ($: EngineInterface): Promise<string> =>
  new Date(await $.clock.now()).toISOString()

/** The owner's own ask: look at the connections, then read the latest. */
const refresh = async ($: EngineInterface): Promise<void> => {
  const found = await look($)

  if (found.coach !== 'on') {
    return
  }

  try {
    const coach = await $.mcp.connect(COACH)

    if (!coach.isConnected) {
      return
    }

    const answer = await $.mcp.call(coach.server, 'start_here')
    const fresh = answer.isError
      ? undefined
      : toPanel(findPanel(answer), await stamp($))

    if (fresh !== undefined) {
      await keep($, fresh)
    }
  } catch {
    // The panel keeps what it had and still shows when that was read.
  }
}

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

const day = (iso: string | undefined, thisYear?: string): string | undefined => {
  const [, year, month, date] = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '') ?? []
  const name = MONTHS[Number(month) - 1]

  if (name === undefined) {
    return undefined
  }

  const short = `${name} ${Number(date)}`

  return thisYear === undefined || year === thisYear
    ? short
    : `${short}, ${year}`
}

const planLine = (shown: CoachPanel): { words: string; color?: string } => {
  const until = day(shown.plan?.until, shown.asOf?.slice(0, 4))

  switch (shown.plan?.state) {
    case 'active':
      return { words: until === undefined ? 'Plan active' : `Plan active to ${until}` }
    case 'grace':
      return { words: 'Plan ended. Renew to keep going.', color: WARN }
    case 'ended':
    case 'none':
      return { words: 'No active plan', color: WARN }
    default:
      return { words: '' }
  }
}

const LINK_NAMES: Record<keyof CoachLinks, { name: string; adds: string }> = {
  coach: { name: 'Visibility Coach', adds: 'your coach' },
  higgsfield: { name: 'Higgsfield', adds: 'photos and video' },
  magic: { name: '21st.dev Magic', adds: 'page sections' },
}

const LINK_WORDS: Record<CoachLink, string> = {
  on: 'Connected',
  'sign-in': 'Needs sign-in',
  off: 'Off',
  missing: 'Not set up',
  error: 'Could not connect',
  unknown: 'Not checked',
}

const steps = (which: keyof CoachLinks, how: CoachLink): string[] => {
  if (which === 'magic') {
    return [
      '1. Get a free key at 21st.dev/mcp.',
      '2. Run: /plugin marketplace add 21st-dev/magic-mcp',
      '3. Run: /plugin install 21st, then paste the key.',
    ]
  }

  const server = which === 'coach' ? COACH : HIGGSFIELD

  if (how === 'sign-in') {
    return [
      '1. Send /mcp (it is in the message box now).',
      `2. Choose ${server}.`,
      which === 'coach'
        ? '3. Sign in with the link we email you.'
        : '3. Sign in to Higgsfield. It needs a paid Higgsfield plan.',
    ]
  }

  return how === 'error'
    ? ['It did not connect. Check your internet, then press Refresh.']
    : [`Send /mcp, choose ${server}, and turn it on.`]
}

// ---------------------------------------------------------------------------
// Drawing. One column of grouped rows: a title, then each group under a
// small title-case label, most important first. One tinted button on the
// whole panel (the next step); every state is a symbol, a word and a color.

const group = (
  { Box, Text }: UI,
  label: string,
  body: RenderElement | RenderElement[],
): RenderElement => (
  <Box flexDirection="column">
    <Text size="caption" weight="semibold" dimColor>
      {label}
    </Text>
    <Box flexDirection="column" borderStyle="round" borderDimColor paddingX={1}>
      {body}
    </Box>
  </Box>
)

const rowsOf = (
  { Box, Text }: UI,
  rows: CoachRow[],
  mark: string,
): RenderElement[] =>
  rows.map(row => (
    <Box justifyContent="space-between" columnGap={1}>
      <Text wrap="truncate-end">
        {mark}
        {row.title}
      </Text>
      {row.note !== undefined && (
        <Text dimColor size="footnote">
          {row.note}
        </Text>
      )}
    </Box>
  ))

const toneColor = (tone: CoachResult['tone']): string | undefined => {
  if (tone === 'good') {
    return GOOD
  }

  return tone === 'bad' ? BAD : undefined
}

const linkRow = (
  ui: UI,
  $: EngineInterface,
  which: keyof CoachLinks,
  how: CoachLink,
  open: CoachSetup,
): RenderElement => {
  const { Box, Text, Button, Link } = ui
  const { name, adds } = LINK_NAMES[which]
  const isOn = how === 'on'
  const ask = which === 'higgsfield' && how === 'off' ? 'Turn On' : 'Set Up'

  const press = async (): Promise<void> => {
    await update($, setup, () => which)

    if (which === 'higgsfield') {
      // The owner's yes: from here the server may join the session.
      await $.store.set(HIGGSFIELD, true)
    }

    const found = which === 'magic' ? how : (await look($))[which]

    if (found === 'on') {
      await update($, setup, () => null)
    } else if (found === 'sign-in' || found === 'off') {
      await fill($, '/mcp')
    }
  }

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between" columnGap={1}>
        <Text wrap="truncate-end">
          <Text color={isOn ? GOOD : undefined} dimColor={!isOn}>
            {isOn ? '✓ ' : '○ '}
          </Text>
          {name}
          <Text dimColor size="footnote">
            {' '}
            {adds}
          </Text>
        </Text>
        {isOn || how === 'unknown' ? (
          <Text dimColor size="footnote">
            {LINK_WORDS[how]}
          </Text>
        ) : (
          <Button key={`setup:${which}`} label={ask} onPress={press} />
        )}
      </Box>
      {open === which && !isOn && (
        <Box flexDirection="column" paddingLeft={2}>
          <Text dimColor size="footnote">
            {LINK_WORDS[how]}
          </Text>
          {steps(which, how).map(step => (
            <Text size="footnote">{step}</Text>
          ))}
          {which === 'magic' && (
            <Link href="https://21st.dev/mcp" label="Open 21st.dev/mcp" />
          )}
        </Box>
      )}
    </Box>
  )
}

const full = (
  ui: UI,
  $: EngineInterface,
  shown: CoachPanel | null,
  how: CoachLinks,
  doing: string | null,
  open: CoachSetup,
  isSample: boolean,
): RenderElement => {
  const { Box, Text, Button, Link } = ui
  const plan = shown === null ? { words: '' } : planLine(shown)
  const under = [shown?.website, plan.words].filter(
    part => part !== undefined && part !== '',
  )
  const waiting = shown?.waiting ?? []
  const results = shown?.results ?? []
  const done = shown?.done ?? []
  const isReady = how.coach === 'on'

  return (
    <Box flexDirection="column" rowGap={1} paddingX={1}>
      <Box flexDirection="column">
        <Text size="title" weight="bold">
          {shown?.business ?? TITLE}
        </Text>
        {under.length > 0 && (
          <Text size="footnote" color={plan.color} dimColor={plan.color === undefined}>
            {under.join(' · ')}
          </Text>
        )}
        {doing !== null && !isSample && (
          <Text size="footnote" color={TINT}>
            Now: {doing}
          </Text>
        )}
      </Box>

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

      {shown === null &&
        group(
          ui,
          'Start',
          <Box flexDirection="column">
            <Text>
              {isReady
                ? 'Say "help me show up on Google" to begin.'
                : 'Get found by the right customers on Google and AI search.'}
            </Text>
            <Box columnGap={1}>
              {isReady && (
                <Button
                  key="start"
                  label="Start"
                  variant="primary"
                  onPress={() => fill($, 'Help me show up on Google.')}
                />
              )}
              <Button
                key="example"
                label="See an Example"
                onPress={() => update($, isExample, () => true)}
              />
            </Box>
          </Box>,
        )}

      {shown?.next !== undefined &&
        group(
          ui,
          'Next Step',
          <Box flexDirection="column">
            <Text weight="medium">{shown.next.title}</Text>
            <Box justifyContent="space-between" columnGap={1}>
              <Text dimColor size="footnote">
                {shown.next.minutes === undefined
                  ? 'One thing at a time'
                  : `About ${shown.next.minutes} minutes`}
              </Text>
              <Button
                key="start"
                label="Start"
                variant="primary"
                onPress={() => fill($, "Let's do my next step.")}
              />
            </Box>
          </Box>,
        )}

      {waiting.length > 0 &&
        group(
          ui,
          'Waiting for Your OK',
          <Box flexDirection="column">
            {rowsOf(ui, waiting, '')}
            <Box justifyContent="space-between" columnGap={1}>
              <Text dimColor size="footnote">
                Nothing goes live without your yes.
              </Text>
              <Button
                key="review"
                label="Review"
                onPress={() => fill($, "Show me what's waiting for my OK.")}
              />
            </Box>
          </Box>,
        )}

      {results.length > 0 &&
        group(
          ui,
          'Results',
          results.map(result => (
            <Box flexDirection="column">
              <Box justifyContent="space-between" columnGap={1}>
                <Text wrap="truncate-end">{result.label}</Text>
                <Text weight="semibold" tabular>
                  {result.value}
                </Text>
              </Box>
              {result.change !== undefined && (
                <Text
                  size="footnote"
                  color={toneColor(result.tone)}
                  dimColor={toneColor(result.tone) === undefined}
                >
                  {result.change}
                </Text>
              )}
            </Box>
          )),
        )}

      {done.length > 0 && group(ui, 'Done', rowsOf(ui, done, '✓ '))}

      {!isSample &&
        group(
          ui,
          'Connections',
          (['coach', 'higgsfield', 'magic'] as const).map(which =>
            linkRow(ui, $, which, how[which], open),
          ),
        )}

      {!isSample && (
        <Box justifyContent="space-between" columnGap={1}>
          {shown?.plan?.buyUrl !== undefined && shown.plan.state !== 'active' ? (
            <Link href={shown.plan.buyUrl} label="See plans" />
          ) : (
            <Text dimColor size="caption">
              {day(shown?.asOf) === undefined
                ? 'Only you see this.'
                : `Updated ${day(shown?.asOf)}`}
            </Text>
          )}
          <Button key="refresh" label="Refresh" onPress={() => refresh($)} />
        </Box>
      )}
    </Box>
  )
}

/** The small form: the one thing to do, and what is waiting. */
const glance = (
  { Box, Text }: UI,
  shown: CoachPanel | null,
  how: CoachLinks,
): RenderElement => {
  const waiting = shown?.waiting?.length ?? 0
  const toSetUp = how.coach === 'on' || how.coach === 'unknown' ? 0 : 1
  const notes = [
    waiting > 0 ? `${waiting} waiting for your OK` : undefined,
    toSetUp > 0 ? 'Sign in to start' : undefined,
  ].filter(note => note !== undefined)

  return (
    <Box flexDirection="column">
      <Text weight="semibold" wrap="truncate-end">
        {shown?.next?.title ?? shown?.business ?? TITLE}
      </Text>
      <Text dimColor size="footnote">
        {notes.length > 0 ? notes.join(' · ') : 'Nothing needs you right now'}
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
  // not connected yet (that is when its set-up row matters most).
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

      const topic = text(field(e, 'topic'), 40)
      const doing = topic === undefined ? undefined : DOING[topic]

      if (doing !== undefined) {
        await update($, now, () => doing)
      }

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

  // Higgsfield ships listed but off: it joins a session only after the
  // owner turns it on in the panel. A failure here lets it through, which
  // only ever shows a sign-in row in /mcp.
  on('mcp.connect', async ($, e, next) => {
    const isHeld =
      isOwnHiggsfield(e, $.plugin.name) &&
      (await $.store.get(HIGGSFIELD)) !== true

    if (!isHeld) {
      return next(e)
    }

    return {
      value: {
        isConnected: false,
        reason: 'disabled',
        message:
          'Higgsfield is off until you turn it on in the Visibility Coach panel.',
      },
    }
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const isSample = (await read($, isExample)) === true
    const shown = isSample ? EXAMPLE : await read($, panel)
    const how = await read($, links)

    return e.props.placement === 'widget'
      ? glance(ui, shown, how)
      : full(ui, $, shown, how, await read($, now), await read($, setup), isSample)
  })
}
