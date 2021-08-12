const core = require("@actions/core");
const github = require("@actions/github");
const asana = require("asana");

async function asanaOperations(asanaPAT, targets, taskId, taskComment) {
  try {
    const client = asana.Client.create({
      defaultHeaders: { "asana-enable": "new-sections,string_ids" },
      logAsanaChangeWarnings: false,
    }).useAccessToken(asanaPAT);

    const task = await client.tasks.findById(taskId);

    targets.forEach(async (target) => {
      let targetProject = task.projects.find((project) => project.name === target.project);
      if (targetProject) {
        let targetSection = await client.sections
          .findByProject(targetProject.gid)
          .then((sections) => sections.find((section) => section.name === target.section));
        if (targetSection) {
          await client.sections.addTask(targetSection.gid, { task: taskId });
          core.info(`Moved to: ${target.project}/${target.section}`);
        } else {
          core.error(`Asana section ${target.section} not found.`);
        }
      } else {
        core.info(`This task does not exist in "${target.project}" project`);
      }
    });

    if (taskComment && github.context.eventName !== "push") {
      await client.tasks.addComment(taskId, {
        text: taskComment,
      });
      core.info("Added the pull request link to the Asana task.");
    }
  } catch (ex) {
    core.setFailed(error.message);
  }
}

async function main() {
  try {
    const ASANA_PAT = core.getInput("asana-pat");
    const TARGETS = core.getInput("targets");
    const TRIGGER_PHRASE = core.getInput("trigger-phrase");
    const TASK_COMMENT = core.getInput("task-comment");
    let PULL_REQUEST;
    core.info(github.context);

    if (github.context.eventName === "push") {
      const token = core.getInput("github-token", { required: true }) || process.env.GITHUB_TOKEN;
      core.info(token);
      const state = (core.getInput("state", { required: false }) || "open").toLowerCase();
      const sha = core.getInput("sha", { required: true });

      const octokit = github.getOctokit(token);
      const context = github.context;
      const result = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: sha,
      });

      const prs = result.data.filter((el) => state === "all" || el.state === state);
      PULL_REQUEST = prs[0];
    } else {
      PULL_REQUEST = github.context.payload.pull_request;

      if (TASK_COMMENT) {
        taskComment = `${TASK_COMMENT} ${PULL_REQUEST.html_url}`;
        core.info(taskComment);
      }
    }
    const REGEX = new RegExp(
      `${TRIGGER_PHRASE} *\\[(.*?)\\]\\(https:\\/\\/app.asana.com\\/(\\d+)\\/(?<project>\\d+)\\/(?<task>\\d+).*?\\)`,
      "g"
    );
    let taskComment = null,
      targets = TARGETS ? JSON.parse(TARGETS) : [],
      parseAsanaURL = REGEX.exec(PULL_REQUEST.body);

    if (!parseAsanaURL) {
      throw new Error("Asana task URL not found!");
    }
    if (!ASANA_PAT) {
      throw new Error("Asana PAT not found!");
    }
    // Works for multiple links in PR description
    REGEX.lastIndex = 0;
    while ((parseAsanaURL = REGEX.exec(PULL_REQUEST.body)) !== null) {
      let taskId = parseAsanaURL.groups.task;
      if (taskId) {
        core.info(parseAsanaURL.toString());
        await asanaOperations(ASANA_PAT, targets, taskId, taskComment);
      } else {
        throw new Error(`Invalid Asana task URL after the trigger phrase ${TRIGGER_PHRASE}`);
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
