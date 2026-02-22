import pino from 'pino'

/**
 * Shared pino logger for the scanner code path.
 *
 * Log level is controlled by the LOG_LEVEL environment variable.
 * Defaults to 'debug' to capture all statements during development.
 *
 * Set LOG_LEVEL=info in production to suppress debug logs.
 *
 * Output is newline-delimited JSON. Pipe through `pino-pretty` for
 * human-readable output: `tsx scripts/run-scanner.ts | pnpm pino-pretty`
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'debug',
  base: { pid: process.pid },
  timestamp: pino.stdTimeFunctions.isoTime,
})
