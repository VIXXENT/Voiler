import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import * as lancedb from '@lancedb/lancedb'
import { pipeline } from '@xenova/transformers'
import { Result, ResultAsync, fromPromise, ok, err } from 'neverthrow'

const ROOT_DIR: string = path.resolve('../../')
const DB_PATH: string = path.join(ROOT_DIR, '.lancedb')
const CACHE_PATH: string = path.join(
  ROOT_DIR,
  'packages/context-engine/.last_ingest.json',
)
const DOCS_PATTERN: string = '{**/CLAUDE.md,ROADMAP.md}'

type Chunk = {
  title: string
  content: string
  path: string
}

type IngestCache = {
  [path: string]: number
}

type ContextRecord = {
  vector: number[]
  text: string
  path: string
  title: string
  content_length: number
  mtime: number
}

type RecursiveMarkdownSplitParams = {
  text: string
  filePath: string
  maxChunkSize?: number
  overlap?: number
}

type ProcessBufferParams = {
  header: string
  content: string
  maxChunkSize: number
  overlap: number
  filePath: string
  chunks: Chunk[]
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
 * Split markdown text into hierarchical chunks.
 * @param params - The input parameters.
 * @returns An array of chunks.
 */
const recursiveMarkdownSplit: (params: RecursiveMarkdownSplitParams) => Chunk[] = (
  params: RecursiveMarkdownSplitParams,
): Chunk[] => {
  const {
    text,
    filePath,
    maxChunkSize = 1000,
    overlap = 150,
  }: RecursiveMarkdownSplitParams = params
  const chunks: Chunk[] = []
  const lines: string[] = text.split('\n')

  let currentHeader: string = 'Root'
  let currentContent: string = ''

  /**
   * Processes the current content buffer.
   * @param p - Process parameters.
   */
  const processBuffer: (p: ProcessBufferParams) => void = (
    p: ProcessBufferParams,
  ): void => {
    const {
      header,
      content,
      maxChunkSize: size,
      overlap: lap,
      filePath: pathStr,
      chunks: arr,
    }: ProcessBufferParams = p
    if (!content.trim()) {
      return
    }

    if (content.length <= size) {
      arr.push({ title: header, content: content.trim(), path: pathStr })
      return
    }

    // Split large sections by paragraphs
    const paragraphs: string[] = content.split('\n\n')
    let buffer: string = ''
    for (const para of paragraphs) {
      if ((buffer + para).length <= size) {
        buffer += (buffer ? '\n\n' : '') + para
      } else {
        if (buffer) {
          arr.push({ title: header, content: buffer.trim(), path: pathStr })
        }
        buffer = buffer.slice(-lap) + '\n\n' + para
      }
    }
    if (buffer.trim()) {
      arr.push({ title: header, content: buffer.trim(), path: pathStr })
    }
  }

  for (const line of lines) {
    if (line.startsWith('#')) {
      processBuffer({
        header: currentHeader,
        content: currentContent,
        maxChunkSize,
        overlap,
        filePath,
        chunks,
      })
      currentHeader = line.replace(/^#+\s+/, '').trim()
      currentContent = ''
    } else {
      currentContent += line + '\n'
    }
  }

  processBuffer({
    header: currentHeader,
    content: currentContent,
    maxChunkSize,
    overlap,
    filePath,
    chunks,
  })
  return chunks
}

// Functional type for the transformer returned by @xenova/transformers pipeline
// eslint-disable-next-line max-params
type TransformerFn = (text: string, options: EmbedderOptions) => Promise<EmbedderResult>;

/**
 * Main ingestion logic wrapped in ResultAsync.
 */
const main: () => ResultAsync<void, Error> = (): ResultAsync<void, Error> => {
  info('🚀 Starting incremental context sync...')

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
     * @param params - The input parameters.
     * @returns A promise resolving to the embedding result.
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

    // Step 2: Connect to LanceDB
    const dbResult: Result<lancedb.Connection, Error> = await fromPromise(
      lancedb.connect(DB_PATH),
      (e: unknown): Error => new Error(`DB Connect Error: ${String(e)}`),
    )
    if (dbResult.isErr()) {
      return err(dbResult.error)
    }
    const db: lancedb.Connection = dbResult.value

    // Step 3: Get table names
    const tableNamesResult: Result<string[], Error> = await fromPromise(
      db.tableNames(),
      (e: unknown): Error => new Error(`Table Names Error: ${String(e)}`),
    )
    if (tableNamesResult.isErr()) {
      return err(tableNamesResult.error)
    }
    const tableNames: string[] = tableNamesResult.value

    // Step 4: Load cache using Result.fromThrowable for sync IO
    const cacheResult: Result<IngestCache, Error> = Result.fromThrowable(
      (): IngestCache => {
        if (!fs.existsSync(CACHE_PATH)) {
          return {}
        }
        return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as IngestCache
      },
      (e: unknown): Error => new Error(`Cache Read Error: ${String(e)}`),
    )()
    if (cacheResult.isErr()) {
      return err(cacheResult.error)
    }
    const cache: IngestCache = cacheResult.value

    // Step 5: Glob for documentation files
    const globResult: Result<string[], Error> = await fromPromise(
      glob(DOCS_PATTERN, { cwd: ROOT_DIR }),
      (e: unknown): Error => new Error(`Glob Error: ${String(e)}`),
    )
    if (globResult.isErr()) {
      return err(globResult.error)
    }
    const files: string[] = globResult.value

    const newCache: IngestCache = {}
    const filesToProcess: string[] = []
    const filesToDelete: string[] = []

    for (const file of files) {
      const fullPath: string = path.join(ROOT_DIR, file)
      const mtime: number = fs.statSync(fullPath).mtimeMs
      newCache[file] = mtime

      if (!cache[file] || mtime > cache[file]) {
        filesToProcess.push(file)
        if (cache[file]) {
          filesToDelete.push(file)
        }
      }
    }

    // Detect deleted files
    Object.keys(cache).forEach((cachedPath: string): void => {
      if (!newCache[cachedPath]) {
        filesToDelete.push(cachedPath)
      }
    })

    if (filesToProcess.length === 0 && filesToDelete.length === 0) {
      info('✅ Context is already up to date.')
      return ok(undefined)
    }

    info(`📝 Updates: ${filesToProcess.length}, Deletions: ${filesToDelete.length}`)

    // Step 6: Handle existing data (deletions + read surviving records)
    const existingDataResult: Result<ContextRecord[], Error> = await fromPromise(
      (async (): Promise<ContextRecord[]> => {
        let existingData: ContextRecord[] = []
        if (tableNames.includes('context')) {
          const table: lancedb.Table = await db.openTable('context')
          if (filesToDelete.length > 0) {
            const filter: string = filesToDelete
              .map((p: string): string => `path = '${p}'`)
              .join(' OR ')
            await table.delete(filter)
          }
          const queryResult: unknown = await table.query().execute()
          existingData = Array.isArray(queryResult)
            ? queryResult as ContextRecord[]
            : []
        }
        return existingData
      })(),
      (e: unknown): Error => new Error(`Data Preparation Error: ${String(e)}`),
    )
    if (existingDataResult.isErr()) {
      return err(existingDataResult.error)
    }
    const existingData: ContextRecord[] = existingDataResult.value

    // Step 7: Process and embed new entries
    const newDataResult: Result<ContextRecord[], Error> = await fromPromise(
      (async (): Promise<ContextRecord[]> => {
        const newData: ContextRecord[] = []
        for (const file of filesToProcess) {
          info(`   📄 Processing: ${file}...`)
          const content: string = fs.readFileSync(path.join(ROOT_DIR, file), 'utf-8')
          const sections: Chunk[] = recursiveMarkdownSplit({
            text: content,
            filePath: file,
          })

          for (const section of sections) {
            const outputResult: Result<EmbedderResult, Error> = await embed({
              text: section.content,
              options: { pooling: 'mean', normalize: true },
            })
            if (outputResult.isErr()) {
              throw outputResult.error
            }
            const output: EmbedderResult = outputResult.value
            newData.push({
              vector: Array.from(output.data),
              text: `File: ${section.path}\nSection: ${section.title}\n\n${section.content}`,
              path: section.path,
              title: section.title,
              content_length: section.content.length,
              mtime: newCache[file],
            })
          }
        }
        return newData
      })(),
      (e: unknown): Error => new Error(`Embedding Workflow Error: ${String(e)}`),
    )
    if (newDataResult.isErr()) {
      return err(newDataResult.error)
    }
    const newData: ContextRecord[] = newDataResult.value

    // Step 8: Write final index and update cache
    const finalData: ContextRecord[] = [...existingData, ...newData]
    const writeResult: Result<void, Error> = await fromPromise(
      (async (): Promise<void> => {
        if (finalData.length > 0) {
          if (tableNames.includes('context')) {
            await db.dropTable('context')
          }
          await db.createTable('context', finalData)
        }
        fs.writeFileSync(CACHE_PATH, JSON.stringify(newCache, null, 2))
      })(),
      (e: unknown): Error => new Error(`Final Indexing Error: ${String(e)}`),
    )
    if (writeResult.isErr()) {
      return err(writeResult.error)
    }

    info(`✅ Sync complete. Indexed chunks: ${finalData.length}`)
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

void main().match(
  (): void => {},
  (e: Error): void => {
    console.error('❌ Fatal error during ingestion:', e.message)
    process.exit(1)
  },
)
