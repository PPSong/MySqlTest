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
    FansStar,
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

// const addFans = async (fansId, starId, transaction) => {
//     const r = await FansStar.findOne({
//         where: {
//             fansId: fansId,
//             starId: starId
//         },
//         paranoid: false
//     }, {
//         transaction
//     })

//     if (r) {
//         r.setDataValue('deletedAt', null)
//         await r.save({
//             transaction
//         })
//     } else {
//         await FansStar.create({
//             fansId: fansId,
//             starId: starId
//         }, {
//             transaction
//         })
//     }
// }

// const removeFans = async (fansId, starId, transaction) => {
//     const r = await FansStar.findOne({
//         where: {
//             fansId: fansId,
//             starId: starId
//         }
//     }, {
//         transaction
//     })

//     if (r) {
//         r.setDataValue('deletedAt', Date.now())
//         await r.save({
//             transaction
//         })
//     } else {
//        // already removed
//     }
// }

app.post("/secret", authMiddware, async function (req, res) {
    // const u1 = await User.findById(1)
    // const u2 = await User.findById(2)
    // const u3 = await User.findById(3)
    // const u4 = await User.findById(4)

    let transaction

    try {
        // get transaction
        transaction = await sequelize.transaction()

        // await u1.addFans([u2, u3], {transaction, paranoid: false})

        // await u1.setFans([u3, u4], {transaction, paranoid: true})

        // await u1.setFans([u2, u3], {transaction, paranoid: true})

        // await addFans(1, 2, transaction)
        // await addFans(1, 3, transaction)

        // await addFans(1, 4, transaction)

        // await removeFans(1, 4, transaction)

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
        data: "secret"
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

    const target = parseInt(req.params.accountId)
    const targetUser = await User.findById(target)

    const me = req.user.accountId
    const meUser = await User.findById(me)

    // 检查目标用户是否合法
    if (target === me) {
        return res.json({
            code: -1,
            msg: '不能关注自己!'
        })
    }

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