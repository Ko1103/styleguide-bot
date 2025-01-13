import * as core from '@actions/core'
import * as github from '@actions/github'
import { getChangedFiles, checkStyleGuide, postComment } from './utils.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const context = github.context
    const changedFiles = await getChangedFiles(context)

    const violations = await checkStyleGuide(changedFiles)

    if (violations.length > 0) {
      await postComment(context, violations)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
