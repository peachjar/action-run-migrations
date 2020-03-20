import * as core from '@actions/core'
import { context } from '@actions/github'
import { exec } from '@actions/exec'
import { readFile } from 'fs'
import { promisify } from 'util'
import { Deps } from './api'

import submitWorkflow from './executeArgoWorkflow'

const readFileAsync = promisify(readFile)

const deps: Deps = {
    core,
    exec,
    readFileAsync,
    submitWorkflow,
}

import run from './run'

run(deps, context, process.env)
