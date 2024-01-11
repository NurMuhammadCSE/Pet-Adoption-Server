const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cai2g.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const petsCollection = client.db("pet-adoption").collection("animals");
    const paymentCollection = client.db("pet-adoption").collection("donation");
    const donationCampaignsCollection = client
      .db("pet-adoption")
      .collection("donationCampaigns");
    const adoptAnimalsCollection = client
      .db("pet-adoption")
      .collection("adoptAnimals");

      app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.send({ token });
      })

    app.get("/animals", async (req, res) => {
      const result = await petsCollection.find().toArray();
      res.send(result);
    });

    app.get("/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.findOne(query);
      res.send(result);
    });

    app.post("/adoptAnimal", async (req, res) => {
      const adoptAnimalData = req.body;
      const result = await adoptAnimalsCollection.insertOne(adoptAnimalData);
      res.send(result);
    });

    app.get("/donationCampaigns", async (req, res) => {
      const result = await donationCampaignsCollection.find().toArray();
      res.send(result);
    });

    app.get("/donationCampaignsDetails/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await donationCampaignsCollection.findOne(query);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { donationAmount } = req.body;
      const amount = donationAmount * 100;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: parseInt(amount),
        currency: "usd",
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      console.log("payment info", payment);

      res.send(paymentResult);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Pet is Running");
});

app.listen(port, () => {
  console.log(`Pet is Running ${port}`);
});
