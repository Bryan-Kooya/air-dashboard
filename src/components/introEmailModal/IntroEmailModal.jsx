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

  // Translation mapping for subject and email content
  const translations = {
    en: {
      subject: `Following Up on Your ${jobTitle} Application`,
      greeting: "Dear",
      thankYou: "Thank you for your interest in the",
      positionAt: "position at",
      impressedBy: "I was impressed by your background as a",
      atCompany: "at",
      expertiseIn: "and your expertise in",
      experienceYears: "year(s) of experience",
      strongTrackRecord: "and strong track record of achievements make you an interesting candidate for our team.",
      scheduleConversation: "I would love to schedule a conversation to discuss your background and share more details about the role.",
      availableForCall: "Would you be available for a 45-minute video call this week? Please let me know what times work best for you.",
      lookingForward: "Looking forward to speaking with you!",
      bestRegards: "Best regards,",
      talentAcquisition: "Talent Acquisition Team",
      your: "Your",
    },
    es: {
      subject: `Seguimiento de tu solicitud para el puesto de ${jobTitle}`,
      greeting: "Estimado/a",
      thankYou: "Gracias por tu interés en el",
      positionAt: "puesto en",
      impressedBy: "Me impresionó tu experiencia como",
      atCompany: "en",
      expertiseIn: "y tu experiencia en",
      experienceYears: "año(s) de experiencia",
      strongTrackRecord: "y tu historial de logros te convierten en un candidato interesante para nuestro equipo.",
      scheduleConversation: "Me encantaría programar una conversación para discutir tu experiencia y compartir más detalles sobre el puesto.",
      availableForCall: "¿Estarías disponible para una videollamada de 45 minutos esta semana? Por favor, avísame qué horarios te vienen mejor.",
      lookingForward: "¡Espero poder hablar contigo pronto!",
      bestRegards: "Saludos cordiales,",
      talentAcquisition: "Equipo de Adquisición de Talento",
      your: "Tus",
    },
    fr: {
      subject: `Suivi de votre candidature pour le poste de ${jobTitle}`,
      greeting: "Cher/Chère",
      thankYou: "Merci pour votre intérêt pour le",
      positionAt: "poste chez",
      impressedBy: "J'ai été impressionné par votre expérience en tant que",
      atCompany: "chez",
      expertiseIn: "et votre expertise en",
      experienceYears: "an(s) d'expérience",
      strongTrackRecord: "et votre solide parcours de réalisations font de vous un candidat intéressant pour notre équipe.",
      scheduleConversation: "J'aimerais planifier un entretien pour discuter de votre parcours et partager plus de détails sur le rôle.",
      availableForCall: "Seriez-vous disponible pour un appel vidéo de 45 minutes cette semaine ? Merci de me faire savoir quels horaires vous conviennent.",
      lookingForward: "Dans l'attente de notre échange !",
      bestRegards: "Cordialement,",
      talentAcquisition: "Équipe de Recrutement",
      your: "Votre",
    },
    he: {
      subject: `מעקב אחר בקשתך לתפקיד ${jobTitle}`,
      greeting: "שלום",
      thankYou: "תודה על התעניינותך בתפקיד",
      positionAt: "בחברת",
      impressedBy: "התרשמתי מהרקע שלך כ",
      atCompany: "בחברת",
      expertiseIn: "ומומחיותך ב",
      experienceYears: "שנות ניסיון",
      strongTrackRecord: "והישגים מרשימים שלך הופכים אותך למועמד מעניין לצוות שלנו.",
      scheduleConversation: "אשמח לתאם שיחה כדי לדון ברקע שלך ולשתף פרטים נוספים על התפקיד.",
      availableForCall: "האם תהיה זמין לשיחת וידאו של 45 דקות השבוע? אנא עדכן מה השעות הנוחות לך.",
      lookingForward: "מחכה לשוחח איתך!",
      bestRegards: "בברכה,",
      talentAcquisition: "צוות רכישת כישרונות",
      your: "שלך", // Adjust as needed for proper context in Hebrew
    },
    // Add more languages as needed
  };

  // Fallback to English if the language is not supported
  const t = translations[candidate.language] || translations.en;

  const generateSubject = () => {
    return `Subject: ${t.subject}`;
  };

  const generateEmail = () => {
    const name = candidate.contact?.name || "candidate";
    const position = candidate?.work_experience?.[0]?.title || "professional";
    const company = candidate?.work_experience?.[0]?.company || "current company";
    const skills = candidate?.skills?.slice(0, 3).join(", ") || "relevant skills";
    const experience = candidate?.total_experience_years || 0;

    return `
${t.greeting} ${name},

${t.thankYou} ${jobTitle} ${t.positionAt} ${hiringCompany}. ${t.impressedBy} ${position} ${t.atCompany} ${company} ${t.expertiseIn} ${skills}.

${t.your} ${experience} ${t.experienceYears} ${t.strongTrackRecord} ${t.scheduleConversation}

${t.availableForCall}

${t.lookingForward}

${t.bestRegards}
${userInfo.name}
${t.talentAcquisition}
TalentTap`;
  };

  // Update parent component with generated email subject and body
  props.emailSubject(generateSubject());
  props.emailBody(generateEmail());

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
            <div className="email-modal-subtitle">
              A personalized email draft based on the candidate's profile
            </div>
          </div>
          <img onClick={handleClose} src={Close} alt="Close" />
        </div>
        <div className="email-modal-row2">
          <div className="generated-email-section">
            {generateSubject()}
            {generateEmail()}
            <IconButton
              size="large"
              sx={{ position: "absolute", top: 10, right: 8 }}
              onClick={copyToClipboard}
            >
              <img src={copied ? CheckIcon : CopyIcon} alt="copy icon" />
            </IconButton>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default IntroEmailModal;