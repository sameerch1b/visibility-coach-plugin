import { expect, mock, test } from 'claude-code/testing'

import { isOwnHiggsfield } from '../hooks/register'

const PLUGIN = 'visibility-coach'
const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const
const START = 'mcp__plugin_visibility-coach_visibility-coach__start_here'

const pane = (placement: 'dock' | 'widget' = 'dock') =>
  ({
    plugin: PLUGIN,
    component: 'Pane',
    requestId: 'coach',
    props: {
      title: 'Visibility Coach',
      isFocused: false,
      bodyColumns: 44,
      placement,
      scroll: { offset: 0, bodyRows: 40 },
      view: {},
    },
  }) as const

const PANEL = {
  business: 'Harbour Plumbing',
  website: 'harbourplumbing.example',
  plan: { state: 'active', until: '2027-03-01' },
  next: { title: 'Add the suburbs you serve', minutes: 10 },
  waiting: [{ title: 'New home page title', note: 'Home page' }],
  results: [
    { label: 'Calls from Google', value: '14', change: '3 more than last month', tone: 'good' },
  ],
  done: [{ title: 'Fixed opening hours', note: 'Nov 12' }],
}

const tool = (name: string) => ({ name, description: '', mcp: true })

test('the panel shows what the coach sent, on every surface', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  on('command.register', () => ({ value: { command: 'coach' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.list', () => ({ value: [tool(START)] }))
  on('tool.call', () => ({ result: { structuredContent: { panel: PANEL } } }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: START })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane(), surface })

    expect(await ui.find({ type: 'Text', text: /Harbour Plumbing/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Plan active to Mar 1, 2027/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Add the suburbs you serve/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /About 10 minutes/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /New home page title/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Nothing goes live without your yes/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /3 more than last month/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Fixed opening hours/ })).toBeDefined()
    await ui.unmount()

    const small = await $.ui.mount({ ...pane('widget'), surface })

    expect(await small.find({ type: 'Text', text: /Add the suburbs you serve/ })).toBeDefined()
    expect(await small.find({ type: 'Text', text: /1 waiting for your OK/ })).toBeDefined()
    await small.unmount()
  }
})

test('the result of a coach call reaches the model unchanged', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.list', () => ({ value: [tool(START)] }))
  on('tool.call', () => ({ result: { structuredContent: { panel: PANEL } } }))

  const ran = await $.tool.call({ tool: START })

  expect(ran.result).toEqual({ structuredContent: { panel: PANEL } })
})

test('a call to any other tool opens nothing and reads nothing', async ($, on) => {
  let opens = 0
  let lists = 0
  on('ui.open', () => {
    opens += 1

    return { value: { isPlaced: true } }
  })
  on('tool.list', () => {
    lists += 1

    return { value: [] }
  })
  on('tool.call', () => ({ result: { stdout: 'ok' } }))

  const ran = await $.tool.call({ tool: 'Bash', command: 'ls' })

  expect(ran.result).toEqual({ stdout: 'ok' })
  expect(opens).toBe(0)
  expect(lists).toBe(0)
})

test('text from outside is cut to size and an unsafe buy link is dropped', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.list', () => ({ value: [tool(START)] }))
  on('tool.call', () => ({
    result: {
      panel: {
        business: `Evil\u0007Corp ${'x'.repeat(500)}`,
        plan: { state: 'ended', buyUrl: 'javascript:alert(1)' },
        waiting: Array.from({ length: 40 }, (_, at) => ({ title: `Change ${at}` })),
      },
    },
  }))

  await $.tool.call({ tool: START })

  const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })
  const title = await ui.find({ type: 'Text', text: /^Evil Corp/ })

  expect(title?.text.length).toBe(60)
  expect(await ui.find({ type: 'Link', text: /See plans/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Change 2/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Change 3/ })).toBeUndefined()
  await ui.unmount()
})

test('each connection says how it stands and offers its set-up', async ($, on) => {
  const filled: string[] = []
  mock.store(on)
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('prompt.fill', (_, e) => {
    filled.push(e.text)

    return { isFilled: true }
  })
  on('ui.toast', () => ({ value: undefined }))
  // The coach under this plugin's name, 21st.dev as a connector the owner
  // added, Higgsfield not there at all.
  on('tool.list', () => ({ value: [tool(START), tool('mcp__Magic_MCP__search')] }))
  on('mcp.connect', () => ({
    value: { isConnected: false, reason: 'auth', message: 'needs sign-in' },
  }))
  on('tool.call', () => ({ result: {} }))

  await $.tool.call({ tool: START })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane(), surface })

    expect(await ui.find({ key: 'setup:coach' })).toBeUndefined()
    expect(await ui.find({ key: 'setup:magic' })).toBeUndefined()
    expect((await ui.find({ key: 'setup:higgsfield' }))?.props.label).toBe('Turn On')
    expect((await ui.find({ key: 'setup:site' }))?.props.label).toBe('Set Up')
    expect((await ui.find({ key: 'setup:google' }))?.props.label).toBe('Set Up')
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })
  await ui.press({ key: 'setup:higgsfield' })

  expect(await ui.find({ type: 'Text', text: /Needs sign-in/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Choose higgsfield/ })).toBeDefined()
  expect((await ui.find({ key: 'setup:higgsfield' }))?.props.label).toBe('Set Up')

  // An account is set up in the chat: the press writes a plain request and
  // says a connection is not needed to start.
  await ui.press({ key: 'setup:site' })
  expect(filled).toContain('Help me connect my website.')
  expect(await ui.find({ type: 'Text', text: /Not needed to start/ })).toBeDefined()
  await ui.unmount()
})

test('the first check holds the top until results replace it', async ($, on) => {
  const first = {
    business: 'Harbour Plumbing',
    standing: [
      { label: 'Google search', finding: 'Not on the first page.', state: 'fix' },
      { label: 'Reviews', finding: '4.8 stars from 37 reviews.', state: 'good' },
    ],
    next: { title: 'Approve your first change', minutes: 2 },
  }
  const later = {
    ...first,
    results: [
      {
        label: 'Calls from Google',
        value: '14',
        change: '3 more than last month',
        tone: 'good',
        start: '9',
        source: 'your Monday answers',
      },
    ],
    checkIn: '2026-11-16',
  }
  let sent: object = first
  mock.store(on)
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  // The owner's site runs on a platform this Claude is already connected to.
  on('tool.list', () => ({ value: [tool(START), tool('mcp__Wordpress__wpcom-site-reset-get')] }))
  on('tool.call', () => ({ result: { structuredContent: { panel: sent } } }))

  await $.tool.call({ tool: START })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane(), surface })

    expect(await ui.find({ type: 'Text', text: /Not on the first page/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Needs work/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Nothing was connected/ })).toBeDefined()
    expect(await ui.find({ key: 'checkin' })).toBeDefined()
    expect(await ui.find({ key: 'setup:site' })).toBeUndefined()
    await ui.unmount()
  }

  sent = later
  await $.tool.call({ tool: START })

  const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })

  expect(await ui.find({ type: 'Text', text: /Not on the first page/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /9 when you started\. From your Monday answers/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Next check-in Nov 16/ })).toBeDefined()
  expect(await ui.find({ key: 'checkin' })).toBeUndefined()
  await ui.unmount()
})

test('only this plugin\'s own Higgsfield entry is ever held back', () => {
  const ours = { server: 'plugin:visibility-coach:higgsfield', provider: { plugin: PLUGIN } }

  expect(isOwnHiggsfield(ours, PLUGIN)).toBe(true)
  // A Higgsfield the owner added themselves, under any name.
  expect(isOwnHiggsfield({ ...ours, provider: { plugin: 'other' } }, PLUGIN)).toBe(false)
  expect(isOwnHiggsfield({ ...ours, server: 'claude.ai Higgsfield' }, PLUGIN)).toBe(false)
  // The coach's own server.
  expect(
    isOwnHiggsfield({ ...ours, server: 'plugin:visibility-coach:visibility-coach' }, PLUGIN),
  ).toBe(false)
})

test('with nothing read yet the panel says how to begin and can show an example', async ($, on) => {
  mock.store(on)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane(), surface })

    expect(await ui.find({ type: 'Text', text: /Get found by the right customers/ })).toBeDefined()
    await ui.press({ key: 'example' })
    expect(await ui.find({ type: 'Text', text: /Example\. Not your business\./ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Harbour Plumbing/ })).toBeDefined()
    await ui.press({ key: 'example' })
    expect(await ui.find({ type: 'Text', text: /Harbour Plumbing/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('a value an earlier version stored is declined', async ($, on) => {
  // What an older build wrote under `panel` stays through an update.
  on('state.get', ($, e, next) =>
    e.key === 'panel' ? { value: { value: { bogus: true }, version: 1 } } : next(e),
  )

  const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })

  expect(await ui.find({ type: 'Text', text: /Get found by the right customers/ })).toBeDefined()
  await ui.unmount()
})
