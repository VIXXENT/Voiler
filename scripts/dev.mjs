import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const logPath = path.resolve(__dirname, '../logs/combined.log')

// Asegurar carpeta de logs
if (!fs.existsSync(path.dirname(logPath))) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
}

// Limpiar log inicial y establecer codificación UTF-8
fs.writeFileSync(logPath, `--- GLOBAL LOG START: ${new Date().toLocaleString()} ---\n`, 'utf8')

// Ejecutar Turbo
const turbo = spawn('npx', ['turbo', 'dev'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, FORCE_COLOR: '3' }
})

// Regex para limpiar códigos ANSI (colores) en el archivo de texto
const stripAnsi = (str) => str.replace(/\x1B\[[0-9;]*[mK]/g, '') // eslint-disable-line no-control-regex

/**
 * Manejador de stream de datos para logs unificados.
 */
const handleData = (data) => {
  const cleanData = data.toString()
  process.stdout.write(data)
  fs.appendFileSync(logPath, stripAnsi(cleanData), 'utf8')
}

if (turbo.stdout) {
  turbo.stdout.on('data', handleData)
}

if (turbo.stderr) {
  turbo.stderr.on('data', handleData)
}

turbo.on('close', (code) => {
  console.info(`\n[Turbo] Proceso finalizado con código ${code}`)
  process.exit(code || 0)
})
