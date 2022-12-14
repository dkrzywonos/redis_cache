//------------------IMPORT--------------
const express = require('express');
const bodyParser = require('body-parser');
//const _ = require('lodash');
const mongoose = require('mongoose');
//For Redis-----
const axios = require('axios');
const cors = require('cors');
const Redis = require('redis');

const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(cors())


mongoose.connect('mongodb://localhost:27017/lab6',
    {useNewUrlParser: true}, (err, db) => {
        if (err) {
            process.exit(0);
        }
        console.log('connected to database');
    });

const articlesSchema = {
    title:String,
    content: String
}
const Article = mongoose.model('Article', articlesSchema);


const redisClient = Redis.createClient({
    legacyMode: true
});

redisClient.connect();
redisClient.on("connect", () => {
    console.log('connected to Redis');
});



app.get('/dataFromDB-ALL', async( req, res) => {
    key = 'dataALL'
    // const query = req.query.zapytanie;
    const articles = await getOrSetCache(key, async () => {
        const { data } = await axios.get('http://localhost:3000/articles')
        return data
    })
    res.json(articles)                                      //First user (Cache-aside)
    // redisClient.set(key, JSON.stringify(articles))       // <-- uncomment for save data after user get data
})

app.get('/dataFromDB-CHOOSE', async( req, res) => {

    const tittle = req.query.tittle;
    const article = await getOrSetCache('data' + tittle, async () => {
        const { data } = await axios.get(
            'http://localhost:3000/articles/' + tittle
        )
        return data
    })
    res.json(article)
})

//app routes -- target all articles
app.route("/articles")
.get( async (req, res)=> {

    Article.find({
    },function(err, msg){
        if (!err) {
            res.json(msg);
        }else{
            res.json(err);
            console.log('Error: GET ARTICLES \n: ' + err);
        }

    })

})

.post(function (req, res) {



    console.log(req.headers['content-type']);
    console.log(req.body.title);



    const newArticle = new Article({
        title: req.body.title,
        content: req.body.content
    })

    console.log(newArticle.content);


    newArticle.save(function(err){
        if(!err){
            res.send('Successfully added a new article.');
        } else {
            res.send(err);
        }
    });
})

.delete( function (req, res) {

    Article.deleteMany({
    }, function(err){
        if(!err){
            res.send('Successfully deleted an article.');
        } else {
            res.send(err);
        }
    })
});

//app routes -- target specific articles
app.route("/articles/:articleTitle")

.get(function(req, res){

    Article.findOne({
        title: req.params.articleTitle
    },function(err, msg){
        if (!err) {
            res.send(msg);
        }else{
            res.send('No article match this specific request\n'+ err);
            console.log('Error: GET ARTICLES \n: ' + err);
        }

    })

})


.put(function (req, res) {

    // console.log(req.params.articleTitle + '\n' +  req.body.title + '\n' + req.body.content);

    Article.updateOne({
        title: req.params.articleTitle
    },{
        title: req.body.title,
        content: req.body.content
    },
    function(err,msg){
        if(!err){
            res.send('Successfully updated article:' + req.body.title );
        } else {
            res.send(err);
        }
    });
})


.patch( function (req, res){

    Article.updateOne({
        title: req.params.articleTitle
    },{
        $set: req.body
    },
    function(err,msg){
        if(!err){
            res.send('Successfully updated article: ' + req.params.articleTitle );
        } else {
            res.send(err);
        }
    });
})

.delete( function (req, res) {

    Article.deleteMany({
        title: req.params.articleTitle
    }, function(err){
        if(!err){
            res.send('Successfully deleted an article.');
        } else {
            res.send(err);
        }
    })
});

//----------------Redis function (Check if element exist in Redis cache) ----
function getOrSetCache(key, callback){
    return new Promise((resolve, reject) => {
        redisClient.get(key, async (error, data) => {
            if (error) return reject(error)
            if (data != null) {
                console.log('Cache HIT');
                return resolve(JSON.parse(data))
            } else {
                console.log('Cache MISS');
                const freshData = await callback()
                redisClient.set(key, JSON.stringify(freshData))    // <-- comment this, to don't save data to Redis, before user get data
                resolve(freshData)
            }

        })
    })
}




//------------------SERVER CONFIG ----------------------
app.listen(300, function(){
    console.log('App is listening on port 3000');
})
