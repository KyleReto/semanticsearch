import { Cohere } from './cohere.js'
import * as lancedb from "@lancedb/lancedb";
import * as arrow from "apache-arrow";

const DISTANCE_TYPE: "l2" | "cosine" | "dot" = "l2";
const TABLE_NAME = "problems";

// Note that a Cohere embedding function will likely be added to lancedb in the future.
@lancedb.embedding.register("cohere")
class CohereEmbeddings extends lancedb.embedding.TextEmbeddingFunction{
    cohere: Cohere
    embedDim: number

    async init() {
        this.cohere = new Cohere();
        this.embedDim = 1024;
    }

    ndims() {
      return this.embedDim;
    }
  

    generateEmbeddings(texts: string[]): Promise<number[][]> {
        return this.cohere.embedDocuments(texts);
    }

    toJSON() {
        return {
            name: "Custom Cohere Embeddings Implementation",
        };
    }
}

export class SemanticSearchDB{
    cohere: Cohere
    db: lancedb.Connection
    tableName: string
    table: lancedb.Table
    distanceType: "l2" | "cosine" | "dot"

    constructor(){
        this.cohere = new Cohere();
        this.tableName = TABLE_NAME;
        this.distanceType = DISTANCE_TYPE;
    }
    
    // Open the database table. If the table doesn't exist, create it.
    private async createAndOpenTable(){
        const registry = lancedb.embedding.getRegistry();

        const cohereEmbeddings = await registry
        .get<CohereEmbeddings>("cohere")!
        .create();

        const schema = lancedb.embedding.LanceSchema({
            id: new arrow.Int32(),
            // This field is not strictly necessary, since the main database already maps IDs to question text.
            // However, it allows us to ensure that the embeddings are up-to-date with the text.
            text: cohereEmbeddings.sourceField(),
            vector: cohereEmbeddings.vectorField(),
        });

        // Despite the name, this function does not guarantee that the table is empty.
        return this.db.createEmptyTable(this.tableName, schema, {existOk: true});
    }

    private async createIndices(){
        const existingIndices = await this.table.listIndices();
        if (!existingIndices.some(e => e.columns.includes("id"))){
            await this.table.createIndex("id", { config: lancedb.Index.btree() });
        }
        if (
            // Vector optimizations require a 256+ length table.
            await this.table.countRows() >= 256 && 
            !existingIndices.some(e => e.columns.includes("vector"))
        ){
            await this.table.createIndex("vector", { config: lancedb.Index.ivfPq({distanceType: this.distanceType}) })
        }
    }

    // Optimize the database table. Run this occasionally to improve performance.
    async optimize(){
        await this.createIndices();
        await this.table.optimize();
    }

    // Open the connection to the database, creating the table if it doesn't exist.
    async open(){
        const uri = process.env.LANCEDB_URI;
        this.db = await lancedb.connect(uri);
        this.table = await this.createAndOpenTable();
    }

    // Close the connection to the database.
    async close(){
        this.db.close();
    }

    async add(data: {id: number, text: string}[], updateIfExists: boolean = false){
        // At time of writing, LanceDB cannot enforce uniqueness, so we have to do it manually.
        // Check for duplicate IDs in the input data.
        const idsInInput = data.map(d => d.id);
        for (let i = 0; i < idsInInput.length; i++){
            for (let j = i + 1; j < idsInInput.length; j++){
                if (idsInInput[i] === idsInInput[j]){
                    throw new Error(`Document ID duplicated in input data: ${idsInInput[i]}`);
                }
            }
        }
        // Check for duplicate IDs in the database.
        const matchingIds = await this.table.query().where(`id IN (${idsInInput.join(",")})`).select('id').toArray();
        if (!updateIfExists && matchingIds.length > 0){
            throw new Error(`Document ID already exists in the database: ${matchingIds[0].id}`);
        }
        const dataToAdd = data.filter(d => !matchingIds.some(duplicate => duplicate.id === d.id));
        const dataToUpdate = data.filter(d => matchingIds.some(duplicate => duplicate.id === d.id));
        const promises = [];
        for (const datum of dataToUpdate){
            promises.push(this.update(datum.id, datum.text));
        }
        if (dataToAdd.length > 0){
            promises.push(this.table.add(dataToAdd));
        }
        return Promise.all(promises);
    }

    // Update an existing problem in the database.
    private async update(id: number, text: string){
        console.log(id, text);
        // By default, table.update does not update embeddings, so we do it manually.
        const updatedEmbedding = (await this.cohere.embedDocuments([text]))[0];
        return this.table.update({ where: `id = ${id}` , values: {text: text, vector: updatedEmbedding}});
    }

    // Get a problem from the database by ID.
    async get(id: number){
        return (await this.table.query().where(`id = ${id}`).limit(1).toArray())[0];
    }

    // Perform a vector search on the database.
    async search(query: string, limit: number = 10){
        const vectorQuery = (await this.cohere.embedQueries([query]))[0];
        const results = this.table.vectorSearch(vectorQuery)
            .distanceType(this.distanceType)
            .select(["id", "text"])
            .limit(limit)
            .toArray();
        return results;
    }

    // Delete a problem from the database by ID.
    async delete(id: number){
        return this.table.delete(`id = ${id}`);
    }
}
