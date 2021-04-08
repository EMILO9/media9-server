const express = require('express')
const app = express()
const mongoClient = require('mongodb').MongoClient
const objectID = require('mongodb').ObjectID

app.use(express.json())

app.get('/', (req, res)=> {
  res.send('Hello World')
})

app.listen(process.env.PORT , () => { console.log("starting...") })

mongoClient.connect(process.env.CONNECTION_STRING, { useUnifiedTopology: true })
.then((client) => {
    console.log("Connected to Database");
    const db = client.db("database");
    const users = db.collection("users");
    
    app.get('/', (req, res)=> {
        users.find({}).toArray().then(r => {
            res.send(r)
        })
    })
})