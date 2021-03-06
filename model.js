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

Account.hasOne(User, {
    foreignKey: "accountId"
})

// 粉丝
const FansStar = sequelize.define(
    'fansStar', {
        fansId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        starId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        softDeleted: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        }
    }, {
        paranoid: false,
    }
)

User.belongsToMany(User, {
    as: "Stars",
    through: FansStar,
    foreignKey: 'fansId',
})

User.belongsToMany(User, {
    as: "Fans",
    through: FansStar,
    foreignKey: 'starId'
})

// 黑名单
const BlackList = sequelize.define(
    'blackList', {
        ownerId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        targetId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        softDeleted: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        }
    }, {
        paranoid: false
    }
)

User.belongsToMany(User, {
    as: "BanUsers",
    through: BlackList,
    foreignKey: 'ownerId'
})

User.belongsToMany(User, {
    as: "BanOwners",
    through: BlackList,
    foreignKey: 'targetId'
})

// 好友
const FriendList = sequelize.define(
    'friendList', {
        ownerId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        targetId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        softDeleted: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        }
    }, {
        paranoid: false
    }
)

User.belongsToMany(User, {
    as: "FriendOwners",
    through: FriendList,
    foreignKey: 'targetId'
})

User.belongsToMany(User, {
    as: "Friends",
    through: FriendList,
    foreignKey: 'ownerId'
})

const init = async () => {
    try {
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
    FansStar,
    BlackList,
    FriendList,
    init
}