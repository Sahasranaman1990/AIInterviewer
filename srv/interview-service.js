const axios = require("axios");

// 🔁 Maintain conversation per session (simple version)
let conversation = [
  {
    role: "system",
    content: `
You are a friendly, human SAP CAP interviewer.

Rules:
- Ask ONE question at a time
- NEVER repeat the same question
- Be conversational (like a real human, not robotic)
- If answer is weak → guide and ask follow-up
- If answer is good → go deeper

For EACH response:
1. Score: X/10
2. One-line feedback
3. Then ask NEXT question

VERY IMPORTANT:
- If user says "stop interview" → give final summary + average score and end
- Do NOT restart interview unless user says "start again"
- Keep flow natural and continuous
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

};