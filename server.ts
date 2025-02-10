import { Loro, LoroDoc, LoroList, LoroMap, LoroText } from "npm:loro-crdt";
let openFiles: Map<string, OpenFile>;
openFiles = new Map();
class OpenFile {
  file: string;
  list;
  doc;
  users: User[] = [];
  old = [];
  constructor(file: string, user: User) {
    this.file = file;
    this.doc = new LoroDoc();
    this.users.push(user);
    this.list = this.doc.getList("list");
  }
  notifyUsers(): void {
    this.users.forEach(element => {
        element.socket.send(JSON.stringify(this.doc));
        for (let index = 0; index <= this.doc.toJSON().list.length; index++) {
            if (this.doc.toJSON().list[index] == this.old[index]) {
                continue;
            }
            else {
                Deno.writeTextFile(
                    "./mkdocs/docs/"+this.file,this.doc.toJSON().list[index])
                this.old = this.doc.toJSON().list;
                break;
            }


        }
         
    });
  }
}
class User {
  socket: WebSocket;
  file: string;
  list;
  doc;
  constructor(socket: WebSocket, file: string) {
    this.socket = socket;
    this.file = file;
    this.doc = new LoroDoc();
    this.list = this.doc.getList("list");
    this.socketEvents();
  }
  socketEvents(): void {
    this.socket.onopen = async () => {
      console.log("WebSocket connection opened");
      const data = await Deno.readTextFile("./mkdocs/docs/" + this.file);
      this.list.insert(0, data);
      this.socket.send(JSON.stringify(this.doc));
      this.doc.subscribeLocalUpdates((update) => {
        openFiles.get(this.file)?.doc.import(update);
        openFiles.get(this.file)?.notifyUsers();
      });
      openFiles.get(this.file)?.doc.subscribeLocalUpdates((update) => {
        this.doc.import(update);
      });
    };
    this.socket.onmessage = (event) => {
      let data = JSON.parse(event.data);
      this.list.insert(0, data);
      this.doc.export({ mode: "shallow-snapshot",
        frontiers: this.doc.frontiers()});

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
  } else {
    try {
      const filePath = "./public/" + url.pathname;
      const file = await Deno.readFile(filePath);
      const contentType = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".gif": "image/gif",
      }[filePath.substring(filePath.lastIndexOf("."))] ||
        "application/octet-stream";

      return new Response(file, {
        headers: { "Content-Type": contentType },
      });
    } catch (error) {
      return new Response("File not found", { status: 404 });
    }
  }
}
Deno.serve({ port: 3001 }, router);
