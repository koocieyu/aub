import { Client, Message, MessageEmbed } from "discord.js"
import moment from "moment"
import { commands, MDB, db_cooldowns } from "../main"

export function run_event(Bot: Client, message: Message) {
  const bot_prefix = process.env.botprefix
  const regexPrefix = new RegExp(`(^<@!?${Bot.user.id}> ?){1}|(^${bot_prefix} ?){1}`);
  const foundPrefix = regexPrefix.exec(message.content);
  
  if (!foundPrefix) return;
  
  // could use <String>.slice()
  const command_arguments = message.content.split(foundPrefix[0]).join("").split(/ +/);
  const command_name = command_arguments.shift().toLowerCase();

  // Checking to see if any command should be run
  commands.forEach(command => {
    if (command_name === command.name) {
      if (command.cooldown) {
        db_cooldowns.exists({name: command_name, user_id: message.author.id })
          .then(exists => {
            if (exists) {
              db_cooldowns.findOne({name: command_name, user_id: message.author.id }, (error, found_document) => {
                if (error) return console.log(`An error occured while finding cooldown for user ${message.author.id}: ${error}`);
                const seconds_since_last_exec = moment().diff(found_document.get("last_executed"), "seconds")
                if (seconds_since_last_exec < command.cooldown) {
                  return message.channel.send({
                    embed: new MessageEmbed()
                      .setFooter(`This command is on cooldown and will be available in ${command.cooldown - seconds_since_last_exec} seconds`)
                  })
                }
              })
            }
          })
          .catch(resaon => {
            return console.log(`There was an error while checking if cooldown of an user exists: ${resaon}`)
          })
      }

      // check other conditions
      

      // If everything passed, run the command
      const Command = require(`../commands/${command.file_name}`)
      Command.run(Bot, command_arguments, message)
      
    }
  })

}