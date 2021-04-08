const express = require('express')
const app = express()
const mongoClient = require('mongodb').MongoClient
const objectID = require('mongodb').ObjectID

app.use(express.json())

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

app.listen(process.env.PORT)