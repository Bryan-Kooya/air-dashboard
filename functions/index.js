const functions = require('firebase-functions');
const express = require('express');
const bodyParser = require("body-parser");
const { OpenAI } = require('openai');
const cors = require('cors');
require('dotenv').config();

async function getOpenAIApiKey() {
  // Ensure the environment variable is properly set
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }
  return process.env.OPENAI_API_KEY;
}

// Allow requests from specific origins (update to match your frontend domain)
const corsOptions = {
  origin: [
    'https://dashboard.talenttap.co',
    'https://message-scanner-extension.web.app',
    'chrome-extension://colmkbooojhebbpohdddofdgpekkbdep',
    'https://www.linkedin.com',
    'http://localhost:3000',
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // If you need cookies or authentication headers
};

const app = express();
app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});
app.use(bodyParser.json()); 

const languageMap = {
  en: 'English',
  he: 'Hebrew',
  es: 'Spanish',
  zh: 'Chinese',
  de: 'German',
  ar: 'Arabic',
  ur: 'Urdu',
};

const INTERVIEW_PREP_PROMPT = `As an AI recruitment expert, create a comprehensive interview preparation package based on the provided job title, description, and optionally resume data. Include:

1. Generate a mix of interview questions (10-15 total) across these categories:
   - Technical questions specific to the role
   - Behavioral questions
   - Role-specific questions
   Each question should include:
   - The question text
   - A suggested answer or key points to cover
   - Category (Technical/Behavioral/Role-specific)
   - Difficulty level (Basic/Intermediate/Advanced)

2. Provide 5-7 preparation tips specific to this role and company type

3. List 6-8 key topics the candidate should review before the interview

Respond in JSON format with the following structure:
{
  "questions": [{
    "question": string,
    "answer": string,
    "category": string,
    "difficulty": "Basic" | "Intermediate" | "Advanced"
  }],
  "preparationTips": string[],
  "keyTopics": string[]
}`;

app.post("/generate-job", async (req, res) => {
  try {
    const openaiApiKey = await getOpenAIApiKey();
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const { job_title, company_name, industry, location, description } = req.body;

    // Step 1: Detect the language of the input description using OpenAI
    const languageDetectionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Detect the language of the following text and respond with the language code (e.g., 'en' for English, 'es' for Spanish, 'fr' for French, 'he' for Hebrew). Respond only with the language code.",
        },
        { role: "user", content: description },
      ],
      temperature: 0.0, // Use low temperature for deterministic output
    });

    const detectedLanguage = languageDetectionResponse.choices[0].message.content.trim();
    const language = detectedLanguage || "en"; // Default to English if no language is detected

    // Step 2: Define system prompts based on the detected language
    const descriptionPrompt = {
      en: "You are a professional job description writer. Using the provided context (job title, company, industry, and location), enhance the given job description to be more professional, compelling, and well-structured. Include key responsibilities, requirements, and benefits in a clear format.",
      es: "Eres un escritor profesional de descripciones de puestos de trabajo. Utilizando el contexto proporcionado (título del puesto, empresa, industria y ubicación), mejora la descripción del puesto para que sea más profesional, atractiva y bien estructurada. Incluye responsabilidades clave, requisitos y beneficios en un formato claro.",
      fr: "Vous êtes un rédacteur professionnel de descriptions de poste. En utilisant le contexte fourni (titre du poste, entreprise, secteur et lieu), améliorez la description du poste pour la rendre plus professionnelle, convaincante et bien structurée. Incluez les responsabilités clés, les exigences et les avantages dans un format clair.",
      he: "אתה כותב מקצועי של תיאורי משרות. באמצעות ההקשר שסופק (כותרת המשרה, שם החברה, התעשייה והמיקום), שפר את תיאור המשרה הנוכחי כדי שיהיה מקצועי, משכנע ומעוצב היטב. כלול אחריות מרכזית, דרישות והטבות בפורמט ברור.",
      // Add more languages as needed
    };

    const tagsPrompt = {
      en: "Extract exactly 10 most relevant skill tags from the job description. Respond with JSON in this format: {'tags': [tag1, tag2, ...]}",
      es: "Extrae exactamente 10 etiquetas de habilidades más relevantes de la descripción del puesto. Responde con JSON en este formato: {'tags': [tag1, tag2, ...]}",
      fr: "Extrayez exactement 10 étiquettes de compétences les plus pertinentes de la description du poste. Répondez avec JSON dans ce format: {'tags': [tag1, tag2, ...]}",
      he: "חלץ בדיוק 10 תגיות כישורים רלוונטיות מתיאור המשרה. הגיב בפורמט JSON בצורה הבאה: {'tags': [tag1, tag2, ...]}",
      // Add more languages as needed
    };

    const mandatoryTagsPrompt = {
      en: "Based on the job description, generate exactly 3 mandatory tags that capture the core skills or requirements of the position. Respond with JSON in the following format: {'mandatory_tags': [tag1, tag2, tag3]}",
      es: "Basándote en la descripción del puesto, genera exactamente 3 etiquetas obligatorias que capturen las habilidades o requisitos fundamentales de la posición. Responde en formato JSON de la siguiente manera: {'mandatory_tags': [tag1, tag2, tag3]}",
      fr: "En vous basant sur la description du poste, générez exactement 3 étiquettes obligatoires qui reflètent les compétences ou exigences essentielles du poste. Répondez en JSON dans le format suivant : {'mandatory_tags': [tag1, tag2, tag3]}",
      he: "בהתבסס על תיאור המשרה, צור בדיוק 3 תגיות חובה המשקפות את הכישורים או הדרישות המרכזיות של התפקיד. הגיב בפורמט JSON בצורה הבאה: {'mandatory_tags': [tag1, tag2, tag3]}",
      // Add more languages as needed
    };

    const jobTitleTagPrompt = {
      en: "Generate a specific tag based on the job title provided. Respond with JSON in the following format: {'job_title_tag': 'tag'}",
      es: "Genera una etiqueta específica basada en el título del puesto proporcionado. Responde en formato JSON de la siguiente manera: {'job_title_tag': 'etiqueta'}",
      fr: "Générez une étiquette spécifique basée sur le titre du poste fourni. Répondez en JSON dans le format suivant : {'job_title_tag': 'étiquette'}",
      he: "צור תגית ספציפית בהתבסס על כותרת המשרה שסופקה. הגיב בפורמט JSON בצורה הבאה: {'job_title_tag': 'תגית'}",
      // Add more languages as needed
    };

    const context = `
      Job Title: ${job_title}
      Company: ${company_name}
      Industry: ${industry}
      Location: ${location}
      Original Description:
      ${description}`;

    // Step 3: Generate the improved description, tags, mandatory tags, and job title tag in the detected language
    const [descriptionResponse, tagsResponse, mandatoryTagsResponse, jobTitleTagResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: descriptionPrompt[language] || descriptionPrompt.en, // Fallback to English if language not supported
          },
          { role: "user", content: context },
        ],
        temperature: 0.0,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: tagsPrompt[language] || tagsPrompt.en, // Fallback to English if language not supported
          },
          { role: "user", content: description },
        ],
        temperature: 0.0,
        response_format: { type: "json_object" },
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: mandatoryTagsPrompt[language] || mandatoryTagsPrompt.en, // Fallback to English if language not supported
          },
          { role: "user", content: description }, // Only refer to description
        ],
        temperature: 0.0,
        response_format: { type: "json_object" },
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: jobTitleTagPrompt[language] || jobTitleTagPrompt.en, // Fallback to English if language not supported
          },
          { role: "user", content: job_title },
        ],
        temperature: 0.0,
        response_format: { type: "json_object" },
      }),
    ]);

    const improvedDescription = descriptionResponse.choices[0].message.content || "";
    const tags = tagsResponse.choices[0].message.content || "{}";
    const mandatoryTags = mandatoryTagsResponse.choices[0].message.content || "{}";
    const jobTitleTag = jobTitleTagResponse.choices[0].message.content || "{}";

    res.json({
      description: improvedDescription,
      tags: tags,
      mandatory_tags: mandatoryTags,
      job_title_tag: jobTitleTag,
      language: language, // Optionally return the detected language
    });
  } catch (error) {
    console.error("Error generating description:", error);
    res.status(500).json({
      error: "Failed to generate description",
      details: error.message, // Include error details for easier debugging
    });
  }
});

app.post("/ai-generate-job", async (req, res) => {
  try {
    const openaiApiKey = await getOpenAIApiKey();
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const { job_title, company_name, industry, location, description } = req.body;

    // Step 1: Detect the language of the input description using OpenAI
    const languageDetectionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Detect the language of the following text and respond with the language code (e.g., 'en' for English, 'es' for Spanish, 'fr' for French, 'he' for Hebrew). Respond only with the language code.",
        },
        { role: "user", content: description },
      ],
      temperature: 0.0, // Use low temperature for deterministic output
    });

    const detectedLanguage = languageDetectionResponse.choices[0].message.content.trim();
    const language = detectedLanguage || "en"; // Default to English if no language is detected

    // Step 2: Define system prompts based on the detected language
    const descriptionPrompt = {
      en: "You are a professional job description writer. Using the provided context (job title, company, industry, and location), enhance the given job description to be more professional, compelling, and well-structured. Include key responsibilities, requirements, and benefits in a clear format.",
      es: "Eres un escritor profesional de descripciones de puestos de trabajo. Utilizando el contexto proporcionado (título del puesto, empresa, industria y ubicación), mejora la descripción del puesto para que sea más profesional, atractiva y bien estructurada. Incluye responsabilidades clave, requisitos y beneficios en un formato claro.",
      fr: "Vous êtes un rédacteur professionnel de descriptions de poste. En utilisant le contexte fourni (titre du poste, entreprise, secteur et lieu), améliorez la description du poste pour la rendre plus professionnelle, convaincante et bien structurée. Incluez les responsabilités clés, les exigences et les avantages dans un format clair.",
      he: "אתה כותב מקצועי של תיאורי משרות. באמצעות ההקשר שסופק (כותרת המשרה, שם החברה, התעשייה והמיקום), שפר את תיאור המשרה הנוכחי כדי שיהיה מקצועי, משכנע ומעוצב היטב. כלול אחריות מרכזית, דרישות והטבות בפורמט ברור.",
      // Add more languages as needed
    };

    const context = `
      Job Title: ${job_title}
      Company: ${company_name}
      Industry: ${industry}
      Location: ${location}
      Original Description:
      ${description}`;

    // Step 3: Generate the improved description first
    const descriptionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: descriptionPrompt[language] || descriptionPrompt.en, // Fallback to English if language not supported
        },
        { role: "user", content: context },
      ],
      temperature: 0.0,
    });

    const improvedDescription = descriptionResponse.choices[0].message.content || "";

    // Step 4: Define prompts for tags, mandatory tags, and job title tags
    const jobTitleTagsPrompt = {
      en: `Generate exactly 5 specific job title tags based on the provided job title. The tags should represent roles or positions, not skills or activities. Respond with JSON in the following format: {'job_title_tags': [tag1, tag2, ...]}`,
      es: `Genera exactamente 5 etiquetas específicas de títulos de trabajo basadas en el título del puesto proporcionado. Las etiquetas deben representar roles o posiciones, no habilidades o actividades. Por ejemplo, si el título del puesto es "מנהל פרויקט מנתח מערכות", las etiquetas deben ser "gerente de proyectos", "analista de sistemas", etc. Responde en formato JSON de la siguiente manera: {'job_title_tags': [tag1, tag2, ...]}`,
      fr: `Générez exactement 5 étiquettes spécifiques de titres de poste basées sur le titre du poste fourni. Les étiquettes doivent représenter des rôles ou des positions, pas des compétences ou des activités. Par exemple, si le titre du poste est "מנהל פרויקט מנתח מערכות", les étiquettes doivent être "chef de projet", "analyste système", etc. Répondez en JSON dans le format suivant : {'job_title_tags': [tag1, tag2, ...]}`,
      he: `צור בדיוק 5 תגיות ספציפיות של תארי משרה בהתבסס על כותרת המשרה שסופקה. התגיות צריכות לייצג תפקידים או משרות, לא מיומנויות או פעילויות. לדוגמה, אם כותרת המשרה היא "מנהל פרויקט מנתח מערכות", התגיות צריכות להיות "מנהל פרויקטים", "אנליסט מערכות" וכו'. הגיב בפורמט JSON בצורה הבאה: {'job_title_tags': [tag1, tag2, ...]}`,
      // Add more languages as needed
    };

    const mandatoryTagsPrompt = {
      en: "Extract exactly 10 most relevant skill tags from the following job description. Respond with JSON in this format: {'tags': [tag1, tag2, ...]}",
      es: "Extrae exactamente 10 etiquetas de habilidades más relevantes de la siguiente descripción del puesto. Responde con JSON en este formato: {'tags': [tag1, tag2, ...]}",
      fr: "Extrayez exactement 10 étiquettes de compétences les plus pertinentes de la description du poste suivante. Répondez avec JSON dans ce format: {'tags': [tag1, tag2, ...]}",
      he: "חלץ בדיוק 10 תגיות כישורים רלוונטיות מתיאור המשרה הבא. הגיב בפורמט JSON בצורה הבאה: {'tags': [tag1, tag2, ...]}",
      // Add more languages as needed
    };

    // Step 5: Generate tags, mandatory tags, and job title tags using the improved description
    const [jobTitleTagsResponse, mandatoryTagsResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: jobTitleTagsPrompt[language] || jobTitleTagsPrompt.en, // Fallback to English if language not supported
          },
          { role: "user", content: job_title },
        ],
        temperature: 0.0,
        response_format: { type: "json_object" },
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: mandatoryTagsPrompt[language] || mandatoryTagsPrompt.en, // Fallback to English if language not supported
          },
          { role: "user", content: improvedDescription }, // Use improvedDescription instead of the original description
        ],
        temperature: 0.0,
        response_format: { type: "json_object" },
      }),
    ]);

    const jobTitleTags = JSON.parse(jobTitleTagsResponse.choices[0].message.content || "{}").job_title_tags || [];
    const mandatoryTags = JSON.parse(mandatoryTagsResponse.choices[0].message.content || "{}").tags || [];

    // Step 6: Generate alternative tags for mandatory_tags and job_title_tags
    const generateAlternativeTags = async (tags, language) => {

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Provide 3 synonyms or alternative words for each of the following tags in ${languageMap[language] || 'English'} language. Store all alternative tags in single array. Respond with JSON in the following format: {"alternative_tags": ["synonym1", "synonym2", "synonym3", ...]}.`
          },
          {
            role: "user",
            content: `Tags: ${tags.join(", ")}`, // Fallback to English if language not supported
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || "{}").alternative_tags || [];
    };

    // Generate alternative tags for mandatory_tags in English and Hebrew
    const alternativeMandatoryTagsEn = await generateAlternativeTags(mandatoryTags, "en");
    const alternativeMandatoryTagsHe = await generateAlternativeTags(mandatoryTags, "he");

    // Generate alternative tags for job_title_tags in English and Hebrew
    const alternativeJobTitleTagsEn = await generateAlternativeTags(jobTitleTags, "en");
    const alternativeJobTitleTagsHe = await generateAlternativeTags(jobTitleTags, "he");

    // Step 7: Structure the response
    res.json({
      description: improvedDescription,
      mandatory_tags: {
        mandatory_tags: mandatoryTags,
        alternative_mandatory_tags_en: alternativeMandatoryTagsEn,
        alternative_mandatory_tags_he: alternativeMandatoryTagsHe,
      },
      job_title_tags: {
        job_title_tags: jobTitleTags,
        alternative_job_title_tags_en: alternativeJobTitleTagsEn,
        alternative_job_title_tags_he: alternativeJobTitleTagsHe,
      },
      language: language, // Optionally return the detected language
    });
  } catch (error) {
    console.error("Error generating description:", error);
    res.status(500).json({
      error: "Failed to generate description",
      details: error.message, // Include error details for easier debugging
    });
  }
});

app.post("/match-resume", async (req, res) => {
  const { resumeText, tags, jobTitle, language } = req.body;

  if (!resumeText || !tags || !Array.isArray(tags)) {
    return res.status(400).json({ error: "Invalid input. Ensure resumeText and requiredTags are provided." });
  }

  const systemMessage = `
  You are a highly skilled resume analyzer and matcher. Your task is to evaluate the resume based on the provided job title, required skills, and extract detailed information. Respond in ${languageMap[language] || 'English'} language.

  Follow these steps:
  1. **Extract Key Information:**
    - Total years of work experience.
    - Professional summary (2-3 sentences summarizing the candidate's background).
    - Skills: List all technical and soft skills mentioned in the resume.
    - Education: Include degree, institution, year, and GPA (if available).
    - Work Experience: List job titles, companies, durations, and key achievements.
    - Projects: Include project names, descriptions, and technologies used.
    - Certifications: List any relevant certifications.

  2. **Analyze Skill Match:**
    - Job Title: ${jobTitle}.
    - Required Skills: ${tags.join(", ")}.
    - Skill Match Score (0-100): If matching_skills is not empty, automatically set the score to 85 or higher.
    - Matching Skills: List skills from the resume that match the required skills.
    - Missing Skills: List required skills that are missing from the resume.

  3. **Evaluate Relevance to Job Title:**
    - Job Title Relevance Score (0-100): Assess how relevant the candidate's experience and skills are to the provided job title.
    - Feedback: Provide feedback on how well the candidate's background aligns with the job title.

  4. **Provide Scores and Feedback:**
    - Overall Quality (0-100): A holistic score based on the resume's completeness, relevance, and presentation.
    - Experience (0-100): Score based on the relevance and depth of work experience to the job title.
    - Education (0-100): Score based on the relevance and quality of education.
    - Skills (0-100): Score based on the relevance and breadth of skills to the job title.
    - Projects (0-100): Score based on the relevance and depth of projects to the job title.
    - Presentation (0-100): Score based on the resume's structure, clarity, and professionalism.

  5. **Detailed Analysis:**
    - Overall Match Fitness: Provide a concise statement summarizing how well the candidate fits the job requirements.
    - Strengths Alignment: List the candidate's strengths that align with the job requirements.
    - Gap Analysis: List areas where the candidate falls short of the job requirements.
    - Growth Potential: Provide a statement on the candidate's potential for growth in the role.

  6. **Personality Insights Analysis:**
    - A brief summary of the candidate's professional personality.
    - Analysis of traits in these categories:
      * Personality traits (adaptability, creativity, attention to detail, etc.)
      * Communication style (collaborative, direct, diplomatic, etc.)
      * Learning approach (analytical, practical, innovative, etc.)
      * Motivation factors (challenges, recognition, growth, etc.)
    - Work style preferences.
    - Key strengths.
    - Growth areas.

  7. **Improvement Suggestions:**
    - Provide actionable suggestions to improve the resume, such as adding missing skills, quantifying achievements, or improving presentation.

  8. **Output Format:**
    - Respond with ONLY valid JSON. Do not include any explanations or markdown.
    - Follow the exact format below:

  {
      "summary": "2-3 sentence professional summary",
      "total_experience_years": 5,
      "skills": ["skill1", "skill2"],
      "experience_level": "junior/mid/senior",
      "education": [
          {
              "degree": "degree name",
              "institution": "school name",
              "year": "year",
              "gpa": "gpa"
          }
      ],
      "work_experience": [
          {
              "title": "title",
              "company": "company",
              "duration": "duration",
              "highlights": ["achievement1", "achievement2"]
          }
      ],
      "projects": [
          {
              "name": "name",
              "description": "description",
              "technologies": ["tech1", "tech2"]
          }
      ],
      "certifications": ["certification1", "certification2"],
      "scores": {
          "overall": 85,
          "experience": {
              "score": 80,
              "feedback": "Good experience but could use more quantifiable achievements"
          },
          "education": {
              "score": 90,
              "feedback": "Strong educational background"
          },
          "skills": {
              "score": 85,
              "feedback": "Good mix of technical and soft skills"
          },
          "projects": {
              "score": 80,
              "feedback": "Projects demonstrate practical experience"
          },
          "presentation": {
              "score": 85,
              "feedback": "Well-structured resume with clear sections"
          },
          "job_title_relevance": {
              "score": 90,
              "feedback": "Strong alignment with the job title and required skills"
          }
      },
      "skill_match": {
          "score": 85, // Automatically set to 85 or higher if matching_skills is not empty
          "matching_skills": ["skill1", "skill2"],
          "missing_skills": ["skill3", "skill4"]
      },
      "detailedAnalysis": {
          "overall_match_fitness": "Strong match with the position requirements",
          "strengths_alignment": ["Technical expertise", "Project experience"],
          "gap_analysis": ["Leadership experience"],
          "growth_potential": "High potential for growth in technical leadership"
      },
      "personality_insights": {
        "summary": "Brief summary of the candidate's professional personality",
        "traits": [
          {
            "name": "Adaptability",
            "score": 85,
            "description": "Demonstrates flexibility in handling changing priorities"
          }
        ],
        "communication_style": [
          {
            "name": "Collaborative",
            "score": 90,
            "description": "Works well in team settings and values input from others"
          }
        ],
        "work_preferences": ["Remote work", "Agile environments"],
        "strengths": ["Problem-solving", "Technical expertise"],
        "areas_for_growth": ["Public speaking", "Strategic thinking"]
      },
      "improvement_suggestions": [
          "Add more quantifiable achievements",
          "Include relevant certifications",
          "Expand on technical project details"
      ]
  }`;

  try {
    const openaiApiKey = await getOpenAIApiKey();
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `Resume Text:\n${resumeText}` },
      ],
      temperature: 0.0,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("No response from OpenAI.");
    }

    let rawContent = response.choices[0].message.content;
    rawContent = rawContent.trim();

    if (rawContent.startsWith("```")) {
      const start = rawContent.indexOf("{");
      const end = rawContent.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        rawContent = rawContent.substring(start, end + 1);
      } else {
        throw new Error("Invalid JSON structure in AI response.");
      }
    }

    const parsedContent = JSON.parse(rawContent);

    // Ensure required fields exist and set defaults if missing
    const requiredKeys = [
      "summary",
      "total_experience_years",
      "skills",
      "experience_level",
      "education",
      "work_experience",
      "projects",
      "scores",
      "skill_match",
      "improvement_suggestions",
    ];

    for (const key of requiredKeys) {
      if (!(key in parsedContent)) {
        parsedContent[key] = key === "scores" ? {} : [];
      }
    }

    // Validate scores and provide defaults
    const requiredScores = ["overall", "experience", "education", "skills", "projects", "presentation"];
    for (const category of requiredScores) {
      if (!(category in parsedContent.scores)) {
        parsedContent.scores[category] = {
          score: 70,
          feedback: `Basic ${category} information provided`,
        };
      }
    }

    // Provide default total experience if missing
    if (!("total_experience_years" in parsedContent)) {
      parsedContent.total_experience_years = 0; // Default to 0 if not found
    }

    // Send parsed response to the client
    res.status(200).json(parsedContent);
  } catch (error) {
    console.error("Error processing resume:", error.message);
    res.status(500).json({ error: "Failed to process the resume.", details: error.message });
  }
});

app.post("/process-resume", async (req, res) => {
  const { resumeText } = req.body;

  if (!resumeText) {
    return res.status(400).json({ error: "Invalid input. Ensure resumeText is provided." });
  }

  const systemMessage = `
  You are a highly accurate resume parser. Your task is to extract the following details from the resume:

  1. **Contact Information:**
    - Name: Full name of the candidate. Ensure the name is in the same language as the resume.
    - Email: Valid email address.
    - Phone: Phone number in a standardized format (e.g., 123-456-7890).
    - Location: City and abbreviated country name only (e.g., "New York, USA"). Ensure the location is in the same language as the resume.
    - LinkedIn URL: Full LinkedIn profile URL.

  2. **Tags:**
    - Extract exactly 60 of the most relevant skill tags from the resume.
    - Ensure all tags are in lowercase and in the same language as the resume.
    - Include:
      - Technical skills (e.g., "javascript", "python", "react").
      - Soft skills (e.g., "teamwork", "communication").
      - Job titles from work experience (e.g., "software engineer", "project manager").
      - Tools, frameworks, and methodologies (e.g., "aws", "agile", "docker").
    - Prioritize skills and job titles that are most relevant to the candidate's experience.

  3. **Language Detection:**
    - Detect the language of the resume text and return the language code (e.g., 'en' for English, 'es' for Spanish, 'fr' for French, 'he' for Hebrew).

  4. **Introduction/About Section:**
    - Determine if the resume contains an introduction or "about" section.
    - If present, extract the text of the introduction or "about" section.

  5. **Output Format:**
    - Respond with ONLY valid JSON. Do not include any explanations or markdown.
    - Respond in detected language
    - Follow the exact format below:

  {
    "contact": {
      "name": "John Doe",
      "email": "johndoe@example.com",
      "phone": "123-456-7890",
      "location": "New York, USA",
      "linkedin": "https://linkedin.com/in/johndoe"
    },
    "tags": [tag1, tag2, ...],
    "language": "en",
    "introduction": {
      "present": true,
      "text": "A brief introduction or about section text if present."
    }
  }`;

  try {
    const openaiApiKey = await getOpenAIApiKey();
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `Resume Text:\n${resumeText}` },
      ],
      temperature: 0.0,
    });

    let rawContent = response.choices[0].message.content.trim();

    // Clean the response to ensure valid JSON
    if (rawContent.startsWith("```")) {
      const start = rawContent.indexOf("{");
      const end = rawContent.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        rawContent = rawContent.substring(start, end + 1);
      } else {
        throw new Error("Invalid JSON structure in AI response.");
      }
    }

    const parsedContent = JSON.parse(rawContent);

    // Validate that contact information, tags, language, and introduction exist
    if (!parsedContent.contact || !parsedContent.tags || !parsedContent.language || !parsedContent.introduction) {
      throw new Error("Missing required fields in the parsed response.");
    }

    res.status(200).json(parsedContent);
  } catch (error) {
    console.error("Error processing resume:", error.message);
    res.status(500).json({ error: "Failed to process the resume.", details: error.message });
  }
});

app.post("/generate-interview-prep", async (req, res) => {
  try {
    const openaiApiKey = await getOpenAIApiKey();
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const { jobTitle, jobDescription, resumeData } = req.body;

    // Validate required fields
    if (!jobTitle || !jobDescription) {
      return res.status(400).json({
        error: "Job title and job description are required",
      });
    }

    // Validate resumeData
    if (resumeData && typeof resumeData !== "string") {
      return res.status(400).json({
        error: "Resume data must be provided as a string",
      });
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: INTERVIEW_PREP_PROMPT },
        {
          role: "user",
          content: `Job Title: ${jobTitle}\n\nJob Description: ${jobDescription}${
            resumeData ? `\n\nResume Data: ${JSON.stringify(resumeData)}` : ""
          }`,
        },
      ],
      temperature: 0.0,
    });

    // Parse and validate the response
    let result;
    try {
      let rawContent = completion.choices[0].message.content.trim();

      // Handle cases where response includes markdown
      if (rawContent.startsWith("```")) {
        const start = rawContent.indexOf("{");
        const end = rawContent.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          rawContent = rawContent.substring(start, end + 1);
        } else {
          throw new Error("Invalid JSON structure in AI response.");
        }
      }

      // Parse JSON content
      result = JSON.parse(rawContent);

      // Validate required fields in the response
      if (
        !result.questions ||
        !Array.isArray(result.questions) ||
        !result.preparationTips ||
        !Array.isArray(result.preparationTips) ||
        !result.keyTopics ||
        !Array.isArray(result.keyTopics)
      ) {
        throw new Error("Incomplete or invalid response structure.");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw AI response:", completion.choices[0].message.content); // Log raw response
      return res.status(500).json({
        error: "Failed to parse interview preparation materials",
        details: parseError.message,
      });
    }

    // Return the generated content
    res.json(result);
  } catch (error) {
    console.error("Interview prep generation error:", error);
    res.status(500).json({
      error: "Failed to generate interview preparation materials",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/questionnaire/generate-link", async (req, res) => {
  try {
    const { jobTitle, jobDescription, candidateId, language } = req.body;

    const questionnaireLink = `https://message-scanner-extension.web.app/questionnaire/${candidateId}`;

    // Validate request body
    if (!jobTitle || !jobDescription || !language) {
      return res.status(400).json({ error: "jobTitle, jobDescription, and language are required" });
    }

    // Fetch OpenAI API key
    const openaiApiKey = await getOpenAIApiKey();
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Get the full language name from the languageMap
    const fullLanguage = languageMap[language] || "English"; // Default to English if language is not found

    // Generate technical assessment test
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a technical assessment generator. Generate a technical assessment test in ${fullLanguage}. Format the response as JSON: {
            "questions": [{
              "question": string,
              "options": string[] or null,
              "answer": string,
              "explanation": string,
              "difficulty": "Basic"|"Intermediate"|"Advanced",
              "skillCategory": string
            }],
          }. Generate 5-8 relevant technical questions based on the job description: ${jobDescription}.`,
        },
        {
          role: "user",
          content: `Generate test for candidate the applying for ${jobTitle} position`,
        },
      ],
      temperature: 0.0,
      response_format: { type: "json_object" }, // Ensure the response is in JSON format
    });

    // Extract and parse JSON content from the response
    let rawContent = response.choices[0].message.content;
    if (rawContent.startsWith("```")) {
      rawContent = rawContent.replace(/```json|```/g, "").trim();
    }

    const parsedContent = JSON.parse(rawContent);

    // Validate parsed content structure
    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      throw new Error("Invalid JSON structure: 'questions' array is missing or invalid");
    }

    // Set expiration time (e.g., 7 days from now)
    const expirationTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Return the questionnaire data and metadata to the front end
    res.status(200).json({
      questions: parsedContent.questions,
      timeLimit: 60,
      passingScore: 80,
      expirationTime,
      link: questionnaireLink,
      isAnswered: false,
      totalScore: 0,
    });
  } catch (error) {
    console.error("Error generating questionnaire link:", error);
    res.status(500).json({
      error: "Failed to generate questionnaire link",
      details: error.message,
    });
  }
});

app.post("/generate-questionnaire", async (req, res) => {
  try {
    const { jobTitle, jobDescription, jobId, language } = req.body;

    const questionnaireLink = `https://message-scanner-extension.web.app/questionnaire/${jobId}`;

    // Validate request body
    if (!jobTitle || !jobDescription || !language) {
      return res.status(400).json({ error: "jobTitle, jobDescription, and language are required" });
    }

    // Fetch OpenAI API key
    const openaiApiKey = await getOpenAIApiKey();
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Get the full language name from the languageMap
    const fullLanguage = languageMap[language] || "English"; // Default to English if language is not found

    // Generate technical assessment test
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a technical assessment generator. Generate a technical assessment test in ${fullLanguage}. Format the response as JSON: {
            "questions": [{
              "question": string,
              "options": string[] or null,
              "answer": string,
              "explanation": string,
              "difficulty": "Basic"|"Intermediate"|"Advanced",
              "skillCategory": string
            }],
          }. Generate 10 relevant technical questions based on the job description: ${jobDescription}.`,
        },
        {
          role: "user",
          content: `Generate test for the candidates applying for ${jobTitle} position`,
        },
      ],
      temperature: 0.0,
      response_format: { type: "json_object" }, // Ensure the response is in JSON format
    });

    // Extract and parse JSON content from the response
    let rawContent = response.choices[0].message.content;
    if (rawContent.startsWith("```")) {
      rawContent = rawContent.replace(/```json|```/g, "").trim();
    }

    const parsedContent = JSON.parse(rawContent);

    // Validate parsed content structure
    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      throw new Error("Invalid JSON structure: 'questions' array is missing or invalid");
    }

    // Set expiration time (e.g., 7 days from now)
    const expirationTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Return the questionnaire data and metadata to the front end
    res.status(200).json({
      questions: parsedContent.questions,
      timeLimit: 60,
      passingScore: 80,
      expirationTime,
      link: questionnaireLink,
      isAnswered: false,
      totalScore: 0,
    });
  } catch (error) {
    console.error("Error generating questionnaire link:", error);
    res.status(500).json({
      error: "Failed to generate questionnaire link",
      details: error.message,
    });
  }
});

app.post("/evaluate-answer", async (req, res) => {
  try {
    const { userAnswer, expectedAnswer } = req.body;

    // Validate input
    if (!userAnswer || !expectedAnswer) {
      return res.status(400).json({ error: "Both userAnswer and expectedAnswer are required." });
    }

    const openaiApiKey = await getOpenAIApiKey();
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Use OpenAI to evaluate the answer
    const evaluationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert evaluator. Compare the user's answer with the expected answer and provide a score from 1 to 100 based on how well the user's answer matches the expected answer. Respond with a JSON object in this format: { "score": number, "feedback": string }.`,
        },
        {
          role: "user",
          content: `User's Answer: ${userAnswer}\n\nExpected Answer: ${expectedAnswer}`,
        },
      ],
      temperature: 0.0, // Use low temperature for deterministic output
      response_format: { type: "json_object" }, // Ensure the response is in JSON format
    });

    // Parse the response
    const evaluationResult = JSON.parse(evaluationResponse.choices[0].message.content);

    // Validate the response
    if (typeof evaluationResult.score !== "number" || !evaluationResult.feedback) {
      throw new Error("Invalid evaluation response from OpenAI.");
    }

    // Return the evaluation result
    res.status(200).json(evaluationResult);
  } catch (error) {
    console.error("Error evaluating answer:", error);
    res.status(500).json({ error: "Failed to evaluate the answer.", details: error.message });
  }
});

app.post("/ai-process-resume", async (req, res) => {
  const { resumeText } = req.body;

  if (!resumeText) {
    return res.status(400).json({ error: "Invalid input. Ensure resumeText is provided." });
  }

  const systemMessage = `
  You are a highly accurate resume parser. Your task is to extract the following details from the resume:

  1. **Contact Information:**
    - Name: Full name of the candidate. Ensure the name is in the same language as the resume.
    - Email: Valid email address.
    - Phone: Phone number in a standardized format (e.g., 123-456-7890).
    - Location: City and abbreviated country name only (e.g., "New York, USA"). Ensure the location is in the same language as the resume.
    - LinkedIn URL: Full LinkedIn profile URL.

  2. **Job Title Tags:**
    - Extract exactly 10 'job_title_tags' based on the job positions and descriptions found in the work experience section for the last 3 years.
    - Analyze the job experience details to suggest diverse, synonymous tags that accurately capture the role. For example, if the candidate worked as a front-end developer, consider variations such as "front-end developer", "frontend developer", "front-end programmer", and "frontend programmer", as applicable.
    - Ensure job titles are in lowercase, in the same language as the resume, and avoid redundant repetition.

  3. **Mandatory Tags:**
    - Extract exactly 30 'mandatory_tags' based on the most relevant skill tags from the resume.
    - Ensure all tags are in lowercase and in the same language as the resume.
    - Include:
      - Technical skills (e.g., "javascript", "python", "react").
      - Soft skills (e.g., "teamwork", "communication").
      - Tools, frameworks, and methodologies (e.g., "aws", "agile", "docker").
    - Prioritize skills that are most relevant to the candidate's experience.

  4. **Language Detection:**
    - Detect the language of the resume text and return the language code (e.g., 'en' for English, 'es' for Spanish, 'fr' for French, 'he' for Hebrew).

  5. **Introduction/About Section:**
    - Determine if the resume contains an introduction or "about" section.
    - If present, extract the text of the introduction or "about" section.

  6. **Output Format:**
    - Respond with ONLY valid JSON. Do not include any explanations or markdown.
    - Respond in the detected language.
    - Follow the exact format below:

  {
    "contact": {
      "name": "John Doe",
      "email": "johndoe@example.com",
      "phone": "123-456-7890",
      "location": "New York, USA",
      "linkedin": "https://linkedin.com/in/johndoe"
    },
    "job_title_tags": ["software engineer", "data analyst", ...], // Exactly 10 tags
    "mandatory_tags": ["javascript", "python", "teamwork", ...], // Exactly 30 tags
    "language": "en",
    "introduction": {
      "present": true,
      "text": "A brief introduction or about section text if present."
    }
  }`;

  try {
    const openaiApiKey = await getOpenAIApiKey();
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `Resume Text:\n${resumeText}` },
      ],
      temperature: 0.7,
    });

    let rawContent = response.choices[0].message.content.trim();

    // Clean the response to ensure valid JSON
    if (rawContent.startsWith("```")) {
      const start = rawContent.indexOf("{");
      const end = rawContent.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        rawContent = rawContent.substring(start, end + 1);
      } else {
        throw new Error("Invalid JSON structure in AI response.");
      }
    }

    const parsedContent = JSON.parse(rawContent);

    // Validate that required fields exist
    if (
      !parsedContent.contact ||
      !parsedContent.job_title_tags ||
      !parsedContent.mandatory_tags ||
      !parsedContent.language ||
      !parsedContent.introduction
    ) {
      throw new Error("Missing required fields in the parsed response.");
    }

    // Validate the number of tags
    // if (parsedContent.job_title_tags.length !== 10 || parsedContent.mandatory_tags.length !== 30) {
    //   throw new Error("Incorrect number of tags generated.");
    // }

    // Function to generate alternative tags
    const generateAlternativeTags = async (tags, language) => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Provide 3 synonyms or alternative words for each of the following tags in ${languageMap[language] || 'English'} language. Store all alternative tags in a single array. Respond with JSON in the following format: {"alternative_tags": ["synonym1", "synonym2", "synonym3", ...]}.`,
          },
          {
            role: "user",
            content: `Tags: ${tags.join(", ")}`,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      return JSON.parse(response.choices[0].message.content || "{}").alternative_tags || [];
    };

    // Generate alternative tags for mandatory_tags in English and Hebrew
    const alternativeMandatoryTagsEn = await generateAlternativeTags(parsedContent.mandatory_tags, "en");
    const alternativeMandatoryTagsHe = await generateAlternativeTags(parsedContent.mandatory_tags, "he");

    // Generate alternative tags for job_title_tags in English and Hebrew
    const alternativeJobTitleTagsEn = await generateAlternativeTags(parsedContent.job_title_tags, "en");
    const alternativeJobTitleTagsHe = await generateAlternativeTags(parsedContent.job_title_tags, "he");

    // Add alternative tags to the final response
    const finalResponse = {
      ...parsedContent,
      alternative_job_title_tags_en: alternativeJobTitleTagsEn,
      alternative_job_title_tags_he: alternativeJobTitleTagsHe,
      alternative_mandatory_tags_en: alternativeMandatoryTagsEn,
      alternative_mandatory_tags_he: alternativeMandatoryTagsHe,
    };

    res.status(200).json(finalResponse);
  } catch (error) {
    console.error("Error processing resume:", error.message);
    res.status(500).json({ error: "Failed to process the resume.", details: error.message });
  }
});

exports.api = functions.https.onRequest(app);