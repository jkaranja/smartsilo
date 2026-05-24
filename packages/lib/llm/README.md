# @whoovia/llm

Universal LLM client with support for OpenAI and Anthropic. Provides a unified interface for structured output generation using Zod schemas.

## Setup

```bash
bun install
```

## Usage

```ts
import { configureLLM, initLLM, llm } from './init'

// Configure once — pass either or both keys to use clients
configureLLM({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
})

// init LLM clients
initLLM()

// Define your output schema
const AnswerSchema = Type.Object({
    answer: Type.String(),
    confidence: Type.Number(),
    name: Type.Optional(Type.String()),
})

// Pass the model per call — Anthropic and OpenAI models are supported
const result = await llm.create({
    model: 'claude-sonnet-4-6', // or 'gpt-5', 'gpt-5.4-mini', etc.
    input: [
        { role: 'developer', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Are semicolons optional in JavaScript?' },
    ],
    outputSchema: AnswerSchema,
})

result.answer // string ✓
result.confidence // number ✓
result.name // string | undefined ✓
```
