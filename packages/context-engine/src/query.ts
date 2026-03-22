import * as path from 'path'
import * as lancedb from '@lancedb/lancedb'
import { pipeline } from '@xenova/transformers'
import { ResultAsync, fromPromise, Result, ok, err } from 'neverthrow'

const ROOT_DIR: string = path.resolve('../../')
const DB_PATH: string = path.join(ROOT_DIR, '.lancedb')

/**
 * Type for parsed CLI arguments
 */
type QueryOptions = {
  query: string
  limit: number
  pathFilter?: string
}

type SearchResult = {
  _distance?: number
  path: string
  title: string
  text: string
}

/**
 * Options for the embedding process.
 */
type EmbedderOptions = {
  pooling: string;
  normalize: boolean;
};

/**
 * Parameters for the embedding function.
 */
type EmbedderParams = {
  text: string;
  options: EmbedderOptions;
};

/**
 * Result from the embedding function.
 */
type EmbedderResult = {
  data: Float32Array;
};

/**
 * Params for the result logging function.
 */
type LogResultParams = {
  res: SearchResult;
  idx: number;
};

// Functional type for the transformer returned by @xenova/transformers pipeline
// eslint-disable-next-line max-params
type TransformerFn = (text: string, options: EmbedderOptions) => Promise<EmbedderResult>;

/**
 * Manual argument parser to avoid extra dependencies.
 * @param args - The CLI arguments.
 * @returns Parsed query options.
 */
const parseArgs: (args: string[]) => QueryOptions = (
  args: string[],
): QueryOptions => {
  const options: QueryOptions = {
    query: '',
    limit: 3,
  }

  const positionalArgs: string[] = []

  for (let i: number = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--path' && args[i + 1]) {
      options.pathFilter = args[i + 1]
      i++
    } else {
      positionalArgs.push(args[i])
    }
  }

  options.query = positionalArgs.join(' ')
  return options
}

/**
 * Main execution logic for context searching.
 * @param options - Search options.
 * @returns A promise resolving when finished.
 */
const executeSearch: (options: QueryOptions) => ResultAsync<void, Error> = (
  options: QueryOptions,
): ResultAsync<void, Error> => {
  if (!options.query) {
    return ResultAsync.fromSafePromise(Promise.resolve()).andThen((): never => {
      errorLog('❌ Error: Please provide a search query.')
      info('Usage: npm run query -- "your search" [--limit 5] [--path "apps/%"]')
      process.exit(1)
    })
  }

  const pathStr: string = options.pathFilter
    ? `, path: ${options.pathFilter}`
    : ''
  info(`🔍 Searching for: "${options.query}" (limit: ${options.limit}${pathStr})`)

  const run: () => Promise<Result<void, Error>> = async (): Promise<Result<void, Error>> => {
    // Step 1: Load embedding pipeline
    const pipelineResult: Result<unknown, Error> = await fromPromise(
      pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'),
      (e: unknown): Error => new Error(`Pipeline Error: ${String(e)}`),
    )
    if (pipelineResult.isErr()) {
      return err(pipelineResult.error)
    }
    const rawEmbedder: TransformerFn = pipelineResult.value as TransformerFn

    /**
     * Compliant wrapper for the embedder function.
     */
    type EmbedFn = (params: EmbedderParams) => ResultAsync<EmbedderResult, Error>
    const embed: EmbedFn = (
      params: EmbedderParams,
    ): ResultAsync<EmbedderResult, Error> => {
      return fromPromise(
        rawEmbedder(params.text, params.options),
        (e: unknown): Error => new Error(`Embedder Error: ${String(e)}`),
      )
    }

    // Step 2: Connect to DB
    const dbResult: Result<lancedb.Connection, Error> = await fromPromise(
      lancedb.connect(DB_PATH),
      (e: unknown): Error => new Error(`DB Connect Error: ${String(e)}`),
    )
    if (dbResult.isErr()) {
      return err(dbResult.error)
    }
    const db: lancedb.Connection = dbResult.value

    // Step 3: Open table
    const tableResult: Result<lancedb.Table, Error> = await fromPromise(
      db.openTable('context'),
      (e: unknown): Error => new Error(`Table Open Error: ${String(e)}`),
    )
    if (tableResult.isErr()) {
      return err(tableResult.error)
    }
    const table: lancedb.Table = tableResult.value

    // Step 4: Embed query
    const embedResult: Result<EmbedderResult, Error> = await embed({
      text: options.query,
      options: { pooling: 'mean', normalize: true },
    })
    if (embedResult.isErr()) {
      return err(embedResult.error)
    }
    const queryVector: number[] = Array.from(embedResult.value.data)

    // Step 5: Execute search with optional path filter
    const searchResult: Result<SearchResult[], Error> = await fromPromise(
      (async (): Promise<SearchResult[]> => {
        let searchBuilder: lancedb.VectorQuery =
          table.vectorSearch(queryVector).limit(options.limit)
        if (options.pathFilter) {
          searchBuilder = searchBuilder.where(`path LIKE '${options.pathFilter}'`)
        }
        return searchBuilder.toArray()
      })(),
      (e: unknown): Error => new Error(`Search Execution Error: ${String(e)}`),
    )
    if (searchResult.isErr()) {
      return err(searchResult.error)
    }
    const results: SearchResult[] = searchResult.value

    // Step 6: Display results
    info('\n--- 📚 Context Engine Results ---')
    if (results.length === 0) {
      info('No results found for your query.')
    }

    /**
     * Logs a single search result.
     */
    const logResult: (params: LogResultParams) => void = (
      params: LogResultParams,
    ): void => {
      const { res, idx } = params
      info(`[${idx + 1}] Score: ${res._distance?.toFixed(4) || 'N/A'}`)
      info(`Path: ${res.path || 'unknown'}`)
      info(`Section: ${res.title || 'Root'}`)
      info('-'.repeat(30))
      info(res.text)
      info('='.repeat(40))
    }

    for (const [idx, res] of results.entries()) {
      logResult({ res, idx })
    }

    return ok(undefined)
  }

  return new ResultAsync(run())
}

/**
 * Technical wrapper for info logging to comply with ESLint no-console rule.
 * @param msg - The message to log.
 */
const info: (msg: string) => void = (msg: string): void => {
  console.info(msg)
}

/**
 * Technical wrapper for error logging to comply with ESLint no-console rule.
 * @param msg - The message to log.
 */
const errorLog: (msg: string) => void = (msg: string): void => {
  console.error(msg)
}

/**
 * Main entry point.
 */
const main: () => void = (): void => {
  const options: QueryOptions = parseArgs(process.argv.slice(2))
  void executeSearch(options).match(
    (): void => {},
    (err: Error): void => {
      errorLog(`❌ Fatal Error during search: ${err.message}`)
      process.exit(1)
    },
  )
}

main()
