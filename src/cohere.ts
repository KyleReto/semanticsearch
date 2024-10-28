import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

export class Cohere {
    client: BedrockRuntimeClient;
    model: string;

    constructor() {
        this.client = new BedrockRuntimeClient({ region: "us-east-1" });
        this.model = "cohere.embed-multilingual-v3";
    }

    // Invoke the Cohere embedding model through AWS with the given input.
    private async invokeCohere(cohereInput: object): Promise<number[][]> {
        const payload = {
            modelId: this.model,
            contentType: "application/json",
            accept: "*/*",
            body: JSON.stringify(cohereInput),
        };
        const command = new InvokeModelCommand(payload);
        const response = await this.client.send(command);
        const decoded = new TextDecoder().decode(response.body);
        const embeddings = JSON.parse(decoded).embeddings.float;
        return embeddings;
    }

    // Embed one or more documents (problems) to be searched using Cohere.
    // Note that queries should instead use embedQuery.
    async embedDocuments(texts: Array<string>): Promise<number[][]> {
        const cohereInput = {
            // Texts longer than 512 tokens (~200 words) will be truncated.
            "texts": texts,
            "input_type": "search_document",
            "embedding_types": ["float"]
        }
        return this.invokeCohere(cohereInput);
    }

    // Embed one or more queries to search for documents using Cohere.
    // Note that documents should instead use embedDocuments.
    async embedQueries(texts: Array<string>): Promise<number[][]> {
        const cohereInput = {
            // Texts longer than 512 tokens (~200 words) will be truncated.
            "texts": texts,
            "input_type": "search_query",
            "embedding_types": ["float"]
        }
        return this.invokeCohere(cohereInput);
    }
}

