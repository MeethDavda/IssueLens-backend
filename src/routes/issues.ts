const dotenv = require("dotenv").config({ path: __dirname + "/../../.env" });
const OpenAI = require("openai");
const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("node:fs/promises");

const openAi = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyseIssue(req, res) {
  console.log("called");
  try {
    const response = await openAi.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: `You are a developer assistant specialized in helping users troubleshoot and understand issues related to Appwrite. Your knowledge comes only from the provided GitHub issues and comments in the attached vector store. If no relevant information is found, politely say so instead of guessing.
Format every answer strictly in Markdown with the following structure:

What happened in Appwrite?
Short bullet points explaining the root cause, referencing the GitHub issue if possible
Fix
// Always include a code snippet if relevant
// Wrap it in fenced code blocks with the correct language
### What to do
Bullet list of actionable steps developers can take
Include version numbers, SDK updates, or configuration changes
Keep steps concise and practical`,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "I’m hitting an issue where my DELETE request fails whenever I include a JSON body. The server responds with an error saying DELETE with a payload isn’t supported.\n",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "text",
        },
        verbosity: "medium",
      },
      reasoning: {},
      tools: [
        {
          type: "file_search",
          vector_store_ids: ["vs_68d605794fac8191aafce1423ed8a1fb"],
        },
      ],
      temperature: 1,
      max_output_tokens: 2048,
      store: true,
      include: ["web_search_call.action.sources"],
    });
    console.log(response.output_text);
    res.status(200).json({ output: response.output_text });
  } catch (error) {
    console.log(error);
    res.json({ error: error.message });
  }
}

module.exports = { router, analyseIssue };
