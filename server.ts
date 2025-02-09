class user {
    id: string;
    file: string;
    socket: WebSocket;
    constructor(file: string, socket: WebSocket) {
        this.id = generateUniqueId();
        this.file = file;
        this.socket = socket;
        this.socket.onopen = () => {
            console.log("WebSocket connection opened");
            const dataToSend = {
                characters: Array.from(
                    openFiles[this.file].data.characters.values(),
                ).map((el) => [el.author, el.symbol]),
            };
            this.socket.send(JSON.stringify({ id: this.id, data: dataToSend }));
        };
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            let incomingText = data.characters.map((el: { symbol: char }) =>
                el.symbol
            ).join("");
            openFiles[this.file].incomingText = incomingText;
            openFiles[this.file].incomingData = data;
        };
        this.socket.onclose = () => console.log("WebSocket connection closed");
    }
}

let users: user[] = [];
let openFiles: { [key: string]: file } = {};
class file {
    name: string;
    data: dada;
    incomingText: string;
    incomingData: { characters: { author: string[]; symbol: string }[] };
    constructor(name: string, data: string) {
        this.name = name;
        this.data = new dada(data);
        this.incomingText = data;
        this.interval();
    }
    interval(): void {
        let interval = setInterval(() => {
            let currentText = Array.from(
                this.data.characters.values(),
            ).map((el) => el.symbol).join("");
            if (currentText != this.incomingText) {
                console.log(currentText);
                console.log("mismastch");
                console.log(this.incomingText);
                let index = 0;
                let index2 = 0;
                let inserted = { inserted: false, position: 0 };
                while (currentText != this.incomingText) {
                    console.log(inserted);
                    if (
                        currentText.length < index ||
                        this.incomingText.length < index2
                    ) {
                        break;
                    }
                    if (currentText[index] == this.incomingText[index2]) {
                        inserted.inserted = false;
                        index++;
                        index2++;
                        continue;
                    } else if (
                        currentText[index] != this.incomingText[index2]
                    ) {
                        let tempCurrent = structuredClone(currentText);
                        tempCurrent = tempCurrent.substring(
                            index,
                            tempCurrent.length,
                        );
                        let tempIncoming = structuredClone(this.incomingText);
                        tempIncoming = tempIncoming.substring(
                            index2,
                            tempIncoming.length,
                        );
                        let temp = 0;
                        while (
                            tempIncoming.length > 0 &&
                            inserted.position <= index2
                        ) {
                            if (tempCurrent == tempIncoming) {
                                inserted.inserted = true;
                                inserted.position = index2 + temp;
                                break;
                            } else if (tempCurrent != tempIncoming) {
                                tempIncoming = tempIncoming.substring(
                                    1,
                                    tempIncoming.length,
                                );
                                console.log(tempIncoming.length + " " + temp);
                                temp++;
                            }
                        }
                        //delition
                        if (
                            this.incomingText.length < currentText.length &&
                            index2 >= this.incomingText.length
                        ) {
                            for (let i = currentText.length; i >= 0; i--) {
                                if (this.incomingText[i] != currentText[i]) {
                                    this.data.characters.delete(
                                        i,
                                    );
                                    currentText = Array.from(
                                        this.data.characters
                                            .values(),
                                    ).map((el) => el.symbol).join("");
                                }
                            }
                            console.log("deleting");
                            console.log(this.incomingText);
                            this.data.characters.delete(index2);
                            currentText = Array.from(
                                this.data.characters
                                    .values(),
                            ).map((el) => el.symbol).join("");
                        }
                        //inserted in between
                        if (inserted.inserted) {
                            let newAuthor =
                                this.incomingData.characters[index2].author;
                            for (let i = currentText.length; i > index; i--) {
                                this.data.characters.set(
                                    i,
                                    new char(
                                        this.data.characters
                                            .get(
                                                i+1,
                                            )?.symbol || "",
                                        i,
                                        this.data.characters
                                            .get(
                                                i+1,
                                            )?.author || [],
                                    ),
                                );
                            }
                            this.data.characters.set(
                                index,
                                new char(
                                    this.incomingData.characters[index2].symbol,
                                    index,
                                    newAuthor,
                                ),
                            );
                            console.log("isnerted");
                            currentText = Array.from(
                                this.data.characters.values(),
                            ).map((el) => el.symbol).join("");

                            
                                inserted.inserted = false;
                            
                        } else if (
                            currentText.length < this.incomingText.length &&
                            currentText.length <= index &&
                            index2 < this.incomingText.length
                        ) {
                            let newAuthor =
                                this.incomingData.characters[index2].author;
                            this.data.characters.set(
                                index2,
                                new char(
                                    this.incomingData.characters[index2].symbol,
                                    index,
                                    newAuthor,
                                ),
                            );
                            currentText = Array.from(
                                this.data.characters.values(),
                            ).map((el) => el.symbol).join("");
                        }
                        index++;
                        index2++;
                    }
                }
                Deno.writeTextFile(
                    "./mkdocs/docs/" + this.name,
                    Array.from(this.data.characters.values())
                        .map(
                            (el) => el.symbol,
                        ).join(""),
                );
                const dataToSend = {
                    characters: Array.from(
                        this.data.characters.values(),
                    ).map((el) => [el.author, el.symbol]),
                };
                users.forEach((user) => {
                    user.socket.send(
                        JSON.stringify({ data: dataToSend }),
                    );
                });
            }
        }, 1000);
    }
}

class dada {
    characters: Map<number, char>;
    constructor(data: string, id: string = "0") {
        this.characters = new Map();
        let text = Array.from(data);
        text.forEach((el, index) => {
            this.characters.set(
                index,
                new char(el, index, ["0"]),
            );
        });
    }
}
class char {
    symbol: string;
    author: string[];
    position: number;

    constructor(
        symbol: string,
        position: number,
        author: string[],
    ) {
        this.symbol = symbol;
        this.position = position;
        this.author = author;
    }
}

function generateUniqueId(): string {
    return crypto.randomUUID();
}
async function router(_req: Request): Promise<Response> {
    const url = new URL(_req.url);
    if (url.pathname == "/") {
        const index = await Deno.readTextFile("./public/HTML/index.html");
        return new Response(index, {
            headers: { "Content-Type": "text/html" },
        });
    } else if (url.pathname == "/updateDocs") {
        new Deno.Command("mkdocs", {
            args: ["build"],
            cwd: "./mkdocs",
            stdout: "inherit",
            stderr: "inherit",
        }).output();
        return new Response("updated");
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
        if (openFiles[filePath] == undefined) {
            const data = await Deno.readTextFile("./mkdocs/docs/" + filePath);
            openFiles[filePath] = new file(filePath, data);
        }

        return new Response(editor, {
            headers: { "Content-Type": "text/html" },
        });
    } else if (url.pathname.startsWith("/ws/")) {
        const filePath = url.pathname.replace("/ws/", "");
        const { response, socket } = Deno.upgradeWebSocket(_req);
        users.push(new user(filePath, socket));
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
