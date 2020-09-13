require('dotenv').config()
import mongoose from "mongoose"
import { Client } from "discord.js"
import filesystem from "fs"

// Database connection
const MDBURI = `mongodb+srv://${process.env.mongouser}:${process.env.mongopass}@${process.env.mongolocation}/${process.env.mongoname}?retryWrites=true&w=majority`

mongoose.connect(MDBURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

export let MDB = mongoose.connection;
MDB.on('error', console.error.bind(console, 'connection error:'))
MDB.once('open', () => {
    console.log("Connected to MongoDB successfully!")
})

// Discord connection
export const Bot = new Client()
Bot.login(process.env.bottoken)

// Load events
filesystem.readdir("./js/events/", (error, event_files) => {
  if (error) throw console.log(error);
  if (event_files.length == 0)
    throw new Error("There are no events in the events folder!");

  event_files.forEach(event_file => {
    const event_file_parts = event_file.split(".");
    const event_name = event_file_parts[0];
      
    if (event_file_parts.length < 2 || event_file_parts[1] != "js")
      throw new Error("Unknown type of file in events folder");
      
    const event = require(`./events/${event_file}`);

    Bot.on(event_name, (...args) => event.run_event(Bot, ...args));
  });
});

// Load commands
export let commands = []

filesystem.readdir("./js/commands/", (error, command_files) => {
  if (error) throw console.log(error);
  if (command_files.length == 0)
    throw new Error("There are no commands in the commands folder!");
  
  command_files.forEach(command_file => {

    const command_file_parts = command_file.split(".");
  
    if (command_file_parts.length < 2 || command_file_parts[1] != "js")
      throw new Error("Unknown type of file in commands folder");
  
    const command_props = require(`./commands/${command_file}`).properties;

    commands.push(command_props);
    });
});

// Make collection of cooldowns in db
let cooldowns_schema = new mongoose.Schema({
  user_id: String,
  last_executed: String,
  command_name: String
})
export let db_cooldowns = MDB.model("cooldown", cooldowns_schema)

let games_schema = new mongoose.Schema({
  category_id: String,
  text_id: String,
  voice_id: String,
  role_id: String,
  status: {
    type: String,
    default: "public"
  },
  full: {
    type: Boolean,
    default: false
  },
  max_players: {
    type: Number,
    default: 10
  },
  players_in: {
    type: Number,
    default: 1
  },
  impostors: {
    type: Number,
    default: 1
  },
  map: {
    type: String,
    default: "skeld"
  },
  code: String,
  room_password: {
    type: String,
    default: ""
  }
})
export let db_games = MDB.model("game", games_schema)