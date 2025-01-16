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
    
    const context = `
      Job Title: ${job_title}
      Company: ${company_name}
      Industry: ${industry}
      Location: ${location}
      Original Description:
      ${description}`;

    const [descriptionResponse, tagsResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional job description writer. Using the provided context (job title, company, industry, and location), enhance the given job description to be more professional, compelling, and well-structured. Include key responsibilities, requirements, and benefits in a clear format."
          },
          { role: "user", content: context }
        ],
        temperature: 0.7,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Extract exactly 10 most relevant skill tags from the job description. Respond with JSON in this format: {'tags': [tag1, tag2, ...]}",
          },
          { role: "user", content: description }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    ]);

    const improvedDescription = descriptionResponse.choices[0].message.content || '';
    const tags = tagsResponse.choices[0].message.content || '{}';

    res.json({
      description: improvedDescription,
      tags: tags
    });
  } catch (error) {
    console.error('Error generating description:', error);
    res.status(500).json({
      error: 'Failed to generate description',
      details: error.message, // Include error details for easier debugging
    });
  }
});

app.post("/match-resume", async (req, res) => {
  const { resumeText, tags } = req.body;

  if (!resumeText || !tags || !Array.isArray(tags)) {
    return res.status(400).json({ error: "Invalid input. Ensure resumeText and requiredTags are provided." });
  }

  const systemMessage = `
  You are a resume parser and scorer. Extract the following information from the resume:
  - Total years of work experience.
  - Key details such as professional summary, skills, education, work experience, projects, and certifications.
  - Provide numerical scores (0-100) for overall quality, experience, education, skills, projects, and presentation.

  Analyze the following required skills: ${tags.join(", ")}.
  - Skill Match Score (0-100): How well the resume matches the required skills.
  - Matching Skills: List of skills that match the requirements.
  - Missing Skills: List of required skills that are missing from the resume.

  Respond with ONLY valid JSON, no markdown, no explanations.
  Format:
  {
      "summary": "2-3 sentence professional summary",
      "total_experience_years": 5,
      "skills": ["skill1", "skill2"],
      "experience_level": "junior/mid/senior",
      "education": [{"degree": "degree name", "institution": "school name", "year": "year", "gpa": "gpa"}],
      "work_experience": [{"title": "title", "company": "company", "duration": "duration", "highlights": ["achievement1"]}],
      "projects": [{"name": "name", "description": "description", "technologies": ["tech1"]}],
      "scores": {
          "overall": 85,
          "experience": {"score": 80, "feedback": "Good experience but could use more quantifiable achievements"},
          "education": {"score": 90, "feedback": "Strong educational background"},
          "skills": {"score": 85, "feedback": "Good mix of technical and soft skills"},
          "projects": {"score": 80, "feedback": "Projects demonstrate practical experience"},
          "presentation": {"score": 85, "feedback": "Well-structured resume with clear sections"}
      },
      "skill_match": {
          "score": 75,
          "matching_skills": ["skill1", "skill2"],
          "missing_skills": ["skill3"]
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
      temperature: 0.7,
    });

    let rawContent = response.choices[0].message.content;
    // console.log("Raw AI Response:", rawContent);

    // Clean the response to ensure valid JSON
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
  You are a resume parser and job matcher. Extract the following from the resume:
  - Contact information:
    - Name
    - Email
    - Phone
    - Location (City and abbreviation of Country name only)
    - LinkedIn URL
  - Extract exactly 30 most relevant skill tags.

  Respond with ONLY valid JSON, no markdown, no explanations.
  Format:
  {
    "contact": {
      "name": "John Doe",
      "email": "johndoe@example.com",
      "phone": "123-456-7890",
      "location": "New York, USA",
      "linkedin": "linkedin.com/in/johndoe"
    },
    "tags": [tag1, tag2, ...]
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

    // Validate that contact information and tags exist
    if (!parsedContent.contact || !parsedContent.tags) {
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
      temperature: 0.7,
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

exports.api = functions.https.onRequest(app);