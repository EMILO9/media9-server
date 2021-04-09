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
    }
}

module.exports = customModules