service InterviewService {
  type QuestionResponse {
  question: String;
}
  action askQuestion() returns QuestionResponse;
   action nextStep(userAnswer: String) returns String;
}