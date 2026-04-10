import { createFileRoute } from '@tanstack/react-router'

/** Project detail page — stub for M4-T3. */
const ProjectDetailPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">Project</h1>
    <p className="mt-2 text-muted-foreground">Project tasks will appear here.</p>
  </div>
)

const Route = createFileRoute('/_app/projects/$projectId/')({
  component: ProjectDetailPage,
})

export { Route }
