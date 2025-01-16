import React, { useState } from "react";
import "./IntroEmailModal.css";
import { Modal, IconButton } from "@mui/material";
import { Close, CopyIcon, CheckIcon } from "../../assets/images";

const IntroEmailModal = (props) => {
  const open = props.open;
  const close = props.close;
  const candidate = props.candidate;
  const jobTitle = props.jobTitle;
  const userInfo = props.userInfo;
  const hiringCompany = props.hiringCompany;
  const [copied, setCopied] = useState(false);

  const generateEmail = () => {
    const name = candidate.contact?.name || "candidate";
    const position = candidate?.work_experience?.[0]?.position || "professional";
    const company = candidate?.work_experience?.[0]?.company || "current company";
    const skills = candidate?.skills?.slice(0, 3).join(", ") || "relevant skills";
    const experience = candidate?.total_experience_years || 0;

    return `Subject: Following Up on Your ${jobTitle} Application

Dear ${name},

Thank you for your interest in the ${jobTitle} position at ${hiringCompany}. I was impressed by your background as a ${position} at ${company} and your expertise in ${skills}.

Your ${experience} year(s) of experience and strong track record of achievements make you an interesting candidate for our team. I would love to schedule a conversation to discuss your background and share more details about the role.

Would you be available for a 45-minute video call this week? Please let me know what times work best for you.

Looking forward to speaking with you!

Best regards,
${userInfo.name}
Talent Acquisition Team
TalentTap`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateEmail()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClose = () => {
    close();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="email-modal-container">
        <div className="email-modal-row1">
          <div className="email-modal-title">
            <div>Generated Introduction Email</div>
            <div className="email-modal-subtitle">A personalized email draft based on the candidate's profile</div>
          </div>
          <img onClick={handleClose} src={Close} alt='Close'/>
        </div>
        <div className="email-modal-row2">
          <div className="generated-email-section">
            {generateEmail()}
            <IconButton
              size="large"
              sx={{ position: "absolute", top: 10, right: 8 }}
              onClick={copyToClipboard}
            >
              <img src={copied ? CheckIcon : CopyIcon}/>
            </IconButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default IntroEmailModal;