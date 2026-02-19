import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  redisUrl: string;
  soulSecret: string;
  soulExpiry: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/acp',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  soulSecret: process.env.SOUL_SECRET || 'default-soul-secret',
  soulExpiry: process.env.SOUL_EXPIRY || '7d',
};

export const getSoulExpiryMs = (): number => {
  const expiry = config.soulExpiry;
  const match = expiry.match(/^(\d+)([dhms])$/);

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
};
