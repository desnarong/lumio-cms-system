import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Signals "the caller already has this version" for a conditional request
 * (docs/design/12-api.md 12.7).
 *
 * It travels as an exception because Nest always writes the handler's payload
 * through `ApplicationRef.reply`, which forces the success status back to 200:
 * an interceptor cannot answer 304 and return normally. `ApiExceptionFilter`
 * recognises this class, sends the bare 304 and writes nothing else.
 */
export class NotModifiedException extends HttpException {
  constructor() {
    super('', HttpStatus.NOT_MODIFIED);
  }
}