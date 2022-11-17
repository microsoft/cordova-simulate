## Development setup

We welcome any quality bugfixes or contributions!

### Clone the repository

- `git clone https://github.com/microsoft/cordova-simulate.git` to any preferrable folder
- `cd` to the folder you just cloned
- Run `npm ci`

## Debugging

1. In `cordova-simulate` root folder, open terminal and run `npm link`.
2. In cordova application project root folder, open terminal and run `npm link cordova-simulate`.
3. Back to `cordova-simulate` project, add scrpit in package.json: `"debug": "run-script"` (like `"debug": "cd ../helloCordova && simulate"`)
4. Add config in launch.json:
```json
	"configurations": [
	    {
	        "name": "Launch via npm",
	        "type": "node",
	        "request": "launch",
	        "cwd": "${workspaceFolder}",
	        "runtimeExecutable": "npm",
	        "runtimeArgs": [
	            "run-script",
	            "debug"
	        ]
	    }
	]
```
5. Add breakpoint in cordova-simulate and run debugger to start simulating your cordova application.


## Add plugins

Here is related [documentation](https://github.com/microsoft/cordova-simulate/blob/master/README.md#adding-simulation-support-to-plugins) for the details.

## Legal

You will need to complete a Contributor License Agreement (CLA). Briefly, this agreement testifies that you are granting us permission to use the submitted change according to the terms of the project's license, and that the work being submitted is under appropriate copyright.

Please submit a Contributor License Agreement (CLA) before submitting a pull request. You may visit https://cla.microsoft.com to sign digitally. Alternatively, download the agreement ([Microsoft Contribution License Agreement.docx](https://www.codeplex.com/Download?ProjectName=typescript&DownloadId=822190) or [Microsoft Contribution License Agreement.pdf](https://www.codeplex.com/Download?ProjectName=typescript&DownloadId=921298)), sign, scan, and email it back to <cla@microsoft.com>. Be sure to include your github user name along with the agreement. Once we have received the signed CLA, we'll review the request.

## Sending PR

Your pull request should:

- Include a clear description of the change
- Be a child commit of a reasonably recent commit in the **master** branch
  - Requests need not be a single commit, but should be a linear sequence of commits (i.e. no merge commits in your PR)
- It is desirable, but not necessary, for the tests to pass at each commit
- Have clear commit messages
  - e.g. "Refactor feature", "Fix issue", "Add tests for issue"
- Include adequate tests
  - At least one test should fail in the absence of your non-test code changes. If your PR does not match this criteria, please specify why
  - Tests should include reasonable permutations of the target fix/change
  - Include baseline changes with your change
- Ensure there are no linting issues
- To avoid line ending issues, set `autocrlf = input` and `whitespace = cr-at-eol` in your git configuration

## Code of conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.