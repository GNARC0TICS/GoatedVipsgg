import { useEffect, useRef, useState } from 'react';

const INITIAL_RETRY_DELAY = 1000; // Start with 1 second delay
const MAX_RETRY_DELAY = 30000; // Max 30 seconds delay
const BACKOFF_MULTIPLIER = 1.5;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private retryDelay = INITIAL_RETRY_DELAY;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private messageHandlers: Set<(data: any) => void> = new Set();

  constructor(private url: string) {
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen() {
    console.log('WebSocket connected');
    this.retryCount = 0;
    this.retryDelay = INITIAL_RETRY_DELAY;
  }

  private handleClose() {
    console.log('WebSocket closed');
    this.scheduleReconnect();
  }

  private handleError(error: Event) {
    console.error('WebSocket error:', error);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      this.messageHandlers.forEach(handler => handler(data));
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectTimeoutId = setTimeout(() => {
      console.log(`Attempting to reconnect... (attempt ${this.retryCount + 1})`);
      this.connect();
      this.retryCount++;
      this.retryDelay = Math.min(this.retryDelay * BACKOFF_MULTIPLIER, MAX_RETRY_DELAY);
    }, this.retryDelay);
  }

  public subscribe(handler: (data: any) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', data);
    }
  }

  public close() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }
    this.ws?.close();
  }
}

// React hook for WebSocket
export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    wsRef.current = new WebSocketService(url);
    const unsubscribe = wsRef.current.subscribe((data) => {
      // Handle connection status updates
      if (data.type === 'connection_status') {
        setIsConnected(data.connected);
      }
    });

    return () => {
      unsubscribe();
      wsRef.current?.close();
    };
  }, [url]);

  return {
    send: (data: any) => wsRef.current?.send(data),
    isConnected
  };
}
