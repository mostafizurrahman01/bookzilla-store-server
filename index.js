const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config()
const MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rbbe2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

var serviceAccount = require("./configs/bookzilla-store-firebase-adminsdk-ud7me-37be1b72be.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express()
const port = 8000

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.send('Hello Bookzilla Server!')
})




client.connect(err => {
    const booksCollection = client.db("bookZillaStore").collection("products");
    const ordersCollection = client.db("bookZillaStore").collection("orders")

    app.post('/addProduct', (req, res) => {
        const products = req.body;
        console.log(products);
        booksCollection.insertOne(products)
            .then(result => {
                res.send(result.insertedCount > 0)
                // console.log(result)
                res.redirect('/')
            })
    })

    app.get('/products', (req, res) => {
        booksCollection.find()
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    app.get('/product/:id', (req, res) => {
        console.log(req.params.id)
        booksCollection.find({ _id: ObjectId(req.params.id) })
            .toArray((err, documents) => {
                console.log(documents[0])
                res.send(documents[0])
            })
    })

    app.post('/addOrder', (req, res) => {
        const order = req.body;
        console.log(order);
        ordersCollection.insertOne(order)
            .then(result => {
                console.log(result);
                console.log(result.insertedCount);
                // res.send(result.insertedCount > 0);
                // res.redirect('/')
                res.redirect(200, '/');
            })
    })

    app.get('/orders', (req, res) => {

        // console.log(req.query.email);
        // console.log(req.headers.authorization)
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            // console.log(idToken);
            admin
                .auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                    const uid = decodedToken.uid;
                    console.log("uid: ", uid);
                    let tokenEmail = decodedToken.email;
                    if (tokenEmail == req.query.email) {
                        ordersCollection.find({ email: req.query.email })
                            .toArray((err, documents) => {
                                res.status(200).send(documents);
                            })
                    }
                    else {
                        res.status(401).send("Unauthorized Access");
                    }
                })
                .catch((error) => {
                    res.status(401).send("Unauthorized Access");
                });

        }
        else {
            res.status(401).send("Unauthorized Access");
        }
    })

    app.delete('/delete/:id', (req, res) => {
        booksCollection.deleteOne({_id: ObjectId(req.params.id) })
        // .then(documents => res.send(!!documents.value))
        .then(result => {
            // console.log(result);
            res.send(result.deletedCount>0);
        })
    })


});

app.listen(port)