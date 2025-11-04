# SWL Backend Notes

The current branch **work** already contains the fixes that remove the JWT debug logging and clean up the Animales model. They live in commit `ae3cc11` ("Fix JWT verification logging and clean Animales model").

To inspect the commit locally run:

```bash
git show ae3cc11
```

If you need to publish the branch to GitHub:

```bash
git remote -v                         # verify the remote configuration
git remote add origin <URL_DEL_REPOSITORIO>  # only if the remote is not set yet
git push -u origin work
```

After pushing you can open a pull request from `work` into `main`.
