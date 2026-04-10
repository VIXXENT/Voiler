import { createFileRoute } from '@tanstack/react-router'

/** Project members page — stub for M4-T4. */
const ProjectMembersPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">Members</h1>
    <p className="mt-2 text-muted-foreground">Project members will appear here.</p>
  </div>
)

const Route = createFileRoute('/_app/projects/$projectId/members')({
  component: ProjectMembersPage,
})

export { Route }
