/**
 * Entry point: mounts the new study form and applies the starting mode and colour theme.
 */
import "./style.css";
import newStudyForm from "./modules/newStudyForm/newStudyForm.ts";
import { setColorTheme, setMode } from "./modules/appSettings.ts";

const app = document.getElementById("app");
if (app) app.append(newStudyForm());

setMode("dark");
setColorTheme("purple");
