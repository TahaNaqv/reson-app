import OpenAI from 'openai';

export default async function handler(req, res) {
    // Environment guard
    if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is not configured');
        return res.status(500).json({
            status: 'false',
            message: 'OpenAI is not configured. Missing OPENAI_API_KEY.'
        });
    }

    if (!req.body?.system || typeof req.body.system !== 'string') {
        return res.status(400).json({
            status: 'false',
            message: 'Missing or invalid system prompt'
        });
    }

    const systemPrompt = req.body.system;
    const promptLength = systemPrompt.length;
    const MAX_PROMPT_CHARS = 12000; // simple guard to avoid oversized requests
    if (promptLength > MAX_PROMPT_CHARS) {
        console.error(`System prompt too large (${promptLength} chars). Max allowed: ${MAX_PROMPT_CHARS}`);
        return res.status(400).json({
            status: 'false',
            message: `System prompt too large (${promptLength} chars). Reduce input size.`
        });
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-2024-11-20",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: "A candidate's soft skills should be evaluated in the first step. These soft skills should then be measured with the company described and the advertised position in the form of a company candidate fit score. The expected output is the soft skills of the assessment and the company candidate fit score in the form of a score on the scale of 0 - 100, where 0 means no fit at all and 100 represents a complete fit. Pay particular attention to the values and situation with the company's goals; this should match the candidate's soft skills. The soft skills are based on the ability and personality analysis in conjunction with soft skills. All facts are described in the system."
                }
            ],
            temperature: 1,
            max_tokens: 810,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        const result = response.choices[0];

        const score = await openai.chat.completions.create({
            model: "gpt-4o-2024-11-20",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "assistant",
                    content: result.message.content
                },
                {
                    role: "user",
                    content: "what is the candidate fit score for this applicant? Show only the number in a new line"
                }
            ],
            temperature: 1,
            max_tokens: 810,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        console.log(result, 'result');
        console.log(score.choices[0], 'score');
        const finalResult = [];
        finalResult.push(result.message.content, score.choices[0].message.content);

        console.log(`OpenAI finalResult length: ${finalResult[0]?.length || 0} / score: ${finalResult[1]}`);

        return res.status(200).json({
            status: 'true',
            finalResult
        });
    } catch (err) {
        console.error('OpenAI error in /api/openai/results:', {
            message: err.message,
            status: err.status,
            stack: err.stack
        });
        return res.status(500).json({
            status: 'false',
            message: 'Failed to generate OpenAI results',
            error: err.message || 'Unknown error'
        });
    }
}