// GitHub action
// Copyright © 2026 Alexander Thoukydides

import { Tiktoken } from 'js-tiktoken/lite';
import ranks from 'js-tiktoken/ranks/o200k_base';

// Initialise the encoder once
const encoder = new Tiktoken(ranks);

// Token count for a string
export function textTokens(text: string): number {
    return encoder.encode(text).length;
}