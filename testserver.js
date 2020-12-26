const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const mongourl = 'mongodb+srv://admin:admin@cluster0.toqh1.mongodb.net/Restaurant?retryWrites=true&w=majority';
const dbName = 'Restaurant';

app.set('view engine','ejs');

const SECRETKEY = 'I want to pass COMPS381F';

const users = new Array(
	{name: 'developer', password: 'developer'},
	{name: 'guest', password: 'guest'}
);

app.set('view engine','ejs');

app.use(session({
  name: 'loginSession',
  keys: [SECRETKEY],
  maxAge:60 * 1000
}));

// support parsing of application/json type post data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req,res) => {
    console.log(req.session.authenticated)
	if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
		res.redirect('/list')
	}
});

app.get('/new', (req,res) => {
    console.log(req.session.authenticated)
	if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
		res.status(200).render('new', {user:req.session.username});
	}
});
app.post('/new', (req,res) => {
    console.log(req.session.authenticated)
	if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
		handle_insert(res, req.query,req);
	}
});
app.get('/delete', (req,res) => {
    console.log(req.session.authenticated)
	if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
		handle_delete(res, req.query,req);
	}
});

app.get('/rate', (req,res) => {
    console.log(req.session.authenticated)
    console.log(req.query)
    if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
		res.status(200).render('rate', {data:req.query});
	}
})

app.get('/edit', (req,res) => {
    console.log(req.query)
    if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
        handle_Find_edit(res,req.query,req);
		// res.status(200).render('change', {data:req.query});
	}
})
app.post('/edit', (req,res) => {
    console.log(req.query)
    if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
        handle_edit(res,req.query,req);
		// res.status(200).render('change', {data:req.query});
	}
})

app.post('/rate', (req,res) => {

    console.log(req.body)
    if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
		handle_Rate(res, req.query,req);
	}
})

app.get('/details', (req,res) => {
    console.log(req.session.authenticated)
    if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
        console.log(req.query)
		handle_Details(res, req.query,req);
	}
})

app.get('/list', (req,res) => {
    if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
		handle_Find(res, req.query.docs,req);
	}
})

app.get('/login', (req,res) => {
	res.status(200).render('login',{});
});

app.post('/login', (req,res) => {
	users.forEach((user) => {
		if (user.name == req.body.username && user.password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = req.body.username;	 	
		}
	});
	res.redirect('/');
});

app.get('/logout', (req,res) => {
	req.session = null;   // clear cookie-session
	res.redirect('/');
});

app.get('/*', (req,res) => {
    //res.status(404).send(`${req.path} - Unknown request!`);
    res.status(404).render('info', {message: `${req.path} - Unknown request!` });
})

const findDocument = (db, criteria, callback) => {
    console.log(criteria)
    let cursor = db.collection('restaurant').find(criteria);
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}
const handle_insert = (res, criteria,req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        console.log(req.body)
        console.log(criteria)
        newdata={
            address : {
                building: req.body.building,
                coord:[req.body.xcoord,req.body.ycoord],
                street: req.body.street,
                zipcode:req.body.zipcode
            },
            borough:req.body.borough,
            cuisine: req.body.cuisine,
            photo:req.body.image,
            photo_mimetpye:"",
            grades:[],
            name: req.body.name,
            restaurant_id:"",
            owner:req.body.owner
        }
        insertDocument(criteria,newdata,()=>{
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('createSuccess', {});
        })
    });
}

const handle_delete = (res, criteria,req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        deleteDocument( DOCID, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            // res.send("done")
            res.status(200).render('delete', {});
        });
    });
}

const handle_Rate = (res, criteria,req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        rating = {$push:{grades:{user: req.session.username,score: req.body.score}}}
        console.log(rating)
        DOCID['_id'] = ObjectID(criteria._id)
        updateDocument( DOCID,rating, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            // res.send("done")
            res.status(200).render('rateSuccess', {});
        });
    });
}
const handle_edit = (res, criteria,req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        updatedata = {
            $set:{
                address : {
                    building: req.body.building,
                    coord:[req.body.xcoord,req.body.ycoord],
                    street: req.body.street,
                    zipcode:req.body.zipcode
                },
                borough:req.body.borough,
                cuisine: req.body.cuisine,
                photo:req.body.image,
                photo_mimetpye:"",
                name: req.body.name,
                }
        }
        console.log(updatedata)
        DOCID['_id'] = ObjectID(criteria._id)
        updateDocument( DOCID,updatedata, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('updateSuccess', {});
        });
    });
}
const handle_Find = (res, criteria,req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");
            console.log(docs)
            res.status(200).render('list',{user: req.session.username ,nRestaurant: docs.length, restaurants: docs});
        });
    });
}
const handle_Find_edit = (res, criteria,req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        findDocument(db, DOCID, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            console.log(docs[0])
            res.status(200).render('change', {restaurant:docs[0],user :req.session.username});
        });
    });
}

const handle_Details = (res, criteria,req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        findDocument(db, DOCID, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('display', {restaurant:docs[0],user :req.session.username});
        });
    });
}
const updateDocument = (criteria, rating, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

         db.collection('restaurant').updateOne(criteria,
            rating,
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
    
}
const deleteDocument = (criteria, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        console.log(criteria)
         db.collection('restaurant').deleteOne(criteria,
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
    
}

const insertDocument = (criteria, newdata, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

         db.collection('restaurant').insertOne(
            newdata,
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

app.listen(process.env.PORT || 9000);