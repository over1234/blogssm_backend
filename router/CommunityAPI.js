const express = require('express');
const router = express.Router();
const { conn } = require("../config/config");
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const request = require('request');
var cheerio = require('cheerio');

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'public/image/');
        },
        filename: function (req, file, cb) {
            var newFileName = new Date().valueOf() + path.extname(file.originalname)
            cb(null, newFileName);
        }
    }),
});

router.post('/create_context', (req, res) => {
    const title = req.body.title;
    const contact = req.body.contact;
    const token = req.cookies.user_auth
    const date = new Date();
    const today = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    conn.query(`select tid, userName from userTable where token = '${token}'`, (err, results) => {
        if (err) throw err;
        const name = results[0].userName
        const id = results[0].tid
        if (req.files.length === 0) { 
            conn.query(`insert into blogssmBoard(uid, title, context, userName, date) values(
                    ${id},
                    '${title}',
                    '${contact}',
                    '${name}',
                    '${today}')`, (err, result) => {
                if (err) throw err;
                res.json({
                    'title': title,
                    'context' : contact
                })
            })
        }
        else { 
            let urlArr = Array()
            for (let i = 0; i < req.files.length; i++) {
                urlArr.push(`static/image/${req.files[i].filename}`);
            }
            conn.query(`insert into blogssmBoard(uid, title, context, userName, date) values(
                    ${id},
                    '${title}',
                    '${contact}',
                    '${name}',
                    '${today}')`, (err, result) => {
                if (err) throw err;
                else { // 비어있지 않음 => 이미지 저장 해야함.
                    conn.query(`select MAX(tid) as id from blogssmBoard where tid`, (err, result) => {
                        const id = result[0].id;
                        let query = Array();
                        for (let i = 0; i < urlArr.length; i++) {
                            query.push([id, urlArr[i]]);
                        }
                        if (err) throw err;
                        else {
                            conn.query('insert into imageTable(contactId, path) values ?', [query], (err, result) => {
                                if (err) throw err;
                                else {
                                    res.json({
                                        'title': title,
                                        'context' : contact
                                    })
                                }
                            })
                        }
                    })

                }
            })
        }
    })
})

router.get('/Thumbnail_upload', upload.single('imageFile'), (req, res) => { 
    const thumbnail = '대지_1_사본3x-100.jpg'
    const id = req.body.boardId;
    if (!req.file) {
        console.log('이미지 안들어옴')
        conn.query(`update blogssmBoard set image = 'http://localhost:1000/image/${thumbnail} where tid=${id}'`, (err, result) => {
            if(err) return res.send(err);
            else {
                res.json({
                    success : true,
                    massage: "기본 썸네일 업로드 완료"
                })
            }
        })
    } else {
        console.log('이미지 들어옴')
        const image = req.file.filename
        conn.query(`update blogssmBoard set image = 'http://localhost:1000/image/${image} where tid=${id}'`, (err, result) => {
            if (err) return res.send(err);
            else {
                res.json({
                    success: true,
                    massage: "썸네일 업로드 완료"
                })
            }
        })
    }
})

router.get('/get_contact', (req, res) => {
    const id = req.query.id;

    conn.query(`select * from blogssmBoard where tid = ${id}`, (err, result) => {
        if (err) throw err;
        const conId = result[0].tid;
        const title = result[0].title;
        const contact = result[0].context.substring(5, 0) + '...';
        const thumbnail = result[0].image
        const heart = result[0].heart;
        const userName = result[0].userName;
        const upload_date = result[0].date;
        conn.query(`select * from imagetable where contactId = ${id}`, (err, result) => {
            if (err) throw err;
            console.log(result);
            let arr = new Array();
            for (let i = 0; i < result.length; i++) {
                arr.push('http://localhost:8080/image/' + (result[i].path).substring(13,));
            }
            if (result.length === 0) {
                res.json({
                    'id': conId,
                    'title': title,
                    'contactId': contact,
                    'heart': heart,
                    'userName': userName,
                    'upload_date': upload_date,
                    'thumbnail' : thumbnail
                })
            } else {
                res.json({
                    'id': conId,
                    'title': title,
                    'contactId': contact,
                    'heart': heart,
                    'userName': userName,
                    'upload_date': upload_date,
                    'thumbnail': thumbnail,
                    'image_path': arr
                })
            }
        })
    })
})

router.get('/heart_change', (req, res) => {
    const heart = req.query.heart
    const id = req.query.id
    conn.query(`update blogssmBoard set heart=${heart} where tid=${id}`, (err, result) => {
        if (err) throw err;
        else res.send(`update heart => ${heart}`)
    })
})

router.get('/comment_upload', (req, res) => {
    const contactId = req.query.contactId
    const token = req.cookies.user_auth
    const text = req.query.text
    conn.query(`select tid, userName from userTable where token = '${token}'`, (err, results) => {
        if (err) throw err;
        const name = results[0].userName
        const id = results[0].tid
        conn.query(`insert into commenttable(contactId, uid, userName, text) values(
            ${contactId},
            ${id},
            '${name}',
            '${text}'
            )`, (err, result) => {
                if (err) throw err;
                conn.query(`select MAX(id) mid, MAX(groupNum) + 1 mgroupNum from commenttable where contactId = ${contactId}`, (err, result) => {
                    if(err) throw err;
                    const cid = result[0].mid;
                    const groupNum = result[0].mgroupNum;
                    conn.query(`update commenttable set groupNum = ${groupNum} where id = ${cid}`, (err, result) => {
                        if(err) throw err;
                        res.json({
                            'text': text
                        })
                    })
                })
        })
    })
})

router.get('/comments', (req, res) => {
    const contactId = req.query.contactId
    const token = req.cookies.user_auth
    const text = req.query.text
    const commentId = req.query.commentId
    conn.query(`select tid, userName from userTable where token = '${token}'`, (err, results) => {
        if (err) throw err;
        const name = results[0].userName
        const id = results[0].tid
            conn.query(`insert into commenttable(contactId, uid, userName, text, orderNum, groupNum) values(
                ${contactId}, 
                ${id},
                '${name}',
                '${text}',
                1,
                ${commentId}
            )`, (err, results) => {
                if(err) res.send(err);
                conn.query(`select max(level) + 1 mlevel, max(id) mid from commenttable where groupNum = ${commentId}`, (err, results) => {
                    if(err) res.send(err);
                    const level = results[0].mlevel
                    const mid = results[0].mid
                     conn.query(`update commenttable set level = ${level} where id = ${mid}`, (err, results) => {
                        if(err) res.send(err);
                        res.json({
                            "text" : text,
                            "level" : level
                        })
                     })
                })
            })
        })
})

router.post("/getBlogLink", function (req, res, body) {
    let urlArr = new Array();
    const userName = req.body.userName
    let access_token =
        "40062d2ac059d46fc83f632f28e13157_d00a4dae053eac09af364356fe4fd77e";
    let url = `https://www.tistory.com/apis/post/list?access_token=${access_token}&output=JSON&blogName=${userName}&page=1`;
    let options = {
        url,
        method: "get",
        timeout: 1000,
    };

    request(options, function (error, response, body) {
        try {
            var $ = cheerio.load(body);
            $('post').each((key, val) => {
                let url = $(val).children("postUrl").text();
                console.log(url);
                urlArr.push(url);
                console.log(urlArr)
            })
            res.send(urlArr);
        } catch (error) {
            res.send(error);
        }
    });
});

module.exports = router;