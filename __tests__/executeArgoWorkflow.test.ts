import { ExecFn, Core, Deps } from '../src/api'

import executeArgoWorkflow from '../src/executeArgoWorkflow'

describe('Execute Argo Workflow', () => {

    let exec: ExecFn
    let core: Core
    let deps: Deps
    let submitResults: Record<string, any>
    let workflowResults: Record<string, any>

    const workflow = {
        deployEnv: 'kauai',
        name: 'svc-auth-db',
        workflowFile: 'workflows/migrations/migrate.yml',
        cwd: '/home/repo',
        params: {
            image: 'svc-auth-db:abcd123',
            dbsecret: 'flyway-auth-postgres-env',
        },
    }

    const env = { FOO: 'bar' }

    beforeEach(() => {
        submitResults = {
            metadata: {
                name: 'migrate-foobar-123',
            }
        }
        workflowResults = {
            spec: {
                status: {
                    phase: 'Succeeded'
                }
            }
        }
        exec = jest.fn((cmd: string, args: string[], opts) => {
            const buffer = Buffer.from(
                args.includes('submit') ? JSON.stringify(submitResults) : JSON.stringify(workflowResults)
            )
            opts!.listeners!.stdout!(buffer)
            return Promise.resolve(0)
        }) as any as ExecFn
        core = {
            getInput: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            setFailed: jest.fn()
        }
        deps = {
            submitWorkflow: jest.fn(),
            exec,
            core,
        }
    })

    describe('when the workflow succeeds', () => {
        it('should return true as a success indicator', async () => {
            const result = await executeArgoWorkflow(workflow, deps, env)
            expect(exec).toHaveBeenCalledTimes(2)
            expect(exec).toHaveBeenCalledWith('argo', [
                '--kubeconfig',
                '/home/repo/kilauea/kubefiles/kauai/kubectl_configs/kauai-kube-config-admins.yml',
                'submit', '/home/repo/peachjar-aloha/workflows/migrations/migrate.yml',
                '-p', 'image=svc-auth-db:abcd123', '-p', 'dbsecret=flyway-auth-postgres-env', '--wait',
                '-o=json'
            ], expect.anything())
            expect(exec).toHaveBeenCalledWith('argo', [
                '--kubeconfig',
                '/home/repo/kilauea/kubefiles/kauai/kubectl_configs/kauai-kube-config-admins.yml',
                'get', 'migrate-foobar-123', '-o=json',
            ], expect.anything())
            expect(result).toEqual(true)
        })
    })

    describe('when the workflow fails', () => {

        beforeEach(() => {
            workflowResults.spec.status.phase = 'Failed'
        })

        it('should fail the whole workflow', async () => {
            const result = await executeArgoWorkflow(workflow, deps, {})
            expect(result).toEqual(false)
        })
    })

    describe('when the submit command fails', () => {

        beforeEach(() => {
            exec = jest.fn((cmd: string, args: string[], opts) => {
                opts!.listeners!.stderr!(Buffer.from('Kaboom'))
                return Promise.resolve(127)
            }) as any as ExecFn
            deps.exec = exec
        })

        it('should fail the whole workflow', async () => {
            const result = await executeArgoWorkflow(workflow, deps, {})
            expect(result).toEqual(false)
        })
    })

    describe('when the get info command fails', () => {

        beforeEach(() => {
            exec = jest.fn((cmd: string, args: string[], opts) => {
                if (args.includes('submit')) {
                    opts!.listeners!.stdout!(Buffer.from(JSON.stringify(submitResults) ))
                    return Promise.resolve(0)
                }
                opts!.listeners!.stderr!(Buffer.from('Kaboom'))
                return Promise.resolve(127)
            }) as any as ExecFn
            deps.exec = exec
        })

        it('should fail the whole workflow', async () => {
            const result = await executeArgoWorkflow(workflow, deps, {})
            expect(result).toEqual(false)
        })
    })
})
