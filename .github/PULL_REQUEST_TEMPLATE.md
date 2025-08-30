<!--
Thank you for contributing to this project! You must fill out the information below before we can review this pull request. By explaining why you're making a change (or linking to an issue) and what changes you've made, we can triage your pull request to the best possible team for review.
-->

### Why:

<!-- Paste the issue link or number here -->
Closes: 

<!-- If there's an existing issue for your change, please link to it above.
If there's _not_ an existing issue, please open one first to make it more likely that this update will be accepted: https://github.com/github/docs/issues/new/choose. -->

### What's being changed (if available, include any code snippets, screenshots, or gifs):

<!-- Let us know what you are changing. Share anything that could provide the most context.
If you made changes to the `content` directory, a table will populate in a comment below with links to the review and current production articles. -->

### Risk Level:
<!-- Please assess the risk level of these changes -->
- [ ] Low risk (documentation updates, minor fixes)
- [ ] Medium risk (new features, configuration changes)  
- [ ] High risk (security changes, workflow modifications)

### Check off the following:

#### Content Requirements
- [ ] A subject matter expert (SME) has reviewed the technical accuracy of the content in this PR. In most cases, the author can be the SME. Open source contributions may require an SME review from GitHub staff.
- [ ] The changes in this PR meet [the docs fundamentals that are required for all content](http://docs.github.com/en/contributing/writing-for-github-docs/about-githubs-documentation-fundamentals).

#### Technical Requirements  
- [ ] All CI checks are passing and the changes look good in the review environment.
- [ ] If this PR includes devcontainer changes, the `.devcontainer.json` is valid JSON
- [ ] If this PR includes workflow changes, all workflows have explicit `permissions:` declarations
- [ ] If this PR includes workflow changes, all actions are pinned to specific SHA hashes (not `@main`, `@master`, `@latest`)
- [ ] No secrets or sensitive information are included in the changes

#### Security & Compliance (for workflow/security changes)
- [ ] CodeQL security analysis passed
- [ ] Secrets scanning passed (no exposed credentials)  
- [ ] CI governance checks passed (permissions, pins, actionlint)
- [ ] Workflow safety scan passed (no dangerous patterns)

#### Verification Steps
<!-- Describe how you verified these changes work correctly -->
- [ ] I have manually tested these changes locally
- [ ] I have verified the changes work in the review environment
- [ ] I have confirmed no existing functionality is broken

### Notes:
<!-- Any additional context, concerns, or questions for reviewers -->
