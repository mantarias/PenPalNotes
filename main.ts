import { Loro, LoroDoc, LoroList, LoroMap, LoroText } from "npm:loro-crdt";
let openFiles: Map<string, OpenFile>;
openFiles = new Map();
class OpenFile {
  file: string;
  list;
  doc;
  users: User[] = [];
  old = [];
  timeout;
  constructor(file: string, user: User) {
    this.file = file;
    this.doc = new LoroDoc();
    this.users.push(user);
    this.list = this.doc.getList("list");
  }
  notifyUsers(changes: [], user: User): void {
    let update = this.doc.export({ mode: "update" });
    for (let i = 0; i < this.users.length; i++) {
      const element = this.users[i];
      element.doc.import(update);
      console.log(element.doc.toJSON());
      if (element == user) {
        element.socket.send(JSON.stringify({ doc: this.doc, changes: [] }));
        continue;
      }
      element.socket.send(JSON.stringify({ doc: this.doc, changes: changes }));
    }

    clearInterval(this.timeout);
    this.timeout = setTimeout(() => {
      this.updateFile();
    }, 1000);
  }
  async updateFile() {
    Deno.writeTextFile(
      "./mkdocs/docs/" + this.file,
      this.doc.toJSON().list.join(""),
    );
    await new Deno.Command("mkdocs", {
      args: ["build"],
      cwd: "./mkdocs",
      stdout: "inherit",
      stderr: "inherit",
    }).output();
    this.users.forEach((element) => {
      element.socket.send(JSON.stringify({ message: "file updated" }));
    });
  }
}
class User {
  socket: WebSocket;
  file: string;
  list;
  doc;
  changes: [];
  constructor(socket: WebSocket, file: string) {
    this.socket = socket;
    this.file = file;
    this.doc = new LoroDoc();
    this.list = this.doc.getList("list");
    this.changes = [];
    this.socketEvents();
  }
  socketEvents(): void {
    this.socket.onopen = async () => {
      const data = await Deno.readTextFile("./mkdocs/docs/" + this.file);
      for (let index = 0; index < data.length; index++) {
        this.list.insert(index, data[index]);
      }

      this.socket.send(JSON.stringify(this.doc));
      this.doc.subscribeLocalUpdates((update) => {
        openFiles.get(this.file)?.doc.import(update);
        openFiles.get(this.file)?.doc.commit();
        openFiles.get(this.file)?.notifyUsers(this.changes, this);
      });
      openFiles.get(this.file)?.doc.subscribeLocalUpdates((update) => {
        this.doc.import(update);
      });
    };
    this.socket.onmessage = (event) => {
      onMessage(event.data, this);
    };
    this.socket.onclose = () => {
      console.log("WebSocket connection closed");
      let test = openFiles.get(this.file)?.users.indexOf(this);
      openFiles.get(this.file)?.users.splice(test, 1);
    };
  }
}

async function router(_req: Request): Promise<Response> {
  const url = new URL(_req.url);
  if (url.pathname == "/") {
    const index = await Deno.readTextFile("./public/HTML/index.html");
    return new Response(index, {
      headers: { "Content-Type": "text/html" },
    });
  } else if (url.pathname == "/getFiles") {
    let obj: { files: string[] } = { files: [] };
    for await (const entry of Deno.readDir("./mkdocs/docs")) {
      if (entry.isFile) {
        obj.files.push(entry.name);
      }
    }
    return new Response(JSON.stringify(obj));
  } else if (url.pathname.startsWith("/editor/")) {
    const filePath = url.pathname.replace("/editor/", "");
    const editor = await Deno.readTextFile("./public/HTML/editor.html");
    //     openFiles[filePath] = new file(filePath, data);
    // }
    return new Response(editor, {
      headers: { "Content-Type": "text/html" },
    });
  } else if (url.pathname.startsWith("/ws/")) {
    const filePath = url.pathname.replace("/ws/", "");
    const { response, socket } = Deno.upgradeWebSocket(_req);

    let user = new User(socket, filePath);
    if (!openFiles.has(filePath)) {
      openFiles.set(filePath, new OpenFile(filePath, user));
    } else {
      openFiles.get(filePath)?.users.push(user);
    }
    return response;
  } else if (url.pathname.startsWith("/notes/")) {
    try {
      let filePath = "./mkdocs/site/" + url.pathname.replace("/notes/", "") +
        (url.pathname.endsWith(".md") ? "/index.html" : "");
      filePath = filePath.replace(".md", "");

      const file = await Deno.readFile(
        filePath.replace("/index/index.html", "/index.html"),
      );
      return new Response(file, {
        headers: { "Content-Type": getFileType(filePath) },
      });
    } catch (error) {
      return new Response("File not found", { status: 404 });
    }
  } else if (
    url.pathname.includes("/assets/") || url.pathname.includes("/search/")
  ) {
    try {
      let filePath = "./mkdocs/site" + url.pathname.replace("/notes/", "");
      const file = await Deno.readFile(
        filePath.replace("/index/index.html", "/index.html"),
      );

      return new Response(file, {
        headers: { "Content-Type": getFileType(filePath) },
      });
    } catch (error) {
      return new Response("File not found", { status: 404 });
    }
  } else {
    try {
      const filePath = "./public/" + url.pathname;
      const file = await Deno.readFile(filePath);

      return new Response(file, {
        headers: { "Content-Type": getFileType(filePath) },
      });
    } catch (error) {
      return new Response("File not found", { status: 404 });
    }
  }
}
Deno.serve({ port: 3001 }, router);

function getFileType(path: string, user: User): string {
  return {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
  }[path.substring(path.lastIndexOf("."))] ||
    "application/octet-stream";
}
function onMessage(event: string, user: User) {
  let data = JSON.parse(event);
  user.changes = data;
  console.log(data);
  for (let outerIndex = 0; outerIndex < data.length; outerIndex++) {
    let index = 0;
    console.log(data[outerIndex].ops);

    for (let myIndex = 0; myIndex < data[outerIndex].ops.length; myIndex++) {
      const el = data[outerIndex].ops[myIndex];
      if (el.retain != undefined) {
        index = el.retain;
        console.log("updated index to " + index);
      } else if (el.insert != undefined) {
        console.log("inserted");
        for (let i = el.insert.length - 1; i >= 0; i--) {
          user.list.insert(index, el.insert[i]);
        }
      } else if (el.delete != undefined) {
        console.log("deleted");
        user.list.delete(index, el.delete);
        user.doc.commit();
      }
    }
  }
  user.doc.commit();
}
