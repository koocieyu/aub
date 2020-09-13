import { Client, Message, MessageEmbed } from "discord.js";
import set_cooldown from "../misc_functions/set_cooldown"
import { db_games } from "../main"

export let properties = {
  file_name: "queue.js",
  name: "queue",
  cooldown: 60
}

export function run(Bot: Client, command_arguments: string[], message: Message) {
  if (!message.member.voice.channel) {
    return message.channel.send({
      embed: new MessageEmbed()
        .setDescription("You must be in the queue voice channel in order to run this command!")
        .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
    }) 
  }
  if (message.member.voice.channelID !== process.env.voicequeueid) {
    return message.channel.send({
      embed: new MessageEmbed()
        .setDescription("You must be in the queue voice channel in order to run this command!")
        .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
    })
  }
  if (command_arguments.length != 4) {
    return message.channel.send({
      embed: new MessageEmbed()
        .setTitle("You must provide 4 arguments for this command to work!")
        .setDescription("If you wish to skip an argument put a minus instead of the argument. Check below to see what arguments you should provide.\n\n Command scheme: `queue [polus | skeld | mira] [1-3] [4-10] [EU | NA | AS]`\n\n`[polus | skeld | mira]`: The map that should be played\n`[1-3]`: an integer from 1 to 3 which is how many impostors will be in the game\n `[4-10]`: an integer from 4-10 which is how many players will be in the game\n`[EU | NA | AS]`: The region of the game")
        .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
      })
  }
  else {
    const regex_map = /polus|mira|skeld|-/i;
    const regex_region = /eu|na|as|-/i;
    const regex_impostors = /1|2|3|-/i;
    const regex_players = /4|5|6|7|8|9|10|-/i;

    const found_map_reg = regex_map.exec(command_arguments[0]);
    const found_impostors_reg = regex_impostors.exec(command_arguments[1]);
    const found_players_reg = regex_players.exec(command_arguments[2]);
    const found_region_reg = regex_region.exec(command_arguments[3]);

    if (found_map_reg === null) {
      return message.channel.send({
        embed: new MessageEmbed()
          .setDescription("You did not provide a valid option for the map argument! The argument must be one of the following: `polus` `mira` `skeld` or `-` to ignore. Try again!")
          .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
      })
    }
    else if (found_impostors_reg === null) {
      return message.channel.send({
        embed: new MessageEmbed()
          .setDescription("You did not provide a valid option for the impostors amount argument! The argument must be a number between 1 and 3 or `-` to ignore. Try again!")
          .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
      })
    }
    else if (found_players_reg === null) {
      return message.channel.send({
        embed: new MessageEmbed()
          .setDescription("You did not provide a valid option for the players amount argument! The argument must be a number between 4 and 10 or `-` to ignore. Try again!")
          .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
      })
    }
    else if (found_region_reg === null) {
      return message.channel.send({
        embed: new MessageEmbed()
          .setDescription("You did not provide a valid option for the region argument! The argument must be one of the following: `EU` `NA` `AS` or `-` to ignore. Try again!")
          .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
      })
    }
    else {
      const map = found_map_reg[0];
      const impostors = found_impostors_reg[0];
      const players = found_players_reg[0];
      const region = found_region_reg[0];
      const options_to_search = {
        full: false,
        status: "public"
      }

      if (map !== "-") options_to_search["map"] = map.toLowerCase();
      if (region !== "-") options_to_search["region"] = region.toLowerCase();
      if (impostors !== "-" && players !== "-") {
        const int_impostors = Number(impostors);
        const int_players = Number(players);

        if (int_impostors * 2 + 1 > int_players) {
          return message.channel.send({
            embed: new MessageEmbed()
              .setDescription("There cannot be a lobby with this many impostors and this many max players as it would be an insta win for the impostors! Try again!")
              .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
          })
        }
        else {
          options_to_search["impostors"] = int_impostors
          options_to_search["max_players"] = int_players
        }
      }
      else {
        if (players !== "-") {
          const int_players = Number(players)
          options_to_search["max_players"] = int_players

          if (int_players === 4 ) options_to_search["impostors"] = 1
          else if (int_players > 4 && int_players < 7)  options_to_search["impostors"] = { $regex: /1|2/ }
          else options_to_search["impostors"] = { $regex: /1|2|3/ }
        }
        else if (impostors !== "-") {
          const int_impostors = Number(impostors)
          options_to_search["impostors"] = Number(impostors)

          if (int_impostors === 1) options_to_search["max_players"] = { $regex: /4|5|6|7|8|9|10/ } 
          else if (int_impostors === 2) options_to_search["max_players"] = { $regex: /5|6|7|8|9|10/ }
          else options_to_search["max_players"] = { $regex: /7|8|9|10/ }

        }
      }

      // db find
      db_games.exists(options_to_search)
        .then(exists => {
          if (exists) {
              db_games.findOne(options_to_search, (error_findOne, lobby) => {
                if (error_findOne) return console.log(`Error while searching for lobby: ${error_findOne}`)
                message.member.roles.add(lobby.get("role_id")).then(() => {
                  message.member.voice.setChannel(lobby.get("voice_id")).then(() => {
                    const lobby_players_in = lobby.get("players_in")
                    const lobby_max_players = lobby.get("max_players")
                    let update_in = { players_in: lobby_players_in + 1 }
                    
                    if(lobby_players_in + 1 === lobby_max_players) update_in["full"] = true
                    
                    db_games.findOneAndUpdate({ _id: lobby.get("_id") }, update_in, (error_findAndUpdate, _doc) => {
                      if (error_findAndUpdate) return console.log(`An error occured while updating info of user who joined a lobby: ${error_findAndUpdate}`)
                      console.log("Successfully updated values when joining lobby in db.")
                    })
                  })
                })
              })
          }
          else {
            
          }
        })
        .catch(error => {
          console.log(`There was an error while checking if lobbies exist: ${error}`)
        })

    }
  }
}