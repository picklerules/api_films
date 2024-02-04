const express = require('express');
const fs = require('fs');
const path = require('path');
const mustacheExpress = require('mustache-express');
const db = require('./config/db.js');

//configurer la variable env pour protéger les info d'environnement
const dotenv = require('dotenv');

//configurations 
dotenv.config();

const server = express();
///////////////////////

//definir le type de view
server.set('views', path.join(__dirname, 'views'));
server.set('view engine', 'mustache');
server.engine('mustache', mustacheExpress());

//middlewares
server.use(express.static(path.join(__dirname, 'public')));
server.use(express.json());

//point d'accès
server.get('/films', async (req, res)=>{
    
    try {    

    //pour mettre la req dans le url
    console.log(req.query);
    const direction = req.query['order-direction'];  
    const limit = +req.query.limit || 50;  

    const donneesRef = await db.collection('films').orderBy('user', direction).limit(limit).get(); 
    const donneesFinale = [];
    
    donneesRef.forEach((doc)=>{

        donneesFinale.push(doc.data());

    })

    res.statusCode = 200;
    res.json(donneesFinale);

    } catch (e) {

        res.statusCode = 500;
        //res.json arrete ma requête 
        res.json({ message: 'Erreur serveur' });
    }

});





//DOIT ETRE LA DERNIÈRE, gestion des erreurs (page 404 ou requête non trouvée)
server.use((req, res)=>{
    res.statusCode = 404;
    res.render('404', { url: req.url });
})

//à la toute fin
server.listen(process.env.PORT, ()=>{
    console.log('Le serveur a démarré');
});


// npm run dev  pour runner mon script
