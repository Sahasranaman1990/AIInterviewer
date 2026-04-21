
const axios = require("axios");

let conversation = [
  {
    role: "system",
   content: `
You are a friendly, human SAP CAP interviewer.

STRICT FORMAT:

If first message:
Question: <ask first question only>

Otherwise:
Feedback: <1 short conversational line>
Score: X/10
Next: <next question>

Rules:
- NEVER repeat a question
- Do NOT restart interview
- Ask follow-ups based on answer
- Keep it natural and human
- Keep answers short
`
  }
];

module.exports = (srv) => {

  srv.on("nextStep", async (req) => {

    const userAnswer = req.data.userAnswer || "Start interview";

    conversation.push({
      role: "user",
      content: userAnswer
    });

    const response = await axios.post(
      "https://adesso-ai-hub.3asabc.de/v1/chat/completions",
      {
        model: "qwen-3.5-122b-sovereign",
        messages: conversation,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`, // 🔴 replace
          "Content-Type": "application/json"
        }
      }
    );

    const aiReply = response.data.choices[0].message.content;

    conversation.push({
      role: "assistant",
      content: aiReply
    });

    return aiReply;
  });

  srv.on("speak", async (req) => {

  const text = req.data.text;

  const response = await axios.post(
    "https://api.elevenlabs.io/v1/text-to-speech/qSV5UqvHBC0Widy71Esh",
    {
      text: text,
      model_id: "eleven_multilingual_v2", // 🔥 supports Indian tone better
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.8
      }
    },
    {
      responseType: "arraybuffer",
      headers: {
         Authorization: `Bearer ${process.env.ELEVEN_API_KEY}`, // 🔴 replace
          "Content-Type": "application/json"
      }
    }
  );

  return response.data;
});

};