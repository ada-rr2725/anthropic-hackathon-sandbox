// parse policy analysis json from raw llm output

export function parsePolicyAnalysis(text)
{
    // strip markdown code fences if present
    const cleaned = text
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/\s*```\s*$/m, '')
        .trim();

    // first try direct parse
    try
    {
        return JSON.parse(cleaned);
    }
    catch { /* fall through */ }

    // try to extract the outermost json object
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start !== -1 && end !== -1 && end > start)
    {
        try
        {
            return JSON.parse(cleaned.slice(start, end + 1));
        }
        catch { /* fall through */ }
    }

    console.error('[modelParser] raw response was:', text);
    throw new Error('Could not parse policy analysis — the model returned malformed JSON. Check console for raw output.');
}
