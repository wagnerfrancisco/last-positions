'use latest';

const express = require('express');
const webtask = require('webtask-tools');
const https = require('https');
const redis = require('redis');

const app = express(); 
const isPositionValid = function(position) {
    return typeof position === 'object' &&
        isFinite(position.lat) &&
        isFinite(position.lng);
};

const positionsRepository = function(url) {
    const NAMESPACE = 'positions';
    const client = redis.createClient(url);

    const add = function(position) {
        return new Promise(function(resolve, reject) {
            client.zadd(NAMESPACE, Date.now(), JSON.stringify(position), function(err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });

            removeOld();
        });
    };

    const all = function() {
        return new Promise(function(resolve, reject) {
            client.zrange(NAMESPACE, 0, -1, function(err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result.map(JSON.parse));
                }
            });
        });
    };

    const removeOld = function() {
        client.zremrangebyrank(NAMESPACE, 0, -10);
    };

    return Object.freeze({
        add,
        all 
    });
};

app.use(require('body-parser').json());

app.post('/positions', function(req, res, next) {
    if (!isPositionValid(req.body)) {
        res.send(400, 'Invalid position');
    } else {
        next();
    }
});

app.post('/positions', function(req, res) {
    const data = req.webtaskContext.data;
    const repo = positionsRepository(data.REDIS_URL);

    repo.add(req.body)
        .then(repo.all)
        .then(function(positions) {
            res.json(positions);
        })
        .catch(function(e) {
            console.log(e);
            res.send(500);
        });
});

(function serveStatic() {
    const fetch = function(url) {
        return new Promise(function(resolve, reject) {
            const req = https.request(url, function(res) {
                let body = '';

                res.on('data', function(chunk) {
                    body += chunk;
                });

                res.on('end', function() {
                    resolve(body);
                });
            });

            req.end();
        });
    };

    app.get('/index.html', function(req, res) {
        const data = req.webtaskContext.data;

        fetch(data.HTML_URL).then(function(file) {
            file = file.replace('MAPKEY', data.MAPKEY);
            res.set('content-type', 'text/html');
            res.send(file);
        });
    });

    app.get('/index.js', function(req, res) {
        const data = req.webtaskContext.data;

        fetch(data.JS_URL).then(function(file) {
            res.set('content-type', 'application/javascript');
            res.send(file);
        });
    });
}());

module.exports = webtask.fromExpress(app);
