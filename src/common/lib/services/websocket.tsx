/**
 * WebSocket Service for AI Space Builder
 * Handles connection to the AI space builder service and manages message flow
 */

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type WebSocketMessageType = 
  | "REPLY"          // Final AI response with config or text
  | "PLANNER_LOGS"   // Planning phase logs
  | "BUILDER_LOGS"   // Building phase logs with JSON config
  | "COMM_LOGS"      // Communication phase logs
  | "pong";          // Ping response

export interface IncomingMessage {
  type: WebSocketMessageType;
  name: string;      // e.g., "space-builder", "Planner", "BUILDER", "COMMUNICATOR"
  message: string;   // The actual content/JSON config
}

export interface OutgoingMessage {
  name: string;      // Client identifier
  message: string;   // User message with space context
}

export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts?: number;
  reconnectBackoffMs?: number;
  spaceContext?: any;
  userFid?: number | null;
}

export interface WebSocketCallbacks {
  onStatusChange: (status: ConnectionStatus) => void;
  onMessage: (message: IncomingMessage) => void;
  onError: (error: string) => void;
}

const DEFAULT_CONFIG = {
  maxReconnectAttempts: 5,
  reconnectBackoffMs: 1000,
};

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private callbacks: WebSocketCallbacks;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(config: WebSocketConfig, callbacks: WebSocketCallbacks) {
    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.callbacks = callbacks;
    
    console.log("🔧 WebSocket constructor received config:", {
      hasSpaceContext: !!this.config.spaceContext,
      spaceContextType: this.config.spaceContext ? typeof this.config.spaceContext : "undefined",
      spaceContextKeys: this.config.spaceContext ? Object.keys(this.config.spaceContext) : [],
      gridSize: this.config.spaceContext?.gridSize ?? null,
      userFid: this.config.userFid
    });
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      this.callbacks.onStatusChange("connecting");
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected to:", this.config.url);
        this.callbacks.onStatusChange("connected");
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.callbacks.onMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          this.callbacks.onError("Failed to parse server message");
        }
      };

      this.ws.onclose = (event) => {
        console.log("🔌 WebSocket disconnected:", event.code, event.reason);
        this.callbacks.onStatusChange("disconnected");
        
        // Auto-reconnect if not a clean disconnect
        if (event.code !== 1000) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.callbacks.onStatusChange("error");
        this.callbacks.onError("Connection error. Trying to reconnect...");
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      this.callbacks.onStatusChange("error");
      this.callbacks.onError("Failed to connect to AI service");
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, "User disconnected");
      this.ws = null;
    }

    this.callbacks.onStatusChange("disconnected");
  }

  /**
   * Send a message to the WebSocket server
   */
  private send(message: OutgoingMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("Cannot send message: WebSocket not connected");
      return false;
    }

    try {
      const messageString = JSON.stringify(message);
      this.ws.send(messageString);
      return true;
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
      this.callbacks.onError("Failed to send message");
      return false;
    }
  }

  /**
   * Send a ping message for connectivity testing
   */
  ping(): boolean {
    const pingMessage: OutgoingMessage = {
      name: "ping",
      message: "ping",
    };

    return this.send(pingMessage);
  }

  /**
   * Send a user message with space context to the AI
   */
  sendUserMessage(message: string): boolean {
    if (!this.isConnected()) {
      console.error("WebSocket not connected");
      return false;
    }

    // Create message with space context
    const messageWithContext = this.formatMessageWithContext(message);
    
    const outgoingMessage: OutgoingMessage = {
      name: `user_${this.config.userFid || 'anonymous'}`,
      message: messageWithContext,
    };

    return this.send(outgoingMessage);
  }

  /**
   * Format message with space context
   */
  private formatMessageWithContext(userMessage: string): string {
    if (!this.config.spaceContext) {
      console.log("📝 Sending message without space context (context not available)");
      return userMessage;
    }

    console.log("📝 Including current space config in message context:", {
      spaceContextType: typeof this.config.spaceContext,
      spaceContextKeys: this.config.spaceContext ? Object.keys(this.config.spaceContext) : [],
      fidgetCount: this.config.spaceContext.fidgetInstanceDatums ? 
        (Array.isArray(this.config.spaceContext.fidgetInstanceDatums) ? 
          this.config.spaceContext.fidgetInstanceDatums.length : 
          Object.keys(this.config.spaceContext.fidgetInstanceDatums).length) : 0,
      fidgetIds: this.config.spaceContext.fidgetInstanceDatums ? 
        (Array.isArray(this.config.spaceContext.fidgetInstanceDatums) ? 
          this.config.spaceContext.fidgetInstanceDatums.map((f: any) => f.id || f.fidgetId) : 
          Object.keys(this.config.spaceContext.fidgetInstanceDatums)) : [],
      hasTheme: !!this.config.spaceContext.theme,
      hasLayout: !!this.config.spaceContext.layoutID,
      gridSize: this.config.spaceContext.gridSize ?? null,
      fullSpaceContext: JSON.stringify(this.config.spaceContext, null, 2)
    });

    // Include current space config as context for the AI
    const contextMessage = `User request: ${userMessage}

Current space configuration:
${JSON.stringify(this.config.spaceContext, null, 2)}`;

    return contextMessage;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Update space context for future messages
   */
  updateSpaceContext(context: any): void {
    this.config.spaceContext = context;
  }

  /**
   * Update user FID for future messages
   */
  updateUserFid(fid: number | null): void {
    this.config.userFid = fid;
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    const maxAttempts = this.config.maxReconnectAttempts || 5;
    const baseDelay = this.config.reconnectBackoffMs || 1000;
    
    if (this.reconnectAttempts >= maxAttempts) {
      this.callbacks.onError("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${maxAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.disconnect();
  }
}