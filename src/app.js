import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import Joi from "joi";



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

// Validações:
const schemaParticipante = Joi.object({
    name: Joi.string().required(),
})
const schemaMsg = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().required().valid('message', 'private_message')
})

/* Remoção automática de usuários inativos: */
setInterval(async () => {
    let agora = Date.now();
    try{
        let participantes = await db.collection('participants').find().toArray();
        for (let i = 0; i < participantes.length; i++) {
            if (agora - participantes[i].lastStatus > 15000) {
                const result = await db.collection("participants").deleteOne({ name:participantes[i].name })
                let objeto = {
                    from: `${participantes[i].name}`,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time: `${dayjs().format('HH:mm:ss')}`
                }
		        await db.collection("messages").insertOne(objeto);
            }
        }
    } catch(resposta){
        log(resposta);
    }
 }, 15000);

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
app.post("/messages", async (req, res) => {
    const {to, text, type} = req.body;
    let from;
    if(!req.headers.user) {
        return res.status(422).send("Header incompleto: User ausente!");
    } else {
        from = req.headers.user;
    }
    const objeto = {
        from,
        to,
        text,
        type,
        time: dayjs().format('HH:mm:ss')
    }

    const validation = schemaMsg.validate(req.body, { abortEarly: false });
    if(validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
		return res.status(422).send(errors);
    }

    try {
        const testeParticip = await db.collection("participants").findOne({ name: from });
	    if (!testeParticip) {return res.status(422).send("Esse nome não está em uso!")};
        
        await db.collection("messages").insertOne(objeto);
        res.sendStatus(201);
    } catch(err) {
        res.status(500).send(err.message)
    }
    
})

app.get("/messages", async (req, res) => {
    let user;
    let limit;
    let mensagensLimitadas =[];

    if(req.query.limit && req.query.limit > 0) {
        limit = Number(req.query.limit);
    } else if(req.query.limit && req.query.limit < 0) {
        return res.status(422).send("Escolha um Limite de mensagens válido");
    }
    if(!req.headers.user) {
        return res.status(422).send("Header incompleto: User ausente!");
    } else {
        user = req.headers.user;
    }

    try {
        const mensagensTotais = await db.collection("messages")
        .find( { $or: [ { from: user }, { to: user }, {to: "Todos"} ] } ).toArray();
        if(limit > 0) {
            for (let i = 0; i < limit; i++) {
                mensagensLimitadas.push(mensagensTotais[i]);
            }
            return res.send(mensagensLimitadas);
        }
        res.send(mensagensTotais);
    } catch {
        res.status(500).send(err.message);
    }
    
    
})

/* Status */
app.post("/status", async (req, res) => {
    let user;
    if(!req.headers.user) {
        return res.status(404).send("Header incompleto: User ausente!");
    } else {
        user = req.headers.user;
    }
    let usuarioAtualizado = {name: user, lastStatus: Date.now()}

    try{
        db.collection("participants").updateOne({ name: user }, { $set: usuarioAtualizado});
        res.send("Usuario Atualizado com Sucesso");
    } catch {
        res.status(500).send(err.message);
    }

})

/* Clean */
app.delete("/all", async (req,res) => {
    try {
        await db.collection("messages").deleteMany()
        await db.collection("participants").deleteMany()
        res.send('Tudo Limpo');
    } catch {
        res.status(500).send(err.message);
    }
    remoçãoAuto();
    res.send('Teste para o delete de participantes')
})

// Ligar a aplicação do servidor para ouvir requisições:
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor está rodando na porta ${PORT}`));