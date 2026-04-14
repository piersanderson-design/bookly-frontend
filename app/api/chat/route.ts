import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4.1"),
    system:
      "You are a helpful assistant. Use tools when they help answer the user's question",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
