const passportJWT = require("passport-jwt")
const ExtractJwt = passportJWT.ExtractJwt

// passport
let jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt')
jwtOptions.secretOrKey = 'pptest'

const {
    validationResult
} = require('express-validator/check')

const errorFormatter = ({
    location,
    msg,
    param,
    value,
    nestedErrors
}) => {
    // Build your resulting errors however you want! String, object, whatever - it works!
    return `${msg}`
}

const paramValidateErr = (req) => {
    const err = validationResult(req).formatWith(errorFormatter)
    if (err) {
        return err.array().join(";")
    } else {
        return null
    }
}

module.exports = {
    paramValidateErr,
    jwtOptions,
}