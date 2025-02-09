const h1 = document.querySelector('h1');
const iframe = document.querySelector('iframe');
const editor = document.querySelector('#editor');
let interval;
let id;
let modified = false;
let localDada;
let cursorPosition = 0;
addEventListener('load', () => {
    let url = window.location.pathname.split('/');
    let filename = url[url.length - 1];
    h1.textContent = "Editing " + filename;
    iframe.src = "http://127.0.0.1:8000/" + filename.replace(".md", "");
    // Connect to WebSocket server
    const socket = new WebSocket("ws://127.0.0.1:3001/ws/" + filename);

    socket.addEventListener('open', () => {
        console.log("WebSocket connection opened");
    });

    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (id == undefined && data.id != undefined) {
            id = data.id;
        }
        if (data.data != undefined) {
            localDada = new dada(data.data);
            console.log("updated dada");
        }
        console.log("Received data:", data);

        // Save the cursor position
        // Update the editor
        editor.innerHTML = Array.from(localDada.characters.values()).map(el => el.symbol).join("").replaceAll("\n", "<div><br></div>");
        clearInterval(interval);
        // Restore the cursor position

    });

    socket.addEventListener('close', () => {
        console.log("WebSocket connection closed");
    });

    editor.addEventListener('input', () => {
        clearTimeout(interval);
        interval = setTimeout(() => {
            const text = editor.innerHTML.replace(/<\/div>/g, "\n").replace(/<div>/g, "").replace(/<br>/g, "");
            const compare = localDada.characters.map(el => el.symbol).join("");
            if (text == compare) return;
            let i = compare.length-1;
            while (text.length < localDada.characters.length) {
                if (text.length < localDada.characters.length) {
                    
                        if (text[i] != localDada.characters[i].symbol) {
                            console.log(text[i] != localDada.characters[i].symbol, text[i], localDada.characters[i].symbol);
                            console.log(i)
                            localDada.characters.splice(i, 1);
                            i--;
                        }
                        else {
                            i--;
                        }
                    
                }
            }
            for (let i = 0; i < text.length; i++) {
                if (localDada.characters[i] == undefined || localDada.characters[i].symbol != text[i]) {
                    localDada.characters[i] = new char(text[i], i, [id]);

                }

            }
            console.log(localDada.characters == text)
            if (localDada.characters == text)
                console.log("Sending data:", localDada);
            socket.send(JSON.stringify(localDada));
        }, 500);

    });
});

class dada {
    characters;
    constructor(data) {
        this.characters = [];
        data.characters.forEach((el, index) => {
            this.characters[index] = new char(el, index, data.characters[index].author);
        });
        console.log(this.characters);
    }
}
class char {
    symbol;
    author;
    position;

    constructor(
        symbol,
        position,
        author
    ) {
        this.symbol = Array.isArray(symbol) ? symbol[1] : symbol;
        this.position = position;
        this.author = author;
    }
}

