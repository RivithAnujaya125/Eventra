import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  HelpCircle, 
  Trash2, 
  ArrowRight,
  Bot
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

interface Message {
  role: "user" | "model";
  content: string;
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Suggested questions for fast interaction
  const suggestions = [
    { text: "📅 Show active events", prompt: "What events are currently scheduled and when are they happening?" },
    { text: "🔒 How does payment verification work?", prompt: "How does the payment proof / slip OCR auto-verification system work? What do I need to upload?" },
    { text: "🎟️ How do I use my ticket?", prompt: "How do I access my QR code entry pass and check in at the event gate?" }
  ];

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Load welcome message on init
  useEffect(() => {
    if (messages.length === 0) {
      const guestName = user?.displayName || "Guest";
      setMessages([
        {
          role: "model",
          content: `Hi **${guestName}**! Welcome to **Eventra Support & Assistance**. 

I am your dedicated AI Helper. I can help you with:
- Finding active events, times, locations, and ticket pricing.
- Registering for passes and uploading payment bank slips.
- Understanding our automated AI OCR receipt scanner.
- Managing QR access tickets and gates.

Ask me anything or select a suggestion below!`
        }
      ]);
    }
  }, [user]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || loading) return;

    const newMsg: Message = { role: "user", content: textToSend };
    setMessages(prev => [...prev, newMsg]);
    if (!customPrompt) setInputText("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages,
          username: user?.displayName || "Guest"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to communicate with AI helper.");
      }

      setMessages(prev => [...prev, { role: "model", content: data.reply }]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Could not retrieve assistance.");
      setMessages(prev => [
        ...prev,
        { 
          role: "model", 
          content: `⚠️ **Assistant Access Interrupted**\n\n${error.message || "An issue occurred connecting to the assistant. Please try again shortly."}` 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm("Clear conversation history?")) {
      setMessages([
        {
          role: "model",
          content: `Hi ${user?.displayName || "Guest"}! Let's start a fresh helper conversation. What can I assist you with today?`
        }
      ]);
    }
  };

  // Helper function to render text with bold markdown and lists
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, i) => {
      let trimmed = line.trim();
      
      // Inline formatting of bold sentences
      let content: React.ReactNode = line;
      if (line.includes("**")) {
        const parts = line.split("**");
        content = parts.map((part, index) => 
          index % 2 === 1 ? <strong key={index} className="text-white font-extrabold">{part}</strong> : part
        );
      }

      // Render bullet items cleanly
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        return (
          <li key={i} className="ml-4 list-disc text-zinc-300 text-xs mt-1 pl-1 leading-relaxed">
            {line.substring(2)}
          </li>
        );
      }

      // Check header styling
      if (trimmed.startsWith("### ")) {
        return <h4 key={i} className="text-xs font-bold text-blue-400 mt-3 mb-1 uppercase tracking-wider">{trimmed.replace("### ", "")}</h4>;
      }
      if (trimmed.startsWith("## ")) {
        return <h3 key={i} className="text-sm font-black text-white mt-4 mb-2 uppercase">{trimmed.replace("## ", "")}</h3>;
      }

      return <p key={i} className="text-xs leading-relaxed text-zinc-300 min-h-[12px]">{content}</p>;
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.3)] cursor-pointer border hover:scale-105 active:scale-95 transition-all outline-none duration-300 ${
            isOpen 
              ? "bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-805"
              : "bg-blue-600 hover:bg-blue-500 border-blue-505 text-white"
          }`}
          aria-label="Open AI Assistant"
          id="ai-floating-trigger"
        >
          {isOpen ? (
            <X className="w-6 h-6 animate-spin-once" />
          ) : (
            <div className="relative">
              <Bot className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Floating Drawer chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.93 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            id="ai-helper-drawer"
            className="fixed bottom-24 right-6 w-[380px] sm:w-[410px] max-w-[calc(100vw-32px)] h-[580px] max-h-[calc(100vh-120px)] bg-zinc-950 border border-zinc-850 rounded-3xl overflow-hidden flex flex-col shadow-2xl z-50 font-sans"
          >
            {/* Header */}
            <div className="bg-zinc-900 p-4 border-b border-zinc-850/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-white tracking-wide uppercase">Eventra AI Concierge</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Active Assistant</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  title="Clear Conversation"
                  className="p-1.5 bg-zinc-950/40 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded-lg transition cursor-pointer border border-zinc-850/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 bg-zinc-950/40 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition cursor-pointer border border-zinc-850/40"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat Messages scroll area */}
            <div 
              ref={scrollRef}
              className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-zinc-800"
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none px-4"
                      : "bg-zinc-900/60 border border-zinc-850 text-zinc-300 rounded-tl-none font-sans"
                  }`}>
                    {msg.role === "user" ? (
                      <p className="text-xs leading-relaxed font-sans font-medium">{msg.content}</p>
                    ) : (
                      renderFormattedText(msg.content)
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 border border-zinc-850 rounded-2xl rounded-tl-none p-4 space-y-2 max-w-[85%]">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                    <span className="text-[9px] text-zinc-550 font-mono tracking-widest uppercase block animate-pulse">Assistant is formulating response...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions & Input area container */}
            <div className="p-4 bg-zinc-900/40 border-t border-zinc-850/60 space-y-3">
              {/* Quick Suggestion buttons */}
              {messages.length <= 2 && !loading && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Quick help templates</span>
                  <div className="flex flex-col gap-1.5">
                    {suggestions.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(sug.prompt)}
                        className="text-left w-full bg-zinc-950/80 hover:bg-zinc-900 text-zinc-300 hover:text-white px-3 py-2 border border-zinc-855 rounded-xl text-xs transition cursor-pointer flex items-center justify-between"
                      >
                        <span className="truncate font-sans font-medium text-zinc-300">{sug.text}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-650" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input form field */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask for assistance..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={loading}
                  className="flex-grow bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-700 disabled:opacity-50 placeholder-zinc-600 font-sans"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || !inputText.trim()}
                  className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center border border-blue-505 hover:border-blue-400 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
