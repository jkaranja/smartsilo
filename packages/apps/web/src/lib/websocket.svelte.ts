import type { StreamEvent, UIMessage, Topic, App, ApprovalEvent } from './types';

class WebSocketStore {
	messages: UIMessage[] = $state([]);
	topics: Topic[] = $state([]);
	apps: App[] = $state([]);
	pendingApproval: ApprovalEvent | null = $state(null);
	isConnected: boolean = $state(false);
	isThinking: boolean = $state(false);

	#ws: WebSocket | null = null;

	connect() {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const agentHost =
			import.meta.env.VITE_AGENT_HOST ?? window.location.host.replace(/:\d+/, ':3003');

		this.#ws = new WebSocket(`${protocol}//${agentHost}/agent`);

		this.#ws.onopen = () => {
			this.isConnected = true;
		};

		this.#ws.onclose = () => {
			this.isConnected = false;
			this.isThinking = false;
			setTimeout(() => this.connect(), 2000);
		};

		this.#ws.onmessage = (e: MessageEvent) => {
			const event: StreamEvent = JSON.parse(e.data);
			this.#handleEvent(event);
		};
	}

	#handleEvent(event: StreamEvent) {
		switch (event.type) {
			case 'connected':
				this.topics = event.topics;
				this.apps = event.apps;
				break;

			case 'text_delta': {
				const last = this.messages.at(-1);
				if (last?.role === 'agent' && !last.thinking) {
					last.content += event.text;
				} else if (last?.thinking) {
					this.messages[this.messages.length - 1] = { id: last.id, role: 'agent', content: event.text };
				} else {
					this.messages.push({ id: crypto.randomUUID(), role: 'agent', content: event.text });
				}
				break;
			}

			case 'tool_call': {
				const last = this.messages.at(-1);
				if (last?.thinking) {
					last.toolName = event.tool;
				} else {
					this.messages.push({
						id: crypto.randomUUID(),
						role: 'agent',
						content: '',
						thinking: true,
						toolName: event.tool
					});
				}
				this.isThinking = true;
				break;
			}

			case 'tool_result':
				this.isThinking = false;
				break;

			case 'approval_required':
				this.pendingApproval = event;
				this.isThinking = false;
				break;

			case 'approval_granted':
				this.pendingApproval = null;
				this.isThinking = true;
				break;

			case 'done':
				this.isThinking = false;
				break;

			case 'error':
				this.isThinking = false;
				this.messages.push({
					id: crypto.randomUUID(),
					role: 'agent',
					content: event.message,
					isError: true
				});
				break;
		}
	}

	send(text: string, topic: string = 'general') {
		if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) return;
		this.#ws.send(JSON.stringify({ type: 'message', text, topic }));
		this.messages.push(
			{ id: crypto.randomUUID(), role: 'user', content: text },
			{ id: crypto.randomUUID(), role: 'agent', content: '', thinking: true }
		);
		this.isThinking = true;
	}

	clearMessages() {
		this.messages = [];
	}

	respondToApproval(approvalId: string, approved: boolean) {
		if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) return;
		this.#ws.send(JSON.stringify({ type: 'approval_response', approvalId, approved }));
		this.pendingApproval = null;
		if (approved) this.isThinking = true;
	}
}

export const ws = new WebSocketStore();
