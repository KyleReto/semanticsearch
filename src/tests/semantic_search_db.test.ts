import { SemanticSearchDB } from "../semantic_search_db";
import { beforeAll, test, expect, afterEach, afterAll } from 'vitest'
import dotenv from 'dotenv'

async function resetDB(){
    await global.db.db.dropTable(global.db.tableName);
    await global.db.close();
    await global.db.open();
    // Every other document is the same question as the prior one, but in spanish.
    const documents = [
        {id: 0, text: "The nucleus of an atom has which two particles?"},
        {id: 1, text: "¿El núcleo de un átomo tiene cuáles dos partículas?"},
        {id: 2, text: "What particle is found in a cloud around the nucleus of an atom?"},
        {id: 3, text: "¿Qué partícula se encuentra en una nube alrededor del núcleo de un átomo?"},
        {id: 4, text: "What kingdom do humans belong to?"},
        {id: 5, text: "¿A qué reino pertenecen los humanos?"}
    ];
    return global.db.add(documents);
}

beforeAll(async ()=> {
    dotenv.config();
    global.db = new SemanticSearchDB();
    await global.db.open();
    await resetDB();
});

afterEach(async () => {
    await resetDB();
});

afterAll(async () => {
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
    await global.db.add([{id: 7, text: "What is the capital of France?"}]);
    const doc = await global.db.get(7);
    expect(doc.id).toBe(7);
    expect(doc.text).toBe("What is the capital of France?");
    expect(global.db.add([{id: 7, text: "a"}])).rejects.toThrowError("already exists");
});

test('Update an Existing Document', async () => {
    await global.db.add([{id: 4, text: "What is the capital of France?"}], true);
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

test('Close and reopen the database', async () => {
    await global.db.close();
    await global.db.open();
    const doc = await global.db.get(0);
    expect(doc.id).toBe(0);
    expect(doc.text).toBe("The nucleus of an atom has which two particles?");
});

test('Add a batch of documents', async () => {
    const data = [];
    for (let i = 7; i < 257; i++){
        data.push({id: i, text: "a"});
    }
    await global.db.add(data);
    const doc = await global.db.get(250);
    expect(doc.id).toBe(250);
    expect(doc.text).toBe("a");
    
    // No duplicates in the input data
    await resetDB();
    const dataWithDuplicate = Array.from(data);
    dataWithDuplicate.push({id: 250, text: "a"});
    expect(global.db.add(dataWithDuplicate)).rejects.toThrowError("duplicate");
    
    // No duplicates between input and DB
    await resetDB();
    const dataWithPreexistingID = Array.from(data);
    dataWithPreexistingID.push({id: 5, text: "a"});
    expect(global.db.add(dataWithPreexistingID)).rejects.toThrowError("already exists");
});

test('Update a batch of documents', async () => {
    const data = [];
    for (let i = 7; i < 257; i++){
        data.push({id: i, text: "a"});
    }
    await global.db.add(data, true);
    const doc = await global.db.get(250);
    expect(doc.id).toBe(250);
    expect(doc.text).toBe("a");
    
    // No duplicates in the input data
    await resetDB();
    const dataWithDuplicate = Array.from(data);
    dataWithDuplicate.push({id: 250, text: "a"});
    expect(global.db.add(dataWithDuplicate, true)).rejects.toThrowError("duplicate");
    
    // Duplicates between input and DB are allowed
    await resetDB();
    const dataWithPreexistingID = Array.from(data);
    dataWithPreexistingID.push({id: 5, text: "b"});
    await global.db.add(dataWithPreexistingID, true);
    const modifiedDoc = await global.db.get(5);
    expect(modifiedDoc.text).toBe("b");
});

test('Optimize the database', {timeout: 180*1000}, async () => {
    const docBeforeOptimization = await global.db.get(0);
    await global.db.optimize();
    const docAfterScalarOptim = await global.db.get(0);
    expect(docAfterScalarOptim.id).toBe(docBeforeOptimization.id);
    expect(docAfterScalarOptim.text).toBe(docBeforeOptimization.text);

    // Vector optimization requires a 256+ length table
    const data = [];
    for (let i = 7; i < 257; i++){
        data.push({id: i, text: "a"});
    }
    await global.db.add(data);
    await global.db.optimize();
    const docAfterVectorOptim = await global.db.get(0);
    expect(docAfterVectorOptim.id).toBe(docBeforeOptimization.id);
    expect(docAfterVectorOptim.text).toBe(docBeforeOptimization.text);
    // Vector search should still work after optimization
    const vectorResults = await global.db.search("Protons and neutrons");
    expect([0,1]).toContain(vectorResults[0].id);
    expect([0,1]).toContain(vectorResults[1].id);
});