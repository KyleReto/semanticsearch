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

    // Embed one or more documents to search for queries using Cohere.
        // Queries should instead use embedQueries.
    async embedDocuments(texts: string[]): Promise<number[][]> {
        const promises: Promise<number[][]>[] = [];
        // Cohere can only embed up to 96 texts at a time, so we batch them.
        for (let i = 0; i < texts.length; i += 96) {
            const batch = texts.slice(i, i + 96);
            const cohereInput = {
                // Texts longer than 512 tokens (~200 words) will be truncated.
                "texts": batch,
                "input_type": "search_document",
                "embedding_types": ["float"]
            }
            promises.push(this.invokeCohere(cohereInput));
        }
        return (await Promise.all(promises)).flat();
    }

    // Embed one or more queries to search for documents using Cohere.
        // Documents should instead use embedDocuments.
    async embedQueries(texts: string[]): Promise<number[][]> {
        const cohereInput = {
            // Texts longer than 512 tokens (~200 words) will be truncated.
            "texts": texts,
            "input_type": "search_query",
            "embedding_types": ["float"]
        }
        return this.invokeCohere(cohereInput);
    }
}

