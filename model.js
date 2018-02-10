const Sequelize = require('sequelize')

//mysql
const sequelize = new Sequelize('pp_test', 'root', 'tcltcl', {
    dialect: 'mysql'
})

// Account
const Account = sequelize.define(
    'account', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        password: {
            type: Sequelize.STRING,
            allowNull: false,
        }
    }, {
        version: true
    }
)

// User
const User = sequelize.define(
    'user', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
        },
        accountId: {
            type: Sequelize.INTEGER,
            unique: true,
            allowNull: false,
        },
        username: {
            type: Sequelize.STRING,
            unique: true,
            allowNull: false,
        },
        nickname: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        mobile: {
            type: Sequelize.STRING
        },
    }, {
        version: true
    }
)

// Friendship
const Friendship = sequelize.define(
    'friendship', {
        key: {
            type: Sequelize.STRING,
            primaryKey: true
        },
        status: {
            // 0: 陌生人, 1: a关注b, 2: b关注a, 3: 互为好友
            type: Sequelize.ENUM("0", "1", "2", "3"),
            allowNull: false,
        }
    }, {
        version: true
    }
)

Account.hasOne(User, {foreignKey: "accountId"})

User.belongsToMany(Friendship, {
    through: 'UserFriendship',
})

Friendship.belongsToMany(User, {
    through: 'UserFriendship'
})

// Friendship.setFriendship = async function (ua, ub, status) {
//     let a = ua;
//     let b = ub;

//     if (ua >= ub) {
//         a = ub;
//         b = ua;
//     }

//     key = `${a}.${b}`
//     const r = await Friendship.findByPrimary(key)

//     if (r) {
//         r.status = status
//     } else {
//         Friendship.create({
//             key,
//             status
//         })
//     }
// };

const init = async () => {
    try {
        // await sequelize.dropAllSchemas()

        await sequelize.sync({
            force: true
        })

        const testUserNum = 10

        const accounts = Array(testUserNum).fill().map((_, i) => {
            return {
                password: '1'
            }
        })

        const a = await Account.bulkCreate(accounts)

        const users = Array(testUserNum).fill().map((_, i) => {
            const index = i + 1
            return {
                id: index,
                accountId: index,
                username: "u" + index,
                nickname: 'un' + index,
            }
        })

        const u = await User.bulkCreate(users)

        return {
            code: 0,
            data: "ok"
        }
    } catch (err) {
        console.log(err)
        return {
            code: -1,
            msg: err.toString()
        }
    }
}

module.exports = {
    sequelize,
    Account,
    User,
    Friendship,
    init
}