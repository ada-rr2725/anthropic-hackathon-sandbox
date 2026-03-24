// safely execute llm-generated visualisation code in a given container

export function executeVizCode(code, containerId)
{
    try
    {
        // strip markdown fences if the model wrapped the code
        const cleaned = code
            .replace(/^```(?:javascript|js)?\s*/m, '')
            .replace(/\s*```\s*$/m, '')
            .trim();

        // wrap in a function that receives containerId as its argument
        // the generated code can reference containerId directly
        const fn = new Function('containerId', cleaned);
        fn(containerId);
        return { success: true };
    }
    catch (err)
    {
        console.error('[codeExecutor] execution failed:', err);
        return { success: false, error: err.message };
    }
}
