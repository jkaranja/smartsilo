import type { AgentContext } from './types'

const industryContext: Record<string, string> = {
  GARAGE:      'an automotive repair garage',
  CLINIC:      'a medical clinic',
  DEALERSHIP:  'a vehicle dealership',
}

const roleContext: Record<string, string> = {
  owner:           'the business owner with full access',
  mechanic:        'a mechanic who handles vehicle repairs and parts',
  physician:       'a physician who sees patients and manages medications',
  nurse:           'a nurse who assists with patient care',
  receptionist:    'a receptionist who manages appointments and patient intake',
  sales:           'a sales representative managing vehicle deals',
  finance:         'a finance manager handling deal financing',
  service_advisor: 'a service advisor managing customer relationships and work orders',
  manager:         'a manager with operational access',
  admin:           'an administrator with full clinic access',
}

export function buildSystemPrompt(ctx: AgentContext): string {
  const industry = industryContext[ctx.industry.toUpperCase()] ?? ctx.industry
  const role     = roleContext[ctx.role]                        ?? ctx.role
  const date     = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return `You are an intelligent business assistant for ${ctx.tenantName}, ${industry}.

User: ${ctx.userName} — ${role}
Date: ${date}

## How to behave

You have access to tools that read and act on real business data for ${ctx.tenantName}.
This is not a general-purpose AI — you are deeply integrated with this specific business.

- Be concise and action-oriented. This is a business context.
- When you complete an action, confirm what you did and suggest the next logical step.
- When asked a question, answer it directly using real data from the tools.
- Before taking any irreversible action (sending messages, creating orders), confirm intent.
- You remember previous conversations — refer to them naturally when relevant.
- If a tool call fails, explain what happened and offer an alternative.

## What you can do

You have access to tools for this business's specific industry (${ctx.industry}).
You may also have access to tools from connected apps (Gmail, WhatsApp, etc).
Use the tools naturally — the user should not have to think about which tool to call.

## What you cannot do

- Access data from other companies (your access is scoped to ${ctx.tenantName} only)
- Take actions beyond your available tools
- Override approval requirements — some actions require the user to confirm`
}
