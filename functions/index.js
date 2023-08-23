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

//Message
const message = (success,data,error,msg,statusCode) =>{
    const response = {
        success: success,
        data: data,
        error: error,
        message: msg,
        statusCode: statusCode,
    }
    return response
}

//Control Function
const controlFunction = async (email, action) => {
    const control = {
        email: email,
        action: action,
        date: Date()
    }
    await db.collection('control').add(control);
    return control;
};

//Add data of artists
app.post('/artist', validateToken, async (req, res) => {
    try {
      const artist = req.body; 

      if (!artist || artist.length === 0) {
        response = message(false,null,'At least one artist is required',null,400)
        return res.status(400).send(response)
      }
  
      const addedArtists = [];
  
      for (const artists of artist) {
        const { name, genre } = artists;
        if (!name || !genre) {
          response = message(false,null,'Name and genre are required for each artist',null,400)  
          return res.status(400).send(response);
        }
  
        const newArtist = {
          name: name,
          genre: genre,
          delete: false,
        };
  
        await db.collection('artist').add(newArtist);
        addedArtists.push(newArtist);
      }

      //control
      const token = req.headers['key'] || req.query.key;
      const user = decodeToken(token)
      controlFunction(user.email,'POST ARTISTS')
  
      response = message(true, addedArtists, null, 'Artists added successfully', 200);
      return res.status(200).send(response);

    } catch (err) {
      response = message(false, null, err.message, 'Artists not added successfully', 400);
      return res.status(400).send(response);
    }
})

//Get data of a artist 
app.get('/artist',validateToken, async(req, res) => {
    try{
        //control
        const token = req.headers['key'] || req.query.key;
        const user = decodeToken(token)
        controlFunction(user.email,'GET ARTISTS')

        const data  = db.collection('artist')
        const query = await data.where('delete', '!=', true).get()
        let artists = []
        query.forEach((doc) => {
            let id = doc.id;
            let artist = doc.data();
            artists.push({id, ...artist});
        });

        response = message(true,artists,null,null,200)
        return res.send(response);

    }catch(err){
        response = message(false,null,err.message,'Error getting artist data.',400)
        return res.status(400).send(response)
    }
})

//Get data of one artist
app.get('/artist/:id_artist', validateToken,  async(req,res)=>{
    try{
        const data = await db.collection('artist').doc(req.params.id_artist).get();
        const artist = data.data();

         //control
        const token = req.headers['key'] || req.query.key;
        const user = decodeToken(token)
        controlFunction(user.email,'GET ONE ARTIST')

        response = message(true,artist,null,'Artist retrieved successfuly',200) 
        return res.status(200).send(response);

    }catch(err){
        response = message(false,null,err.message,'Error getting one artist data.',400) 
        return res.status(200).send(response);
    }
})

//Update data of a artist
app.put('/artist/:id_artist', validateToken, async(req,res)=>{
    try{
        const data = db.collection('artist').doc(req.params.id_artist)
        const {name, genre} = req.body
        if(name){
            await data.update({
                name: name,
            })
        }
        if(genre){
            await data.update({
                genre: genre,
            })
        }
        const dataUpdate = await db.collection('artist').doc(req.params.id_artist).get()
        const artist = dataUpdate.data(); 

         //control
        const token = req.headers['key'] || req.query.key;
        const user = decodeToken(token)
        controlFunction(user.email,'UPDATE ARTIST')

        response = message(true,artist,null,'Artist successfully updated.',200)
        return res.status(200).send(response)

    }catch(err){
        response = message(false,null,err.message,'Artist not successfully updated.',400)
        return res.status(400).send(response)
    }
})


//Delete one artist
app.delete('/artist/:id_artist', validateToken, async(req,res)=>{
    try {
        const data = db.collection('artist').doc(req.params.id_artist)
        await data.update({
            delete: true
        })

        //control
        const token = req.headers['key'] || req.query.key;
        const user = decodeToken(token)
        controlFunction(user.email,'DELETE ONE ARTIST')

        response = message(true,null,null,'Artist deleted successfuly',200)
        return res.status(200).send(response)
    }catch(err){
        response = message(false,null,err.message,'Artist not deleted successfuly',400)
        return res.status(400).send(response)
    }
})

//Create new user
app.post('/api/users', async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!email || !password) {
          return res.status(400).json({error: 'Email and password are required'});
        }
        const userCredentials = {
            email:email,
            password: password,
            delete: false,
        }
        const accessToken = generateAccessToken(userCredentials);

        const user={
            ...userCredentials,
            accessToken: accessToken,
        }

        await db.collection("users").add(user);
        
        /*control
        const token = req.headers['key'] || req.query.key;
        const userControl = decodeToken(token)
        controlFunction(userControl.email,'USER CREATED')*/


        response = message(true,user,null,'User created successfuly',200)
        return res.status(200).send(response)

    }catch (err){
        response = message(false,null,err.message,'User not created successfuly',400)
        return res.status(400).send(response)
    }
});

//Get data of a users
app.get('/api/users', validateToken, async (req,res) =>{
    try {
        const data = db.collection("users")
        const query = await data.where('delete', '!=', true).get()
        let users = []
        query.forEach((doc) =>{
            let id = doc.id
            let user = doc.data()
            users.push({id, ...user});
        })

        //control
        const token = req.headers['key'] || req.query.key;
        const user = decodeToken(token)
        controlFunction(user.email,'GET USERS')

        response = message(true,users,null,'User retrieved successfuly',200)
        return res.status(200).send(response)

    } catch (err) {
        response = message(false,null,err.message,null,400)
        return res.status(400).send(response)
    }
})

//Get one user
app.get('/api/users/:id_user', validateToken, async(req, res) =>{
    try {
        const data = await db.collection('users').doc(req.params.id_user).get()
        const user = data.data();

        response = message(true,user,null,'User retrieved successfuly',200)
        res.status(200).send(response)

    } catch (err) {
        response = message(false,null,err.message,'User not retrieved successfuly',400)
        return res.status(400).send(response)
    }
})

function decodeToken(token){
    try{
        let Token = JSON.parse(atob(token.split('.')[1]));
        return Token
    }catch(err){
        console.log(err.message)
        return null
    }    
}

function generateAccessToken(user) {
    return jwt.sign(user, process.env.SECRET);
}

function validateToken(req,res,next){
    const accessToken = req.headers['key'] || req.query.key;
    response = message(false,null,null,'ACCESS DENIED',null)
    if(!accessToken) res.send(response);

    jwt.verify(accessToken, process.env.SECRET, (err, user) =>{
        if(err){
            res.send(err);
        }else{
            next()
        }
    })
}

exports.app = functions.https.onRequest(app);
