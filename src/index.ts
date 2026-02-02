// GitHub action
// Copyright © 2026 Alexander Thoukydides

import * as core from '@actions/core';
import { GitHub } from '@actions/github/lib/utils.js';
import { getIssue, IssueMetadataItem } from './get_issue.js';
import { assertIsDefined, plural } from './utils.js';
import { textTokens } from './tokens.js';

// Script entry point
export default async function run(github: InstanceType<typeof GitHub>): Promise<string> {
    // Action inputs
    const issue_number          = Number(core.getInput('issue_number',          { required: true }));
    const comment_id            = Number(core.getInput('comment_id',            { required: false }));
    const guidance_file_tokens  = Number(core.getInput('guidance_file_tokens',  { required: true }));
    const prompt_tokens         = Number(core.getInput('prompt_tokens',         { required: true }));

    // Retrieve the metadata for the issue and its comments
    const { issue, comments } = await getIssue(github, issue_number);
    if (!comments.length) throw new Error(`Issue #${issue_number} does not have any comments`);

    // Find the required user comment
    let comment: IssueMetadataItem;
    if (comment_id) {
        // Find the specified comment
        const foundComment = comments.find(c => c.id === comment_id);
        if (!foundComment) throw new Error(`Comment ${comment_id} does not exist on issue #${issue_number}`);
        comment = foundComment;
    } else {
        // Find the most suitable comment: non-bot, non-creator, non-maintainer
        // (triggered by manual workflow_dispatch, probably for testing)
        const selected =
               comments.findLast(c => c.role === 'User' && c.author !== issue.author)
            ?? comments.findLast(c => c.role !== 'Bot'  && c.author !== issue.author)
            ?? comments.findLast(c => c.role !== 'Bot')
            ?? comments.at(-1);
        assertIsDefined(selected);
        comment = selected;
    }
    core.info(`Issue #${issue_number} comment ${comment.id} by ${comment.role} @${comment.author}`);

    // Exclude comments by maintainers and bots
    const isUserComment = comment.role === 'User';

    // Check whether this is the first comment by the user
    // (only check comments with lower IDs)
    const isFirstByUser = comment.author !== issue.author
        && !comments.some(c => c.id < comment.id && c.author === comment.author);

    // Decide whether to check this comment
    const isFirstComment = isUserComment && isFirstByUser;
    if (isFirstComment) core.info('Checking first comment by user');
    else core.notice(`user comment: ${isUserComment}, first comment: ${isFirstByUser}`, { title: 'Comment ignored' });

    // Check the comment length
    const commentTokens = textTokens(comment.body);
    core.info(`Comment length: ${plural(commentTokens, 'token')}`);

    // Provide the updated token count as a discrete output and return the context
    core.setOutput('is_first_comment',  isFirstComment);
    core.setOutput('comment_user',      comment.author);
    core.setOutput('comment_node_id',   comment.node_id);
    core.setOutput('prompt_tokens',     prompt_tokens + guidance_file_tokens + commentTokens);
    return comment.body;
}