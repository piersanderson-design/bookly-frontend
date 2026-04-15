"use client";

import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { BookOpen } from "lucide-react";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";

const ConversationDemo = () => {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text.trim()) {
      sendMessage({ text: message.text });
      setInput("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<BookOpen className="size-12" />}
                title="Welcome to Bookly Customer Support"
                description="Hi there! I'm your Bookly customer service assistant. I'm here to help with order status, shipping information, refunds and returns, password resets, and any other questions about your Bookly account. Just ask away!"
              />
            ) : (
              messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                       switch (part.type) {
                         case "text":
                           const textPart = part as any;
                           return (
                             <MessageResponse key={`${message.id}-${i}`}>
                               {textPart.text}
                             </MessageResponse>
                           );
                         case "step-start":
                           // Don't render step markers
                           return null;
                         default:
                           // Handle tool parts
                           const toolPart = part as any;
                           if (toolPart.state === "output-available" && toolPart.output) {
                             return (
                               <div
                                 key={`${message.id}-${i}`}
                                 className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg my-2 border border-blue-200 dark:border-blue-800"
                               >
                                 <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                   {toolPart.toolName}
                                 </p>
                                 <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                                   {typeof toolPart.output === 'string' ? toolPart.output : JSON.stringify(toolPart.output, null, 2)}
                                 </div>
                               </div>
                             );
                           }
                           // Don't render tool parts that aren't complete yet
                           return null;
                       }
                     })}
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationDownload messages={messages} />
          <ConversationScrollButton />
        </Conversation>

        <PromptInput
          onSubmit={handleSubmit}
          className="mt-4 w-full max-w-2xl mx-auto relative"
        >
          <PromptInputTextarea
            value={input}
            placeholder="Say something..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status === "streaming" ? "streaming" : "ready"}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </PromptInput>
      </div>
    </div>
  );
};

export default ConversationDemo;
