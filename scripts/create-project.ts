import { input, checkbox, confirm } from '@inquirer/prompts'
import { readFileSync, writeFileSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT: string = join(import.meta.dirname, '..')

const SKIP_DIRS: ReadonlyArray<string> = ['node_modules', '.git', '.turbo', 'dist', '.output']

const TARGET_EXTENSIONS: ReadonlyArray<string> = [
  '.json',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
  '.md',
  '.txt',
  '.mjs',
  '.mts',
]

const TARGET_FILENAMES: ReadonlyArray<string> = ['Dockerfile']

type ModuleDefinition = {
  readonly name: string
  readonly description: string
}

const AVAILABLE_MODULES: ReadonlyArray<ModuleDefinition> = [
  {
    name: 'payments',
    description: 'Stripe checkout + webhooks',
  },
  {
    name: 'email',
    description: 'Transactional SMTP email',
  },
]

type FindFilesParams = {
  readonly dir: string
  readonly filter: (filePath: string) => boolean
}

/** Recursively walks a directory, returning file paths matching a filter. */
const findFiles = ({ dir, filter }: FindFilesParams): ReadonlyArray<string> => {
  const results: Array<string> = []

  const entries: ReadonlyArray<string> = readdirSync(dir)

  for (const entry of entries) {
    const fullPath: string = join(dir, entry)

    if (SKIP_DIRS.includes(entry)) {
      continue
    }

    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      results.push(...findFiles({ dir: fullPath, filter }))
    } else if (filter(fullPath)) {
      results.push(fullPath)
    }
  }

  return results
}

type ReplaceInFileParams = {
  readonly filePath: string
  readonly search: string | RegExp
  readonly replace: string
}

/** Reads a file, replaces all occurrences, writes back only if changed. */
const replaceInFile = ({ filePath, search, replace }: ReplaceInFileParams): void => {
  const content: string = readFileSync(filePath, 'utf-8')
  const updated: string = content.replaceAll(search, replace)

  if (updated !== content) {
    writeFileSync(filePath, updated, 'utf-8')
  }
}

type ProcessMarkersParams = {
  readonly filePath: string
  readonly moduleName: string
  readonly action: 'activate' | 'remove'
}

/** Processes MODULE markers in a file — activates or removes them. */
const processMarkers = ({ filePath, moduleName, action }: ProcessMarkersParams): void => {
  const content: string = readFileSync(filePath, 'utf-8')
  const lines: ReadonlyArray<string> = content.split('\n')

  const tsMarker: string = `// [MODULE:${moduleName}] `
  const hashMarker: string = `# [MODULE:${moduleName}] `

  const processed: ReadonlyArray<string> = lines
    .map((line) => {
      const tsIndex: number = line.indexOf(tsMarker)

      if (tsIndex !== -1) {
        if (action === 'activate') {
          const indent: string = line.slice(0, tsIndex)
          const code: string = line.slice(tsIndex + tsMarker.length)
          return `${indent}${code}`
        }
        return null
      }

      const hashIndex: number = line.indexOf(hashMarker)

      if (hashIndex !== -1) {
        if (action === 'activate') {
          const indent: string = line.slice(0, hashIndex)
          const code: string = line.slice(hashIndex + hashMarker.length)
          return `${indent}${code}`
        }
        return null
      }

      return line
    })
    .filter((line): line is string => line !== null)

  const result: string = processed.join('\n')

  if (result !== content) {
    writeFileSync(filePath, result, 'utf-8')
  }
}

/** Returns true if the file path matches target extensions or filenames. */
const isTargetFile = (filePath: string): boolean => {
  const name: string = filePath.split('/').pop() ?? ''
  return TARGET_EXTENSIONS.some((ext) => name.endsWith(ext)) || TARGET_FILENAMES.includes(name)
}

type RemoveWorkspaceEntryParams = {
  readonly workspacePath: string
  readonly entry: string
}

/** Removes a workspace entry from pnpm-workspace.yaml. */
const removeWorkspaceEntry = ({ workspacePath, entry }: RemoveWorkspaceEntryParams): void => {
  const content: string = readFileSync(workspacePath, 'utf-8')
  const updated: string = content
    .split('\n')
    .filter((line) => !line.includes(entry))
    .join('\n')

  if (updated !== content) {
    writeFileSync(workspacePath, updated, 'utf-8')
  }
}

type CleanPackageJsonParams = {
  readonly scope: string
}

/**
 * Removes init-project script and @inquirer/prompts
 * from root package.json.
 */
const cleanPackageJson = ({ scope }: CleanPackageJsonParams): void => {
  const pkgPath: string = join(ROOT, 'package.json')
  const content: string = readFileSync(pkgPath, 'utf-8')
  const pkg = JSON.parse(content)

  if (pkg.scripts) {
    delete pkg.scripts['init-project']
  }

  if (pkg.devDependencies) {
    delete pkg.devDependencies['@inquirer/prompts']
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
}

const SCOPE_REGEX: RegExp = /^@[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

/** Main entry point for the interactive init script. */
const main = async (): Promise<void> => {
  const scope: string = await input({
    message: 'Project scope (e.g. @myapp)',
    validate: (value) =>
      SCOPE_REGEX.test(value) || 'Must match @lowercase-name (e.g. @myapp, @cool-app)',
  })

  const scopeWithoutAt: string = scope.slice(1)

  const selectedModules: ReadonlyArray<string> = await checkbox({
    message: 'Select modules to include',
    choices: AVAILABLE_MODULES.map((mod) => ({
      name: `${mod.name} — ${mod.description}`,
      value: mod.name,
    })),
  })

  const moduleSummary: string = selectedModules.length > 0 ? selectedModules.join(', ') : 'none'

  const confirmed: boolean = await confirm({
    message: `Initialize as ${scope} with modules: ${moduleSummary}?`,
    default: true,
  })

  if (!confirmed) {
    console.log('Aborted.')
    return
  }

  // Step 4: Rename @voiler/* -> @scope/*
  console.log(`\nRenaming @voiler -> ${scope}...`)

  const allFiles: ReadonlyArray<string> = findFiles({
    dir: ROOT,
    filter: isTargetFile,
  })

  for (const filePath of allFiles) {
    replaceInFile({
      filePath,
      search: '@voiler/',
      replace: `${scope}/`,
    })

    replaceInFile({
      filePath,
      search: '"voiler"',
      replace: `"${scopeWithoutAt}"`,
    })

    replaceInFile({
      filePath,
      search: 'voiler-',
      replace: `${scopeWithoutAt}-`,
    })
  }

  // Step 5: Process module markers
  console.log('Processing module markers...')

  const allModuleNames: ReadonlyArray<string> = AVAILABLE_MODULES.map((m) => m.name)

  for (const filePath of allFiles) {
    for (const moduleName of allModuleNames) {
      const action: 'activate' | 'remove' = selectedModules.includes(moduleName)
        ? 'activate'
        : 'remove'

      processMarkers({ filePath, moduleName, action })
    }
  }

  // Remove unselected module directories and procedure files
  const unselectedModules: ReadonlyArray<string> = allModuleNames.filter(
    (m) => !selectedModules.includes(m),
  )

  for (const moduleName of unselectedModules) {
    const moduleDir: string = join(ROOT, 'modules', moduleName)

    if (existsSync(moduleDir)) {
      rmSync(moduleDir, { recursive: true, force: true })
      console.log(`  Removed modules/${moduleName}/`)
    }

    const procedureFile: string = join(ROOT, 'apps/api/src/trpc/procedures', `${moduleName}.ts`)

    if (existsSync(procedureFile)) {
      rmSync(procedureFile, { force: true })
      console.log(`  Removed procedure ${moduleName}.ts`)
    }
  }

  // If no modules selected, remove modules/* from workspace
  if (selectedModules.length === 0) {
    const workspacePath: string = join(ROOT, 'pnpm-workspace.yaml')

    if (existsSync(workspacePath)) {
      removeWorkspaceEntry({
        workspacePath,
        entry: 'modules/*',
      })
      console.log('  Removed modules/* from pnpm-workspace.yaml')
    }
  }

  // Step 6: Clean boilerplate artifacts
  console.log('Cleaning boilerplate artifacts...')

  const superpowersDir: string = join(ROOT, 'docs/superpowers')

  if (existsSync(superpowersDir)) {
    rmSync(superpowersDir, { recursive: true, force: true })
  }

  const reviewsDir: string = join(ROOT, 'docs/reviews')

  if (existsSync(reviewsDir)) {
    rmSync(reviewsDir, { recursive: true, force: true })
  }

  // Remove .sh files in scripts/
  const scriptsDir: string = join(ROOT, 'scripts')

  if (existsSync(scriptsDir)) {
    const scriptFiles: ReadonlyArray<string> = readdirSync(scriptsDir)

    for (const file of scriptFiles) {
      if (file.endsWith('.sh')) {
        rmSync(join(scriptsDir, file), { force: true })
      }
    }
  }

  // Remove this script itself
  const selfPath: string = join(ROOT, 'scripts/create-project.ts')

  if (existsSync(selfPath)) {
    rmSync(selfPath, { force: true })
  }

  // Clean package.json
  cleanPackageJson({ scope })

  // Step 7: Run pnpm install
  console.log('Running pnpm install...')
  execSync('pnpm install', { cwd: ROOT, stdio: 'inherit' })

  // Step 8: Success
  console.log(`\n✅ Project initialized as ${scope}`)
}

main()
