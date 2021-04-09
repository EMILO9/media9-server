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

    app.get("/register", (req, res) => {
      let {email, password} = req.body
      res.send({email, password})
    })
  })
  
app.listen(process.env.PORT)