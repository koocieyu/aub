import { Client, Message, MessageEmbed } from "discord.js";
import set_cooldown from "../misc_functions/set_cooldown"
import sleep from "../misc_functions/sleep"
import { db_games } from "../main"
import random_string from "crypto-random-string"

export let properties = {
  file_name: "queue.js",
  name: "queue",
  cooldown: 60
}

export function run(Bot: Client, command_arguments: string[], message: Message) {
  // If the user is not in a voice channel
  if (!message.member.voice.channel) {
    return message.channel.send({
      embed: new MessageEmbed()
        .setDescription("You must be in the queue voice channel in order to run this command!")
        .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
    }) 
  }

  // If the user is in a voice channel but not the one for queueing
  if (message.member.voice.channelID !== process.env.voicequeueid) {
    return message.channel.send({
      embed: new MessageEmbed()
        .setDescription("You must be in the queue voice channel in order to run this command!")
        .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
    })
  }

  // If there are not exactly 4 arguments
  if (command_arguments.length != 4) {
    return message.channel.send({
      embed: new MessageEmbed()
        .setTitle("You must provide 4 arguments for this command to work!")
        .setDescription("If you wish to skip an argument put a minus instead of the argument. Check below to see what arguments you should provide.\n\n Command scheme: `queue [polus | skeld | mira] [1-3] [4-10] [EU | NA | AS]`\n\n`[polus | skeld | mira]`: The map that should be played\n`[1-3]`: an integer from 1 to 3 which is how many impostors will be in the game\n `[4-10]`: an integer from 4-10 which is how many players will be in the game\n`[EU | NA | AS]`: The region of the game")
        .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
      })
  }

  // If the above pass
  else {
    // Regexes for the arguments
    const regex_map = /polus|mira|skeld|-/i;
    const regex_region = /eu|na|as|-/i;
    const regex_impostors = /1|2|3|-/i;
    const regex_players = /4|5|6|7|8|9|10|-/i;

    // Arrays of results from the regexes
    const found_map_reg = regex_map.exec(command_arguments[0]);
    const found_impostors_reg = regex_impostors.exec(command_arguments[1]);
    const found_players_reg = regex_players.exec(command_arguments[2]);
    const found_region_reg = regex_region.exec(command_arguments[3]);

    // If there is no map found in the map argument
    if (found_map_reg === null) {
      return message.channel.send({
        embed: new MessageEmbed()
          .setDescription("You did not provide a valid option for the map argument! The argument must be one of the following: `polus` `mira` `skeld` or `-` to ignore. Try again!")
          .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
      })
    }

    // If there is no impostor amount in the impostor amount argument
    else if (found_impostors_reg === null) {
      return message.channel.send({
        embed: new MessageEmbed()
          .setDescription("You did not provide a valid option for the impostors amount argument! The argument must be a number between 1 and 3 or `-` to ignore. Try again!")
          .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
      })
    }

    // If there is no max players provided in the max players argument
    else if (found_players_reg === null) {
      return message.channel.send({
        embed: new MessageEmbed()
          .setDescription("You did not provide a valid option for the players amount argument! The argument must be a number between 4 and 10 or `-` to ignore. Try again!")
          .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
      })
    }

    // If there is no region provided in the region argument
    else if (found_region_reg === null) {
      return message.channel.send({
        embed: new MessageEmbed()
          .setDescription("You did not provide a valid option for the region argument! The argument must be one of the following: `EU` `NA` `AS` or `-` to ignore. Try again!")
          .setFooter(`for: ${message.member.displayName}#${message.author.discriminator}`)
      })
    }

    // If everything else above passes
    else {
      const map = found_map_reg[0];
      const impostors = found_impostors_reg[0];
      const players = found_players_reg[0];
      const region = found_region_reg[0];
      // Default search array where options provided in the command will be added in accordance to the db schema
      const options_to_search = {
        full: false,
        status: "public"
      }

      // Check arguments and put them into the settings object
      {
        // If the map is not skipped
        if (map !== "-") options_to_search["map"] = map.toLowerCase();
        // If the region is not skipped
        if (region !== "-") options_to_search["region"] = region.toLowerCase();
        // If the impostor and max player amount were not skipped
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
        // If one of the impostors or max players is skipped
        else {
          // If the max players amount is skipped
          if (players !== "-") {
            const int_players = Number(players)
            options_to_search["max_players"] = int_players

            // Conditions so that the lobby can be made ingame (not too many impostors)
            if (int_players === 4 ) options_to_search["impostors"] = 1
            else if (int_players > 4 && int_players < 7)  options_to_search["impostors"] = { $regex: /1|2/ }
            else options_to_search["impostors"] = { $regex: /1|2|3/ }
          }
          // If the impostor amount is skipped
          else if (impostors !== "-") {
            const int_impostors = Number(impostors)
            options_to_search["impostors"] = Number(impostors)

            // Conditions so that the lobby can be made ingame (not too many impostors)
            if (int_impostors === 1) options_to_search["max_players"] = { $regex: /4|5|6|7|8|9|10/ } 
            else if (int_impostors === 2) options_to_search["max_players"] = { $regex: /5|6|7|8|9|10/ }
            else options_to_search["max_players"] = { $regex: /7|8|9|10/ }

          }
        }
      }
      // Check if a lobby exists with the provided settings
      db_games.exists(options_to_search)
        .then(exists => {
          // If a lobby with the specified settings exists
          if (exists) {
              // Find the game with the specified settings
              db_games.findOne(options_to_search, (error_findOne, lobby) => {
                if (error_findOne) return console.log(`Error while searching for lobby: ${error_findOne}`)

                // Add the role of the lobby
                message.member.roles.add(lobby.get("role_id"))
                  .then(async () => {
                    // Move member to the lobby's voice channel
                    await sleep(500)
                    message.member.voice.setChannel(lobby.get("voice_id"))
                      .then(async () => {
                        await sleep(500)
                        Bot.channels.cache.get(lobby.get("text_id"))
                          // ignore because the chat id will always resolve into a text channel
                          // @ts-ignore
                          .send({
                            embed: new MessageEmbed()
                              .setDescription(`it seems like ${message.member} has joined the lobby.`)
                          })
                        set_cooldown("queue", message.author.id)
                        const lobby_players_in = lobby.get("players_in")
                        const lobby_max_players = lobby.get("max_players")
                        let update_in = { players_in: lobby_players_in + 1 }
                    
                        // If you are the last player that can join the lobby then set the full property of the things to push in the db to true
                        if(lobby_players_in + 1 === lobby_max_players) update_in["full"] = true
                    
                        // Update the game with the amount of players and the full property if that is the case
                        db_games.findOneAndUpdate({ _id: lobby.get("_id") }, update_in, (error_findAndUpdate, _doc) => {
                          if (error_findAndUpdate) return console.log(`An error occured while updating info of user who joined a lobby: ${error_findAndUpdate}`)
                          console.log("Successfully updated values when joining lobby in db.")
                        })
                      })
                  })
              })
          }
          // If a game with said settings does not exist
          else {
            // Create the lobby role
            message.guild.roles.create({
              data: {
                name: "aub-lobby-role-" + random_string({length: 10, type: 'numeric'}),
                mentionable: false,
                permissions: []
              }
            })
              .then(async role => {
                await sleep(500)

                // Make game category
                message.guild.channels.create("Game Lobby", {
                  type: "category",
                  permissionOverwrites: [
                    {
                      id: role.id,
                      allow: ["VIEW_CHANNEL", "SPEAK", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"]
                    },
                    {
                      id: process.env.everyoneroleid,
                      deny: ["VIEW_CHANNEL"]
                    },
                    {
                      id: Bot.user.id,
                      allow: ["VIEW_CHANNEL"]
                    }
                  ]
                })
                  .then(async category => {
                    await sleep(500)

                    // Make the lobby text channel
                    category.guild.channels.create("chat", {
                      type: "text",
                      parent: category.id,
                      rateLimitPerUser: 2
                    })
                      .then(async chat => {
                        await sleep(500)

                        // Make the lobby vc
                        category.guild.channels.create("speak", {
                          type: "voice",
                          parent: category.id,
                          userLimit: 10
                        })
                          .then(async voice => {
                            await sleep(500)

                                            // Assign the lobby role to the user
                            message.member.roles.add(role.id)
                              .then(async new_member => {
                                await sleep(500)
                                
                                // Move the member in the lobby vc
                                new_member.voice.setChannel(voice.id)
                                  .then(() => {
                                    db_games.create({
                                      ...options_to_search,
                                      category_id: category.id,
                                      role_id: role.id,
                                      voice_id: voice.id,
                                      text_id: chat.id
                                    })
                                      .then(async () => {
                                        console.log("Successfully created new lobby!")
                                        await sleep(500)
                                      
                                        // Send the member (host) an interesting message
                                        chat.send({
                                          embed: new MessageEmbed()
                                            .setDescription(`hello ${new_member}! \n you find yourself to be alone in here, huh? wonder why? it's because you were too picky with your lobby settings that no game with those settings was found! if someone wants something, i shall try my best to give that to the person. a lobby with the specified settings has been created and you are the boss of this small kingdom. \n\n type \`>help\` to see what commands you can run in here.`)
                                        })
                                          .then(async () => {
                                            await sleep(500)
                                          
                                            // Add the room host role to the user
                                            new_member.roles.add(process.env.hostmemberrole)
                                            set_cooldown("queue", message.author.id)
                                          })
                                      })
                                  })
                            
                              })

                          })
                      })
                  })
              })
          }
        })
        .catch(error => {
          console.log(`There was an error while checking if lobbies exist: ${error}`)
        })

    }
  }
}