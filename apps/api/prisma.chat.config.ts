import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const chatUrl = process.env.CHAT_DATABASE_URL;
const mainUrl = process.env.DATABASE_URL;
if (chatUrl && mainUrl) {
  const endpoint = (value: string) => {
    const url = new URL(value);
    const host = url.hostname === 'localhost' ? '127.0.0.1' : url.hostname;
    return host + ':' + (url.port || '5432');
  };
  if (endpoint(chatUrl) === endpoint(mainUrl)) throw new Error('The communications migration requires a separate PostgreSQL instance');
}

export default defineConfig({
  schema: 'prisma/chat/schema.prisma',
  migrations: { path: 'prisma/chat/migrations' },
  datasource: { url: chatUrl },
});
