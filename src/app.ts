import express from 'express';
import { Cohere } from './cohere.js'
import { SemanticSearchDB } from './semantic_search_db.js'
import dotenv from 'dotenv'


console.log(dotenv.config());
const app = express();
const port = 3000;
const db = new SemanticSearchDB();

// These routes are all just for testing purposes, the final routes will be incorporated into the backend repo
app.get('/add', async (req, res) => {
    if (typeof req.query.text === 'string' && typeof req.query.id === `string`){
        await db.add([{id: parseInt(req.query.id), text: req.query.text}]);
        res.send('Document added');
    } else {
        res.send('No valid document to embed');
    }
});

app.get('/reset', async (req, res) => {
    await db.db.dropTable(db.tableName);
    await db.close();
    await db.open();
    res.send("Database reset.");
});

app.get('/get', async (req, res) => {
    if (typeof req.query.id === `string`){
        res.send(await db.get(parseInt(req.query.id)));
    } else {
        res.send('No document to find');
    }
});

app.get('/search', async (req, res) => {
    if (typeof req.query.query === 'string'){
        res.send(await db.search(req.query.query));
    } else {
        res.send('No query to search');
    }
});

app.get('/cohere', async (req, res) => {
    const cohereConn = new Cohere()
    if (typeof req.query.document === 'string'){
        const output = await cohereConn.embedDocuments([req.query.document])
        res.send(JSON.stringify(output[0]));
    } else if (typeof req.query.query === 'string'){
        const output = await cohereConn.embedQueries([req.query.query])
        res.send(JSON.stringify(output[0]));
    } else {
        res.send('No text to embed');
    }
});

app.listen(port, async () => {
    await db.open();
    return console.log(`Express is listening at http://localhost:${port}`);
});
