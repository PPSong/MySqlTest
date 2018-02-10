const express = require('express')
const jwt = require('jsonwebtoken')

const app = express.Router()
const {
    body,
    check,
    checkSchema,
} = require('express-validator/check')

const {
    paramValidateErr
} = require('./util')

const {
    init,
    sequelize,
    Account,
    User,
    Friendship,
} = require('./model')

const {
    jwtOptions,
} = require('./util')

app.get("/reset", async function (req, res, next) {
    const result = await init()
    return res.json(result)
})

app.post("/register", [
    body('username').isLength({
        min: 1
    }).withMessage("用户名不能为空"),
    body('password').isLength({
        min: 1
    }).withMessage("密码不能为空")
], async function (req, res, next) {
    const err = paramValidateErr(req, next)

    if (err) {
        next(err)
        return
    }

    const username = req.body.username
    const password = req.body.password

    // 检查用户名是否已存在
    const user = await User.findOne({
        where: {
            username
        }
    })

    if (user) {
        return res.json({
            code: -1,
            msg: "用户名已存在!"
        })
    }

    let transaction;

    try {
        // get transaction
        transaction = await sequelize.transaction();

        const account = await Account.create({
            password,
        }, {
            transaction
        })

        const user = await User.create({
            id: account.id,
            username,
            nickname: `${username}_nick`,
            accountId: account.id,
        }, {
            transaction
        })

        // commit
        await transaction.commit();

        return res.json({
            code: 0,
            data: {
                username: username,
            }
        })
    } catch (err) {
        // Rollback transaction if any errors were encountered
        await transaction.rollback();

        return res.json({
            code: -1,
            msg: err.toString()
        })
    }
})

app.post("/login", [
    body('username').isLength({
        min: 1
    }).withMessage("用户名不能为空"),
    body('password').isLength({
        min: 1
    }).withMessage("密码不能为空")
], async function (req, res, next) {
    const err = paramValidateErr(req, next)

    if (err) {
        next(err)
        return
    }

    let username = req.body.username
    let password = req.body.password

    let account = await Account.findOne({
        include: [{
            model: User,
            where: {
                username
            }
        }]
    })

    if (!account) {
        return res.json({
            code: -1,
            msg: "无此用户!"
        })
    }

    if (account.password === password) {
        var payload = {
            username: account.user.username,
            nickname: account.user.nickname,
            accountId: account.id,
        }

        var token = jwt.sign(payload, jwtOptions.secretOrKey)

        return res.json({
            code: 0,
            data: {
                username,
                token
            }
        })
    } else {
        return res.json({
            code: -1,
            msg: "密码错误!"
        })
    }
})

module.exports = app