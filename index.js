const express = require('express')
const app = express()
const mongoClient = require('mongodb').MongoClient
const objectID = require('mongodb').ObjectID
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const validator = require('validator');

app.use(express.json())

mongoClient.connect(process.env.CONNECTION_STRING, { useUnifiedTopology: true })
.then((client) => {
    const db = client.db("db")
    const users = db.collection("users")

    app.post("/register", (req, res) => {
      let {email, password} = req.body
      let emailCheck = validator.isEmail(email)
      let passwordCheck = validator.isLength(password, {min: 5, max: 20})
      res.status(200).send({emailCheck, passwordCheck})
    })
  
  })
  
app.listen(process.env.PORT)