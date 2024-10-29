import { test, expect, expectTypeOf } from 'vitest'
import { Cohere } from '../cohere.js'

test('Embed Documents', async () => {
    const cohere = new Cohere();
    const output = await cohere.embedDocuments(["Document in English", "Documento en Español"]);
    expectTypeOf(output).toEqualTypeOf<number[][]>();
    expect(output[0].length).toBe(1024);
    expect(output[1].length).toBe(1024);
    
    // A 100-length array is longer than the 96 text limit for Cohere, which should be handled by the function.
    const manyTexts = [...Array(100)].fill("a");
    const manyOutput = await cohere.embedDocuments(manyTexts);
    expectTypeOf(manyOutput).toEqualTypeOf<number[][]>();
    expect(manyOutput[0].length).toBe(1024);
})

test('Embed Queries', async () => {
    const cohere = new Cohere();
    const output = await cohere.embedQueries(["Query in English", "Consulta en Español"]);
    expectTypeOf(output).toEqualTypeOf<number[][]>();
    expect(output[0].length).toBe(1024);
    expect(output[1].length).toBe(1024);
})