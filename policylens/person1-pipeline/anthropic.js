// anthropic streaming api wrapper for policylens
// uses direct browser access — api key must be set in VITE_ANTHROPIC_API_KEY

import { POLICY_UNDERSTANDING_PROMPT } from '../prompts/policyUnderstanding.js';

const API_URL = 'https://api.anthropic.com/v1/messages';

// backward-compatible generic streaming function from the original sandbox
export async function streamMessage({ system, userMessage, onChunk })
{
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === 'your-key-here')
    {
        throw new Error('No API key found. Copy .env.example to .env.local and add your VITE_ANTHROPIC_API_KEY.');
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            stream: true,
            system,
            messages: [{ role: 'user', content: userMessage }],
        }),
    });

    if (!response.ok)
    {
        let message = `API error ${response.status}`;
        try { const body = await response.json(); message = body.error?.message || message; } catch {}
        throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true)
    {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines)
        {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try
            {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text)
                {
                    fullText += parsed.delta.text;
                    onChunk?.(parsed.delta.text, fullText);
                }
            }
            catch { /* malformed chunk — skip */ }
        }
    }

    return fullText;
}

// policy analysis streaming function
// sends the user's policy description through the understanding engine and
// returns the full accumulated response text
export async function analysePolicy(policyText, onStatus)
{
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === 'your-key-here')
    {
        throw new Error('No API key found. Copy .env.example to .env.local and add your VITE_ANTHROPIC_API_KEY.');
    }

    onStatus?.('Connecting to Claude...');

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            stream: true,
            system: POLICY_UNDERSTANDING_PROMPT,
            messages: [{ role: 'user', content: policyText }],
        }),
    });

    if (!response.ok)
    {
        let message = `API error ${response.status}`;
        try
        {
            const body = await response.json();
            message = body.error?.message || message;
        }
        catch {}

        if (response.status === 401)
        {
            throw new Error('Invalid API key. Check your VITE_ANTHROPIC_API_KEY in .env.local.');
        }
        if (response.status === 429)
        {
            throw new Error('Rate limited by the API. Please wait a moment and try again.');
        }
        if (response.status >= 500)
        {
            throw new Error(`Anthropic API is experiencing issues (${response.status}). Try again shortly.`);
        }

        throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let chunkCount = 0;
    let hasSignalledAnalysing = false;
    let hasSignalledFinishing = false;

    // estimate: most policy analyses produce roughly 150-250 sse chunks
    const estimatedTotalChunks = 200;

    while (true)
    {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines)
        {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try
            {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text)
                {
                    fullText += parsed.delta.text;
                    chunkCount++;

                    // status updates based on progress
                    if (!hasSignalledAnalysing)
                    {
                        onStatus?.('Analysing policy impacts...');
                        hasSignalledAnalysing = true;
                    }

                    if (!hasSignalledFinishing && chunkCount > estimatedTotalChunks * 0.8)
                    {
                        onStatus?.('Finishing analysis...');
                        hasSignalledFinishing = true;
                    }
                }
            }
            catch { /* malformed chunk — skip */ }
        }
    }

    if (!fullText.trim())
    {
        throw new Error('Received empty response from Claude. The policy description may be too short or unclear.');
    }

    return fullText;
}
