
# Info

This repo is for exploring semantic search in typescript for the purpose of integrating into the SQ `backend` repo in future.

It uses Cohere's API to create multilingual embeddings, and uses those embeddings to perform semantic search over a locally hosted vector database using LanceDB.

## To run this repo

1. Run `npm install` in this directory

2. Copy `src/.env_template` to a new file, `src/.env`. You don't need to change any values in it.

3. Run any of the scripts:
    * `npm run start` runs the demo endpoint described in `src/app.ts`.
    * `npm run test` runs the test scripts.
    * `npm run lint` runs the linter.

## Goals

1. A TS function should be written to convert arbitrary question text to embeddings.

2. A script should be written to use this function to pull from the database and create embeddings for every question.

3. A GraphQL Resolver should be written to convert an arbitrary search query to an embedding, then return results ordered by similarity.

4. The vector database should store a map of question IDs to their embeddings.

## Misc Notes

* Cohere offers a batch embedding endpoint, but they only recommend using it for massive datasets.

* The AWS Node SDK is used for AWS connections (see [this help page](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started-nodejs.html))
  * Specifically, the `@aws-sdk/client-bedrock-runtime` npm package is used for Cohere.

* The LanceDB package is used for the LanceDB connection (see [this help page](https://lancedb.github.io/lancedb/basic/#__tabbed_1_2)).
  * The npm package is called `@lancedb/lancedb`.
  * Note that LanceDB requires the `openai` package, which it may not install automatically.
    * It also requires `apache-arrow`, but that should install automatically

## TODO

* Add graphQL resolver to call search function
* Add script to pull questions from dynamodb and add them to the database
