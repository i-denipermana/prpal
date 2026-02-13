/** Structured logging utility */

import pino from 'pino'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

let logger: pino.Logger | null = null

export function initLogger(level: LogLevel = 'info'): pino.Logger {
  logger = pino({
    level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  })
  return logger
}

export function getLogger(): pino.Logger {
  if (!logger) {
    return initLogger()
  }
  return logger
}

export function debug(msg: string, obj?: Record<string, unknown>): void {
  getLogger().debug(obj ?? {}, msg)
}

export function info(msg: string, obj?: Record<string, unknown>): void {
  getLogger().info(obj ?? {}, msg)
}

export function warn(msg: string, obj?: Record<string, unknown>): void {
  getLogger().warn(obj ?? {}, msg)
}

export function error(msg: string, obj?: Record<string, unknown>): void {
  getLogger().error(obj ?? {}, msg)
}

export function child(bindings: Record<string, unknown>): pino.Logger {
  return getLogger().child(bindings)
}

export function setLogLevel(level: LogLevel): void {
  getLogger().level = level
}
