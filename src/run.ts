import * as Joi from 'joi'

import { get, identity } from 'lodash'
import { Context } from '@actions/github/lib/context'
import { Deps, Core } from './api'
import { resolve } from 'path'

import ProcessEnv = NodeJS.ProcessEnv

type ImageTagAndSecret = [string, string, string]
type Migration = {
    image: string,
    tag?: string,
    secret: string,
}

const MigrationSchema = Joi.object().keys({
    image: Joi.string().required(),
    secret: Joi.string().required(),
    tag: Joi.string(),
})

const MigrationsSchema = Joi.array().items(MigrationSchema).min(1)

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

    const { core, submitWorkflow, requireJson } = deps

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

        const migrations: ImageTagAndSecret[] = []

        const migImage = core.getInput('mig_image')

        const migSecret = core.getInput('mig_secret')

        if (migImage && migSecret) {

            const migTag = core.getInput('mig_tag')

            const optionalMigrations = getOptionalMigrationsFromEnvironment(core, gitsha)

            migrations.push([migImage, migTag || gitsha, migSecret])
            migrations.push(...optionalMigrations)
        }

        // Look at package.json
        if (migrations.length === 0) {
            try {
                const manifest = requireJson(resolve(process.cwd(), './package.json'))
                const manifestMigrations = get(manifest, 'peachjar.migrations', []) as Migration[]

                core.info(`Migrations from package.json: ${JSON.stringify(manifestMigrations)}`)

                const { error } = Joi.validate(manifestMigrations, MigrationsSchema)

                if (error) {
                    core.debug('Migrations schema invalid', error.details)
                    return core.setFailed('Validation Error: ' + error.message)
                }

                migrations.push(...manifestMigrations.map((m: Migration) => {
                    return [m.image, m.tag || gitsha, m.secret] as ImageTagAndSecret
                }))

            } catch (error) {
                return core.setFailed('Uncaught exception: ' + error.message)
            }
        }

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
