import { createServer, type Server, type Socket } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ClamAvMediaScanner,
  clamAvOptions,
  createMediaScanner,
  mediaScannerDriver,
  parseClamdResponse,
} from './media.scanner';

let server: Server | null = null;

const startClamd = async (reply: string): Promise<number> => {
  server = createServer((socket: Socket) => {
    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length < 10) return;
      let offset = 10;
      while (buffer.length >= offset + 4) {
        const length = buffer.readUInt32BE(offset);
        offset += 4;
        if (length === 0) {
          socket.write(`${reply}\0`);
          return;
        }
        offset += length;
      }
    });
  });

  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  return address.port;
};

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
    server = null;
  });
});

const scanner = (port: number): ClamAvMediaScanner =>
  new ClamAvMediaScanner({ host: '127.0.0.1', port, timeoutMs: 2000 });

describe('ClamAvMediaScanner', () => {
  it('streams the file and reports a clean answer', async () => {
    const port = await startClamd('stream: OK');

    await expect(scanner(port).scan(Buffer.from('image-bytes'))).resolves.toEqual({
      clean: true,
      signature: null,
    });
  });

  it('reports the signature of an infected file', async () => {
    const port = await startClamd('stream: Eicar-Test-Signature FOUND');

    await expect(scanner(port).scan(Buffer.from('virus'))).resolves.toEqual({
      clean: false,
      signature: 'Eicar-Test-Signature',
    });
  });

  it('fails closed when clamd cannot be reached', async () => {
    await expect(scanner(9).scan(Buffer.from('image'))).rejects.toThrow();
  });

  it('reads driver settings from the environment', () => {
    expect(mediaScannerDriver({})).toBe('none');
    expect(mediaScannerDriver({ MEDIA_SCANNER: 'clamav' })).toBe('clamav');
    expect(clamAvOptions({ CLAMAV_HOST: 'clam', CLAMAV_PORT: '3311' })).toMatchObject({
      host: 'clam',
      port: 3311,
    });
    expect(createMediaScanner({}).driver).toBe('none');
    expect(createMediaScanner({ MEDIA_SCANNER: 'clamav' }).driver).toBe('clamav');
  });

  it('treats an unknown reply as a scanner failure', () => {
    expect(() => parseClamdResponse('size limit exceeded ERROR')).toThrow();
  });
});
