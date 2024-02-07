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
  

/**
 * @method POST
 * Permet d'initialiser la base de donnée
 */
server.post('/api/films/initialiser',(req,res)=>{
   
    const donneesTest = require('./data/filmsTest.js');

    donneesTest.forEach(async(element)=>{
        await db.collection('films').add(element);
    });

    res.statusCode = 200;
    res.json({ message : 'La base de donnée a été initialisée avec les films.' });
});

/**
 * @method POST 
 * Permet d'initialiser la base de donnée
 */
server.post('/api/utilisateurs/initialiser',(req,res)=>{
   
    const donneesTest = require('./data/utilisateurTest.js');

    donneesTest.forEach(async(element)=>{
        await db.collection('utilisateurs').add(element);
    });

    res.statusCode = 200;
    res.json({ message : 'La base de donnée a été initialisée avec les utilisateurs.' });
});


/**
 * @method POST
 * Permet d'ajouter un film
 */
server.post('/api/films', async (req, res)=>{

    try {
        const film = req.body;
        // console.log(test);

        //TODO: ajouter l'entité commentaires, tableau de données
        //validation des données
        if(film.titre == undefined || film.genres == undefined || film.description == undefined || film.annee == undefined || film.realisation == undefined || film.titreVignette == undefined ) {

            res.statusCode = 400;
            return res.json({ message: 'Veuillez remplir les informations.' });
        }

        const newFilm = await db.collection('films').add(film);

    res.statusCode = 201;
    res.json({ message : 'Le film a été ajouté', id: newFilm.id, donnees: film});

    } catch (e) {

        res.statusCode = 500;
        res.json({ message: 'Erreur lors de l\'ajout du film' });

    }
});

/**
 * @method POST
 * Permet d'ajouter un utilisateur / inscrire un utilisateur
 */
server.post('/api/utilisateurs/inscription', async (req, res)=>{

    try {
        const utilisateur = req.body;
        // console.log(test);

        //validation des données
        if(utilisateur.courriel == undefined || utilisateur.mdp == undefined) {

            res.statusCode = 400;
            return res.json({ message: 'Veuillez remplir les informations.' });
        }
        
        //vérifier si l'utilisateur existe déjà
        const utilisateurExiste = await db.collection('utilisateurs').where('courriel', '==', utilisateur.courriel).get();

        if(utilisateurExiste.docs.length > 0) {

            res.statusCode = 400;
            return res.json({ message: 'L\'utilisateur existe déjà' });
        }


        const newUtilisateur = await db.collection('utilisateurs').add(utilisateur);

    res.statusCode = 200;
    res.json({ message : 'L\'utilisateur a été ajouté', id: newUtilisateur.id});

    } catch (e) {

        res.statusCode = 500;
        res.json({ message: 'Erreur lors de l\'ajout de l\'utilisateur' });

    }
});


/**
 * @method POST
 * Permet la connexion d'un utilisateur
 */
server.post('/api/utilisateurs/connexion', async (req, res)=>{

  try {

    const {courriel, mdp} = req.body;

    //vérifier si le courriel de l'utilisateur existe dans la DB
    const utilisateurConnexion = await db.collection('utilisateurs').where('courriel', '==', courriel).get();

    //comparer le mdp avec la DB
    if(utilisateurConnexion.docs.length > 0) {

        //recuperer l'utilisateur connecté
        const utilisateur = utilisateurConnexion.docs[0].data();

        if(mdp == utilisateur.mdp) {

            res.statusCode = 200;
            res.json({ message: 'Connexion réussie', courriel: utilisateur.courriel});

        } else {

            res.statusCode = 400;
            res.json({ message: 'Mot de passe incorrect' });

        }

    } else {

        res.statusCode = 400;
        res.json({ message: 'Utilisateur non trouvé' });

    }

  } catch (e) {

    res.statusCode = 500;
    res.json({ message: 'Erreur lors de la connexion' });

  }




})

/**
 * @method PUT
 * Permet de modifier un film
 */
server.put('/api/films/:id', async (req, res)=>{

    try {

        const id = req.params.id;
        const filmModifie = req.body;

       
        if(filmModifie.titre == undefined || filmModifie.genres == undefined || filmModifie.description == undefined || filmModifie.annee == undefined || filmModifie.realisation == undefined || filmModifie.titreVignette == undefined ) {

            res.statusCode = 400;
            return res.json({ message: 'Veuillez remplir les informations.' });
        }

        await db.collection('films').doc(id).update(filmModifie);

        res.statusCode = 200;
        res.json({ message : 'Le film a été modifié' });

    } catch (e) {

        res.statusCode = 500;
        res.json({ message: 'Erreur de modification' });

    }
});

/**
 * @method DELETE
 * Permet de supprimer un film
 */
server.delete('/api/films/:id', async (req, res)=>{

    try {

        const id = req.params.id;

        const resultat = await db.collection('films').doc(id).delete();

        res.statusCode = 200;
        res.json({ message : 'Le film a été supprimée' });

    } catch (e) {

        res.statusCode = 500;
        res.json({ message: 'Erreur lors de la suppression' });

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
