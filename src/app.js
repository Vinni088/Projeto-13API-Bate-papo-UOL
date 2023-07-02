import { MongoClient, ObjectId } from "mongodb";
import { stripHtml } from "string-strip-html";
import { strict as assert } from "assert";
import express from "express";
import dotenv from "dotenv";
import dayjs from "dayjs";
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
const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
  await mongoClient.connect();
  log("MongoDB conectado e rodando");
} catch (erro) {
  log("Servidor rodando mas sem o MongoDB");
}
const db = mongoClient.db();

// Validações:
const schemaParticipante = Joi.object({
  name: Joi.string().required(),
});
const schemaMsg = Joi.object({
  to: Joi.string().required(),
  text: Joi.string().required(),
  type: Joi.string().required().valid("message", "private_message"),
});

/* Remoção automática de usuários inativos: */
setInterval(async () => {
  try {
    let participantes = await db.collection("participants").find().toArray();
    for (let i = 0; i < participantes.length; i++) {
      if (Date.now() - participantes[i].lastStatus >= 15000) {
        await db
          .collection("participants")
          .deleteOne({ name: participantes[i].name });
        let objeto = {
          from: `${participantes[i].name}`,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: `${dayjs().format("HH:mm:ss")}`,
        };
        await db.collection("messages").insertOne(objeto);
      }
    }
  } catch (resposta) {
    log(resposta);
  }
}, 15000);

/* Endpoints */

/* Participantes */
app.get("/participants", async (req, res) => {
  try {
    const participantes = await db.collection("participants").find().toArray();
    res.send(participantes);
  } catch (erro) {
    res.status(500).send(erro.message);
  }
});
app.post("/participants", async (req, res) => {
  let { name } = req.body;
  let lastStatus = Date.now();

  const validation = schemaParticipante.validate(req.body, {
    abortEarly: false,
  });
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }
  
  name = stripHtml(name).result;
  name = name.trim();
  let objeto1 = { name, lastStatus };

  try {
    const testeParticip = await db
      .collection("participants")
      .findOne({ name: name });
    if (testeParticip) {
      return res.status(409).send("Esse nome já está em uso!");
    }
    let objeto2 = {
      from: `${name}`,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: `${dayjs().format("HH:mm:ss")}`,
    };
    await db.collection("participants").insertOne(objeto1);
    await db.collection("messages").insertOne(objeto2);
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* Mensagens */
app.post("/messages", async (req, res) => {
  let { to, text, type } = req.body;

  const validation = schemaMsg.validate(req.body, { abortEarly: false });
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  text = stripHtml(text).result;
  text = text.trim();
  let from;
  if (!req.headers.user) {
    return res.status(422).send("Header incompleto: User ausente!");
  } else {
    from = stripHtml(req.headers.user).result;
    from = from.trim();
  }

  const objeto = {
    from,
    to,
    text,
    type,
    time: dayjs().format("HH:mm:ss"),
  };

  try {
    const testeParticip = await db
      .collection("participants")
      .findOne({ name: from });
    if (!testeParticip) {
      return res.status(422).send("Esse nome não está em uso!");
    }

    await db.collection("messages").insertOne(objeto);
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/messages", async (req, res) => {
  let user;
  let { limit } = req.query;
  let mensagensLimitadas = [];
  if (limit) {
    if (Number(limit) <= 0 || isNaN(limit)) {
      return res.status(422).send("Escolha um Limite de mensagens válido");
    }
  }
  if (!req.headers.user) {
    return res.status(422).send("Header incompleto: User ausente!");
  } else {
    user = req.headers.user;
  }

  try {
    const mensagensTotais = await db
      .collection("messages")
      .find({ $or: [{ from: user }, { to: user }, { to: "Todos" }] })
      .toArray();
    if (mensagensTotais.length > limit) {
      for (let i = 0; i < limit; i++) {
        mensagensLimitadas.push(mensagensTotais[i]);
      }
      return res.send(mensagensLimitadas);
    }
    res.send(mensagensTotais);
  } catch {
    res.status(500).send(err.message);
  }
});

app.delete("/messages/:id", async (req, res) => {
  let user;
  if (!req.headers.user) {
    return res.status(422).send("Header incompleto: User ausente!");
  } else {
    user = req.headers.user;
  }

  const { id } = req.params;
  try {
    let mensagem = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(id) });
    if (!mensagem) {
      return res.sendStatus(404);
    } else if (mensagem.from !== user) {
      return res.sendStatus(401);
    }
    await db.collection("messages").deleteOne({ _id: new ObjectId(id) });
    res.send("Mensagem deletada");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put("/messages/:id", async (req, res) => {
  let user;
  const { id } = req.params;
  let { to, text, type } = req.body;

  if (!req.headers.user) {
    return res.status(422).send("Header incompleto: User ausente!");
  } else {
    user = req.headers.user;
  }

  const validation = schemaMsg.validate(req.body, { abortEarly: false });
  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  try {
    const testeParticip = await db
      .collection("participants")
      .findOne({ name: user });
    if (!testeParticip) {
      return res.status(422).send("Esse nome não está em uso!");
    }

    let mensagem = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(id) });
    log(mensagem);
    if (!mensagem) {
      return res.sendStatus(404);
    } else if (mensagem.from !== user) {
      return res.sendStatus(401);
    }

    await db.collection("messages").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          from: user,
          to,
          text,
          type,
          time: dayjs().format("HH:mm:ss"),
        },
      }
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* Status */
app.post("/status", async (req, res) => {
  let user;
  if (!req.headers.user) {
    return res.status(404).send("Header incompleto: User ausente!");
  } else {
    user = req.headers.user;
  }

  try {
    const testeParticip = await db
      .collection("participants")
      .findOne({ name: user });
    if (!testeParticip) {
      return res.status(404).send("Esse nome não está em uso!");
    }

    db.collection("participants").updateOne(
      { name: user },
      { $set: { name: user, lastStatus: Date.now() } }
    );
    res.send("Usuario Atualizado com Sucesso");
  } catch {
    res.status(500).send(err.message);
  }
});

/* Clean */
app.delete("/all", async (req, res) => {
  try {
    await db.collection("messages").deleteMany();
    await db.collection("participants").deleteMany();
    res.send("Tudo Limpo");
  } catch {
    res.status(500).send(err.message);
  }
});

// Ligar a aplicação do servidor para ouvir requisições:
const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor está rodando na porta ${PORT}`));
