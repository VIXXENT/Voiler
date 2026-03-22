# GemTest Roadmap

## 🚀 Fase 1: Estructura & Core (Completada ✅)
- [x] Inicialización del Monorepo con Turborepo & pnpm.
- [x] Configuración de Workspace y Pipeline inicial.
- [x] Creación de `packages/config-ts`.
- [x] Creación de `packages/ui` (Base).
- [x] Implementación de `context_tree` (migrado a CLAUDE.md jerárquico).

## 🛠️ Fase 2: Backend & Base de Datos (En curso 🏗️)
- [x] Setup de `apps/api` (Node + TS + Apollo Server + GraphQL).
- [x] Esquema de base de datos con Drizzle ORM + SQLite (LibSQL).
- [x] Auto-migración básica vía script custom en `src/db/index.ts`.
- [x] Implementación de `neverthrow` en capa de DB y Resolvers.
- [x] Refactorizar anidamientos `.andThen()` hacia flujos lineales con `await`.
- [x] Corregir inferencia de esquemas Zod (eliminar tipos manuales).
- [ ] **PENDIENTE**: Finalizar lógica de Magic Links (Mock Mailer).

## 🧠 Context Engine (En curso 🏗️)
- [x] Fase 1: Chunking recursivo inteligente.
- [x] Fase 2: Sincronización Incremental (Cache-based).
- [x] Fase 3: Consultas Avanzadas & Hybrid Search (Metadata Filtering).

## 🌐 Fase 3: Web & Autenticación (En curso 🏗️)
- [x] Setup de `apps/web` (React + Vite + Tailwind CSS).
- [x] Integración de Apollo Client.
- [x] Configuración de Auth.js Core en la API.
- [x] Registro vía GraphQL mutation `register`.
- [x] Integración de `SessionProvider` y Login Real en la Web.
- [ ] **PENDIENTE**: Componentes de Dashboard reales.
- [ ] **PENDIENTE**: Configuración real de OAuth (Google/GitHub).

## 🛡️ Fase Extra: Calidad & DX (En curso 🏗️)
- [x] Hito: Tipado Estricto (Prohibición de `any`, retornos obligatorios).
- [x] Hito: Proyecto 100% libre de errores de Linting (ESLint 10 + Standard-ish).
- [x] Hito: Protocolo de tipos independientes y cohesión local.
- [x] Hito: Constitución del proyecto (CLAUDE.md jerárquico) con mandatos arquitectónicos.
- [ ] **ALTA PRIORIDAD**: Implementación de suite de pruebas E2E con Playwright.
- [ ] **PRÓXIMAMENTE**: Flujo CI/CD básico (GitHub Actions).

## 🔗 Fase 4: Integración & DX (En curso 🏗️)
- [x] Integración completa API-Web.
- [x] Optimización de compilación con Turbo.
- [x] Setup de comando `dev` concurrente y reactivo (Watch Mode).
- [x] Establecer reglas de formato para el modelo (Singular PascalCase).

## 🐛 Errores Conocidos & Bloqueos (Solucionados)
- [x] **BUG**: `TypeError: col.shouldDisableInsert` (Resuelto sincronizando Drizzle).
- [x] **TYPE ERROR**: `TS2742` en Web Auth (Resuelto vía Type Extraction).
- [x] **TYPE ERROR**: Express 4 vs 5 en API Index (Resuelto vía Type Bridge).
