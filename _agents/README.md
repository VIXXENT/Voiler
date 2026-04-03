# Agent Roles

This directory defines specialized AI agent roles for the Voiler project. Use these as system prompts or context for Claude Code, Gemini CLI, or other AI-driven development tools.

## Overview

- **Orchestrator** — Coordinates overall project strategy, delegates work, manages dependencies
- **Architect** — Designs systems, reviews architecture, ensures design patterns
- **Developer** — Writes production code following project standards
- **Reviewer** — Reviews code for security, correctness, style using double-agent pattern
- **QA Designer** — Plans test strategies, knows Vitest + Playwright
- **Tester** — Writes and runs tests, follows TDD

## How to Use

1. **For single-agent work:** Copy the relevant role file into your session context or system prompt
2. **For multi-agent teams:** Distribute roles across agents; coordinate via Orchestrator
3. **During Claude Code sessions:** Reference role files to constrain agent behavior

Each role includes purpose, responsibilities, key knowledge, tools, and guidelines.
