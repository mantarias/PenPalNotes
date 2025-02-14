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
  notifyUsers(): void {
    let update = this.doc.export({ mode: "update" });
    this.users.forEach((element) => {
      element.socket.send(JSON.stringify(this.doc));
      element.doc.import(update);
      clearInterval(this.timeout);
      this.timeout = setTimeout(() => {
        this.updateFile();
      }, 1000);
    });
  }
  updateFile() {
    Deno.writeTextFile(
      "./mkdocs/docs/" + this.file,
      this.doc.toJSON().list.join(""),
    );
    new Deno.Command("mkdocs", {
      args: ["build"],
      cwd: "./mkdocs",
      stdout: "inherit",
      stderr: "inherit",
    }).output();
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
      const data = await Deno.readTextFile("./mkdocs/docs/" + this.file);
      for (let index = 0; index < data.length; index++) {
        this.list.insert(index, data[index]);
      }

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
      if (data.method == "deleted") {
        for (let index = data.from.length; index >= 0; index--) {
          if (data.from[index] != data.to[index]) {
            this.list.delete(index, 1);
          }
        }
        this.doc.commit();
      } else if (data.method == "insert") {
        let changes = [];
        for (
          let index = 0, index2 = 0;
          index2 < data.to.length;
          index++, index2++
        ) {
          if (this.list.toJSON().join("")[index] != data.to[index2]) {
            changes.push({
              at: index2,
              input: data.to[index2],
              method: "insert",
            });

            for (let i = 1; i < data.to.length - index2; i++) {
              if (this.list.toJSON().join("")[index] != data.to[index2 + i]) {
                changes[changes.length - 1].input += data.to[index2 + i];
              } else {
                break;
              }
            }
            index2 += changes[changes.length - 1].input.length;
          }
        }

        let modified = data.to;
        for (let i2 = changes.length - 1; i2 >= 0; i2--) {
          let start = modified.slice(0, changes[i2].at);
          let end = modified.slice(changes[i2].at + changes[i2].input.length);
          modified = start + end;
        }

        changes.forEach((el) => {
          for (
            let is = 0;
            is < el.input.length;
            is++
          ) {
            this.list.insert(el.at + is, el.input[is]);
          }
        });
        this.doc.commit();
        changes = [];
      }
      // data.forEach((element) => {
      //   if(element.method == "insert")
      //   {
      //     for (let index = 0; index < element.input.length; index++) {
      //       console.log("commiting" + index)
      //       this.list.insert(element.at + index, element.input[index]);
      //       this.doc.commit();
      //     }
      //   }
      //   else if(element.method == "deleted")
      //   {
      //     this.list.delete(element.at, 1)
      //     this.doc.commit();
      //   }
      // });
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
      const filePath = "./mkdocs/site" + url.pathname.replace("/notes/","");
      const file = await Deno.readFile(filePath +"/index.html");
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
