const core = require("@actions/core");
const github = require("@actions/github");
const asana = require("asana");

async function asanaOperations(asanaPAT, taskId, taskComment) {
  try {
    const client = asana.Client.create({
      defaultHeaders: { "asana-enable": "new-sections,string_ids" },
      logAsanaChangeWarnings: false,
    }).useAccessToken(asanaPAT);

    if (taskComment && github.context.eventName !== "push") {
      await client.tasks.addComment(taskId, {
        text: taskComment,
      });
      core.info("Added the pull request link to the Asana task.");
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function getPullRequest() {
  const token = core.getInput("github-token", { required: true }) || process.env.GITHUB_TOKEN;
  const state = (core.getInput("state", { required: false }) || "open").toLowerCase();
  const sha = github.context.sha;

  const octokit = github.getOctokit(token);
  const context = github.context;
  const result = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
    owner: context.repo.owner,
    repo: context.repo.repo,
    commit_sha: sha,
  });

  const prs = result.data.filter((el) => state === "all" || el.state === state);
  return prs[0];
}

async function main() {
  const ASANA_PAT = core.getInput("asana-pat");
  const TRIGGER_PHRASE = core.getInput("trigger-phrase");
  const TASK_COMMENT = core.getInput("task-comment");
  const REGEX = new RegExp(
    `${TRIGGER_PHRASE} *\\[(.*?)\\]\\(https:\\/\\/app.asana.com\\/(\\d+)\\/(?<project>\\d+)\\/(?<task>\\d+).*?\\)`,
    "g"
  );

  let PULL_REQUEST;
  let taskComment = null;

  if (!ASANA_PAT) {
    throw new Error("Asana PAT not found!");
  }

  if (github.context.eventName === "push") {
    PULL_REQUEST = getPullRequest();
    core.info(PULL_REQUEST);
  } else {
    PULL_REQUEST = github.context.payload.pull_request;

    if (TASK_COMMENT) {
      taskComment = `${TASK_COMMENT} ${PULL_REQUEST.html_url}`;
      core.info(taskComment);
    }
  }
  let parseAsanaURL = REGEX.exec(PULL_REQUEST.body);
  if (!parseAsanaURL) {
    throw new Error("Asana task URL not found!");
  }
  // Works for multiple links in PR description
  REGEX.lastIndex = 0;
  while ((parseAsanaURL = REGEX.exec(PULL_REQUEST.body)) !== null) {
    let taskId = parseAsanaURL.groups.task;
    if (taskId) {
      core.info(parseAsanaURL.toString());
      await asanaOperations(ASANA_PAT, taskId, taskComment);
    } else {
      throw new Error(`Invalid Asana task URL after the trigger phrase ${TRIGGER_PHRASE}`);
    }
  }
}

main().catch((err) => core.setFailed(err.message));
