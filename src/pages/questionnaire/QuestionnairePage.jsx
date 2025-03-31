import React, { useState, useEffect } from "react";
import "./QuestionnairePage.css";
import { useParams, useLocation } from "react-router-dom";
import { Snackbar, Alert, Slide, Chip, CircularProgress, TextField, Button, Tooltip } from "@mui/material";
import { doc, updateDoc, getDocs, collection, where, query, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { fetchJobQuestionnaire, fetchCandidateQuestionnaire, getSkillCategories } from "../../utils/firebaseService";
import { getStatus } from "../../utils/helper";
import { apiBaseUrl } from "../../utils/constants";
import { DeleteIcon } from "../../assets/images";
import AddQuestionModal from "../../components/addQuestionModal/AddQuestionModal";
import ConfirmModal from "../../components/confirmModal/ConfirmModal";
import Mailgun from "mailgun.js";

const QuestionnairePage = (props) => {
  const location = useLocation();
  const { token } = useParams();
  const { isEdit } = location.state || {};
  
  const isCandidate = props.isCandidate;

  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP

  const [questionnaireData, setQuestionnaireData] = useState(null);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [isCandidateVerified, setIsCandidateVerified] = useState(false);
  const [editable, setEditable] = useState(false);
  const [skillCategories, setSkillCategories] = useState([]);
  const [question, setQuestion] = useState({
    question: "",
    difficulty: "",
    skillCategory: "",
    options: null,
    answer: "",
    explanation: "",
  });
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState('General');

  // Separate General and Technical questions
  const generalQuestions = questionnaireData?.questions.filter(q => q.skillCategory === 'General') || [];
  const technicalQuestions = questionnaireData?.questions.filter(q => q.skillCategory !== 'General') || [];
  const sortedQuestions = [...generalQuestions, ...technicalQuestions];

  const questions = () => {
    if(isCandidate) {
      if(currentPage === 'General') return generalQuestions;
      else return technicalQuestions;
    } else return sortedQuestions;
  }

  // Function to handle the "Next" button click
  const handleNext = () => {
    setCurrentPage('Technical');
  };

  const handlePrevious = () => {
    setCurrentPage('General');
  };

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
      let data, jobTitle, candidateName;

      if (isCandidate || isEdit) {
        const categories = await getSkillCategories(token);
        setSkillCategories(categories);
        const result = await fetchJobQuestionnaire(token);
        data = result.data;
        jobTitle = result.jobTitle;
      } else {
        // Fetch questionnaire data for a non-candidate (e.g., recruiter)
        const result = await fetchCandidateQuestionnaire(token);
        data = result.data;
        jobTitle = result.jobTitle;
        candidateName = result.name;
      }

      // Update state with the fetched data
      setQuestionnaireData(data);
      setJobTitle(jobTitle);

      if (candidateName) {
        setName(candidateName);
      }
    } catch (error) {
      console.error("Error fetching questionnaire data:", error);
      updateMessage("Failed to load the questionnaire. Please try again.", "error", true);
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
  
        // Update the questionnaireData object with the new fields
        const updatedQuestionnaireData = {
          ...questionnaireData, // Keep all existing fields
          totalScore: overallScore + '%', // Update totalScore
          isAnswered: true, // Update isAnswered
          questions: updatedQuestions, // Update questions with candidateAnswer and score
        };
  
        // Update the candidate's document in Firestore
        const candidateDoc = doc(db, "candidates", candidateId);
        await updateDoc(candidateDoc, {
          questionnaireData: updatedQuestionnaireData, // Save the updated questionnaireData
        });

        // Update local state with the updated questionnaireData
        setQuestionnaireData(updatedQuestionnaireData);
  
        // Show success message
        updateMessage(
          `Thank you for completing the questionnaire!.`,
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

  // Check if candidate details match
  const verifyCandidate = async () => {
    try {
      const candidatesCollection = collection(db, "candidates");

      const q = query(
        candidatesCollection,
        where("contact.email", "==", email),
        where("jobTitle", "==", jobTitle),
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        updateMessage("Email doesn't match! Please try again.", "error", true);
        return;
      }

      const existingCandidateDoc = querySnapshot.docs[0];
      setIsAnswered(existingCandidateDoc.data().questionnaireData?.isAnswered);
      setCandidateId(existingCandidateDoc.id);
      setIsCandidateVerified(true);
    } catch (error) {
      console.error("Error verifying candidate:", error);
      updateMessage("Failed to verify candidate details. Please try again.", "error", true);
    }
  };

  const sendOtp = async () => {
    try {
      setOtp(generatedOtp); // Store the OTP in state (for verification purposes)
  
      const mailgun = new Mailgun({ username: 'api', key: "a1db0f17edd7de60eef6b9fdcb4222d5-623424ea-fdb43541" });
      const mg = mailgun.client({ username: 'api', key: "a1db0f17edd7de60eef6b9fdcb4222d5-623424ea-fdb43541" });
  
      const data = {
        from: "Your Company <noreply@yourcompany.com>",
        to: email,
        subject: "Your OTP for Verification",
        text: `Your OTP is: ${generatedOtp}`,
      };
  
      await mg.messages.create("sandbox9447ed16a7c24cb79ae24524586c5b0f.mailgun.org", data);
      setIsOtpSent(true);
      updateMessage("OTP sent successfully!", "success", true);
    } catch (error) {
      console.error("Error sending OTP:", error);
      updateMessage("Failed to send OTP. Please try again.", "error", true);
    }
  };

  const verifyOtp = () => {
    if (otp === generatedOtp) { // Compare the entered OTP with the generated OTP
      setIsOtpVerified(true);
      setIsCandidateVerified(true);
      updateMessage("OTP verified successfully!", "success", true);
    } else {
      updateMessage("Invalid OTP. Please try again.", "error", true);
    }
  };

  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setQuestion((prev) => ({ ...prev, [name]: name === "options" ? value.split(",") : value }));
  };

  const handleAddQuestion = async () => {
    if (!question.question || (question.skillCategory !== 'General' && !question.answer)) {
      updateMessage("Please fill in all required fields", "warning", true);
      return;
    }
  
    try {
      setLoading(true);
      const updatedQuestions = [...questionnaireData.questions, question];
      const updatedQuestionnaireData = {
        ...questionnaireData,
        questions: updatedQuestions,
        version: "Customized",
        timestamp: serverTimestamp(),
      };

      setQuestionnaireData(updatedQuestionnaireData);
  
      // Update the questionnaire data in Firestore
      const jobDoc = doc(db, "jobs", token);
      await updateDoc(jobDoc, {
        questionnaireData: updatedQuestionnaireData,
      });
  
      // Update local state
      setQuestion({
        question: null,
        difficulty: null,
        skillCategory: null,
        options: null,
        answer: null,
        explanation: null,
      });
      setTimeout(() => setLoading(false), 300);
      setTimeout(() => setAddModalOpen(false), 500);
      updateMessage("Question added successfully", "success", true);
    } catch (error) {
      setLoading(false);
      console.error("Error adding question:", error);
      setTimeout(() => setLoading(false), 300);
      setTimeout(() => setAddModalOpen(false), 500);
      updateMessage("Failed to add question", "error", true);
    }
  };

  const handleDeleteQuestion = async (questionIndex) => {
    setConfirming(true);
    try {
      // Create a copy of the current questions array
      const updatedQuestions = [...questionnaireData.questions];
  
      // Remove the question at the specified index
      updatedQuestions.splice(questionIndex, 1);
  
      // Update the questionnaireData with the new questions array
      const updatedQuestionnaireData = {
        ...questionnaireData,
        questions: updatedQuestions,
        version: "Customized",
        timestamp: serverTimestamp(),
      };
  
      // Update the questionnaire data in Firestore
      const jobDoc = doc(db, "jobs", token);
      await updateDoc(jobDoc, {
        questionnaireData: updatedQuestionnaireData,
      });
  
      setQuestionnaireData(updatedQuestionnaireData);
      setTimeout(() => setConfirming(false), 300);
      setTimeout(() => setShowConfirm(false), 500);
      updateMessage("Question deleted successfully", "success", true);
    } catch (error) {
      setTimeout(() => setConfirming(false), 300);
      setTimeout(() => setShowConfirm(false), 500);
      console.error("Error deleting question:", error);
      updateMessage("Failed to delete question", "error", true);
    }
  };

  const handleShowConfirmation = (index) => {
    setShowConfirm(true);
    setQuestionIndex(index);
  };

  const answerColor = (option, data) => {
    if (option === data.answer) return 'status-color passed';
    else if (option === data.candidateAnswer) return 'status-color failed';
    else return '';
  }

  // Fetch questionnaire data on component mount
  useEffect(() => {
    loadQuestionnaire();
    setEditable(isEdit);
  }, [token]);

  return (
    <div className="questionnaire-page-container">
      <div className="card-container">
        <div className="card-title">
          <span>Technical Assessment Questionnaire - {jobTitle}</span>
          {editable &&
          <button 
            onClick={() => setAddModalOpen(true)}
            style={{width: 'max-content', float: 'right'}} 
            className="primary-button"
          >
            Add Question
          </button>}
        </div>
        {isCandidate && !isAnswered ?
        <div className="card-description">
          Welcome Applicant! Please answer the following questions to the best of your ability.<br/>
          Select the most appropriate option where applicable. If a question does not have options,<br/>
          provide a detailed answer based on your knowledge and experience.
        </div> : isCandidate && isAnswered ?
        <div>
          Thank you for completing the technical assessment. Our recruitment team will review<br/> your responses and contact you shortly regarding the status of your application.
        </div> :
        (!editable &&
        <div className="card-title-2">
          Total Score: <span className={`status-color ${getStatus(questionnaireData?.totalScore)}`}>{questionnaireData?.totalScore}</span>
        </div>)}
      </div>
      {isCandidate && !isCandidateVerified && (
        <div className="card-container">
          <div className="card-title">Please Enter Your Email</div>
          <input
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {!isOtpSent ? (
            <button
              style={{ marginTop: 10 }}
              className="primary-button"
              onClick={sendOtp}
              disabled={!email}
            >
              Send OTP
            </button>
          ) : (
            <>
              <input
                required
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ marginTop: 10 }}
              />
              <button
                style={{ marginTop: 10 }}
                className="primary-button"
                onClick={verifyOtp}
                disabled={!otp}
              >
                Verify OTP
              </button>
            </>
          )}
        </div>
      )}
      {(!isCandidate || (isCandidateVerified && !isAnswered )) && (
        <form className="questionnaire-form" onSubmit={handleSubmit}>
        {questions().map((data, index) => (
          <div key={index} className="card-container">
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <div>
                <div className="card-title-2">{data.question}</div>
                <div className="card-description">{data.skillCategory}</div>
              </div>
              <Chip sx={{float: 'right'}} id="tags" label={data.difficulty}/>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20}}>
              <div style={{width: '100%'}}>
              {data.options ? (
                data.options.map((option, optionIndex) => (
                  <div style={{margin: '4px 0'}} key={optionIndex}>
                    <label className={`radio-option ${!isCandidate && answerColor(option, data)}`}>
                      <input
                        disabled={!isCandidate}
                        className="radio-option"
                        type="radio"
                        name={`question-${index}`}
                        value={option || data.candidateAnswer}
                        onChange={() => handleAnswerChange(data.question, option)}
                        checked={answers[data.question] === option || data.candidateAnswer === option}
                      />
                      {option}
                    </label>
                  </div>
                ))
              ) : (
                <textarea
                  style={{width: '100%', minHeight: 70}}
                  disabled={!isCandidate}
                  placeholder="Type your answer here..."
                  onChange={(e) =>
                    handleAnswerChange(data.question, e.target.value)
                  }
                  value={answers[data.question] || data.candidateAnswer}
                />
              )}
              </div>
              {editable && 
              <Tooltip title="Delete">
                <img onClick={() => handleShowConfirmation(index)} src={DeleteIcon}/>
              </Tooltip>}
            </div>
          </div>
        ))}

        {isCandidate && (
        currentPage === 'General' ?
          <button
            style={{ width: 120, marginLeft: "auto" }}
            type="button"
            className="primary-button"
            onClick={handleNext}
          >
            Next
          </button> :
          <div style={{display: 'flex', width: 250, gap: 8, marginLeft: 'auto'}}>
            <button
              type="button"
              className="primary-button"
              onClick={handlePrevious}
            >
              Previous
            </button> 
            <button
              type="submit"
              className="primary-button"
              disabled={!isAllQuestionsAnswered() || loading || !isOtpVerified}
            >
              {loading ?
                <div>
                  <CircularProgress thickness={5} size={10} color='black'/>Submitting...
                </div> :
                "Submit"
              }
            </button>
          </div>
        )}
      </form>
      )}
      <AddQuestionModal
        open={isAddModalOpen}
        close={() => setAddModalOpen(false)}
        loading={loading}
        skillCategories={skillCategories}
        question={question}
        handleAddInputChange={handleAddInputChange}
        handleAddQuestion={handleAddQuestion}
      />
      <ConfirmModal
        open={showConfirm}
        close={() => setShowConfirm(false)}
        delete={() => handleDeleteQuestion(questionIndex)}
        item={"question"}
        loading={confirming}
      />
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