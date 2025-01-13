import * as github from '@actions/github'
import * as core from '@actions/core'
import { ClientOptions, OpenAI } from 'openai'

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
  const openaiApiKey = core.getInput('openai-api-key')
  const styleguideUrl = core.getInput('styleguide')
  const configuration: ClientOptions = {
    apiKey: openaiApiKey
  }
  const openai = new OpenAI(configuration)

  const violations: string[] = []

  try {
    for (const file of files) {
      // ファイルの内容を取得
      const content = await github
        .getOctokit(core.getInput('github_token'))
        .rest.repos.getContent({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          path: file,
          ref: github.context.sha
        })

      // Base64でエンコードされたコンテンツをデコード
      const fileContent = Buffer.from(
        content.data.toString(),
        'base64'
      ).toString()

      const prompt = `
以下のコードが${styleguideUrl}のスタイルガイドに違反していないか確認してください。
違反がある場合は、具体的な行番号と違反内容を説明してください。
違反がない場合は空の配列を返してください。

ファイル: ${file}

コード:
${fileContent}
`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'あなたはスタイルガイドの専門家です。コードがスタイルガイドに違反していないか厳密にチェックしてください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const response = completion.choices[0]?.message?.content
      if (response && response.trim() !== '') {
        violations.push(`${file}:\n${response}`)
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.warning(
        `StyleGuideのチェック中にエラーが発生しました: ${error.message}`
      )
    }
    throw error
  }

  return violations
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
