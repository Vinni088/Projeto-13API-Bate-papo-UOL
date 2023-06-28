import { MongoClient } from "mongodb";
import express from "express"
import dotenv from "dotenv"
import cors from "cors"


// Criação do app
const app = express()

// Configurações
app.use(cors()) //Front-End free
app.use(express.json()) //Server On
dotenv.config() // Dotenv habilitado

// Conexão com o Banco
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

let promisse1 = mongoClient.connect();
promisse1.then(() => db = mongoClient.db())
promisse1.catch((erro) => console.log(erro.message))

// Coisas Globais
const participantes = [
    {
        name: 'João', 
        lastStatus: 12313123
    }
]

const mensagens = [
    {
        from: 'João', 
        to: 'Todos', 
        text: 'oi galera', 
        type: 'message', 
        time: '20:04:37'
    }
]

// Funções (endpoints)
app.get("/", (req, res) => {
	const promise = db.collection("").find().toArray()

	promise.then(data => res.send(data))
	promise.catch(err => res.status(500).send(err.message))
})

app.get("/receitas/:id", (req, res) => {
	const { id } = req.params
	const { auth } = req.headers

	if (!auth) {
		return res.status(401).send("Faça login!")
	}

	const receita = receitas.find((rec) => rec.id === Number(id))
	res.send(receita)
})

app.post("/receitas", (req, res) => {
	const { titulo, ingredientes, preparo } = req.body

	if (!titulo || !ingredientes || !preparo) {
		return res.status(422).send({ message: "Todos os campos são obrigatórios!!!" })
	}

	const novaReceita = { titulo, ingredientes, preparo }

	const promise = db.collection("receitas").insertOne(novaReceita)
	
	promise.then(() => res.sendStatus(201))
	promise.catch(err => res.status(500).send(err.message))
})


// Ligar a aplicação do servidor para ouvir requisições
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor está rodando na porta ${PORT}`));