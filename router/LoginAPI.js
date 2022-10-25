const express = require('express');
const router = express.Router();
const { auth } = require("../middleware/auth");
const { conn } = require("../config/config");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

conn.connect((err) => {
    if (err) {
        console.log(err)
    }
    else {
        console.log('mysql connecting...')
    }
})

router.post('/register', (req, res) => {
    const name = req.body.name
    const uid = req.body.id
    const pwd = req.body.pwd
    const password = bcrypt.hashSync(`${pwd}`, 10);
    const email = req.body.email
    const link = req.body.link

    conn.query(`insert into userTable(userName, userId, password, email, link) value(
        '${name}',
        '${uid}',
        '${password}',
        '${email}',
        '${link}'
    )`, (err, results) => {
        if (err) {
            res.json({ 'massage': err });
        } else {
            res.json({
                'name' : name,
                'uid': uid,
                'password': pwd,
                'email': email,
                'link' : link
            });
        }
    });
})

router.post('/signin', (req, res) => {
    const uid = req.body.id;
    const pwd = req.body.pwd;
    const email = req.body.email;

    if (typeof uid !== "string" && typeof pwd !== "string" && typeof email !== "string") {
        res.send("login failed");
        return;
    }
    conn.query(`select * from userTable where email = '${email}'`, (err, result) => {
        if(err) res.send(err);
        if(result.length === 0) {
            res.json({success: false, massage: "해당하는 이메일에 등록되는 계정 없음. 옳은 이메일을 입력해주세요."})
        } else {
            conn.query(`select password from userTable where userId ='${uid}'`, (err, result) => {
                if (err) {
                    return res.json({ 'massage': err });
                }
                if (result.length === 1) {
                    const encodePwd = result[0].password
                    bcrypt.compare(pwd, encodePwd, (err, same) => {
                        if (err) {
                            return res.json({ 'massage': err });
                        } else {
                            console.log('로그인 되었습니다.');
                            const token = jwt.sign(uid, 'secretToken')
                            conn.query(`update userTable set token = '${token}' where userId = '${uid}'`, (err, result) => {
                                if (err) {
                                    res.json({ 'massage': err });
                                } else {
                                    return res.cookie("user_auth", token)
                                        .json({
                                            success: true,
                                            name: req.body.name,
                                            id: req.body.id,
                                            pwd: req.body.pwd,
                                            email: req.body.email,
                                            token: token
                                        })
                                }
                            });
                        }
                    })
                } else {
                    return res.json({ massage: "유저를 찾을 수 없습니다." });
                }
            })
        }
    })
});


router.get('/logout', auth, (req, res) => {
    let token = req.cookies.user_auth;
    conn.query(`update userTable set token = '' where token = '${token}'`, (err, result) => {
        if (err) { // token을 가진 사용자가 없다
            return res.json({ 'massage': err });
        } else {
            res.json({ 'massage': '로그아웃이 완료되었습니다.', })
        }
    })
})

router.get('/getUser', (req, res) => {
    const token = req.cookies.user_auth
    conn.query(`select * from usertable where token = '${token}'`, (err, result) => {
        if (err) return res.json({ error: err, success: false })
        else {
            return res.json({
                success: true,
                data: result
            })
        }
    })
})

module.exports = router;