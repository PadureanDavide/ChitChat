const { StatusCodes } = require("http-status-codes");
require("dotenv").config(); //to access data stored in .env file

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

app.use(express.json()); //makes available the data in req.body
app.use(express.urlencoded({ extended: false })); //to parse the data send with HTML forms, false means it uses the parse querystring
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public"), { index: false }));

//connect database
const connectDB = require("./db/connect");

//get handler errors
const notFound = require("./middleware/notFound");
const errorHandlerMiddleware = require("./middleware/error-handler");

//middlewares
const authenticateUser = require("./middleware/authentication");

//get all the paths
const authUser = require("./routes/user");
const chat = require("./routes/chat");

//router
app.use("/", authUser);
app.use("/chat", chat);

//-------------------------------------------------------------------------------------------------------------

//errors if there is not path
app.use(notFound);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 3000;

//try and connect to database, and console log to see if the server is online
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, "0.0.0.0", () =>
      console.log(`Server is listening: ${port}...`)
    );
  } catch (error) {
    console.log(`ERROR WITH CONNECTION WITH THE SERVER --> ${error}`);
  }
};
start();
