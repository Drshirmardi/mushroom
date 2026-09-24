import { Injectable } from '@nestjs/common';
import type { Socket } from 'socket.io';

type RegisteredSocket = Pick<Socket, 'id' | 'disconnect'>;

/**
 * Single-instance, in-memory ownership for authenticated chat sockets. It is
 * deliberately not a durable authority or a cross-instance fan-out mechanism.
 */
@Injectable()
export class ChatSocketRegistry {
  private readonly socketsByUser = new Map<string, Map<string, RegisteredSocket>>();
  private readonly socketsBySession = new Map<string, Map<string, RegisteredSocket>>();
  private readonly ownerBySocket = new Map<string, { userId: string; sessionId: string }>();

  register(socket: RegisteredSocket, userId: string, sessionId: string) {
    this.unregister(socket.id);
    const userSockets = this.socketsByUser.get(userId) ?? new Map<string, RegisteredSocket>();
    userSockets.set(socket.id, socket);
    this.socketsByUser.set(userId, userSockets);
    const sessionSockets = this.socketsBySession.get(sessionId) ?? new Map<string, RegisteredSocket>();
    sessionSockets.set(socket.id, socket);
    this.socketsBySession.set(sessionId, sessionSockets);
    this.ownerBySocket.set(socket.id, { userId, sessionId });

    if (userSockets.size > 3) {
      const oldest = userSockets.values().next().value as RegisteredSocket;
      this.unregister(oldest.id);
      oldest.disconnect(true);
    }
  }

  unregister(socketId: string) {
    const owner = this.ownerBySocket.get(socketId);
    if (!owner) return;
    this.ownerBySocket.delete(socketId);
    this.remove(this.socketsByUser, owner.userId, socketId);
    this.remove(this.socketsBySession, owner.sessionId, socketId);
  }

  disconnectSession(sessionId: string) {
    this.disconnect(this.socketsBySession.get(sessionId));
  }

  disconnectUser(userId: string) {
    this.disconnect(this.socketsByUser.get(userId));
  }

  private disconnect(sockets: Map<string, RegisteredSocket> | undefined) {
    for (const socket of [...(sockets?.values() ?? [])]) {
      this.unregister(socket.id);
      socket.disconnect(true);
    }
  }

  private remove(index: Map<string, Map<string, RegisteredSocket>>, ownerId: string, socketId: string) {
    const sockets = index.get(ownerId);
    sockets?.delete(socketId);
    if (sockets?.size === 0) index.delete(ownerId);
  }
}
