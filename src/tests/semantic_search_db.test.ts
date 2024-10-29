import { SemanticSearchDB } from "../semantic_search_db";
import { beforeAll, beforeEach, test, expect, afterEach } from 'vitest'
import dotenv from 'dotenv'
import path from 'path'

beforeAll(async ()=> {
    dotenv.config({path: path.join(__dirname, "../.env")});
    global.db = new SemanticSearchDB();
});

beforeEach(async () => {
    await global.db.open();
    // Every other document is the same question as the prior one, but in spanish.
    await Promise.allSettled([
        global.db.add(0, "The nucleus of an atom has which two particles?"),
        global.db.add(1, "¿El núcleo de un átomo tiene cuáles dos partículas?"),
        global.db.add(2, "What particle is found in a cloud around the nucleus of an atom?"),
        global.db.add(3, "¿Qué partícula se encuentra en una nube alrededor del núcleo de un átomo?"),
        global.db.add(4, "What kingdom do humans belong to?"),
        global.db.add(5, "¿A qué reino pertenecen los humanos?")
    ]);
});

afterEach(async () => {
    await global.db.db.dropTable(global.db.tableName);
    await global.db.close();
});

test('Get a Document by ID', async () => {
    const doc = await global.db.get(0);
    expect(doc.id).toBe(0);
    expect(doc.text).toBe("The nucleus of an atom has which two particles?");
});

test('Add a New Document', async () => {
    // Note the lack of ID #6 - gaps should be allowed.
    await global.db.add(7, "What is the capital of France?");
    const doc = await global.db.get(7);
    expect(doc.id).toBe(7);
    expect(doc.text).toBe("What is the capital of France?");
    expect(async () => global.db.add(7, "")).rejects.toThrowError("already exists");
});

test('Update an Existing Document', async () => {
    await global.db.update(4, "What is the capital of France?");
    const doc = await global.db.get(4);
    expect(doc.id).toBe(4);
    expect(doc.text).toBe("What is the capital of France?");
    const searchResults = await global.db.search("Taxonomic ranks");
    // As the new document is no longer about taxonomic ranks, it shouldn't be first
        // (#5 would probably be first instead)
    expect(searchResults[0].id).not.toBe(4);
});

test('Delete a Document', async () => {
    await global.db.delete(4);
    expect(await global.db.get(4)).toBe(undefined);
});

test('Search for Documents by Vector', async () => {
    const defaultResults = await global.db.search("Protons and neutrons");
    expect([0,1]).toContain(defaultResults[0].id);
    expect([0,1]).toContain(defaultResults[1].id);
    
    const resultsLimit = await global.db.search("Protons and neutrons", 5);
    expect(resultsLimit.length).toBe(5);
});