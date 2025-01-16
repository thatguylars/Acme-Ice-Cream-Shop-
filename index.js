const pg = require("pg");
const express = require("express");
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/the_acme_flavors_db",
);
const app = express();

app.use(require("morgan")("dev"));
app.use(express.json());

const init = async () => {
  try {
    await client.connect();
    console.log("connected to database");

    let SQL = `
        DROP TABLE IF EXISTS flavors;
        `;
    await client.query(SQL);

    SQL = `
        CREATE TABLE flavors(
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            is_favorite BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `;
    await client.query(SQL);
    console.log("tables created");

    SQL = `
            INSERT INTO flavors(name) VALUES
            ('Mint Chocolate Chip'),
            ('Strawberry'),
            ('Rocky Road'),
            ('Cookie Dough');
            `;
    await client.query(SQL);
    console.log("data seeded");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

init()
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Listening on port ${port}`));
  })
  .catch((err) => console.error(err));

//read
app.get("/api/flavors", async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM flavors`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/flavors/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const SQL = `SELECT * FROM flavors WHERE id = $1`;
    const response = await client.query(SQL, [id]);
    if (response.rows.length === 0) {
      res.status(404).send("Flavor not found");
    } else {
      res.send(response.rows[0]);
    }
  } catch (error) {
    next(error);
  }
});

//create

app.post("/api/flavors", async (req, res, next) => {
  try {
    const { name } = req.body;
    const SQL = `
        INSERT INTO flavors(name)
        VALUES ($1)
        RETURNING *
        `;
    const response = await client.query(SQL, [name]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

//delete
app.delete("/api/flavors/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const SQL = `
        DELETE FROM flavors WHERE id = $1`;
    await client.query(SQL, [id]);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

//update
app.put("/api/flavors/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const { name, is_favorite } = req.body;
    const SQL = `
        UPDATE flavors
        SET name=$1, is_favorite=$2, updated_at=now()
        WHERE id=$3
        RETURNING *
        `;
    const response = await client.query(SQL, [name, is_favorite, id]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});
