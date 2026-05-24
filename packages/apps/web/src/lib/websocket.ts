import { writable } from 'svelte/store'
import type { StreamEvent, UIMessage, Capability, ApprovalEvent } from './types'

export const messages        = writable<UIMessage[]>([])
export const capabilities    = writable<Capability[]>([])
export const pendingApproval = writable<ApprovalEvent | null>(null)
export const isConnected     = writable(false)
export const isThinking      = writable(false)

let ws: WebSocket | null = null

export function connect(tenantSlug: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const agentHost = import.meta.env.VITE_AGENT_HOST
    ?? window.location.host.replace(/:\d+/, ':3003')
  ws = new WebSocket(`${protocol}//${agentHost}/agent/${tenantSlug}`)

  ws.onopen  = () => isConnected.set(true)

  ws.onclose = () => {
    isConnected.set(false)
    isThinking.set(false)
    setTimeout(() => connect(tenantSlug), 2000)
  }

  ws.onmessage = (e: MessageEvent) => {
    const event: StreamEvent = JSON.parse(e.data)
    handleEvent(event)
  }
}

function handleEvent(event: StreamEvent) {
  switch (event.type) {

    case 'text_delta':
      messages.update(msgs => {
        const last = msgs[msgs.length - 1]
        if (last?.role === 'agent' && !last.thinking) {
          return [...msgs.slice(0, -1), { ...last, content: last.content + event.text }]
        }
        if (last?.thinking) {
          return [...msgs.slice(0, -1), { id: last.id, role: 'agent', content: event.text }]
        }
        return [...msgs, { id: crypto.randomUUID(), role: 'agent', content: event.text }]
      })
      break

    case 'tool_call':
      messages.update(msgs => {
        const last = msgs[msgs.length - 1]
        if (last?.thinking) {
          return [...msgs.slice(0, -1), { ...last, toolName: event.tool }]
        }
        return [...msgs, { id: crypto.randomUUID(), role: 'agent', content: '', thinking: true, toolName: event.tool }]
      })
      isThinking.set(true)
      break

    case 'tool_result':
      isThinking.set(false)
      break

    case 'approval_required':
      pendingApproval.set(event)
      isThinking.set(false)
      break

    case 'approval_granted':
      pendingApproval.set(null)
      isThinking.set(true)
      break

    case 'done':
      isThinking.set(false)
      if (event.availableTools) capabilities.set(event.availableTools)
      break

    case 'error':
      isThinking.set(false)
      messages.update(msgs => [
        ...msgs,
        { id: crypto.randomUUID(), role: 'agent', content: event.message, isError: true },
      ])
      break
  }
}

export function send(text: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'message', text }))

  messages.update(msgs => [
    ...msgs,
    { id: crypto.randomUUID(), role: 'user', content: text },
    { id: crypto.randomUUID(), role: 'agent', content: '', thinking: true },
  ])

  isThinking.set(true)
}

export function respondToApproval(approvalId: string, approved: boolean) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'approval_response', approvalId, approved }))
  pendingApproval.set(null)
  if (approved) isThinking.set(true)
}
