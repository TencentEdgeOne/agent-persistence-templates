/**
 * Human-in-the-loop Agent example — POST /hitl
 *
 * The serialized RunState lives in EdgeOne's server-side state store. The
 * browser only sends a message or an approval decision; it never receives the
 * serialized state payload.
 */
import OpenAI from 'openai';
import { Agent, OpenAIChatCompletionsModel, RunState, run, tool } from '@openai/agents';
import { z } from 'zod';

const DEFAULT_MODEL = '@makers/deepseek-v4-flash';
const RUN_STATE_KEY = 'openai.run-state';

type StateStore = {
  get?: (key: string) => Promise<unknown>;
  set?: (key: string, value: string) => Promise<unknown>;
  delete?: (key: string) => Promise<unknown>;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}


function getStateStore(context: any): StateStore | null {
  return (context.store?.state as StateStore | undefined) ?? null;
}

async function readState(context: any, key: string): Promise<string | null> {
  const stateStore = getStateStore(context);
  if (!stateStore?.get) return null;
  const stored = await stateStore.get(key);
  if (typeof stored === 'string') return stored;
  if (stored && typeof stored === 'object' && 'value' in stored) {
    const value = (stored as { value?: unknown }).value;
    return typeof value === 'string' ? value : null;
  }
  return null;
}

async function writeState(context: any, key: string, value: string): Promise<void> {
  const stateStore = getStateStore(context);
  if (!stateStore?.set) throw new Error('context.store.state.set is unavailable');
  await stateStore.set(key, value);
}

async function deleteState(context: any, key: string): Promise<void> {
  const stateStore = getStateStore(context);
  if (stateStore?.delete) await stateStore.delete(key);
}

function approvalSummary(item: any, index: number) {
  const raw = item?.rawItem ?? item?.raw_item ?? item;
  const input = raw?.arguments ?? item?.arguments ?? '';
  return {
    index,
    tool: raw?.name ?? item?.name ?? 'tool',
    input,
  };
}

function createAgent(context: any) {
  const env = context.env as Record<string, string | undefined>;
  const client = new OpenAI({
    apiKey: env.AI_GATEWAY_API_KEY,
    baseURL: env.AI_GATEWAY_BASE_URL,
  });
  const model = new OpenAIChatCompletionsModel(
    client,
    env.AI_GATEWAY_MODEL ?? DEFAULT_MODEL,
  );

  const submitOrder = tool({
    name: 'submit_order',
    description: 'Submit an order after the user explicitly asks you to place it.',
    parameters: z.object({
      order: z.string().describe('The order to submit'),
    }),
    needsApproval: true,
    execute: async ({ order }) => `order-submitted:${order}`,
  });

  return new Agent({
    name: 'HITL Assistant',
    instructions:
      'You are an OpenAI Agents SDK human-in-the-loop demo on EdgeOne Makers. ' +
      'Answer questions directly. If the user asks to submit an order, call submit_order. ' +
      'Submitting is a demo action that must wait for explicit human approval.',
    tools: [submitOrder],
    model,
  });
}

export async function onRequest(context: any) {
  const body = context.request.body ?? {};
  const conversationId = String(context.conversation_id ?? '').trim();
  if (!conversationId) return json({ error: 'makers-conversation-id is required' }, 400);

  const stateStore = getStateStore(context);
  if (!stateStore?.get || !stateStore.set) {
    return json({ error: 'HITL state store is unavailable', code: 'HITL_STATE_STORE_UNAVAILABLE' }, 503);
  }

  const key = RUN_STATE_KEY;
  const action = body.action === 'resume' ? 'approve' : null;
  const stored = await readState(context, key);
  const agent = createAgent(context);
  let state: RunState<any, any>;

  if (action) {
    if (!stored) return json({ code: 'AGENT_STATE_NOT_FOUND', message: 'No pending approval exists for this conversation.' }, 409);
    try {
      state = await RunState.fromString(agent, stored);
    } catch (error) {
      console.error('[hitl] corrupt RunState:', error);
      return json({ code: 'AGENT_STATE_CORRUPT', message: 'The pending approval state is corrupt' }, 409);
    }

    const interruptions = state.getInterruptions();
    const index = Number.isInteger(body.approvalIndex) ? body.approvalIndex : 0;
    const approval = interruptions[index];
    if (!approval) return json({ error: 'The approval request is no longer available', code: 'HITL_APPROVAL_MISSING' }, 400);
    if (body.approved === true) state.approve(approval);
    else if (body.approved === false) state.reject(approval, { message: 'The user rejected this action.' });
    else return json({ error: "'approved' must be a boolean" }, 400);
  } else {
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return json({ error: "'message' is required" }, 400);
    if (stored) return json({ error: 'An approval is already pending', code: 'HITL_APPROVAL_PENDING' }, 409);
    state = undefined as never;
    const result = await run(agent, message, { signal: context.request.signal });
    const pending = result.state.getInterruptions();
    if (pending.length > 0) {
      await writeState(context, key, result.state.toString());
      return json({ status: 'awaiting_approval', interruptions: [approvalSummary(pending[0], 0)] });
    }
    await deleteState(context, key);
    return json({ status: 'completed', output: result.finalOutput ?? '' });
  }

  const result = await run(agent, state, { signal: context.request.signal });
  const pending = result.state.getInterruptions();
  if (pending.length > 0) {
    await writeState(context, key, result.state.toString());
    return json({ status: 'awaiting_approval', interruptions: [approvalSummary(pending[0], 0)] });
  }

  await deleteState(context, key);
  return json({ status: 'completed', output: result.finalOutput ?? '' });
}
