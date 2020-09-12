import { Client, Message, MessageEmbed } from "discord.js"
import moment from "moment"
import { commands, MDB, db_cooldowns } from "../main"

export function run_event(Bot: Client, message: Message) {
  const bot_prefix = process.env.botprefix
  const regexPrefix = new RegExp(`(^<@!?${Bot.user.id}> ?){1}|(^${bot_prefix} ?){1}`);
  const foundPrefix = regexPrefix.exec(message.content);
  
  if (!foundPrefix) return;
  if (message.channel.type !== "text") return;
  
  // could use <String>.slice()
  const command_arguments = message.content.split(foundPrefix[0]).join("").split(/ +/);
  const command_name = command_arguments.shift().toLowerCase();

  // Checking to see if any command should be run
  commands.forEach((command: ICommandProperties) => {
    if (command_name === command.name) {
      function continueCheck() {
        console.log("herecontinue")
        if (command.owner_only && (message.author.id !== process.env.ownerid)) {
          message.channel.send({
            embed: new MessageEmbed()
              .setFooter("Only the owner of this bot can execute this command!")
          })
        }
        // @ts-ignore Bad declaration for d.js module or bad documentation OR bad code
        else if (command.member_permissions && !message.member.hasPermission(command.member_permissions)) {
          let string_permissions_needed = "";
          command.member_permissions.forEach(perm => {
            string_permissions_needed += `\`${perm}\` `
          })
          message.channel.send({
            embed: new MessageEmbed()
              .setTitle("You do not have enough permissions to run this command!")
              .setDescription(`You must have the following permissions in order to run this command: \n ${string_permissions_needed}`)
          })
        }
        // @ts-ignore Bad declaration for d.js module or bad documentation OR bad code
        else if (command.bot_permissions && !message.guild.me.hasPermission(command.member_permissions)) {
          let string_permissions_needed = "";
          command.member_permissions.forEach(perm => {
            string_permissions_needed += `\`${perm}\` `
          })
          message.channel.send({
            embed: new MessageEmbed()
              .setTitle("I do not have enough permissions to run this command!")
              .setDescription(`I must have the following permissions in order to run this command: \n ${string_permissions_needed}`)
          })
        }
        else if (command.member_roles && command.member_roles.every(role => message.member.roles.cache.has(role))) {
          let needed_roles = ""
          command.member_roles.forEach(role => {
            if (!message.member.roles.cache.some(member_role => member_role.id === role)) {
              needed_roles += `<@&${role}> `
            }
          })
          if (needed_roles !== "") {
            message.channel.send({
              embed: new MessageEmbed()
                .setDescription(`You must have the following roles in order to run this command: ${needed_roles}`)
            })
          }
        }
        else {
          const Command = require(`../commands/${command.file_name}`)
          Command.run(Bot, command_arguments, message)
        }
      }

      db_cooldowns.exists({command_name: command_name, user_id: message.author.id })
      .then(exists => {
        if (exists) {
          db_cooldowns.findOne({command_name: command_name, user_id: message.author.id }, (error, found_document) => {
            if (error) return console.log(`An error occured while finding cooldown for user ${message.author.id}: ${error}`);
            const seconds_since_last_exec = moment().diff(found_document.get("last_executed"), "seconds")
            if (seconds_since_last_exec < command.cooldown) {
              message.channel.send({
                embed: new MessageEmbed()
                  .setFooter(`This command is on cooldown and will be available in ${command.cooldown - seconds_since_last_exec} seconds`)
              })
            }
            else continueCheck()
          })
        }
        else continueCheck()
      })
      .catch(resaon => {
        return console.log(`There was an error while checking if cooldown of an user exists: ${resaon}`)
      })
    }
  })

}

interface ICommandProperties {
  file_name: string,
  name: string,
  cooldown: number,
  owner_only?: boolean,
  bot_permissions?: string[],
  member_permissions?: string[],
  member_roles?: string[]
}