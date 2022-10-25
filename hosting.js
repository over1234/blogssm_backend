var fs = require('fs');    			// 파일시스템 모듈
var express = require('express');   // express 모듈
var app = express();                // express 객체 생성

let port = 1000;

app.listen(port, () => {       // 서버 가동 
    console.log('Express server listening on port');
});

app.get('/', (req, res) => {
    res.send('hi')
})

// 이미지파일 호스팅 로직 
app.get('/image/:name', function (req, res) {
    var filename = req.params.name;
    fs.exists('./public/image/' + filename, function (exists) {
        if (exists) {
            fs.readFile('./public/image/' + filename, function (err, data) {
                res.end(data);
            });
        } else {
            res.end('file is not exists');
        }
    })
});