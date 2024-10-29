import express from 'express';
import { Cohere } from './cohere.js'
import dotenv from 'dotenv'

dotenv.config();
const app = express();
const port = 3000;

// Just for testing purposes; the final routes will be embedded into the existing backend.
app.get('/', async (req, res) => {
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

app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
