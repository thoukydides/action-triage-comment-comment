// GitHub action
// Copyright © 2026 Alexander Thoukydides

import { context } from '@actions/github';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import { isDeepStrictEqual } from 'util';
import { formatList } from './utils.js';
import * as core from '@actions/core';
import { GitHub } from '@actions/github/lib/utils';

// GitHub REST API types
type RestLabelResponse = RestEndpointMethodTypes['issues']['listLabelsForRepo' | 'listLabelsOnIssue']['response']['data'];

// Labels configuration
export interface labelsOptions {
    labels_set:     string;
    labels_remove:  string;
    labels_add:     string;
}

// Change the labels associated with an issue
export async function updateLabels(github: InstanceType<typeof GitHub>, issue_number: number, options: labelsOptions): Promise<void> {
    if (!options.labels_set && !options.labels_remove && !options.labels_add) return;

    // Read the repository's and issue's current labels
    const repoLabels    = getLabelNames('repository', await github.paginate(
        github.rest.issues.listLabelsForRepo, { ...context.repo, per_page: 100 }));
    const currentLabels = getLabelNames('issue', await github.paginate(
        github.rest.issues.listLabelsOnIssue, { ...context.repo, per_page: 100, issue_number }));

    // Parse the options
    const setLabels     = parseLabels(repoLabels, 'labels_set',     options.labels_set);
    const removeLabels  = parseLabels(repoLabels, 'labels_remove',  options.labels_remove);
    const addLabels     = parseLabels(repoLabels, 'labels_add',     options.labels_add);

    // Determine the new set of labels
    let newLabels = currentLabels;
    if (setLabels)      newLabels = setLabels;
    if (removeLabels)   newLabels = newLabels.filter(l => !removeLabels.includes(l));
    if (addLabels)      newLabels = [...new Set([...newLabels, ...addLabels])];
    newLabels.sort();

    // Check whether any changes are required
    if (isDeepStrictEqual(newLabels, currentLabels)) {
        core.info('No changes required to issue labels');
        return;
    }

    // Apply the new labels
    await github.rest.issues.setLabels({ ...context.repo, issue_number, labels: newLabels });
    core.info(`Applied issue labels: ${formatList(newLabels)}`);
}

function getLabelNames(description: string, labelsResponse: RestLabelResponse): string[] {
    const labels = labelsResponse.map(label => label.name).sort();
    core.info(`${description} labels: ${formatList(labels)}`);
    return labels;
}

// Parse a JSON string listing labels
function parseLabels(repoLabels: string[], description: string, labels: string): string[] | undefined {
    if (!labels) return undefined;
    try {
        const result: unknown = JSON.parse(labels);
        if (!Array.isArray(result))                                         throw new Error('Not an array');
        if (result.some(l => typeof l !== 'string'))                        throw new Error('Array contains non-strings');
        if (!result.every(label => repoLabels.includes(label as string)))   throw new Error('Unknown labels');
        return result as string[];
    } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        throw new Error(`Invalid ${description}: ${message}`, { cause });
    }
}