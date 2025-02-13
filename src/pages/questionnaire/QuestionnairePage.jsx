import React, { useState, useEffect } from "react";
import "./QuestionnairePage.css";
import { useParams } from "react-router-dom";
import { Snackbar, Alert, Slide, Chip, CircularProgress } from "@mui/material";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { fetchCandidateQuestionnaire } from "../../utils/firebaseService";
import { getStatus } from "../../utils/helper";
import { apiBaseUrl } from "../../utils/constants";

const QuestionnairePage = (props) => {
  const isCandidate = props.isCandidate;

  const [questionnaireData, setQuestionnaireData] = useState(null);
  const [name, setName] = useState("Applicant");
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);

  const { token } = useParams();

  const updateMessage = (value, type, isOpen) => {
    setMessage(value);
    setMessageType(type);
    if (isOpen && !open) {
      setOpen(true); // Only set open to true if it's not already open
    }
  };

  const handleClose = (event, reason) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  // Fetch questionnaire data
  const loadQuestionnaire = async () => {
    try {
      const { data, name } = await fetchCandidateQuestionnaire(token);
      setQuestionnaireData(data);
      setName(name);
    } catch (error) {
      console.error("Error fetching questionnaire data:", error);
    }
  };

  // Check if all questions are answered
  const isAllQuestionsAnswered = () => {
    if (!questionnaireData?.questions) return false;
    return questionnaireData.questions.every(
      (data) => answers[data.question] !== undefined
    );
  };

  // Handle answer selection
  const handleAnswerChange = (questionId, answer) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: answer, // Update the answer for the specific question
    }));
  };

  // Evaluate non-multiple-choice answers
  const evaluateNonMultipleChoiceAnswers = async () => {
    const scores = [];

    for (const question of questionnaireData.questions) {
      if (!question.options) {
        // Non-multiple-choice question
        const userAnswer = answers[question.question];
        const expectedAnswer = question.answer;

        try {
          const response = await fetch(`${apiBaseUrl}/evaluate-answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userAnswer, expectedAnswer }),
          });
          const result = await response.json();
          scores.push(result.score); // Store the score for this question
        } catch (error) {
          console.error("Error evaluating answer:", error);
          scores.push(0); // Default to 0 if evaluation fails
        }
      } else {
        // Multiple-choice question
        const userAnswer = answers[question.question];
        const isCorrect = userAnswer === question.answer;
        scores.push(isCorrect ? 100 : 0); // Full score if correct, otherwise 0
      }
    }

    return scores;
  };

  // Calculate the overall score
  const calculateOverallScore = (scores) => {
    const total = scores.reduce((sum, score) => sum + score, 0);
    const average = total / scores.length;
    return Math.round(average); // Round to the nearest integer
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isAllQuestionsAnswered()) {
      try {
        // Evaluate non-multiple-choice answers
        const scores = await evaluateNonMultipleChoiceAnswers();
  
        // Calculate the overall score
        const overallScore = calculateOverallScore(scores);
        setTotalScore(overallScore);
        setIsAnswered(true);
  
        // Add candidateAnswer and score fields to each question
        const updatedQuestions = questionnaireData.questions.map((question, index) => ({
          ...question, // Keep all existing fields
          candidateAnswer: answers[question.question], // Add the candidate's answer
          score: scores[index], // Add the score for this question
        }));
  
        // Update the candidate's document in Firestore
        const candidateDoc = doc(db, "candidates", token);
        await updateDoc(candidateDoc, {
          "questionnaireData.totalScore": overallScore, // Update totalScore
          "questionnaireData.isAnswered": true, // Update isAnswered
          "questionnaireData.questions": updatedQuestions, // Update questions with candidateAnswer and score
        });

        questionnaireData.totalScore = overallScore;
        questionnaireData.isAnswered = true;
        questionnaireData.questions = updatedQuestions;
  
        // Show success message
        updateMessage(
          `Thank you for completing the questionnaire! Your score is ${overallScore}.`,
          "success",
          true
        );
  
        console.log("User Answers:", answers);
        console.log("Scores:", scores);
        console.log("Overall Score:", overallScore);
        console.log("Updated Questions:", updatedQuestions); // Log the updated questions array
      } catch (error) {
        console.error("Error evaluating answers or updating Firestore:", error);
        updateMessage("Failed to evaluate your answers or save the results. Please try again.", "error", true);
      }
    } else {
      updateMessage("Please answer all questions before submitting!", "warning", true);
    }
    setTimeout(() => setLoading(false), 500);
  };

  // Fetch questionnaire data on component mount
  useEffect(() => {
    loadQuestionnaire();
  }, [token]);

  return (
    <div className="questionnaire-page-container">
      <div className="card-container">
        <div className="card-title">Technical Assessment Questionnaire</div>
        {isCandidate && !questionnaireData?.isAnswered ?
        <div className="card-description">
          Welcome {name}! Please answer the following questions to the best of your ability.<br/>
          Select the most appropriate option where applicable. If a question does not have options,<br/>
          provide a detailed answer based on your knowledge and experience.
        </div> : isCandidate && questionnaireData?.isAnswered ?
        <div>
          Thank you for completing the technical assessment. Our recruitment team will review<br/> your responses and contact you shortly regarding the status of your application.
        </div> :
        <div className="card-title-2">
          Total Score: <span className={`status-color ${getStatus(questionnaireData?.totalScore)}`}>{questionnaireData?.totalScore}%</span>
        </div>}
      </div>

      {(!isCandidate || !questionnaireData?.isAnswered) &&
      <form className="questionnaire-form" onSubmit={handleSubmit}>
        {questionnaireData?.questions.map((data, index) => (
          <div key={index} className="card-container">
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <div>
                <div className="card-title-2">{data.question}</div>
                <div className="card-description">{data.skillCategory}</div>
              </div>
              <Chip sx={{float: 'right'}} id="tags" label={data.difficulty}/>
            </div>
            {data.options ? (
              data.options.map((option, optionIndex) => (
                <div key={optionIndex}>
                  <label className="radio-option">
                    <input
                      disabled={!isCandidate}
                      className="radio-option"
                      type="radio"
                      name={`question-${index}`}
                      value={option || data.candidateAnswer}
                      onChange={() => handleAnswerChange(data.question, option)}
                      checked={answers[data.question] === option || data.candidateAnswer}
                    />
                    {option}
                  </label>
                </div>
              ))
            ) : (
              <textarea
                disabled={!isCandidate}
                placeholder="Type your answer here..."
                onChange={(e) =>
                  handleAnswerChange(data.question, e.target.value)
                }
                value={answers[data.question] || data.candidateAnswer}
              />
            )}
          </div>
        ))}
        {isCandidate && !questionnaireData?.isAnswered &&
        <button
          style={{ width: 120, marginLeft: "auto" }}
          type="submit"
          className="primary-button"
          disabled={!isAllQuestionsAnswered() || loading} // Disable the button if not all questions are answered
        >
          {loading ?
            <div>
              <CircularProgress thickness={5} size={10} color='black'/>Submitting...
            </div> :
            "Submit"
          }
        </button>}
      </form>}

      <Snackbar
        autoHideDuration={5000}
        open={open}
        onClose={handleClose}
        TransitionComponent={Slide} // Use Slide transition
        TransitionProps={{ direction: "up" }} // Specify the slide direction
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }} // Position the Snackbar
      >
        <Alert
          sx={{
            alignItems: "center",
            "& .MuiAlert-action": { padding: "0px 0px 0px 6px" },
            "& .MuiButtonBase-root": { width: "36px" },
          }}
          onClose={handleClose}
          severity={messageType}
        >
          {message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default QuestionnairePage;