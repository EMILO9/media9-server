const express = require('express')
const app = express()
const mongoClient = require('mongodb').MongoClient
const objectID = require('mongodb').ObjectID
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const validator = require('validator');
const AWS = require('aws-sdk')
var multer = require('multer');
var multerS3 = require('multer-s3')
const cors = require('cors')
let s3 = new AWS.S3({accessKeyId: process.env.ACCESS_KEY_ID, secretAccessKey: process.env.SECRET_ACCESS_KEY, Bucket: process.env.BUCKET})
var upload = multer({
  limits: {
    files: 1,
    fileSize: 50 * 1024 * 1024
  },
  storage: multerS3({
    s3: s3,
    bucket: process.env.BUCKET,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, `media_${uuidv4()}`)
    }
  })
})
const customModules = require('./customModules')

app.use(express.json())
app.use(cors())

mongoClient.connect(process.env.CONNECTION_STRING, { useUnifiedTopology: true })
.then((client) => {
    const db = client.db("db")
    const users = db.collection("users")
    const pcs = db.collection("pcs")

    app.post("/register", (req, res) => {
      let {email, password} = req.body
      users.findOne({email})
      .then(r => {
        if (r) res.status(400).send("Email is already in use")
        else {
          let emailCheck = validator.isEmail(email)
          let passwordCheck = validator.isLength(password, {min: 5, max: 20})
          if (!emailCheck || !passwordCheck) res.status(400).send({emailCheck, passwordCheck})
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
        if (!r) res.status(400).send("Email doesnt exist")
        else bcrypt.compare(password, r.password, (err, result) => {
          if (!result) res.status(400).send("Wrong password")
          else {
            let user = {_id: r._id, email: r.email}
            jwt.sign(user, process.env.SECRET_KEY, (err, token) => {
              res.send({token, user})
            })
          }
        })
      })
    })

    app.post("/addPc", customModules.verifyToken, (req, res) => {
      jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
        if (err) res.status(400).send('No access token set')
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
        if (err) res.status(400).send('No access token set')
        else {
          pcs.findOne({owner: authData.email, _id: objectID(req.params.id)})
          .then(r => {
            if (!r) res.status(400).send("You dont have access to that PC")
            else {
              pcs.deleteOne({_id: objectID(req.params.id)})
              .then(r => res.send(r))
              r.media.map(m => {
                let params = {Bucket: process.env.BUCKET, Key: m.key}
                s3.deleteObject(params, (err, data) => {
                  if (err) res.status(400).send(err)
                  });
              })
            }
          })
        }
      })
    })


    let validationBeforeUpload = (req, res, next) => {
      jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
        if (err) res.status(400).send('No access token set')
        else {
          pcs.findOne({owner: authData.email, _id: objectID(req.params.id)}).then(r => {
            if (!r) res.status(400).send("You don't have access to that PC.")
            else next()
          })
        }
    })
    }
    
    app.post("/addMedia/:id", customModules.verifyToken, validationBeforeUpload, upload.single('file'), (req, res) => {
      pcs.updateOne(
        { _id: objectID(req.params.id) },
        { $push: { media: { url: req.file.location, type: req.file.mimetype, duration: 3000, name: req.file.originalname, key: req.file.key, size: req.file.size } } }
     ).then(r => res.send(r))
    })

    app.delete("/deleteMedia/:id/:key", customModules.verifyToken, (req, res) => {
      jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
        if (err) res.status(400).send('No access token set')
        else {
          pcs.findOne({owner: authData.email, _id: objectID(req.params.id)})
          .then(r => {
            if (!r) res.status(400).send("You don't have access to that PC.")
            else {
              s3.deleteObject({Bucket: process.env.BUCKET, Key: req.params.key}, function(err, data) {
                if (err) res.status(400).send(err)
                else {
                   pcs.updateOne({_id: objectID(req.params.id)},
                   { $pull: { media: { key: req.params.key } } }).then(r => {
                     res.send(r)
                    })
                }
              })
            }
          })
        }
      })
    })

    app.get("/pcs", customModules.verifyToken, (req, res) => {
      jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
        if (err) res.status(400).send('No access token set')
        else {
          pcs.find({owner: authData.email}).toArray()
          .then(r => {
            res.send(r)
          })
        }
      })
    })

  })
  
app.listen(process.env.PORT)