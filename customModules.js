const objectID = require('mongodb').ObjectID
const jwt = require('jsonwebtoken')

const customModules = {
    verifyToken: (req, res, next) => {
        const bearerHeader = req.headers['authorization']
        if(typeof bearerHeader !== 'undefined') {
            const bearer = bearerHeader.split(' ')
            const bearerToken = bearer[1]
            req.token = bearerToken
            next()
        } else {
            res.send('No access token set')
        }
    },
    validationBeforeUpload: (req, res, next) => {
        jwt.verify(req.token, process.env.SECRET_KEY, (err, authData) => {
            if (err) res.status(403).send('No access token set')
            else {
              pcs.findOne({owner: authData.email, _id: objectID(req.body._id)}).then(r => {
                if (!r) res.status(403).send("You don't have access to that PC.")
                else next()
              })
            }
        })
    }
}

module.exports = customModules