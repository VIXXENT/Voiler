import { createFileRoute } from '@tanstack/react-router'

/** Project settings page — stub for M4-T5. */
const ProjectSettingsPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">Project Settings</h1>
    <p className="mt-2 text-muted-foreground">Project settings will appear here.</p>
  </div>
)

const Route = createFileRoute('/_app/projects/$projectId/settings')({
  component: ProjectSettingsPage,
})

export { Route }
