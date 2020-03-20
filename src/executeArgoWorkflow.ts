import { Deps, Environment, Workflow } from './api'

import { get } from 'lodash'
import { join } from 'path'

export default async function submitWorkflowToArgo(
    { deployEnv, cwd, name, params, workflowFile }: Workflow,
    { core, exec, readFileAsync }: Deps,
    env: Environment
): Promise<boolean> {

    const idFile = `workflow.${name}.id`
    const workflowOutputFile = `/tmp/workflow.${name}.result.json`
    const kubeconfig = join(cwd, './kilauea/', `./kubefiles/${deployEnv}/kubectl_configs/${deployEnv}-kube-config-admins.yml`)
    const workflowFileAbsolutePath = join(cwd, './peachjar-aloha/', workflowFile)

    core.debug(`Running workflow for ${name}`)

    const paramsString = Object.entries(params)
        .reduce((acc, [k, v]) => acc.concat('-p', `${k}=${v}`), [] as string[])
        .join(' ')

    await exec('sh', [
        '-c',
        `"/usr/local/bin/argo --kubeconfig ${kubeconfig} submit ${workflowFileAbsolutePath} \
         ${paramsString} --wait -o=json | jq -r .metadata.name > ${idFile}"`
            .trim().replace(/\n/gim, ' ').replace(/\s+/gm, ' ')
    ], {
        env,
    })

    core.debug(`Getting results for ${name}`)

    await exec('sh', [
        '-c',
        `"/usr/local/bin/argo --kubeconfig ${kubeconfig} get \`cat ${idFile}\` -o=json > ${workflowOutputFile}"`
            .trim().replace(/\n/gim, ' ').replace(/\s+/gm, ' '),
    ], {
        env,
    })

    core.debug(`Reading workflow results file for ${name}`)

    const resultsFile = await readFileAsync(workflowOutputFile, 'utf-8')

    core.debug(`Parsing workflow results file for ${name}`)

    const results = JSON.parse(resultsFile)

    const status = get(results, 'spec.status.phase')

    core.debug(`Status for workflow ${name}: ${status}`)

    return status === 'Succeeded'
}
