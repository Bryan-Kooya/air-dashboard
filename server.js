const express = require('express');
// const cors = require('cors');
const bodyParser = require("body-parser");
const { json } = require('body-parser');
const { OpenAI } = require('openai');
// const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
const port = 5000;

// Middleware
// app.use(cors());
app.use(json());

const openaiApiKey = process.env.OPENAI_API_KEY;

// OpenAI Initialization
const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// PostgreSQL connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL
// });

// Error handling middleware
const errorHandler = (err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
};

// Routes
// app.get('/api/jobs', async (_req, res) => {
//   try {
//     const result = await pool.query('SELECT * FROM job_description ORDER BY created_at DESC');
//     res.json(result.rows);
//   } catch (error) {
//     console.error('Error fetching jobs:', error);
//     res.status(500).json({ error: 'Failed to fetch jobs' });
//   }
// });

app.post('/api/generate', async (req, res) => {
  try {
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
        ]
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
    res.status(500).json({ error: 'Failed to generate description' });
  }
});

// app.post('/jobs', async (req, res) => {
//   try {
//     const { job_title, company_name, industry, location, description, tags } = req.body;
//     const result = await pool.query(
//       'INSERT INTO job_description (job_title, company_name, industry, location, description, tags) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
//       [job_title, company_name, industry, location, description, tags]
//     );
//     res.json({ message: 'Job saved successfully', id: result.rows[0].id });
//   } catch (error) {
//     console.error('Error creating job:', error);
//     res.status(500).json({ error: 'Failed to create job' });
//   }
// });

// app.get('/jobs/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const jobResult = await pool.query('SELECT * FROM job_description WHERE id = $1', [id]);
//     const historyResult = await pool.query(
//       'SELECT * FROM job_description_history WHERE job_id = $1 ORDER BY modified_at DESC',
//       [id]
//     );
    
//     if (jobResult.rows.length === 0) {
//       return res.status(404).json({ error: 'Job not found' });
//     }
    
//     const job = {
//       ...jobResult.rows[0],
//       history: historyResult.rows
//     };
    
//     res.json(job);
//   } catch (error) {
//     console.error('Error fetching job:', error);
//     res.status(500).json({ error: 'Failed to fetch job' });
//   }
// });

// app.put('/jobs/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { job_title, company_name, industry, location, description, tags } = req.body;
    
//     // Start a transaction
//     const client = await pool.connect();
//     try {
//       await client.query('BEGIN');
      
//       // Get current description
//       const currentJob = await client.query(
//         'SELECT description FROM job_description WHERE id = $1',
//         [id]
//       );
      
//       if (currentJob.rows.length === 0) {
//         throw new Error('Job not found');
//       }
      
//       // If description changed, save to history
//       if (description && description !== currentJob.rows[0].description) {
//         await client.query(
//           'INSERT INTO job_description_history (job_id, description) VALUES ($1, $2)',
//           [id, currentJob.rows[0].description]
//         );
//       }
      
//       // Update job
//       const result = await client.query(
//         `UPDATE job_description 
//          SET job_title = COALESCE($1, job_title),
//              company_name = COALESCE($2, company_name),
//              industry = COALESCE($3, industry),
//              location = COALESCE($4, location),
//              description = COALESCE($5, description),
//              tags = COALESCE($6, tags)
//          WHERE id = $7 
//          RETURNING *`,
//         [job_title, company_name, industry, location, description, tags, id]
//       );
      
//       await client.query('COMMIT');
//       res.json(result.rows[0]);
//     } catch (error) {
//       await client.query('ROLLBACK');
//       throw error;
//     } finally {
//       client.release();
//     }
//   } catch (error) {
//     console.error('Error updating job:', error);
//     res.status(500).json({ error: 'Failed to update job' });
//   }
// });

// app.delete('/jobs/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     await pool.query('DELETE FROM job_description WHERE id = $1', [id]);
//     res.json({ message: 'Job deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting job:', error);
//     res.status(500).json({ error: 'Failed to delete job' });
//   }
// });

// Apply error handling middleware
app.use(errorHandler);

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});