export const DEFAULT_INDEXNOW_KEY = 'e824c3fa1b9d4e569720b583f71c4a92';
export const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY).trim();
export const SITE_URL = (process.env.VITE_SITE_URL || 'https://games.blossomsarchive.com').replace(/\/+$/, '');
export const HOST = new URL(SITE_URL).host;
