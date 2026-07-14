const API_KEY = process.env.GROQ_API_KEY || "";
const BASE_URL = "https://api.groq.com/openai/v1";

export const callGemini = async (prompt: string, systemInstruction?: string) => {
  if (!API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }

  const messages: { role: string; content: string }[] = [];

  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }

  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) {
      throw new Error("AI generation is temporarily unavailable — rate limit exceeded. Please try again later.");
    }
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data: any = await res.json();
  return data.choices?.[0]?.message?.content || "";
};
