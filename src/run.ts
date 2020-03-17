import { get, isArray, first, identity } from 'lodash'
import { Context } from '@actions/github/lib/context'
import { parse as parseQueryString } from 'querystring'

import * as im from '@actions/exec/lib/interfaces'
import ProcessEnv = NodeJS.ProcessEnv

export type ExecFn = (commandLine: string, args?: string[], options?: im.ExecOptions) => Promise<number>
export type ReadFileAsyncFn = (file: string, encoding: string) => Promise<string>

type Core = {
    getInput: (key: string, opts?: { required: boolean }) => string,
    info: (...args: any[]) => void,
    debug: (...args: any[]) => void,
    setFailed: (message: string) => void,
    [k: string]: any,
}

type Migration = {
    awsAccessKeyId: string,
    awsSecretAccessKey: string,
    gitsha: string,
    environment: string,
    image: string,
    secret: string,
}

async function runWorkflow(
    core: Core,
    exec: ExecFn,
    readFileAsync: ReadFileAsyncFn,
    env: ProcessEnv,
    {
        awsAccessKeyId,
        awsSecretAccessKey,
        gitsha,
        environment,
        image,
        secret,
    }: Migration
): Promise<boolean> {
    core.info(`Running migrations for [${image}] with secret file [${secret}]`)

    const idFile = `workflow.${image}.id`
    const workflowFile = `/tmp/workflow.${image}.result.json`

    const childEnv = Object.assign({}, env, {
        AWS_ACCESS_KEY_ID: awsAccessKeyId,
        AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
    }) as { [k: string]: string }

    core.debug(`Running workflow for ${image}`)

    await exec('argo', [
        '--kubeconfig',
        `../kilauea/kubefiles/${environment}/kubectl_configs/${environment}-kube-config-admins.yml`,
        'submit', 'workflows/migrations/migrate.yml',
        '-p', `image="${image}:${gitsha}`,
        '-p', `dbsecret="${secret}"`,
        '--wait', '-o=json',
        '|', 'jq', '-r', '.metadata.name', '>', idFile,
    ], {
        cwd: 'peachjar-aloha/',
        env: childEnv,
    })

    core.debug(`Getting results for ${image}`)

    await exec('argo', [
        '--kubeconfig',
        `../kilauea/kubefiles/${environment}/kubectl_configs/${environment}-kube-config-admins.yml`,
         'get', `\`cat ${idFile}\``, '-o=json', '>', workflowFile,
    ], {
        cwd: 'peachjar-aloha/',
        env: childEnv,
    })

    core.debug(`Reading workflow results file for ${image}`)

    const resultsFile = await readFileAsync(workflowFile, 'utf-8')

    core.debug(`Parsing workflow results file for ${image}`)

    const results = JSON.parse(resultsFile)

    const status = get(results, 'spec.status.phase')

    core.debug(`Status for workflow ${image}: ${status}`)

    return status === 'Succeeded'
}

export default async function run(
    exec: ExecFn,
    readFileAsync: ReadFileAsyncFn,
    context: Context,
    core: Core,
    env: ProcessEnv
): Promise<any> {
    try {
        core.info('Deploying service to environment.')

        const awsAccessKeyId = core.getInput('awsAccessKeyId', { required: true })
        const awsSecretAccessKey = core.getInput('awsSecretAccessKey', { required: true })

        if (!awsAccessKeyId || !awsSecretAccessKey) {
            return core.setFailed('AWS credentials are invalid.')
        }

        const gitsha = context.sha.slice(0, 7)

        const environment = core.getInput('environment', { required: true })

        if (!environment) {
            return core.setFailed('Environment not specified or invalid.')
        }

        const migrationsString = core.getInput('migrations', { required: true })

        if (!migrationsString) {
            return core.setFailed('Migrations not specified.')
        }

        const migrations = Object.entries(parseQueryString(migrationsString))

        if (migrations.length === 0) {
            return core.setFailed('No migrations specified; check syntax.')
        }

        const migrationsIsValid = migrations.every(([image, secret]) => image && secret)

        if (migrationsIsValid) {
            return core.setFailed('Migrations property is incorrect; check syntax.')
        }

        const results = await Promise.all(
            migrations.map(([image, maybeArray]) => {
                const secret = (isArray(maybeArray) ? first(maybeArray) : maybeArray) as string
                return runWorkflow(core, exec, readFileAsync, env, {
                    image,
                    secret,
                    awsAccessKeyId,
                    awsSecretAccessKey,
                    environment,
                    gitsha,
                })
            })
        )

        if (!results.every(identity)) {
            return core.setFailed('One or more migrations failed to complete successfully.')
        }

        core.info('Migrations complete.')

    } catch (error) {

        core.setFailed(error.message)
    }
}
