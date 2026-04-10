import { createFileRoute } from '@tanstack/react-router'

/** Projects list page — stub for M4-T2. */
const ProjectsPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">Projects</h1>
    <p className="mt-2 text-muted-foreground">Your projects will appear here.</p>
  </div>
)

const Route = createFileRoute('/_app/projects/')({
  component: ProjectsPage,
})

export { Route }
