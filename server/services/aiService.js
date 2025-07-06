import { Groq } from "groq-sdk";
import retry from "async-retry";

let groq;

function getGroqClient() {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is missing");
    }
    groq = new Groq({ apiKey });
  }
  return groq;
}

class AIService {
  async getCompletion(prompt) {
    return retry(async (bail) => {
      try {
        const completion = await getGroqClient().chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama3-70b-8192",
          temperature: 0.7,
          max_tokens: 1024,
        });

        return {
          content: completion.choices[0]?.message?.content || "",
          tokens: completion.usage?.total_tokens,
        };
      } catch (error) {
        if (error.status === 429) bail(error);
        throw error;
      }
    }, { retries: 3 });
  }

  async getCompletionStream(prompt) {
    return getGroqClient().chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
      stream: true,
      temperature: 0.7,
    });
  }
}

export default new AIService();
