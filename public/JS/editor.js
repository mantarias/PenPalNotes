const h1 = document.querySelector('h1');
const iframe = document.querySelector('iframe');
const editor = document.querySelector('#editor');
let changed = false;
let timeout;
let old = [];
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
        console.log("got message")
        const data = JSON.parse(event.data);
        for (let index = 0; index <= data.list.length; index++) {
            if (data.list[index] == old[index]) {
                continue;
            }
            else {
                editor.value = data.list[index];
                old = data.list;
                break;
            }
        }

        changed = true;


    });

    socket.addEventListener('close', () => {
        console.log("WebSocket connection closed");
    });

    editor.addEventListener('input', () => {
        if (changed) {
            changed = false;
        }
        else {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                socket.send(JSON.stringify(editor.value));
            }, 1000);
        }





    });
});