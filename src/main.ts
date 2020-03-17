import * as core from '@actions/core'
import { context } from '@actions/github'
import { exec } from '@actions/exec'
import { readFile } from 'fs'
import { promisify } from 'util'

const readFileAsync = promisify(readFile)

import run from './run'

run(exec, readFileAsync, context, core, process.env)
