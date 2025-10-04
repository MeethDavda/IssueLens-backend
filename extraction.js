const dotenv = require("dotenv").config({ path: __dirname + "/.env" });
const axios = require("axios");
const fs = require("node:fs/promises");

const fetchGithub = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    "User-Agent": "IssueLens/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function saveAsTxtBatched(allIssues, batchSize = 500) {
  let batchIndex = 1;

  for (let i = 0; i < allIssues.length; i += batchSize) {
    const batch = allIssues.slice(i, i + batchSize);

    const txtContent = batch
      .map((issue) => {
        let commentsSection = "";
        if (issue.comments.length > 0) {
          commentsSection =
            "Comments:\n" +
            issue.comments
              .map(
                (c) => `- @${sanitizeText(c.author)}: ${sanitizeText(c.body)}`
              )
              .join("\n");
        }

        return `Issue #${issue.issue_number}: ${sanitizeText(issue.title)}
State: ${issue.state}
Labels: ${issue.labels.join(", ")}
URL: ${issue.url}

Description:
${sanitizeText(issue.body) || "No description provided."}

${commentsSection}
`;
      })
      .join("\n----------------------\n\n");

    const fileName = `issues_batch_${String(batchIndex).padStart(
      3,
      "0"
    )}_7.txt`;
    await fs.writeFile(fileName, txtContent, "utf8");
    console.log(`Saved ${fileName} with ${batch.length} issues`);

    batchIndex++;
  }
}

function sanitizeText(text) {
  if (!text) return "";
  return text
    .normalize("NFKC")
    .replace(/\u200B/g, "") // zero-width space
    .replace(/\u00A0/g, " ") // non-breaking space
    .replace(/\u2028|\u2029/g, "\n"); // line/paragraph separators → newlines
}

async function getIssues() {
  let page = 85;
  const per_page = 100;
  const allIssues = [];
  let i = 85;

  try {
    while (i != 100) {
      const response = await fetchGithub.get("repos/appwrite/appwrite/issues", {
        params: { per_page, page, state: "all" },
      });

      const issues = response.data;
      console.log(`Fetched page ${page}: ${issues.length} items`);

      for (const issue of issues) {
        const issueData = {
          url: issue.url,
          issue_number: issue.number,
          title: issue.title,
          state: issue.state,
          labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name)),
          body: issue.body,
          comments: [],
        };

        // fetch comments for this issue
        if (issue.comments > 0) {
          try {
            const commentsRes = await fetchGithub.get(issue.comments_url);
            if (Array.isArray(commentsRes.data)) {
              issueData.comments = commentsRes.data.map((c) => ({
                author: c.user?.login,
                body: c.body,
                url: c.html_url,
              }));
            }
          } catch (err) {
            console.error(
              `Error fetching comments for #${issue.number}`,
              err.message
            );
          }
        }

        allIssues.push(issueData);
      }

      if (issues.length < per_page) break; // no more pages
      page++;
      i++;
      await sleep(500); // small delay to avoid rate limit
    }

    // save once at the end
    await saveAsTxtBatched(allIssues, 500);
    console.log(`Saved ${allIssues.length} issues to issues.json`);
  } catch (error) {
    console.error(error.message);
  }
}

getIssues();
