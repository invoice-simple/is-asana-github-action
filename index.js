const core = require("@actions/core");
const github = require("@actions/github");
const asana = require("asana");

async function asanaOperations(asanaPAT, taskId, taskComment) {
  try {
    const client = asana.Client.create({
      defaultHeaders: { "asana-enable": "new-sections,string_ids" },
      logAsanaChangeWarnings: false,
    }).useAccessToken(asanaPAT);

    if (taskComment && github.context.payload.action !== "synchronize") {
      await client.tasks.addComment(taskId, {
        text: taskComment,
      });
      core.info("Added the pull request link to the Asana task.");
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function main() {
  const ASANA_PAT = core.getInput("asana-pat");
  const TASK_COMMENT = core.getInput("task-comment");
  const REGEX = new RegExp(`https:\\/\\/app.asana.com\\/(\\d+)\\/(?<project>\\d+)\\/(?<task>\\d+).*?`, "g");
  const PULL_REQUEST = github.context.payload.pull_request;
  let taskComment = null;

  if (!ASANA_PAT) {
    throw new Error("Asana PAT not found!");
  }

  if (TASK_COMMENT) {
    taskComment = `${TASK_COMMENT} ${PULL_REQUEST.html_url}`;
    core.info(taskComment);
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
      throw new Error(`Invalid Asana task URL`);
    }
  }
}

main().catch((err) => core.setFailed(err.message));
