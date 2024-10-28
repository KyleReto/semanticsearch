import { Cohere } from './cohere.js'
import * as lancedb from "@lancedb/lancedb";

class MockDocument{
    text: string
    embedding: number[]

    constructor(text: string, embedding: number[]){
        this.text = text;
        this.embedding = embedding;
    }
}

export class LanceDB{
    cohere: Cohere
    mockData: MockDocument[]

    constructor(){
        this.cohere = new Cohere();
        this.mockData = [];
    }

    async addDocument(document: string){
        let embed = await this.cohere.embedDocuments([document])[0];
        let mockDocument = new MockDocument(document, embed);
        this.mockData.push(mockDocument);
    }
}
