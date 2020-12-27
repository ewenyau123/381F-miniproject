const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const formidable = require('express-formidable');
const mongourl = 'mongodb+srv://admin:admin@cluster0.toqh1.mongodb.net/Restaurant?retryWrites=true&w=majorit';
const dbName = 'Restaurant';
const googlemapurl="https://maps.googleapis.com/maps/api/js?key=AIzaSyBQA7UPIFwtTbJHvyMpSBLBPmi0qFumJ0w&callback=initMap"

const fs = require('fs');

app.use(formidable());
app.set('view engine','ejs');


const SECRETKEY = 'I want to pass COMPS381F';

const users = new Array(
	{name: 'developer', password: 'developer'},
	{name: 'guest', password: ''}
);


app.use(session({
  name: 'loginSession',
  keys: [SECRETKEY],
  maxAge:3*60 * 1000
}));

// support parsing of application/json type post data
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req,res) => {
    console.log(req.session.authenticated)
	if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
		res.redirect('/list')
	}
});

app.get('/api/restaurant/:type/:typename', (req,res) => {
    console.log(req.params)
    if(req.params.type == "name"){
        const query = {name:req.params.typename}
        api(res, query,req);
    }
    else if(req.params.type=="borough"){
        const query = {borough:req.params.typename}
        api(res, query,req);
    }
    else if(req.params.type=="cuisine"){
        const query = {cuisine:req.params.typename}
        api(res, query,req);
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
        console.log(req.query.docs)
		handle_Find(res, req.query.docs,req);
	}
})

app.get('/login', (req,res) => {
	res.status(200).render('login',{});
});

app.post('/logincheck', (req,res) => {
    console.log("post login")
    console.log(req)
	users.forEach((user) => {
		if (user.name == req.fields.username && user.password == req.fields.password) {
			req.session.authenticated = true;
			req.session.username = req.fields.username;	 	
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
    });
    let DOCID = {};
    console.log(req)
    if (req.files.image.size>0){
        //console.log("hi")
        fs.readFile(req.files.image.path,(err,data)=>{
            assert.equal(err,null);
            newdata={
                address : {
                    building: req.fields.building,
                    coord:[req.fields.xcoord,req.fields.ycoord],
                    street: req.fields.street,
                    zipcode:req.fields.zipcode
                },
                borough:req.fields.borough,
                cuisine: req.fields.cuisine,
                photo:new Buffer.from(data).toString('base64'),
                photo_mimetpye:req.files.image.type,
                grades:[],
                name: req.fields.name,
                restaurant_id:"",
                owner:req.fields.owner
            }
            console.log(newdata)
            insertDocument( DOCID,newdata, (docs) => {  // docs contain 1 document (hopefully)
                client.close();
                console.log("Closed DB connection");
                res.status(200).render('createSuccess', {});
                });

        });
    }else{
        newdata={
            address : {
                building: req.fields.building,
                coord:[req.fields.xcoord,req.fields.ycoord],
                street: req.fields.street,
                zipcode:req.fields.zipcode
            },
            borough:req.fields.borough,
            cuisine: req.fields.cuisine,
            photo:"",
            photo_mimetpye:"",
            grades:[],
            name: req.fields.name,
            restaurant_id:"",
            owner:req.fields.owner
        }
        insertDocument( DOCID,newdata, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('createSuccess', {});
            });
    }
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
    // const client = new MongoClient(mongourl);
    // client.connect((err) => {
    //     assert.equal(null, err);
    //     console.log("Connected successfully to server");
    //     const db = client.db(dbName);
    //     let DOCID = {};
    //     DOCID['_id'] = ObjectID(criteria._id)
    //     findDocument(db, DOCID, (docs) => {  // docs contain 1 document (hopefully)
    //         client.close();
    //         console.log("Closed DB connection");
    //         for (i in docs[0].grades) {
    //             console.log(docs[0].grades[i].user)
    //             if(docs[0].grades[i].user == req.session.username){
    //                 check = true
    //             }
    //         }
    //         if(check ==true){
    //             updatecrit = {_id:criteria._id,"grades.user":"guest"}
    //             updatedata = {$set:{"grades.$.score": req.fields.score}}
    //         }
    //         else{
    //             updatecrit = {_id:criteria._id}
    //             updatedata = {$push:{grades:{user: req.session.username,score: req.fields.score}}}
    //         }
    //         console.log(updatecrit)
    //         console.log(updatedata)
    //         updateDocument( updatecrit,updatedata, (docs) => {  // docs contain 1 document (hopefully)
    //             client.close();
    //             console.log("Closed DB connection");
    //             res.status(200).render('rateSuccess', {});
    //         });
    //     });
    // });
    


    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        /* use Document ID for query */
        let DOCID = {};
        rating = {$push:{grades:{user: req.session.username,score: req.fields.score}}}
        console.log(rating)
        DOCID['_id'] = ObjectID(criteria._id)
        updateDocument( DOCID,rating, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
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
        let DOCID = {};
        /*use Document ID for query */
        DOCID['_id'] = ObjectID(req.fields._id)
        if (req.files.image.size>0){
            //console.log("hi")
            fs.readFile(req.files.image.path,(err,data)=>{
                assert.equal(err,null);
                updatedata = {
                    $set:{
                        address : {
                            building: req.fields.building,
                            coord:[req.fields.xcoord,req.fields.ycoord],
                            street: req.fields.street,
                            zipcode:req.fields.zipcode
                        },
                        borough:req.fields.borough,
                        cuisine: req.fields.cuisine,
                        name: req.fields.name,
                        photo:new Buffer.from(data).toString('base64'),
                        photo_mimetpye:req.files.image.type
                        }
                }
                console.log(updatedata)
               updateDocument( DOCID,updatedata, (docs) => {  // docs contain 1 document (hopefully)
                    client.close();
                    console.log("Closed DB connection");
                    res.status(200).render('updateSuccess', {});
                    });

            });
        }else{
            updatedata = {
                $set:{
                    address : {
                        building: req.fields.building,
                        coord:[req.fields.xcoord,req.fields.ycoord],
                        street: req.fields.street,
                        zipcode:req.fields.zipcode
                    },
                    borough:req.fields.borough,
                    cuisine: req.fields.cuisine,
                    name: req.fields.name,
                    photo:"",
                    photo_mimetpye:""
                    }
                }
            updateDocument( DOCID,updatedata, (docs) => {  // docs contain 1 document (hopefully)
                client.close();
                console.log("Closed DB connection");
                res.status(200).render('updateSuccess', {});
                });
        }

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
const api = (res, criteria,req) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");
            console.log(docs)
            res.send(docs)
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
            res.status(200).render('display', {restaurant:docs[0],user :req.session.username,mapAPI: googlemapurl});
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

app.listen(app.listen(process.env.PORT || 8099));