const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const express = require('express');
const program = new Command();
const app = express();
const multer = require('multer');
const upload = multer();
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
    swaggerDefinition: {
      openapi: '3.0.0',
      info: {
        title: 'API Documentation',
        version: '1.0.0',
        description: 'API Documentation for note service'
      },
    },
    apis: ['index.js'],
  };
  
  const swaggerDocs = swaggerJsDoc(swaggerOptions);

program
  .option('-h, --host <type>', 'server host')
  .option('-p, --port <type>', 'server port')
  .option('-c, --cache <path>', 'cache directory')
  .parse(process.argv);
  
const option = program.opts();

app.use(express.json());

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

if(!option.host){
    console.error("Вкажіть адресу сервера")
    process.exit(1);
}
if(!option.port){
    console.error("Вкажіть порт")
    process.exit(1);
}
if(!option.cache){
    console.error("Вкажіть папку для кешу")
    process.exit(1);
}
const { host, port, cache } = program.opts();
console.log(`Host: ${host}\nPort: ${port}\nCache Directory: ${cache}`);

const cachePath = path.resolve(option.cache);
if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath);
}

app.listen(option.port, option.host, () => {
    console.log(`Server is running on http://${option.host}:${option.port}`);
});

/**
 * @swagger
 * /notes/{noteName}:
 *   get:
 *     summary: Get the content of a note
 *     parameters:
 *       - in: path
 *         name: noteName
 *         required: true
 *         schema:
 *           type: string
 *         description: Note name
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       404:
 *         description: Note not found
 */
app.get('/notes/:noteName', (req, res) => {
    const notePath = path.join(option.cache, req.params.noteName);

    if (!fs.existsSync(notePath)) {
        return res.status(404).send('Not found');
    }

    const noteText = fs.readFileSync(notePath, 'utf8');
    res.send(noteText);
});

/**
 * @swagger
 * /notes/{noteName}:
 *   put:
 *     summary: Update the content of a note
 *     parameters:
 *       - in: path
 *         name: noteName
 *         required: true
 *         schema:
 *           type: string
 *         description: Note name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: New content for the note
 *     responses:
 *       200:
 *         description: Note updated successfully
 *       400:
 *         description: Bad request (missing text)
 *       404:
 *         description: Note not found
 */
app.put('/notes/:noteName', (req, res) => {
    const notePath = path.join(option.cache, req.params.noteName);

    if (!fs.existsSync(notePath)) {
        return res.status(404).send('Not found');
    }
    const newText = req.body.text;
    if (newText === undefined) {
        return res.status(400).send('Text is required');
    }
    fs.writeFileSync(notePath, newText);
    res.send('Note updated');
});

/**
 * @swagger
 * /notes/{noteName}:
 *   delete:
 *     summary: Delete a note
 *     parameters:
 *       - in: path
 *         name: noteName
 *         required: true
 *         schema:
 *           type: string
 *         description: Note name
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *       404:
 *         description: Note not found
 */
app.delete('/notes/:noteName', (req, res) => {
    const notePath = path.join(option.cache, req.params.noteName);

    if (!fs.existsSync(notePath)) {
        return res.status(404).send('Not found');
    }

    fs.unlinkSync(notePath);
    res.send('Note deleted');
});

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Get all notes
 *     responses:
 *       200:
 *         description: List of notes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Note name
 *                   text:
 *                     type: string
 *                     description: Note content
 */
app.get('/notes', (req, res) => {
    const files = fs.readdirSync(option.cache);
    const notes = files.map(fileName => {
        const text = fs.readFileSync(path.join(option.cache, fileName), 'utf8');
        return { name: fileName, text };
    });

    res.json(notes);
});

/**
 * @swagger
 * /write:
 *   post:
 *     summary: Create a new note
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               note_name:
 *                 type: string
 *                 description: Name of the new note
 *               note:
 *                 type: string
 *                 description: Content of the new note
 *     responses:
 *       201:
 *         description: Note created successfully
 *       400:
 *         description: Note already exists
 *       500:
 *         description: Error creating note
 */
app.post('/write', upload.none(), (req, res) => {
    const noteName = req.body.note_name;
    const noteText = req.body.note;
    const notePath = path.join(option.cache, noteName);
    if (fs.existsSync(notePath)) {
        return res.status(400).send('Note already exists');
    }
    try {
        fs.writeFileSync(notePath, noteText);
        res.status(201).send('Note created');
    } catch (error) {
        console.error('Error writing note:', error);
        res.status(500).send('Error creating note');
    }
});

/**
 * @swagger
 * /UploadForm.html:
 *   get:
 *     summary: Load Upload Form HTML page
 *     responses:
 *       200:
 *         description: HTML form loaded successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: HTML file not found
 */
app.get('/UploadForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'UploadForm.html'));
});