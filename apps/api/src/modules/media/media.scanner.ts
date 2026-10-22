import { connect, type Socket } from 'node:net';
import { Injectable } from '@nestjs/common';

/**
 * Malware scanning for uploaded media (docs/design/15-security.md 15.3). The
 * library only ever accepts images, but an image file can still carry an
 * exploit for the browser or the image decoder; scanning before the file is
 * accepted keeps the library clean and gives the owner a clear rejection.
 *
 * The scanner sits behind a token so tests inject a fake, and so a deployment
 * can choose ClamAV or no scanner without touching the media service.
 */

export const MEDIA_SCANNER = 'LUMIO_MEDIA_SCANNER';

export interface ScanResult {
  clean: boolean;
  /** Signature name ClamAV reported, e.g. `Win.Test.EICAR_HDB-1`. */
  signature: string | null;
}

export interface MediaScanner {
  readonly driver: 'clamav' | 'none';
  /** Rejects when the scanner itself is unreachable, never silently allows. */
  scan(buffer: Buffer): Promise<ScanResult>;
}

/** Default when `MEDIA_SCANNER` is not `clamav`; development and tests use it. */
@Injectable()
export class NoopMediaScanner implements MediaScanner {
  readonly driver = 'none' as const;

  async scan(): Promise<ScanResult> {
    return { clean: true, signature: null };
  }
}

export interface ClamAvOptions {
  host: string;
  port: number;
  /** Whole exchange, including the response, in milliseconds. */
  timeoutMs: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Speaks the clamd INSTREAM protocol over TCP: `zINSTREAM\0`, then each chunk
 * prefixed with its length as a big-endian uint32, then a zero-length chunk.
 * clamd answers `stream: OK` for a clean file or `stream: <signature> FOUND`.
 */
export class ClamAvMediaScanner implements MediaScanner {
  readonly driver = 'clamav' as const;

  constructor(private readonly options: ClamAvOptions) {}

  async scan(buffer: Buffer): Promise<ScanResult> {
    const response = await this.sendInstream(buffer);
    return parseClamdResponse(response);
  }

  private sendInstream(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket: Socket = connect({ host: this.options.host, port: this.options.port });
      let response = '';
      let settled = false;

      const finish = (error: Error | null, value?: string): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.removeAllListeners();
        socket.destroy();
        if (error) reject(error);
        else resolve(value ?? '');
      };

      const timer = setTimeout(
        () => finish(new Error('สแกนไฟล์ไม่สำเร็จ: clamd ไม่ตอบภายในเวลาที่กำหนด')),
        this.options.timeoutMs,
      );
      timer.unref?.();

      socket.on('error', (error) => finish(error));
      socket.on('close', () => {
        if (!settled) finish(new Error('สแกนไฟล์ไม่สำเร็จ: clamd ปิดการเชื่อมต่อ'));
      });
      socket.on('data', (chunk: Buffer) => {
        response += chunk.toString('utf8');
        if (response.includes('\0') || /FOUND|OK|ERROR/.test(response)) {
          finish(null, response.replace(/\0/g, '').trim());
        }
      });

      socket.on('connect', () => {
        socket.write('zINSTREAM\0');

        const chunks: Buffer[] = [];
        for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
          const chunk = buffer.subarray(offset, offset + 64 * 1024);
          const length = Buffer.alloc(4);
          length.writeUInt32BE(chunk.length, 0);
          chunks.push(length, chunk);
        }
        chunks.push(Buffer.alloc(4));
        socket.write(Buffer.concat(chunks));
      });
    });
  }
}

/** Reads clamd's reply; unknown replies count as a scanner failure. */
export const parseClamdResponse = (raw: string): ScanResult => {
  const text = raw.trim();
  if (/stream:\s*OK/i.test(text)) return { clean: true, signature: null };

  const found = /stream:\s*(.+?)\s+FOUND/i.exec(text);
  if (found?.[1]) return { clean: false, signature: found[1].trim() };

  throw new Error(`สแกนไฟล์ไม่สำเร็จ: clamd ตอบกลับ "${text.slice(0, 120)}"`);
};

/** Driver and connection settings from the environment. */
export const mediaScannerDriver = (env: NodeJS.ProcessEnv = process.env): 'clamav' | 'none' =>
  env.MEDIA_SCANNER === 'clamav' ? 'clamav' : 'none';

export const clamAvOptions = (env: NodeJS.ProcessEnv = process.env): ClamAvOptions => {
  const port = Number(env.CLAMAV_PORT ?? '3310');
  const timeout = Number(env.CLAMAV_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS));
  return {
    host: env.CLAMAV_HOST?.trim() || '127.0.0.1',
    port: Number.isInteger(port) && port > 0 && port <= 65_535 ? port : 3310,
    timeoutMs: Number.isFinite(timeout) && timeout >= 500 ? Math.min(timeout, 60_000) : DEFAULT_TIMEOUT_MS,
  };
};

/** Provider factory used by the media module. */
export const createMediaScanner = (env: NodeJS.ProcessEnv = process.env): MediaScanner =>
  mediaScannerDriver(env) === 'clamav'
    ? new ClamAvMediaScanner(clamAvOptions(env))
    : new NoopMediaScanner();
