import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { nanoid } from 'nanoid';

interface Client {
  id: string;
  ws: WebSocket;
  isAdmin: boolean;
  supportRoom?: string;
}

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private supportRooms: Map<string, Set<string>> = new Map(); // roomId -> clientIds

  constructor(server: Server) {
    this.wss = new WebSocketServer({ noServer: true });
    this.setupWSS();

    // Handle upgrade
    server.on('upgrade', (request, socket, head) => {
      if (request.url?.startsWith('/api/support')) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      }
    });
  }

  private setupWSS() {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      if (req.url?.startsWith('/api/support')) {
        this.handleSupportConnection(ws, req);
        return;
      }
      const clientId = nanoid();
      const client: Client = { id: clientId, ws, isAdmin: false };
      this.clients.set(clientId, client);

      // Send initial connection success
      this.sendToClient(client, {
        type: 'connection_status',
        connected: true,
        clientId
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(client, data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(client);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      console.log(`Client ${clientId} connected`);
    });
  }

  private handleMessage(client: Client, message: any) {
    switch (message.type) {
      case 'admin_auth':
        if (message.token) {
          // Verify admin token
          client.isAdmin = true; // Set proper verification logic
          this.sendToClient(client, { type: 'admin_auth_success' });
        }
        break;

      case 'join_support_room':
        if (message.roomId) {
          this.joinSupportRoom(client, message.roomId);
        }
        break;

      case 'support_message':
        if (message.text && client.supportRoom) {
          this.broadcastToRoom(client.supportRoom, {
            type: 'new_support_message',
            clientId: client.id,
            isAdmin: client.isAdmin,
            text: message.text,
            timestamp: new Date().toISOString()
          });
        }
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleClientDisconnect(client: Client) {
    if (client.supportRoom) {
      const room = this.supportRooms.get(client.supportRoom);
      if (room) {
        room.delete(client.id);
        if (room.size === 0) {
          this.supportRooms.delete(client.supportRoom);
        }
      }
    }
    this.clients.delete(client.id);
    console.log(`Client ${client.id} disconnected`);
  }

  private joinSupportRoom(client: Client, roomId: string) {
    // Remove from previous room if any
    if (client.supportRoom) {
      const previousRoom = this.supportRooms.get(client.supportRoom);
      if (previousRoom) {
        previousRoom.delete(client.id);
      }
    }

    // Join new room
    let room = this.supportRooms.get(roomId);
    if (!room) {
      room = new Set();
      this.supportRooms.set(roomId, room);
    }
    room.add(client.id);
    client.supportRoom = roomId;

    // Notify client
    this.sendToClient(client, {
      type: 'room_joined',
      roomId
    });
  }

  private sendToClient(client: Client, data: any) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  private broadcastToRoom(roomId: string, data: any) {
    const room = this.supportRooms.get(roomId);
    if (room) {
      room.forEach(clientId => {
        const client = this.clients.get(clientId);
        if (client) {
          this.sendToClient(client, data);
        }
      });
    }
  }

  public handleSupportConnection(ws: WebSocket, req: any) {
    const clientId = nanoid();
    const client: Client = { id: clientId, ws, isAdmin: false };
    this.clients.set(clientId, client);

    // Create a unique support room for this connection
    const roomId = nanoid();
    this.joinSupportRoom(client, roomId);

    // Rest of the connection handling is done in setupWSS
    ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(client, data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(client);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      console.log(`Client ${clientId} connected`);
  }

  public broadcast(data: any) {
    this.clients.forEach(client => {
      this.sendToClient(client, data);
    });
  }
}