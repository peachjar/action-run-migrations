import { readFile } from 'fs'
import { promisify } from 'util'

const readFileAsync = promisify(readFile)

export default async function requireJson(path: string): Promise<Record<string, any>> {
    try {
        const contents = await readFileAsync(path, 'utf-8')
        return JSON.parse(contents)
    } catch (error) {
        throw error
    }
}
