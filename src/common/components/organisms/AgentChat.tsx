import { SpaceConfig, SpaceConfigSaveDetails } from "@/app/(spaces)/Space";
import { Button } from "@/common/components/atoms/button";
import { ScrollArea } from "@/common/components/atoms/scroll-area";
import { Textarea } from "@/common/components/atoms/textarea";
import { useAppStore } from "@/common/data/stores/app";
import { ChatMessage } from "@/common/data/stores/app/chat/chatStore";
import { SpaceCheckpoint } from "@/common/data/stores/app/checkpoints/checkpointStore";
import { useCurrentFid } from "@/common/lib/hooks/useCurrentFid";
import {
  ConnectionStatus,
  WebSocketService,
  type IncomingMessage,
} from "@/common/lib/services/websocket";
import { FONT_FAMILY_OPTIONS_BY_NAME } from "@/common/lib/theme/fonts";
import {
  DEFAULT_GRID_SIZE,
  GridSizeMetadata,
  ensureGridSize,
} from "@/common/lib/utils/gridSize";
import { getLayoutConfig } from "@/common/utils/layoutFormatUtils";
import html2canvas from "html2canvas";
import {
  AlertCircle,
  Loader2,
  LucideSparkle,
  RotateCcw,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";
import Image from "next/image";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

// Configuration constants
const AI_CHAT_CONFIG = {
  DEFAULT_WS_URL: process.env.NEXT_PUBLIC_AI_WS_URL || "wss://space-builder-server.onrender.com",
  WELCOME_MESSAGE: `Hello! I'm here to help you customize your space. I can assist you with:

• Adding and configuring fidgets
• Adjusting themes and colors  
• Modifying layouts and styling
• Suggesting improvements

What would you like to customize today?`,
  SESSION_ID_PREFIX: "ai_session",
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_BACKOFF: 1000,
} as const;

// Message type constants
const MESSAGE_TYPES = {
  PONG: "pong",
  REPLY: "REPLY",
  PLANNER_LOGS: "PLANNER_LOGS",
  BUILDER_LOGS: "BUILDER_LOGS",
  COMM_LOGS: "COMM_LOGS",
} as const;

type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

// Connection Status Indicator Component
const ConnectionStatusIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  const statusConfig = {
    connected: {
      icon: Wifi,
      color: "text-green-500",
      textColor: "text-green-600",
      text: "Connected",
      animated: false
    },
    connecting: {
      icon: Loader2,
      color: "text-yellow-500",
      textColor: "text-yellow-600",
      text: "Connecting...",
      animated: true
    },
    disconnected: {
      icon: WifiOff,
      color: "text-gray-400",
      textColor: "text-gray-500",
      text: "Offline",
      animated: false
    },
    error: {
      icon: AlertCircle,
      color: "text-red-500",
      textColor: "text-red-600",
      text: "Error",
      animated: false
    }
  };

  const config = statusConfig[status];
  const IconComponent = config.icon;

  return (
    <div className="flex items-center gap-1">
      <IconComponent
        className={`w-3 h-3 ${config.color} ${config.animated ? 'animate-spin' : ''}`}
      />
      <span className={`text-xs ${config.textColor}`}>
        {config.text}
      </span>
    </div>
  );
};

// Improved type definitions
interface BuilderResponse {
  type: string;
  name: string;
  message: string;
}

interface SpaceContextConfig {
  fidgetInstanceDatums?: Record<string, any>;
  layoutConfig?: { layout?: Array<Record<string, any>> } | Record<string, any>;
  layoutDetails?: {
    layoutConfig?: { layout?: Array<Record<string, any>> };
    [key: string]: any;
  };
  theme?: { id?: string; properties?: Record<string, any> };
  layoutID?: string;
  gridSize?: GridSizeMetadata;
  [key: string]: any;
}

type LayoutLikeItem = {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

const extractLayoutFromContext = (
  context?: SpaceContextConfig | null,
): LayoutLikeItem[] | undefined => {
  if (!context) {
    return undefined;
  }

  const directLayout =
    context.layoutConfig && Array.isArray(context.layoutConfig.layout)
      ? context.layoutConfig.layout
      : undefined;

  if (directLayout) {
    return directLayout;
  }

  const detailedLayout = context.layoutDetails?.layoutConfig;
  if (detailedLayout && Array.isArray(detailedLayout.layout)) {
    return detailedLayout.layout;
  }

  const legacyLayout = (context as Record<string, any>)?.layout;
  if (legacyLayout && Array.isArray(legacyLayout.layout)) {
    return legacyLayout.layout;
  }

  return undefined;
};

const ensureContextHasGridSize = (
  context: SpaceContextConfig | null,
): SpaceContextConfig | null => {
  if (!context) {
    return null;
  }

  const layout = extractLayoutFromContext(context);
  const gridSize = ensureGridSize({
    existing: context.gridSize,
    layout,
    fallback: DEFAULT_GRID_SIZE,
  });

  return {
    ...context,
    gridSize,
  };
};

// Use ChatMessage from store instead of local interface
type Message = ChatMessage;

interface AiChatSidebarProps {
  onClose: () => void;
  onApplySpaceConfig?: (config: SpaceConfigSaveDetails) => Promise<void>;
  wsUrl?: string;
  getCurrentSpaceContext?: () => SpaceContextConfig | null;
}

// Helper function to manually apply theme to CSS variables
const applyThemeToCSS = (theme: any) => {
  if (!theme?.properties) return;

  const { properties } = theme;

  // Apply theme properties directly to CSS variables
  if (properties.background) {
    document.documentElement.style.setProperty("--user-theme-background", properties.background);
  }
  if (properties.fontColor) {
    document.documentElement.style.setProperty("--user-theme-font-color", properties.fontColor);
  }
  if (properties.headingsFontColor) {
    document.documentElement.style.setProperty("--user-theme-headings-font-color", properties.headingsFontColor);
  }
  if (properties.fidgetBackground) {
    document.documentElement.style.setProperty("--user-theme-fidget-background", properties.fidgetBackground);
  }
  if (properties.fidgetBorderWidth) {
    document.documentElement.style.setProperty("--user-theme-fidget-border-width", properties.fidgetBorderWidth);
  }
  if (properties.fidgetBorderColor) {
    document.documentElement.style.setProperty("--user-theme-fidget-border-color", properties.fidgetBorderColor);
  }
  if (properties.fidgetShadow) {
    document.documentElement.style.setProperty("--user-theme-fidget-shadow", properties.fidgetShadow);
  }
  if (properties.fidgetBorderRadius) {
    document.documentElement.style.setProperty("--user-theme-fidget-border-radius", properties.fidgetBorderRadius);
  }
  if (properties.gridSpacing) {
    document.documentElement.style.setProperty("--user-theme-grid-spacing", properties.gridSpacing);
  }

  // Apply fonts with proper lookup
  if (properties.font) {
    // Need to import the font lookup at the top of the file
    const fontConfig = FONT_FAMILY_OPTIONS_BY_NAME[properties.font];
    if (fontConfig) {
      document.documentElement.style.setProperty("--user-theme-font", fontConfig.config.style.fontFamily);
    }
  }
  if (properties.headingsFont) {
    const fontConfig = FONT_FAMILY_OPTIONS_BY_NAME[properties.headingsFont];
    if (fontConfig) {
      document.documentElement.style.setProperty("--user-theme-headings-font", fontConfig.config.style.fontFamily);
    }
  }
};

export const AiChatSidebar: React.FC<AiChatSidebarProps> = ({
  onClose,
  onApplySpaceConfig,
  wsUrl = AI_CHAT_CONFIG.DEFAULT_WS_URL,
  getCurrentSpaceContext,
}) => {
  const currentFid = useCurrentFid();

  // Removed user profile picture loading since avatars are no longer displayed



  // Get current space configuration from app store
  const {
    getCurrentSpaceConfig,
    getCurrentSpaceId,
    getCurrentTabName,
    // Homebase-specific stores
    homebaseConfig,
    homebaseTabs,
  } = useAppStore((state) => ({
    getCurrentSpaceConfig: state.currentSpace.getCurrentSpaceConfig,
    getCurrentSpaceId: state.currentSpace.getCurrentSpaceId,
    getCurrentTabName: state.currentSpace.getCurrentTabName,
    homebaseConfig: state.homebase.homebaseConfig,
    homebaseTabs: state.homebase.tabs,
  }));

  // Use checkpoint and chat stores from app store
  const {
    checkpoints,
    isRestoring,
    createCheckpointFromContext,
    restoreCheckpoint,
    messages,
    addMessage,
    updateMessage,
    initializeWithWelcome,
  } = useAppStore((state) => ({
    checkpoints: state.checkpoints.checkpoints,
    isRestoring: state.checkpoints.isRestoring,
    createCheckpointFromContext: state.checkpoints.createCheckpointFromContext,
    restoreCheckpoint: state.checkpoints.restoreCheckpoint,
    messages: state.chat.messages,
    addMessage: state.chat.addMessage,
    updateMessage: state.chat.updateMessage,
    initializeWithWelcome: state.chat.initializeWithWelcome,
  }));

  // Function to get fresh space context when needed
  const getFreshSpaceContext = useCallback(() => {
    // If external context provider is available, use it (for theme editor)
    if (getCurrentSpaceContext) {
      return ensureContextHasGridSize(getCurrentSpaceContext());
    }

    // Otherwise, get current context from app store
    const currentSpaceId = getCurrentSpaceId();
    const currentTabName = getCurrentTabName();

    let currentTabConfig: SpaceContextConfig | null = null;

    if (currentSpaceId === "homebase") {
      // For homebase, get tab-specific config or main feed config
      if (
        currentTabName &&
        currentTabName !== "Feed" &&
        homebaseTabs[currentTabName]?.config != null
      ) {
        currentTabConfig = homebaseTabs[currentTabName]?.config ?? null;
      } else {
        // Main homebase feed config
        currentTabConfig = homebaseConfig ?? null;
      }
    } else {
      // Regular space configuration
      const currentSpaceConfig = getCurrentSpaceConfig();
      currentTabConfig =
        currentSpaceConfig?.tabs[currentTabName || "Profile"] || null;
    }

    return ensureContextHasGridSize(currentTabConfig);
  }, [
    getCurrentSpaceContext,
    getCurrentSpaceId,
    getCurrentTabName,
    homebaseConfig,
    homebaseTabs,
    getCurrentSpaceConfig
  ]);

  // Messages are now managed by the chat store
  // Initialize with welcome message if needed
  useEffect(() => {
    initializeWithWelcome();
  }, [initializeWithWelcome]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<
    "thinking" | "building" | null
  >(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [hasCreatedFirstUserCheckpoint, setHasCreatedFirstUserCheckpoint] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsServiceRef = useRef<WebSocketService | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Capture screenshot of just the grid area
  const captureSpaceScreenshot = async (): Promise<string | null> => {
    try {
      // Target specifically the grid/fidget area, excluding sidebars
      const gridElement =
        document.querySelector('[data-testid="fidget-grid"]') ||
        document.querySelector('.fidget-grid') ||
        document.querySelector('[class*="grid"]') ||
        document.querySelector('[data-grid-area]') ||
        // Look for React Grid Layout containers
        document.querySelector('.react-grid-layout') ||
        // Look for common grid container patterns
        document.querySelector('[class*="layout"]') ||
        // Try to find the main content area excluding navigation
        document.querySelector('main > div:first-child') ||
        document.querySelector('[role="main"] > div:first-child');

      if (!gridElement) {
        console.warn("Could not find grid element to screenshot");
        return null;
      }

      // Wait a moment for any ongoing rendering to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(gridElement as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 0.5, // Reduce size for better performance
        useCORS: true,
        allowTaint: true,
        width: Math.min(gridElement.scrollWidth, 1200),
        height: Math.min(gridElement.scrollHeight, 800),
        ignoreElements: (element) => {
          // Ignore any sidebars, navigation, and the chat itself
          return (
            element.closest('[aria-label="AI Chat Sidebar"]') !== null ||
            element.closest('[aria-label="Sidebar"]') !== null ||
            element.closest('nav') !== null ||
            element.closest('.sidebar') !== null ||
            element.closest('[class*="sidebar"]') !== null ||
            element.closest('[class*="navigation"]') !== null
          );
        }
      });

      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      return null;
    }
  };

  // Create a comprehensive checkpoint from current configuration
  const createSpaceCheckpoint = useCallback((
    description?: string,
    source: SpaceCheckpoint['source'] = 'ai-chat'
  ): SpaceCheckpoint => {
    return createCheckpointFromContext(
      getFreshSpaceContext,
      description,
      source
    );
  }, [createCheckpointFromContext, getFreshSpaceContext]);

  // Restore to a specific checkpoint using the store
  const handleRestoreCheckpoint = async (checkpointId: string) => {
    if (!onApplySpaceConfig) return;

    const success = await restoreCheckpoint(checkpointId, onApplySpaceConfig);

    if (success) {
      const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
      toast.success(`Restored to "${checkpoint?.name || 'checkpoint'}"`);

      // Log detailed restoration information
      try {
        const currentTabConfig = getFreshSpaceContext();
        console.log("🔄 Successfully restored checkpoint:", {
          restored: {
            checkpointId,
            checkpointName: checkpoint?.name,
            checkpointConfig: checkpoint?.spaceConfig,
          },
          currentState: {
            spaceConfig: currentTabConfig,
          }
        });
      } catch (error) {
        console.error("❌ Failed to log restoration details:", error);
      }
    } else {
      toast.error("Failed to restore checkpoint. Please try again.");
    }
  };

  // Automatically apply config and create checkpoint
  const autoApplyConfig = async (spaceConfig: SpaceConfig, messageId: string) => {
    if (!onApplySpaceConfig) return;

    try {
      // Extract layoutConfig using the utility function for both new and old formats
      const layoutConfigData = getLayoutConfig(spaceConfig.layoutDetails);

      // Convert SpaceConfig to the format expected by saveLocalConfig
      const saveDetails = {
        theme: spaceConfig.theme,
        layoutConfig: layoutConfigData,
        fidgetInstanceDatums: spaceConfig.fidgetInstanceDatums,
        fidgetTrayContents: spaceConfig.fidgetTrayContents,
      };

      // Apply the AI configuration first
      await onApplySpaceConfig(saveDetails);

      // Manually apply theme to CSS variables for immediate visual feedback
      if (spaceConfig.theme) {
        applyThemeToCSS(spaceConfig.theme);
        console.log("🎨 Theme manually applied to CSS variables:", spaceConfig.theme.properties);
      }

      // Create checkpoint directly from the AI's spaceConfig (what was just applied)
      // Transform AI config format to checkpoint format
      const checkpointConfig = {
        fidgetInstanceDatums: spaceConfig.fidgetInstanceDatums,
        layoutConfig: getLayoutConfig(spaceConfig.layoutDetails),
        theme: spaceConfig.theme,
      };

      const checkpoint = createCheckpointFromContext(
        () => checkpointConfig,
        'After AI Edits',
        'ai-chat'
      );

      console.log("💾 Auto-created checkpoint after applying config:", {
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name,
        savedConfig: checkpoint.spaceConfig,
      });

      // Capture screenshot of the space after applying changes
      const screenshot = await captureSpaceScreenshot();

      // Update the AI message to include checkpoint data instead of creating separate message
      updateMessage(messageId, {
        checkpointId: checkpoint.id,
        screenshot: screenshot || undefined,
      });

      console.log("✅ Space configuration auto-applied successfully");
      toast.success("Configuration applied and checkpoint created!");
    } catch (error) {
      console.error("❌ Failed to auto-apply space config:", error);
      toast.error("Failed to apply configuration. Please try again.");
    }
  };

  // Initialize WebSocket service
  const initializeWebSocketService = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.destroy();
    }

    console.log("🔧 Initializing WebSocket service");

    const config = {
      url: wsUrl,
      maxReconnectAttempts: AI_CHAT_CONFIG.RECONNECT_ATTEMPTS,
      reconnectBackoffMs: AI_CHAT_CONFIG.RECONNECT_BACKOFF,
      spaceContext: null, // We'll provide fresh context when sending messages
      userFid: currentFid,
    };

    const callbacks = {
      onStatusChange: (status: ConnectionStatus) => {
        setConnectionStatus(status);
      },
      onMessage: (message: any) => {
        handleWebSocketMessage(message);
      },
      onError: (error: string) => {
        toast.error(error);
      },
    };

    wsServiceRef.current = new WebSocketService(config, callbacks);
    wsServiceRef.current.connect();
  }, [wsUrl, currentFid]);

  // Helper function to attempt parsing space config from message
  const tryParseSpaceConfig = useCallback((messageContent: string): SpaceConfig | undefined => {
    try {
      if (messageContent.includes("fidgetInstanceDatums")) {
        const spaceConfig = JSON.parse(messageContent);
        console.log("✅ AI generated space config:", spaceConfig);
        return spaceConfig;
      }
    } catch (error) {
      console.error("❌ Failed to parse message as JSON:", error);
    }
    return undefined;
  }, []);

  // Helper function to create message ID with timestamp
  const createMessageId = useCallback((prefix: string): string => {
    return `${prefix}-${Date.now()}`;
  }, []);

  // Helper function to add message and update loading state
  const addMessageAndUpdateState = useCallback((
    message: Message,
    shouldStopLoading: boolean = false,
    newLoadingType?: "thinking" | "building" | null
  ) => {
    addMessage(message);
    if (shouldStopLoading) {
      setIsLoading(false);
      setLoadingType(null);
    } else if (newLoadingType !== undefined) {
      setLoadingType(newLoadingType);
      setIsLoading(true);
    }
  }, [addMessage]);

  // Handle pong messages
  const handlePongMessage = useCallback(() => {
    const pongMessage: Message = {
      id: createMessageId("pong"),
      role: "assistant",
      content: "🏓 Pong! WebSocket connection is working perfectly!",
      timestamp: new Date(),
      type: "text",
    };
    addMessageAndUpdateState(pongMessage);
    toast.success("Pong received! WebSocket is working!");
  }, [createMessageId, addMessageAndUpdateState]);

  // Handle reply messages (with potential config)
  const handleReplyMessage = useCallback((wsMessage: IncomingMessage) => {
    const messageContent = wsMessage.message || "AI response received";
    const spaceConfig = tryParseSpaceConfig(messageContent);

    console.log("📥 Raw REPLY message:", {
      type: wsMessage.type,
      name: wsMessage.name,
      messageLength: messageContent.length,
      messagePreview: messageContent.substring(0, 200) + "...",
      containsFidgetData: messageContent.includes("fidgetInstanceDatums"),
      rawMessage: messageContent, // Full raw message content
    });

    if (spaceConfig) {
      const aiMessage: Message = {
        id: createMessageId("ai"),
        role: "assistant",
        content: "🎨 I've applied the new space configuration for you!",
        timestamp: new Date(),
        type: "config",
        spaceConfig,
        aiType: "builder",
        builderResponse: wsMessage as BuilderResponse,
        configApplied: true,
      };
      addMessageAndUpdateState(aiMessage, true);
      autoApplyConfig(spaceConfig, aiMessage.id);
    } else {
      const aiMessage: Message = {
        id: createMessageId("ai"),
        role: "assistant",
        content: messageContent,
        timestamp: new Date(),
        type: "text",
        aiType: "builder",
      };
      addMessageAndUpdateState(aiMessage, true);
    }
  }, [tryParseSpaceConfig, createMessageId, addMessageAndUpdateState, autoApplyConfig]);

  // Handle builder logs (with potential config)
  const handleBuilderLogsMessage = useCallback((wsMessage: IncomingMessage) => {
    const messageContent = wsMessage.message || "Builder is working...";
    const spaceConfig = tryParseSpaceConfig(messageContent);

    const logMessage: Message = {
      id: createMessageId("builder-log"),
      role: "assistant",
      content: spaceConfig
        ? "🎨 I've created a new space configuration and applied it automatically!"
        : messageContent,
      timestamp: new Date(),
      type: spaceConfig ? "config" : "text",
      spaceConfig,
      aiType: "builder",
      builderResponse: spaceConfig ? (wsMessage as BuilderResponse) : undefined,
      configApplied: spaceConfig ? true : undefined,
    };

    if (spaceConfig) {
      addMessageAndUpdateState(logMessage, true);
      toast.success("🎨 New space configuration created!");
      autoApplyConfig(spaceConfig, logMessage.id);
    } else {
      addMessageAndUpdateState(logMessage, false, "building");
    }
  }, [tryParseSpaceConfig, createMessageId, addMessageAndUpdateState, autoApplyConfig]);

  // Handle other log messages
  const handleLogMessage = useCallback((
    wsMessage: IncomingMessage,
    messageType: "planner" | "comm",
    defaultContent: string,
    loadingType?: "thinking" | null
  ) => {
    const logMessage: Message = {
      id: createMessageId(`${messageType}-log`),
      role: "assistant",
      content: wsMessage.message || defaultContent,
      timestamp: new Date(),
      type: "text",
      aiType: messageType === "planner" ? "planner" : "planner",
    };
    addMessageAndUpdateState(logMessage, false, loadingType);
  }, [createMessageId, addMessageAndUpdateState]);

  const handleWebSocketMessage = useCallback((wsMessage: IncomingMessage) => {
    switch (wsMessage.type as MessageType) {
      case MESSAGE_TYPES.PONG:
        handlePongMessage();
        break;

      case MESSAGE_TYPES.REPLY:
        handleReplyMessage(wsMessage);
        break;

      case MESSAGE_TYPES.PLANNER_LOGS:
        handleLogMessage(wsMessage, "planner", "Planner is processing...", "thinking");
        break;

      case MESSAGE_TYPES.BUILDER_LOGS:
        handleBuilderLogsMessage(wsMessage);
        break;

      case MESSAGE_TYPES.COMM_LOGS:
        handleLogMessage(wsMessage, "comm", "Communication update...");
        break;

      default:
        console.log("❓ Unknown WebSocket message type:", wsMessage.type, wsMessage);
        break;
    }
  }, [
    handlePongMessage,
    handleReplyMessage,
    handleLogMessage,
    handleBuilderLogsMessage
  ]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    initializeWebSocketService();
    return () => {
      wsServiceRef.current?.destroy();
    };
  }, [initializeWebSocketService]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
      type: "text",
    };

    addMessage(userMessage);

    // Create checkpoint on first user message and add it under the user message
    if (!hasCreatedFirstUserCheckpoint) {
      const firstCheckpoint = createSpaceCheckpoint('Before AI Edits');
      console.log("💾 Created first-message checkpoint:", {
        checkpointId: firstCheckpoint.id,
        checkpointName: firstCheckpoint.name,
        savedConfig: firstCheckpoint.spaceConfig,
      });
      setHasCreatedFirstUserCheckpoint(true);

      // Capture screenshot of the space before AI changes
      const screenshot = await captureSpaceScreenshot();

      // Add checkpoint button to chat as a user message
      const firstCheckpointMessage: Message = {
        id: `first-checkpoint-${Date.now()}`,
        role: "user",
        content: "",
        timestamp: new Date(),
        type: "checkpoint",
        checkpointId: firstCheckpoint.id,
        screenshot: screenshot || undefined,
      };

      addMessage(firstCheckpointMessage);
    }
    setInputValue("");
    setIsLoading(true);

    try {
      // Send message via WebSocket with FRESH context
      if (wsServiceRef.current?.isConnected()) {
        console.log("📤 Sending user message with fresh space config context");

        // Get the current context right before sending
        const freshContext = ensureContextHasGridSize(getFreshSpaceContext());
        console.log("🔧 Fresh context for AI:", {
          hasContext: !!freshContext,
          fidgetCount: freshContext?.fidgetInstanceDatums
            ? Object.keys(freshContext.fidgetInstanceDatums).length
            : 0,
          layoutID: freshContext?.layoutID,
          theme: freshContext?.theme?.id,
          gridSize: freshContext?.gridSize
            ? {
                columns: freshContext.gridSize.columns,
                rows: freshContext.gridSize.rows,
                rowHeight: freshContext.gridSize.rowHeight,
                hasFeed: freshContext.gridSize.hasFeed,
                hasProfile: freshContext.gridSize.hasProfile,
                isInferred: freshContext.gridSize.isInferred,
              }
            : null,
        });

        // Update the WebSocket service with fresh context
        wsServiceRef.current.updateSpaceContext(freshContext);

        const success = wsServiceRef.current.sendUserMessage(
          userMessage.content
        );
        if (!success) {
          throw new Error("Failed to send WebSocket message");
        }
      } else {
        throw new Error("WebSocket not connected");
      }
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      toast.error(
        "Failed to send message. Please check your connection and try again."
      );
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <aside
      className="h-screen flex-row flex bg-white transition-transform"
      aria-label="AI Chat Sidebar"
    >
      <div className="flex-1 w-[420px] h-full max-h-screen flex-col flex overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-2 pt-3 pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <LucideSparkle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Vibe Customization</h2>
              <div className="flex items-center gap-2">
                <ConnectionStatusIndicator status={connectionStatus} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-1 py-2 mt-1">
          <div className="space-y-4 pr-1 pt-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`min-w-0 rounded-lg px-2 py-2 break-words overflow-wrap-anywhere ${message.role === "user"
                    ? message.type === "checkpoint"
                      ? "bg-green-500 text-white max-w-[95%]"
                      : "bg-blue-500 text-white max-w-[95%]"
                    : message.type === "checkpoint"
                      ? "bg-green-50 border border-green-200 text-gray-900 max-w-[95%]"
                      : message.aiType === "builder"
                        ? "bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 text-gray-900 max-w-[95%]"
                        : "bg-gray-100 text-gray-900 max-w-[95%]"
                    }`}
                >
                  {/* Checkpoint button */}
                  {message.type === "checkpoint" && message.checkpointId && (
                    <div className="space-y-2">
                      {/* Screenshot */}
                      {message.screenshot && (
                        <div className="relative">
                          <img
                            src={message.screenshot}
                            alt="Space screenshot"
                            className="w-full h-20 object-cover rounded border"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-10 rounded"></div>
                        </div>
                      )}

                      {/* Checkpoint controls */}
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${message.role === "user" ? "text-green-100" : "text-green-800"}`}>
                          {checkpoints.find(cp => cp.id === message.checkpointId)?.name || 'Checkpoint'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestoreCheckpoint(message.checkpointId!)}
                          disabled={isRestoring}
                          className={`h-7 w-7 p-0 ${message.role === "user"
                            ? "text-green-200 hover:text-white hover:bg-green-600"
                            : "text-green-600 hover:text-green-700 hover:bg-green-100"
                            }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Builder AI indicator */}
                  {message.aiType === "builder" && message.type !== "checkpoint" && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-purple-600 font-medium">
                      <Image
                        src="/images/tom_alerts.png"
                        alt="Tom AI"
                        width={12}
                        height={12}
                        className="rounded-full object-cover"
                      />
                      Space Builder AI
                    </div>
                  )}

                  {message.content && (
                    <div className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere word-break hyphens-auto">
                      {message.content}
                    </div>
                  )}

                  {/* Configuration details for applied configs - show checkpoint instead of text */}
                  {message.type === "config" && message.spaceConfig && message.configApplied && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {message.checkpointId ? (
                        <div className="space-y-2">
                          {/* Screenshot */}
                          {message.screenshot && (
                            <div className="relative">
                              <img
                                src={message.screenshot}
                                alt="Space screenshot"
                                className="w-full h-20 object-cover rounded border"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-10 rounded"></div>
                            </div>
                          )}

                          {/* Checkpoint controls */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-800">
                              {checkpoints.find(cp => cp.id === message.checkpointId)?.name || 'Checkpoint'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreCheckpoint(message.checkpointId!)}
                              disabled={isRestoring}
                              className="h-7 w-7 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                          ✅ Configuration automatically applied
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-xs mt-1 opacity-70 ${message.role === "user"
                      ? message.type === "checkpoint"
                        ? "text-green-100"
                        : "text-blue-100"
                      : message.type === "checkpoint"
                        ? "text-green-600"
                        : "text-gray-500"
                      }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-2 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600">
                      {loadingType === "thinking" && "Thinking..."}
                      {loadingType === "building" && "Building..."}
                      {!loadingType && "AI is processing..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-2 border-t relative">
          <div className="flex gap-1">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me to customize your space..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="self-end bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </div>

          {/* Reconnect button when disconnected */}
          {(connectionStatus === "disconnected" ||
            connectionStatus === "error") && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={initializeWebSocketService}
                  className="text-xs h-7 w-full"
                >
                  <Wifi className="w-3 h-3 mr-1" />
                  Reconnect to AI
                </Button>
              </div>
            )}
        </div>
      </div>
    </aside>
  );
};

export default AiChatSidebar;