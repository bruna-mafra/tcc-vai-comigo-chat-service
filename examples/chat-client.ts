/**
 * Cliente de exemplo para o Chat Service
 * Demonstra como conectar e usar a API WebSocket
 */

import io, { Socket } from 'socket.io-client';

class ChatClient {
  private socket: Socket;
  private rideId: string;
  private userId: string;

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Conexão
    this.socket.on('connect', () => {
      console.log('✅ Conectado ao servidor');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Desconectado do servidor');
    });

    // Sala
    this.socket.on('room:joined', (data) => {
      console.log('📍 Entrou na sala:', data);
    });

    // Mensagens
    this.socket.on('message:received', (data) => {
      console.log('📨 Mensagem recebida:', data);
    });

    this.socket.on('message:sent', (data) => {
      console.log('✔️ Mensagem enviada:', data);
    });

    this.socket.on('message:deleted', (data) => {
      console.log('🗑️ Mensagem deletada:', data);
    });

    // Usuários
    this.socket.on('user:joined', (data) => {
      console.log('👤 Usuário entrou:', data);
    });

    this.socket.on('user:left', (data) => {
      console.log('👤 Usuário saiu:', data);
    });

    this.socket.on('users:connected', (data) => {
      console.log('👥 Usuários conectados:', data);
    });

    // Digitação
    this.socket.on('typing:active', (data) => {
      console.log('✍️ Usuário digitando:', data.userId);
    });

    this.socket.on('typing:stopped', (data) => {
      console.log('✋ Usuário parou de digitar:', data.userId);
    });

    // Erros
    this.socket.on('error', (data) => {
      console.error('❌ Erro:', data);
    });

    this.socket.on('exception', (data) => {
      console.error('❌ Exceção:', data);
    });
  }

  /**
   * Entra em uma sala de chat
   */
  joinRoom(rideId: string, userId: string): void {
    this.rideId = rideId;
    this.userId = userId;

    this.socket.emit('join:room', {
      rideId,
      userId,
    });
  }

  /**
   * Sai de uma sala de chat
   */
  leaveRoom(): void {
    this.socket.emit('leave:room', {
      rideId: this.rideId,
      userId: this.userId,
    });
  }

  /**
   * Envia uma mensagem
   */
  sendMessage(content: string): void {
    this.socket.emit('message:send', {
      rideId: this.rideId,
      senderId: this.userId,
      content,
    });
  }

  /**
   * Deleta uma mensagem
   */
  deleteMessage(messageId: string): void {
    this.socket.emit('message:delete', {
      messageId,
      rideId: this.rideId,
      userId: this.userId,
    });
  }

  /**
   * Obtém lista de usuários conectados
   */
  getConnectedUsers(): void {
    this.socket.emit('users:list', {
      rideId: this.rideId,
    });
  }

  /**
   * Informa que começou a digitar
   */
  startTyping(): void {
    this.socket.emit('typing:start', {
      rideId: this.rideId,
      userId: this.userId,
    });
  }

  /**
   * Informa que parou de digitar
   */
  stopTyping(): void {
    this.socket.emit('typing:stop', {
      rideId: this.rideId,
      userId: this.userId,
    });
  }

  /**
   * Desconecta do servidor
   */
  disconnect(): void {
    this.socket.disconnect();
  }
}

// Exemplo de uso
if (typeof window !== 'undefined') {
  // Ambiente browser
  const client = new ChatClient();

  // Simular interação
  setTimeout(() => {
    client.joinRoom('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');
  }, 1000);

  setTimeout(() => {
    client.startTyping();
  }, 2000);

  setTimeout(() => {
    client.sendMessage('Olá! Como você está?');
    client.stopTyping();
  }, 3000);

  setTimeout(() => {
    client.getConnectedUsers();
  }, 4000);

  setTimeout(() => {
    client.leaveRoom();
  }, 5000);
}

export default ChatClient;
