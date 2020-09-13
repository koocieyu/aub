import { Client, Message } from "discord.js";
import set_cooldown from "../misc_functions/set_cooldown"

export let properties = {
  file_name: "hello.js",
  name: "hello",
  cooldown: 60
}

export function run(Bot: Client, command_arguments: string[], message: Message) {
  message.channel.send("hello").then(() => set_cooldown(properties.name, message.author.id))
}