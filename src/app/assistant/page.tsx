// src/app/assistant/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import { geminiClient } from '@/lib/agents/gemini-client';
import { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'أهلاً بك! أنا مساعدك الشخصي "المعاون". كيف يمكنني مساعدتك اليوم؟ (يمكنني تنظيم وقتك، اقتراح وصفات، أو تذكيرك بالعبادات)',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await geminiClient.chatWithAssistant(messages, userMsg.content);

      const botMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    }
    setIsTyping(false);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Bot className="h-8 w-8" />
          المعاون (The Assistant)
        </h1>
        <p className="text-slate-500">مساعدك الشخصي المدعوم بالذكاء الاصطناعي</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg border-primary/10">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 max-w-[80%]",
                msg.role === 'user' ? "mr-auto flex-row-reverse" : "ml-auto flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-primary text-white" : "bg-emerald-600 text-white"
              )}>
                {msg.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              </div>
              <div className={cn(
                "p-3 rounded-2xl text-sm shadow-sm",
                msg.role === 'user'
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-white border text-slate-800 rounded-tl-none"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex gap-3 max-w-[80%] ml-auto">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                   <Bot className="h-5 w-5" />
                </div>
                <div className="bg-white border p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                   <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                   <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                   <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                </div>
             </div>
          )}
        </CardContent>
        <CardFooter className="p-4 bg-white border-t">
          <div className="flex w-full gap-2">
            <Input
              placeholder="اكتب رسالتك هنا..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isTyping || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
