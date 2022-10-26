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

router.post('/create_context', upload.array('imageFile'), (req, res) => {
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
                    'context' : contact,
		    success: true
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
                                        'context' : contact,
					 success: true
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
	console.log(id)
    if (!req.file) {
        console.log('이미지 안들어옴')
        conn.query(`update blogssmBoard set image = 'http://13.125.225.199:8007/image/${thumbnail}' where tid=${id}`, (err, result) => {
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
        conn.query(`update blogssmBoard set image = 'http://13.125.225.199:8007/image/${image}' where tid=${id}`, (err, result) => {
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
        conn.query(`select * from imageTable where contactId = ${id}`, (err, result) => {
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
                    'thumbnail' : thumbnail,
		    success: true
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
                    'image_path': arr,
	             success: true
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
        conn.query(`insert into commenttable(contactId, uid, userName, text, orderNum, level) values(
            ${contactId},
            ${id},
            '${name}',
            '${text}',
	    0,
	    0
            )`, (err, result) => {
                if (err) throw err;
                conn.query(`select id, MAX(groupNum) + 1 mgroupNum from commenttable where contactId = ${contactId}`, (err, result) => {
                    if(err) throw err;
                    const cid = result[0].id;
			console.log(cid)
                    const groupNum = result[0].mgroupNum;
                    conn.query(`update commenttable set groupNum = ${cid} where id = ${cid}`, (err, result) => {
                        if(err) throw err;
                        res.json({
                            'text': text,
			    'id' : cid,
			    'groupNum' : cid,
			    'orderNum' : 0,
			    'level' : 0,
			    success: true
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
                            "level" : level,
			    "groupNum" : commentId,
			    success : true
                        })
                     })
                })
            })
        })
})

router.get('/All_comment', (req, res)=> {
	const id = req.query.boardId;
	conn.query(`select * from commenttable where contactId = ${id}`, (err, result) => {
		if(err) { 
			res.json({
			success: false,
			'error': err})
		}else {
			res.json({
				success: true,
				'data': result
			})
		}
	})
})

let getArr = (userName) => {
    let urlArr = new Array()
    }


router.get("/getBlogLink", async (req, res) => {
    let arr = new Array();
    let count = 0;
    conn.query(`select link from userTable`, async (err, result) => {
	if(err) res.json({'message' : errr, success: false})
	for(let i = 0; i < result.length; i++) {
	 let link = result[i].link
	 if(link.substring(8).split('.')[1] == 'tistory') {
		 console.log('hi')
	 	let userName = link.substring(8).split('.')[0];
		let access_token =
               "40062d2ac059d46fc83f632f28e13157_d00a4dae053eac09af364356fe4fd77e";
               let url = `https://www.tistory.com/apis/post/list?access_token=${access_token}&output=JSON&blogName=${userName}&page=1`;
               let options = {
                 url,
                 method: "get",
                 timeout: 1000,
               };
	   await request(options, (error, response, body) => {
            var $ = cheerio.load(body);
            $('post').each((key, val) => {
		let date = $(val).children("date").text()
		let title = $(val).children("title").text()
                let url = $(val).children("postUrl").text();
 		arr.push({blogName:'tistory', title: title, url: [url], date: date})
                 })
		 count = count + 1 
		 console.log(count)
		 if(count == result.length) { // 마지막
			 console.log('마지막')
			 res.json({data : arr, success: true})
		}
       	    })
	   } else { console.log('티스토리 아님'); } 
	 }
        })
});


router.get('/All_board', (req, res) => {
	conn.query('select * from blogssmBoard', (err, result) => {
		if(err) res.json({'message' : err, success: false})
		else {
			res.json({
				success: true,
				data: result
			})
		}
	})
})

module.exports = router;
