const dotenv = require("dotenv").config({ path: __dirname + "/../../.env" });
const OpenAI = require("openai");
const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("node:fs/promises");
const { fingerPrint } = require("../lib/fingerPrint.ts");
const { Client, TablesDB, ID, Query } = require("node-appwrite");

const client = new Client();
client
  .setEndpoint("https://sfo.cloud.appwrite.io/v1")
  .setProject(process.env.PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const tablesDB = new TablesDB(client);

const openAi = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateResponse(body) {
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
            // text: "I’m hitting an issue where my DELETE request fails whenever I include a JSON body. The server responds with an error saying DELETE with a payload isn’t supported.\n",
            text: body.userError,
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
  return response;
}

async function getResetTime(req, res) {
  const body = req.body;
  const fingerPrintString = fingerPrint(req);
  try {
    const getTime = await tablesDB.listRows({
      databaseId: process.env.DATABASE_ID,
      tableId: "query_table",
      queries: [Query.equal("client_fingerprint", fingerPrintString)],
    });
    const resBody = {
      resetTime: getTime.rows[0].reset_time,
      remaining_queries: getTime.rows[0].queries_remaining,
    };
    res.status(200).json({ resBody });
  } catch (error) {
    console.log(error);
  }
}

async function analyseIssue(req, res) {
  const body = req.body;
  const fingerPrintString = fingerPrint(req);
  const now = new Date();

  try {
    const checkIfuserExist = await tablesDB.listRows({
      databaseId: process.env.DATABASE_ID,
      tableId: "query_table",
      queries: [Query.equal("client_fingerprint", fingerPrintString)],
    });
    //1761510157335
    if (checkIfuserExist) {
      if (checkIfuserExist.rows[0].reset_time - now.getTime() < 0) {
        const getUser = await tablesDB.listRows({
          databaseId: process.env.DATABASE_ID,
          tableId: "query_table",
          queries: [Query.equal("client_fingerprint", fingerPrintString)],
        });
        const resetAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
        const updateUser = await tablesDB.updateRow({
          databaseId: process.env.DATABASE_ID,
          tableId: "query_table",
          rowId: getUser.rows[0].$id,
          data: { queries_remaining: 5, reset_time: resetAt.getTime() },
        });
        console.log(updateUser, "upadate");
        return;
      } else if (checkIfuserExist.rows[0].queries_remaining <= 0) {
        return res.status(429).json({ error: "Daily limit exceeded" });
      } else if (
        checkIfuserExist.rows[0].reset_time - now.getTime() > 0 &&
        checkIfuserExist.rows[0].queries_remaining > 0
      ) {
        const response = await generateResponse(body);
        const getUser = await tablesDB.listRows({
          databaseId: process.env.DATABASE_ID,
          tableId: "query_table",
          queries: [Query.equal("client_fingerprint", fingerPrintString)],
        });
        const reduceRemaingingQueries = await tablesDB.updateRow({
          databaseId: process.env.DATABASE_ID,
          tableId: "query_table",
          rowId: getUser.rows[0].$id,
          data: {
            queries_remaining: getUser.rows[0].queries_remaining - 1,
          },
        });
        return res.status(200).json({ output: response.output_text });
      }
    }
  } catch (error) {
    console.log(error);
  }
}

module.exports = { router, analyseIssue, getResetTime };
