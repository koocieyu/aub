import { db_cooldowns } from "../main"
import moment from "moment"

export default function (command_name: string, user_id: string) {
  db_cooldowns.exists({
    command_name: command_name,
    user_id: user_id
  })
    .catch(reason => console.log("There was a problem checking for a cooldown: " + reason))
    .then(exists => {
      if (exists) {
        db_cooldowns.findOneAndUpdate(
          {
            command_name: command_name,
            user_id: user_id
          },
          {
            last_executed: moment().toString()
          }
        )
          .then(() => {
            console.log(`Successfully set cooldown for ${user_id} for the ${command_name}`)
          })
          .catch(reason => {
            console.log(`Could not set cooldown for ${user_id} for the ${command_name} because: ${reason}`)
          })
      }
      else {
        db_cooldowns.create({
          user_id: user_id,
          command_name: command_name,
          last_executed: moment().toString()
        })
          .then(() => {
            console.log(`Successfully set cooldown for ${user_id} for the ${command_name}`)
          })
          .catch(reason => {
              console.log(`Could not set cooldown for ${user_id} for the ${command_name} because: ${reason}`)
          })
      }
  })
}