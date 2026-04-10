# M3.5: Design System

## Goal

Set up shadcn/ui + Tailwind design tokens in @voiler/web. Create the base component palette for M4 frontend work.

## Tasks

- M3.5-T1: shadcn/ui init + Tailwind config (colors, fonts, radius)
- M3.5-T2: Install base components (Button, Input, Label, Card, Badge, Avatar, Separator, Skeleton, Alert, Dialog, DropdownMenu, Tabs, Textarea, Select, Toast/Sonner)
- M3.5-T3: Layout shell components (AppLayout, Sidebar, TopBar, PageHeader)
- M3.5-T4: Domain-specific atoms (ProjectCard, TaskBadge, MemberAvatar, PlanBadge, StatusBadge)

## Constraints

- All components follow Voiler conventions (no semicolons, arrow functions, etc.)
- Tailwind CSS only — no additional CSS files unless strictly necessary
- Components are typed, no `any`
- shadcn/ui components go in `apps/web/src/components/ui/`
- Custom components go in `apps/web/src/components/`
