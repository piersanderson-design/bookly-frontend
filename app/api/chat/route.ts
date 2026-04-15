import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { BOOKLY_SYSTEM_PROMPT } from "@/lib/prompts";
import { booklyTools } from "@/lib/tools";

export async function POST(req: Request) {
  console.log('[API] POST /api/chat called');
  const { messages }: { messages: UIMessage[] } = await req.json();
  console.log('[API] Messages:', messages.length);
  console.log('[API] Message parts:', messages.map(m => ({ role: m.role, parts: m.parts.length })));

  const convertedMessages = await convertToModelMessages(messages);
  console.log('[API] Converted messages:', convertedMessages.length);
  console.log('[API] First converted message:', convertedMessages[0]);

  const result = streamText({
    model: openai("gpt-4.1"),
    system: BOOKLY_SYSTEM_PROMPT,
    messages: convertedMessages,
    tools: booklyTools,
  });

  console.log('[API] streamText created, returning response');
  return result.toUIMessageStreamResponse();
}
