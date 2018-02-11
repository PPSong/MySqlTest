// todo
// 独立password和user profile
// setUser for Friendship
// 所有api输入参数要trim
// 用户名中不能包含"."
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const passport = require('passport')
const passportJWT = require("passport-jwt")
const JwtStrategy = passportJWT.Strategy
const Sequelize = require('sequelize')
const {
    Account,
    User,
    init
} = require('./model')

const {
    jwtOptions,
    paramValidateErr,
} = require('./util')

const openRouter = require('./open_router')
const {
    authMiddware,
    privateRouter
} = require('./private_router')

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: true
}))

// parse application/json
app.use(bodyParser.json())

// add this to avoid err: listen EADDRINUSE :::3000 after auto restart by nodemon
// process.on('SIGUSR2', () => {
//     process.exit(0)
// })

// passport
var strategy = new JwtStrategy(jwtOptions, async function (jwt_payload, done) {
    try {
        let account = await Account.findOne({
            include: [{
                model: User,
                where: {
                    username: jwt_payload.username
                }
            }]
        })

        if (account.user) {
            done(null, account.user)
        } else {
            done(null, false, {
                code: -1,
                msg: "无此用户!"
            })
        }
    } catch (err) {
        done(err)
    }
})

passport.use(strategy)
app.use(passport.initialize())

app.use(openRouter)

// 以下都是登录用户才能使用的API
app.use(authMiddware)

app.use(privateRouter)

// 通用的错误处理
app.use(function (err, req, res, next) {
    return res.json({
        code: -1,
        msg: err.toString()
    })
})

if (!module.parent) {
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    })
}

module.exports = app; // for testing