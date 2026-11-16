import { expect, mock, test } from 'claude-code/testing'

import { isOwnClarity } from '../hooks/register'

const PLUGIN = 'nearmost'
const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const
const START = 'mcp__plugin_nearmost_nearmost__start_here'

const pane = (placement: 'dock' | 'widget' = 'dock') =>
  ({
    plugin: PLUGIN,
    component: 'Pane',
    requestId: 'coach',
    props: {
      title: 'Nearmost',
      isFocused: false,
      bodyColumns: 44,
      placement,
      scroll: { offset: 0, bodyRows: 40 },
      view: {},
    },
  }) as const

const PANEL = {
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

const tool = (name: string) => ({ name, description: '', mcp: true })

test('the card shows the number and its source, health, the next step and the work so far, on every surface', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  on('command.register', () => ({ value: { command: 'nearmost' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.list', () => ({ value: [tool(START)] }))
  on('tool.call', () => ({ result: { structuredContent: { panel: PANEL } } }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: START })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane(), surface })

    expect(await ui.find({ type: 'Text', text: /^Harbour Plumbing$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^14$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^taps on Call from Google this month$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^3 more than last month\. Started at 9\.$/ })).toBeDefined()
    // Where it was counted, and the last day it covers.
    expect(
      await ui.find({ type: 'Text', text: /^From Google Business Profile, through Nov 12$/ }),
    ).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Add the suburbs you serve$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^10 minutes$/ })).toBeDefined()
    // One sentence on why the step gets the owner ahead.
    expect(
      await ui.find({ type: 'Text', text: /^Google shows you to people searching in the suburbs you name\.$/ }),
    ).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Visibility health: 3 of 4 good$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^6 done · 2 waiting for your OK$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Next check-in Nov 16$/ })).toBeDefined()
    await ui.unmount()

    const small = await $.ui.mount({ ...pane('widget'), surface })

    expect(await small.find({ type: 'Text', text: /^14 taps on Call from Google this month$/ })).toBeDefined()
    expect(await small.find({ type: 'Text', text: /^2 waiting for your OK$/ })).toBeDefined()
    await small.unmount()
  }
})

test('once the coach is running the card has nothing to press: the owner talks to Claude', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.list', () => ({ value: [tool(START)] }))
  on('tool.call', () => ({ result: { structuredContent: { panel: PANEL } } }))

  await $.tool.call({ tool: START })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane(), surface })

    expect(await ui.find({ type: 'Button' })).toBeUndefined()
    expect(await ui.find({ type: 'Link' })).toBeUndefined()
    // It says how to ask instead.
    expect(
      await ui.find({ type: 'Text', text: /^Say "do it for me" or "show me how"\.$/ }),
    ).toBeDefined()
    await ui.unmount()
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

test('the coach is recognised under the connector name it had before', async ($, on) => {
  // An owner who added the connector themselves, before the rename.
  const old = 'mcp__visibility-coach__start_here'
  mock.store(on)
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.list', () => ({ value: [tool(old)] }))
  on('tool.call', () => ({ result: { structuredContent: { panel: PANEL } } }))

  await $.tool.call({ tool: old })

  const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })

  expect(await ui.find({ type: 'Text', text: /^14$/ })).toBeDefined()
  await ui.unmount()
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

test('text from outside is cut to size and an unsafe renew link is dropped', async ($, on) => {
  let buyUrl = 'javascript:alert(1)'
  mock.store(on)
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.list', () => ({ value: [tool(START)] }))
  on('tool.call', () => ({
    result: {
      panel: {
        business: `Evil\u0007Corp ${'x'.repeat(500)}`,
        plan: { state: 'ended', buyUrl },
        result: { value: '9'.repeat(40), label: 'calls', source: 'owner' },
        done: 5000000,
        waiting: 100000,
      },
    },
  }))

  await $.tool.call({ tool: START })

  const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })

  expect((await ui.find({ type: 'Text', text: /^Evil Corp/ }))?.text.length).toBe(60)
  expect((await ui.find({ type: 'Text', text: /^9+$/ }))?.text.length).toBe(12)
  expect(await ui.find({ type: 'Text', text: /^From what you told me$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Your plan has ended/ })).toBeDefined()
  expect(await ui.find({ type: 'Link' })).toBeUndefined()
  // Counts too large to be true are not shown at all.
  expect(await ui.find({ type: 'Text', text: /done|waiting for your OK/ })).toBeUndefined()
  await ui.unmount()

  buyUrl = 'https://example.com/renew'
  await $.tool.call({ tool: START })

  const again = await $.ui.mount({ ...pane(), surface: 'desktop' })

  expect(await again.find({ type: 'Link' })).toBeDefined()
  await again.unmount()
})

test('signed out, the card offers one thing: sign in', async ($, on) => {
  const filled: string[] = []
  mock.store(on)
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.fill', (_, e) => {
    filled.push(e.text)

    return { isFilled: true }
  })
  // The coach's server is listed but waits on sign-in: it offers no tools,
  // and a call to it is refused.
  on('tool.list', () => ({ value: [] }))
  on('mcp.connect', () => ({
    value: { isConnected: false, reason: 'auth', message: 'needs sign-in' },
  }))
  on('tool.call', () => ({ deny: 'Not signed in.' }))

  await $.tool.call({ tool: START })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane(), surface })

    expect(await ui.find({ type: 'Text', text: /^Sign in to begin$/ })).toBeDefined()
    expect((await ui.find({ key: 'sign-in' }))?.props.variant).toBe('primary')
    expect(await ui.find({ type: 'Text', text: /help me show up on Google/ })).toBeUndefined()
    await ui.unmount()
  }

  // The one press that writes anything: it puts `/mcp` in the message box
  // for the owner to send.
  const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })
  await ui.press({ key: 'sign-in' })

  expect(filled).toEqual(['/mcp'])
  expect(await ui.find({ type: 'Text', text: /Choose nearmost/ })).toBeDefined()
  // Access follows the email the owner paid with, so the steps say so.
  expect(
    await ui.find({ type: 'Text', text: /Use the email you bought Nearmost with/ }),
  ).toBeDefined()
  await ui.unmount()
})

test('visibility health is the headline until a result replaces it', async ($, on) => {
  const first = {
    business: 'Harbour Plumbing',
    standing: [
      { label: 'Google search', state: 'fix' },
      { label: 'Google Maps', state: 'fix' },
      { label: 'AI assistants', state: 'fix' },
      { label: 'Reviews', state: 'good' },
    ],
    next: { title: 'Approve your opening hours', minutes: 2 },
  }
  let sent: object = first
  mock.store(on)
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.list', () => ({ value: [tool(START)] }))
  on('tool.call', () => ({ result: { structuredContent: { panel: sent } } }))

  await $.tool.call({ tool: START })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane(), surface })

    expect(await ui.find({ type: 'Text', text: /^1 of 4$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^visibility checks in good shape$/ })).toBeDefined()
    expect(
      await ui.find({ type: 'Text', text: /^Needs work: Google search, Google Maps, AI assistants\.$/ }),
    ).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Approve your opening hours$/ })).toBeDefined()
    // Health is the headline here, so it is not repeated as a line.
    expect(await ui.find({ type: 'Text', text: /^Visibility health:/ })).toBeUndefined()
    await ui.unmount()
  }

  sent = { ...first, result: PANEL.result }
  await $.tool.call({ tool: START })

  const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })

  expect(await ui.find({ type: 'Text', text: /^1 of 4$/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^14$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Visibility health: 1 of 4 good$/ })).toBeDefined()
  await ui.unmount()
})

test('a number that does not say where it was counted is not drawn', async ($, on) => {
  let source: string | undefined
  mock.store(on)
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.list', () => ({ value: [tool(START)] }))
  on('tool.call', () => ({
    result: {
      structuredContent: {
        panel: {
          business: 'Harbour Plumbing',
          result: { value: '14', label: 'calls this month', source },
          next: { title: 'Add the suburbs you serve' },
        },
      },
    },
  }))

  // No source, then one the card has never heard of: no number either time.
  for (source of [undefined, 'a guess']) {
    await $.tool.call({ tool: START })

    const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })

    expect(await ui.find({ type: 'Text', text: /^14$/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /^calls this month$/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /^Add the suburbs you serve$/ })).toBeDefined()
    await ui.unmount()
  }

  source = 'clarity'
  await $.tool.call({ tool: START })

  const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })

  expect(await ui.find({ type: 'Text', text: /^14$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^From Microsoft Clarity$/ })).toBeDefined()
  await ui.unmount()
})

test("only this plugin's own Clarity entry is ever held back", () => {
  const ours = { server: 'plugin:nearmost:clarity', provider: { plugin: PLUGIN } }

  expect(isOwnClarity(ours, PLUGIN)).toBe(true)
  // A Clarity the owner added themselves, under any name.
  expect(isOwnClarity({ ...ours, provider: { plugin: 'other' } }, PLUGIN)).toBe(false)
  expect(isOwnClarity({ ...ours, server: 'Microsoft Clarity' }, PLUGIN)).toBe(false)
  // The coach's own server.
  expect(isOwnClarity({ ...ours, server: 'plugin:nearmost:nearmost' }, PLUGIN)).toBe(false)
})

test('with nothing read yet the card says what to say and can show an example', async ($, on) => {
  mock.store(on)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane(), surface })

    expect(await ui.find({ type: 'Text', text: /^See how customers find you$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Say "help me show up on Google"\.$/ })).toBeDefined()
    // And what saying it starts.
    expect(await ui.find({ type: 'Text', text: /^Then, in about ten minutes:$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^1\. A few questions about your business\.$/ })).toBeDefined()
    expect(
      await ui.find({ type: 'Text', text: /^3\. Your first fix: done for you, or shown to you\.$/ }),
    ).toBeDefined()
    await ui.press({ key: 'example' })
    expect(await ui.find({ type: 'Text', text: /Example\. Not your business\./ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Harbour Plumbing$/ })).toBeDefined()
    await ui.press({ key: 'example' })
    expect(await ui.find({ type: 'Text', text: /^Harbour Plumbing$/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('a value an earlier version stored is declined', async ($, on) => {
  // What an older build wrote under `panel` stays through an update.
  on('state.get', ($, e, next) =>
    e.key === 'panel' ? { value: { value: { bogus: true }, version: 1 } } : next(e),
  )

  const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })

  expect(await ui.find({ type: 'Text', text: /^See how customers find you$/ })).toBeDefined()
  await ui.unmount()
})

test('the first session after installing says how to begin, once', async ($, on) => {
  const said: string[] = []
  mock.store(on)
  on('command.register', () => ({ value: { command: 'nearmost' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.toast', (_, e) => {
    said.push(e.text)

    return { value: undefined }
  })

  // A run with nobody at the prompt says nothing, and does not use it up.
  await $.session.start({ cwd: '/', surface: null, isInteractive: false })
  expect(said).toEqual([])

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(said).toEqual(['Nearmost is ready. Say "help me show up on Google" to begin.'])
})

test('once the owner has talked to Nearmost the card stops saying how to begin', async ($, on) => {
  // A store of the test's own, so what is written can be read back here.
  const kept: string[] = []
  mock.clock(on)
  on('store.get', () => ({ value: undefined }))
  on('store.set', (_, e) => {
    kept.push(`${e.key}=${String(e.value)}`)

    return { value: undefined }
  })
  on('command.register', () => ({ value: { command: 'nearmost' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.list', () => ({ value: [tool(START)] }))
  // The server answers, with nothing for the card yet.
  on('tool.call', () => ({ result: { content: [{ type: 'text', text: 'Welcome.' }] } }))

  await $.tool.call({ tool: START })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane(), surface })

    expect(await ui.find({ type: 'Text', text: /^You are under way$/ })).toBeDefined()
    expect(
      await ui.find({ type: 'Text', text: /^Keep going in the chat\. Say "what's next\?" any time\.$/ }),
    ).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /help me show up on Google/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /in about ten minutes/ })).toBeUndefined()
    await ui.unmount()

    const small = await $.ui.mount({ ...pane('widget'), surface })

    expect(await small.find({ type: 'Text', text: /help me show up on Google/ })).toBeUndefined()
    await small.unmount()
  }

  // It is written down once, for the sessions after this one.
  expect(kept).toEqual(['begun=true'])
})

test('an owner who started in an earlier session is not asked to start again', async ($, on) => {
  mock.store(on, { begun: true, welcomed: true })
  on('command.register', () => ({ value: { command: 'nearmost' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...pane(), surface: 'desktop' })

  expect(await ui.find({ type: 'Text', text: /^You are under way$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /help me show up on Google/ })).toBeUndefined()
  await ui.unmount()
})

test('the small card says what to say before the owner has started', async ($, on) => {
  mock.store(on)

  const small = await $.ui.mount({ ...pane('widget'), surface: 'desktop' })

  expect(await small.find({ type: 'Text', text: /^Nearmost$/ })).toBeDefined()
  expect(await small.find({ type: 'Text', text: /^Say "help me show up on Google"$/ })).toBeDefined()
  await small.unmount()
})
