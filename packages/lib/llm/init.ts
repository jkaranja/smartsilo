import { LLMClient } from './client'

export type LLMClientConfig = {
    anthropicApiKey?: string
    openaiApiKey?: string
}

let llmConfig: LLMClientConfig | undefined

export const configureLLM = (config: LLMClientConfig | undefined) => {
    if (!config) {
        throw new Error('LLMConfig is required')
    }

    if (!config.openaiApiKey && !config.anthropicApiKey) {
        throw new Error('At least one API key is required')
    }

    llmConfig = config
}

export const getLLMConfig = () => {
    if (!llmConfig) {
        throw new Error('LLM is not configured')
    }

    return llmConfig
}

export const isLLMEnabled = () => !!llmConfig

export let llm: LLMClient

export const initLLM = () => {
    if (!isLLMEnabled()) {
        return
    }

    const config = getLLMConfig()

    llm = new LLMClient(config)
}
