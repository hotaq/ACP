import crypto from 'crypto';

const API_KEY_PREFIX = 'acp_live_';

export const generateApiKey = (): string => {
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  return `${API_KEY_PREFIX}${randomBytes}`;
};

export const hashApiKey = (apiKey: string): string => {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
};

export const isApiKey = (token: string): boolean => {
  return token.startsWith(API_KEY_PREFIX);
};

export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  return parts.length === 2 ? parts[1] : parts[0];
};
