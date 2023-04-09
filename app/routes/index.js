const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const authController = require("../controller/authController");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./utils/database.db"); // todo: db safe close  will be
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

const {
  getMovies,
  getMovie,
  getOrderHistory,
} = require("../helper/fetchMovieData");

const { check, validationResult } = require("express-validator");
dotenv.config();

/* GET home page. */
// private & public route
router.use(morgan("dev")).get("/", authController, async (req, res) => {
  const user = req.user;
  const movies = await getMovies(db);

  if (user == {}) {
    res.render("home", {
      title: "Home Page",
      movies: movies,
      user: {},
    });
  } else {
    res.render("home", {
      title: "Home Page",
      movies: movies,
      user: user,
    });
  }
});

/* GET user page. */
// route /user
// private route
router.use(morgan("dev")).get("/user", authController, async (req, res) => {
  const order_history = await getOrderHistory(db, req.user.id);

  if (req.user) {
    db.get("SELECT * FROM users WHERE id = ?", [req.user.id], (err, user) => {
      if (err) {
        console.error(err.message);
        res.status(500).send("Internal server error");
      } else if (!user) {
        res.status(404).send("User not found");
      } else {
        //change password display while sending back to the user.
        user = { ...user, password: "**********" };
        console.log("userData", user, order_history);
        res.render("user", {
          title: "User Page",
          user: user,
          movies: order_history,
        });
      }
    });
  } else {
    res.status(401).send({ msg: "Authorization Required" });
  }
});

/* GET moviedetail page. */
// route movies/:id
// private & public route
router.use(morgan("dev")).get("/movies/:id", authController, (req, res) => {
  const id = req.params.id;
  const user = req.user;

  // Query the database to retrieve the movie with the specified ID

  db.get("SELECT * FROM movies WHERE id = ?", [id], (err, movie) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal server error");
    } else if (!movie) {
      res.status(404).send("Movie not found");
    } else {
      res.render("movieDetail", {
        title: "Movie Detail",
        data: movie,
        user: user,
      });
    }
  });
});

// api/register
router
  .use(morgan("dev"))
  .post(
    "/register",
    [
      check("email", "Please include a valid email!").isEmail(),
      check("password", "Password is required!").exists(),
      check("address", "Address is required!").exists(),
      check("username", "Username is required!").exists(),
      check("name", "Name is required!").exists(),
      check("credit_card", "Credit card is required!").exists(),
    ],
    (req, res) => {
      //validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userData = req.body;
      console.log("🚀 ~ file: index.js:112 ~ router.use ~ userData:", userData);
      const { email, password } = req.body;

      db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) {
          console.log("🚀 ~ file: index.js:68 ~ err.message:", err.message);
          res.status(500).json({ msg: "Server error" });
        }

        if (user) {
          res.status(400).json({ msg: "Email already exists" });
        }
      });

      db.run(
        `INSERT INTO users (name, email, username, password, address, credit_card, order_history) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.name,
          userData.email,
          userData.username,
          userData.password,
          userData.address,
          userData.credit_card,
          userData.order_history,
        ],
        (err) => {
          if (err) {
            console.error(err.message);
            res.status(500).send("Error inserting user data into the database");
          } else {
            // db left open to keep app running
            // db.close((err) => {
            //   if (err) {
            //     console.error(err.message);
            //   }
            //   console.log("Database connection closed");
            // });

            db.get(
              `SELECT * FROM users WHERE email = ? AND password = ?`,
              [email, password],
              async (err, user) => {
                if (err) {
                  console.log(
                    "🚀 ~ file: index.js:68 ~ err.message:",
                    err.message
                  );
                  res.status(500).send("Server error");
                } else {
                  // jwt

                  // const isPasswordMatch = await bcrypt.compare(password, user.password);
                  // if (!isPasswordMatch) {
                  //   return res
                  //     .status(400)
                  //     .json({ errors: [{ msg: "Invalid Credentials!" }] });
                  // }

                  const payload = {
                    user: {
                      username: user.username,
                      id: user.id,
                    },
                  };

                  jwt.sign(
                    payload,
                    process.env.TOKEN_SECRET,
                    { expiresIn: 360000 },
                    (err, token) => {
                      if (err) throw err;
                      res.json({ token });
                    }
                  );

                  const movies = await getMovies(db);

                  res.render("home", {
                    title: "Home Page",
                    movies: movies,
                    user: user,
                  });
                }
              }
            );
          }
        }
      );
    }
  );

/* GET login page. */
// public route
router.use(morgan("dev")).get("/login", (req, res) => {
  res.render("login", { title: "Login Page", user: {} });
});

/* GET lgin page. */
// public route
router.use(morgan("dev")).get("/register", (req, res) => {
  res.render("register", { title: "Register Page", user: {} });
});

module.exports = router;
