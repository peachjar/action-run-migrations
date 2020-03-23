import { readFile } from 'fs'
import { promisify } from 'util'

const readFileAsync = promisify(readFile)

export default async function requireJson(path: string): Promise<Record<string, any>> {
    try {
        console.log('Looking up file in path:', path)
        const contents = await readFileAsync(path, 'utf-8')
        const json = JSON.parse(contents)
        console.log(json)
        return json
    } catch (error) {
        throw error
    }
}
