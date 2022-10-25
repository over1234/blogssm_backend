const express = require('express');
const app = express();
const loginRouter = require('./router/LoginAPI');
const communityRouter = require('./router/CommunityAPI');
const cookieParser = require("cookie-parser");

app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use('/static', express.static('public'));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.status(200).json({
        massage: "인덱스 화면과 연결 잘 됨."
    });
});

app.use('/login', loginRouter);
app.use('/community', communityRouter);

let port = 8080;
app.listen(port, () => {
    console.log('server on! http://localhost:' + port);
});