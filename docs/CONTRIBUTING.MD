# Contributing

To add any code to the `blankdotspace/space-system` repo, you will need to open a PR.

## TypeScript
Blankspace is written fully in TypeScript with strict type checking enabled.

## Steps to open a PR
Blankspace expects its contributors to follow the "Fork and Pull" method to open PRs. Below is a TL;DR for this process

1. Fork `blankdotspace/space-system`
  a. Press the `fork` button at the top of the page
  b. Copy the fork locally (`git clone {your url}`)
  c. Set up the `upstream` to `blankdotspace/space-system` (`git remote add upstream git@github.com:blankdotspace/space-system.git`)
2. Make changes in your fork
3. Commit your changes to your fork and push them to Github
4. Open a PR in the Github webapp

For more details on the "Fork and Pull" method, check out [Github's docs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/about-collaborative-development-models).


## PR Expectations
- All commits follow [conventional commits](https://www.conventionalcommits.org/)
- PR titles begin with either "[FIDGET]" or "[CLIENT]" to show if the changes made are a Fidget submission or a change to the client codebase
- PR bodies outline the changes made and the rationale for them
- All PRs contain no new type errors and are fully valid TypeScript code
- Run `npm run lint` and `npm run check-types` before submitting
