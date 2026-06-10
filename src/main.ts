import "./style.css";
import newStudyForm from "./modules/newStudyForm/newStudyForm.ts";
import appSettings from "./modules/appSettings.ts";

const app = document.getElementById("app");
if (app) app.append(newStudyForm());

appSettings.setMode("dark");
appSettings.setColorTheme("purple");