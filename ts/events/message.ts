import { Client, Message, MessageEmbed } from "discord.js"
import moment from "moment"
import { commands, MDB, db_cooldowns } from "../main"
import mongoose from "mongoose"
import { stringify } from "querystring"

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
        const cooldown_in_db = db_cooldowns.exists({name: command_name, user_id: message.author.id });
        if (cooldown_in_db) {
          db_cooldowns.findOne({name: command_name, user_id: message.author.id }, (error, found_document) => {
            const seconds_since_last_exec = moment().diff(found_document.get("last_executed"), "seconds")
            if (seconds_since_last_exec < command.cooldown) {
              return message.channel.send({
                embed: new MessageEmbed()
                  .setFooter(`This command is on cooldown and will be available in ${command.cooldown - seconds_since_last_exec} seconds`)
              })
            }
          })
        }
 
      }

      // check other conditions
      const Command = require(`../commands/${command.file_name}`)
      Command.run(Bot, command_arguments, message)

      // If everything passed, run the command
      
    }
  })

}