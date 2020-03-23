import { readFile } from 'fs'
import { promisify } from 'util'
import { Core } from './api'

const readFileAsync = promisify(readFile)

export default async function requireJson(core: Core, path: string): Promise<Record<string, any>> {
    try {
        core.debug('Looking up file in path:', path)
        const contents = await readFileAsync(path, 'utf-8')
        const json = JSON.parse(contents)
        core.debug(json)
        return json
    } catch (error) {
        throw error
    }
}
