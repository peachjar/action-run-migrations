import * as im from '@actions/exec/lib/interfaces'

export type Environment = { [key: string]: string }
export type ExecFn = (commandLine: string, args?: string[], options?: im.ExecOptions) => Promise<number>
export type RequireFn = (path: string) => Record<string, any>

export type Workflow = {
    deployEnv: string,
    name: string,
    workflowFile: string,
    cwd: string,
    params: { [name: string]: string },
}

export interface SubmitWorkflowFn {
    (workflow: Workflow, deps: Deps, env: Environment): Promise<boolean>
}

export type Core = {
    getInput: (key: string, opts?: { required: boolean }) => string,
    info: (...args: any[]) => void,
    debug: (...args: any[]) => void,
    setFailed: (message: string) => void,
    [k: string]: any,
}

export type Deps = {
    core: Core,
    exec: ExecFn,
    submitWorkflow: SubmitWorkflowFn,
    requireJson: RequireFn,
}

