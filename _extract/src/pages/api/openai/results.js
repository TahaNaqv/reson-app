import OpenAI from 'openai';

export default async function handler(req,res) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: req.body.system
            },
            // {
            //     role: "user",
            //     content: "A candidate's soft skills should be evaluated in the first step. These soft skills should then be measured with the company described and the advertised position in the form of a company candidate fit score. The expected output is the soft skills of the assessment and the company candidate fit score in the form of a score on the scale of 0 - 100, where 0 means no fit at all and 100 represents a complete fit. Pay particular attention to the values and situation with the company's goals; this should match the candidate's soft skills. The soft skills are based on the ability and personality analysis in conjunction with soft skills. All facts are described in the system. Show the final candidate fit score in numbers after showing the results in a new line. In this new line, show the score in numbers without any text"
            // }
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
    })

    const result = response.choices[0];

    const score = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: req.body.system
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
    })

    console.log(result, 'result')
    console.log(score.choices[0], 'score')
    const finalResult = []
    finalResult.push(result.message.content, score.choices[0].message.content)

    console.log(finalResult)
    // console.log('response: ', response.choices[0]);

    res.status(200).json({
        finalResult
    })
}