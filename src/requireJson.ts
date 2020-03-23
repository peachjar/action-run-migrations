import { readFile } from 'fs'
import { promisify } from 'util'
import { Core } from './api'

const readFileAsync = promisify(readFile)

export default async function requireJson(core: Core, path: string): Promise<Record<string, any>> {
    try {
        const contents = await readFileAsync(path, 'utf-8')
        return JSON.parse(contents)
    } catch (error) {
        core.info(`ERROR: ${error.message}; ${error.stack}`)
        throw error
    }
}
