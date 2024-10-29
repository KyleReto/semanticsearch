import { Cohere } from './cohere.js'
import * as lancedb from "@lancedb/lancedb";
import * as arrow from "apache-arrow";

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
        this.tableName = "problems";
        this.distanceType = "l2";
    }
    
    // Create the database table. Opens the table if it already exists.
    private async createOrOpenTable(){
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
        return this.db.createEmptyTable(this.tableName, schema, {existOk: true})
    }

    // Open the connection to the database, creating the table if it doesn't exist.
    async open(){
        //console.log(process.env);
        const uri = process.env.LANCEDB_URI;
        this.db = await lancedb.connect(uri);
        this.table = await this.createOrOpenTable();
    }

    // Close the connection to the database.
    async close(){
        this.db.close();
    }

    // Add a problem to the database without updating existing records.
    async add(id: number, text: string){
        const data = [{ text: text, id: id}];
        if (await this.get(id) !== undefined){
            throw new Error("Document ID already exists");
        } else {
            return this.table.add(data);
        }
    }

    // Update an existing problem in the database.
    async update(id: number, text: string){
        const updatedEmbedding = (await this.cohere.embedDocuments([text]))[0];
        return this.table.update({ where: `id = ${id}` , values: {text: text, vector: updatedEmbedding}});
    }

    // Get a problem from the database by ID.
    async get(id: number){
        return (await this.table.query().where(`id = ${id}`).limit(1).toArray())[0];
    }

    // Perform a vector search on the database.
    async search(query: string, page: number = 0, pageSize: number = 10){
        const vectorQuery = (await this.cohere.embedQueries([query]))[0];
        const results = this.table.vectorSearch(vectorQuery)
            .distanceType(this.distanceType)
            .select(["id", "text"])
            .limit(pageSize*(page+1))
            .toArray();
        // LanceDB may add an offset function in the future, which would allow us to avoid slicing the results.
        return (await results).slice(pageSize*page, pageSize*(page+1));
    }

    async delete(id: number){
        return this.table.delete(`id = ${id}`);
    }
}