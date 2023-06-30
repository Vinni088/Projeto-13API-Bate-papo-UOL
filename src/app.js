import { MongoClient, ObjectId } from "mongodb";
import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import Joi from "joi"


// Criação do app:
const app = express();
const log = console.log();

// Configurações:
app.use(cors()); //Front-End free
app.use(express.json()); //Server On
dotenv.config(); // Dotenv habilitado

// Conexão com o Banco:
const mongoClient = new MongoClient(process.env.DATABASE_URL)
try {
    await mongoClient.connect();
    log("MongoDB conectado e rodando");
} catch(erro){
    (erro) => log(erro);
}
const db = mongoClient.db()

// Formato dos Dados:
const schemaParticipante = Joi.object({
    name: Joi.string().required()
})
//let participante = {
//    name: 'João', 
//    lastStatus: 12313123
//};
const schemaMsg = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().required().valid('message', 'private_message')
})
//let mensagem = {
//    from: 'João', 
//    to: 'Todos', 
//    text: 'oi galera', 
//    type: 'message', 
//    time: '20:04:37'
//};

// Funções (endpoints)


// Ligar a aplicação do servidor para ouvir requisições:
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor está rodando na porta ${PORT}`));