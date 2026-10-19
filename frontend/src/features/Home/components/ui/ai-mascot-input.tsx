"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PiArrowUpBold,
  PiBrainFill,
  PiPaperclipBold,
  PiMicrophoneBold,
  PiMicrophoneFill,
  PiCaretDownBold,
  PiCheckBold,
  PiXBold,
  PiFileBold,
  PiImageBold,
  PiGlobeBold,
} from "react-icons/pi";

export const OpenAiIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
);

export const AnthropicIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
  </svg>
);

export const GeminiIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" />
  </svg>
);

export const MistralIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.143 3.429v3.428h-3.429v3.429h-3.428V6.857H6.857V3.43H3.43v13.714H0v3.428h10.286v-3.428H6.857v-3.429h3.429v3.429h3.429v-3.429h3.428v3.429h-3.428v3.428H24v-3.428h-3.43V3.429z" />
  </svg>
);

export type RobotEmotion = "reading" | "thinking";

export interface ReasoningLevel {
  id: string;
  label: string;
  desc: string;
  multiplier: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  tag?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badgeColor: string;
  accentColor: string;
  reasoningTitle: string;
  defaultLevel: string;
  levels: ReasoningLevel[];
}

export interface AttachedFile {
  name: string;
  isImage: boolean;
  file?: File;
}

export interface ChatSubmitData {
  prompt: string;
  model: AIModel;
  effort: string;
  useWebSearch: boolean;
  attachedFile: AttachedFile | null;
}

export interface AiMascotInputProps {
  /** Callback fired when user submits a message */
  onSubmit?: (data: ChatSubmitData) => void | Promise<void>;
  /** Optional controlled thinking/processing state */
  isProcessing?: boolean;
  /** Optional controlled prompt text */
  value?: string;
  /** Optional change handler for controlled prompt text */
  onChange?: (value: string) => void;
  /** Disable the entire input */
  disabled?: boolean;
  /** Initial or default placeholder */
  placeholder?: string;
  /** Welcome title displayed initially */
  title?: string;
  /** Welcome subtitle */
  subtitle?: string;
  /** Whether to show the welcome banner */
  showWelcome?: boolean;
  /** Available AI models */
  models?: AIModel[];
  /** Default selected model ID */
  defaultModelId?: string;
  /** Toggle voice input */
  enableVoice?: boolean;
  /** Toggle live web search */
  enableWebSearch?: boolean;
  /** Toggle file attachments */
  enableAttachments?: boolean;
  /** Extra CSS classes for the inner input card */
  className?: string;
  /** Extra CSS classes for the outer wrapper */
  containerClassName?: string;
}

export const DEFAULT_AI_MODELS: AIModel[] = [
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    tag: "Thinking",
    icon: OpenAiIcon,
    badgeColor: "text-emerald-500",
    accentColor: "#10a37f",
    reasoningTitle: "Reasoning effort",
    defaultLevel: "high",
    levels: [
      { id: "low", label: "Low", desc: "Fast responses with concise analysis", multiplier: 1.8 },
      { id: "medium", label: "Medium", desc: "Balanced step-by-step reasoning", multiplier: 2.6 },
      { id: "high", label: "High", desc: "Exhaustive reasoning for complex tasks", multiplier: 3.6 },
      { id: "max", label: "Max", desc: "Maximum computational depth and synthesis", multiplier: 4.8 },
    ],
  },
  {
    id: "claude-fable-5-1",
    name: "Claude Fable 5.1",
    provider: "Anthropic",
    tag: "Mythos",
    icon: AnthropicIcon,
    badgeColor: "text-amber-500",
    accentColor: "#d97706",
    reasoningTitle: "Thinking budget",
    defaultLevel: "high",
    levels: [
      { id: "medium", label: "Medium", desc: "Structured thinking for standard workflows", multiplier: 2.4 },
      { id: "high", label: "High", desc: "Deep analytical deduction for complex workflows", multiplier: 3.6 },
      { id: "max", label: "Max", desc: "Autonomous synthesis with maximum deliberation", multiplier: 4.8 },
    ],
  },
  {
    id: "gemini-3-8",
    name: "Gemini 3.8 Flash",
    provider: "Google",
    tag: "Agentic",
    icon: GeminiIcon,
    badgeColor: "text-blue-500",
    accentColor: "#3b82f6",
    reasoningTitle: "Extended thinking",
    defaultLevel: "medium",
    levels: [
      { id: "low", label: "Low", desc: "Minimal latency and direct responses", multiplier: 1.6 },
      { id: "medium", label: "Medium", desc: "Balanced multimodal reasoning", multiplier: 2.6 },
      { id: "high", label: "High", desc: "Extended thinking with cross-verification", multiplier: 3.8 },
    ],
  },
  {
    id: "mistral-large-4",
    name: "Mistral Large 4",
    provider: "Mistral AI",
    tag: "1T Multimodal",
    icon: MistralIcon,
    badgeColor: "text-orange-500",
    accentColor: "#f97316",
    reasoningTitle: "Inference mode",
    defaultLevel: "medium",
    levels: [
      { id: "low", label: "Low", desc: "Agile inference without chain-of-thought", multiplier: 1.8 },
      { id: "medium", label: "Medium", desc: "Standard multimodal logic and reasoning", multiplier: 2.8 },
      { id: "max", label: "Max", desc: "Comprehensive audit and formal verification", multiplier: 4.6 },
    ],
  },
  {
    id: "o3-mini",
    name: "o3-mini",
    provider: "OpenAI",
    tag: "Reasoning",
    icon: OpenAiIcon,
    badgeColor: "text-emerald-400",
    accentColor: "#10a37f",
    reasoningTitle: "Reasoning effort",
    defaultLevel: "high",
    levels: [
      { id: "low", label: "Low", desc: "High velocity with essential logic", multiplier: 1.6 },
      { id: "medium", label: "Medium", desc: "Balanced mathematical and analytical flow", multiplier: 2.8 },
      { id: "high", label: "High", desc: "Intensive formal algorithm verification", multiplier: 4.2 },
    ],
  },
];

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognitionInstance;

export function RobotBeta({
  emotion,
  textLength = 0,
  isListening = false,
}: {
  emotion: RobotEmotion;
  textLength?: number;
  isListening?: boolean;
}) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (emotion !== "thinking") {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 140);
      }
    }, 2800 + Math.random() * 2200);
    return () => clearInterval(interval);
  }, [emotion]);

  const eyeOffset = Math.sin(textLength * 0.45) * 6;

  const getSideEarStyle = () => {
    if (isListening) {
      return "bg-red-500 shadow-[0_0_10px_#ef4444,0_0_18px_rgba(239,68,68,0.7)] animate-pulse";
    }
    if (emotion === "thinking") {
      return "bg-amber-400 shadow-[0_0_8px_#facc15]";
    }
    return "bg-emerald-400 shadow-[0_0_8px_#10b981]";
  };

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center select-none px-2.5 pt-2"
      animate={{
        y: emotion === "thinking" ? [0, -5, 0] : [0, -2, 0],
      }}
      transition={{
        y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <div className="relative w-20 flex justify-between px-2 -mb-2 z-0">
        <div className="w-3.5 h-4 bg-zinc-300 dark:bg-zinc-700 border-2 border-black/10 dark:border-white/10 rounded-tl-xl" />
        <div className="w-3.5 h-4 bg-zinc-300 dark:bg-zinc-700 border-2 border-black/10 dark:border-white/10 rounded-tr-xl" />
      </div>

      <div className="relative flex items-center justify-center">
        <div className={`absolute -left-1.5 w-1 h-5 rounded-l-xs transition-all duration-300 ${getSideEarStyle()}`} />
        <div className={`absolute -right-1.5 w-1 h-5 rounded-r-xs transition-all duration-300 ${getSideEarStyle()}`} />

        <div className="z-10 w-22 h-15 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-2 border-black/10 dark:border-white/20 flex items-center justify-center p-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
          <div className="relative w-full h-full bg-[#050505] rounded-lg flex items-center justify-center gap-3.5 overflow-hidden shadow-[inset_0_2px_5px_rgba(0,0,0,0.95)]">
            <div className="relative z-10 flex items-center justify-center gap-3.5">
              <EyeLED emotion={emotion} isBlinking={isBlinking} offsetX={eyeOffset} />
              <EyeLED emotion={emotion} isBlinking={isBlinking} offsetX={eyeOffset} />
            </div>

            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                backgroundImage: "linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.72) 50%)",
                backgroundSize: "100% 4px",
              }}
            />

            <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_8px_rgba(0,0,0,0.9)]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function EyeLED({
  emotion,
  isBlinking,
  offsetX,
}: {
  emotion: RobotEmotion;
  isBlinking: boolean;
  offsetX: number;
}) {
  const isThinking = emotion === "thinking";

  if (isBlinking && !isThinking) {
    return <div className="w-2.5 h-1 rounded-xs bg-emerald-400 shadow-[0_0_6px_#10b981]" />;
  }

  if (isThinking) {
    return (
      <motion.div
        className="w-2.5 h-3.5 rounded-xs bg-amber-300 shadow-[0_0_10px_#facc15,0_0_18px_rgba(250,204,21,0.4)]"
        animate={{ y: [-1, -3, -1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }

  return (
    <motion.div
      className="w-2.5 h-4.5 rounded-xs bg-emerald-400 shadow-[0_0_12px_#34d399,0_0_20px_rgba(52,211,153,0.45)]"
      animate={{ x: offsetX }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    />
  );
}

export function AiMascotInput({
  onSubmit,
  isProcessing: controlledProcessing,
  value: controlledValue,
  onChange: onControlledChange,
  disabled = false,
  placeholder = "How can I help you today? Type or speak...",
  title = "How can I help you today?",
  subtitle = "Type a prompt or query to get started",
  showWelcome = true,
  models = DEFAULT_AI_MODELS,
  defaultModelId = "gpt-5",
  enableVoice = true,
  enableWebSearch = true,
  enableAttachments = true,
  className = "",
  containerClassName = "",
}: AiMascotInputProps) {
  const [internalPrompt, setInternalPrompt] = useState("");
  const [internalSending, setInternalSending] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);

  const isControlledValue = controlledValue !== undefined;
  const promptText = isControlledValue ? controlledValue : internalPrompt;

  const handlePromptChange = (val: string) => {
    if (onControlledChange) onControlledChange(val);
    if (!isControlledValue) setInternalPrompt(val);
  };

  const initialModel = models.find((m) => m.id === defaultModelId) || models[0] || DEFAULT_AI_MODELS[0];
  const [selectedModel, setSelectedModel] = useState<AIModel>(initialModel);
  const [modelEfforts, setModelEfforts] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    models.forEach((m) => {
      initialMap[m.id] = m.defaultLevel;
    });
    return initialMap;
  });

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);
  const hasReceivedSpeechRef = useRef(false);
  const basePromptRef = useRef("");

  const isSending = controlledProcessing !== undefined ? controlledProcessing : internalSending;

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
      recognitionRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
      }
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    if (isModelMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isModelMenuOpen]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollH = textareaRef.current.scrollHeight;
      const newHeight = Math.max(54, Math.min(scrollH, 260));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [promptText]);

  const startListening = () => {
    if (disabled) return;
    hasReceivedSpeechRef.current = false;

    const windowWithSpeech =
      typeof window !== "undefined"
        ? (window as unknown as {
            SpeechRecognition?: SpeechRecognitionConstructor;
            webkitSpeechRecognition?: SpeechRecognitionConstructor;
          })
        : {};

    const SpeechRecognitionClass =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    // Voice input needs browser speech recognition. Without it, do nothing
    // (no made-up text is ever inserted into the prompt).
    if (!SpeechRecognitionClass) return;

    setIsListening(true);
    isListeningRef.current = true;
    basePromptRef.current = promptText ? promptText.trim() + " " : "";

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang =
        typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        hasReceivedSpeechRef.current = true;
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            transcript += item[0].transcript;
          }
        }
        if (transcript) {
          handlePromptChange(basePromptRef.current + transcript);
        }
      };

      recognition.onerror = (event: { error: string }) => {
        if (event.error === "no-speech") return;
        // Permission denied, no microphone, network error, etc.
        stopListening();
      };

      recognition.onend = () => {
        if (isListeningRef.current && hasReceivedSpeechRef.current) {
          try {
            recognition.start();
          } catch {
            stopListening();
          }
        } else {
          stopListening();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      stopListening();
    }
  };

  const toggleListening = () => {
    if (disabled) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile({
        name: file.name,
        isImage: file.type.startsWith("image/"),
        file,
      });
    }
    e.target.value = "";
  };

  const isTyping = promptText.length > 0 || attachedFile !== null || isListening;
  const currentEmotion: RobotEmotion = isSending ? "thinking" : "reading";

  const currentEffortId = modelEfforts[selectedModel.id] || selectedModel.defaultLevel;
  const currentEffortObj =
    selectedModel.levels.find((l) => l.id === currentEffortId) || selectedModel.levels[0];

  const handleSelectEffort = (levelId: string) => {
    setModelEfforts((prev) => ({
      ...prev,
      [selectedModel.id]: levelId,
    }));
  };

  const handleSend = async () => {
    if (disabled || (!promptText.trim() && !attachedFile) || isSending) return;
    stopListening();

    const submitData: ChatSubmitData = {
      prompt: promptText.trim(),
      model: selectedModel,
      effort: currentEffortId,
      useWebSearch,
      attachedFile,
    };

    if (onSubmit) {
      setInternalSending(true);
      try {
        await onSubmit(submitData);
      } finally {
        setInternalSending(false);
        if (!isControlledValue) setInternalPrompt("");
        setAttachedFile(null);
      }
    } else {
      // Demo mode: no handler supplied, so simulate a response time.
      setInternalSending(true);
      const multiplier = currentEffortObj?.multiplier || 2.8;
      const baseDuration = Math.round(multiplier * 1000);
      const finalDuration = useWebSearch ? baseDuration + 900 : baseDuration;

      sendTimeoutRef.current = setTimeout(() => {
        setInternalSending(false);
        if (!isControlledValue) setInternalPrompt("");
        setAttachedFile(null);
        sendTimeoutRef.current = null;
      }, finalDuration);
    }
  };

  const handleCancel = () => {
    stopListening();
    if (sendTimeoutRef.current) {
      clearTimeout(sendTimeoutRef.current);
      sendTimeoutRef.current = null;
    }
    setInternalSending(false);
  };

  return (
    <div className={`relative w-full flex flex-col items-center ${containerClassName}`}>
      <AnimatePresence>
        {showWelcome && !isTyping && (
          <motion.div
            key="welcome-header"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0, transition: { duration: 0.22 } }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3.5 sm:mb-4 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3.5 sm:gap-4.5 text-center sm:text-left select-none w-full"
          >
            <motion.div layoutId="robot-mascot-container" className="shrink-0">
              <RobotBeta emotion="reading" textLength={0} isListening={isListening} />
            </motion.div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="relative w-full"
        animate={{ paddingTop: isTyping ? 72 : 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
      >
        {isTyping && (
          <motion.div
            layoutId="robot-mascot-container"
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="absolute top-1 right-4 sm:right-6 z-20 pointer-events-none"
          >
            <RobotBeta
              emotion={currentEmotion}
              textLength={promptText.length}
              isListening={isListening}
            />
          </motion.div>
        )}

        <div
          className={`relative z-10 w-full p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)] transition-all duration-300 focus-within:border-zinc-400 dark:focus-within:border-white/25 focus-within:shadow-[0_25px_60px_rgba(0,0,0,0.08)] ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          } ${className}`}
        >
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 p-1.5 px-3 rounded-xl bg-zinc-100 dark:bg-white/10 w-fit text-xs font-medium text-zinc-800 dark:text-zinc-200">
              {attachedFile.isImage ? (
                <PiImageBold className="text-cyan-500" size={15} />
              ) : (
                <PiFileBold className="text-blue-500" size={15} />
              )}
              <span className="truncate max-w-40">{attachedFile.name}</span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                disabled={disabled}
                aria-label="Remove attachment"
                className="p-0.5 hover:text-red-500 rounded-full transition-colors cursor-pointer ml-1"
              >
                <PiXBold size={12} />
              </button>
            </div>
          )}

          <div className="relative w-full">
            <textarea
              ref={textareaRef}
              value={promptText}
              onChange={(e) => handlePromptChange(e.target.value)}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                isListening
                  ? "Listening to your voice... Speak your mind"
                  : isSending
                    ? useWebSearch
                      ? "Searching the web and processing..."
                      : "Thinking response..."
                    : placeholder
              }
              className="w-full bg-transparent resize-none outline-hidden focus:outline-none font-medium text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 leading-relaxed max-h-64 overflow-y-auto transition-[height] duration-150"
              style={{ minHeight: "54px" }}
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between pt-3 border-t border-zinc-200/70 dark:border-white/5 gap-2 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 relative min-w-0 flex-wrap sm:flex-nowrap">
              <div ref={modelMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModelMenuOpen((prev) => !prev)}
                  disabled={disabled}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200/70 dark:hover:bg-white/10 text-xs font-semibold text-zinc-900 dark:text-zinc-100 transition-all cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <selectedModel.icon size={14} className={`${selectedModel.badgeColor} shrink-0`} />
                  <span className="truncate max-w-22.5 sm:max-w-32.5 whitespace-nowrap">
                    {selectedModel.name}
                  </span>

                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono uppercase font-bold tracking-wider bg-zinc-200/70 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 shrink-0 whitespace-nowrap">
                    {currentEffortObj.label}
                  </span>

                  <PiCaretDownBold
                    size={11}
                    className={`text-zinc-500 dark:text-zinc-400 transition-transform shrink-0 ${
                      isModelMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isModelMenuOpen && !disabled && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full mb-2 left-0 z-30 w-68 sm:w-76 p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                    >
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold flex items-center justify-between">
                        <span>AI Models</span>
                        <span className="text-[9px] font-mono opacity-80">2026</span>
                      </div>
                      <div className="space-y-0.5">
                        {models.map((model) => {
                          const isSelected = selectedModel.id === model.id;
                          const Icon = model.icon;
                          const modelEffort = modelEfforts[model.id] || model.defaultLevel;
                          return (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => {
                                setSelectedModel(model);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-zinc-100 dark:bg-white/10 text-zinc-950 dark:text-white font-semibold"
                                  : "hover:bg-zinc-100/70 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Icon size={16} className={model.badgeColor} />
                                <div className="text-left">
                                  <div className="leading-tight flex items-center gap-1.5">
                                    <span className="font-semibold">{model.name}</span>
                                    {model.tag && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-200/70 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 font-mono">
                                        {model.tag}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                                    {model.provider} · {modelEffort.toUpperCase()}
                                  </div>
                                </div>
                              </div>
                              {isSelected && <PiCheckBold size={13} className="text-emerald-500" />}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2.5 pt-2.5 border-t border-zinc-200 dark:border-white/10">
                        <div className="px-2 pb-1.5 flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">
                            {selectedModel.reasoningTitle}
                          </span>
                          <span className="text-[10px] font-mono uppercase font-bold text-zinc-800 dark:text-zinc-200">
                            {currentEffortObj.label}
                          </span>
                        </div>

                        <div
                          className="grid gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-white/5"
                          style={{
                            gridTemplateColumns: `repeat(${selectedModel.levels.length}, minmax(0, 1fr))`,
                          }}
                        >
                          {selectedModel.levels.map((lvl) => {
                            const isActive = currentEffortId === lvl.id;
                            return (
                              <button
                                key={lvl.id}
                                type="button"
                                onClick={() => handleSelectEffort(lvl.id)}
                                className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                                  isActive
                                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-200 dark:border-white/10"
                                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/5"
                                }`}
                              >
                                <span>{lvl.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="px-2 pt-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 leading-tight">
                          {currentEffortObj.desc}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {enableAttachments && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={disabled}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    title="Attach photos or files"
                    className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PiPaperclipBold size={16} />
                  </button>
                </>
              )}

              {enableWebSearch && (
                <button
                  type="button"
                  onClick={() => setUseWebSearch((prev) => !prev)}
                  disabled={disabled}
                  title={useWebSearch ? "Web search enabled" : "Enable live web search"}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                    useWebSearch
                      ? "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30 dark:border-emerald-500/40"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 font-medium"
                  }`}
                >
                  <PiGlobeBold
                    size={15}
                    className={`shrink-0 ${useWebSearch ? "text-emerald-700 dark:text-emerald-400" : ""}`}
                  />
                  <span className="whitespace-nowrap">{useWebSearch ? "Search active" : "Search"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <AnimatePresence>
                {isListening && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, x: 6 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.85, x: 6 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/25 shadow-[0_0_12px_rgba(239,68,68,0.25)] shrink-0 h-8"
                    title="Voice dictation active"
                  >
                    {[
                      { min: 4, max: 13, duration: 0.45 },
                      { min: 6, max: 18, duration: 0.55 },
                      { min: 8, max: 22, duration: 0.38 },
                      { min: 5, max: 16, duration: 0.5 },
                      { min: 4, max: 11, duration: 0.42 },
                    ].map((bar, i) => (
                      <motion.span
                        key={i}
                        className="w-1 bg-red-500 rounded-full"
                        animate={{
                          height: [`${bar.min}px`, `${bar.max}px`, `${bar.min}px`],
                          opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                          duration: bar.duration,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.08,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {enableVoice && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={disabled}
                  title={isListening ? "Stop voice input" : "Dictate with voice"}
                  className={`p-2 rounded-xl transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                  }`}
                >
                  {isListening ? <PiMicrophoneFill size={16} /> : <PiMicrophoneBold size={16} />}
                </button>
              )}

              <button
                type="button"
                onClick={isSending ? handleCancel : handleSend}
                disabled={disabled || (!isSending && !promptText.trim() && !attachedFile)}
                title={isSending ? "Click to cancel (Thinking...)" : "Send message"}
                aria-label={isSending ? "Cancel message" : "Send message"}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 ${
                  isSending
                    ? "bg-amber-400/20 dark:bg-amber-500/25 border border-amber-500/40 text-amber-500 hover:bg-amber-400/30 hover:scale-105 active:scale-95 shadow-[0_0_14px_rgba(245,158,11,0.3)]"
                    : promptText.trim() || attachedFile
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:scale-105 active:scale-95 shadow-sm"
                      : "bg-zinc-200/60 dark:bg-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                }`}
              >
                {isSending ? (
                  <PiBrainFill className="animate-spin text-amber-500" size={17} />
                ) : (
                  <PiArrowUpBold size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AiMascotInput;