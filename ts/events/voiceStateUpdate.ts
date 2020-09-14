import { Client, MessageEmbed, VoiceState } from "discord.js"
import { db_games } from "../main"
import sleep from "../misc_functions/sleep"

export function run_event(Bot: Client, old_state: VoiceState, new_state: VoiceState) {
  if (old_state.channelID) {
    let disconnected = false;
    if (!new_state.channelID) disconnected = true;
    else {
      db_games.exists({ voice_id: new_state.channelID })
        .then(exists => {
          if (!exists) disconnected = true;
        })
    }

    if (disconnected) {
      db_games.exists({ voice_id: old_state.channelID })
        .then(exists => {
          if (exists) {
            db_games.findOne({ voice_id: old_state.channelID })
              .then(async found_game => {
                if (found_game.get("players_in") === 1) {
                  found_game["status"] = "unavailable"
                  found_game.save()
                    .then(async unavailable_game => {
                      await sleep(500)
                      old_state.member.roles.remove(process.env.hostmemberrole)
                      await sleep(500)
                      old_state.guild.channels.resolve(unavailable_game.get("voice_id")).delete()
                      await sleep(500)
                      old_state.guild.channels.resolve(unavailable_game.get("text_id")).delete()
                      await sleep(500)
                      old_state.guild.channels.resolve(unavailable_game.get("category_id")).delete()
                      await sleep(500)
                      old_state.guild.roles
                        .resolve(unavailable_game.get("role_id"))
                        .delete()
                      unavailable_game.remove();
                    })
                }
                else {
                  found_game["players_in"] = found_game.get("players_in") - 1
                  found_game.save()
                  old_state.member.roles.remove(found_game.get("role_id"))
                    .then(async left_member => {
                      await sleep(500)
                      left_member.guild.channels
                        .resolve(found_game.get("text_id"))
                        // ignore because the chat id will always resolve into a text channel
                        // @ts-ignore
                        .send({
                          embed: new MessageEmbed()
                            .setDescription("it seems like someone left this lobby. they won't be missed.")
                        })
                      if (left_member.roles.cache.has(process.env.hostmemberrole)) {
                        await sleep(500)
                        left_member.roles.remove(process.env.hostmemberrole)
                          .then(async () => {
                            const next_host = left_member.guild.channels
                              .resolve(found_game.get("voice_id"))
                              .members
                              .first()
                            await sleep(500)
                            next_host.roles.add(process.env.hostmemberrole)
                              .then(async () => {
                                await sleep(500)
                                left_member.guild.channels
                                  .resolve(found_game.get("text_id"))
                                  // ignore because the chat id will always resolve into a text channel
                                  // @ts-ignore
                                  .send({
                                    embed: new MessageEmbed()
                                      .setDescription(`because the king of this lobby left i have decided to move the power over to ${next_host}.`)
                                  })
                              })

                          })
                      }
                    })
                }
              })
          }
        })
    }
  }
}