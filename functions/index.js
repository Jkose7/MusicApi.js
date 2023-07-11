const functions = require('firebase-functions');
const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
require('dotenv').config();
admin.initializeApp({
    credentials: admin.credential.cert('./credentials.json')
})
const app = express()
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const db = admin.firestore()

//atemp one
app.get('/home', validateToken, (req,res)=>{
    try {
        res.status(200).sendFile( __dirname + '/home.html')
    } catch (error) {
        res.status(404).send('error')
    }
})


//get date
app.get('/artist',validateToken, async(req, res) => {
    try{
        const snapshot = await db.collection('artist').get()
        let artist= []

        snapshot.forEach((doc) => {
            let id = doc.id;
            let data = doc.data();

            artist.push({id, ...data});
        });

        res.status(200).send(JSON.stringify(artist));

    }catch(err){
        return res.status(401).send('error show the date')
    }
})

//get one artist
app.get('/artist/:id_artist', validateToken, async(req,res)=>{
    try{
        const date = db.collection('artist').doc(req.params.id_artist);
        const item = await date.get();
        const response = item.data();
        res.status(200).json(response);
    }catch(err){
        return res.status(400).send('error')
    }
})

//update date
app.put('/artist/:id_artist', validateToken, async(req,res)=>{
    try{
        const date = db.collection('artist').doc(req.params.id_artist)
        await date.update({
            name: req.body.name,
        })
        return res.status(200).send('update')
    }catch(err){
        return res.status(400).json(err)
    }
})

//serch date
app.get( `/artist/search`, validateToken, async(req,res) =>{
    try{
        const query = req.query.name
        const snapshot = await db.collection('artist').where('name', '==', query).get()
        const data = snapshot.docs.map((doc) => doc.data());
        return res.status(200).send(JSON.stringify(data))

    }catch{
        return res.status(400).send('Artist not found')
    }
})


//delete one artist
app.delete('/artist/:id_artist', validateToken, async(req,res)=>{
    try {
        const date = db.collection('artist').doc(req.params.id_artist)
        await date.delete()
        return res.status(200).send('artist delete')
    }catch(err){
        return res.status(400).send('error')
    }

})

//add date
app.post('/artist', validateToken, async(req,res)=>{
    try{
        const {name, genre} = req.body;
        if (!name || !genre) {
            return res.status(400).json({error: 'Email and password are required'});
        }

        const artist = {
            name: name,
            genre: genre
        }

        await db.collection('artist').add(artist);

    }catch(err){
        return res.status(400).send('error to add date');
    }
})

//create new user
app.post('/api/users', async (req, res) => {
    try {
        const {email, password} = req.body;

        if (!email || !password) {
          return res.status(400).json({error: 'Email and password are required'});
        }

        const userCredentials = {
            email:email,
            password: password,
        }
        const accessToken = generateAccessToken(userCredentials);

        const user={
            ...userCredentials,
            accessToken: accessToken,
        }

        await db.collection("users").add(user);
        console.log(accessToken)
        res.header('authorization', accessToken);
        res.json({accessToken: accessToken});

    }catch (error){
        console.error('Error creating user:', error);
        return res.status(400)
    }
});

function generateAccessToken(user) {
    return jwt.sign(user, process.env.SECRET, {expiresIn: '60m'});
}

function validateToken(req,res,next){
    const accessToken = req.headers['authorization'] || req.query.key;
    if(!accessToken) res.send('Access denied');

    jwt.verify(accessToken, process.env.SECRET, (err, user) =>{
        if(err){
            res.send(err);
        }else{
            next()
        }
    })
}

exports.app = functions.https.onRequest(app);
