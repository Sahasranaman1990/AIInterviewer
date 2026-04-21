sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("ai.interviewerai.controller.Home", {

   onInit: function () {
      this.getView().setModel(new JSONModel({
        messages: [],
        totalScore: 0,
        count: 0
      }), "chat");

      this._initSpeech();

  // 🔊 Proper voice loading (production way)
  this._loadVoices();
    },

    _loadVoices: function () {

  this.availableVoices = [];

  const load = () => {
    this.availableVoices = speechSynthesis.getVoices();
  };

  load();

  // 🔥 important: handle async load
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = load;
  }
},

    // 🎤 Speech Recognition
    _initSpeech: function () {

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = "en-US";
        this.recognition.interimResults = false;
        this.recognition.continuous = false;
        this.recognition.maxAlternatives = 1;

          // 🔥 Increase tolerance
          this.recognition.onend = () => {
            console.log("Mic ended");
          };

this.recognition.onresult = (event) => {

  const transcript = event.results[0][0].transcript;

  console.log("You:", transcript);

  // 🧠 prevents cutting user mid-sentence
  setTimeout(() => {
    this._handleAnswer(transcript);
  }, 300);
};

        this.recognition.onerror = () => {
          MessageToast.show("Mic error");
        };

      } else {
        MessageToast.show("Speech not supported");
      }
    },

    // 🔊 AI Speech (only question)
speakText: async function (text) {

  let cleanText = text
    .replace("Question:", "")
    .replace("Next:", "")
    .trim();

  try {

    const oModel = this.getView().getModel();

    const oAction = oModel.bindContext("/speak(...)");

    oAction.setParameter("text", cleanText);

    await oAction.execute();

    const audioData = oAction.getBoundContext().getObject();

    // 🎧 Convert binary → playable audio
    const blob = new Blob([audioData.value], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);

    audio.play();

    audio.onended = () => {
      if (this.recognition) {
        setTimeout(() => this.recognition.start(), 200);
      }
    };

  } catch (e) {
    console.error(e);
  }
},
    // ▶ Start Interview
    onStartInterview: async function () {

      const oModel = this.getView().getModel();
      const chatModel = this.getView().getModel("chat");

      try {

        chatModel.setProperty("/messages", []);
        chatModel.setProperty("/totalScore", 0);
        chatModel.setProperty("/count", 0);

        const oAction = oModel.bindContext("/nextStep(...)");

        oAction.setParameter("userAnswer", "Start interview");

        await oAction.execute();

        const oData = oAction.getBoundContext().getObject();
        const aiReply = oData.value;

        let messages = chatModel.getProperty("/messages");

        messages.push({
          role: "ai",
          text: aiReply,
          score: 0
        });

        chatModel.setProperty("/messages", messages);

        this.speakText(aiReply);

      } catch (e) {
        console.error(e);
        MessageToast.show("Error starting interview");
      }
    },

    // 🧠 Handle Answer
_handleAnswer: async function (userInput) {

  const oModel = this.getView().getModel();
  const chatModel = this.getView().getModel("chat");

  try {

    let messages = chatModel.getProperty("/messages");

    // 👤 User message
    messages.push({
      role: "user",
      text: userInput
    });

    chatModel.setProperty("/messages", messages);

    const oAction = oModel.bindContext("/nextStep(...)");
    oAction.setParameter("userAnswer", userInput);

    await oAction.execute();

    const oData = oAction.getBoundContext().getObject();
    const aiReply = oData.value;

    // 🎯 Extract score
    let scoreMatch = aiReply.match(/Score:\s*(\d+)/i);
    let score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

    // 🎯 Split AI response
    let feedback = "";
    let nextQuestion = "";

    if (aiReply.includes("Next:")) {
      const parts = aiReply.split("Next:");
      feedback = parts[0];
      nextQuestion = parts[1];
    } else {
      nextQuestion = aiReply;
    }

    // 📊 Update score
    let total = chatModel.getProperty("/totalScore") + score;
    let count = chatModel.getProperty("/count") + 1;

    chatModel.setProperty("/totalScore", total);
    chatModel.setProperty("/count", count);

    // 🧠 Show feedback (NO voice)
    if (feedback) {
      messages.push({
        role: "ai",
        text: feedback.trim(),
        score: score
      });
    }

    chatModel.setProperty("/messages", messages);

    // ⏳ Delay before asking next question
    setTimeout(() => {

      messages.push({
        role: "ai",
        text: "Question: " + nextQuestion.trim(),
        score: 0
      });

      chatModel.setProperty("/messages", messages);

      // 🔊 Speak only question
      this.speakText(nextQuestion);

    }, 400);

  } catch (e) {
    console.error(e);
    MessageToast.show("Error during interview");
  }
}

  });
});