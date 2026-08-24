export interface RefreshTokenMaterial {
  sessionId: string;
  rawToken: string;
  tokenHash: string;
}

export interface InspectedRefreshToken {
  sessionId: string;
  tokenHash: string;
}

export abstract class RefreshTokenManager {
  abstract create(): RefreshTokenMaterial;
  abstract rotate(sessionId: string): RefreshTokenMaterial;
  abstract inspect(rawToken: string): InspectedRefreshToken | null;
}
