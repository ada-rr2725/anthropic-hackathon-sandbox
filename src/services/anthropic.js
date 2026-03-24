// anthropic streaming api wrapper
// uses direct browser access — api key must be set in VITE_ANTHROPIC_API_KEY

const API_URL = 'https://api.anthropic.com/v1/messages';

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
