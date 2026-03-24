// parse and validate ImpactSpec json from raw llm output

const REQUIRED_FIELDS = [
    'policy_title',
    'policy_summary',
    'affected_regions',
    'knockon_graph',
    'demographics',
    'timeline',
    'social_impacts',
    'kpis',
];

export function parseImpactSpec(rawText)
{
    if (!rawText || typeof rawText !== 'string')
    {
        throw new Error('No response text to parse. The API may have returned an empty result.');
    }

    // strip markdown code fences if present
    let cleaned = rawText.trim();
    cleaned = cleaned
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/\s*```\s*$/m, '')
        .trim();

    // attempt direct json parse first
    let parsed = null;

    try
    {
        parsed = JSON.parse(cleaned);
    }
    catch
    {
        // fall through to extraction attempt
    }

    // if direct parse failed, try extracting the outermost json object
    if (!parsed)
    {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');

        if (start === -1 || end === -1 || end <= start)
        {
            throw new Error(
                'Could not find JSON in the response. The model may have returned plain text instead of structured data.'
            );
        }

        const jsonCandidate = cleaned.slice(start, end + 1);

        try
        {
            parsed = JSON.parse(jsonCandidate);
        }
        catch (e)
        {
            throw new Error(
                `Found JSON-like content but it is malformed: ${e.message}. ` +
                'The model output may have been truncated or contain syntax errors.'
            );
        }
    }

    // check for error response from the model
    if (parsed.error === 'cannot_analyse')
    {
        throw new Error(
            `PolicyLens cannot analyse this input: ${parsed.reason || 'no reason provided'}`
        );
    }

    // validate all required top-level fields exist
    const missingFields = REQUIRED_FIELDS.filter(field => !(field in parsed));

    if (missingFields.length > 0)
    {
        throw new Error(
            `ImpactSpec is missing required fields: ${missingFields.join(', ')}. ` +
            'The model may have produced an incomplete analysis.'
        );
    }

    // validate affected_regions is an array with entries
    if (!Array.isArray(parsed.affected_regions) || parsed.affected_regions.length === 0)
    {
        throw new Error(
            'affected_regions must be a non-empty array. The model did not identify any affected regions.'
        );
    }

    // validate knockon_graph structure
    if (!parsed.knockon_graph.nodes || !Array.isArray(parsed.knockon_graph.nodes))
    {
        throw new Error(
            'knockon_graph.nodes must be an array. The causal graph structure is invalid.'
        );
    }

    if (!parsed.knockon_graph.edges || !Array.isArray(parsed.knockon_graph.edges))
    {
        throw new Error(
            'knockon_graph.edges must be an array. The causal graph structure is invalid.'
        );
    }

    // validate social_impacts is an array with entries
    if (!Array.isArray(parsed.social_impacts) || parsed.social_impacts.length === 0)
    {
        throw new Error(
            'social_impacts must be a non-empty array. The model did not identify any social impacts.'
        );
    }

    // validate demographics is an array with entries
    if (!Array.isArray(parsed.demographics) || parsed.demographics.length === 0)
    {
        throw new Error(
            'demographics must be a non-empty array. The model did not identify any demographic impacts.'
        );
    }

    // validate timeline is an array with entries
    if (!Array.isArray(parsed.timeline) || parsed.timeline.length === 0)
    {
        throw new Error(
            'timeline must be a non-empty array. The model did not produce a timeline.'
        );
    }

    // validate kpis has expected fields
    if (typeof parsed.kpis !== 'object' || parsed.kpis === null)
    {
        throw new Error(
            'kpis must be an object containing aggregate impact metrics.'
        );
    }

    return parsed;
}
