import { createServer, type Server } from 'node:http';
import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FarazSmsAdapter } from '../src/modules/communications/sms/faraz-sms.adapter';
import { SmsProviderRegistry } from '../src/modules/communications/sms/sms-provider.registry';
import { SmsRuntimeService } from '../src/modules/communications/sms/sms-runtime.service';

describe('Faraz SDK helpers with actual loopback HTTP transport', () => {
  let server: Server, origin: string;
  let mode = 'success';
  const calls: { path: string; body: Record<string,unknown> }[] = [];
  const nativeFetch = globalThis.fetch;
  const adapter = new FarazSmsAdapter(new SmsProviderRegistry(),new SmsRuntimeService(new ConfigService({ SMS_TRANSPORT_MODE:'live',SMS_REQUEST_TIMEOUT_MS:'150' })));
  const input = { credential:{apiToken:'synthetic-not-live'},recipient:'+989123456789',text:'Synthetic invitation transport proof',senderLine:'90000000' };
  beforeAll(async () => {
    server = createServer((request,response) => {
      void (async () => {
        let body = ''; for await (const chunk of request) body += chunk;
        calls.push({ path:request.url!,body:body ? JSON.parse(body) : {} });
        expect(request.headers['api-key']).toBe('synthetic-not-live');
        if (mode === 'timeout') return;
        response.setHeader('Content-Type','application/json');
        if (mode === 'auth') { response.statusCode=403; response.end('{}'); return; }
        if (mode === 'server') { response.statusCode=503; response.end('{"status":"success"}'); return; }
        if (mode === 'empty') { response.end('{}'); return; }
        if (mode === 'invalid') { response.end('invalid-json'); return; }
        if (mode === 'rejected') { response.end('{"status":"error"}'); return; }
        response.end('{"status":"success","data":{"id":42}}');
      })();
    });
    await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
    origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
    vi.stubGlobal('fetch',(value: string|URL,options?: RequestInit) => { const url=new URL(String(value)); expect(url.origin).toBe('https://api.iranpayamak.com'); return nativeFetch(new URL(url.pathname+url.search,origin),options); });
  });
  beforeEach(() => { mode='success';calls.length=0; });
  afterAll(async () => { vi.unstubAllGlobals();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve())); });
  it('sends raw text to exactly one normalized number using the explicit sender line',async()=>{
    expect(await adapter.sendText(input)).toEqual({outcome:'ACCEPTED',providerReference:'42'});
    expect(calls).toEqual([{path:'/ws/v1/sms/simple',body:{text:input.text,recipients:['09123456789'],line_number:input.senderLine,number_format:'english'}}]);
  });
  it('keeps OTP on its separate pattern endpoint and does not use the invitation sender line',async()=>{
    expect((await adapter.sendPattern({credential:input.credential,recipient:input.recipient,config:{patternCode:'otp-only',invitationSenderLine:input.senderLine},attributes:{code:'123456'}})).outcome).toBe('ACCEPTED');
    expect(calls[0]).toMatchObject({path:'/ws/v1/sms/pattern',body:{code:'otp-only',recipient:'09123456789',line_number:'90008361',attributes:{code:'123456'}}});
  });
  it.each(['empty','invalid','server'])('never labels %s provider evidence as accepted',async value=>{ mode=value;expect((await adapter.sendText(input)).outcome).toBe('UNKNOWN');expect(calls).toHaveLength(1); });
  it.each(['auth','rejected'])('fails closed for %s without retrying',async value=>{ mode=value;expect((await adapter.sendText(input)).outcome).toBe('FAILED');expect(calls).toHaveLength(1); });
  it('aborts an uncertain timeout and does not issue a second request',async()=>{ mode='timeout';expect(await adapter.sendText(input)).toEqual({outcome:'UNKNOWN',errorCategory:'TIMEOUT'});expect(calls).toHaveLength(1); });
  it('rejects an invalid destination, missing text or unconfigured sender before network access',async()=>{
    for(const changes of [{recipient:'09123456789'},{text:' '},{senderLine:''}]) expect((await adapter.sendText({...input,...changes})).outcome).toBe('FAILED');
    expect(calls).toHaveLength(0);
  });
});
