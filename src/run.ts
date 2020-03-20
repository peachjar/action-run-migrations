import { isArray, first, identity } from 'lodash'
import { Context } from '@actions/github/lib/context'
import { Deps, Core } from './api'

import ProcessEnv = NodeJS.ProcessEnv

type ImageTagAndSecret = [string, string, string]

function getOptionalMigrationsFromEnvironment(core: Core, gitsha: string): ImageTagAndSecret[] {
    const migrations: ImageTagAndSecret[] = []

    for (let i = 2; i < 4; i++) {
        const image = core.getInput(`mig_image_${i}`)
        const maybeTag = core.getInput(`mig_tag_${i}`)
        const tag = maybeTag || gitsha
        const secret = core.getInput(`mig_secret_${i}`)
        if (image && secret) {
            migrations.push([image, tag, secret])
        }
    }

    return migrations
}

export default async function run(
    deps: Deps,
    context: Context,
    env: ProcessEnv
): Promise<any> {

    const { core, submitWorkflow } = deps

    try {
        core.info('Deploying service to environment.')

        const awsAccessKeyId = core.getInput('awsAccessKeyId', { required: true })
        const awsSecretAccessKey = core.getInput('awsSecretAccessKey', { required: true })

        if (!awsAccessKeyId || !awsSecretAccessKey) {
            return core.setFailed('AWS credentials are invalid.')
        }

        const childEnv = Object.assign({}, env, {
            AWS_ACCESS_KEY_ID: awsAccessKeyId,
            AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
        }) as { [k: string]: string }

        const gitsha = context.sha.slice(0, 7)

        const environment = core.getInput('environment', { required: true })

        if (!environment) {
            return core.setFailed('Environment not specified or invalid.')
        }

        const migImage = core.getInput('mig_image', { required: true })

        if (!migImage) {
            return core.setFailed('First migration image (mig_image) required.')
        }

        const migSecret = core.getInput('mig_secret', { required: true })

        if (!migSecret) {
            return core.setFailed('First migration secret (mig_secret) required.')
        }

        const migTag = core.getInput('mig_tag')

        const optionalMigrations = getOptionalMigrationsFromEnvironment(core, gitsha)

        const migrations = [[migImage, migTag || gitsha, migSecret]].concat(optionalMigrations)

        const results = await Promise.all(
            migrations.map(([image, tag, secret]) =>
                submitWorkflow({
                    name: image,
                    deployEnv: environment,
                    params: {
                        image: `${image}:${tag}`,
                        dbsecret: secret,
                    },
                    workflowFile: 'workflows/migrations/migrate.yml',
                    cwd: process.cwd(),
                }, deps, childEnv)
            )
        )

        if (!results.every(identity)) {
            return core.setFailed('One or more migrations failed to complete successfully.')
        }

        core.info('Migrations complete.')

    } catch (error) {

        core.setFailed(error.message)
    }
}
