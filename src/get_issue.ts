// GitHub action
// Copyright © 2026 Alexander Thoukydides

import { context } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import { components } from '@octokit/openapi-types';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import * as core from '@actions/core';
import { plural } from './utils.js';

// GitHub REST API types
type AuthorAssociation  = components['schemas']['author-association'];
type RestIssue          = RestEndpointMethodTypes['issues']['get']['response']['data'];
type RestComment        = RestEndpointMethodTypes['issues']['listComments']['response']['data'][0];

// A simplified representation of an author association
export type Role = 'Maintainer' | 'User' | 'Bot' | 'Unknown';

// Key issue or comment metadata
export interface IssueMetadataItem {
    id:         number;
    node_id:    string;
    author:     string;
    role:       Role;
    body:       string;
}
export interface IssueMetadata {
    issue:      IssueMetadataItem
    comments:   IssueMetadataItem[];
}

// Retrieve metadata for an issue and its comments
export async function getIssue(github: InstanceType<typeof GitHub>, issue_number: number): Promise<IssueMetadata> {
    // Retrieve the issue and its comments
    const issue     = (await github.rest.issues.get({ ...context.repo, issue_number })).data;
    const comments  = await github.paginate(github.rest.issues.listComments, { ...context.repo, issue_number });
    core.info(`Retrieved issue #${issue_number}: "${issue.title}" (with ${plural(comments.length, 'comment')})`);
    core.debug(`REST API Issue:\n${JSON.stringify(issue, null, 4)}`);
    core.debug(`REST API Comments:\n${JSON.stringify(comments, null, 4)}`);

    // Extract relevant metadata from the issue and its comments
    return {
        issue:      simplifyIssueComment(issue),
        comments:   comments.map(simplifyIssueComment)
    };
}

// Simplify an issue body or comment
function simplifyIssueComment(comment: RestIssue | RestComment): IssueMetadataItem {
    return {
        id:         comment.id,
        node_id:    comment.node_id,
        author:     comment.user?.login ?? '',
        role:       authorAssociationToRole(comment),
        body:       comment.body ?? ''
    };
}

// Identify an author's role
function authorAssociationToRole(comment: RestIssue | RestComment): Role {
    const TYPE_TO_ROLE: Record<string, Role | undefined> = {
        Bot:                    'Bot',
        Organization:           'Unknown',
        User:                   undefined
    };
    const ASSOCIATION_TO_ROLE: Record<string, Role> = {
        OWNER:                  'Maintainer',
        MEMBER:                 'Maintainer',
        COLLABORATOR:           'Maintainer',
        CONTRIBUTOR:            'User',
        FIRST_TIMER:            'User',
        FIRST_TIME_CONTRIBUTOR: 'User',
        MANNEQUIN:              'User',
        NONE:                   'User'
    } satisfies Record<AuthorAssociation, Role>;
    if (comment.user?.login.endsWith('[bot]')) return 'Bot';
    return TYPE_TO_ROLE[comment.user?.type ?? '']
        ?? ASSOCIATION_TO_ROLE[comment.author_association ?? '']
        ?? 'Unknown';
}