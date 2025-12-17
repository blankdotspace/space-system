import { StoreGet, StoreSet } from "../../createStore";
import { AppStore } from "..";

// Re-using the Message interface from AgentChat
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "config" | "checkpoint";
  spaceConfig?: any; // SpaceConfig type from AgentChat
  configApplied?: boolean;
  aiType?: "planner" | "builder";
  builderResponse?: any; // BuilderResponse type from AgentChat
  checkpointId?: string;
  screenshot?: string; // Base64 encoded screenshot for checkpoints
}

interface ChatStoreState {
  messages: ChatMessage[];
  maxMessages: number;
  isLoading: boolean;
  loadingType: "thinking" | "building" | null;
  loadingMessage: string | null;
}

interface ChatStoreActions {
  addMessage: (message: ChatMessage) => void;
  addMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  initializeWithWelcome: () => void;
  setLoading: (isLoading: boolean, loadingType?: "thinking" | "building" | null, loadingMessage?: string | null) => void;
}

export type ChatStore = ChatStoreState & ChatStoreActions;

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: `Hello! I'm here to help you customize your space. I can assist you with:

• Adding and configuring fidgets
• Adjusting themes and colors  
• Modifying layouts and styling
• Suggesting improvements

What would you like to customize today?`,
  timestamp: new Date(),
  type: "text",
};

export const chatStoreDefaults: ChatStoreState = {
  messages: [WELCOME_MESSAGE],
  maxMessages: 100, // Keep last 100 messages to avoid memory bloat
  isLoading: false,
  loadingType: null,
  loadingMessage: null,
};

export const createChatStoreFunc = (
  set: StoreSet<AppStore>,
  get: StoreGet<AppStore>,
): ChatStore => ({
  ...chatStoreDefaults,

  addMessage: (message) => {
    set((draft) => {
      draft.chat.messages.push(message);
      
      // Trim to max messages (keep most recent, but always keep welcome message)
      const maxMessages = draft.chat.maxMessages;
      if (draft.chat.messages.length > maxMessages) {
        const welcomeMessage = draft.chat.messages.find(msg => msg.id === "welcome");
        const recentMessages = draft.chat.messages.slice(-maxMessages + 1);
        
        if (welcomeMessage && !recentMessages.find(msg => msg.id === "welcome")) {
          draft.chat.messages = [welcomeMessage, ...recentMessages];
        } else {
          draft.chat.messages = recentMessages;
        }
      }
    }, "addMessage");
  },

  addMessages: (messages) => {
    set((draft) => {
      draft.chat.messages.push(...messages);
      
      // Apply same trimming logic as addMessage
      const maxMessages = draft.chat.maxMessages;
      if (draft.chat.messages.length > maxMessages) {
        const welcomeMessage = draft.chat.messages.find(msg => msg.id === "welcome");
        const recentMessages = draft.chat.messages.slice(-maxMessages + 1);
        
        if (welcomeMessage && !recentMessages.find(msg => msg.id === "welcome")) {
          draft.chat.messages = [welcomeMessage, ...recentMessages];
        } else {
          draft.chat.messages = recentMessages;
        }
      }
    }, "addMessages");
  },

  clearMessages: () => {
    set((draft) => {
      draft.chat.messages = [WELCOME_MESSAGE];
    }, "clearMessages");
  },

  updateMessage: (messageId, updates) => {
    set((draft) => {
      const messageIndex = draft.chat.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        draft.chat.messages[messageIndex] = {
          ...draft.chat.messages[messageIndex],
          ...updates,
        };
      }
    }, "updateMessage");
  },

  initializeWithWelcome: () => {
    const currentMessages = get().chat.messages;
    if (currentMessages.length === 0 || !currentMessages.find(msg => msg.id === "welcome")) {
      set((draft) => {
        if (draft.chat.messages.length === 0) {
          draft.chat.messages = [WELCOME_MESSAGE];
        } else if (!draft.chat.messages.find(msg => msg.id === "welcome")) {
          draft.chat.messages.unshift(WELCOME_MESSAGE);
        }
      }, "initializeWithWelcome");
    }
  },

  setLoading: (isLoading, loadingType = null, loadingMessage = null) => {
    set((draft) => {
      draft.chat.isLoading = isLoading;
      draft.chat.loadingType = loadingType;
      draft.chat.loadingMessage = loadingMessage;
    }, "setLoading");
  },
});

export function partializedChatStore(state: AppStore) {
  return {
    messages: state.chat.messages,
    isLoading: state.chat.isLoading,
    loadingType: state.chat.loadingType,
    loadingMessage: state.chat.loadingMessage,
  };
} 