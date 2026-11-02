import "./styles.css";
import shell from "./shell.html?raw";
// Keep the server-rendered content visible while loading interaction code.
if (!document.querySelector("#view")) document.getElementById("root").innerHTML = shell;
import("./hackertube-ui.js");
