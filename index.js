const express = require('express')
const app = express()
const mongoClient = require('mongodb').MongoClient
const objectID = require('mongodb').ObjectID
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const validator = require('validator');
const customModules = require('./customModules')

app.use(express.json())

mongoClient.connect(process.env.CONNECTION_STRING, { useUnifiedTopology: true })
.then((client) => {
    const db = client.db("db")
    const users = db.collection("users")
    const pcs = db.collection("pcs")

    app.post("/register", (req, res) => {
      let {email, password} = req.body
      users.findOne({email})
      .then(r => {
        if (r) res.send("Email is already in use")
        else {
          let emailCheck = validator.isEmail(email)
          let passwordCheck = validator.isLength(password, {min: 5, max: 20})
          if (!emailCheck || !passwordCheck) res.send({emailCheck, passwordCheck})
          else {
            bcrypt.hash(password, 8, (err, hash) => {
              users.insertOne({email: email, password: hash})
              .then(r => res.send(r.ops[0]))
            })
          }
        }
      })
    })

    app.post("/login", (req, res) => {
      let {email, password} = req.body
      users.findOne({email})
      .then(r => {
        if (!r) res.send("Email doesnt exist")
        else bcrypt.compare(password, r.password, (err, result) => {
          if (!result) res.send("Wrong password")
          else {
            let user = {_id: r._id, email: r.email}
            jwt.sign(user, process.env.SECRET_KEY, (err, token) => {
              res.send({token, user})
            })
          }
        })
      })
    })

    app.get("/addPc", customModules.verifyToken, (req, res) => {
      jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
        if (err) res.send('No access token set')
        else {
          pcs.insertOne({
            name: `pc_${uuidv4()}`,
            media: [],
            owner: authData.email
          })
          .then(r => {
            res.send(r.ops[0])
          })
        }
      })
    })

    app.delete("/deletePc/:id", customModules.verifyToken, (req, res) => {
      jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
        if (err) res.send('No access token set')
        else {
          res.send(req.params.id)
        }
      })
    })
  
  })
  
app.listen(process.env.PORT)