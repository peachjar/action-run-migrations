import { Context } from '@actions/github/lib/context'
import { ExecFn, Core, SubmitWorkflowFn, RequireFn, Deps } from '../src/api'

import run from '../src/run'

describe('Run function', () => {

    let context: Context
    let core: Core
    let submitWorkflow: SubmitWorkflowFn
    let exec: ExecFn
    let requireJson: RequireFn
    let deps: Deps

    const awsAccessKeyId = 'abcd1234'
    const awsSecretAccessKey = 'adfasdfasfasfasdfasdfasdfasdfasdf'
    const environment = 'kauai'
    const migImage = 'svc-auth-db'
    const migSecret = 'flyway-auth-postgres-env'
    const packageJson = {
        peachjar: {
            migrations: [{
                image: 'svc-packagejson-db',
                secret: 'flyway-packagejson-postgres-env',
            }],
        },
    }

    beforeEach(() => {
        exec = jest.fn(() => Promise.resolve(0))
        context = ({
            sha: 'fa1e24f762a20c3ca1da807f4787e5b21e2de499',
            repo: { owner: 'peachjar', repo: 'peachjar-svc-foobar' }
        } as any) as Context
        core = {
            getInput: jest.fn((key: string) => {
                switch (key) {
                    case 'awsAccessKeyId': return awsAccessKeyId
                    case 'awsSecretAccessKey': return awsSecretAccessKey
                    case 'environment': return environment
                    case 'mig_image': return migImage
                    case 'mig_secret': return migSecret
                    default: return ''
                }
            }),
            debug: jest.fn(),
            info: jest.fn(),
            setFailed: jest.fn()
        }
        submitWorkflow = jest.fn(() => Promise.resolve(true))
        requireJson = jest.fn(() => Promise.resolve(packageJson))
        deps = {
            submitWorkflow,
            requireJson,
            exec,
            core,
        }
    })

    describe('when the awsAccessKeyId is invalid', () => {
        beforeEach(() => {
            core.getInput = jest.fn((key: string) => {
                switch (key) {
                    case 'awsAccessKeyId': return ''
                    case 'awsSecretAccessKey': return awsSecretAccessKey
                    case 'environment': return environment
                    case 'mig_image': return migImage
                    case 'mig_secret': return migSecret
                    default: return ''
                }
            })
        })

        it('should fail the action', async () => {
            await run(deps, context, { FOO: 'bar' })
            expect(core.setFailed).toHaveBeenCalled()
        })
    })

    describe('when the awsSecretAccessKey is invalid', () => {
        beforeEach(() => {
            core.getInput = jest.fn((key: string) => {
                switch (key) {
                    case 'awsAccessKeyId': return awsAccessKeyId
                    case 'awsSecretAccessKey': return ''
                    case 'environment': return environment
                    case 'mig_image': return migImage
                    case 'mig_secret': return migSecret
                    default: return ''
                }
            })
        })

        it('should fail the action', async () => {
            await run(deps, context, { FOO: 'bar' })
            expect(core.setFailed).toHaveBeenCalled()
        })
    })

    describe('when the environment is invalid', () => {
        beforeEach(() => {
            core.getInput = jest.fn((key: string) => {
                switch (key) {
                    case 'awsAccessKeyId': return awsAccessKeyId
                    case 'awsSecretAccessKey': return awsSecretAccessKey
                    case 'environment': return ''
                    case 'mig_image': return migImage
                    case 'mig_secret': return migSecret
                    default: return ''
                }
            })
        })

        it('should fail the action', async () => {
            await run(deps, context, { FOO: 'bar' })
            expect(core.setFailed).toHaveBeenCalled()
        })
    })

    describe('when only the mandatory image and secret is supplied', () => {
        it('should submit a single workflow', async () => {
            await run(deps, context, { FOO: 'bar' })
            expect(core.setFailed).not.toHaveBeenCalled()
            expect(submitWorkflow).toHaveBeenCalledTimes(1)
            expect(submitWorkflow).toHaveBeenCalledWith(
                {
                    deployEnv: environment,
                    name: migImage,
                    workflowFile: 'workflows/migrations/migrate.yml',
                    cwd: expect.anything(),
                    params: {
                        image: 'svc-auth-db:git-fa1e24f',
                        dbsecret: migSecret,
                        repository: 'ghcr.io/peachjar/peachjar-svc-foobar',
                        pullsecret: 'peachjar-eks-github-pull-secret',
                    },
                },
                expect.anything(),
                {
                    FOO: 'bar',
                    AWS_ACCESS_KEY_ID: awsAccessKeyId,
                    AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
                }
            )
        })
    })

    describe('when a tag override is specified', () => {
        beforeEach(() => {
            core.getInput = jest.fn((key: string) => {
                switch (key) {
                    case 'awsAccessKeyId': return awsAccessKeyId
                    case 'awsSecretAccessKey': return awsSecretAccessKey
                    case 'environment': return environment
                    case 'mig_image': return migImage
                    case 'mig_tag': return 'latest'
                    case 'mig_secret': return migSecret
                    default: return ''
                }
            })
        })

        it('should use the override instead of the gitsha', async () => {
            await run(deps, context, { FOO: 'bar' })
            expect(core.setFailed).not.toHaveBeenCalled()
            expect(submitWorkflow).toHaveBeenCalledTimes(1)
            expect(submitWorkflow).toHaveBeenCalledWith(
                {
                    deployEnv: environment,
                    name: migImage,
                    workflowFile: 'workflows/migrations/migrate.yml',
                    cwd: expect.anything(),
                    params: {
                        image: 'svc-auth-db:latest',
                        dbsecret: migSecret,
                        repository: 'ghcr.io/peachjar/peachjar-svc-foobar',
                        pullsecret: 'peachjar-eks-github-pull-secret',
                    },
                },
                expect.anything(),
                {
                    FOO: 'bar',
                    AWS_ACCESS_KEY_ID: awsAccessKeyId,
                    AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
                }
            )
        })
    })

    describe('when multiple migrations are specified', () => {
        beforeEach(() => {
            core.getInput = jest.fn((key: string) => {
                switch (key) {
                    case 'awsAccessKeyId': return awsAccessKeyId
                    case 'awsSecretAccessKey': return awsSecretAccessKey
                    case 'environment': return environment
                    case 'mig_image': return migImage
                    case 'mig_secret': return migSecret
                    case 'mig_image_2': return 'foobar'
                    case 'mig_tag_2': return 'foobaz'
                    case 'mig_secret_2': return 'foobar-env'
                    case 'mig_image_3': return 'yomama'
                    case 'mig_secret_3': return 'yomama-env'
                    default: return ''
                }
            })
        })

        it('should submit a job for each migration', async () => {
            await run(deps, context, { FOO: 'bar' })
            expect(core.setFailed).not.toHaveBeenCalled()
            expect(submitWorkflow).toHaveBeenCalledTimes(3)
            expect(submitWorkflow).toHaveBeenCalledWith(
                {
                    deployEnv: environment,
                    name: migImage,
                    workflowFile: 'workflows/migrations/migrate.yml',
                    cwd: expect.anything(),
                    params: {
                        image: 'svc-auth-db:git-fa1e24f',
                        dbsecret: migSecret,
                        repository: 'ghcr.io/peachjar/peachjar-svc-foobar',
                        pullsecret: 'peachjar-eks-github-pull-secret',
                    },
                },
                expect.anything(),
                {
                    FOO: 'bar',
                    AWS_ACCESS_KEY_ID: awsAccessKeyId,
                    AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
                }
            )
            expect(submitWorkflow).toHaveBeenCalledWith(
                {
                    deployEnv: environment,
                    name: 'foobar',
                    workflowFile: 'workflows/migrations/migrate.yml',
                    cwd: expect.anything(),
                    params: {
                        image: 'foobar:foobaz',
                        dbsecret: 'foobar-env',
                        repository: 'ghcr.io/peachjar/peachjar-svc-foobar',
                        pullsecret: 'peachjar-eks-github-pull-secret',
                    },
                },
                expect.anything(),
                {
                    FOO: 'bar',
                    AWS_ACCESS_KEY_ID: awsAccessKeyId,
                    AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
                }
            )
            expect(submitWorkflow).toHaveBeenCalledWith(
                {
                    deployEnv: environment,
                    name: 'yomama',
                    workflowFile: 'workflows/migrations/migrate.yml',
                    cwd: expect.anything(),
                    params: {
                        image: 'yomama:git-fa1e24f',
                        dbsecret: 'yomama-env',
                        repository: 'ghcr.io/peachjar/peachjar-svc-foobar',
                        pullsecret: 'peachjar-eks-github-pull-secret',
                    },
                },
                expect.anything(),
                {
                    FOO: 'bar',
                    AWS_ACCESS_KEY_ID: awsAccessKeyId,
                    AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
                }
            )
        })

        describe('when any of the workflows fail', () => {
            beforeEach(() => {
                let calls = 0
                submitWorkflow = jest.fn(() => {
                    calls += 1
                    return Promise.resolve(calls !== 2)
                })
                deps.submitWorkflow = submitWorkflow
            })

            it('should fail the job', async () => {
                await run(deps, context, { FOO: 'bar' })
                expect(core.setFailed).toHaveBeenCalled()
                expect(submitWorkflow).toHaveBeenCalledTimes(3)
            })
        })
    })

    describe('when an error is raised from the workflow', () => {
        beforeEach(() => {
            submitWorkflow = jest.fn(() => Promise.reject(new Error('Kaboom')))
            deps.submitWorkflow = submitWorkflow
        })

        it('should fail the action', async () => {
            await run(deps, context, { FOO: 'bar' })
            expect(core.setFailed).toHaveBeenCalled()
        })
    })

    describe('when the migrations fields are not set', () => {
        beforeEach(() => {
            core.getInput = jest.fn((key: string) => {
                switch (key) {
                    case 'awsAccessKeyId': return awsAccessKeyId
                    case 'awsSecretAccessKey': return awsSecretAccessKey
                    case 'environment': return environment
                    default: return ''
                }
            })
        })

        it('should read package.json for the migrations', async () => {
            await run(deps, context, { FOO: 'bar' })
            expect(core.setFailed).not.toHaveBeenCalled()
            expect(submitWorkflow).toHaveBeenCalledTimes(1)
            expect(submitWorkflow).toHaveBeenCalledWith(
                {
                    deployEnv: environment,
                    name: 'svc-packagejson-db',
                    workflowFile: 'workflows/migrations/migrate.yml',
                    cwd: expect.anything(),
                    params: {
                        image: 'svc-packagejson-db:git-fa1e24f',
                        dbsecret: 'flyway-packagejson-postgres-env',
                        repository: 'ghcr.io/peachjar/peachjar-svc-foobar',
                        pullsecret: 'peachjar-eks-github-pull-secret',
                    },
                },
                expect.anything(),
                {
                    FOO: 'bar',
                    AWS_ACCESS_KEY_ID: awsAccessKeyId,
                    AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
                }
            )
        })

        describe('when the fields in package.json are invalid', () => {
            beforeEach(() => {
                requireJson = jest.fn(() => Promise.resolve({
                    peachjar: {
                        // Missing secrets
                        migrations: [{ image: 'foobar' }]
                    },
                }))
                deps.requireJson = requireJson
            })

            it('should fail the action', async () => {
                await run(deps, context, { FOO: 'bar' })
                expect(core.setFailed).toHaveBeenCalled()
            })
        })

        describe('when loading package.json fails', () => {
            beforeEach(() => {
                requireJson = jest.fn(() => { throw new Error('Kaboom') })
                deps.requireJson = requireJson
            })

            it('should fail the action', async () => {
                await run(deps, context, { FOO: 'bar' })
                expect(core.setFailed).toHaveBeenCalled()
            })
        })
    })
})
