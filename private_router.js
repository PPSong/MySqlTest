const express = require('express')
const app = express.Router()
const passport = require('passport')
const {
    body,
    check,
    checkSchema,
} = require('express-validator/check')

const {
    paramValidateErr
} = require('./util')

const {
    sequelize,
    Account,
    User,
    Friendship,
} = require('./model')

const authMiddware = (req, res, next) => {
    passport.authenticate('jwt', {
        session: false
    }, (err, user, info) => {
        if (err) {
            return next(err)
        }
        if (!user) {
            if (info.code == null) {
                // 对于passport-jwt strategy的info特殊处理
                info = {
                    code: -1,
                    msg: info.message
                }
            }

            return res.json(info)
        }

        req.user = user

        next(null, req, res)
    })(req, res, next)
}

app.post("/secret", authMiddware, function (req, res) {
    return res.json({
        code: 0,
        data: "secret content"
    })
})

app.get("/follow/:accountId", [
    check('accountId').isLength({
        min: 1
    }).withMessage("目标用户不能为空")
], authMiddware, async function (req, res, next) {
    const err = paramValidateErr(req, next)

    if (err) {
        next(err)
        return
    }

    const target = req.params.accountId

    // 检查目标用户是否合法
    const targetUser = await User.findById(target)

    const me = req.user.accountId
    const meUser = await User.findById(me)

    if (!targetUser) {
        return res.json({
            code: -1,
            msg: '目标用户不合法!'
        })
    }

    // todo 如果任何一方有屏蔽则不能follow

    let key
    let status = "1"

    key = `${me}.${target}`
    if (me >= target) {
        key = `${target}.${me}`
        status = "2"
    }

    let dataMsg
    let transaction

    try {
        // get transaction
        transaction = await sequelize.transaction()

        const r = await Friendship.findByPrimary(key, {
            transaction,
            // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条Friendship
            lock: { of: Friendship,
            }
        })

        if (r) {
            if (r.status === "0") {
                // 如果是陌生人
                r.status = status
                dataMsg = "关注成功!"
            } else if (r.status === "1") {
                if (status === "1") {
                    // me已关注了target
                    dataMsg = "已关注过此用户!"
                } else {
                    // target已关注了me
                    status = "3"
                    dataMsg = "恭喜!成为好友!"
                }
            } else if (r.status === "2") {
                if (status === "2") {
                    // me已关注了target
                    dataMsg = "已关注过此用户!"
                } else {
                    // target已关注了me
                    status = "3"
                    dataMsg = "恭喜!成为好友!"
                }
            } else {
                // 已成为好友
                dataMsg = "已和对方是好友啦!你还想咋的!"
            }
        } else {
            const f = await Friendship.create({
                key,
                status
            }, {
                transaction
            })

            await f.addUsers([meUser, targetUser], {
                transaction
            })
            dataMsg = "关注成功!"
        }

        // commit
        await transaction.commit()

    } catch (err) {
        // Rollback transaction if any errors were encountered
        await transaction.rollback()

        return res.json({
            code: -1,
            msg: err.toString()
        })
    }

    return res.json({
        code: 0,
        data: dataMsg
    })
})

app.get("/getFriends/:fromTime?", authMiddware, async function (req, res) {
    const user = await User.findById(req.user.id)
    const r = await user.getFriendships({
        where: {
            status: '3'
        }
    })
    return res.json({
        code: 0,
        data: r
    })
})

// 我喜欢的人
app.get("/getFollows", authMiddware, function (req, res) {
    return res.json({
        code: 0,
        data: ["t1", "t2"]
    })
})

// 喜欢我的人
app.get("/getFans", authMiddware, function (req, res) {
    return res.json({
        code: 0,
        data: ["t1", "t2"]
    })
})

app.get("/unFollow/:username", authMiddware, function (req, res) {
    return res.json({
        code: 0,
        data: username
    })
})

app.get("/ban/:username", authMiddware, function (req, res) {
    return res.json({
        code: 0,
        data: username
    })
})

app.get("/unBan/:username", authMiddware, function (req, res) {
    return res.json({
        code: 0,
        data: username
    })
})

module.exports = {
    privateRouter: app,
    authMiddware
}