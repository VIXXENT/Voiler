import { ok, err, type Result } from 'neverthrow'
import type { DomainError } from '../errors/domain-error'
import { invalidProjectName } from '../errors/project-errors'

/** Parameters for validateProjectName. */
type ValidateProjectNameParams = {
  readonly name: string
}

/**
 * Validate a project name.
 *
 * Trims the input, rejects empty strings, and enforces a 100-character maximum.
 */
export const validateProjectName: (
  params: ValidateProjectNameParams,
) => Result<string, DomainError> = ({ name }) => {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return err(invalidProjectName('Project name must not be empty'))
  }
  if (trimmed.length > 100) {
    return err(invalidProjectName('Project name must not exceed 100 characters'))
  }
  return ok(trimmed)
}
