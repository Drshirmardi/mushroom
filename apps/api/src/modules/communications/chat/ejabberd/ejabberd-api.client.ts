import { Injectable } from '@nestjs/common';
import { EjabberdConfig, engineUnavailable } from './ejabberd.config';

@Injectable()
export class EjabberdApiClient {
  constructor(private readonly config: EjabberdConfig) {}

  async command<T>(name: 'create_room_with_opts' | 'get_room_options' | 'set_room_affiliation' | 'kick_session' | 'send_stanza' | 'status', body: Record<string, unknown>): Promise<T> {
    this.config.assertReady();
    const jid = `bridge@${this.config.domain}`;
    const token = this.config.sign(jid, Math.floor(Date.now() / 1000) + 60);
    try {
      const response = await fetch(`${this.config.apiUrl.replace(/\/$/u, '')}/${name}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(this.config.timeoutMs),
        headers: { authorization: `Basic ${Buffer.from(`${jid}:${token}`).toString('base64')}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw engineUnavailable();
      const text = await response.text();
      if (Buffer.byteLength(text) > 65_536) throw engineUnavailable();
      const data: unknown = JSON.parse(text);
      if (data && typeof data === 'object' && 'status' in data && data.status === 'error') throw engineUnavailable();
      return data as T;
    } catch { throw engineUnavailable(); }
  }

  async ensureRoom(room: string) {
    const opts = {
      persistent: 'true', members_only: 'true', public: 'false', public_list: 'false',
      allow_user_invites: 'false', allow_change_subj: 'false', allowpm: 'none',
      moderated: 'true', anonymous: 'true', mam: 'true', logging: 'false',
    };
    // A concurrent first opener may already have created it. Always inspect the
    // resulting room; an arbitrary failure must never be treated as success.
    try {
      await this.command('create_room_with_opts', {
        room, service: this.config.conference, host: this.config.domain,
        options: Object.entries(opts).map(([name, value]) => ({ name, value })),
      });
    } catch { /* The verified existing-room path below is also the retry path. */ }
    const options = await this.command<Record<string, unknown>>('get_room_options', { room, service: this.config.conference });
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw engineUnavailable();
    if (Object.entries(opts).some(([key, value]) => String(options[key]) !== value)) throw engineUnavailable();
  }

  async addMember(room: string, jid: string) {
    // Pin API v2 in deployment: its published signature uses name/service/jid.
    await this.command('set_room_affiliation', { name: room, service: this.config.conference, jid, affiliation: 'member' });
  }

  async disconnect(jid: string) {
    await this.command('kick_session', { user: jid.split('@')[0], host: this.config.domain, resource: 'sabz', reason: 'Session closed' });
  }

  async removeMember(room: string, jid: string) {
    await this.command('set_room_affiliation', { name: room, service: this.config.conference, jid, affiliation: 'none' });
  }

  async ready() {
    await this.command('status', {});
  }

  async visibility(conversationId: string, jid: string, id: string, visibility: 'VISIBLE' | 'RESTRICTED') {
    // Body-free invalidation only; the receiver obtains the current safe projection
    // from the existing visibility reconciliation API.
    if (!/^[0-9a-f-]{36}$/u.test(id) || !/^[0-9a-f-]{36}$/u.test(conversationId) || !/^u[0-9a-f]{32}s[0-9a-f]{32}x[0-9]{10}n[0-9a-f]{16}@[a-z0-9.-]+$/u.test(jid)) throw engineUnavailable();
    const from = `c${conversationId.replaceAll('-', '')}@${this.config.conference}`;
    const to = `${jid}/sabz`;
    await this.command('send_stanza', { from, to, stanza: `<message from="${from}" to="${to}" type="normal"><sabz-event xmlns="urn:sabz:chat:1" type="visibility" message-id="${id}" visibility="${visibility}"/></message>` });
  }
}
