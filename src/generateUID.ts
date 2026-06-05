const characters =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const UID_LENGTH = 16;
/**
 *  Generate a unique identifier (UID) for CalendarEvent objects
 * @returns 16 character string of randomly generated letters and numbers
 */
export default function generateUID(): string {
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < UID_LENGTH; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
