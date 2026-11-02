import { useEffect } from "react";
import shell from "./shell.html?raw";
export function App() {
  useEffect(() => { import("./hackertube-ui.js"); }, []);
  return <div dangerouslySetInnerHTML={{ __html: shell }} />;
}
