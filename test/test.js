//Require the dev-dependencies
const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../index')
const should = chai.should()
const expect = chai.expect
chai.use(chaiHttp)

let count = 0

const postApi = (api, token) => {
    return chai.request(server)
        .post(`/${api}`)
        .set('Authorization', 'JWT ' + token)
}

const getApi = (api, token) => {
    return chai.request(server)
        .get(`/${api}`)
        .set('Authorization', 'JWT ' + token)
}

const getRegisterUserAndLoginToken = async () => {
    count = count + 1

    const user = {
        username: 't' + count,
        password: '1'
    }

    let result = await chai
        .request(server)
        .post('/register')
        .send(user)

    result = await chai
        .request(server)
        .post('/login')
        .send(user)

    return result.body.data
}

//Our parent block
describe('BDD', () => {
    before((done) => {
        chai.request(server)
            .get('/reset')
            .end((err, res) => {
                if (err) {
                    console.error(err)
                    done()
                } else {
                    console.log("reset finished")
                    done()
                }
            })
    })

    // 未登录状态的尝试 只需要尝试一个即可, 其他的靠代码结构来保证

    // 注册
    describe('注册', () => {
        it('注册成功', (done) => {
            const user = {
                username: 'p1',
                password: '1'
            }

            chai.request(server)
                .post('/register')
                .send(user)
                .end((err, res) => {
                    res.should.have.status(200)
                    res.body.code.should.be.eql(0)
                    done()
                })
        })

        it('注册失败(用户名重复)', (done) => {
            const user = {
                username: 'p1',
                password: '1'
            }

            chai.request(server)
                .post('/register')
                .send(user)
                .end((err, res) => {
                    res.should.have.status(200)
                    res.body.code.should.be.eql(-1)
                    done()
                })
        })
    })

    // 登录
    describe('登录', () => {
        it('登录成功', (done) => {
            const user = {
                username: 'p1',
                password: '1'
            }

            chai.request(server)
                .post('/login')
                .send(user)
                .end((err, res) => {
                    res.should.have.status(200)
                    res.body.code.should.be.eql(0)
                    done()
                })
        })
    })

    /*
        陌生人
        成为好友 -> A解除好友 -> 再次成为好友 -> B解除好友

        A关注B
        B关注A (成为好友)

        A解除好友 (A解除好友)

        A关注B
        B关注A (再次成为好友)

        B解除好友 (B解除好友)
    */
    describe('成为好友 -> 解除好友 -> 再次成为好友 -> 解除好友', () => {
        let uIdA, uTokenA, uIdB, uTokenB

        before(async (done) => {
            try {
                // 注册用户
                const r1 = await getRegisterUserAndLoginToken()
                uIdA = r1.id
                uTokenA = r1.token

                const r2 = await getRegisterUserAndLoginToken()
                uIdB = r2.id
                uTokenB = r2.token

                done()
            } catch (err) {
                done(err)
            }
        })

        it('成为好友', async (done) => {
            try {
                let r

                // A关注B
                await getApi(`follow/${uIdB}`, uTokenA)

                // B关注A
                await getApi(`follow/${uIdA}`, uTokenB)

                // 判断
                r = await getApi(`getFriends`, uTokenA)
                r.body.data.should.deep.include({
                    targetId: uIdB
                })

                r = await getApi(`getFriends`, uTokenB)
                r.body.data.should.deep.include({
                    targetId: uIdA
                })

                done()
            } catch (err) {
                done(err)
            }
        })

        it('A解除好友', async (done) => {
            try {
                let r

                // A解除好友
                await getApi(`unfriend/${uIdB}`, uTokenA)

                // 判断
                r = await getApi(`getFriends`, uTokenA)
                r.body.data.should.not.deep.include({
                    targetId: uIdB
                })

                r = await getApi(`getFriends`, uTokenB)
                r.body.data.should.not.deep.include({
                    targetId: uIdA
                })

                done()
            } catch (err) {
                done(err)
            }
        })

        it('再次成为好友', async (done) => {
            try {
                let r

                // A关注B
                await getApi(`follow/${uIdB}`, uTokenA)

                // B关注A
                await getApi(`follow/${uIdA}`, uTokenB)

                // 判断
                r = await getApi(`getFriends`, uTokenA)
                r.body.data.should.deep.include({
                    targetId: uIdB
                })

                r = await getApi(`getFriends`, uTokenB)
                r.body.data.should.deep.include({
                    targetId: uIdA
                })

                done()
            } catch (err) {
                done(err)
            }
        })

        it('B解除好友', async (done) => {
            try {
                let r

                // B解除好友
                await getApi(`unfriend/${uIdA}`, uTokenB)

                // 判断
                r = await getApi(`getFriends`, uTokenA)
                r.body.data.should.not.deep.include({
                    targetId: uIdB
                })

                r = await getApi(`getFriends`, uTokenB)
                r.body.data.should.not.deep.include({
                    targetId: uIdA
                })

                done()
            } catch (err) {
                done(err)
            }
        })
    })

    /*
        陌生人
        单方屏蔽双方关注失败 -> 双方屏蔽双方关注失败 -> 单方解除屏蔽双方关注失败 -> 双方解除屏蔽成为好友 -> 单方屏蔽可成为陌生人

        A屏蔽B
        A关注B失败 (单方屏蔽双方关注失败)
        B关注A失败 (单方屏蔽双方关注失败)

        B屏蔽A
        A关注B失败 (双方屏蔽双方关注失败)
        B关注A失败 (双方屏蔽双方关注失败)

        A解除屏蔽B
        A关注B失败 (单方解除屏蔽双方关注失败)
        B关注A失败 (单方解除屏蔽双方关注失败)

        B解除屏蔽A
        A关注B成功
        B关注A成功 (双方解除屏蔽成为好友)

        A屏蔽B (单方屏蔽可成为陌生人)
    */
    describe('单方屏蔽双方关注失败 -> 双方屏蔽双方关注失败 -> 单方解除屏蔽双方关注失败 -> 双方解除屏蔽成为好友 -> 单方屏蔽可成为陌生人', () => {
        let uIdA, uTokenA, uIdB, uTokenB

        before(async (done) => {
            try {
                // 注册用户
                const r1 = await getRegisterUserAndLoginToken()
                uIdA = r1.id
                uTokenA = r1.token

                const r2 = await getRegisterUserAndLoginToken()
                uIdB = r2.id
                uTokenB = r2.token

                done()
            } catch (err) {
                done(err)
            }
        })

        it('单方屏蔽双方关注失败', async (done) => {
            try {
                let r

                // A屏蔽B
                await getApi(`ban/${uIdB}`, uTokenA)

                // 判断
                // A关注B失败 (单方屏蔽双方关注失败)
                r = await getApi(`follow/${uIdB}`, uTokenA)
                r.body.code.should.eql(-1)
                r.body.msg.should.eql('对方被你屏蔽中无法follow!')

                // B关注A失败 (单方屏蔽双方关注失败)
                r = await getApi(`follow/${uIdA}`, uTokenB)
                r.body.code.should.eql(-1)
                r.body.msg.should.eql('对方把你屏蔽了无法follow!')

                done()
            } catch (err) {
                done(err)
            }
        })

        it('双方屏蔽双方关注失败', async (done) => {
            try {
                let r

                // B屏蔽A
                await getApi(`ban/${uIdA}`, uTokenB)

                // 判断
                // A关注B失败 (单方屏蔽双方关注失败)
                r = await getApi(`follow/${uIdB}`, uTokenA)
                r.body.code.should.eql(-1)
                r.body.msg.should.eql('对方被你屏蔽中无法follow!')

                // B关注A失败 (单方屏蔽双方关注失败)
                r = await getApi(`follow/${uIdA}`, uTokenB)
                r.body.code.should.eql(-1)
                r.body.msg.should.eql('对方被你屏蔽中无法follow!')

                done()
            } catch (err) {
                done(err)
            }
        })

        it('单方解除屏蔽双方关注失败', async (done) => {
            try {
                let r

                // A解除屏蔽B
                await getApi(`unBan/${uIdB}`, uTokenA)

                // 判断
                // A关注B失败 (单方屏蔽双方关注失败)
                r = await getApi(`follow/${uIdB}`, uTokenA)
                r.body.code.should.eql(-1)
                r.body.msg.should.eql('对方把你屏蔽了无法follow!')

                // B关注A失败 (单方屏蔽双方关注失败)
                r = await getApi(`follow/${uIdA}`, uTokenB)
                r.body.code.should.eql(-1)
                r.body.msg.should.eql('对方被你屏蔽中无法follow!')

                done()
            } catch (err) {
                done(err)
            }
        })

        it('双方解除屏蔽成为好友', async (done) => {
            try {
                let r

                // B解除屏蔽A
                await getApi(`unBan/${uIdA}`, uTokenB)

                // A关注B成功
                r = await getApi(`follow/${uIdB}`, uTokenA)

                // 判断
                // B关注A成功 (双方解除屏蔽成为好友)
                r = await getApi(`follow/${uIdA}`, uTokenB)

                r = await getApi(`getFriends`, uTokenA)
                r.body.data.should.deep.include({
                    targetId: uIdB
                })

                r = await getApi(`getFriends`, uTokenB)
                r.body.data.should.deep.include({
                    targetId: uIdA
                })

                done()
            } catch (err) {
                done(err)
            }
        })

        it('单方屏蔽可成为陌生人', async (done) => {
            try {
                let r

                // 判断
                // A屏蔽B (单方屏蔽可成为陌生人)
                r = await getApi(`ban/${uIdB}`, uTokenA)

                r = await getApi(`getFriends`, uTokenA)
                r.body.data.should.not.deep.include({
                    targetId: uIdB
                })

                r = await getApi(`getFriends`, uTokenB)
                r.body.data.should.not.deep.include({
                    targetId: uIdA
                })

                r = await getApi(`getFans`, uTokenA)
                r.body.data.should.not.deep.include({
                    fansId: uIdB
                })

                r = await getApi(`getFans`, uTokenB)
                r.body.data.should.not.deep.include({
                    fansId: uIdA
                })

                r = await getApi(`getStars`, uTokenA)
                r.body.data.should.not.deep.include({
                    starId: uIdB
                })

                r = await getApi(`getStars`, uTokenB)
                r.body.data.should.not.deep.include({
                    starId: uIdA
                })

                done()
            } catch (err) {
                done(err)
            }
        })
    })

    /*
        陌生人
        单方关注后单方屏蔽可成为陌生人

        A关注B
        A屏蔽B (单方关注后单方A屏蔽可成为陌生人)

        A解除屏蔽B
        A关注B
        B屏蔽A (单方关注后单方B屏蔽可成为陌生人)
    */
    describe('单方关注后单方屏蔽可成为陌生人', () => {
        let uIdA, uTokenA, uIdB, uTokenB

        before(async (done) => {
            try {
                // 注册用户
                const r1 = await getRegisterUserAndLoginToken()
                uIdA = r1.id
                uTokenA = r1.token

                const r2 = await getRegisterUserAndLoginToken()
                uIdB = r2.id
                uTokenB = r2.token

                done()
            } catch (err) {
                done(err)
            }
        })

        it('单方关注后单方A屏蔽可成为陌生人', async (done) => {
            try {
                let r

                // A关注B
                r = await getApi(`follow/${uIdB}`, uTokenA)

                // 判断
                // A屏蔽B (单方关注后单方屏蔽可成为陌生人)
                r = await getApi(`ban/${uIdB}`, uTokenA)

                r = await getApi(`getFriends`, uTokenA)
                r.body.data.should.not.deep.include({
                    targetId: uIdB
                })

                r = await getApi(`getFriends`, uTokenB)
                r.body.data.should.not.deep.include({
                    targetId: uIdA
                })

                r = await getApi(`getStars`, uTokenA)
                r.body.data.should.not.deep.include({
                    starId: uIdB
                })

                r = await getApi(`getStars`, uTokenB)
                r.body.data.should.not.deep.include({
                    starId: uIdA
                })

                r = await getApi(`getFans`, uTokenA)
                r.body.data.should.not.deep.include({
                    fansId: uIdB
                })

                r = await getApi(`getFans`, uTokenB)
                r.body.data.should.not.deep.include({
                    fansId: uIdA
                })

                done()
            } catch (err) {
                done(err)
            }
        })

        it('单方关注后单方B屏蔽可成为陌生人', async (done) => {
            try {
                let r

                // A解除屏蔽B
                getApi(`unBan/${uIdB}`, uTokenA)

                // A关注B
                r = await getApi(`follow/${uIdB}`, uTokenA)

                // 判断
                // B屏蔽A (单方关注后单方屏蔽可成为陌生人)
                r = await getApi(`ban/${uIdA}`, uTokenB)

                r = await getApi(`getFriends`, uTokenA)
                r.body.data.should.not.deep.include({
                    targetId: uIdB
                })

                r = await getApi(`getFriends`, uTokenB)
                r.body.data.should.not.deep.include({
                    targetId: uIdA
                })

                r = await getApi(`getStars`, uTokenA)
                r.body.data.should.not.deep.include({
                    starId: uIdB
                })

                r = await getApi(`getStars`, uTokenB)
                r.body.data.should.not.deep.include({
                    starId: uIdA
                })

                r = await getApi(`getFans`, uTokenA)
                r.body.data.should.not.deep.include({
                    fansId: uIdB
                })

                r = await getApi(`getFans`, uTokenB)
                r.body.data.should.not.deep.include({
                    fansId: uIdA
                })

                done()
            } catch (err) {
                done(err)
            }
        })
    })
})