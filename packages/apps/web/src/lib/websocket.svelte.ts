import type { StreamEvent, UIMessage, Capability, ApprovalEvent } from './types';

export let messages: UIMessage[] = $state([]);
export let capabilities: Capability[] = $state([]);
export let pendingApproval: ApprovalEvent | null = $state(null);
export let isConnected: boolean = $state(false);
export let isThinking: boolean = $state(false);

let ws: WebSocket | null = null;

export function connect() {
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	const agentHost =
		import.meta.env.VITE_AGENT_HOST ?? window.location.host.replace(/:\d+/, ':3003');

	ws = new WebSocket(`${protocol}//${agentHost}/agent`);

	ws.onopen = () => {
		isConnected = true;
	};

	ws.onclose = () => {
		isConnected = false;
		isThinking = false;
		setTimeout(() => connect(), 2000);
	};

	ws.onmessage = (e: MessageEvent) => {
		const event: StreamEvent = JSON.parse(e.data);
		handleEvent(event);
	};
}

function handleEvent(event: StreamEvent) {
	switch (event.type) {
		case 'connected':
			capabilities = event.capabilities;
			break;

		case 'text_delta': {
			const last = messages.at(-1);
			if (last?.role === 'agent' && !last.thinking) {
				last.content += event.text;
			} else if (last?.thinking) {
				messages[messages.length - 1] = { id: last.id, role: 'agent', content: event.text };
			} else {
				messages.push({ id: crypto.randomUUID(), role: 'agent', content: event.text });
			}
			break;
		}

		case 'tool_call': {
			const last = messages.at(-1);
			if (last?.thinking) {
				last.toolName = event.tool;
			} else {
				messages.push({
					id: crypto.randomUUID(),
					role: 'agent',
					content: '',
					thinking: true,
					toolName: event.tool
				});
			}
			isThinking = true;
			break;
		}

		case 'tool_result':
			isThinking = false;
			break;

		case 'approval_required':
			pendingApproval = event;
			isThinking = false;
			break;

		case 'approval_granted':
			pendingApproval = null;
			isThinking = true;
			break;

		case 'done':
			isThinking = false;
			break;

		case 'error':
			isThinking = false;
			messages.push({
				id: crypto.randomUUID(),
				role: 'agent',
				content: event.message,
				isError: true
			});
			break;
	}
}

export function send(text: string) {
	if (!ws || ws.readyState !== WebSocket.OPEN) return;
	ws.send(JSON.stringify({ type: 'message', text }));
	messages.push(
		{ id: crypto.randomUUID(), role: 'user', content: text },
		{ id: crypto.randomUUID(), role: 'agent', content: '', thinking: true }
	);
	isThinking = true;
}

export function respondToApproval(approvalId: string, approved: boolean) {
	if (!ws || ws.readyState !== WebSocket.OPEN) return;
	ws.send(JSON.stringify({ type: 'approval_response', approvalId, approved }));
	pendingApproval = null;
	if (approved) isThinking = true;
}
