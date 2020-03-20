import { Deps, Environment, Workflow } from './api'

import { get } from 'lodash'

export default async function submitWorkflowToArgo(
    { deployEnv, cwd, name, params, workflowFile }: Workflow,
    { core, exec, readFileAsync }: Deps,
    env: Environment
): Promise<boolean> {

    const idFile = `workflow.${name}.id`
    const workflowOutputFile = `/tmp/workflow.${name}.result.json`
    const kubeconfig = `kilauea/kubefiles/${deployEnv}/kubectl_configs/${deployEnv}-kube-config-admins.yml`

    core.debug(`Running workflow for ${name}`)

    await exec('argo', [
        '--kubeconfig',
        kubeconfig,
        'submit',
        workflowFile,
        ...Object.entries(params)
            .reduce((acc, [k, v]) => acc.concat('-p', `${k}=${v}`), [] as string[]),
        '--wait', '-o=json',
        '|', 'jq', '-r', '.metadata.name', '>', idFile,
    ], {
        cwd,
        env,
    })

    core.debug(`Getting results for ${name}`)

    await exec('argo', [
        '--kubeconfig',
        kubeconfig,
        'get', `\`cat ${idFile}\``, '-o=json', '>', workflowOutputFile,
    ], {
        cwd,
        env,
    })

    core.debug(`Reading workflow results file for ${name}`)

    const resultsFile = await readFileAsync(workflowFile, 'utf-8')

    core.debug(`Parsing workflow results file for ${name}`)

    const results = JSON.parse(resultsFile)

    const status = get(results, 'spec.status.phase')

    core.debug(`Status for workflow ${name}: ${status}`)

    return status === 'Succeeded'
}
