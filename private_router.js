const express = require('express')
const app = express.Router()
const passport = require('passport')
const {
    body,
    check,
    checkSchema,
} = require('express-validator/check')

const {
    matchedData,
    sanitize
} = require('express-validator/filter');

const {
    paramValidateErr,
    utcNow
} = require('./util')

const {
    sequelize,
    Account,
    User,
    FansStar,
    BlackList,
    FriendList,
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

app.get("/follow/:userId", [
        check('userId').isNumeric().withMessage("目标用户不能为空"),
        sanitize('userId').toInt()
    ],
    authMiddware,
    async function (req, res, next) {
        const err = paramValidateErr(req, next)

        if (err) {
            next(err)
            return
        }

        let userId = req.params.userId
        let meId = req.user.accountId

        // 检查userId是否是自己
        if (meId === userId) {
            return res.json({
                code: -1,
                data: "不能follow自己"
            })
        }

        // 检查userId是否已follow
        const r = await FansStar.findOne({
            where: {
                fansId: meId,
                starId: userId,
                softDeleted: false
            }
        })

        if (r) {
            return res.json({
                code: -1,
                msg: "早已follow对方!"
            })
        }

        // 如果任何一方有屏蔽则不能follow
        const banUser = await BlackList.findOne({
            attributes: ['targetId'],
            where: {
                softDeleted: false,
                ownerId: meId,
                targetId: userId,
            }
        })

        if (banUser) {
            return res.json({
                code: -1,
                msg: "对方被你屏蔽中无法follow!"
            })
        }

        const beBanUser = await BlackList.findOne({
            attributes: ['ownerId'],
            where: {
                softDeleted: false,
                ownerId: userId,
                targetId: meId,
            }
        })

        if (beBanUser) {
            return res.json({
                code: -1,
                msg: "对方把你屏蔽了无法follow!"
            })
        }

        // 检查是否是好友状态
        const fr = await FriendList.findOne({
            where: {
                ownerId: meId,
                targetId: userId,
                softDeleted: false
            }
        })

        if (fr) {
            return res.json({
                code: -1,
                msg: "你和对方是好友, 不用follow了!"
            })
        }

        let transaction

        try {
            // get transaction
            transaction = await sequelize.transaction()

            const rc = await FansStar.findOrCreate({
                where: {
                    fansId: meId,
                    starId: userId
                },
                transaction,
                // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条FansStar
                lock: { of: FansStar
                }
            })

            await rc[0].update({
                softDeleted: false
            }, {
                transaction
            })

            // 检查是否对方也follow了你
            const tmpR = await FansStar.findOne({
                where: {
                    fansId: userId,
                    starId: meId,
                    softDeleted: false
                },
                transaction,
                // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条FansStar
                lock: { of: FansStar
                }
            })

            if (tmpR) {
                // 成为好友
                const fc1 = await FriendList.findOrCreate({
                    where: {
                        ownerId: meId,
                        targetId: userId
                    },
                    transaction,
                    // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条FansStar
                    lock: { of: FriendList
                    }
                })

                await fc1[0].update({
                    softDeleted: false
                }, {
                    transaction
                })

                const fc2 = await FriendList.findOrCreate({
                    where: {
                        ownerId: userId,
                        targetId: meId
                    },
                    transaction,
                    // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条FansStar
                    lock: { of: FriendList
                    }
                })

                await fc2[0].update({
                    softDeleted: false
                }, {
                    transaction
                })
            }

            await transaction.commit()
        } catch (err) {
            await transaction.rollback()

            return res.json({
                code: -1,
                msg: err.toString()
            })
        }

        return res.json({
            code: 0,
            data: "follow成功"
        })
    })

app.get("/unfollow/:userId", [
        check('userId').isNumeric().withMessage("目标用户不能为空"),
        sanitize('userId').toInt()
    ],
    authMiddware,
    async function (req, res, next) {
        const err = paramValidateErr(req, next)

        if (err) {
            next(err)
            return
        }

        let userId = req.params.userId
        let meId = req.user.accountId

        // 检查userId是否是自己
        if (meId === userId) {
            return res.json({
                code: -1,
                data: "不能unfollow自己"
            })
        }

        // 检查是否是好友状态
        const fr = await FriendList.findOne({
            where: {
                ownerId: meId,
                targetId: userId,
                softDeleted: false
            }
        })

        if (fr) {
            return res.json({
                code: -1,
                msg: "你和对方是好友, 只能解除好友, 不能unfollow!"
            })
        }

        let transaction

        try {
            // get transaction
            transaction = await sequelize.transaction()

            // 检查userId是否已被移除
            const r = await FansStar.findOne({
                where: {
                    fansId: meId,
                    starId: userId,
                    softDeleted: false
                },
                transaction,
                // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条FansStar
                lock: { of: FansStar
                }
            })

            if (!r) {
                transaction.commit()
                return res.json({
                    code: -1,
                    msg: "对方早已移除!"
                })
            }

            await r.update({
                softDeleted: true
            }, {
                transaction
            })

            transaction.commit()
        } catch (err) {
            await transaction.rollback()

            return res.json({
                code: -1,
                msg: err.toString()
            })
        }

        return res.json({
            code: 0,
            data: "unfollow成功"
        })
    })

app.get("/getFriends/:fromTime?",
    authMiddware,
    async function (req, res) {
        // todo add fromTime validation and filter
        const meId = req.user.accountId

        const r = await FriendList.findAll({
            attributes: ['targetId'],
            where: {
                ownerId: meId,
                softDeleted: false,
            }
        })

        return res.json({
            code: 0,
            data: r
        })
    })

// 我喜欢的人
app.get("/getStars/:fromTime?",
    authMiddware,
    async function (req, res, next) {
        // todo add fromTime validation and filter
        const meId = req.user.accountId

        const r = await FansStar.findAll({
            attributes: ['starId'],
            where: {
                fansId: meId,
                softDeleted: false,
            }
        })

        return res.json({
            code: 0,
            data: r
        })
    })

// 喜欢我的人
app.get("/getFans/:fromTime?",
    authMiddware,
    async function (req, res, next) {
        // todo add fromTime validation and filter
        const meId = req.user.accountId

        const r = await FansStar.findAll({
            attributes: ['fansId'],
            where: {
                starId: meId,
                softDeleted: false,
            }
        })

        return res.json({
            code: 0,
            data: r
        })
    })

app.get("/ban/:userId", [
        check('userId').isNumeric().withMessage("目标用户不能为空"),
        sanitize('userId').toInt()
    ],
    authMiddware,
    async function (req, res, next) {
        const err = paramValidateErr(req, next)

        if (err) {
            next(err)
            return
        }

        let userId = req.params.userId
        let meId = req.user.accountId

        // 检查userId是否是自己
        if (meId === userId) {
            return res.json({
                code: -1,
                data: "不能ban自己"
            })
        }

        // 检查userId是否已ban
        const r = await BlackList.findOne({
            where: {
                ownerId: meId,
                targetId: userId,
                softDeleted: false
            }
        })

        if (r) {
            return res.json({
                code: -1,
                msg: "早已ban对方!"
            })
        }

        let transaction

        try {
            // get transaction
            transaction = await sequelize.transaction()

            const rc = await BlackList.findOrCreate({
                where: {
                    ownerId: meId,
                    targetId: userId
                },
                transaction,
                // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条BlackList
                lock: { of: BlackList
                }
            })

            await rc[0].update({
                softDeleted: false
            }, {
                transaction
            })

            // 检查是否是好友状态, 如果是则解除好友回到陌生人状态
            const fr = await FriendList.findAll({
                where: {
                    softDeleted: false,
                    $or: [{
                            ownerId: meId,
                            targetId: userId,
                        },
                        {
                            ownerId: userId,
                            targetId: meId,
                        }

                    ]
                },
                transaction,
                // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条FriendList
                lock: { of: FriendList
                }
            })

            for (let i = 0; i < fr.length; i++) {
                await fr[i].update({
                    softDeleted: true
                }, {
                    transaction
                })
            }

            // 检查follow, 如果有则解除回到陌生人状态
            const fsr = await FansStar.findAll({
                where: {
                    softDeleted: false,
                    $or: [{
                            fansId: meId,
                            starId: userId,
                        },
                        {
                            fansId: userId,
                            starId: meId,
                        }

                    ]
                },
                transaction,
                // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条FriendList
                lock: { of: FansStar
                }
            })

            for (let i = 0; i < fsr.length; i++) {
                await fsr[i].update({
                    softDeleted: true
                }, {
                    transaction
                })
            }

            await transaction.commit()
        } catch (err) {
            await transaction.rollback()

            return res.json({
                code: -1,
                msg: err.toString()
            })
        }

        return res.json({
            code: 0,
            data: "ban成功"
        })
    })

app.get("/unBan/:userId", [
        check('userId').isNumeric().withMessage("目标用户不能为空"),
        sanitize('userId').toInt()
    ],
    authMiddware,
    async function (req, res, next) {
        const err = paramValidateErr(req, next)

        if (err) {
            next(err)
            return
        }

        let userId = req.params.userId
        let meId = req.user.accountId

        // 检查userId是否是自己
        if (meId === userId) {
            return res.json({
                code: -1,
                data: "不能unban自己"
            })
        }

        let transaction

        try {
            // get transaction
            transaction = await sequelize.transaction()

            // 检查userId是否已被移除
            const r = await BlackList.findOne({
                where: {
                    ownerId: meId,
                    targetId: userId,
                    softDeleted: false
                },
                transaction,
                // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条BlackList
                lock: { of: BlackList
                }
            })

            if (!r) {
                transaction.commit()
                return res.json({
                    code: -1,
                    msg: "对方早已unban!"
                })
            }

            await r.update({
                softDeleted: true
            }, {
                transaction
            })

            transaction.commit()
        } catch (err) {
            await transaction.rollback()

            return res.json({
                code: -1,
                msg: err.toString()
            })
        }

        return res.json({
            code: 0,
            data: "unban成功"
        })
    })

app.get("/unfriend/:userId", [
        check('userId').isNumeric().withMessage("目标用户不能为空"),
        sanitize('userId').toInt()
    ],
    authMiddware,
    async function (req, res, next) {
        const err = paramValidateErr(req, next)

        if (err) {
            next(err)
            return
        }

        let userId = req.params.userId
        let meId = req.user.accountId

        // 检查userId是否是自己
        if (meId === userId) {
            return res.json({
                code: -1,
                data: "不能unfriend自己"
            })
        }

        let transaction

        try {
            // get transaction
            transaction = await sequelize.transaction()

            // 检查是否是好友状态, 如果是则解除好友回到陌生人状态
            const fr = await FriendList.findAll({
                where: {
                    softDeleted: false,
                    $or: [{
                            ownerId: meId,
                            targetId: userId,
                        },
                        {
                            ownerId: userId,
                            targetId: meId,
                        }

                    ]
                },
                transaction,
                // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条FriendList
                lock: { of: FriendList
                }
            })

            if (fr.length === 0) {
                transaction.commit()
                return res.json({
                    code: -1,
                    msg: "早已unfriend对方!"
                })
            }

            for (let i = 0; i < fr.length; i++) {
                await fr[i].update({
                    softDeleted: true
                }, {
                    transaction
                })
            }

            // 检查follow, 如果有则解除回到陌生人状态
            const fsr = await FansStar.findAll({
                where: {
                    softDeleted: false,
                    $or: [{
                            fansId: meId,
                            starId: userId,
                        },
                        {
                            fansId: userId,
                            starId: meId,
                        }

                    ]
                },
                transaction,
                // 使用lock: SELECT ... FOR UPDATE 防止再改动前被其他人修改这条FriendList
                lock: { of: FansStar
                }
            })

            for (let i = 0; i < fsr.length; i++) {
                await fsr[i].update({
                    softDeleted: true
                }, {
                    transaction
                })
            }

            await transaction.commit()
        } catch (err) {
            await transaction.rollback()

            return res.json({
                code: -1,
                msg: err.toString()
            })
        }

        return res.json({
            code: 0,
            data: "ban成功"
        })
    })

module.exports = {
    privateRouter: app,
    authMiddware
}