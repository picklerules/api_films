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
//Récupérer tous les films 
server.get('/api/films', async (req, res)=>{
    
    try {    

    //pour mettre la req dans le url
    console.log(req.query);
    const direction = req.query['ordre'] || 'asc';  
    const tri = req.query['tri'] || 'titre';
    

    const donneesRef = await db.collection('films').orderBy(tri, direction).get(); 
    const donneesFinale = [];
    
    donneesRef.forEach((doc)=>{

        donneesFinale.push(doc.data());

    })

    res.statusCode = 200;
    res.json(donneesFinale);

    } catch (e) {

        res.statusCode = 500;
        res.json({ message: 'Erreur serveur' });
    }

});


/**
 * @method GET
 * @param id 
 * Permet d'accéder à un film selon son id
 */
server.get('/api/films/:id', async (req, res) =>{

    try {
        
        const id = req.params.id;
        
        const film = await db.collection('films').doc(id).get();

        if(!film.exists) {
    
            res.statusCode = 404;
            res.json({ message: 'Film non trouvé' });

        } else {

        res.statusCode = 200;
        res.json(film.data());

        }

    } catch (e) {

        res.statusCode = 500;
        res.json({message:'Erreur lors de la récupération du film'})

    }
})
  

//Initialiser les données films
server.post('/api/films/initialiser',(req,res)=>{
   
    const donneesTest = require('./data/filmsTest.js');

    donneesTest.forEach(async(element)=>{
        await db.collection('films').add(element);
    });

    res.statusCode = 200;
    res.json({ message : 'La base de donnée a été initialisée avec les films.' });
});

//REQUÊTE POST  
server.post('/api/films', async (req, res)=>{

    try {
        const film = req.body;
        // console.log(test);

        //validation des données
        if(film.titre == undefined || film.genres == undefined || film.description == undefined || film.annee == undefined || film.realisation == undefined || film.titreVignette == undefined ) {

            res.statusCode = 400;
            return res.json({ message: 'Veuillez remplir les informations.' });
        }

        const newFilm = await db.collection('films').add(film);

    res.statusCode = 201;
    res.json({ message : 'Le film a été ajoutée', id: newFilm.id, donnees: film});

    } catch (e) {

        res.statusCode = 500;
        res.json({ message: 'Erreur lors de l\'ajout du film' });

    }
});

// //Initialiser les données utilisateur
// server.post('/api/utilisateur/initialiser',(req,res)=>{
   
//     const donneesTest = require('./data/utilisateurTest.js');

//     donneesTest.forEach(async(element)=>{
//         await db.collection('films').add(element);
//     });

//     res.statusCode = 200;
//     res.json({ message : 'La base de donnée a été initialisée avec les utilisateurs.' });
// });






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
