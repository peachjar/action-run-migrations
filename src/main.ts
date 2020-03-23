import * as core from '@actions/core'

import { context } from '@actions/github'
import { exec } from '@actions/exec'
import { Deps } from './api'

import requireJson from './requireJson'
import submitWorkflow from './executeArgoWorkflow'

const deps: Deps = {
    core,
    exec,
    submitWorkflow,
    requireJson,
}

import run from './run'

run(deps, context, process.env)
