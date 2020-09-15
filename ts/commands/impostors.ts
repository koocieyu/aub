import { Client, Message, MessageEmbed } from "discord.js";
import set_cooldown from "../misc_functions/set_cooldown"
import { db_games } from "../main"

export let properties = {
  file_name: "impostors.js",
  name: "impostors",
  cooldown: 60
}

export function run(Bot: Client, command_arguments: string[], message: Message) {
  db_games.exists({ text_id: message.channel.id })
    .then(channel_exists => {
      if (!channel_exists) {
        return message.channel.send({
          embed: new MessageEmbed()
            .setTitle("You are not allowed to do this outside of a game lobby!")
            .setDescription("This command is only available in game lobbies!")
        })
      }
      else {
        if (!message.member.roles.cache.has(process.env.hostmemberrole)) {
          return message.channel.send({
            embed: new MessageEmbed()
              .setDescription("You must be the host of this room in order to run this command!")
          })
        }
        if (command_arguments.length !== 1) {
          return message.channel.send({
            embed: new MessageEmbed()
              .setTitle("Wrong amount of arguments provided!")
              .setDescription("This command requires 1 argument which is the number of impostors that this game should have and it should be a number between 1 and 3")
          })
        }

        const regex_impostors = /1|2|3/i;
        const found_regex_impostors = regex_impostors.exec(command_arguments[0])

        if (!found_regex_impostors) {
          return message.channel.send({
            embed: new MessageEmbed()
              .setTitle("The provided argument is not right!")
              .setDescription("What you provided as an argument is not what you should have provided and this proves that you are dumb. The argument should be a number between 1 and 3")
          })
        }
        if (found_regex_impostors[0] !== command_arguments[0]) {
          return message.channel.send({
            embed: new MessageEmbed()
              .setTitle("The provided argument is not right!")
              .setDescription("What you provided as an argument is not what you should have provided and this proves that you are dumb. The argument should be a number between 1 and 3")
          })
        }
        else {
          db_games.findOne({ text_id: message.channel.id })
            .then(found_game => {
              const impostors_db = found_game.get("impostors")
              const max_players_db = found_game.get("max_players")
              const impostors_arg = Number(command_arguments[0])
              if (impostors_arg === impostors_db) {
                return message.channel.send({
                  embed: new MessageEmbed()
                    .setTitle("The number of impostors is the same as it was before!")
                    .setDescription("This really shows that you are so dumb.")
                })
              }
              else if ((impostors_arg === 2 && max_players_db < 5) || (impostors_arg === 3 && max_players_db < 7)) {
                return message.channel.send({
                  embed: new MessageEmbed()
                    .setDescription("There cannot be a lobby with this many impostors and this many max players as it would be an insta win for the impostors! Try again!")
                    .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
                })
              }
              else {
                found_game["impostors"] = impostors_arg
                found_game.save()
                return message.channel.send({
                  embed: new MessageEmbed()
                    .setDescription(`Changed the amount of bad guys to \`${impostors_arg}\``)
                })
              }
            })
        }
      }
    })
}