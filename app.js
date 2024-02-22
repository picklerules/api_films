const express = require("express");
const fs = require("fs");
const path = require("path");
const mustacheExpress = require("mustache-express");
const cors = require("cors");
const db = require("./config/db.js");
const { check, validationResult } = require("express-validator");

//configurer la variable env pour protéger les info d'environnement
const dotenv = require("dotenv");

//configurations
dotenv.config();

const server = express();
server.use(cors());
///////////////////////

//definir le type de view
server.set("views", path.join(__dirname, "views"));
server.set("view engine", "mustache");
server.engine("mustache", mustacheExpress());

//middlewares
server.use(express.static(path.join(__dirname, "public")));
server.use(express.json());

//point d'accès
//Récupérer tous les films
server.get("/api/films", async (req, res) => {
  try {
    //pour mettre la req dans le url
    console.log(req.query);
    const direction = req.query["ordre"] || "asc";
    const tri = req.query["tri"] || "titre";

    const donneesRef = await db
      .collection("films")
      .orderBy(tri, direction)
      .get();
    const films = [];

    donneesRef.forEach((doc) => {
      const filmAvecId = doc.data();
      filmAvecId.id = doc.id;
      films.push(filmAvecId);
    });

    res.statusCode = 200;
    res.json(films);
  } catch (e) {
    res.statusCode = 500;
    res.json({ message: "Erreur serveur" });
  }
});

/**
 * @method GET
 * @param id
 * Permet d'accéder à un film selon son id
 */
server.get("/api/films/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const film = await db.collection("films").doc(id).get();

    if (!film.exists) {
      res.statusCode = 404;
      res.json({ message: "Film non trouvé" });
    } else {
      res.statusCode = 200;
      res.json(film.data());
    }
  } catch (e) {
    res.statusCode = 500;
    res.json({ message: "Erreur lors de la récupération du film" });
  }
});

/**
 * @method POST
 * Permet d'initialiser la base de donnée
 */
// server.post('/api/films/initialiser',(req,res)=>{

//     const donneesTest = require('./data/filmsTest.js');

//     donneesTest.forEach(async(element)=>{
//         await db.collection('films').add(element);
//     });

//     res.statusCode = 200;
//     res.json({ message : 'La base de donnée a été initialisée avec les films.' });
// });

// /**
//  * @method POST
//  * Permet d'initialiser la base de donnée
//  */
// server.post('/api/utilisateurs/initialiser',(req,res)=>{

//     const donneesTest = require('./data/utilisateurTest.js');

//     donneesTest.forEach(async(element)=>{
//         await db.collection('utilisateurs').add(element);
//     });

//     res.statusCode = 200;
//     res.json({ message : 'La base de donnée a été initialisée avec les utilisateurs.' });
// });

/**
 * @method POST
 * Permet d'ajouter un film
 */
server.post(
  "/api/films",
  [
    check("titre").escape().trim().notEmpty().isString().exists(),
    check("genres").escape().trim().notEmpty().isArray().exists(),
    check("description").escape().trim().notEmpty().isString().exists(),
    check("annee").escape().trim().notEmpty().isString().exists(),
    check("realisation").escape().trim().notEmpty().isString().exists(),
    check("titreVignette").escape().trim().notEmpty().isString().exists(),
    check("commentaires")
      .escape()
      .trim()
      .notEmpty()
      .isString()
      .isLength({ max: 200 })
      .exists(),
  ],
  async (req, res) => {
    try {
      //validation des données
      const validation = validationResult(req);
      if (validation.errors.length > 0) {
        res.statusCode = 400;
        return res.json({ message: "Données non-conformes" });
      }

      const film = req.body;

      const newFilm = await db.collection("films").add(film);

      res.statusCode = 201;
      res.json({
        message: "Le film a été ajouté",
        id: newFilm.id,
        donnees: film,
      });
    } catch (e) {
      res.statusCode = 500;
      res.json({ message: "Erreur lors de l'ajout du film" });
    }
  }
);

/**
 * @method POST
 * Permet d'ajouter un utilisateur / inscrire un utilisateur
 */
server.post(
  "/api/utilisateurs/inscription",
  [
    check("courriel")
      .escape()
      .trim()
      .notEmpty()
      .isEmail()
      .normalizeEmail()
      .exists(),
    check("mdp")
      .escape()
      .trim()
      .notEmpty()
      .isLength({ min: 8, max: 20 })
      .isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
      .exists(),
  ],
  async (req, res) => {
    try {
      //validation des données
      const validation = validationResult(req);

      if (validation.errors.length > 0) {
        res.statusCode = 400;
        return res.json({ message: "Données non-conformes" });
      }

      const { courriel, mdp } = req.body;

      //vérifier si l'utilisateur existe déjà
      const docRef = await db
        .collection("utilisateurs")
        .where("courriel", "==", courriel)
        .get();

      const utilisateurs = [];

      docRef.forEach((doc) => {
        utilisateurs.push(doc.data());
      });

      if (utilisateurs.length > 0) {
        res.statusCode = 400;
        return res.json({ message: "Ce courriel existe déjà" });
      }

      const newUtilisateur = { courriel, mdp };
      await db.collection("utilisateurs").add(newUtilisateur);

      delete newUtilisateur.mdp;

      res.statusCode = 200;
      res.json({
        message: "L'utilisateur a été ajouté",
        newUtilisateur: newUtilisateur,
      });
    } catch (e) {
      res.statusCode = 500;
      res.json({ message: "Erreur lors de l'ajout de l'utilisateur" });
    }
  }
);

/**
 * @method POST
 * Permet la connexion d'un utilisateur
 */
server.post(
  "/api/utilisateurs/connexion",
  [
    check("courriel").escape().trim().notEmpty().exists(),
    check("mdp").escape().trim().notEmpty().exists(),
  ],

  async (req, res) => {
    try {
      const validation = validationResult(req);

      if (validation.errors.length > 0) {
        res.statusCode = 400;
        return res.json({ message: "Veuillez remplir les champs" });
      }

      const { courriel, mdp } = req.body;

      //vérifier si le courriel de l'utilisateur existe dans la DB
      const docRef = await db
        .collection("utilisateurs")
        .where("courriel", "==", courriel)
        .get();

      const utilisateurs = [];

      docRef.forEach((doc) => {
        utilisateurs.push(doc.data());
      });

      //comparer le mdp avec la DB
      if (utilisateurs.length > 0) {
        //recuperer l'utilisateur connecté
        const utilisateurAValider = utilisateurs[0];

        if (mdp == utilisateurAValider.mdp) {
          //on retourne les infos de l'utilisateur sans le mot de passe
          delete utilisateurAValider.mdp;
          res.statusCode = 200;
          res.json({ message: "Vous êtes connecté", utilisateurAValider });
        } else {
          res.statusCode = 400;
          res.json({ message: "Mot de passe incorrect" });
        }
      } else {
        res.statusCode = 400;
        res.json({ message: "Utilisateur non trouvé" });
      }
    } catch (e) {
      res.statusCode = 500;
      res.json({ message: "Erreur lors de la connexion" });
    }
  }
);

/**
 * @method PUT
 * Permet de modifier un film
 */
server.put(
  "/api/films/:id",
  [
    check("titre").optional().escape().trim().notEmpty().isString(),
    check("genres").optional().escape().trim().notEmpty().isArray(),
    check("description").optional().escape().trim().notEmpty().isString(),
    check("annee").optional().escape().trim().notEmpty().isString(),
    check("realisation").optional().escape().trim().notEmpty().isString(),
    check("titreVignette").optional().escape().trim().notEmpty().isString(),
    check("commentaires")
      .optional()
      .escape()
      .trim()
      .notEmpty()
      .isString()
      .isLength({ max: 200 }),
  ],
  async (req, res) => {
    try {
      //validation des données
      const validation = validationResult(req);

      if (validation.errors.length > 0) {
        res.statusCode = 400;
        return res.json({ message: "Données non-conformes" });
      }

      const id = req.params.id;
      const filmModifie = req.body;

      await db.collection("films").doc(id).update(filmModifie);

      res.statusCode = 200;
      res.json({ message: "Le film a été modifié" });
    } catch (e) {
      res.statusCode = 500;
      res.json({ message: "Erreur de modification" });
    }
  }
);

/**
 * @method DELETE
 * Permet de supprimer un film
 */
server.delete("/api/films/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const resultat = await db.collection("films").doc(id).delete();

    res.statusCode = 200;
    res.json({ message: "Le film a été supprimée" });
  } catch (e) {
    res.statusCode = 500;
    res.json({ message: "Erreur lors de la suppression" });
  }
});

//DOIT ETRE LA DERNIÈRE, gestion des erreurs (page 404 ou requête non trouvée)
server.use((req, res) => {
  res.statusCode = 404;
  res.render("404", { url: req.url });
});

//à la toute fin
server.listen(process.env.PORT, () => {
  console.log("Le serveur a démarré");
});

// npm run dev  pour runner mon script
