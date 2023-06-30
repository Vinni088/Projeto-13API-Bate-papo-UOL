import { MongoClient, ObjectId } from "mongodb";
import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import Joi from "joi"


// Criação do app:
const app = express();
const log = console.log;

// Configurações:
app.use(cors()); //Front-End free
app.use(express.json()); //Dados via JSON
dotenv.config(); // Dotenv habilitado

// Conexão com o Banco:
const mongoClient = new MongoClient(process.env.DATABASE_URL)
try {
    await mongoClient.connect();
    log("MongoDB conectado e rodando");
} catch(erro){
    log("Servidor rodando mas sem o MongoDB")
}
const db = mongoClient.db()

// Formato dos Dados:
const schemaParticipante = Joi.object({
    name: Joi.string().required(),
})
/*let participante = {
    name: 'João', 
    lastStatus: 12313123
};*/
const schemaMsg = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().required().valid('message', 'private_message')
})
/*let mensagem = {
    from: 'João', 
    to: 'Todos', 
    text: 'oi galera', 
   type: 'message', 
    time: '20:04:37'
};*/

/* Endpoints */

/* Participantes */
app.get("/participants", async (req, res) => {
    try {
        const participantes = await db.collection("participants").find().toArray();
        res.send(participantes);
    } catch(erro){
        res.status(500).send(erro.message);
    }
})
app.post("/participants", async (req, res) => {
    const {name} = req.body;
    const lastStatus = Date.now();
    let objeto = {name, lastStatus};

    const validation = schemaParticipante.validate(req.body, { abortEarly: false });

    if(validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
		return res.status(422).send(errors);
    }
    try {
        const testeParticip = await db.collection("participants").findOne({ name: name });
	    if (testeParticip) {return res.status(409).send("Esse nome já está em uso!")};
        
        await db.collection("participants").insertOne(objeto);
		res.sendStatus(201);
    } catch(err) {
        res.status(500).send(err.message)
    }
    

    
    
})

/* Mensagens */


// Ligar a aplicação do servidor para ouvir requisições:
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor está rodando na porta ${PORT}`));