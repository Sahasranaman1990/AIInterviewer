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
    },

    onStartInterview: async function () {

  const oModel = this.getView().getModel();
  const chatModel = this.getView().getModel("chat");

  try {

    // Reset chat
    chatModel.setProperty("/messages", []);
    chatModel.setProperty("/totalScore", 0);
    chatModel.setProperty("/count", 0);

    const oAction = oModel.bindContext("/nextStep(...)");

    oAction.setParameter("userAnswer", "Start interview");

    await oAction.execute();

    const oData = oAction.getBoundContext().getObject();
    const aiReply = oData.value;

    // Add AI first message
    let messages = chatModel.getProperty("/messages");

    messages.push({
      role: "ai",
      text: aiReply,
      score: 0
    });

    chatModel.setProperty("/messages", messages);

    // Speak first question
    this.speakText(aiReply);

  } catch (e) {
    console.error(e);
    sap.m.MessageToast.show("Error starting interview");
  }
},

    // 🎤 Speech setup
    _initSpeech: function () {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = "en-US";
        this.recognition.interimResults = false;

        this.recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          this._handleAnswer(transcript);
        };

        this.recognition.onerror = () => {
          MessageToast.show("Mic error");
        };

      } else {
        MessageToast.show("Speech not supported");
      }
    },

    // 🎤 Start mic
    onSpeak: function () {
      if (this.recognition) {
        this.recognition.start();
      }
    },

    // 🔊 AI speaks ONLY question part
    speakText: function (text) {
      const cleanText = text.split("Score:")[0]; // avoid reading feedback
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = "en-US";
      speechSynthesis.cancel(); // prevent overlap
      speechSynthesis.speak(utter);
    },

    // 🧠 Core flow
    _handleAnswer: async function (userInput) {

      const oModel = this.getView().getModel();
      const chatModel = this.getView().getModel("chat");

      try {

        let messages = chatModel.getProperty("/messages");

        // Add user message
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

        // 🧠 Extract score safely
        let scoreMatch = aiReply.match(/Score:\s*(\d+)/i);
        let score = scoreMatch ? parseInt(scoreMatch[1]) : 5;

        let total = chatModel.getProperty("/totalScore") + score;
        let count = chatModel.getProperty("/count") + 1;

        chatModel.setProperty("/totalScore", total);
        chatModel.setProperty("/count", count);

        // Add AI message
        messages.push({
          role: "ai",
          text: aiReply,
          score: score
        });

        chatModel.setProperty("/messages", messages);

        // 🔊 Speak only question part
        this.speakText(aiReply);

      } catch (e) {
        console.error(e);
        MessageToast.show("Error during interview");
      }
    }

  });
});