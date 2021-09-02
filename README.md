# Github-Asana action

This action integrates asana with github, mainly to enforce linking an Asana task to a PR in the description. When a PR is opened or reopened it will add a link to the PR in the Asana task provided. Any errors in this action will cause the action to fail.

### Prerequisites

- Asana account with the permission on the particular project you want to integrate with.
- Must provide the task url in the PR description.

## Inputs

### `asana-pat`

**Required** Your asana public access token, you can find it in [asana docs](https://developers.asana.com/docs/#authentication-basics).

### `task-comment`

**Optional** If any comment is provided, the action will add a comment to the specified asana task with pull request link following the comment.

## Sample PR Description

```
> Brief description (if title only is not enough)

### Asana task (Required)

https://app.asana.com/0/1/2

### PR Checklist

- [ ] Automated test coverage for _all_ major use cases
- [ ] Automated test coverage for failure and error cases
- [ ] Failing automated test(s) for each bug/fix

```

## Examples

#### Without special characters:

```yaml
name: Asana task check

on:
  pull_request:

jobs:
  asana:
    runs-on: ubuntu-latest
    steps:
      - name: Add to Asana
        uses: invoice-simple/is-asana-github-action@v1.1.4
        with:
          asana-pat: ${{ secrets.ASANA_TOKEN }}
          task-comment: "Pull Request: "
```

## Publishing new version:

```
git add action.yml index.js node_modules/\* package.json package-lock.json README.md
git commit -m "publishing first version"
git tag -a -m "v1.0.0" v1.0.0
git push --follow-tags
```
