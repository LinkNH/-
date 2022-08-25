var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var wechatRouter = require('./routes/wechat');
const axios = require("axios");
const moment = require("moment");
const fs = require('fs');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

app.use("/wechat", wechatRouter);

function getToken() {
    return new Promise((resolve, reject) => {
        const tokenFile = path.join(__dirname, 'token.json');
        fs.readFile(tokenFile, 'utf-8', function (err, data) {
            if (err) {
                reject(err)
            } else {
                if (data) {
                    const token = JSON.parse(data)
                    if (token.expires_in > moment().unix()) {
                        resolve(token.access_token)
                        return
                    }
                }
                const appid = 'wx8941de368d65e311'
                const appsecret = '4c2479ec23ca7d264157f83cd7bbc030'
                axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${appsecret}`)
                    .then(res => {
                        resolve(res.data.access_token)
                        const t = res.data
                        t.expires_in = t.expires_in + moment().unix() - 1200
                        fs.writeFile(tokenFile, JSON.stringify(t, "", "\t"), function (err) {
                            if (err) {
                                reject(err)
                            }
                        })
                    })
                    .catch(err => reject(err))
            }
        })

    })
}

const week = ['日', '一', '二', '三', '四', '五', '六']

const cycle = setInterval(async function () {
    const h = moment().hour();
    const m = moment().minute();
    const s = moment().second();
    if (h === 7 && m === 0) {
        console.log('开始发送消息')
        const today = moment()
        const startLoving = moment(moment().format('2022-07-08'), 'YYYY-MM-DD')
        const lastBirth = moment(moment().format('YYYY-10-27'), 'YYYY-MM-DD').diff(today,'days') > 0? moment(moment().format('YYYY-10-27'), 'YYYY-MM-DD') :moment(moment().format('YYYY-10-27'), 'YYYY-MM-DD').add(1,'Y')
        const lastWage = moment(moment().format('YYYY-MM-10'), 'YYYY-MM-DD').add(1, 'M')
        const wageDate = lastWage.diff(today, 'days')
        const loveDate = today.diff(startLoving, 'days')
        const birthDate = lastBirth.diff(today, 'days')
        console.log('开始获取天气')
        let weatherinfo = await axios.get('https://restapi.amap.com/v3/weather/weatherInfo?key=3e3a4a620954068395d7d9ce0647e0b9&city=340100&extensions=all&output=JSON')
        let sweetWords = await axios.get('http://api.tianapi.com/saylove/index?key=cb4b57af20fdc558cec0ce83bf09143f')
        weatherinfo = weatherinfo.data
        sweetWords = sweetWords.data
        if (weatherinfo.status === '1' && sweetWords.code == 200) {
            let todayweather = weatherinfo.forecasts[0].casts[0]
            let todaySweet = sweetWords.newslist[0].content
            console.log('获取天气', todayweather)
            getToken()
                .then(token => {
                    console.log('发送')
                    sendMessage(token, 'oAmxr5lFIqpvtiYtMncwjECCO3zw', wageDate, loveDate, birthDate, todayweather , todaySweet)
                    sendMessage(token, 'oAmxr5lFIqpvtiYtMncwjECCO3zw', wageDate, loveDate, birthDate, todayweather , todaySweet)
                })
                .catch(err => {
                    console.log(err)
                    clearInterval(cycle)
                })
        }
    }
}, 1000 * 60)
function sendMessage (token, touser, wageDate, loveDate, birthDate, weatherinfo , sweetWords) {
    axios.post('https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=' + token, {
        touser: touser,
        template_id: 'KFxKDqzYqDA50r8CF_F5b5D98drVukDuUxdKXseJoCo', // 模板信息id
        topcolor: '#FF0000',
        data: {
            Date: {
                value: moment().format('YYYY-MM-DD') + ', ' + '星期' + week[moment().weekday()],
                color: '#2b85e4'
            },
            Wage: {
                value: '发工资',
                color: '#ed4014'
            },
            WageDate: {
                value: wageDate,
                color: '#ed4014'
            },
            LoveDate: {
                value:loveDate,
                color:"#FF69B4"
            },
            BirthDate: {
                value:birthDate,
                color:"#F5DEB3",
            },
            Weather: {
                value: weatherinfo.dayweather,
                color: '#ff9900'
            },
            TemperatureLow: {
                value: weatherinfo.nighttemp + '℃',
                color: '#19be6b'
            },
            TemperatureHigh: {
                value: weatherinfo.daytemp + '℃',
                color: '#2d8cf0',
            },
            Sweet: {
                value:sweetWords,
                color:"#BF3EFF"
            }
        }
    })
        .then(res => {
            console.log(res.data)
        })
        .catch(err => {
            console.log(err)
        })
}
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
