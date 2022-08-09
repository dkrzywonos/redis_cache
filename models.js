const express = require('express');
const app = express();
//const mongo = require('mongodb').MongoClient;
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const redisClient = require('redis');
const redis = redisClient.createClient({
  legacyMode: true
});

app.use(bodyParser.urlencoded({
    extended: true
}))

// connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lab6', {
    useNewUrlParser: true
}, (err, db) => {
    if (err) {
        process.exit(0);
    }
    console.log('connected to the database');
});
const postSchema = {
    title:String,
    data: String
}
//________Model
const Post = mongoose.model('Post', postSchema);

//connect to Redis
redis.connect();

redis.on("connect", () => {
    console.log('connected to Redis');
});

//cache aside
function getPost(title) {
    return new Promise((resolve, reject) => {
        redis.get(title,(err, reply) => {
            if(err) {
                console.log(err);
            } else if(reply) {
                console.log('Cache hit');
                resolve(JSON.parse(reply));
            } else {
                console.log('Cache miss');
                Post.find({
                    id: id
                }).toArray((err, postData) => {
                    if(err) {
                        return reject(err);
                    }
                    resolve(postData);
                    if(postData.length > 0) {
                        // set in redis
                        redis.setEx(title, 300, JSON.stringify(postData));

                    }

                });
            }
        });
    });
}

module.exports = {
    getArticle: getPost
};
