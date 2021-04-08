const express = require('express')
const app = express()
const mongoClient = require('mongodb').MongoClient
const objectID = require('mongodb').ObjectID
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk')
var multer = require('multer');
var multerS3 = require('multer-s3')
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

app.use(express.json())

mongoClient.connect(process.env.CONNECTION_STRING, { useUnifiedTopology: true })
.then((client) => {
    console.log("Connected to Database");
    const db = client.db("database");
    const users = db.collection("users");
    const raspberrypi = db.collection("raspberrypi's")

    app.post('/signup', [
      body('email').isEmail().withMessage('must be a valid email adress'),
      body('password').isLength({ min: 5 }).withMessage('password must be at least 5 chars long')
    ], (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).send(errors.errors[0].msg);
      }
      let { email, password } = req.body
      users.findOne({ email: email }).then(response => {
        if (response) res.status(400).send("Email already in use")
        else bcrypt.hash(password, 8, (err, hash) => {
          users.insertOne({ email: email, password: hash}).then(r => res.status(200).send(r))
        });

      })
    });

    app.post('/login', (req, res) => {
      let { email, password } = req.body
      users.findOne({ email: email }).then(response => {
        if (!response) res.status(400).send("Email doesnt exists")
        else bcrypt.compare(password, response.password, function (err, result) {
          if (!result) res.status(400).send("Wrong password")
          else {
            let { _id, email} = response
            let user = { _id, email}
            jwt.sign(user, process.env.SECRET_KEY, {expiresIn: '2h'},(err, token) => {
              res.status(200).send({ token, user })
            })
          }
        });
      })
    })

    app.get('/private', verifyToken, (req, res) => {
      jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
        if (err) res.status(403).send('No access token set')
        else {
            raspberrypi.find({userAccess: { $in: [authData.email] }}).toArray().then(r => {
              res.status(200).send(r)
            }).catch(err => res.status(400).send(err))
        }
      })
    })

    app.post('/addPc', verifyToken, (req, res) => {
      jwt.verify(req.token, process.env.SECRET_KEY_JWT, (err, authData) => {
        if (err) res.status(403).send('No access token set')
        else {
          raspberrypi.insertOne({name: `PC_${uuidv4()}`,userAccess:[authData.email], "media":[]}).then(r => res.send(r.ops[0]))
        }
      })
    })

    app.delete('/deletePc/:id', verifyToken, (req, res) => {
      jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
        if (err) res.status(403).send('No access token set')
        else {
            raspberrypi.findOne({userAccess: { $in: [authData.email] }, _id: objectID(req.params.id)}).then(r => {
              if (!r) res.status(403).send("You don't have access to that PC.")
              else {
                raspberrypi.deleteOne({_id: objectID(req.params.id)}).then(r => res.send(r))
                r.media.map(m => {
                  let params = {Bucket: process.env.BUCKET, Key: m.key}
                  s3.deleteObject(params, (err, data) => {
                    if (err) console.log(err, err.stack);
                    else console.log(data);
                    });
                })
              }
            })
        }
      })
    })

let validation = (req, res, next) => {
  jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
    if (err) res.status(403).send('No access token set')
    else {
      raspberrypi.findOne({userAccess: { $in: [authData.email] }, _id: objectID(req.params.pc)}).then(r => {
        if (!r) res.status(403).send("You don't have access to that PC.")
        else next()
      })
    }
  })
}
app.post('/addMedia/:pc', verifyToken, validation, upload.single('file'), (req, res) => {
  raspberrypi.updateOne(
    { _id: objectID(req.params.pc) },
    { $push: { media: { url: req.file.location, type: req.file.mimetype, duration: 3000, name: req.file.originalname, key: req.file.key, size: req.file.size } } }
 ).then(r => res.send(r))
})

    app.delete('/deleteFile/:key/:id', verifyToken, (req, res) => {
      jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
        if (err) res.status(403).send('No access token set')
        else {
          raspberrypi.findOne({userAccess: { $in: [authData.email] }, _id: objectID(req.params.id)}).then(r => {
            if (!r) res.status(403).send("You don't have access to that PC.")
            else {
              var params = {
                Bucket: process.env.BUCKET, 
                Key: req.params.key
               };
               s3.deleteObject(params, function(err, data) {
                 if (err) console.log(err, err.stack);
                 else     console.log(data);
               });
               raspberrypi.updateOne( { _id: objectID(req.params.id)}, { $pull: { media: { key: req.params.key } } } ).then(r => res.send(r))
            }
          })
        }
      })
    })

    app.put('/updatePc/:id', verifyToken, (req, res) => {
      jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
        if (err) res.status(403).send('No access token set')
        else {
          raspberrypi.findOne({userAccess: { $in: [authData.email] }, _id: objectID(req.params.id)}).then(r => {
            if (!r) res.status(403).send("You don't have access to that PC.")
            else {
              raspberrypi.replaceOne(
                {_id: objectID(req.params.id)},
                {
                  name: req.body.name,
                  userAccess: req.body.userAccess,
                  media: req.body.media
                }
             ).then(r => res.send(r))
            }
          })
        }
      })
    })

    app.post('/expireTime', (req, res) => {
      let token = req.body.token
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => { 
        if (err) console.log(err)
        else {
          let difference = (a, b) => { return Math.abs(a - b); } // Difference in seconds
          let secondsToHms = function (seconds) {
            if (!seconds) return '';
           
            let duration = seconds;
            let hours = duration / 3600;
            duration = duration % (3600);
           
            let min = parseInt(duration / 60);
            duration = duration % (60);
           
            let sec = parseInt(duration);
           
            if (sec < 10) {
              sec = `0${sec}`;
            }
            if (min < 10) {
              min = `0${min}`;
            }
           
            if (parseInt(hours, 10) > 0) {
              return `${parseInt(hours, 10)}h ${min}m ${sec}s`
            }
            else if (min == 0) {
              return `${sec}s`
            }
            else {
              return `${min}m ${sec}s`
            }
          }
          res.send(secondsToHms(difference(new Date().getTime() / 1000, decoded.exp)))
        }
      });
    })
  })
  
app.listen(process.env.PORT)