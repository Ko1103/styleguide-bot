import * as github from '@actions/github'
import * as core from '@actions/core'

// 変更されたファイルを取得する関数
export async function getChangedFiles(
  context: typeof github.context
): Promise<string[]> {
  const { pull_request } = context.payload
  if (!pull_request) {
    throw new Error('No pull request found in the context')
  }

  const octokit = github.getOctokit(core.getInput('github_token'))
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pull_request.number
  })

  return files.map((file) => file.filename)
}

// StyleGuideをチェックする関数
export async function checkStyleGuide(files: string[]): Promise<string[]> {
  // OpenAIのAPIを使用してStyleGuideをチェックするロジックを実装
  // ...
  return [] // 違反があった場合は違反内容を返す
}

// 違反があった場合にコメントを投稿する関数
export async function postComment(
  context: typeof github.context,
  violations: string[]
): Promise<void> {
  const comment = `StyleGuideに違反があります:\n${violations.join('\n')}`
  const octokit = github.getOctokit(core.getInput('github_token'))
  if (!context.payload.pull_request?.number) {
    throw new Error('No pull request found in the context')
  }
  await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.payload.pull_request.number,
    body: comment
  })
}
