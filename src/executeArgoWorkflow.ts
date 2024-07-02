import { Deps, Environment, ExecFn, Workflow } from './api'
import { get } from 'lodash'
import { join } from 'path'

async function shellExec(
    exec: ExecFn,
    command: string,
    args: string[],
    env: Environment
): Promise<[number, string, string]> {
    const stdoutBuffer: string[] = []
    const stderrBuffer: string[] = []
    const exitCode = await exec(command, args, {
        env,
        cwd: env.GITHUB_WORKSPACE || process.cwd(),
        listeners: {
            stdout(data) {
                stdoutBuffer.push(data.toString())
            },
            stderr(data) {
                stderrBuffer.push(data.toString())
            }
        },
        ignoreReturnCode: true,
    })
    return [exitCode, stdoutBuffer.join(''), stderrBuffer.join('')]
}

export default async function submitWorkflowToArgo(
    { deployEnv, cwd, name, params, workflowFile }: Workflow,
    { core, exec }: Deps,
    env: Environment
): Promise<boolean> {

    const kubeconfig = join(cwd, './kilauea/', `./kubefiles/${deployEnv}/kubeconfig-github-actions/${deployEnv}-kube-config-admins.yml`)
    const workflowFileAbsolutePath = join(cwd, './peachjar-aloha/', workflowFile)

    core.info(`Running workflow for ${name}`)

    await exec('cat', ['~/.aws/credentials'])
    await exec('echo', ['$AWS_ACCESS_KEY_ID'])


    const [submitExitCode, submitStdout, submitStderr] = await shellExec(exec, 'argo', [
        'submit', workflowFileAbsolutePath, '--kubeconfig', kubeconfig,
        ...Object.entries(params)
            .reduce((acc, [k, v]) => acc.concat('-p', `${k}=${v}`), [] as string[]),
        '--wait', '-o=json',
    ], env)

    if (submitExitCode > 0) {
        core.debug('Argo submit failed.')
        core.info(submitStderr)
        return false
    }

    const result = JSON.parse(submitStdout.trim())

    const workflowId = get(result, 'metadata.name')

    core.debug(`Getting results for ${name}`)

    const [getExitCode, getStdout, getStderr] = await shellExec(exec, 'argo', [
        '--kubeconfig', kubeconfig,
        'get', workflowId,
        '-o=json'
    ], env)

    if (getExitCode > 0) {
        core.debug('Unable to retrieve workflow status.')
        core.info(getStderr)
        return false
    }

    core.debug(`Parsing workflow results file for ${name}`)

    const results = JSON.parse(getStdout.trim())

    const status = get(results, 'status.phase')

    core.debug(`Status for workflow ${name}: ${status}`)

    return status === 'Succeeded'
}
