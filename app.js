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

// SOCKET.IO SETUP
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const Message = require("./models/message");

io.on("connection", (socket) => {
  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("sendMessage", async (data) => {
    // data: { chatId, sender, content }
    console.log(data);
    try {
      if (!data.chatId || !data.sender || !data.content) {
        socket.emit("errorMessage", "Dati messaggio non validi");
        return;
      }
      // Verifica che la chat esista
      const chatExists = await Message.db.model("Chat").findById(data.chatId);
      if (!chatExists) {
        socket.emit("errorMessage", "Chat non trovata");
        return;
      }
      const newMessage = await Message.create({
        chat: data.chatId,
        sender: data.sender,
        content: data.content,
      });
      io.to(data.chatId).emit("newMessage", newMessage);
    } catch (err) {
      console.error("Errore salvataggio messaggio:", err);
      socket.emit(
        "errorMessage",
        "Errore durante il salvataggio del messaggio"
      );
    }
  });
});

const port = process.env.PORT || 3000;
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    server.listen(port, "0.0.0.0", () =>
      console.log(`Server is listening: ${port}...`)
    );
  } catch (error) {
    console.log(`ERROR WITH CONNECTION WITH THE SERVER --> ${error}`);
  }
};
start();
