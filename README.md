# `action-triage-comment-comment`

This action uses Google Gemini to analyse the first comment by a user on a particular issue, assessing its relevance to the issue, and then posts a comment if off-topic. At a high level, the action performs the following steps:
- **First Comment Check:** Aborts processing if the comment was posted by the user who has commented previously on the same issue, who created the issue, or who is either a project maintainer or a bot.
- **Review Issue Quality:** Uses Google AI Studio to check whether the comment is raising an issue that is not sufficiently related to the main issue. If it is off-topic then the model drafts a comment advising the user how to proceed.
- **Post Comment:** If the review produced a comment then post it and optionally minimise the user's comment.

> [!CAUTION]
> This action is provided for my own use and published in case it is useful to others. If you rely on it, fork and maintain your own copy. No support or stability guarantees are offered.

## Prerequisites

Before using this workflow, ensure:
- The workflow has `issues: write` and `contents: read` permissions (either via the default `GITHUB_TOKEN` or a fine-grained token).
- You have created a [Gemini API key](https://ai.google.dev/gemini-api/docs/api-key) and placed it in a repository secret (e.g. `GEMINI_API_KEY`).
- You understand the [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) for your chosen model and usage tier.

> [!TIP]
> Google AI Studio Gemini rate limits are per-project. Create multiple projects, each with its own API key, to increase quotas.

## Inputs

Various inputs are defined in the action to configure its operation:

| Name | Description | Default
| --- | --- | ---
| `gemini_api_key`: The Google AI Studio Gemini API key | *required*
| `issue_number` | The GitHub issue to analyse | *required*
| `comment_id` | The GitHub comment to analyse; omit to process the most recent comment on the issue | &nbsp;
| `guidance_file` | Path to a file containing project-specific guidance for the AI when assessing the comment quality | *required*
| `guidance_file_tokens` | Size of the guidance_file contents in tokens (used to calculate the input tokens required for the prompt) | *required*
| `dry_run` | Disables actions that modify the issue (adding the comment and minimising previous comments) for testing | `false`

> [!CAUTION]
> The input token count is estimated using the `o200k_base` encoding. This is intended for OpenAI models (in the `o1`, `o3`, `o4-mini`, `gpt-5`, `gpt-4.1`, and `gpt-4o` families). It provides a general guide for Gemini usage but is not precise.

## Usage

Example workflow to consider whether any automated test errors or API changelog are relevant to a newly opened issue:

```yaml
name: Triage Issue Comment
permissions:
  issues: write
  contents: read

on:
  issue_comment:
    types: [created]
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Issue number'
        required: true
        type: number
      comment_id:
        description: 'Comment identifier'
        required: false
        type: number
      dry_run:
        description: 'Dry run (do not modify issue)'
        type: boolean
        default: true

jobs:
  triage-comment:
    runs-on: ubuntu-latest
    if: ${{ !github.event.issue.pull_request }}
    needs: [run-test, api-changelog]
    steps:
      - uses: actions/checkout@v4
      - name: AI issue comment triage
        uses: thoukydides/action-triage-comment-comment@v1
        with:
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
          issue_number: ${{ github.event.issue.number || fromJson(inputs.issue_number) }}
          comment_id: ${{ github.event.comment.id || fromJson(inputs.comment_id) }}
          guidance_file: ./.github/prompts/issue-quality-guidance.md
          guidance_file_tokens: 650
          dry_run: ${{ inputs.dry_run }}
```

> [!TIP]
> The `issue_comment` trigger is used for both issues and pull requests; use `if: ${{ !github.event.issue.pull_request }}` to run the job for comments on issues only.

## ISC License (ISC)

<details>
<summary>Copyright © 2026 Alexander Thoukydides</summary>

> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
</details>