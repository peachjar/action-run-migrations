import { ReadFileAsyncFn, ExecFn, Core, Deps } from '../src/api'

import executeArgoWorkflow from '../src/executeArgoWorkflow'

describe('Execute Argo Workflow', () => {

    let readFileAsync: ReadFileAsyncFn
    let exec: ExecFn
    let core: Core
    let deps: Deps
    let resultsFile: Record<string, any>

    const workflow = {
        deployEnv: 'kauai',
        name: 'svc-auth-db',
        workflowFile: 'workflows/migrations/migrate.yml',
        cwd: './peachjar-aloha',
        params: {
            image: 'svc-auth-db:abcd123',
            dbsecret: 'flyway-auth-postgres-env',
        },
    }

    const env = { FOO: 'bar' }

    beforeEach(() => {
        resultsFile = {
            spec: {
                status: {
                    phase: 'Succeeded'
                }
            }
        }
        exec = jest.fn(() => Promise.resolve(0))
        core = {
            getInput: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            setFailed: jest.fn()
        }
        readFileAsync = jest.fn(() => Promise.resolve(JSON.stringify(resultsFile)))
        deps = {
            submitWorkflow: jest.fn(),
            readFileAsync,
            exec,
            core,
        }
    })

    describe('when the workflow succeeds', () => {
        it('should fail the whole workflow', async () => {
            const result = await executeArgoWorkflow(workflow, deps, env)
            expect(exec).toHaveBeenCalledTimes(2)
            expect(exec).toHaveBeenCalledWith('sh', [
                '-c',
                '"argo --kubeconfig kilauea/kubefiles/kauai/kubectl_configs/kauai-kube-config-admins.yml get `cat workflow.svc-auth-db.id` -o=json > /tmp/workflow.svc-auth-db.result.json"',
            ], {
                cwd: './peachjar-aloha',
                env,
            })
            expect(exec).toHaveBeenCalledWith('sh', [
                '-c',
                '"argo --kubeconfig kilauea/kubefiles/kauai/kubectl_configs/kauai-kube-config-admins.yml get `cat workflow.svc-auth-db.id` -o=json > /tmp/workflow.svc-auth-db.result.json"',
            ], {
                cwd: './peachjar-aloha',
                env,
            })
            expect(result).toEqual(true)
        })
    })

    describe('when the workflow fails', () => {

        beforeEach(() => {
            resultsFile.spec.status.phase = 'Failed'
        })

        it('should fail the whole workflow', async () => {
            const result = await executeArgoWorkflow(workflow, deps, {})
            expect(result).toEqual(false)
        })
    })
})
