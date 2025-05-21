import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import { observeAuthState } from "./authService";
import { db, storage } from "./firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import NavMenu from "./components/navMenu/NavMenu";
import PageHeader from "./components/pageHeader/PageHeader";
import LoginPage from "./pages/login/LoginPage";
import AIResumeAnalyzerPage from "./pages/aiResumeAnalyzer/AIResumeAnalyzerPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import MessagesPage from "./pages/messages/MessagesPage";
import CandidatesPage from "./pages/candidates/CandidatesPage";
import JobPostingsPage from "./pages/jobPostings/JobPostingsPage";
import MatchCandidatesPage from "./pages/matchCandidates/MatchCandidatesPage";
import ContactsPage from "./pages/contacts/ContactsPage";
import BillingPage from "./pages/billing/BillingPage";
import HelpPage from "./pages/help/HelpPage";
import QuestionnairePage from "./pages/questionnaire/QuestionnairePage";
import QuestionnairesPage from "./pages/questionnaires/QuestionnairesPage";
import GlobalUploadStatus from "./components/globalUploadStatus/GlobalUploadStatus";
import { getConversationCount, getUser } from "./utils/firebaseService";
import { extractTextFromPDF, extractTextFromDocx } from "./utils/helper";
import { capitalizeFirstLetter, convertArrayToLowercase } from "./utils/utils";
import { Snackbar, Alert, Slide } from "@mui/material";
import { apiBaseUrl } from "./utils/constants";


const AuthObserver = ({ setAuthenticated, updateUser, onLogin, setUserInfo }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (user) {
        setAuthenticated(true);
        updateUser(user);
        const userInfo = await getUser(user.email);
        setUserInfo(userInfo);
        try {
          await onLogin(user?.uid);
        } catch (error) {
          console.error("Error during login process:", error);
        }
        if (window.location.pathname === "/") navigate("/messages")
        else navigate(window.location.pathname)
      } else {
        if (window.location.pathname === "/") {
          setAuthenticated(false);
          updateUser(null);
          setUserInfo("");
          navigate("/login");
        } else navigate(window.location.pathname);
      }
    });
    return () => unsubscribe();
  }, [navigate, setAuthenticated, updateUser, onLogin, setUserInfo]);

  return null;
};

const App = () => {
  const [headerTitle, setHeaderTitle] = useState("");
  const [headerSubtitle, setHeaderSubtitle] = useState("");
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [messagesCount, setMessagesCount] = useState("0");
  const [userId, setUserId] = useState(null);
  const [userInfo, setUserInfo] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({});
  const [uploadLoading, setUploadLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [messageType, setMessageType] = useState("");

  const updateUser = (user) => {
    setUserId(user?.uid);
  };

  const updateMessagesCount = (count) => {
    setMessagesCount(count > 99 ? "+99" : count.toString());
  };

  const fetchAndSetMessageCount = async (userId) => {
    try {
      const count = await getConversationCount(userId); // Fetch count only
      updateMessagesCount(count);
    } catch (error) {
      console.error("Error fetching conversation count:", error);
    }
  };

  const getHeaderTitle = (value) => setHeaderTitle(value);
  const getHeaderSubtitle = (value) => setHeaderSubtitle(value);

  const updateMessage = (value, type, isOpen) => {
    setMessage(value);
    setMessageType(type);
    if (isOpen && !open) {
      setOpen(true); // Only set open to true if it's not already open
    }
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const handleFileUpload = async (acceptedFiles) => {
    setUploadLoading(true);
    if (acceptedFiles.length === 0) {
      setUploadLoading(false);
      return;
    }
  
    const updatedStatus = { ...uploadStatus };
  
    try {
      // Filter out unsupported file types (only allow PDF and DOCX)
      const validFiles = acceptedFiles.filter((file) => {
        const fileType = file.name.split(".").pop().toLowerCase();
        if (!["pdf", "docx"].includes(fileType)) {
          updatedStatus[file.name] = "Failed";
          setUploadStatus({ ...updatedStatus });
          return false;
        }
        return true;
      });
  
      if (validFiles.length === 0) {
        setUploadLoading(false);
        return;
      }
  
      const uploadPromises = validFiles.map(async (file) => {
        const fileType = file.name.split(".").pop().toLowerCase();
        const storageRef = ref(storage, `resumes/${userInfo.name}/${file.name}`);
        const metadata = { customMetadata: { userId } };
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);
  
        return new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              updatedStatus[file.name] = progress;
              setUploadStatus({ ...updatedStatus });
            },
            (error) => {
              console.error("Upload failed for", file.name, error);
              updatedStatus[file.name] = "Failed";
              setUploadStatus({ ...updatedStatus });
              reject(error);
            },
            async () => {
              try {
                const downloadUrl = await getDownloadURL(storageRef);
                let resumeText = "";
  
                if (fileType === "pdf") {
                  const response = await fetch(`${apiBaseUrl}/process-pdf`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ documentUrl: downloadUrl}),
                  });
                  const responseData = await response.json();
                  resumeText = responseData.text;
                } else if (fileType === "docx") {
                  resumeText = await extractTextFromDocx(downloadUrl);
                }
  
                // Analyze the file to determine if it is a resume
                const analyzeResponse = await fetch(`${apiBaseUrl}/ai-analyze-text`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ resumeText: resumeText}),
                });
                const analyzeData = await analyzeResponse.json();
                const isResume = analyzeData.isResume;
  
                if (isResume) {
                  // Process resume only if file is identified as a resume
                  const processResponse = await fetch(`${apiBaseUrl}/ai-process-resume`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ resumeText: resumeText }),
                  });
                  if (!processResponse.ok) {
                    throw new Error("Failed to process resume");
                  }
                  const apiData = await processResponse.json();
  
                  // Update Firestore contact (update if exists, add otherwise)
                  const contactsRef = collection(db, "contacts");
                  const querySnapshot = await getDocs(
                    query(
                      contactsRef,
                      where("name", "==", capitalizeFirstLetter(apiData.contact.name)),
                      where("userId", "==", userId)
                    )
                  );
  
                  if (!querySnapshot.empty) {
                    const existingContactDoc = querySnapshot.docs[0];
                    const existingContactRef = doc(db, "contacts", existingContactDoc.id);
                    await updateDoc(existingContactRef, {
                      email: apiData.contact.email?.toLowerCase() ||
                             existingContactDoc.data().email?.toLowerCase(),
                      phone: apiData.contact.phone || existingContactDoc.data().phone,
                      location: apiData.contact.location || existingContactDoc.data().location,
                      linkedin: apiData.contact.linkedin || existingContactDoc.data().linkedin,
                      summary: apiData.contact.summary || existingContactDoc.data().summary,
                      total_experience_years: apiData.contact.total_experience_years || existingContactDoc.data().total_experience_years,
                      experience_level: apiData.contact.experience_level || existingContactDoc.data().experience_level,
                      education: apiData.contact.education || existingContactDoc.data().education,
                      work_experience: apiData.contact.work_experience || existingContactDoc.data().work_experience,
                      projects: apiData.contact.projects || existingContactDoc.data().projects,
                      certifications: apiData.contact.certifications || existingContactDoc.data().certifications,
                      skills: convertArrayToLowercase(apiData.contact.skills) ||
                              convertArrayToLowercase(existingContactDoc.data().skills),
                      job_title_tags: convertArrayToLowercase(apiData.job_title_tags) ||
                                      convertArrayToLowercase(existingContactDoc.data().job_title_tags),
                      mandatory_tags: convertArrayToLowercase(apiData.mandatory_tags) ||
                                      convertArrayToLowercase(existingContactDoc.data().mandatory_tags),
                      alternative_job_title_tags_en: convertArrayToLowercase(apiData.alternative_job_title_tags_en) ||
                                                     convertArrayToLowercase(existingContactDoc.data().alternative_job_title_tags_en),
                      alternative_job_title_tags_he: convertArrayToLowercase(apiData.alternative_job_title_tags_he) ||
                                                     convertArrayToLowercase(existingContactDoc.data().alternative_job_title_tags_he),
                      alternative_mandatory_tags_en: convertArrayToLowercase(apiData.alternative_mandatory_tags_en) ||
                                                     convertArrayToLowercase(existingContactDoc.data().alternative_mandatory_tags_en),
                      alternative_mandatory_tags_he: convertArrayToLowercase(apiData.alternative_mandatory_tags_he) ||
                                                     convertArrayToLowercase(existingContactDoc.data().alternative_mandatory_tags_he),
                      introduction: apiData.introduction || existingContactDoc.data().introduction,
                      fileName: file.name,
                      language: apiData.language || "en",
                      url: downloadUrl,
                      resumeText: resumeText,
                      status: "Active",
                      timestamp: serverTimestamp(),
                    });
                    console.log("Contact updated in Firestore:", existingContactDoc.id);
                    setContacts((prevContacts) =>
                      prevContacts.map((contact) =>
                        contact.name === existingContactDoc.data().name
                          ? { ...contact, ...apiData, fileName: file.name, url: downloadUrl, resumeText }
                          : contact
                      )
                    );
                  } else {
                    const formattedName = file.name
                      .replace(/\.[^/.]+$/, "")
                      .replace(/[_-]+/g, " ")
                      .replace(/\b(resume|cv|curriculum vitae)\b/gi, "")
                      .trim();
    
                    const newContact = {
                      name: capitalizeFirstLetter(apiData.contact.name) || capitalizeFirstLetter(formattedName),
                      email: apiData.contact.email?.toLowerCase() || "",
                      phone: apiData.contact.phone || "",
                      location: apiData.contact.location || "",
                      linkedin: apiData.contact.linkedin || "",
                      summary: apiData.contact.summary,
                      total_experience_years: apiData.contact.total_experience_years,
                      experience_level: apiData.contact.experience_level,
                      education: apiData.contact.education || [],
                      work_experience: apiData.contact.work_experience || [],
                      projects: apiData.contact.projects | [],
                      certifications: apiData.contact.certifications || [],
                      skills: convertArrayToLowercase(apiData.contact.skills) || [],
                      job_title_tags: convertArrayToLowercase(apiData.job_title_tags) || [],
                      mandatory_tags: convertArrayToLowercase(apiData.mandatory_tags) || [],
                      alternative_job_title_tags_en: convertArrayToLowercase(apiData.alternative_job_title_tags_en) || [],
                      alternative_job_title_tags_he: convertArrayToLowercase(apiData.alternative_job_title_tags_he) || [],
                      alternative_mandatory_tags_en: convertArrayToLowercase(apiData.alternative_mandatory_tags_en) || [],
                      alternative_mandatory_tags_he: convertArrayToLowercase(apiData.alternative_mandatory_tags_he) || [],
                      fileName: file.name,
                      language: apiData.language || "en",
                      introduction: apiData.introduction || [],
                      url: downloadUrl,
                      jobs: [],
                      resumeText: resumeText,
                      status: "Active",
                      userId: userId,
                      timestamp: serverTimestamp(),
                    };
    
                    await addDoc(collection(db, "contacts"), newContact);
                    setContacts((prevContacts) => [newContact, ...prevContacts]);
                    console.log("Contact added to Firestore:", newContact);
                  }
                } else {
                  // If the file is not a resume, skip processing and log the event
                  console.log(`${file.name} is not identified as a resume. Skipping resume processing.`);
                }
    
                updatedStatus[file.name] = "Complete";
                setUploadStatus({ ...updatedStatus });
                resolve();
              } catch (error) {
                console.error("Error processing and saving contact:", error);
                updatedStatus[file.name] = "Failed";
                setUploadStatus({ ...updatedStatus });
                reject(error);
              }
            }
          );
        });
      });
    
      await Promise.all(uploadPromises);
      updateMessage("All valid files uploaded and processed successfully!", "success", true);
      setUploadStatus({});
      setFiles([]);
    } catch (error) {
      console.error("Error in uploadFiles:", error);
    } finally {
      setUploadLoading(false);
    }
  };  

  return (
    <div className="page-container">
      <GlobalUploadStatus 
        files={files} 
        uploadStatus={uploadStatus} 
        loading={uploadLoading} 
      />
      <Snackbar
        autoHideDuration={5000}
        open={open}
        onClose={handleClose}
        TransitionComponent={Slide}
        TransitionProps={{ direction: "up" }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }} // Position the Snackbar
      >
        <Alert sx={{ alignItems: 'center', "& .MuiAlert-action": { padding: '0px 0px 0px 6px' }, "& .MuiButtonBase-root": { width: '36px' } }} onClose={handleClose} severity={messageType}>
          {message}
        </Alert>
      </Snackbar>
      <Router>
        <AuthObserver setAuthenticated={setAuthenticated} updateUser={updateUser} onLogin={fetchAndSetMessageCount} setUserInfo={setUserInfo} />
        {!isAuthenticated ? 
        (
          <Routes>
            <Route path="/login" element={<LoginPage updateUser={updateUser} />} />
            <Route
              path="/questionnaire/:token"
              element={<QuestionnairePage isCandidate={true} />}
            />
          </Routes>
        ) : (
          <>
            <NavMenu messagesCount={messagesCount} />
            <div className="view-section">
              <PageHeader title={headerTitle} subtitle={headerSubtitle} user={userInfo} />
              <Routes>
                <Route
                  path="/ai-resume-analyzer"
                  element={<AIResumeAnalyzerPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/dashboard"
                  element={<DashboardPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/messages"
                  element={<MessagesPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/candidates"
                  element={<CandidatesPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} userInfo={userInfo}/>}
                />
                <Route
                  path="/job-definitions"
                  element={<JobPostingsPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/match-candidates"
                  element={<MatchCandidatesPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} userInfo={userInfo} />}
                />
                <Route
                  path="/contacts"
                  element={
                    <ContactsPage 
                      title={getHeaderTitle} 
                      subtitle={getHeaderSubtitle} 
                      userId={userId} 
                      userInfo={userInfo}
                      contacts={contacts}
                      setContacts={setContacts}
                      files={files}
                      uploadStatus={uploadStatus}
                      uploadLoading={uploadLoading}
                      setFiles={setFiles}
                      onFileUpload={handleFileUpload}
                    />
                  }
                />
                <Route
                  path="/questionnaires"
                  element={<QuestionnairesPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} userInfo={userInfo}/>}
                />
                <Route
                  path="/billing"
                  element={<BillingPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/help"
                  element={<HelpPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/questionnaire/:token"
                  element={<QuestionnairePage isCandidate={false}/>}
                />
              </Routes>
            </div>
          </>
        )}
      </Router>
    </div>
  );
};

export default App;