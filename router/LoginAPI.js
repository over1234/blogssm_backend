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

    conn.query(`select email from userTable where email = '${email}'`, (err, result) => {
	if(err) res.json({'message' : err})
	    // 리졸트가 있다는 것은 보낸 이메일이 이미 사용된 적이 있는 이메일이라는 것
	if(result.length !== 0) res.json({'message' : '중복된 이메일이 있습니다.', success: false})
	else { // 이메일 무결성 체크 완료
	conn.query(`select link from userTable where link = '${link}'`, (err, result) => {
		if(err) res.json({'message' : err})
		if(result.length !== 0) res.json({'message' : '중복된 링크가 있습니다.', sucess: false})
		else {
		conn.query(`select userId from userTable where userId = '${uid}'`, (err, result) => {
			if(err) res.json({'message' : err})
			if(result.length !== 0) res.json({'message' : '중복된 아이디가 있습니다.', sucess: false})
			else {
				conn.query(`insert into userTable(userName, userId, password, email, link) value(
        		'${name}',
        		'${uid}',
        		'${password}',
        		'${email}',
        		'${link}'
    			)`, (err, results) => {
        			if (err) {
            			res.json({ 'massage': err, sucess: false });
        			} else {
				  conn.query(`select * from userTable where email = '${email}'`, (err, result)=>{
					if(err) res.json({'message': err, success:false})
					 else {
						res.json({
							'uid' : result[0].tid,
							'name' : name,
							'userId' : uid,
							'password' : pwd,
							'email' : email,
							'link' : link,
							success: true
						})
					 }
				})

				}
    		    });

			}
		})
	    }
	})
	}
    })
})

router.post('/signin', (req, res) => {
    const uid = req.body.id;
    const pwd = req.body.pwd;
    const email = req.body.email;
	console.log(uid, pwd, email)

    if (typeof uid !== "string" && typeof pwd !== "string" && typeof email !== "string") {
        res.send("login failed");
        return;
    }
    conn.query(`select * from userTable where email = '${email}'`, (err, result) => {
        if(err) res.send(err);
	const userName = result[0].userName
	const link = result[0].link
        if(result.length === 0) {
            res.json({success: false, massage: "해당하는 이메일에 등록되는 계정 없음. 옳은 이메일을 입력해주세요."})
        } else {
            conn.query(`select tid, userId, password from userTable where email ='${email}'`, (err, result) => {
                if (err) {
                    return res.json({ 'massage': err });
                }
                if (result.length === 1) { // 매칭되는 userid가 있을떄
		    const tid = result[0].tid
                    const encodePwd = result[0].password
		    const userId = result[0].userId
		    console.log(encodePwd, userId, uid);
		    if(userId === uid) {
                    bcrypt.compare(pwd, encodePwd, (err, same) => {
                        if (err) {
                            return res.json({ 'massage': err });
                        } if(same){
                            console.log('로그인 되었습니다.');
                            const token = jwt.sign(uid, 'secretToken')
                            conn.query(`update userTable set token = '${token}' where userId = '${uid}'`, (err, result) => {
                                if (err) {
                                    res.json({ 'massage': err });
                                } else {
                                    return res.cookie("user_auth", token)
                                        .json({
                                            success: true,
					    'uid' : tid,
                                            userName: userName,
                                            id: req.body.id,
                                            pwd: req.body.pwd,
                                            email: req.body.email,
					    link: link,
                                            token: token
                                        })
                                }
                            });
                        } if(!same) { // 만약 똑같지 않으면
				res.json({'message' : '비밀번호가 일치하지 않습니다.', success: false})
		     }
		    })
                } else {
                    return res.json({ massage: "id가 같지 않습니다.", success: false });
                }
	     }
        })
      }
    })
});


router.get('/logout', auth, (req, res) => {
    let token = req.cookies.user_auth;
    conn.query(`update userTable set token = '' where token = '${token}'`, (err, result) => {
        if (err) { // token을 가진 사용자가 없다
            return res.json({ 'massage': err, success: false });
        } else {
	    res.clearCookie('user_auth')
            res.json({ 'massage': '로그아웃이 완료되었습니다.', success: true})
        }
    })
})

router.get('/getUser', (req, res) => {
    const token = req.cookies.user_auth
    conn.query(`select * from userTable where token = '${token}'`, (err, result) => {
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
