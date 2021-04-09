const express = require('express')
const app = express()
const mongoClient = require('mongodb').MongoClient
const objectID = require('mongodb').ObjectID
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid');

app.use(express.json())

mongoClient.connect(process.env.CONNECTION_STRING, { useUnifiedTopology: true })
.then((client) => {
    const db = client.db("db");
    const users = db.collection("users");

    app.get("/", (req, res) => {
      users.find({}).toArray().then(r => {
        if (!r) res.send("No users exists yet")
        else res.send(r)
      })
    })
  })
  
app.listen(process.env.PORT)