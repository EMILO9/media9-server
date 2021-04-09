const express = require('express')
const app = express()
const mongoClient = require('mongodb').MongoClient
const objectID = require('mongodb').ObjectID
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { body, validationResult } = require('express-validator')

app.use(express.json())

mongoClient.connect(process.env.CONNECTION_STRING, { useUnifiedTopology: true })
.then((client) => {
    const db = client.db("db")
    const users = db.collection("users")

    app.post("/register", (req, res) => {
      let {email, password} = req.body
      body('email').isEmail(),
      body('password').isLength({ min: 5 }),
      (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) res.status(400).json({ errors: errors.array() })
        else res.send({email, password})
       }
    })
  })
  
app.listen(process.env.PORT)