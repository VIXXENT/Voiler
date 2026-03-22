import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Result } from 'neverthrow'

const __filename: string = fileURLToPath(import.meta.url)
const __dirname: string = path.dirname(__filename)

const logPath: string = path.resolve(__dirname, '../../../logs/api.log')
const logDir: string = path.dirname(logPath)

/**
 * Ensures the log directory exists using a Result-based approach.
 * This function initializes the physical storage for logs.
 */
Result.fromThrowable(
  (): void => {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  },
  (e: unknown): Error => new Error(`Failed to create log directory: ${String(e)}`),
)().match(
  (): void => {},
  (err: Error): void => {
    process.stdout.write(`❌ ${err.message}\n`)
  },
)

/**
 * Initializes the log file for the current session.
 * Wipes previous contents and adds a header.
 */
Result.fromThrowable(
  (): void => {
    const header: string = `--- LOG START: ${new Date().toLocaleString()} ---\n`
    fs.writeFileSync(logPath, header, { flag: 'w' })
  },
  (e: unknown): Error => new Error(`Critical error creating log at ${logPath}: ${String(e)}`),
)().match(
  (): void => {},
  (err: Error): void => {
    process.stdout.write(`❌ ${err.message}\n`)
  },
)

type ConsoleMethod = (...args: unknown[]) => void

const originalLog: ConsoleMethod = console.log // eslint-disable-line no-console
const originalError: ConsoleMethod = console.error
const originalInfo: ConsoleMethod = console.info
const originalWarn: ConsoleMethod = console.warn

export type AppendToLogParams = {
  readonly args: unknown[]
  readonly type: string
}

type AppendToLogFn = (params: AppendToLogParams) => void

/**
 * Helper to append messages to the log file safely.
 *
 * Maps complex objects to JSON and handles file system access within a
 * Result context to prevent application crashes on I/O failure.
 *
 * @param params - Object containing the arguments to log and the log type.
 */
const appendToLog: AppendToLogFn = (params: AppendToLogParams): void => {
  const { args, type }: AppendToLogParams = params
  const message: string = args
    .map((arg: unknown): string => (
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ))
    .join(' ')

  const timestamp: string = new Date().toLocaleTimeString()

  Result.fromThrowable(
    (): void => {
      fs.appendFileSync(logPath, `[${timestamp}] [${type}] ${message}\n`)
    },
    (): void => {}, // Silent on purpose to avoid recursion
  )()
}

/**
 * Overrides standard console methods to provide automatic persistent logging.
 */
// eslint-disable-next-line no-console
console.log = (...args: unknown[]): void => {
  appendToLog({ args, type: 'LOG' })
  originalLog.apply(console, args)
}

console.error = (...args: unknown[]): void => {
  appendToLog({ args, type: 'ERROR' })
  originalError.apply(console, args)
}

console.info = (...args: unknown[]): void => {
  appendToLog({ args, type: 'INFO' })
  originalInfo.apply(console, args)
}

console.warn = (...args: unknown[]): void => {
  appendToLog({ args, type: 'WARN' })
  originalWarn.apply(console, args)
}

originalInfo('📝 Logging system configured at: ' + logPath)
