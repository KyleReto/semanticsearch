import { test, expect, expectTypeOf } from 'vitest'
import { Cohere } from '../cohere.js'

test('embedDocuments', async () => {
    const cohere = new Cohere()
    const output = await cohere.embedDocuments(["Document in English", "Documento en Español"])
    expectTypeOf(output).toEqualTypeOf<number[][]>()
    expect(output[0].length).toBe(1024)
    expect(output[1].length).toBe(1024)
})

test('embedQueries', async () => {
    const cohere = new Cohere()
    const output = await cohere.embedQueries(["Query in English", "Consulta en Español"])
    expectTypeOf(output).toEqualTypeOf<number[][]>()
    expect(output[0].length).toBe(1024)
    expect(output[1].length).toBe(1024)
})